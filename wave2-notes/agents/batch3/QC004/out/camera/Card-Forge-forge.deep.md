# Card-Forge-forge (camera, cell 14)

Donor: `/mnt/frankendom-donors/Card-Forge-forge/forge-gui-mobile/src/forge/adventure/stage/GameStage.java` | Licence: GPL-3.0 (as read: LICENSE file, "GNU GENERAL PUBLIC LICENSE, Version 3, 29 June 2007") | Java (libGDX) | symbol `GameStage.act` | camera_scope: world camera

Checked: camera_scope = world camera (a 2D top-down map the player walks across; the tile map is the open world). The list's hint file `TileMapScene.java` was read (lines 96-105), but the follow logic is in `GameStage.act` (369-441, read in full) and zoom is in `GameStage.scrolled` (548-557, read in full). Grep for lerp, smooth or interpolat in GameStage.java, TileMapScene.java, MapStage.java, WorldStage.java and scene/*.java returned nothing. The caller of `act` (the libGDX stage loop) was not read, and no caller of `startPause` was read. Not read: `touchDragged` (560), `onActing`, `Forge.isLandscapeMode`, ScalingViewport internals, the config screen-size values. Confidence: medium (the camera path is read end to end; it is 2D, so only a fragment transfers).

## 1. Mechanism

- A 2D orthographic camera on `GameStage`. Each frame `act(delta)` (final, 369) runs in this order:
  (a) Pause gate (372-375): if `animationTimeout >= 0`, subtract delta and return. The field starts at 0, so the first frame also returns. While a scripted pause runs, `isPaused()` (animationTimeout > 0, 318) is true and the whole frame returns before the camera, the input, the timers and the player movement are updated. `startPause` sets the pause length in seconds (313) and clears the player's movement direction (314).
  (b) Otherwise: effect timers tick and expire (in the block after line 376, lines not numbered), `onEndAction` runs once, input is read (keyboard, controller, touch knob, touch; priority touch > controller > keyboard, with a 0.2 threshold for touch and controller), and the player's movement direction is set.
  (c) Camera follow (439-440): `camera.position.x` = player x clamped to [half the intended width, world width minus half the intended width]; y the same with height. It is a hard snap every frame: the value is set directly, with no lerp, no lag and no smoothing.
  (d) `onActing(delta)` (abstract hook, not read).
- Zoom: `scrolled` is ignored while paused (549-550). Otherwise `camera.zoom += amountY * 0.03` (551) and the value is clamped to [0.3, 1.5] (552-555).
- World size: the map loader sets the viewport world size to map width x tile width and map height x tile height (MapStage 241-245, which calls `setBounds`), and `GameStage.setBounds` passes it to `getViewport().setWorldSize` (345-346). Only one map-load caller was read.
- Render (`TileMapScene.render`, lines 96-105): the tile view is set from the camera position minus half the intended size (96-101). Only in portrait mode (102-103) is `camera.position.x` then replaced by the player sprite's `getX()`, with no clamp. `updateCamera()` (105) runs after that. So in portrait the drawn x is the unclamped player x; in landscape the clamped value from `act` stands.
- Input never moves the camera. Scroll only zooms. I did not read `touchDragged`, so a drag-pan is not ruled out for that handler (not read). There is no lag, shoulder offset, collision pull-in, lock-on, shake, FOV change or recentring in the code I read.

## 2. Key functions

- `GameStage.act`: `/mnt/frankendom-donors/Card-Forge-forge/forge-gui-mobile/src/forge/adventure/stage/GameStage.java` 369-441. Pause gate 372-375; camera clamp 439-440.
- `GameStage.scrolled`: same file, 548-557. Pause check 549; zoom step 551; clamp 552-555.
- `GameStage.startPause` / `isPaused`: same file, 313 (sets the pause length) and 318 (the paused test).
- `TileMapScene.render`: `/mnt/frankendom-donors/Card-Forge-forge/forge-gui-mobile/src/forge/adventure/scene/TileMapScene.java` 96-105 (view from camera, portrait override at 102-103, `updateCamera` at 105). The start of the method was not checked.
- World size: `/mnt/frankendom-donors/Card-Forge-forge/forge-gui-mobile/src/forge/adventure/stage/MapStage.java` 241-245, and `GameStage.setBounds` at 345-346.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Follow point clamped per axis to [half view, world - half view], snapped each frame | View = intended screen size (`Scene.getIntendedWidth` / `Height`, Scene.java 78 for landscape width); world = map width x tile width (MapStage 245). Both are data-driven, not hard-coded. |
| Wheel zoom: step per wheel unit, clamped to a range | Step 0.03 per wheel unit (theirs, GameStage.java 551); min 0.3 (theirs, 79); max 1.5 (theirs, 78) |
| Hold the camera while a scripted pause runs | Pause length in seconds, passed to `startPause` (313). The per-event values were not read. |
| Default zoom | Start value not read (not set in the lines read). |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order for the follow step (pause gate first, then the per-axis clamp) and for zoom (pause check, step, clamp). It omits the whole-frame early return (the donor also skips player movement, timers and input during a pause), the portrait-mode x override in `TileMapScene.render`, the tile view and chunk culling, all input handling, the stage viewport and the `onActing` hook. It uses the intended view size, not a zoom-aware size, exactly as the donor does.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Point { x: number; y: number; }
interface WorldCamera { x: number; y: number; zoom: number; }
interface ZoneBounds { widthPx: number; heightPx: number; }  // zone size from zone data
interface View { widthPx: number; heightPx: number; }        // intended view size in px at zoom 1

const ZOOM_MIN = 0.3;
const ZOOM_MAX = 1.5;
const ZOOM_PER_WHEEL_UNIT = 0.03;

// Pause gate first: while a scripted pause runs, the camera holds still.
// Otherwise snap the camera to the player and keep the view centre inside the zone.
function followCamera(cam: WorldCamera, player: Point, zone: ZoneBounds, view: View, paused: boolean): void {
  if (paused) return;
  const halfW = view.widthPx / 2;
  const halfH = view.heightPx / 2;
  cam.x = Math.min(Math.max(halfW, player.x), zone.widthPx - halfW);
  cam.y = Math.min(Math.max(halfH, player.y), zone.heightPx - halfH);
}

// Wheel zoom: ignored while paused, otherwise step and clamp into the range.
function wheelZoom(cam: WorldCamera, wheelY: number, paused: boolean): void {
  if (paused) return;
  cam.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, cam.zoom + wheelY * ZOOM_PER_WHEEL_UNIT));
}
```

## 5. Lands in

- TARGET `origins/client/world-camera.ts` (proposed new client file; I did not check the Frankendom repo for an existing camera module). Camera is client-only (ruling), so nothing here touches the server.
- Parity row 11 (fight camera). Row 11 is the fight camera; there is no checklist row for the world camera (see section 6).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: camera is client-only; zones as data (zone bounds and zoom limits passed in as data, not constants in the function).

Best transferable idea: Clamp the world camera's look-at point to the zone bounds every frame, hold it still during scripted pauses, and clamp wheel zoom to a fixed range.

Decision (proposed): adapt - take the zone-bounds clamp and the pause hold for the world camera, and leave out the snap follow, which a third-person camera needs to replace with frame-rate-independent smoothing and collision.

Acceptance: In an open zone the world camera's look-at point stops at the zone edge. A client test with a 2000 px wide zone and the player at x = 2000 asserts that the camera x equals 2000 minus half the view width, and that the camera does not move during a scripted pause.

## 6. Gaps and risks

- Scope: this is a 2D top-down camera with a hard snap to the player each frame (439-440) and no smoothing. A third-person follow camera needs lag, collision and an over-the-shoulder offset, and none is here. Only the clamp and the pause hold transfer.
- Zoom and clamp: the clamp uses the intended (un-zoomed) size (439-440), while zoom is a separate value (551-555). Whether a zoomed-out view can show past the map edge depends on the viewport's camera size, which I did not read (ScalingViewport internals not read). The Frankendom version should use a zoom-aware half extent.
- Two writers: the portrait override (103) sets camera x after the clamp in `act`, so the donor has two places that set the camera position. Frankendom should keep one camera rig with one writer.
- Pause freezes the whole frame (372-374), not only the camera: player, timers and input all stop. Under the one-engine ruling the camera hold should be a flag on the shared rig, not an early return of the whole update.
- Not in the code read: collision pull-in, lock-on framing, shake, FOV change, recentring after input. I did not grep for them across the whole donor, only the files listed in Checked.
- Parity: row 11 is the fight camera. The world camera has no checklist row, so Lead should add one before this lands.
- Licence GPL-3.0: clean-room, shape only. The sketch is written from the described mechanism.
