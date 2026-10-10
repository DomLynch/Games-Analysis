# lincity-ng-lincity-ng (camera, cell 14)

Donor: `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity-ng/GameView.cpp` | Licence: GPL-2.0-or-later (GameView.cpp header: "either version 2 of the License, or (at your option) any later version"; the repo COPYING.txt is the GPL-2.0 text) | C++ | symbol `GameView::constrainViewportPosition`

Checked: camera_scope world camera. The hint file was right: the camera is the `GameView` viewport in `GameView.cpp`, not a render helper. Read in full: `scroll` (507-549), `constrainViewportPosition` (552-598), `zoomMouse` (269-297), `setZoom` / `zoomIn` / `zoomOut` (249-312), the mouse and key event handling for pan and zoom (600-720, 735-860 read in part), and the UPDATE dispatch (856-857). Callers of `constrainViewportPosition` were checked by grep: three (`scroll` with false at 546, `zoomMouse` with true at 293, middle-drag pan with true at 606); line 1310 is a comment. The GUI tick that supplies `elapsedTime` was read only in part: `Game.cpp` 619-621 and 665, the lines that set the GUI interval and pass the elapsed time (the rest of the loop was not read). Confidence: high on the arithmetic and order of operations; medium on the debt-carry behaviour, which I read but did not run. The game is 2D isometric, so this is a fixed-camera donor: it is read in full and the note says plainly what transfers to a 3D third-person camera.

Best transferable idea: Keep the clamp's overshoot as a debt in base units and re-apply it before the next clamp, and zoom about the point under the cursor so that point does not move on screen.

Decision (proposed): adapt - take the clamp-to-zone-bounds with a remembered correction, and the zoom-about-a-fixed-point rule, for the world camera's zone limits and distance changes; reject the 2D edge pan and the sqrt(zoom) speed law, because a third-person camera follows the hero and is not panned by the player.

Acceptance: In a zone, when the hero walks to the zone edge the camera's aim point stops at the zone boundary (no void visible in a 375-wide still), and a client test that walks the hero to the edge and back asserts the aim point stays inside the zone rectangle on every frame.

## 1. Mechanism

- The loop: the GUI runs at most 30 times a second (`next_gui = tick + 1000/30`, Game.cpp 665). Each GUI tick sends `Event((tick - prev_gui) / 1000.0f)` (Game.cpp 621), so the elapsed time is in seconds. `GameView::event` passes an UPDATE event to `scroll(event.elapsedTime)` (GameView.cpp 856-857). So the pan is time-based with a frame-rate-independent step, but the rate of updates is the GUI interval, not the display refresh.
- Pan step (`scroll`, 507-549), in order:
  1. Take the key and mouse-edge state (`keyScrollState | mouseScrollState`). If none, return.
  2. `amt = elapsedTime x 1000 x 0.5 x sqrt(zoom)` (517). So 500 screen px per second at zoom 1 when elapsed time is 1 s; the speed rises with sqrt(zoom). Shift multiplies by 4 (520-521).
  3. Build a direction from the key and edge flags (520-535). If it is zero, return (537).
  4. Normalise the diagonal: `norm = hypot(dir.x x sqrt(tileW/tileH), dir.y)` (542), then `dir.x *= tileW/tileH` (544). The tile aspect is 128/64 = 2 (`defaultTileWidth` 128, `defaultTileHeight` 64; GameView.cpp 83-84), so horizontal and vertical feel the same speed.
  5. `viewport += dir x amt / norm` (545), then `constrainViewportPosition(false)` (546), then the viewport-updated hook (minimap corners) and a redraw.
- Clamp (`constrainViewportPosition`, 552-598):
  1. If `useScrollCorrection`, add the stored debt times the current zoom to the viewport first (556).
  2. Take the centre of the view in screen px, then convert to an isometric tile: `tx = cy/tileH + cx/tileW`, `ty = cy/tileH - cx/tileW` (558-560).
  3. Clamp each of `tx`, `ty` to [1, mapSize - 1] (564-571). Any clamp sets `outside`.
  4. If outside: rebuild the centre in screen px from the clamped tile, `((tx - ty) x tileW / 2, (tx + ty) x tileH / 2)` (583), and set `viewport = centre - half the view size` (585). If `useScrollCorrection`, store the debt `(vpOld - viewport) / zoom` (587), otherwise store zero. Return true.
  5. If not outside: the debt is set to zero (595). Return false.
- Wheel zoom (`zoomMouse`, 269-297), in order: `newzoom = zoom x factor`; clamp to [0.0312, 4] (273-280), recompute `factor` from the clamped value; snap to 1 when within 0.01 (281-285); set `zoom` and the tile size; then `viewport = (viewport + mousepos) x factor - mousepos` (292), which keeps the world point under the cursor fixed on screen; then `constrainViewportPosition(true)` (293), then the viewport hook and redraw.
- The wheel factor is sqrt(2) in and sqrt(0.5) out per notch (711, 713). The keyboard zoom uses the same sqrt(2) step (`zoomIn` 306, `zoomOut` 311), but `setZoom` keeps the centre tile instead of the cursor: it saves `getCenter()`, changes the zoom, then calls `show(centerTile)` (266). `setZoom` does not run the clamp.
- Middle-drag pan (MOUSEMOTION while `panning`, 604-607): `viewport -= mousemove`, then `constrainViewportPosition(true)`. The debt is kept while the mouse moves with the button down. When the mouse moves without a pan, the debt is cleared (613).

## 2. Key functions

- `GameView::scroll`: `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity-ng/GameView.cpp` 507-549. Time-based pan, zoom-scaled speed, aspect-corrected diagonals.
- `GameView::constrainViewportPosition`: `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity-ng/GameView.cpp` 552-598. The clamp to map bounds, the re-centre, and the debt store and re-apply.
- `GameView::zoomMouse`: `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity-ng/GameView.cpp` 269-297. Zoom about the cursor point, then clamp with debt.
- `GameView::setZoom` / `zoomIn` / `zoomOut`: `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity-ng/GameView.cpp` 249-312. Keyboard zoom about the centre tile, no clamp.
- `GameView::event` (MOUSEMOTION, MOUSEWHEEL, UPDATE): `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity-ng/GameView.cpp` 600-860; edge-scroll flags at 616-625, key flags at 731-764 and clears at 815-848.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Pan speed in px per second, scaled by sqrt(zoom) so it feels similar at each zoom | 0.5 x 1000 px per second per elapsed second at zoom 1 (517) |
| Shift multiplies pan speed | x4 (520-521) |
| Diagonal normalisation with an aspect factor | Tile aspect 128/64 (GameView.cpp 83-84) |
| Clamp the view centre to the map, with a one-tile margin | Index range [1, mapSize - 1] (564-571) |
| Keep a debt of the clamp overshoot in base units and re-apply it before the next clamp | Debt divided by zoom on store, multiplied by zoom on re-apply (556, 587) |
| Zoom about the cursor point | Factor applied to the viewport offset (292) |
| Zoom step | sqrt(2) in, sqrt(0.5) out (711, 713, 306, 311) |
| Zoom limits and snap | Min 0.0312, max 4, snap to 1 within 0.01 (253-254, 273-283) |
| Edge-scroll zone | 5 px border (GameView.hpp 258) |
| GUI interval | 1000/30 ms (Game.cpp 665) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for the clamp (re-apply debt, isometric centre tile, clamp to [1, len-1], re-centre and store the debt, or clear it), the wheel zoom (scale and clamp, recompute the applied factor, move about the cursor, then clamp with debt), and the timed scroll (speed x sqrt(zoom), shift x4, aspect-normalised diagonal, then clamp without debt). It omits the middle-drag pan, the keyboard zoom that keeps the centre tile, the edge-scroll flags and key state, the one-tile margin as a named constant, the minimap hook, the redraw, and the tile draw. Units follow the donor: the debt is stored in base units (divided by zoom). It is 2D isometric; the sketch does not map it to 3D.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface V2 { x: number; y: number; }

// The view state: where the viewport sits in screen px, the zoom, and the "debt": how far the last clamp moved the view, in base units.
export interface ViewState { vp: V2; zoom: number; debt: V2; }

// Tile size already multiplied by zoom; w and h are the screen size of the view.
export interface Viewport { w: number; h: number; tileW: number; tileH: number; }

const add = (a: V2, b: V2): V2 => ({ x: a.x + b.x, y: a.y + b.y });
const scale = (a: V2, s: number): V2 => ({ x: a.x * s, y: a.y * s });

const MIN_ZOOM = 0.0312;
const MAX_ZOOM = 4;
const SNAP_TO_ONE = 0.01;

// The tile under the centre of the view (isometric projection).
function centreTile(s: ViewState, vw: Viewport): V2 {
  const c = add(s.vp, { x: vw.w / 2, y: vw.h / 2 });
  return { x: c.y / vw.tileH + c.x / vw.tileW, y: c.y / vw.tileH - c.x / vw.tileW };
}

// Keep the centre tile on the map (indices 1 .. len-1). If it leaves, re-centre on the clamped tile.
// Returns true when the view was moved. With keepDebt, the move is remembered so the next call can re-apply it.
export function constrain(s: ViewState, vw: Viewport, mapLen: number, keepDebt: boolean): boolean {
  if (keepDebt) s.vp = add(s.vp, scale(s.debt, s.zoom)); // re-apply the last clamp's debt first

  const c = centreTile(s, vw);
  let tx = c.x;
  let ty = c.y;
  let outside = false;
  if (tx < 1) { tx = 1; outside = true; } else if (tx > mapLen - 1) { tx = mapLen - 1; outside = true; }
  if (ty < 1) { ty = 1; outside = true; } else if (ty > mapLen - 1) { ty = mapLen - 1; outside = true; }

  if (!outside) {
    s.debt = { x: 0, y: 0 };
    return false;
  }
  const before = s.vp;
  const centre: V2 = { x: (tx - ty) * vw.tileW / 2, y: (tx + ty) * vw.tileH / 2 };
  s.vp = add(centre, { x: -vw.w / 2, y: -vw.h / 2 });
  s.debt = keepDebt ? scale(add(before, { x: -s.vp.x, y: -s.vp.y }), 1 / s.zoom) : { x: 0, y: 0 };
  return true;
}

// Wheel zoom: scale by factor, then move the view so the point under the mouse stays put.
export function zoomAt(s: ViewState, factor: number, mouse: V2, vw: Viewport, mapLen: number): void {
  let z = s.zoom * factor;
  if (z < MIN_ZOOM) z = MIN_ZOOM;
  if (z > MAX_ZOOM) z = MAX_ZOOM;
  if (Math.abs(z - 1) < SNAP_TO_ONE) z = 1;
  const f = z / s.zoom; // the clamped factor actually applied
  s.zoom = z;
  s.vp = add(scale(add(s.vp, mouse), f), scale(mouse, -1));
  constrain(s, { ...vw, tileW: vw.tileW * f, tileH: vw.tileH * f }, mapLen, true);
}

// Timed scroll: speed grows with sqrt(zoom); diagonals are normalised; holding shift multiplies by 4.
// dir components are -1, 0 or 1. elapsedSec is seconds since the last GUI tick.
export function scrollBy(s: ViewState, dir: V2, elapsedSec: number, shift: boolean, vw: Viewport, mapLen: number): void {
  if (dir.x === 0 && dir.y === 0) return;
  let amt = elapsedSec * 1000 * 0.5 * Math.sqrt(s.zoom);
  if (shift) amt *= 4;
  const r = vw.tileW / vw.tileH;
  const norm = Math.hypot(dir.x * Math.sqrt(r), dir.y);
  s.vp = add(s.vp, { x: dir.x * r * amt / norm, y: dir.y * amt / norm });
  constrain(s, vw, mapLen, false); // a key or edge scroll clears the debt
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, on a copy with `export {}` at the end, passed with no errors.

## 5. Lands in

- TARGET `src/fight/camera.ts` (client only; the engine never reads it): the zone-bounds clamp with the remembered correction, and the zoom about a fixed point for distance changes. Parity-checklist row 11 (fight camera). Row 11 is the fight camera; the world camera has no row of its own in the addendum, so the owner should confirm.
- today: the Frankendom camera code is not read in this pass (not read).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: camera is client-only (the engine does not read it); row 11; world camera (owner's priority).

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism.
- It is a 2D isometric donor. The clamp, the speed law and the aspect normalisation are 2D projections and do not transfer as they are. What transfers is the shape: (a) clamp a focus point to the playable rectangle, (b) remember the overshoot and re-apply it before the next clamp, and (c) keep a fixed point on screen while a distance changes.
- The debt is re-applied on the next clamp, not glided back. When the constraint lifts, the view jumps to the un-clamped place on the next constrain call (reading only, not run). A third-person camera should decide whether it wants a snap or a glide; the donor gives neither a glide nor a time constant.
- The keyboard zoom keeps the centre tile but does not clamp (`setZoom` calls `show`, which does not clamp). A Frankendom world camera that zooms by key must run the same clamp, or the aim point can leave the zone.
- Zone bounds here are a map size in tiles, which is zone data. Frankendom zones are data (rulings), so the rectangle comes from the zone, not a constant.
- The pan rate is 500 px per second per elapsed second. The rate is a tuning value and must be zone or settings data, not an engine constant, if it is kept.
- Frankendom needs third-person framing that this donor does not have: no lock-on, no framing of several enemies, no shake, no pitch limits, no collision with walls. The clamp here only stops the view leaving the map.
- Pit camera: not applicable. This is a world camera note (camera_scope world).

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: camera is client-only; row 11; world camera (owner's priority)
