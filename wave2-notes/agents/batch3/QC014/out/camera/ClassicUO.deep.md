# ClassicUO (camera, cell 14)

Donor: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Renderer/Camera.cs` | Licence: BSD-2-Clause (as read: `LICENSE.md`, "BSD 2-Clause License", Copyright (c) 2025 andreakarasho; SPDX header on Camera.cs line 1) | C# | symbol `Camera.CalculatePeek`

Checked: camera_scope: world camera. Read in full: Camera.cs (1-226), Time.cs, Scene.cs (1-60), GameController.cs (375-415, and line 61), Easings.cs (1-40). Callers read: GameSceneInputHandler.cs (40-60, 900-1030, 1260-1290, 1365-1412), GameSceneDrawingSorting.cs (1186-1290), GameScene.cs (101, 576-592, 716-724, 795-800, 925-960, 1000-1012), Mobile.cs (735-850; lines 700-734 by grep only), OptionsGump.cs (4047), Profile.cs (130-133). Not read: the walker/pathfinder that queues walk steps, the rest of Easings.cs, the rest of the Mobile class. Searches for shake, lock-on, LockTarget and fov in ClassicUO.Client and ClassicUO.Renderer returned no hits. Confidence: high on the lean and zoom arithmetic (read and checked against the matrix order); medium on "the camera has no follow smoothing of its own" (read GetViewPort and the walk interpolation, not the walker). depth: thin. This is a 2D isometric camera with a look-to-cursor lean and zoom; only the lean fragment transfers to a third-person camera. The donor has no Pit or arena camera.

## 1. Mechanism

- Frame order. `GameController.Update` sets `Time.Delta` from the framework's elapsed time in seconds (GameController.cs:389). The loop is variable step, because `IsFixedTimeStep = false` (GameController.cs:61). It then calls `Scene.Update` (GameController.cs:404). `Scene.Update` calls `Camera.Update(true, Time.Delta, Mouse.Position)` (Scene.cs:32). `Camera.Update` stores the delta and the mouse position, then calls `UpdateMatrices` (Camera.cs:75-86). Because `force` is always true here, the matrices are rebuilt every frame.
- Matrix build (`UpdateMatrices`, Camera.cs:153-180). Translate the view origin (centre of Bounds) to zero. Scale by the lean zoom `1 / Zoom` (168, 184). Run `CalculatePeek` (171). Translate by origin minus the lean (173). Invert for picking (177). The matrix order means the lean is applied after the scale, so it is in screen pixels, and `250 / Zoom` on screen is 250 world pixels at every zoom (derived from 168-173 and 209; not run).
- Lean (`CalculatePeek`, Camera.cs:189-224). The lean runs only while `PeekingToMouse` is set. The look macro sets it on press and clears it on release (GameSceneInputHandler.cs:928 and 1270 on press; 960 and 1398-1402 on release). The target is the mouse minus the view origin (195). With `PeekBackwards`, the target is mirrored through the origin (199-200). The target is normalised and scaled by `OutQuad(min(|d| / (Height / 2), 1)) x 250 / Zoom` (208-209). If not peeking, the target is zero, so the view recentres. Then `dist = |target - current|` (213). If `dist > 1` px, the speed is `max(OutQuart(dist / 250) x dt x 5, 0.01)` and `current = Lerp(current, target, speed)` (217-218). Otherwise current snaps to target (222).
- Zoom. `Zoom` is clamped to [0.5, 2.5] with step 0.1 (Scene.cs:15; Camera.cs:53). `ZoomIn` subtracts the step and `ZoomOut` adds it (60, 62). Scale is `1 / Zoom`, so Zoom 0.5 is 2x and Zoom 2.5 is 0.4x. Ctrl plus wheel zooms only when `EnableMousewheelScaleZoom` is on (GameSceneInputHandler.cs:1011-1019; Profile.cs:131 has no initialiser, so it is false). On Ctrl release the zoom goes back to `DefaultScale` only if `RestoreScaleAfterUnpressCtrl` is on (GameSceneInputHandler.cs:1373-1378; Profile.cs:133 has no initialiser, so it is false). `DefaultScale` is 1.0 (Profile.cs:130).
- Follow. The view centre is the player. `GetViewPort` takes the screen centre, adds the player's Z lift (`Z << 2`), and subtracts the player's walk `Offset` (GameSceneDrawingSorting.cs:1198-1201). It takes the tile offset from the player's X and Y (1203-1207). The lean is then added to the tile offset as `zoom x Offset / 44` (1238-1241). The camera has no lag of its own. The smoothing comes from the player's walk interpolation: `Mobile.cs` computes the delay as ticks since `LastStepTime` (718), sets `Offset` from that delay (776-782), and when the step ends it moves X and Y to the step and clears `Offset` (836-844).

## 2. Key functions

- `Camera.CalculatePeek`: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Renderer/Camera.cs` 189-224. Target from mouse, optional mirror, ease, approach, snap. Its only caller is `UpdateMatrices` (171), which the file calls from `Update` (85), `ScreenToWorld` (90), `WorldToScreen` (118) and the `ViewTransformMatrix` getter (39). All of those are in Camera.cs, so the lean advances whenever the matrices are rebuilt.
- `Camera.UpdateMatrices`: Camera.cs 153-180. Build order: origin, lean zoom, peek, lean translate, invert.
- `Camera.Update`: Camera.cs 75-86, called from `Scene.Update` (Scene.cs 30-33).
- `Zoom` setter, `ZoomIn`, `ZoomOut`: Camera.cs 48-62.
- `MouseToWorldPosition` and `ScreenToWorld`: Camera.cs 88-103 and 143-151. Picking uses the inverse matrix, so it includes the lean. `GameScene.Update` sets the mouse-picked world position from it (GameScene.cs:720).
- `GetViewPort`: GameSceneDrawingSorting.cs 1186-1290. Called from `FillGameObjectList` (GameScene.cs:587), which `DrawWorld` calls (958).
- Easing functions: Easings.cs 11 (`OutQuad`) and 27 (`OutQuart`).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Look toward the cursor: direction from the view centre, magnitude ease-out, capped | Cap 250 px at zoom 1 (theirs, Camera.cs 12, 209); ease-out quad over half the view height (208-209); cap divided by Zoom (209) |
| Approach speed proportional to remaining distance and dt, with a floor | `OutQuart(dist / 250) x dt x 5` (217; factor 5 at 14); floor 0.01 at 13. The floor is per frame, not per second: at 60 fps about 0.6 of the gap per second, at 144 fps about 1.4 (rough arithmetic, not run) |
| Snap inside 1 px | 1 px (215, 222) |
| Zoom: clamp, step, scale is 1 / Zoom | Min 0.5, max 2.5, step 0.1 (Scene.cs 15, Camera.cs 53); default 1.0 (Profile.cs 130) |
| Zoom step is linear in Zoom, not in scale | Zoom 0.6 to 0.5 is scale 1.67 to 2.0 (+20%); Zoom 1.0 to 0.9 is scale 1.00 to 1.11 (+11%) (arithmetic) |

Edge cases (from the arithmetic, not run):
- The easing input can exceed 1. The target magnitude is `250 / Zoom` (209), which is 500 px at Zoom 0.5, so `dist / 250` can be above 1. `OutQuart(t) = 1 - (1 - t)^4` (Easings.cs 27) is 0 at t = 2, so a far target falls to the floor of 0.01.
- The approach fraction is not clamped. `OutQuart` is at most 1, so `time` is at most `5 x dt`. It is above 1 when dt is above 0.2 s. Line 218 passes it straight to `Vector2.Lerp`. What MonoGame's `Lerp` does with a fraction above 1 was not read.

## 4. TypeScript sketch

simplified: the sketch is the donor's 2D screen-space lean with the same constants and step order (target, ease, approach, snap). It returns the lean and does not build the matrix, so it has no picking. It keeps `PeekBackwards` as `backwards`. It clamps the approach fraction to 1, which the donor does not do (Camera.cs 217-218). It uses `/ 2` where the donor uses the integer shift `Bounds.Height >> 1` (208). A 3D world camera would drop the zoom term and take the cap in world units; this sketch does not do that.

```ts
// clean-room sketch of the cursor-lean step (donor: Camera.cs 189-224, BSD-2-Clause). Written from the described shape, not copied.
const MAX_LEAN_PX = 250;     // cap at zoom 1
const MIN_SPEED = 0.01;      // per-frame floor, as in the donor
const TIME_FACTOR = 5;       // approach speed per second, multiplied by dt

const outQuad = (t: number): number => 1 - (1 - t) * (1 - t);
const outQuart = (t: number): number => 1 - Math.pow(1 - t, 4);

interface V2 { x: number; y: number; }

interface LookInput {
  mouse: V2;          // cursor in view pixels, origin at view top-left
  viewW: number;      // view width in pixels (sets the origin)
  viewH: number;      // view height in pixels
  zoom: number;       // donor Camera.Zoom; the scale is 1 / zoom
  looking: boolean;   // look key held
  backwards: boolean; // look-backwards variant
  dt: number;         // seconds since last frame
}

// Returns the new lean in pixels; the caller applies it after the zoom scale, subtracted from the view.
function stepLean(lean: V2, i: LookInput): V2 {
  const origin: V2 = { x: i.viewW * 0.5, y: i.viewH * 0.5 };
  let target: V2 = { x: 0, y: 0 };

  if (i.looking) {
    let m: V2 = { x: i.mouse.x, y: i.mouse.y };
    if (i.backwards) {
      m = { x: 2 * origin.x - m.x, y: 2 * origin.y - m.y };
    }
    const dx = m.x - origin.x;
    const dy = m.y - origin.y;
    const len = Math.hypot(dx, dy);
    if (len > 0) {
      const frac = Math.min(len / (i.viewH / 2), 1);
      const mag = (outQuad(frac) * MAX_LEAN_PX) / i.zoom;
      target = { x: (dx / len) * mag, y: (dy / len) * mag };
    }
  }

  const dist = Math.hypot(target.x - lean.x, target.y - lean.y);
  if (dist > 1) {
    const speed = Math.min(1, Math.max(outQuart(dist / MAX_LEAN_PX) * i.dt * TIME_FACTOR, MIN_SPEED));
    return { x: lean.x + (target.x - lean.x) * speed, y: lean.y + (target.y - lean.y) * speed };
  }
  return target;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/QC014-camera-lean.ts`).

## 5. Lands in

- TARGET `src/fight/camera.ts` (proposed name; the Frankendom repo was not read, so the file name is a proposal). Client-only. Parity-checklist row 11 (fight camera). The lean is a world-camera option. The Pit camera stays frozen.
- today: none. The world camera is not yet in `src/fight`.
- Reuse tag: rewrite-from-idea (BSD-2-Clause: code may be adapted; this sketch was written from the shape)
- Brief rule served: the camera is client-only (the server never reads it), so the lean's tuning stays in client config, not in the engine or zone data.
- Best transferable idea: while a look key is held, the camera leans toward the cursor by an ease-out amount with a fixed cap, and releasing the key eases it back to centre without a snap.
- Decision (proposed): adapt. The hold-to-look, capped and eased lean fits a world camera that needs look-ahead. Rebuild it in ground-plane world units for the third-person camera, keep it off the Pit camera, and keep it out of target selection (the engine and the server never read it).
- Acceptance: client test in a world zone. With the look key held and the cursor 300 px right of centre, the view moves right by no more than the cap. Releasing the key returns the view to centre with no overshoot. The tile under the cursor when hit-tested matches the tile drawn there.

## 6. Gaps and risks

- Scope. This is a 2D isometric camera. A third-person camera needs a world-unit lean on the ground plane, a pitch and yaw model, shoulder offset, collision pull-in, lock-on framing and damped follow. None of these are in this donor. Only the lean and the zoom transfer.
- Picking follows the lean. `MouseToWorldPosition` uses the inverse matrix (Camera.cs 100, 143-151), and `GameScene.Update` uses it to set the mouse-picked world position (GameScene.cs:720). A Frankendom lean must go through the same inverse, or clicks land on the wrong tile. Test with the lean on.
- Targeting. The lean must not feed target choice. Target selection and MAX_ATTACKERS = 3 belong to the engine in src/fight. The donor lets the lean change picking; that is the part not to copy.
- Many-on-one framing. Leaning toward the cursor frames nothing about several enemies. Framing the centroid of up to 3 attackers is not in this donor (nothing found in the searches above).
- Pit. The Pit is frozen and tuned. The lean should be off there by default. The donor has only a world view.
- Hold only. The donor lean is started by a held key or mouse button (GameSceneInputHandler.cs 928, 960). There is no automatic lean. Keep it an explicit player action unless Dom asks for automatic look-ahead.
- Frame-rate dependence. `MIN_PEEK_SPEED` is per frame (13, 217), so the return speed changes with frame rate. A port should use the per-second term and express the floor per second.
- Input above 1 and unclamped fraction (section 3). Clamp both in the port.
- Double step. The zoom setter marks the matrices dirty (Camera.cs 53-54). `Update` forces a rebuild each frame (79, 85). Any matrix call after a mid-frame zoom change runs `CalculatePeek` again with the same dt (`UpdateMatrices` 153-158, 171). The macro path that could change zoom inside `Update` was not traced. A port should step the lean exactly once per frame.
- Client tuning, not engine data. The 250 px cap, factor 5, floor 0.01, zoom 0.5 to 2.5, step 0.1 and default 1.0 are client values that the server never reads. Keep them in client config.
- Zoom steps. The steps are linear in Zoom but the scale is 1 / Zoom (60, 184), so each zoom-in step is a bigger jump near 0.5. A port that wants even steps should step scale, not Zoom.
- Follow smoothing. The camera has no damped follow of its own. Following is the player's walk interpolation (Mobile.cs 718-782). A Frankendom third-person camera needs its own frame-rate-independent follow; this donor does not show one.
- Licence. BSD-2-Clause: code may be adapted, but this sketch was written from the shape.

Reuse tag: rewrite-from-idea (BSD-2-Clause, shape only in this note)
Brief rule served: camera is client-only; tuning in client config, not engine or zone data; no server-side reads of the lean.
Best transferable idea: while a look key is held, the camera leans toward the cursor by an ease-out amount with a fixed cap, and releasing the key eases it back to centre without a snap.
Decision (proposed): adapt. The hold-to-look, capped and eased lean fits a world camera that needs look-ahead. Rebuild it in ground-plane world units for the third-person camera, keep it off the Pit camera, and keep it out of target selection (the engine and the server never read it).
Acceptance: client test in a world zone. With the look key held and the cursor 300 px right of centre, the view moves right by no more than the cap. Releasing the key returns the view to centre with no overshoot. The tile under the cursor when hit-tested matches the tile drawn there.
