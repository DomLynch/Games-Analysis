# pshenok-server-survival (rendering-performance, cell 1)

Donor: `/mnt/frankendom-donors/pshenok-server-survival/src/ui/metrics-panel.js` (with `src/core/metrics.js` and `game.js` animate) | Licence: MIT (LICENSE file: "MIT License", Copyright (c) 2025 Kostyantyn Pshenychnyy) | JavaScript (Three.js) | symbol `renderMetricsPanel`

Checked: Read in full: `renderMetricsPanel` (metrics-panel.js 69-103), `metricsTick` and `takeSample` (core/metrics.js 156-165), the per-frame `animate` block (game.js 1112-1120, 1203-1207, 1526). Read 165-200 of metrics-panel.js (drawSparklines); the rest of that function and `buildRows` body were not read. Opened and set aside: `src/sim/gpu.js` (the list hint; read in full, it is a server-side batch, not rendering), `src/entities/Request.js` (grep hits at 47-48 and 147-149, lines checked in context). Confidence: high on the repaint gate, the sample clock and the dt clamp (all read, numbers checked). Medium on the cost story: the donor has no frame-time or profiler numbers, so the saving is read from the code, not measured. Not read: the Service.js and topology.js dispose paths beyond grep hits. camera_scope: n/a.

Best transferable idea: Redraw a readout only when a fixed-step counter moves, and rebuild its DOM rows only when the set of rows changes, instead of touching the DOM every frame.
Decision (proposed): adapt - keep the gate and the frozen-on-pause clock, but count fight ticks instead of wall-clock seconds, use an integer topology version instead of the donor's per-frame string, and keep the HUD read-only; reject the 2 Hz cadence for combat readouts because a duel needs each tick.
Acceptance: A client test runs 120 frames (2 s at 60 fps) on a paused fight and asserts the HUD repaint runs 0 times after the first paint; at 1x it repaints once per tick that changed a readout, not once per frame.

## 1. Mechanism

- Frame loop. `animate(time)` (game.js 1112) re-arms `requestAnimationFrame` (1113) and returns early when the game is not running (1114). It computes `rawDt` from the timestamp difference in milliseconds (1118), clamps it to 0.1 s (1119), then multiplies by `STATE.timeScale` (1120).
- Per frame, in order: `metricsTick(dt)` (game.js 1206), then `renderMetricsPanel()` (1207). The one `renderer.render(scene, camera)` (1526) ends the frame.
- Sample clock. `metricsTick` returns at once when `timeScale` is 0 (core/metrics.js 156), so pause freezes sampling. Otherwise it adds `dt` to an accumulator (157) and loops `while (sampleAcc >= SAMPLE_INTERVAL)` (158), taking one sample per 0.5 s of scaled time. `takeSample` increments a monotonic `sampleCount` (164-165). History buffers hold 120 samples (metrics.js 23), which is 60 s.
- Panel gate. `renderMetricsPanel` (metrics-panel.js 69) returns early while the monitor is locked. When unlocked it builds a string signature of the service set every frame (89), and if the signature changed it rebuilds the rows (93) and resets `lastDrawnSample` to -1 (95). Then it compares the sample counter with the last drawn value (100): if different, it redraws the sparklines (101) and stores the value (102).
- Result: DOM work happens only when the row set changes. Canvas work happens only when a new 0.5 s sample lands. A paused game takes no samples, so the panel does not repaint.
- Order of operations: clock first, then the rebuild check, then the redraw check. The panel's cost per frame is one string build over the services plus one integer compare.

## 2. Key functions

- `animate`: `/mnt/frankendom-donors/pshenok-server-survival/game.js` 1112-1526. Frame loop; dt clamp at 1119; panel refresh at 1207.
- `metricsTick`: `/mnt/frankendom-donors/pshenok-server-survival/src/core/metrics.js` 152-162. Pause guard, accumulator, catch-up loop.
- `takeSample`: `/mnt/frankendom-donors/pshenok-server-survival/src/core/metrics.js` 164-165. Increments `sampleCount`.
- `renderMetricsPanel`: `/mnt/frankendom-donors/pshenok-server-survival/src/ui/metrics-panel.js` 69-103. Lock check, signature rebuild gate (89-93), sample redraw gate (98-102).
- `drawSparklines`: `/mnt/frankendom-donors/pshenok-server-survival/src/ui/metrics-panel.js` 168 on (read to 200). Clears and draws each canvas per service and column.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Fixed-interval accumulator: one sample per interval of scaled time, caught up in a loop | Sample interval 0.5 s (theirs, metrics.js 22) |
| Clock frozen when paused | Pause is `timeScale` 0 (metrics.js 156; speed buttons call `handleGameState(0)`, `(1)`, `(3)` in index.html 408, 414, 420) |
| Frame dt clamped before scaling, so a stalled tab cannot jump the sim | Clamp 0.1 s (theirs, game.js 1119) |
| Redraw on counter change; rebuild DOM on signature change | None (mechanism) |
| Bounded history | 120 samples = 60 s (theirs, metrics.js 23) |
| Fastest speed | 3x (index.html 420), so at most 0.3 s of scaled time per frame |
| Atmosphere | `FogExp2` density 0.008 (theirs, game.js 298); the only weather-like item in the donor |

Defect check, in the donor's own numbers:
- Defect 1: the service-set signature is rebuilt every frame (metrics-panel.js 89) even when nothing changed. This is an allocation per frame, not a DOM write. Fix: an integer topology version bumped on the change events, compared as a number (sketch `RepaintGate.frame`).
- Defect 2 (design, not a bug): the 0.1 s clamp (game.js 1119) means that below 10 fps the sim runs slow, because each frame advances at most 0.1 s. Fix for Frankendom: the clamp belongs to the client render clock only. The engine steps on fixed fight ticks and never reads frame dt.
- No defect at the donor's own speeds: the catch-up loop (metrics.js 158) has no cap of its own, but with a 0.1 s clamp and a 3x top speed it adds at most about one sample per frame. The sketch adds a cap of 4 anyway, for a future faster speed.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order (clock first, then rebuild-on-change, then redraw-on-new-sample) and the frozen-on-pause rule. It changes three things: it uses an integer topology version in place of the donor's per-frame string signature (defect 1), it adds a per-tick sample cap the donor does not have, and it takes the scaled dt as an argument instead of reading the global clock. It omits the sparkline drawing, the alert tint, the buffers and the DOM row builder, and it assumes the caller already scaled dt. Typechecked on the VPS (`tsc --noEmit --strict --target es2020`, exit 0).

```ts
// Licence: MIT (donor, Copyright (c) 2025 Kostyantyn Pshenychnyy). Shape adapted; code written fresh.
export const SAMPLE_INTERVAL_S = 0.5;   // donor: src/core/metrics.js:22 (2 Hz)
export const MAX_FRAME_DT_S = 0.1;      // donor: game.js:1119 (frame clamp)
export const MAX_SAMPLES_PER_TICK = 4;  // added here, not in donor: caps a catch-up burst

// Fixed-interval sample clock. Frozen when paused, as in the donor.
export class SampleClock {
  private acc = 0;
  private count = 0;

  // scaledDt is already multiplied by the time scale (donor passes dt = clampedDt * timeScale).
  tick(scaledDt: number, timeScale: number): void {
    if (timeScale === 0) return;
    this.acc += scaledDt;
    let n = 0;
    while (this.acc >= SAMPLE_INTERVAL_S && n < MAX_SAMPLES_PER_TICK) {
      this.acc -= SAMPLE_INTERVAL_S;
      this.count++;
      n++;
    }
    if (n === MAX_SAMPLES_PER_TICK) this.acc = 0; // drop the excess rather than burst
  }

  get sampleCount(): number {
    return this.count;
  }
}

// Repaint gate: rebuild only when the topology version changes, redraw only when a new sample lands.
// Integer version instead of the donor's per-frame string signature (the donor's defect).
export class RepaintGate {
  private lastVersion = -1;
  private lastDrawn = -1;

  constructor(
    private readonly clock: SampleClock,
    private readonly rebuild: () => void,
    private readonly redraw: () => void,
  ) {}

  // Called once per frame; does nothing when neither version nor sample count moved.
  frame(topologyVersion: number): void {
    if (topologyVersion !== this.lastVersion) {
      this.rebuild();
      this.lastVersion = topologyVersion;
      this.lastDrawn = -1; // force one redraw after a rebuild, as the donor does
    }
    const n = this.clock.sampleCount;
    if (n !== this.lastDrawn) {
      this.redraw();
      this.lastDrawn = n;
    }
  }
}

export {};
```

## 5. Lands in

- TARGET `src/fight/sample-clock.ts` (new, engine): a fixed-step counter advanced by the fight tick, frozen when the fight is paused, with no wall-clock input. The client HUD owns `RepaintGate` and only reads the counter and a topology version from the engine; it never writes engine state. Parity-checklist row 14 (HUD).
- today: not read (the Frankendom repo was not opened in this pass, so I cannot say what exists now).
- Reuse tag: reuse-as-shape (MIT: adaptation allowed; the sketch is written fresh, not a translation)
- Brief rule served: 1 (one engine: the clock lives in the engine and clients only read it); the camera/HUD/sound are client-only ruling.

## 6. Gaps and risks

- The donor's panel is a board-game metrics panel with 2D canvas sparklines, not a fight HUD. There are no frame-time numbers in the donor, so the saving is inferred from the code, not measured.
- The donor has none of the rendering-budget items in the topic: no draw-call budget, no sprite or instanced batching (`InstancedMesh` has no hits in src or game.js), no LOD, no texture atlas, no frame-time budget. The only culling is the orthographic frustum sizing at game.js 303. Searched with grep, not read in full.
- The nearest thing to batching runs the other way. `Request.js` 47-48 allocates a new `SphereGeometry` and a new `MeshBasicMaterial` for every request, and 148-149 disposes both on removal. For a many-on-one fight this means one allocation per spawned attacker. Frankendom should share geometry and material per creature kind (zones as data) and must not copy this.
- Frankendom's server tick is authoritative. The donor's dt clamp (game.js 1119) and its 3x speed (index.html 420) are client display concerns; nothing in this sketch may feed the engine step.
- Fold-ins: terrain, foliage, water and weather are absent from the donor. Its only atmosphere is `scene.fog` (game.js 298).
- Wrong hint file: `src/sim/gpu.js` is the list's hint. Read in full, it is a server-side fill-or-timeout batch: it launches when the batch is full or the window has run out (130), and runs for `(batchBaseMs + batchPerItemMs * n) * meanGenLength` (136-137). It is an amortization idea for the server tick (row 18), not a render batch, and it is not part of this note. Strategy may want it filed under server tick.
- The defect list is complete for the code read here. The donor was not run, so the 0.5 s and 120-sample behaviour is from the code, not an observed run.
