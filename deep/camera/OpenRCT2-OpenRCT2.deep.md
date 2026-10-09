# OpenRCT2-OpenRCT2 (camera, cell 14)

Donor: /mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/interface/Viewport.cpp | Licence: GPL-3.0-only (per Viewport.cpp header: version 3) | C++ | symbol ViewportUpdatePosition / ViewportUpdateFollowSprite

Symbol check (opened on the VPS, 2026-10-09): centre2dCoordinates 99, ViewportMove 447, ViewportSetUndergroundFlag 481, ViewportUpdatePosition 508, ViewportUpdateFollowSprite 611, ViewportUpdateSmartFollowEntity 637.

## 1. Mechanism
- ViewportUpdatePosition(window) runs for each window that has a viewport, each time the window is updated (a frame-driven call, not a fixed simulation tick).
- Smart-follow first (518-521): if the window has a smart-follow entity, ViewportUpdateSmartFollowEntity (637) runs first. It clears both the smart-follow and target ids when the entity is gone, otherwise dispatches by entity type (vehicle, guest, staff; the per-type bodies are not read).
- Sprite follow: if the window has a target sprite, ViewportUpdateFollowSprite handles it and the function returns. It converts the sprite's 3D location to 2D screen coordinates for the current rotation (centre2dCoordinates), subtracts half the viewport size, and moves the view there. Unless the scene is the title sequence, it sets or clears the underground flag (passes sprite z < tile surface height minus 16). It also hard-sets savedViewPos and calls ViewportMove (447) with the centred position. If the entity lookup returns null it does nothing that frame.
- Free view: first clear the underground flag (529), then take the viewport midpoint, convert it to map coordinates for the rotation, and clamp it to the map minimum and maximum. If it was clamped, re-centre the saved view on the clamped point, which keeps the view inside the map.
- Scroll to location: if the window is in scrollingToLocation mode, each update moves the view by one eighth of the remaining gap, rounded up, in each axis. The gap is measured from viewport->viewPos to savedViewPos (571-605). When both axes' steps reach zero, the flag is cleared. The stepped position is then passed to ViewportMove (608), which shifts the screen pixels or invalidates the screen (not a camera maths concern).
- Inputs: target sprite or saved view position, viewport rotation, map size, sprite z, tile heights. Output: the saved view position, the viewport move, and the underground flag (which triggers a window redraw when it changes). The underground flag is only touched for some windows: ViewportSetUndergroundFlag acts when the window is neither the main window nor a viewport window, or when it is the main window with a smart-follow sprite (483-484).
- Runs per window update. No simulation state changes, only view state.

## 2. Key functions
- ViewportUpdatePosition (OpenRCT2) | /mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/interface/Viewport.cpp | 508-609 | per-update driver: smart-follow, sprite follow, map-edge clamp, scroll-to-location step.
- ViewportUpdateFollowSprite (OpenRCT2) | /mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/interface/Viewport.cpp | 611-635 | centres on a sprite in 2D and sets the underground flag.
- centre2dCoordinates (OpenRCT2) | /mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/interface/Viewport.cpp | 99-113 | 3D to 2D isometric projection minus half the viewport.
- ViewportMove (OpenRCT2) | /mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/interface/Viewport.cpp | 447-478 | stores the new viewPos, shifts the on-screen pixels or invalidates the screen.
- ViewportSetUndergroundFlag (OpenRCT2) | /mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/interface/Viewport.cpp | 481-502 | toggles the flag and invalidates the window only on change.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Centre the view on a target by projecting it, then offset by half the view | isometric projection (theirs, rotation-aware) |
| Clamp the view centre to the map in map space, then re-project | map minimum constant kMapMinimumXY (= -kMaximumMapSizeTechnical = -1001, world/MapLimits.h:30 and :20) and map max minus 2 from GetMapSizeMinus2 (not read) (theirs, used at 538-551) |
| Underground test: target below its surface by a margin | margin of 16 (theirs) |
| Ease-in scroll to a point: one eighth of the gap per update, rounded up | divisor 8 (theirs); the rounding is the (x + 7) / 8 form |
| Redraw only when a flag changes | none (algorithm) |

## 4. TypeScript sketch
simplified: the sketch omits the smart-follow stage, the title-sequence and window-class gating on the underground flag, ViewportMove (it only stores positions), the z=0 map conversion detail, and clamps x and y in a plain 0..mapMax box rather than kMapMinimumXY..GetMapSizeMinus2. Order differs: donor clears the underground flag, then clamps, then steps the scroll; the sketch exposes these as three separate calls. The sketch steps from cur toward scrollTo (donor: viewport->viewPos toward savedViewPos).
```ts
// Licence: GPL-3.0-only (OpenRCT2-OpenRCT2). CLEAN-ROOM: written from the mechanism, no donor lines.
type Pt = { x: number; y: number };
type Sprite = { x: number; y: number; z: number };
type View = { saved: Pt; cur: Pt; target?: Sprite; scrollTo?: Pt; underground: boolean };

// Follow a sprite: project, centre, set the underground flag.
function followSprite(v: View, project: (s: Sprite) => Pt, surfaceAt: (x: number, y: number) => number, half: Pt): void {
  if (!v.target) return;
  const under = v.target.z < surfaceAt(v.target.x, v.target.y) - 16;   // margin of 16 (theirs)
  if (under !== v.underground) v.underground = under;                   // redraw only on change
  const p = project(v.target);
  v.saved = { x: p.x - half.x, y: p.y - half.y };
}

// Free view: clamp the view centre in map space, then re-centre on the clamped point.
function clampToMap(v: View, toMap: (s: Pt) => Pt, toScreen: (m: Pt) => Pt, mapMax: Pt, half: Pt): void {
  const mid = toMap({ x: v.saved.x + half.x, y: v.saved.y + half.y });
  const c = { x: Math.min(Math.max(mid.x, 0), mapMax.x), y: Math.min(Math.max(mid.y, 0), mapMax.y) };
  if (c.x !== mid.x || c.y !== mid.y) {
    const s = toScreen(c);
    v.saved = { x: s.x - half.x, y: s.y - half.y };
  }
}

// Scroll to a point: move one eighth of the remaining gap per update, rounded up.
function stepScroll(v: View): void {
  if (!v.scrollTo) return;
  const dx = v.scrollTo.x - v.cur.x, dy = v.scrollTo.y - v.cur.y;
  const sx = Math.sign(dx) * Math.ceil(Math.abs(dx) / 8);
  const sy = Math.sign(dy) * Math.ceil(Math.abs(dy) / 8);
  v.cur = { x: v.cur.x + sx, y: v.cur.y + sy };
  if (sx === 0 && sy === 0) v.scrollTo = undefined;                    // arrived
}
```

## 5. Lands in
- Frankendom target: src/fight/camera.ts (new module, follow-target and clamp logic; today: src/camera* (moving), slice K4). The isometric projection is not needed unless Frankendom's arena is isometric.
- Parity row: 11 (fight camera, camera kick, standoff).
- Reuse tag: rewrite-from-idea (GPL-3.0-only)
- Brief rule served: (category default, not per-cell) 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks
- The donor is a city-builder with an isometric grid and a multi-window UI. The projection and tile heights are specific to that grid.
- Underground flag is a rendering concern for tall structures; Frankendom may not need it.
- The scroll-to step is a fixed fraction, so it lags at long range and is abrupt at the end. Check against the fight camera's feel, not copied.
- Smart-follow per-type bodies (vehicle, guest, staff) are not read; they may hold useful logic not captured.
- Conflict check: none. Camera is a client that reads state.
