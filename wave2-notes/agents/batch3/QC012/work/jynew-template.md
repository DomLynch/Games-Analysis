# jynew-jynew (camera, cell 14)

Donor: `/mnt/frankendom-donors/jynew-jynew/jyx2/Assets/Scripts/GameMaps/CameraControls/CameraHelper.cs` | Licence: unclear, treated as restricted (clean-room, shape only). `README.md` line 290 says the project follows MIT but that the Heroes of Jin Yong community asset licence overrides several cases; the root `LICENSE` line 8 says "The use of any resources or code of this project is not permitted unless authorized by the public statement of this project."; the header of `CinemachineTriggerActionHelper.cs` line 5 says all code is MIT. These conflict, so no code is adapted | C# (Unity, Cinemachine) | symbol `CameraHelper`

Checked: camera_scope world camera (the overworld follow camera, plus the battle camera that follows the acting role on the battle map). Read in full: `CameraHelper.cs` (all 437 lines), `GameViewPortManager.cs` (all 91 lines), `CinemachineTriggerActionHelper.cs` (all 102 lines), `GameConst.cs` line 98, `BattleLoop.cs` 80-98, and the camera components of `Prefabs/GameViewport/GameViewport_FollowCamera.prefab` (serialized fields, lines 40-163). Not read: the Cinemachine package. Its GUIDs in the prefab (45e653..., ac0b09..., f4044..., bd6043...) do not resolve to any script in the donor, so the third-person follow, damping and collision maths are not available here, and the component types are inferred from their field names. Also not read: the FreeLook orbit values set in the scene, `GlobalAssetConfig` (`defaultVcamOffset`, `vcam3rdPrefab`), `GameSettingManager` (viewport source), `BattleManager`, and the key bindings in `Jyx2_Input`. Which camera is live in a given scene is set by `GameViewPortManager` and the scene; the state-driven rig's activation for Follow mode was not traced. Confidence: high on the battle pivot, zoom, pan and tween behaviour (every line read); medium on the camera selection; low on the third-person collision (not in the donor).

## 1. Mechanism

- Two follow paths. (a) Overworld: a Cinemachine state-driven camera with a FreeLook rig. `ChangeFollow` sets its `Follow` and `LookAt` to the player (`CameraHelper.cs` 266). (b) A Follow virtual camera built from `GlobalAssetConfig.vcam3rdPrefab` (`GameViewPortManager.cs` 65). It is active only in Follow mode and outside the world map (48, 88). The prefab sets FOV 50 (prefab 56), a third-person body with `ShoulderOffset` (-0.52, 2.39, -4.53) (155), `CameraDistance` 0 (158), `CameraRadius` 0.001 (163) and a collision layer mask of 262144 (161), and an aim component with damping 0.5 horizontal and vertical (131-132), screen centre 0.5 (133) and dead zones 0 (135). The follow maths of these components is Cinemachine's and is not in the donor.
- Battle pivot (read in full). `m_BattleCam` is a pivot with a child virtual camera `_battleVCam`. At start the child's height is set from `GlobalAssetConfig.defaultVcamOffset.y` (79). Each update, in this order:
  1. Input (`EveryUpdate`): right mouse drag, or the rotate keys, orbit the pivot by `RotateAround` about world up at 120 degrees per second, doubled in battle (54). Mouse X feeds the orbit (153). Keys pan the pivot at 30 units per second on the ground plane (179) and clear the role lock (`isBattleFieldLockRole = false`). The wheel moves the child camera along its forward (189), clamps its height to zoomMin 3 and zoomMax 20 (190), and reverses the step if the limit was hit (the check follows the clamp). A two-finger pinch does the same with a height clamp of 5 to 10 (128).
  2. Follow (`EveryLateUpdate`), only while the role lock is on. In battle, the first frame snaps the pivot to the role (209) and sets `m_CameraInit` (210). Later frames lerp the pivot toward the role with weight `smoothing * Time.deltaTime` (218). `smoothing` is 3 by default (27), replaced by `GameConst.CAM_SMOOTHING` when they differ by more than 0.01 (233; the constant defaults to 3, `GameConst.cs` 98). Outside battle the pivot snaps to the role every late frame (223).
- Focus per turn. Each battle turn calls `CameraHelper.Instance.ChangeFollow(role.View.transform)` (`BattleLoop.cs` 92). In battle, `ChangeFollow` hides the state-driven rig, shows the pivot, and sets the role lock on (260). Outside battle it does the reverse (266).
- Field rotation (not battle). Each update sets the FreeLook X axis value to `dt * 120 * input` (59), or adds to the heading bias in WorldSpace binding mode.
- Fixed-step ramps. `ChangeFOV`, `ChangeFreeLookHeight` and `ChangeFreeLookRadius` compute `step = (target - current) / (duration * 60)` (298-299, 366, 404 region) and add it on each FixedUpdate while a guard holds (303, 370, 408). The reset helpers use the same form towards 60 FOV, 5.5 height and 5.0 radius (348, 350, 385, 389, 423, 427). Each ramp is also disposed by a timer of `frame + 60` FixedUpdate steps (308, 334, 355, 375, 394, 413, 432).
- Battle FOV. Each step of the battle-FOV ramp clamps the FOV to 20..70 (332). The ramp runs while FOV differs from the target (`ChangeBattleCameraFOV` at 321, guard `!=` at 328).
- Shake. `ShakeCamera` adds a Perlin noise component to rig 1 of the FreeLook, with amplitude and frequency from the call (280-283), and removes it after `duration * 60` FixedUpdate frames (284).
- Triggers (`CinemachineTriggerActionHelper`). On enter, the player's direction lock is set (81) and, if asked, the follow target is cleared (50). On exit the saved target is restored (72). One saved slot is kept per trigger (`old_followTarget`).

## 2. Key functions

- `CameraHelper.Start`: `/mnt/frankendom-donors/jynew-jynew/jyx2/Assets/Scripts/GameMaps/CameraControls/CameraHelper.cs` 65-240. Subscriptions for touch and mouse input (EveryUpdate), and the pivot follow (EveryLateUpdate, 209-223).
- `CameraHelper.ChangeFollow`: same file, from 241 (the next function, `ShakeCamera`, starts at 276). Battle and field branches.
- `CameraHelper.ShakeCamera`: same file, from 276; the noise component is set at 280-283 and removed at 284.
- Orbit, touch, pan and wheel: same file, `RotateBattleCam` at 50 (orbit at 54), the pinch clamp at 128, the pan at 179, the wheel at 185-190.
- FOV and reset helpers: same file, `ChangeFOV` at 296, `ChangeBattleCameraFOV` at 321, `ResetFOV` at 345. Height and radius helpers: 363 to the end of the file (437).
- `GameViewPortManager.SetViewport` (40), `GetFollowVCam` (61) and `InitForLevel` (82, follow set at 85): `/mnt/frankendom-donors/jynew-jynew/jyx2/Assets/Scripts/GameMaps/CameraControls/GameViewPortManager.cs`.
- Trigger helper: `/mnt/frankendom-donors/jynew-jynew/jyx2/Assets/Scripts/GameMaps/CameraControls/CinemachineTriggerActionHelper.cs`, with the follow clear at 50, the restore at 72 and the direction lock at 81.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Pivot follows the acting role with a weight per second (battle), snaps in the field | smoothing 3 (`CameraHelper.cs` 27), overridable by `GameConst.CAM_SMOOTHING` (233; `GameConst.cs` 98); weight `smoothing * dt` (218) |
| Orbit by input, doubled in battle | 120 deg/s (26), x2 in battle (54) |
| Wheel zoom along the view forward, clamped on height, undone at the limit | step 3 per unit (28), height 3..20 (30-31, 190), touch 5..10 (128) |
| Pan on the ground plane | 30 units/s (179) |
| Ramp to a target over a duration in fixed steps, guarded, timer-disposed | duration times 60 steps (298); timer frame + 60 (308) |
| Battle FOV clamp | 20..70 (332); reset FOV 60 (348) |
| Shake as a timed noise component | duration times 60 frames (284); amplitude and frequency from the call (282-283) |
| Prefab third-person settings | shoulder offset (-0.52, 2.39, -4.53) (prefab 155), distance 0 (158), collision radius 0.001 (163), collision mask 262144 (161), FOV 50 (56), damping 0.5 (131-132), screen centre 0.5 (133) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's battle pivot (follow lerp or field snap, orbit, wheel zoom with height clamp and undo, pan, battle FOV clamp), a fixed-step ramp with a guard, and a timed shake. It omits the Cinemachine components (their maths is not in the donor), the touch pinch, the heading-bias branch, the role-lock flag and `m_CameraInit` (the sketch snaps only through `inBattle`), the trigger helper, the timer disposal (the caller stops the ramp), and the rotation through Cinemachine's `m_XAxis`. The orbit is shown as a yaw angle, not a `RotateAround`. The ramp takes a guard as a parameter, so the one-way guards of the donor can be written either way.

@@CODE@@

## 5. Lands in

- TARGET `src/fight/camera.ts` (proposed new client-only module for the battle-style pivot camera). The brief asks for a `src/fight/<module>.ts` name; the Frankendom repo is not read here, so this is a proposal.
- Parity-checklist row 11 (fight camera). This is the nearest row; the world camera is not the Pit fight camera, so the lane should confirm the row.
- Reuse tag: rewrite-from-idea (licence unclear; clean-room, shape only)
- Brief rule served: camera is client-only (the engine never reads it); rule 9 (Pit as client) is untouched, since this is not the Pit camera.

Best transferable idea: a pivot that follows the acting character with a per-second lerp weight in combat, snaps while exploring, and offers bounded orbit, zoom and pan on top, with every timed camera move written as a fixed-step ramp that carries its own guard.
Decision (proposed): adapt - take the pivot-follow, the bounded zoom-with-undo and the per-turn focus switch for the world camera; change it to frame-rate-independent smoothing (1 - exp(-k dt)) rather than `smoothing * dt`, make every ramp two-way, add a wall pull-in (the donor's shoulder collision is Cinemachine and not read), and keep the trigger and focus state in one writer. Why: the owner wants a better world camera, and this donor shows a working pivot-follow with bounded zoom, but its third-person collision and framing are not in the code it ships.
Acceptance: when the acting character changes, the camera glides to it over a fraction of a second and does not jump; the wheel zoom stops at its limits without sliding sideways; a headless test asserts that a ramp moves in both directions and reaches its target within duration x 60 steps.

## 6. Gaps and risks

- Third-person collision and shoulder maths are Cinemachine's and are not in the donor. Only the settings (shoulder offset, collision mask, damping) transfer. The owner's over-the-shoulder pull-in still needs our own ray test.
- No lock-on or many-enemy framing in the camera scripts read. The pivot follows one role (the acting one). MAX_ATTACKERS = 3 framing has to be designed; `BattleManager` was not read.
- One-way guards. `ChangeFOV` only raises FOV (guard `FieldOfView < finalFov`, 303). `ChangeFreeLookHeight` and `ChangeFreeLookRadius` only lower (guards at 370 and 408). The reset helpers only move up to their value (389, 427) or down to 60 (350). A ramp in the other direction silently does nothing. Do not copy the guards.
- Frame-rate dependence. The battle lerp weight is `smoothing * Time.deltaTime` (218), linear in dt; it is clamped by `Vector3.Lerp` but not frame-rate independent. Use an exponential weight.
- Zero duration. `Convert.ToInt32(duration * 60)` gives 0 frames and the step divides by zero (299 and the matching lines). Floats give infinity or NaN, not an exception. Guard the duration.
- Shake stacking. `ShakeCamera` calls `AddCinemachineComponent` on every call (280). Whether a second call replaces or duplicates the noise component is in the Cinemachine code, which is not read.
- Two writers on the camera's follow target: the state-driven rig is set in `ChangeFollow` (266), the Follow virtual camera in `InitForLevel` and the triggers (`GameViewPortManager.cs` 85; `CinemachineTriggerActionHelper.cs` 50, 72). The trigger keeps one saved slot. Frankendom needs one writer.
- `m_CameraInit` is set once and never cleared (210, declared 239). The first battle snap happens once per instance; later battles rely on the field snap having put the pivot on the player.
- Client-only. The camera feeds no hit test, no kill and no target lock; kills stay server-verified.
- Pit camera. This is the battle pivot on the map, not the frozen Pit arena. The Pit camera must not be changed.
- Designer data. Orbit speed, smoothing, zoom limits, the battle FOV clamp and the shoulder offset are candidates for data. Zoom limits and the shoulder offset would be zone data if they vary by map; the rest are client constants.
- Not read: `GlobalAssetConfig`, `GameSettingManager`, `BattleManager`, the FreeLook orbit values in the scene, `Jyx2_Input`, and the Cinemachine package.

Reuse tag and brief rule are listed in section 5.
