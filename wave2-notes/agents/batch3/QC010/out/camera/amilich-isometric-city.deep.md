# amilich-isometric-city (camera, cell 14)

Donor: `/mnt/frankendom-donors/amilich-isometric-city/src/components/game/CanvasIsometricGrid.tsx` | Licence: MIT ("MIT License, Copyright (c) 2025 amilich", LICENSE line 1) | TypeScript (React, canvas 2D) | symbol `handleWheel`

Checked: camera_scope: world camera, and this is a 2D pan and zoom over a tile grid, not a 3D follow camera. Read end to end: the camera state (CanvasIsometricGrid.tsx:144, 164), the bounds (2603-2620), the clamp (2622-2629), the minimap jump (2631-2656), mouse drag pan (2658-2683), the wheel zoom (2852-2899), pinch and single-finger touch (2915-2981), and keyboard pan (612-660). Constants read: constants.ts:62-63, types.ts:6-9. Confidence: high on the zoom, clamp and pan arithmetic; medium on how far the 3D transfer goes, because the camera has no vertical or yaw axis. Not read: `gridToScreen` and `screenToGrid` bodies, the render code that draws the grid under the transform, the touch-end and mouse-up branches beyond the pan reset, and the other donor's camera (`CoasterGrid.tsx` has a similar camera; not read). The app was not run.

Best transferable idea: keep the camera's scroll limits as a function of the current zoom and the map size, and when the zoom changes, keep the point under the cursor fixed and then clamp, so the view can never leave the level.
Decision (proposed): adapt - use zoom-aware bounds and cursor- or reticle-anchored zoom for the world camera's distance and framing; reject the screen-pixel keyboard pan, because the pan speed changes with zoom and a 3D camera should pan in world units.
Acceptance: a client test asserts that after a wheel zoom the anchor point stays within 1 px of its screen position before the clamp, and that at every zoom the camera's look point stays inside the zone's bounds plus a 100 px margin; in play, a zoom toward a fighter keeps that fighter at the same screen point.

## 1. Mechanism

- The camera is a screen offset in pixels plus one zoom number. A world point maps to screen as `screen = world * zoom + offset` (comment at 2885; the transform is applied at 710-711 and 740-741). The inverse is `world = (screen - offset) / zoom` (2886-2887).
- Initial values: offset (620, 160) on desktop or (200, 100) on mobile (144); zoom 1 on desktop or 0.6 on mobile (164). Zoom is limited to 0.3 to 5 (constants.ts:62-63; clamped at 2867 and 2949).
- Bounds (2604-2620): with grid size N, the map runs from `left = -(N-1)*TILE_WIDTH/2` to `right = (N-1)*TILE_WIDTH/2`, top is 0, and bottom is `(N-1)*TILE_HEIGHT`. Each limit is a screen offset at the current zoom: `minX = 100 - right*zoom`, `maxX = canvasW - 100 - left*zoom`, `minY = 100 - bottom*zoom`, `maxY = canvasH - 100 - 0*zoom`. The 100 px is the over-scroll margin (2606). Because the limits multiply by zoom, they move as the user zooms.
- Clamp (2622-2629): every path that sets the offset calls `clampOffset(newOffset, zoom)`, which applies the bounds computed for that zoom. The wheel path clamps against the new zoom (2895), not the old one.
- Wheel (2852-2899): preventDefault; the cursor is taken relative to the container (2859-2860); the step is `0.05 * max(0.5, zoom)` (2864-2865), so zooming in or out is multiplicative at high zoom and additive-floored at low zoom; the sign comes from `deltaY` (2866); the zoom is clamped (2867) and a no-op returns early (2869). Then the world point under the cursor is computed with the old zoom (2886-2887), the new offset keeps it under the cursor (2891-2892), the result is clamped (2895), and state is set (2897-2898). A flag is set and cleared 150 ms after the last wheel event (2872-2882); it turns off the lights during zoom for performance (comment at 2871), not for the camera.
- Pinch (2934-2981): on two touches the initial distance and zoom are stored (2925-2928). Each move: `scale = distance / initial` (2948), `newZoom = clamp(initialZoom * scale)` (2949), the anchor is the pinch centre under the old zoom (2960-2965), the centre movement is added (2968-2972), and the result is clamped (2974).
- Mouse drag (2658-2683): a press only records a candidate (`panCandidateRef`). The pan starts after the pointer moves 6 px on either axis (PAN_DRAG_THRESHOLD, line 305; test at 2663). The grab offset is stored as pointer minus offset (2665), and each move sets `offset = pointer - grab` and clamps (2667-2671, 2676-2681).
- Single-finger touch (2915-2944): pan starts at once, with no threshold (2921), and each move is clamped (2944).
- Minimap jump (2631-2656): the grid cell is converted to a screen point at zoom 1 with zero offset (2636), then the offset is set so that point is at the canvas centre (`centerX - screenX * zoom`, 2643), and clamped (2648-2652). It is an instant set, not an animation.
- Keyboard (612-660): WASD and arrows are recorded in a set (612-619). A `requestAnimationFrame` loop (626-630) computes `delta = min(frame seconds, 0.05)` (631), moves the offset by `KEY_PAN_SPEED * delta` in screen pixels (637-640; speed 520 at types.ts:9), and clamps against bounds recomputed inline (645-658).
- Timing: the camera is updated by events (wheel, pointer, touch, navigation) and by the keyboard loop. There is no smoothing, lerp or inertia on the camera. The camera adds no delay of its own; the canvas redraw is throttled with `requestAnimationFrame` (renderPendingRef, 982).

## 2. Key functions

- `handleWheel`: `/mnt/frankendom-donors/amilich-isometric-city/src/components/game/CanvasIsometricGrid.tsx` 2852-2899 (step, clamp, anchor).
- `getMapBounds`: same file, 2604-2620 (bounds at a zoom). `clampOffset`: 2623-2629.
- Pinch: same file, 2915-2981 (`handleTouchStart`, `handleTouchMove`).
- Mouse drag pan: same file, 2658-2683.
- Minimap jump: same file, 2632-2656.
- Keyboard pan loop: same file, 612-660 (inside a `useEffect`; the wrapper lines were not all read).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Scroll limits are screen offsets derived from world extents times zoom, with a fixed screen margin | Margin 100 px (theirs, 2606); TILE_WIDTH 64 (theirs, types.ts:6); HEIGHT_RATIO 0.60 so TILE_HEIGHT = 38.4 (theirs, types.ts:7-8, derived) |
| Worked example, N = 64 at zoom 1 on a 1200 x 800 canvas (derived from the formulas): minX -1916, maxX 3116, minY -2319.2, maxY 700 | none (arithmetic) |
| Zoom step proportional to zoom, floored at 0.5x | Base 0.05 (theirs, 2864); floor 0.5 (theirs, 2865) |
| Zoom range | 0.3 to 5 (theirs, constants.ts:62-63) |
| Cursor-anchored zoom: the world point under the cursor is fixed before the clamp | None (algebra in 2886-2892) |
| Pan starts after a dead zone | 6 px (theirs, line 305) |
| Keyboard pan in screen pixels per second, frame step capped | 520 px/s (theirs, types.ts:9); cap 0.05 s (theirs, 631) |
| Wheel-zoom flag clears after a quiet period | 150 ms (theirs, 2882) |
| Initial camera | Offset 620, 160 (desktop) and 200, 100 (mobile) (theirs, 144); zoom 1 and 0.6 (theirs, 164) |

The worked example is my arithmetic from the formulas, not a value in the donor.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for the wheel (step, clamp the zoom, read the world point at the old zoom, keep it under the cursor, clamp the result) and the keyboard step (cap the frame, move, clamp). It writes the bounds as one function of grid size, tile size, zoom and canvas size. It omits the React state and refs, the flag that turns lights off during zoom, the pinch and touch paths, the drag dead zone's bookkeeping (only the test is kept), the minimap jump, and the offset and zoom state updates. The donor's keyboard loop computes its bounds inline (645-653); the sketch uses the same function for both.

```ts
// Licence: MIT (donor, amilich, 2025). Code may be adapted with attribution; this sketch is written from the mechanism.
interface View { offset: { x: number; y: number }; zoom: number; }
interface Bounds { minX: number; maxX: number; minY: number; maxY: number; }

const ZOOM_MIN = 0.3, ZOOM_MAX = 5;
const PAD = 100;             // screen px of over-scroll kept inside the canvas
const WHEEL_BASE = 0.05;     // zoom step at zoom 1, scaled by max(0.5, zoom)
const KEY_PAN_PX_PER_S = 520;
const DRAG_THRESHOLD_PX = 6;

// Scroll bounds for the current zoom. Map edges are in world units, so the limits scale with zoom.
function mapBounds(gridN: number, tileW: number, tileH: number, zoom: number, canvasW: number, canvasH: number): Bounds {
  const left = -(gridN - 1) * tileW / 2;
  const right = (gridN - 1) * tileW / 2;
  const bottom = (gridN - 1) * tileH;
  return {
    minX: PAD - right * zoom,
    maxX: canvasW - PAD - left * zoom,
    minY: PAD - bottom * zoom,
    maxY: canvasH - PAD,       // top edge is world y = 0
  };
}

function clampOffset(o: { x: number; y: number }, b: Bounds): { x: number; y: number } {
  return { x: Math.max(b.minX, Math.min(b.maxX, o.x)), y: Math.max(b.minY, Math.min(b.maxY, o.y)) };
}

// Wheel zoom about the cursor: the world point under the cursor stays under it, then the result is clamped.
function wheelZoom(v: View, deltaY: number, mx: number, my: number, bounds: (z: number) => Bounds): View {
  const step = WHEEL_BASE * Math.max(0.5, v.zoom);
  const z = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, v.zoom + (deltaY > 0 ? -step : step)));
  if (z === v.zoom) return v;
  const wx = (mx - v.offset.x) / v.zoom;
  const wy = (my - v.offset.y) / v.zoom;
  const raw = { x: mx - wx * z, y: my - wy * z };
  return { zoom: z, offset: clampOffset(raw, bounds(z)) };
}

// Keyboard pan: a fixed screen-pixel speed per second, with the frame step capped at 50 ms, then clamped.
function keyPan(v: View, dirX: number, dirY: number, frameSec: number, bounds: (z: number) => Bounds): View {
  const dt = Math.min(frameSec, 0.05);
  const raw = { x: v.offset.x + dirX * KEY_PAN_PX_PER_S * dt, y: v.offset.y + dirY * KEY_PAN_PX_PER_S * dt };
  return { zoom: v.zoom, offset: clampOffset(raw, bounds(v.zoom)) };
}

// A press becomes a pan only after the pointer has moved past the threshold on either axis.
function panStarted(startX: number, startY: number, x: number, y: number): boolean {
  return Math.abs(x - startX) >= DRAG_THRESHOLD_PX || Math.abs(y - startY) >= DRAG_THRESHOLD_PX;
}
```

## 5. Lands in

- TARGET `src/fight/camera.ts` (client-only camera module, shared with the note on PixelGuys-Cubyz): zoom-aware scroll bounds for the world camera and cursor- or reticle-anchored zoom. Parity-checklist row 11 (fight camera). The current Frankendom camera code was not opened for this note.
- Reuse tag: adaptable-code (MIT; attribution required if any code is copied; this sketch is from the mechanism)
- Brief rule served: the camera is client-only (the engine never reads it); fight camera is row 11; zone size enters the bounds as data

## 6. Gaps and risks

- The donor is 2D and top-down over a tile grid. It has no third-person pitch, yaw, shoulder offset, follow target or collision. Only the bounds rule and the anchored zoom transfer. Lock-on framing, combat FOV change and shake are not in this code.
- Screen-pixel keyboard pan. `offset` is in pixels (637-640), so the world speed of the keyboard pan is `520 / zoom` world pixels per second. At zoom 0.3 it is about 3.3 times as fast as at zoom 1 (derived from `world = (screen - offset) / zoom`). A 3D camera should pan in world units; reject this for Frankendom.
- No smoothing. Every camera change is a state set (wheel, drag, minimap, keys). A third-person camera needs the lag and smoothing from the PixelGuys-Cubyz note (spring, frame-rate independent), not this code.
- Two copies of the bounds. `getMapBounds` (2604-2620) and the inline copy in the keyboard loop (645-653) have the same formulas. The copies can drift; Frankendom should keep one function.
- Zone data. The bounds depend on the grid size N and the tile sizes. In Frankendom these come from zone data, so the bounds must be recomputed when a zone loads.
- Touch pan has no dead zone (2921 against 2663). A small finger movement pans at once. If Frankendom wants the same feel for mouse and touch, it needs one threshold.
- The 150 ms wheel flag (2882) switches off lights during zoom. That is a performance rule for the renderer, not a camera rule. Keep it out of the camera module.
- `gridToScreen` and `screenToGrid` were not read, so the minimap jump's use of the zoom-1 point (2636) is confirmed only as written.

Reuse tag: adaptable-code (MIT; attribution required if any code is copied)
Brief rule served: the camera is client-only; fight camera row 11; camera_scope world camera (2D pan and zoom, transfer limited to bounds and anchored zoom)
