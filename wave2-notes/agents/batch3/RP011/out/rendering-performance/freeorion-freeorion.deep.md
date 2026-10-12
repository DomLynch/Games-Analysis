# freeorion-freeorion (rendering-performance, cell 17)

Donor: `/mnt/frankendom-donors/freeorion-freeorion/UI/MapWnd.cpp` (ring batching: `MapWnd::InitVisibilityRadiiRenderingBuffers` 4118, `MapWnd::RenderVisibilityRadii` 2538) and `/mnt/frankendom-donors/freeorion-freeorion/GG/src/GUI.cpp` (frame governor: `GUIImpl::GouvernFPS` 836) | Licence: GPL v2 for the FreeOrion source (README.md 148-151 says "The FreeOrion *source code* is licensed under the terms of [GPL v2]"); the GG/src/GUI.cpp header says "Released under the GNU Lesser General Public License 2.1 or later" | C++ | symbols `MapWnd::InitVisibilityRadiiRenderingBuffers`, `MapWnd::RenderVisibilityRadii`, `GUIImpl::GouvernFPS`

Checked: Read in full: UI/MapWnd.cpp 2538-2575, 2820-2855, 3032-3056, 3169, 4111-4222; GG/src/GUI.cpp 836 to 869, 1322-1352, 1373-1377; client/human/GGHumanClientApp.cpp 1190-1215, 1645-1660; UI/ClientUI.cpp 476-480; UI/CUIDrawUtil.cpp 57-95. Hint file `util/ThreadPool.h` is the wrong file (a thread pool header, not a rendering file; 10 lines, only the include guard read). Searched with grep for frustum, cull, atlas, batch, LOD, draw call, fps across client/, UI/, util/. Not read: the main app loop that calls RunModal; GG GL buffer class beyond line 103 of GG/GG/GLClientAndServerBuffer.h; the Fields/star rendering path. Nothing here is terrain, foliage, water or weather. Confidence: high on the ring batching and the frame governor (both read end to end); medium on "the governor is the only frame limiter" (the main loop was not read). camera_scope: not a camera cell.

Best transferable idea: Batch every range ring of one colour into one shared vertex buffer with a (start, count) run per colour, so draw cost is two calls per colour and the buffers are rebuilt only when the rings change, and cap frame time with a wait computed from the previous frame end, dropping the cap when the window loses focus.
Decision (proposed): adapt - the ring batching shape and the focus-based cap transfer, but the donor rebuilds on turn change and draws with static buffers; Frankendom's rings (aggro, leash, zone bounds) move every tick, so the rebuild trigger and buffer usage must change. Rings are client presentation of engine state, so they stay out of the engine.
Acceptance: A unit test asserts that a batch with N rings in C colour groups reports 2 x C draw calls (not 2 x N), and that a 15 fps background cap and a 60 fps focused cap produce a frame interval of exactly 1000/cap ms (the donor's 1/(cap+1) would fail this); on a 375 px phone with 30 aggro rings on screen, the play frame holds the focused cap.

## 1. Mechanism

- Ring batching, built at turn time. `MapWnd::InitTurn` (2820) calls `InitTurnRendering()` (2853); `MapWnd::MidTurnUpdate` (3032) calls it too (3043). `InitTurnRendering` (3055) calls `InitVisibilityRadiiRenderingBuffers` (3169). That function first clears the old buffers (4123), then collects each empire's detection circles, skips any radius below 5 or above 2048 map units (4149), and groups the circles in a map keyed by colour (4169). For each colour it appends the filled circle as triangles (36 segments, 4178, 4183) and the outline as lines (72 segments, 4179) into one shared fill buffer and one shared outline buffer, then records the start index and count of that colour as one run (4206). Both buffers are then made server-side (4214 onward).
- Ring drawing, per frame. `MapWnd::RenderVisibilityRadii` (2538) walks the runs. For each colour it clears the stencil (2556), draws that colour's fill run with `GL_TRIANGLES` (2562), then draws the outline run with `GL_LINES` (2570). The donor comment (2552) says each colour is rendered separately "so they can consistently blend when overlapping other colours, but be stenciled to avoid blending when overlapping within a colour". The stencil test for the fill is `GL_EQUAL 0` with `GL_INCR` (2558 and the lines before it). The outline pass has its own stencil test (2564, not analysed further).
- Frame governor. `GUI::RunModal` (1324 and 1338) calls `GouvernFPS()` at the end of every loop pass (1334, 1351). `GouvernFPS` (836 to the static-member comment at 869) does this: if the cap is non-zero (843), it computes a minimum frame time of `1.0 / (m_max_FPS + 1)` seconds (844), measures the time since the previous frame end (845), and sleeps for the rest (846-849). It then stores the post-sleep time as the new frame start (853), and counts frames for an FPS readout once a second.
- Who sets the cap. `GGHumanClientApp::HandleFocusChange` (1190) sets the cap to `video.fps.unfocused` when the window loses focus and the option is enabled (1196-1200), or to `video.fps.max` when it has focus (1205-1209); 0 means no cap. It also pauses or resumes music on the same branch (1201-1203, 1210-1212, not analysed further). `UpdateFPSLimit` (1650) re-applies the focused cap when the option changes (1653-1656). Defaults: focused cap 60.0 (ClientUI.cpp 478, validator 1 to 240), unfocused cap 15.0 (480, validator 0.125 to 30).

## 2. Key functions

- `MapWnd::InitVisibilityRadiiRenderingBuffers`: `/mnt/frankendom-donors/freeorion-freeorion/UI/MapWnd.cpp` 4118-4217. Builds the per-colour runs; called from `InitTurnRendering` (3169) only, which is called from `InitTurn` (2853) and `MidTurnUpdate` (3043).
- `MapWnd::RenderVisibilityRadii`: `/mnt/frankendom-donors/freeorion-freeorion/UI/MapWnd.cpp` 2538-2575. Per frame; loops the runs and issues two draw calls per colour (2562, 2570). Called from the map draw path at 1750 (not read in full).
- `GUIImpl::GouvernFPS`: `/mnt/frankendom-donors/freeorion-freeorion/GG/src/GUI.cpp` 836 to 869. Sleep-based cap, then FPS counter. Callers: `GUI::RunModal` (1334, 1351), both read.
- `GGHumanClientApp::HandleFocusChange`: `/mnt/frankendom-donors/freeorion-freeorion/client/human/GGHumanClientApp.cpp` 1190-1215. Focus-based cap choice.
- `CUIDrawUtil` `BufferStoreCircleArcVertices` (called at 4183): `/mnt/frankendom-donors/freeorion-freeorion/UI/CUIDrawUtil.cpp` 57-95 (partly read). Auto slice count at 80-81 (not used by the ring call, which passes 36 and 72); a static cache of unit-circle coordinates per slice count at 86.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| One shared vertex buffer per colour group, drawn as one run | Two draw calls per colour: `GL_TRIANGLES` (2562), `GL_LINES` (2570) |
| Rebuild only when the input changes | Triggers: `InitTurn` (2853), `MidTurnUpdate` (3043). Not per frame. |
| Skip rings outside a size band | Radius below 5 or above 2048 map units is skipped (4149) |
| Tessellation | Fill 36 segments (4178), outline 72 segments (4179); fixed, not screen-size based |
| Stencil per colour so overlaps within one colour do not double-blend | Stencil cleared per colour (2556), `GL_EQUAL 0` (2558) |
| Frame cap with a sleep | Interval `1.0 / (m_max_FPS + 1)` (844); default cap 60.0 (GUI.cpp 259, ClientUI.cpp 478) |
| Lower cap when unfocused | Default 15.0 (ClientUI.cpp 480); applied at HandleFocusChange (1198) |
| Unit circle table cached per segment count | `static std::map<int, std::vector<double>> unit_circle_coords;` (CUIDrawUtil.cpp 86) |

Defects found, with fixes (the idea is kept):
- Frame cap is one frame too loose: `1.0 / (m_max_FPS + 1)` (GUI.cpp 844) gives a minimum interval of 1/61 s at a cap of 60. Fix: `1000 / capFps` ms (in the sketch, `frameWaitMs`).
- Fixed tessellation (36 and 72) ignores on-screen size: a 2048-unit ring at high zoom shows facets, and a 5-unit ring spends the same vertices. Fix: segment count from on-screen diameter (sketch, `segmentsFor`). The proposed cap of 96 is my number, not the donor's; the donor's own auto formula caps at 30 (CUIDrawUtil.cpp 81).
- An empty colour group still records a run (4206 runs for every colour). Fix: skip empty groups (sketch).

## 4. TypeScript sketch

simplified: keeps the donor order (group by colour, one run per group, rebuild only when inputs change, frame wait computed from the previous frame end, cap chosen by focus). It omits: the outline inset, the GL draw calls and the stencil passes (a WebGL port needs a stencil step per colour group, which this sketch does not model), the browser scheduling (a browser cannot sleep the main thread; the caller uses the returned wait with setTimeout), the donor's music pause, and the unordered map iteration order. It differs in three fixes: wait = 1000/cap (not 1/(cap+1)), segments follow on-screen size with a proposed cap of 96, and empty groups add no run. The triangle and line layout is my own, not the donor's helper output. The rebuild must also run when zoom changes, because `pxPerUnit` is baked into the batch.

```ts
type Pt = { x: number; y: number };
type Rgba = { r: number; g: number; b: number; a: number };
interface Ring { cx: number; cy: number; r: number }           // map units
interface RingGroup { fill: Rgba; line: Rgba; rings: Ring[] }  // one group per colour
interface Run { start: number; count: number }
interface RingBatch {
  fillPts: Pt[]; fillCols: Rgba[]; fillRuns: Run[];
  linePts: Pt[]; lineCols: Rgba[]; lineRuns: Run[];
}

const MIN_R = 5;      // donor filter, map units
const MAX_R = 2048;   // donor filter, map units

const unitCache = new Map<number, Pt[]>();
function unitCircle(n: number): Pt[] {
  let u = unitCache.get(n);
  if (u === undefined) {
    u = [];
    for (let i = 0; i <= n; i++) {
      const a = (2 * Math.PI * i) / n;
      u.push({ x: Math.cos(a), y: Math.sin(a) });
    }
    unitCache.set(n, u);
  }
  return u;
}

// Fix: segment count follows the on-screen size instead of a fixed 36 / 72.
// Proposed cap 96 is not a donor constant (donor auto formula caps at 30, CUIDrawUtil.cpp 81).
function segmentsFor(diameterPx: number): number {
  return Math.min(96, Math.max(12, 3 + Math.floor(diameterPx / 4)));
}

// Rebuild when the rings change (turn or zone change, zoom change), never per frame.
export function buildRingBatch(groups: RingGroup[], pxPerUnit: number): RingBatch {
  const b: RingBatch = { fillPts: [], fillCols: [], fillRuns: [], linePts: [], lineCols: [], lineRuns: [] };
  for (const g of groups) {
    const fillStart = b.fillPts.length;
    const lineStart = b.linePts.length;
    for (const ring of g.rings) {
      if (ring.r < MIN_R || ring.r > MAX_R) continue;
      const n = segmentsFor(2 * ring.r * pxPerUnit);
      const u = unitCircle(n);
      for (let i = 0; i < n; i++) {
        b.fillPts.push(
          { x: ring.cx, y: ring.cy },
          { x: ring.cx + ring.r * u[i].x, y: ring.cy + ring.r * u[i].y },
          { x: ring.cx + ring.r * u[i + 1].x, y: ring.cy + ring.r * u[i + 1].y },
        );
        b.fillCols.push(g.fill, g.fill, g.fill);
      }
      for (let i = 0; i < n; i++) {
        b.linePts.push(
          { x: ring.cx + ring.r * u[i].x, y: ring.cy + ring.r * u[i].y },
          { x: ring.cx + ring.r * u[i + 1].x, y: ring.cy + ring.r * u[i + 1].y },
        );
        b.lineCols.push(g.line, g.line);
      }
    }
    // one run per colour group; empty groups add no run (donor always adds one)
    if (b.fillPts.length > fillStart) b.fillRuns.push({ start: fillStart, count: b.fillPts.length - fillStart });
    if (b.linePts.length > lineStart) b.lineRuns.push({ start: lineStart, count: b.linePts.length - lineStart });
  }
  return b;
}

// Draw-call budget: two calls per colour group, however many rings it holds.
export function drawCallCount(b: RingBatch): number {
  return b.fillRuns.length + b.lineRuns.length;
}

// Frame pacing: ms to wait before the next frame. lastFrameEndMs is the end of the previous governed frame.
// Fix: the interval is 1000 / capFps (donor uses 1 / (max + 1), one frame too loose).
export function frameWaitMs(nowMs: number, lastFrameEndMs: number, capFps: number): number {
  if (capFps <= 0) return 0; // 0 = no cap
  const minFrameMs = 1000 / capFps;
  return Math.max(0, minFrameMs - (nowMs - lastFrameEndMs));
}

export interface CapOptions {
  focusedCapOn: boolean; focusedFps: number;
  unfocusedCapOn: boolean; unfocusedFps: number;
}

// Cap chosen by window focus: focused cap, or a low background cap, or none.
export function capFor(focused: boolean, o: CapOptions): number {
  if (focused) return o.focusedCapOn ? o.focusedFps : 0;
  return o.unfocusedCapOn ? o.unfocusedFps : 0;
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, with `export {};` appended: exit 0.

## 5. Lands in

- TARGET `origins/client/render-budget.ts` (new, client-only). Not `src/fight/`: the ruling keeps `src/fight` to the engine, and rings, frame cap and draw budget are presentation of engine state. Frankendom's camera, HUD and sound are client-only, so this follows the same rule.
- Parity row 16 (colour grade / quality; the nearest row for phone frame cap and draw budget). The list hint said row 12, but row 12 is combat sound cues and does not fit a draw or frame topic, so this note uses row 16 and says so.
- today: not checked in this pass (no Frankendom client code was read for rings or frame caps).
- Reuse tag: adapt from idea (GPL v2 source; clean-room, shape only; the GG header is LGPL 2.1 or later, also shape only).
- Brief rule served: client-only presentation of engine state; per-frame cost budget on phones; rule 5 (no engine changes from presentation).

## 6. Gaps and risks

- GPL v2 source: clean-room only. The sketch is written from the described mechanism, not from the donor lines.
- Turn-based donor, real-time target. The donor rebuilds rings on turn init (2853, 3043). Frankendom's aggro and leash rings move every tick, so rebuilding the whole batch per tick needs measuring on a phone. The donor's buffers are static (`createServerBuffer` defaults to `GL_STATIC_DRAW`, GLClientAndServerBuffer.h 103). A moving-ring version should use dynamic buffers and rewrite only changed groups.
- Zoom dependence. The fixed-tessellation fix needs a zoom-triggered rebuild (`pxPerUnit` is baked in). The donor has no such rebuild because its tessellation does not depend on zoom; adding one is a cost to measure.
- Browser frame pacing. A browser cannot sleep the main thread the way `GouvernFPS` does (848). The wait value must go into a timer, and `requestAnimationFrame` already runs at display rate on most phones; a cap below 60 is only useful for background tabs and battery.
- Focus cap. The donor drops to 15 fps on focus loss and pauses music (HandleFocusChange 1190-1212). The Frankendom equivalent is the browser `visibilitychange` event. Music pausing is a sound rule and is out of this note.
- Stencil overlap trick. WebGL has a stencil buffer, but it costs a clear per colour group. The donor needs it only because rings of one colour overlap and must not double-blend; a cheaper option for Frankendom is to draw the fills with a single colour and accept the overlap, to be tested visually at 375 px.
- Not read: the main app loop that calls `RunModal`; the GL buffer class beyond line 103; the Fields/star rendering path. No claims are made about them.
- Hint file `util/ThreadPool.h` was not the rendering code. Nothing from the thread pool is used here.

Reuse tag: adapt from idea (GPL v2 / LGPL 2.1+, clean-room only)
Brief rule served: client-only presentation of engine state; per-frame draw and frame-time budget for phones
