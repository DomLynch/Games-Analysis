# DFHack-dfhack (rendering-performance, cell 3)

Donor: `/mnt/frankendom-donors/DFHack-dfhack/plugins/rendermax/renderer_light.cpp` (symbols `lightingEngineViewscreen::calculate` 277, `updateWindow` 297, `lightThread::run` 1254, `lightThread::combine` 1305, `lightThreadDispatch::signalDoneOcclusion` 1395, `lightThreadDispatch::waitForWrites` 1469) | Licence: Zlib (`/mnt/frankendom-donors/DFHack-dfhack/LICENSE.rst` line 7 says DFHack is Zlib with some MIT and BSD parts; line 11 says plugins use Zlib unless noted; `renderer_light.cpp` has no per-file licence header) | C++ | symbol `lightThreadDispatch::signalDoneOcclusion`

Checked: the list hint is `INFERRED` (no file given). A tree-wide grep (narrow: plugins, library, depends, not a whole-tree scan) for fps, framerate, vsync, cull, batch, atlas, LOD and draw-call terms gave the rendering hooks: `plugins/rendermax/renderer_light.cpp` (1481 lines, the real per-frame work), `library/modules/Renderer.cpp` (160 lines, grep only), `library/modules/Screen.cpp` (grep only), `library/include/modules/Renderer.h` (32 lines, not opened). Read: `renderer_light.cpp` 1-12 (header), 49-63 (source constructor, radius), 104-124 (threads and grid size), 259-325 (blend, clear, calculate, updateWindow), 1254-1312 (worker loop, work, combine), 1366-1393 (per-cell light), 1395-1481 (dispatch start, strip split, barrier); `LICENSE.rst` 7-11. Candidate files opened: 2 read (renderer_light.cpp, LICENSE.rst); library/modules/Renderer.cpp and Screen.cpp were checked by grep only; library/include/modules/Renderer.h was not opened. The note is STRONG, so the three-file rule for PARTIAL or NONE does not apply. Confidence: high on the strip, merge and barrier mechanism (read end to end); medium on the calling frame (not read: the hook that calls `calculate` and `updateWindow`, `doOcupancyAndLights` at 609-900, `Renderer.cpp`, `Screen.cpp`, `renderer_opengl.hpp`). Camera scope: not a camera cell.

Best transferable idea: Split a per-frame grid pass into one vertical strip per worker, give each worker its own buffer, and merge with an order-free max, so the merge needs no ordering; the donor merges the whole buffer instead of the strip, which is the defect.
Decision (proposed): reject - Frankendom has no per-cell light grid to thread, and a browser build would need Web Workers and shared buffers for a feature we do not have; keep the strip-and-max-merge shape as a note for any future grid pass.
Acceptance: Not applicable while rejected. If revived, a worker-pool test asserts that the merged grid equals a single-worker run on the same inputs, and that a light near a strip edge lights cells on both sides.

## 1. Mechanism

The donor is a lighting engine for the Dwarf Fortress map view. The caller that invokes `calculate` and `updateWindow` each frame was not read; the order below is what the two functions do.

- `calculate` (277-296): if the light grid size is stale, it calls `reinit` (grid = whole map plane, `w*h`, 119-120) and invalidates. It clears the source list (287), sets every cell to white (1,1,1), then sets every viewport cell to the level dim (290-292). Then `doOcupancyAndLights` fills occluders and light sources (293, not read). Then `signalDoneOcclusion` (294) and `waitForWrites` (295).
- Strip split (`signalDoneOcclusion`, 1395-1420): clears the write count under the write lock; empties the rectangle stack; takes the viewport; `slicew = w / threadCount` (1408); strip `i` covers columns from `viewport.x0 + i*slicew` up to the next strip, and the last strip (1413) runs to the viewport's right edge; each strip is pushed; the workers are woken.
- Worker loop (`run`, 1254-1292): wait for the occlusion signal; pop one strip (1277); clear `occlusionReady` when the stack is empty; `work()`; then under the write lock `combine()` and `writeCount++` (1289); notify the dispatcher (1291). Workers keep popping until the stack is empty, so the number of writes equals the number of strips.
- `work` (1295-1302): zero its own canvas (1297), then `doLight` for each cell in its strip.
- `combine` (1305-1312): for every cell of the whole canvas, `lightMap[i] = blend(lightMap[i], canvas[i])` (1307-1310). `blend` is per-channel max (261-265), so the order of merges does not change the result.
- Barrier (`waitForWrites`, 1469-1475): waits until the write count equals the worker count.
- Per cell (`doLight`, 1366-1393): the constructor (49-63) uses a given radius when it is 0 or more; for a negative radius it derives radius = `int(log(0.2 / P) / log(0.85)) + 1`, where P is the largest channel of the source power (55-60). A source with radius 0 or less is inert (1371). Otherwise it lights its own cell and its eight neighbours with the source power (1382-1388; the comment says the neighbour pass makes walls look nice), then, if the neighbours received any light (a small threshold, not quoted), it runs `plotSquare` at radius with `doRay` on each square cell (1390-1391). `doRay` (1360) is a diffused line from the source to the target; diffusion count comes from Lua.
- Window swap (`updateWindow`, 297-321): under the data mutex, if the grid is stale it reinitialises and returns; then it swaps the finished buffer with the renderer's grid (no copy) and calls `invalidateRect` on the viewport only (320).

Order of operations per frame: clear and dim the viewport, occluders and sources, split strips, workers light and merge, barrier, swap, invalidate the viewport rectangle.

## 2. Key functions

- `calculate`, `/mnt/frankendom-donors/DFHack-dfhack/plugins/rendermax/renderer_light.cpp` 277-296.
- `updateWindow`, same file 297-321.
- `lightThread::run` 1254-1292, `work` 1295-1302, `combine` 1305-1312.
- `lightThreadDispatch::signalDoneOcclusion` 1395-1420; `start` 1459-1467 (one thread per hardware thread); `waitForWrites` 1469-1475.
- `lightThread::doLight` 1366-1393; the source constructor 49-63.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Strip split: `floor(width / workers)` columns; last strip takes the remainder | Worker count = hardware threads, minimum 1 (theirs, renderer_light.cpp 108-109) |
| Per-worker buffer, merged with an order-free max | Max per channel (theirs, 261-265) |
| Write counter barrier, one write per strip | None |
| Light radius from power, decaying by 0.85 per tile down to a level dim | Level dim 0.2 (theirs, 55; marked "not correct if you change config"); decay 0.85 (theirs, 60) |
| Inert source when radius is 0 or less | Gate `radius > 0` (theirs, 1371) |
| Redraw only the viewport rectangle | None |

Notes: the level dim is set from Lua config (`GETLUANUMBER(engine->levelDim,levelDim)`, renderer_light.cpp 1011), so it is per-config data in the donor, and the comment at 55 says the constant is not tied to config. The flicker branch (inside `doLight`) calls `rand()` from worker threads (not read in detail).

## 4. TypeScript sketch

simplified: keeps the donor's strip split (floor width / workers, last strip takes the remainder), the order-free max merge, and the write counter barrier. It replaces the threads and lock with a plain loop (no concurrency is modelled), and it fixes the defect by merging only each strip's box plus a margin rather than the whole canvas; the margin must cover how far a worker's lights spill, which the donor never needs because it merges everything. It omits the light sources, the occlusion pass, the sun, the flicker, the diffused rays and the viewport clearing.

```ts
// Licence: Zlib (DFHack default per LICENSE.rst; plugins/rendermax/renderer_light.cpp has no per-file header). Clean-room sketch of the strip split, max-merge and write barrier only.
// clean-room
interface Rect { x0: number; y0: number; x1: number; y1: number } // half-open, like the donor's rect2d
interface Grid { w: number; h: number; cells: number[] }          // one scalar channel, for brevity

// Split the viewport into `threads` vertical strips; the last strip takes the remainder.
function planStrips(vp: Rect, threads: number): Rect[] {
  const slice = Math.floor((vp.x1 - vp.x0) / threads);
  const out: Rect[] = [];
  for (let i = 0; i < threads; i++) {
    out.push({
      x0: vp.x0 + i * slice,
      y0: vp.y0,
      x1: i === threads - 1 ? vp.x1 : vp.x0 + (i + 1) * slice,
      y1: vp.y1,
    });
  }
  return out;
}

// Max-merge one worker's canvas into the shared grid over its strip plus a margin
// (the margin must cover how far that worker's lights can spill; the donor merges the whole canvas instead).
// Max is order-free, so merges from different workers commute.
function mergeStripMax(target: Grid, canvas: Grid, strip: Rect, margin: number): void {
  const x0 = Math.max(0, strip.x0 - margin);
  const x1 = Math.min(target.w, strip.x1 + margin);
  const y0 = Math.max(0, strip.y0 - margin);
  const y1 = Math.min(target.h, strip.y1 + margin);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = y * target.w + x;
      target.cells[i] = Math.max(target.cells[i], canvas.cells[i]);
    }
  }
}

// Counting barrier: the frame is ready once every worker has reported its merge.
class WriteBarrier {
  private writes = 0;
  constructor(private readonly workers: number) {}
  reset(): void { this.writes = 0; }   // donor signalDoneOcclusion sets writeCount = 0
  done(): void { this.writes++; }      // donor writeCount++ under the write lock
  ready(): boolean { return this.writes >= this.workers; }
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 rp002-dfhack-strip-merge.ts` on the VPS (with `export {};` appended), exit 0.

## 5. Lands in

- TARGET (only if revived) `origins/client/render/light-strips.ts` (proposed path; not checked against the repo; client presentation, not `src/fight`).
- Parity-checklist row 16 (colour grade/quality), the closest row for a client lighting or render-cost item. Not a hint from the list.
- Reuse tag: rewrite-from-idea (Zlib; clean-room, shape only)
- Brief rule served: licence rule (Zlib, permissive). Row 16 render cost. The one-engine rule does not bind a client render path.

## 6. Gaps and risks

- Defect, derived from the loop (not timed): `combine` walks the whole canvas (1307), the canvas is sized to the whole occlusion grid (1266), and each worker zeroes that whole canvas each frame (1297). So every frame costs `workers x (map plane)` zero-and-merge work, and the merges are serialised under the write lock. The cost follows the map plane, not the viewport. Fix: size each canvas to its strip plus a light margin and merge only that box (the sketch does this). Not measured.
- Light spill: a fix that merges only the strip drops light that crosses a strip edge unless the margin covers the largest radius. Radius comes from the power formula above, so the margin is data-dependent. Not measured.
- No dirty check: `calculate` clears and rebuilds the whole viewport every call (282-296). Cost is per frame even when nothing moved. Fix: a dirty flag per source and occluder; not read whether the caller already skips unchanged frames.
- Flicker uses `rand()` inside worker threads (in `doLight`). The shared generator and the non-deterministic output are a risk if the frame must replay. Not read in detail.
- Rulings: the light map is client presentation and never decides a hit, kill, loot or death. It does not conflict with server-verified kills.
- Why reject for Frankendom: the Pit is a fixed arena and zones are data; neither has a per-cell light grid to thread. The shape is worth keeping for a future grid pass (fog of war, heat, minimap), not for the fight.
- Not read: `doOcupancyAndLights` (609-900), `library/modules/Renderer.cpp`, `library/modules/Screen.cpp`, `renderer_opengl.hpp`, `rendermax.cpp`, and the frame hook that calls `calculate` and `updateWindow`.

Reuse tag: rewrite-from-idea (Zlib; clean-room, shape only)
Brief rule served: licence rule (Zlib, permissive); row 16 render cost; one-engine rule not applicable to client render.
