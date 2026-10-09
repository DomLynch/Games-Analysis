# OpenRA-OpenRA (camera, cell 14)

Donor: /mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Graphics/Viewport.cs | Licence: GPL-3 | C# | symbol Viewport (CenterLocation, AdjustZoom, scroll)

Symbol check (opened on the VPS, 2026-10-09): AdjustZoom(dz) 102, AdjustZoom(dz, center) 108, ToggleZoom 118, UnlockMinimumZoom 127, Tick 183, CalculateMinimumZoom 194, UpdateViewportZooms 224, Center(WPos) 350, Center(Vector2) 357, Scroll 364.

## 1. Mechanism
- The viewport stores a centre in world pixels (CenterLocation) and a zoom factor. View size in pixels is the native resolution divided by zoom, so zoom in makes the visible area smaller.
- Tick() runs once per game viewport tick. If the distance setting changed it calls UpdateViewportZooms (224-261), which recomputes MinZoom and MaxZoom, resets the current zoom to MinZoom, and notifies INotifyViewportZoomExtentsChanged traits. If a ViewportCenterProvider is set (for example, follow a selection), Center() moves the centre to that point, clamped to map bounds. Center(Vector2) first converts the point with worldRenderer.ScreenPosition (not read), then clamps with mapBounds.Clamp (Rectangle extension, not read). Center(WPos) (350-355) and Center(actors) (339-348, averages actor positions) are sibling overloads. Then the ViewportTick event fires for other listeners.
- AdjustZoom(dz) multiplies zoom by exp(dz), so equal positive and negative steps cancel. The result is clamped to [MinZoom, MaxZoom], or to the unlocked minimum when that is set.
- AdjustZoom(dz, screen point) first records the world point under the cursor, applies the zoom, then moves the centre by the difference so that point stays under the cursor, and clamps to map bounds.
- Scroll(delta, ignoreBorders) adds delta divided by zoom to the centre (so panning speed in screen pixels is constant), clamping to map bounds unless ignoreBorders is set.
- ToggleZoom: if zoom is below MinZoom (an unlocked zoom) set MinZoom; otherwise flip between MinZoom and MaxZoom (zoom above min goes to min, else to max).
- UpdateViewportZooms (224-261): MinZoom = defaultScale when native zoom is allowed or overridden, else CalculateMinimumZoom(range) x defaultScale; MaxZoom = min(MinZoom x MaxZoomScale, native height x defaultScale / MaxZoomWindowHeight); unlockedMinZoom = MinZoom x unlockedMinZoomScale when unlocked. The viewportSizes fields are from WorldViewportSizes (not read).
- Inputs: scroll deltas, wheel steps, cursor position, provider centre, map bounds, zoom limits. Output: CenterLocation, ViewportSize, and dirty flags for the cell region. Scroll and zoom run on input events; Tick runs on the game viewport tick.

## 2. Key functions
- Viewport.AdjustZoom(dz) (OpenRA) | /mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Graphics/Viewport.cs | 102-106 | exponential zoom step clamped to limits.
- Viewport.AdjustZoom(dz, center) (OpenRA) | /mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Graphics/Viewport.cs | 108-116 | zoom about the cursor: keep the world point under it fixed, clamp to map.
- Viewport.ToggleZoom (OpenRA) | /mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Graphics/Viewport.cs | 118-125 | two-state zoom toggle.
- Viewport.Tick (OpenRA) | /mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Graphics/Viewport.cs | 183-192 | per-tick: zoom refresh, follow provider, tick event.
- Viewport.Center(Vector2) (OpenRA) | /mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Graphics/Viewport.cs | 357-362 | hard set of the centre, clamped.
- Viewport.UpdateViewportZooms (OpenRA) | /mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Graphics/Viewport.cs | 224-261 | derives MinZoom, MaxZoom, unlocked min and resets zoom.
- Viewport.Scroll (OpenRA) | /mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Graphics/Viewport.cs | 364-373 | pan by delta over zoom, optional border clamp.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Exponential zoom step: zoom times exp(step), so steps are symmetric | the wheel-to-dz scale is set elsewhere (not read here) |
| Zoom clamped to a [min, max] band | Field initialisers MinZoom 1.0 and MaxZoom 2.0 (theirs, lines 92-93); both are overwritten by UpdateViewportZooms (237-239) from window height and mod viewport sizes (not read), so they are not the live limits |
| Unlocked minimum zoom (spectator and editor zoom out further, 241-248) | UnlockMinimumZoom scale input (theirs, caller-supplied) |
| Zoom about the cursor: keep the world point under the pointer | none (algorithm) |
| Pan speed in screen pixels: delta divided by zoom | none (algorithm) |
| Follow a point by hard-setting the centre each tick | none (algorithm; no smoothing in this file) |

## 4. TypeScript sketch
simplified: the sketch omits UIScale, the unlocked minimum zoom, ViewportSize (it uses view size directly, same as donor only when UIScale is 1 and view equals native size), the Center(WPos) conversion, the cell dirty flags, and UpdateViewportZooms (limits are constructor inputs). Clamp is a plain box clamp (donor mapBounds.Clamp, not read).
```ts
// Licence: GPL-3 (OpenRA-OpenRA). CLEAN-ROOM: written from the mechanism, no donor lines.
type Pt = { x: number; y: number };
type Box = { x0: number; y0: number; x1: number; y1: number };
class Cam {
  centre: Pt = { x: 0, y: 0 };
  zoom = 1;
  constructor(private minZoom: number, private maxZoom: number, private map: Box,
              private viewW: number, private viewH: number) {}
  private clamp(p: Pt): Pt {
    return { x: Math.min(Math.max(p.x, this.map.x0), this.map.x1), y: Math.min(Math.max(p.y, this.map.y0), this.map.y1) };
  }
  private worldAt(s: Pt): Pt {                       // world point under a screen point
    return { x: this.centre.x + (s.x - this.viewW / 2) / this.zoom, y: this.centre.y + (s.y - this.viewH / 2) / this.zoom };
  }
  adjustZoom(dz: number, at?: Pt): void {
    const before = at ? this.worldAt(at) : null;
    this.zoom = Math.min(Math.max(this.zoom * Math.exp(dz), this.minZoom), this.maxZoom);
    if (before && at) {
      const after = this.worldAt(at);
      this.centre = this.clamp({ x: this.centre.x + before.x - after.x, y: this.centre.y + before.y - after.y });
    }
  }
  scroll(delta: Pt, ignoreBorders = false): void {
    this.centre = { x: this.centre.x + delta.x / this.zoom, y: this.centre.y + delta.y / this.zoom };
    if (!ignoreBorders) this.centre = this.clamp(this.centre);
  }
  tick(follow?: Pt): void {                          // hard follow, no smoothing (as in the donor)
    if (follow) this.centre = this.clamp(follow);
  }
}
```

## 5. Lands in
- Frankendom target: src/fight/camera.ts (new module; today: src/camera* (moving), slice K4). The fight camera is client presentation; the follow point comes from engine state.
- Parity row: 11 (fight camera, camera kick, standoff).
- Reuse tag: rewrite-from-idea (GPL-3)
- Brief rule served: (category default, not per-cell) 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks
- 2D top-down orthographic camera. Frankendom's fight camera geometry is not checked here; the zoom about cursor and the screen-pixel pan only transfer if the fight camera is a screen-space framing.
- Follow is a hard set each tick, with no smoothing. Frankendom needs smoothing or a lead; this donor does not supply one.
- No collision or occlusion handling.
- Input mapping (wheel, pinch) is not in this file; the wheel scale is not read.
- Conflict check: none. The camera is a client and reads engine state.
