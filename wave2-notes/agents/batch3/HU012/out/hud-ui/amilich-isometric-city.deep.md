# amilich-isometric-city (hud-ui, cell 1)

Donor: `/mnt/frankendom-donors/amilich-isometric-city/src/components/game/MiniMap.tsx` (with callers in `Game.tsx`, `CanvasIsometricGrid.tsx`, `utils.ts`, `simulation.ts`, `GameContext.tsx`) | Licence: MIT License, Copyright (c) 2025 amilich (read from the `LICENSE` file) | TypeScript (React, canvas 2D) | symbol `MiniMap`

Checked: `MiniMap.tsx` read in full (lines 1-229). Callers and helpers read: `Game.tsx` 241-242 and 337-356; `CanvasIsometricGrid.tsx` 601-602 and 2604-2656; `utils.ts` 405-420; `simulation.ts` 2152-2161 and 2437-2447; `GameContext.tsx` 796-828. Not read: how gt-next resolves `msg('Minimap')` per locale; the values of `TILE_WIDTH` and `TILE_HEIGHT` (in `types.ts`, not opened); the body of the mobile layout beyond line 242; the use of `totalTicks` at `simulation.ts` 2442. Confidence: high on the minimap code and the click-to-centre path; medium on the frame cost (I read the timing constants but did not measure). `camera_scope`: not a camera cell (the viewport outline is a HUD overlay).

## 1. Mechanism

- The minimap is a 140 px square canvas (`MiniMap.tsx` 59) showing the whole city as one colour per tile. The colour comes from a priority chain: water, road, tree, burning, then residential, commercial and industrial by zone (built and empty shades), then service, power plant, water tower and park building types (84-98). Order matters: the first match wins, so fire overrides the zone colour and water overrides everything.
- Order of steps on each draw (one `useEffect`, deps at 139: grid, gridSize, viewport, tick, the two Sets):
  (a) Decide whether to repaint the base layer (68-72). Repaint if there is no cached base yet (`lastGridRenderTickRef === -1`), or the tick has moved 10 or more since the last repaint (69), or the grid reference changed (63).
  (b) If repainting: fill the background (75-76), paint one `fillRect` per cell (78-103), then save the result with `getImageData` (106) and remember the render tick (73).
  (c) If not repainting and a cache exists: restore it with `putImageData` (107-109).
  (d) Always draw the viewport outline (112-137): map the four canvas corners to grid units with the inverse of the isometric projection (116-127), then stroke them as a closed quad, white at 85% opacity, 2 px wide (129-137).
- Click and drag (141-192): mouse down sets `isDragging` and navigates; mouse move navigates while dragging; mouse up, mouse leave, and a window-level mouse up clear the flag. `navigateToPosition` turns the click into a cell (floor, 156-157) and clamps it to 0 to gridSize-1 (160-161), then calls `onNavigate`.
- The main canvas handles the request (`CanvasIsometricGrid.tsx` 2633-2656): it computes the offset that puts the target cell's screen point at the canvas centre (2636-2643), clamps it to the map bounds (2648-2652, bounds from `getMapBounds` 2604-2617 with a 100 px over-scroll pad at 2606), and sets the offset in one step (no tween, 2650-2651). Then it clears the request (2655).
- Feedback loop: the main canvas reports `{offset, zoom, canvasSize}` on every change (601-602); the minimap stores it as `viewport` and redraws the outline on the next effect run. The minimap has no loop of its own.
- Data flow of one click: minimap canvas -> cell (floor, clamp) -> `setNavigationTarget` -> main canvas sets offset (instant, clamped) -> request cleared -> viewport reported back -> minimap outline moves.
- Tick and timing: the simulation runs in a `setInterval` (`GameContext.tsx` 814). Its period depends on speed and device: desktop 500, 300, 200 ms for speeds 1 to 3 (812); mobile 750, 450, 300 ms (811). Each tick calls `simulateTick` (sim 2152). React state is only pushed every 500 ms (826), so the minimap sees new state at most every 500 ms while the sim runs. When paused, the base layer does not repaint; only pan and zoom redraw the outline from the cache.
- The `tick` the minimap reads is the sub-day counter: `newTick = state.tick + 1` (sim 2437) and it resets to 0 when it reaches 30 (2446-2447). So it cycles 0 to 29 and never grows.

## 2. Key functions

- `MiniMap` (React.memo component): `MiniMap.tsx` 39-229. Draw effect: 52-139. Base-layer decision: 68-72. Base paint: 75-103. Cache save and restore: 106-110. Viewport outline: 112-137.
- `screenToGridForMinimap` (inline inside the effect): `MiniMap.tsx` 116-122. Inverse isometric map: x = (a/(W/2) + b/(H/2))/2, y = (b/(H/2) - a/(W/2))/2, where a and b are the screen offsets from the camera offset, divided by zoom.
- `navigateToPosition`: `MiniMap.tsx` 143-164. Drag handlers: 166-192.
- Navigation effect (main canvas): `CanvasIsometricGrid.tsx` 2632-2656. `getMapBounds`: 2604-2617.
- Viewport report: `CanvasIsometricGrid.tsx` 600-602.
- `simulateTick` tick counter and grid: `simulation.ts` 2152 (signature), 2161 (new outer grid array), 2437 (tick increment), 2446-2447 (wrap at 30).
- Driver: `GameContext.tsx` 796-828 (interval by speed, tick call, 500 ms React sync).
- Forward map used by navigation: `utils.ts` 405-409 (`gridToScreen`: screenX = (x - y) * W/2, screenY = (x + y) * H/2).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Cached base layer, live overlay on top | Repaint every 10 ticks (`MiniMap.tsx` 69), plus on grid reference change (63). See defect 1 and 2: the 10-tick path is not the operative trigger. |
| Priority-chain tile colour (first match wins) | Water `#0ea5e9` (85), burning `#ef4444` (88), residential built `#22c55e` and empty `#14532d` (89-90), commercial `#38bdf8` and `#1d4ed8`, industrial `#f59e0b` and `#b45309`, services `#c084fc`, power `#f97316`, parks `#84cc16`. All theirs, from `MiniMap.tsx` 75-98. |
| Minimap size | 140 px square (59, 201-202) |
| Viewport outline | 2 px line width (130); outline alpha 0.85 (129) |
| Click to cell | Floor, then clamp to the grid (156-161). No constants. |
| Camera centre and clamp | Over-scroll pad 100 px (`CanvasIsometricGrid.tsx` 2606). Tile width and height not read (values in `types.ts`). |
| Simulation cadence | 500, 300, 200 ms desktop (812); 750, 450, 300 ms mobile (811); React sync 500 ms (826) |
| Day length in sub-ticks | 30 (`simulation.ts` 2446) |

## 4. TypeScript sketch

simplified: the sketch keeps the viewport-quad maths, click-to-cell with clamp, centre-and-clamp, and the base-layer redraw decision. It omits the colour priority chain, the canvas drawing and the `getImageData` save, the drag state and window mouse-up, the React effect wiring, the mobile layout, and the gt-next label. It changes one thing on purpose: the redraw test takes a monotonic `totalTick` (the donor passes the sub-day tick, which wraps at 30). Tile width and height are parameters, not the donor's values (not read). The donor's isometric inverse is kept; the flat-map version for a 3D zone would replace it.

```ts
// Licence: MIT (donor, amilich-isometric-city LICENSE). Adapted shape; the isometric projection is replaced by a flat map.
// Minimap core: pure math, no DOM. Shape: viewport quad from the inverse projection, click-to-cell with clamp,
// centre-on-cell clamped to map bounds, and a base-layer redraw test on a monotonic tick.

export interface Pt { x: number; y: number }
export interface View { offset: Pt; zoom: number; canvasW: number; canvasH: number }
export interface Bounds { minX: number; maxX: number; minY: number; maxY: number }
export interface RedrawMemo { lastTick: number; lastGrid: unknown }

// Inverse of the iso projection: screen px -> fractional grid coordinate (no half-tile centre offset).
export function screenToGrid(sx: number, sy: number, v: View, tileW: number, tileH: number): Pt {
  const ax = (sx - v.offset.x) / v.zoom;
  const ay = (sy - v.offset.y) / v.zoom;
  return {
    x: (ax / (tileW / 2) + ay / (tileH / 2)) / 2,
    y: (ay / (tileH / 2) - ax / (tileW / 2)) / 2,
  };
}

// The four canvas corners as a quad in grid units; drawn on top of the base layer every sync.
export function viewQuad(v: View, tileW: number, tileH: number): Pt[] {
  const corners: Pt[] = [
    { x: 0, y: 0 },
    { x: v.canvasW, y: 0 },
    { x: v.canvasW, y: v.canvasH },
    { x: 0, y: v.canvasH },
  ];
  return corners.map(c => screenToGrid(c.x, c.y, v, tileW, tileH));
}

// Grid units -> minimap pixels for a square map of mapPx pixels and gridSize cells per side.
export function gridToMini(p: Pt, mapPx: number, gridSize: number): Pt {
  const s = mapPx / gridSize;
  return { x: p.x * s, y: p.y * s };
}

// Minimap pixel -> whole grid cell, clamped to the grid.
export function miniToCell(px: number, py: number, mapPx: number, gridSize: number): Pt {
  const s = mapPx / gridSize;
  const clamp = (n: number): number => Math.max(0, Math.min(gridSize - 1, n));
  return { x: clamp(Math.floor(px / s)), y: clamp(Math.floor(py / s)) };
}

// Camera offset that centres a cell on the canvas, then clamped to the map bounds (instant, not animated).
export function centreOffset(cell: Pt, zoom: number, canvasW: number, canvasH: number,
                             tileW: number, tileH: number, b: Bounds): Pt {
  const sx = (cell.x - cell.y) * (tileW / 2);
  const sy = (cell.x + cell.y) * (tileH / 2);
  const x = canvasW / 2 - sx * zoom;
  const y = canvasH / 2 - sy * zoom;
  return {
    x: Math.max(b.minX, Math.min(b.maxX, x)),
    y: Math.max(b.minY, Math.min(b.maxY, y)),
  };
}

// Base-layer redraw test. Redraw on first frame, when the grid reference changes, or when
// totalTick has advanced by everyTicks. totalTick must be monotonic (the donor's sub-day tick wraps at 30).
export function needsBaseRedraw(memo: RedrawMemo, totalTick: number, grid: unknown, everyTicks: number): boolean {
  const due = memo.lastTick < 0 || totalTick - memo.lastTick >= everyTicks || grid !== memo.lastGrid;
  if (due) {
    memo.lastTick = totalTick;
    memo.lastGrid = grid;
  }
  return due;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 amilich-minimap-core.ts` on the VPS, exit 0.

## 5. Lands in

- TARGET `origins/client/hud/minimap.ts` (new file; client only; the engine never reads it). Parity-checklist row 14 (HUD). It reads zone grid data (`gridSize`, the tile list) and the camera's viewport; it must not write state.
- Reuse tag: adapt-idea (MIT, so the code may be adapted; the sketch is written from the mechanism and does not copy the donor lines)
- Brief rule served: client-only HUD (camera, HUD and sound are client-only); zones as data (the grid comes from zone data, not a constant in the HUD)

Best transferable idea: a minimap that caches its static base layer, repaints only when the source data changes, draws the camera footprint as a live outline, and turns a tap into a clamped camera centre.
Decision (proposed): adapt — keep the cache, the live outline and tap-to-centre with clamp; drop the isometric projection (Frankendom zones are 3D) and the wrapping-tick redraw test; `getImageData` readback replaced by an offscreen canvas. Why: a HUD mechanism with no combat state, it fits row 14 and the one-engine rule because it never writes state.
Acceptance: on a 375 px wide phone in a zone, the minimap shows the zone grid, its outline moves as the camera moves, and a tap on a cell centres the camera on that cell (clamped to the zone bounds) within one UI sync. No server test is needed; no gameplay state changes.

## 6. Gaps and risks

- Projection does not transfer. The donor's inverse isometric map (116-127) and tile constants have no meaning in a 3D third-person zone. The transferable part is the flat version: world XZ to map pixels, and the outline as the camera's ground footprint (a trapezoid under a perspective camera, a rectangle under a top-down one). Not read: any 3D minimap.
- Defect 1, the periodic redraw test uses a wrapping tick. `MiniMap.tsx` 69 compares `tick` with the last render tick, but `tick` cycles 0 to 29 (`simulation.ts` 2437, 2446-2447). Once the last render tick is 20 or more, the 10-tick test can never fire again. fix: pass a monotonic total tick. The donor already computes a `totalTicks` value at `simulation.ts` 2442 (use not read); use that, or a counter incremented in `simulateTick`.
- Defect 2, the grid-reference test is what actually triggers the repaint. `simulateTick` builds a new outer grid array on every tick (`simulation.ts` 2161), and React state is pushed every 500 ms (`GameContext.tsx` 826). So the minimap repaints about every 500 ms while the sim runs, and the 10-tick branch is not what decides it in practice. fix: repaint from a dirty flag the engine sets when a tile changes, not from a reference check.
- Defect 3, `getImageData` (`MiniMap.tsx` 106) reads the canvas back to the CPU on every full repaint. fix: draw the base into an offscreen canvas once and `drawImage` it.
- Defect 4, two inverse maps disagree. `utils.ts` 416 subtracts a half-tile centre offset; the minimap inverse (119) does not. Navigation (`CanvasIsometricGrid.tsx` 2636-2643) also uses the no-offset form, so the minimap and navigation agree with each other but not with `utils.screenToGrid`. fix: one conversion in a shared module, with the tile-centre choice made once.
- Defect 5, the minimap is not on mobile and is mouse-only. `Game.tsx` 241-242 returns the mobile tree before the desktop `MiniMap` at 356, and the canvas only has mouse handlers (`MiniMap.tsx` 204-205; no touch or pointer events). fix: show it on touch, use pointer events, make a tap centre the camera and a drag pan it.
- Defect 6, the legend letters R, C, I, S are hard-coded English (`MiniMap.tsx` 212-224, not wrapped in `msg`), and the canvas element has no aria label (JSX 199-208). fix: `msg()` for the letters and an `aria-label` on the canvas.
- Navigation is an instant jump (`CanvasIsometricGrid.tsx` 2650-2651). Keep the idea; a short tween would be better for a 3D camera. Its duration is a data field; the donor gives no value, so none is proposed here.
- Readability at 375 wide: the donor's 140 px box is 37% of a 375 px width. On a phone that is too large unless it is toggled or scaled. Frankendom should make the size a client setting, not a constant.
- No separate full-screen world map was found: a grep for `minimap` and `Minimap` across `src` returned only the minimap files (`game/MiniMap.tsx`, `coaster/MiniMap.tsx`, and their callers). This is not exhaustive.
- Localisation: the label goes through `msg('Minimap')` (`MiniMap.tsx` 37). See the string table fold-in below.

String table fold-in (`public/_gt/*.json`, gt-next): 8 locale files (de, es, fr, it, ja, pt-BR, tr, zh), 329 entries each. Keys are 16 hex characters; the default locale `en` has no file, its strings come from the `msg()` calls in source. Of the values in `de`, 310 are plain strings (average 2.9 words, sentence case; UI labels are noun phrases or infinitive verbs, German nouns capitalised, no colons, 29 with parentheses, 4 with `{name}` placeholders), 7 are lists and 12 are objects with keys `c`, `i`, `t` (meaning not read). The English word "Minimap" appears as a value only in es, it and pt-BR. I did not compute the hash key for the label, so I cannot say what the other locales show for it (not read).

Reuse tag: adapt-idea (MIT)
Brief rule served: client-only HUD; zones as data; row 14
