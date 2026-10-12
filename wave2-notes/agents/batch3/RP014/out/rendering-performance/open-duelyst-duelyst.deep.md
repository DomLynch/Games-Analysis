# open-duelyst-duelyst (rendering-performance, cell 17)

Donor: `/mnt/frankendom-donors/open-duelyst-duelyst/app/view/layers/game/TileLayer.js` (`TileLayer` ctor, `updateBoardQuality` 94-160, `TileLayer.WebGLRenderCmd` visit/rendering 488-570) | Licence: CC0-1.0 (repo `LICENSE` is CC0 1.0 Universal; `package.json` line 3 `"license": "CC0-1.0"`; TileLayer.js has no per-file header). Note: CC0 is not on the MIT/Apache/BSD list, so licence_class is set to permissive by judgement; Lead to confirm. | JavaScript, Cocos2d-JS v3.3 (WebGL render commands) | symbol `TileLayer.updateBoardQuality` and `TileLayer.WebGLRenderCmd.rendering`

Checked: Read in full: `app/view/layers/game/TileLayer.js` 1-166 (ctor, layout, quality switch), 166-270 (tile add, fade, corner codes), 271-420 (merged tile update, sprite placement), 420-487 (remove and fade), 488-577 (render command visit, rendering, create). Read in part: `app/common/config.js` 1214-1224 (quality constants) and 1330-1350 (CONFIG.reset default; 1312-1329 not read for a device branch); `app/ui/views/item/settings_menu.js` 170-200 and 310-320, 405-420 (UI); `app/view/fx/RenderPass.js` (only the begin/end/render methods, 236-260, 373-410); `app/vendor/cocos2d-html5/cocos2d/core/renderer/RendererWebGL.js` 115-135 (pushRenderCommand gate). Hint file TileLayer.js is right. Camera: not a camera cell, so no camera_scope tag. Confidence: high on the HIGH/LOW split, the offscreen batch and composite, and the per-frame cost; medium on the default and the settings path (the profile sync that copies the settings model into CONFIG was not found by grep and not traced).

## 1. Mechanism

- The board is built from two node groups. Non-batched tiles sit on a node tilted by `CONFIG.XYZ_ROTATION` to fake depth (TileLayer.js 58-60). Plain board tiles go into one `cc.SpriteBatchNode` built from the board sheet (63, 192). Each merged (corner) tile is four sprites, one per corner, rotated 0/90/180/270 (display code 303-313 and 413-416).
- Corner shapes: each corner gets a code from the presence of its two edge neighbours and the diagonal between them. `values.tl = (nl ? '1' : '') + (ntl ? '2' : '') + (nt ? '3' : '')` (246). The diagonal (`ntl`) counts only when both edges are present (`ntl = nt && nl && map[itl]`). The sprite is `RSX[prefix + '0' + code]` (365). Alt-map seams add a `_seam` code (254-263). (Corner codes read; sprite art not read.)
- Quality switch: `updateBoardQuality` is the only place that switches (94). **HIGH** (`CONFIG.boardQuality === BOARD_QUALITY_HIGH`, 95): the batch node is removed from the scene tree and its transform reset (96-116); a window-sized `RenderPass` is created (124-129); the render command is set to draw (133). **LOW** (158 onward): the batch node is added back into the scene and tilted itself (136-149); the render command is set not to draw (159).
- HIGH render order, each frame (`rendering`, 534-570): begin the pass with a clear (536); draw the whole batch with one `drawQuads` (549); end the pass (552); then draw the pass texture as one quad through the non-batch node's transform (565-567). So the tilt is applied once to the composite, not to each tile.
- Each frame, `visit` (494-520) runs the batch's transform and sorts the batch's children (519) without drawing the children itself. The renderer queues the layer's render command only if `_needDraw` is true (RendererWebGL.js 123).
- Fades: a sprite is added at opacity 0 and faded to its target (`showTile` 195-205). Removal fades through `destroy(fadeDuration)` (455), default `CONFIG.FADE_FAST_DURATION` (464, 480; an alias of `ANIMATE_FAST_DURATION`, config.js 553, value not read).

## 2. Key functions

- `TileLayer.updateBoardQuality`: `/mnt/frankendom-donors/open-duelyst-duelyst/app/view/layers/game/TileLayer.js` 94-160. Quality switch: HIGH branch 95-134, LOW branch 135-160.
- `TileLayer.WebGLRenderCmd.visit`: same file 494-520. Transform and sort the batch without visiting its children.
- `TileLayer.WebGLRenderCmd.rendering`: same file 526-570. Offscreen batch (534-552) and composite (556-568).
- `TileLayer._getMergedTileCornerValues`: same file 213-270. Corner codes and seams.
- `TileLayer.updateMergedTileTextures` and `displayMergedTile`: same file 271-300 and 363 onward. Destroy and recreate the four corner sprites per tile (281 onward), name from prefix and code (365), rotation and colour (370-380).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One batch draw for all static tiles | `SpriteBatchNode` over one sheet (theirs, TileLayer.js 63) |
| Offscreen pass, then one composite quad with the tilt | Pass is window-sized RGBA8888 (theirs, 127); composite is one 4-vertex strip (RenderPass.js 380-394, read in part) |
| Two-level quality flag per device | LOW = 0.0, HIGH = 1.0 (theirs, config.js 1221-1222); default HIGH in CONFIG.reset (theirs, config.js 1343) |
| Corner code from two edges and their diagonal | 3 bits per corner (edge, diagonal, edge), 4 corners per tile (theirs, TileLayer.js 246-249) |
| Corner sprite rotations | 0, 90, 180, 270 degrees (theirs, TileLayer.js 306-309) |

## 4. TypeScript sketch

simplified: the sketch keeps the one-batch draw, the HIGH (offscreen then one composite) and LOW (batch tilted directly) split, and the skip when the batch is empty. It omits the sprite fades, the per-visit child sort (519), the corner codes and the four corner sprites per tile (246-249, 303-313), the alt-map seams, the pass rebuild on resize, and the cocos2d scene-graph order. Like the donor, it does not cache: HIGH re-draws the whole batch every frame.

```ts
// Licence: CC0-1.0 (donor repo, package.json and LICENSE). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Quality = 0 | 1;   // 0 = LOW: the batch is tilted directly; 1 = HIGH: the batch is drawn offscreen, then composited once with the tilt
interface Tile { id: number; x: number; y: number; }
interface Gfx {
  clearPass(): void;
  drawBatch(tiles: Tile[]): void;          // one draw call for every board tile
  compositeWithTilt(): void;               // one textured quad from the offscreen pass, tilt applied once
  drawBatchTilted(tiles: Tile[]): void;    // LOW path: the batch carries the tilt itself
}

// Static board tiles are kept in one batch list, not drawn as separate nodes.
class BoardBatch {
  private tiles: Tile[] = [];
  constructor(private gfx: Gfx, private quality: Quality) {}

  add(t: Tile): void {
    this.tiles.push(t);
  }

  setQuality(q: Quality): void {
    this.quality = q;
  }

  // Called once per frame. Nothing is cached: HIGH re-draws the whole batch every frame.
  frame(): void {
    if (this.tiles.length === 0) return;   // donor: skip when the batch has no quads
    if (this.quality === 1) {
      this.gfx.clearPass();
      this.gfx.drawBatch(this.tiles);
      this.gfx.compositeWithTilt();
    } else {
      this.gfx.drawBatchTilted(this.tiles);
    }
  }
}

export {};
```

## 5. Lands in

- TARGET `origins/client/zone-floor-batch.ts` (proposed new client module; the path was NOT checked against the Frankendom repo). Static floor pieces of a zone, drawn as one batch. Client-only.
- Parity-checklist row 16 (colour grade / quality). The batch hint said row 12, but row 12 in the addendum is "combat sound cues", which does not fit rendering. Row 16 is the nearest fit; Lead to confirm.
- Reuse tag: rewrite-from-idea (CC0-1.0: no attribution required; the sketch is clean-room in any case)
- Brief rule served: 1 (one engine, clients present it); rule 3 (client-only presentation).

## 6. Gaps and risks

- The HIGH path costs more and is the default. `CONFIG.reset` sets HIGH for everyone (config.js 1343), and no device branch was seen in the lines read (1330-1350). Each HIGH frame does an extra full-window fill (`clearPass`, RenderPass 236-260 read in part), one batch draw, and a full-window composite. Fix: keep the offscreen pass but redraw it only when the board changes (a dirty flag); composite every frame. Then the cost is the composite alone on idle frames.
- Defect: `visit` sorts the batch's children every frame (519). Fix: sort only when a child is added or removed, behind a dirty flag.
- Defect: the pass is sized to the whole window (127), not to the board's on-screen rectangle. Fix: size it to the zone's visible floor.
- Defect (copy-paste): the settings menu writes board quality with the shadow constants (settings_menu.js 313 and 317: `CONFIG.SHADOW_QUALITY_LOW` / `_HIGH`). Both sets are 0.0 and 1.0 today (config.js 1216-1218 and 1221-1222), so nothing is wrong yet. Fix: use the `BOARD_QUALITY_*` constants.
- Risk: a quality change may not apply until the next resize. Grep of `app/` (excluding vendor) finds `updateBoardQuality` called only from `onResize` (TileLayer.js 91). The settings listener calls only the UI update (settings_menu.js 198). The profile path that copies the setting into `CONFIG.boardQuality` was not traced. Check in the live build before relying on it.
- Defect: merged corner sprites are destroyed and re-created for each changed tile (281 onward; creation at 365). Four sprites per tile per update is allocation churn. Fix: pool the four sprites per tile and change their frame and rotation in place.
- The idea that does not transfer: the composite-with-tilt rotates a flat board into a 2D-depth look. Frankendom's world is 3D with a third-person camera, so the tilt composite does not apply. The batch, the quality flag and the corner codes do.
- Licence: CC0 (no attribution needed). The sketch is clean-room.
- Not read: `RenderPass.rebuild` and the `antiAlias` argument (RenderPass.js 21-40), the sprite art for corner shapes, the vendor batch internals, and the profile sync that sets `CONFIG.boardQuality`.

Reuse tag: rewrite-from-idea (CC0-1.0; clean-room)
Brief rule served: 1 (one engine, clients present it); rule 3 (client-only presentation).

Best transferable idea: Keep all static floor tiles in one batch that is drawn once per frame, offer a per-device quality flag that picks between a direct draw and an offscreen pass, and redraw the offscreen pass only when the floor changes.
Decision (proposed): adapt — keep the one-batch floor draw, the per-device quality flag and the corner-code edge choice for zone floor edges; the tilt composite does not fit a 3D third-person camera, and the per-frame re-raster must become dirty-flagged before it ships.
Acceptance: On a 375-wide phone, the frame-stats log shows at most two draw calls for the static floor per frame, zero floor re-raster on frames with no change, and no visible seams between floor tiles at the default quality.
