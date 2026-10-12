# lincity-ng-lincity-ng (rendering-performance, cell 17)

Donor: `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity-ng/GameView.cpp` (draw 1307-1379) | Licence: GPL-2.0-or-later (per the file headers: "version 2 ... or (at your option) any later version"; COPYING.txt is GPL v2) | C++ | symbol `GameView::draw`

Checked: Read in full: `GameView::draw` (GameView.cpp 1307-1379), `GameView::viewportUpdated` (889-919), `GameView::scroll` (507-549), `Desktop::needsRedraw`/`draw`/`setDirty` (Desktop.cpp 86-100, 180-213). Read in part: the Game loop (Game.cpp 495-516, 620-714), `Component::draw` (Component.cpp 80-88), `GameView::drawTile` (GameView.cpp 1094-1135; sprite-layer body after 1135 not read). Hint file TextureManagerGL.cpp was read (39-100) and is the wrong file for the cache: it is texture upload code, not the render cache. Camera: not a camera cell (2D isometric pan), so no camera_scope tag. Confidence: high on the map cache, its redraw triggers and the frame loop; medium on whether the tile walk covers the whole view (not tested).

## 1. Mechanism

- The city map is not drawn straight to the screen each frame. `GameView::draw` draws the visible tiles into an off-screen target (`mapTexture`), then stretches that target to the view (GameView.cpp 1346-1379). The target is only refilled when `refreshMap` is set (1346); the frame otherwise just blits the cached target (1379).
- What sets `refreshMap`: `viewportUpdated` sets it on every call (918), and pan, zoom, resize and show all call it (scroll 548, zoomMouse 295, show 326, resize 881). The animation tick also marks the map dirty every time it fires (Game.cpp 690). Resize recreates the target (`refreshMapSize`, 882; created at 1349).
- Visible window: the three viewport corners are turned into tiles (1327 onward). The upper-left and upper-right corners are padded in x and the lower-left in y by `extratiles = 7` (1340-1344). The comment says the pad covers "the maximal size of a building", so tall buildings whose anchor is off-screen still draw.
- Tile order: two loops over `k` (rows, 2 per tile step) and `i` (columns) compute tile coordinates and call `drawTile` (1346-1366). Overlays get a second pass (1368-1375). `drawTile` draws a blank for tiles outside the city (1098-1100).
- Frame loop: the event wait sleeps until the earliest scheduled task (`next_task` = min of execute, animate, GUI and FPS times, Game.cpp 504; `SDL_WaitEventTimeout` 510). GUI events run every 1000/30 ms (665). Animation runs every `ANIMATE_DELAY` = 100 ms (lin-city.hpp 80; Game.cpp 684-690). The desktop is redrawn only when `needsRedraw()` is true (708).
- Pan speed is scaled by elapsed time: `amt = elapsedTime * 1000 * 0.5 * sqrt(zoom)` (517), so the pan rate does not depend on frame rate. Diagonal pan is normalised so it follows the iso axes (`norm`, 542-544).

## 2. Key functions

- `GameView::draw`: `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity-ng/GameView.cpp` 1307-1379. Window from the corners (1327-1344), dirty-gated render to target (1346-1377), cached blit (1379).
- `GameView::viewportUpdated`: `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity-ng/GameView.cpp` 889-919. Sets `refreshMap` (918).
- `GameView::scroll`: `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity-ng/GameView.cpp` 507-549. Elapsed-time pan (517), move (545), then `viewportUpdated` (548) and `setDirty` (549).
- Game loop: `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity-ng/Game.cpp` 495-714. Event wait with timeout (504-510), GUI (620-665), animate (684-690), redraw (708-711).
- `Desktop::setDirty`: `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/gui/Desktop.cpp` 197-212. Joins into the first overlapping rectangle and returns (202-205); otherwise appends (212).
- `Desktop::draw`: `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/gui/Desktop.cpp` 91-100. Draws the whole component tree if anything is dirty, then clears the list (99).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Redraw a cached layer only when its inputs changed; blit it otherwise | Trigger set: pan/zoom/resize (918) and the animate tick (690) |
| Visible window from the viewport corners, padded by the tallest sprite | Pad 7 tiles, "maximal size of a building" (theirs, GameView.cpp 1340) |
| Wait until the earliest scheduled task, not a busy loop | Scheduled set: execute, animate 100 ms (theirs, lin-city.hpp 80), GUI 1000/30 ms (theirs, Game.cpp 665) |
| Pan speed proportional to elapsed time | Factor 0.5, times 1000 for ms, times sqrt(zoom) (theirs, GameView.cpp 517) |
| Tile size as the unit of the view | Default tile 128 x 64 px (theirs, GameView.cpp 83-84) |

## 4. TypeScript sketch

simplified: the sketch keeps the dirty gate (render to a target only when dirty, blit every frame) and the window padded on all four sides. It replaces the donor's rotated k/i tile walk with a plain rectangle loop (the donor's exact coverage was not re-derived), leaves out the overlay pass, the blank-tile path, the zoom and resize handling (here `markDirty` covers them), and the frame scheduler. The pad is a parameter, not the donor's fixed 7.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Tile { x: number; y: number; }
interface Painter {
  createTarget(w: number, h: number): number;   // returns a target id
  pushTarget(id: number): void;
  popTarget(): void;
  drawTile(t: Tile): void;
  blit(id: number): void;
}
interface Window { x0: number; x1: number; y0: number; y1: number; }

// Tile window the view needs. ul/ur/ll are the tiles under three viewport corners.
// pad = the tallest prop in tiles, so a tall prop anchored just off-screen still draws.
function visibleWindow(ul: Tile, ur: Tile, ll: Tile, pad: number): Window {
  return { x0: ul.x - pad, x1: ur.x + pad, y0: ur.y - pad, y1: ll.y + pad };
}

class CachedLayer {
  private dirty = true;          // starts dirty so the first frame renders
  private target = -1;
  constructor(private painter: Painter, private w: number, private h: number) {}

  // Call on anything that changes the picture: pan, zoom, resize, a sim update, an animation tick.
  markDirty(): void { this.dirty = true; }

  draw(win: Window): void {
    if (this.dirty) {
      if (this.target < 0) this.target = this.painter.createTarget(this.w, this.h);
      this.painter.pushTarget(this.target);
      for (let y = win.y0; y <= win.y1; y++)
        for (let x = win.x0; x <= win.x1; x++) this.painter.drawTile({ x, y });
      this.painter.popTarget();
      this.dirty = false;
    }
    this.painter.blit(this.target);   // every frame: one blit of the cached target
  }
}

export {};
```

## 5. Lands in

- TARGET `origins/client/zone-map-cache.ts` (proposed new client module; the path was NOT checked against the Frankendom repo). Client-only: the engine never reads it. Used for static layers (minimap, backdrop, HUD background).
- Parity-checklist row 16 (colour grade / quality). Note: the batch hint said row 12, but row 12 in the addendum is "combat sound cues", which does not fit rendering. Row 16 is the nearest fit; Lead to confirm.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one engine, clients present it); rule 3 in the addendum (client-only presentation). Not a camera cell.

## 6. Gaps and risks

- The cache only saves work between animation ticks. The animate tick marks the map dirty every 100 ms (Game.cpp 684-690; ANIMATE_DELAY 100), so while the city animates the map is re-rendered about 10 times a second. The saving is on frames with no tick and no pan.
- Frankendom's world camera moves every frame when following a character. A cache keyed to the viewport would miss every frame, so this only transfers to static layers (minimap, backdrop, HUD background). Do not apply it to the third-person world view.
- Defect (keep the idea, fix the defect): `Desktop::setDirty` joins the new rectangle into the first overlapping rectangle and returns (Desktop.cpp 202-205). Two rectangles that overlap only after a join stay separate. fix: loop the merge until no pair overlaps.
- Missing step (not a bug): `Desktop::draw` redraws the whole component tree whenever any rectangle is dirty (Desktop.cpp 93-95; Component.cpp 83-86 draws every enabled child). Dirty rectangles decide whether to draw, not where. fix: clip the draw to the dirty union (scissor) or test each child's rectangle against it.
- Defect: the pad is a hard-coded 7 (GameView.cpp 1340). Every map uses the same pad whatever its tallest building. fix: per-zone pad from the largest sprite height, stored as zone data.
- Defect: every sprite is one `glBegin`/`glEnd` pair (PainterGL.cpp 57-66), so one draw call per sprite with no batching. fix: pack sprites into an atlas and draw each layer from one vertex buffer. `GL_QUADS` does not exist in WebGL, so the call pattern does not transfer; the batching idea does.
- Defect: every texture is padded to a power of two (TextureManagerGL.cpp 39-50), which wastes memory on odd sizes. fix: an atlas packer with no padding.
- Licence GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism.
- Not read: the body of `drawTile` past 1135 (the sprite-layer order); `Rect2D::join` and `overlap` (the merge rule is read from the call sites only).

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: 1 (one engine, clients present it); rule 3 (client-only presentation).

Best transferable idea: Render the static part of the view into a cached target, redraw it only when its inputs change, and pad the visible window by the tallest prop so tall props anchored off-screen still draw.
Decision (proposed): adapt — keep the dirty gate and the padded window for static layers (minimap, backdrop, HUD); the per-sprite GL call pattern and the viewport-keyed cache do not fit a moving third-person camera, so they are not carried over.
Acceptance: On a 375-wide phone standing still with no input and no animation tick, the client counter shows zero backdrop re-renders over 5 s, and the frame is pixel-identical to an uncached render.
