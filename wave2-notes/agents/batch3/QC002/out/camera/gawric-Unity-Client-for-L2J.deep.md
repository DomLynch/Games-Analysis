# gawric-Unity-Client-for-L2J (camera, cell 14)

Donor: `/mnt/frankendom-donors/gawric-Unity-Client-for-L2J/l2-unity/Assets/Scripts/Camera/CameraController.cs` | Licence: as read: Apache License 2.0 (repo `LICENSE`, full text; `CameraController.cs` has no per-file header; the Unity plugins under `Assets/Plugins` carry their own licences and were not read) | C# (Unity) | symbol `CameraController.UpdatePosition` (with `CameraCollisionDetection.DetectSphereCollision`, `CameraController.UpdateInputs`, `UpdateZoom`)

Checked: camera scope is world camera (third-person orbit follow of the local player in the open world; `LoginCameraManager.cs` and `FreeFlyCamera.cs` are the login and dev cameras and were not read). The list's hint was "INFERRED", so the file was found by grep for camera across the 81 `.cs` files that mention it. Opened and read end to end: `Assets/Scripts/Camera/CameraController.cs` (357 lines) and `Assets/Scripts/Camera/CameraCollisionDetection.cs` (110 lines). Read in part: `Assets/Scripts/Input/InputManager.cs` (42-45, 97-98, 133-160; the `CameraAxis` binding file was not read, so which device drives it is not verified). Grep only: `Assets/Scripts/Combat/TargetManager.cs:104` and `Assets/Scripts/UI/Game/Nameplate/Logic/NameplateEntryStore.cs:290` (both call `IsObjectVisible`); `Assets/Scripts/Game/Spawn/PlayerSpawner.cs:94` (the only `SetHeading` caller). Candidate files opened: `CameraController.cs`, `CameraCollisionDetection.cs`, `InputManager.cs`, plus the grep hits above. Callers: `UpdatePosition` runs from `LateUpdate` only (CameraController.cs:125); `DetectSphereCollision` has one caller (CameraController.cs:244, inside `UpdatePosition`); `GetCameraClipPoints` has no callers (grep); `L2MaxDistanceMeters` has none (grep). Confidence: high for what the code computes and in what order (read end to end). Moderate on Unity API behaviour I rely on and did not check here: `Vector3.Lerp` clamping `t`, the `Quaternion.Euler` order (the forward formula in the sketch is derived from the donor's own "Unity Euler X is inverted" comment), and the meaning of `SphereCast` `hit.distance` (taken as the centre's distance at contact). Not read: the `CharacterController` prefab values (the look point depends on `cc.height` when present), `CameraMoving` source beyond line 134, `CameraAxis` binding.
Best transferable idea: Pull the camera in on a sphere cast from the look-at point toward the desired camera spot (radius 0.1 m and extra 0.3 m, both scaled to the character), and lerp the look-at point rather than the camera, so the camera follows the character with lag but never sits inside level geometry.
Decision (proposed): adapt - it is the only donor here with a real collision pull-in and a smoothed look-at, and Apache 2.0 allows adaptation with the notice kept; but it snaps the distance, has no shoulder offset (its offset is world-space and zero), never follows the character's facing, and uses a fixed 90-degree horizontal FOV that becomes very wide on a portrait phone, so Frankendom must ease the pull-in, add a camera-space shoulder offset, add auto-follow, and cap the vertical FOV.
Acceptance: With a wall about 1 m behind the character, a client test asserts that the camera distance is no more than the wall distance and no less than 0.05 m, and that the camera distance eases back out (no snap) when the wall is removed; a 375x812 portrait window keeps the vertical FOV under a set cap.

## 1. Mechanism

- A third-person orbit camera around a look-at point. State persists between frames: heading (`_x`, unbounded), pitch (`_y`, clamped to +/-80 degrees), the zoom distance `_camDistance`, the smoothed look-at `_lerpLookAt`, and the collision-adjusted distance `_currentDistance`.
- Order of work per frame (Unity: `Update` then `LateUpdate`). Zoom is in `Update` (109-114). `LateUpdate` (117-126) runs `UpdateInputs` then `UpdatePosition`.
  (a) Zoom (204-213). Only if the input manager exists. The zoom distance changes by minus the scroll axis times 0.5 per frame (`zoomSpeed` 5 times 0.1), clamped between the minimum (1 m scaled) and the maximum (8, serialized default). This is per frame, not per second.
  (b) Orbit input (192-202). Only when `TurnCamera` is set, i.e. right button held and `CameraMoving` (InputManager.cs:147-149; `CameraMoving` is a non-zero `CameraAxis`, InputManager.cs:133-134). Heading gets mouse X times 3 per frame (199); pitch gets minus mouse Y times 3 per frame (200) and is clamped to +/-80 (201).
  (c) Rotation (217): `Quaternion.Euler(pitch, heading, 0)`. The rotation is applied directly each frame, with no smoothing of the angles.
  (d) Look-at point (218, 269-287): the top of the character controller, plus `_camOffset` (world space, zero by default), plus up times (0.2 m scaled, minus 0.3 m unscaled, plus the bone offset when sticking to a bone). With no controller, it falls back to the resolved player height.
  (e) Smoothing (220-232): if the look-at is exactly the zero vector it is copied (222-225); otherwise `_lerpLookAt` moves toward the look-at by `Vector3.Lerp(..., 8 times Time.deltaTime)` (227). With smoothing off it is copied.
  (f) Pull-in (234-250). The desired distance is the zoom distance. If collision is on, `DetectSphereCollision` runs from `_lerpLookAt`, along the direction to the camera, with radius `0.1 x WorldScale` and extra length `0.3 x WorldScale` (244-249). The adjusted distance is then used (250).
  (g) Distance (254): `_currentDistance` is set straight to the adjusted distance. Nothing smooths it, so a pull-in or a zoom step is instant.
  (h) Placement (255, 261): position is `_lerpLookAt + rotation * (forward * -_currentDistance)`, and the camera's rotation is set to `rotation`, so it looks at the smoothed look-at point.
- `DetectSphereCollision` (CameraCollisionDetection.cs:29-68). The adjusted distance starts as the desired distance (36). If the desired distance is over 0.001, a sphere cast runs from the look-at point toward the camera with radius at least 0.01 and length desired plus extra (42-57). On a hit the distance becomes the hit distance, clamped to between 0.05 and the desired distance (61). The clamp means the camera is never pushed further out than the zoom distance, and never closer than 5 cm.
- Field of view (`ApplyL2Fov`, 316-341). Called from `Start` (97) and `SetTarget` (149) only. The horizontal FOV is held at 90 degrees and the vertical FOV is derived from the aspect ratio: v = 2 atan(tan(45 degrees) / aspect) (339).
- Tick: `LateUpdate` on Unity's frame loop. The smoothing uses `Time.deltaTime`; the orbit uses the per-frame mouse axis, so the orbit follows the amount of mouse movement, not time.

## 2. Key functions

- `UpdatePosition`: `/mnt/frankendom-donors/gawric-Unity-Client-for-L2J/l2-unity/Assets/Scripts/Camera/CameraController.cs` 215-262 (rotation, look-at smoothing, pull-in, placement).
- `UpdateInputs` and `UpdateZoom`: `/mnt/frankendom-donors/gawric-Unity-Client-for-L2J/l2-unity/Assets/Scripts/Camera/CameraController.cs` 192-202 and 204-213 (mouse orbit with pitch clamp; zoom clamp).
- `LookAtPoint`: `/mnt/frankendom-donors/gawric-Unity-Client-for-L2J/l2-unity/Assets/Scripts/Camera/CameraController.cs` 269-287.
- `DetectSphereCollision`: `/mnt/frankendom-donors/gawric-Unity-Client-for-L2J/l2-unity/Assets/Scripts/Camera/CameraCollisionDetection.cs` 29-68.
- `ApplyL2Fov` and `VerticalFovFromHorizontal`: `/mnt/frankendom-donors/gawric-Unity-Client-for-L2J/l2-unity/Assets/Scripts/Camera/CameraController.cs` 316-341.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Collision pull-in from a sphere cast at the look-at point | Radius 0.1 m x WorldScale (CameraController.cs:11, 248); extra length 0.3 m x WorldScale (12, 249); radius floor 0.01 (CameraCollisionDetection.cs:54); distance floor 0.05 (61) |
| Look-at point above the character | 0.2 m x WorldScale (10, 277) minus 0.3 m unscaled (32, 282) |
| Look-at smoothing | Rate 8 per second times Time.deltaTime (33, 227) |
| Orbit input gain | 3 degrees per unit of mouse axis, per frame (34, 199-200) |
| Pitch range | +/-80 degrees (201) |
| Zoom | 5 times 0.1 = 0.5 m per unit of scroll per frame (42, 212); clamp 1 m x WorldScale minimum (13, 40), 8 m maximum (41) |
| Default follow distance | 2.3 m x WorldScale + 0.5 m (9, 43) |
| Initial pitch | 2700 x 360 / 65536 = about 14.83 degrees, derived from the donor comment (5, 7) |
| World scale | 0.85 / 1.6 = 0.53125 (25, 26, 66) |
| Derived: pull-in sphere radius and extra in metres | 0.1 x 0.53125 = 0.0531 m; 0.3 x 0.53125 = 0.1594 m |
| Derived: default zoom and minimum zoom in metres | 2.3 x 0.53125 + 0.5 = 1.7219 m; 1 x 0.53125 = 0.5313 m |
| Derived: vertical FOV at a 375x812 portrait window | aspect 0.462: 2 atan(1 / 0.462) = about 130 degrees; at 16:9 landscape about 59 degrees |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order (orbit input, zoom, look-at point, lerp of the look-at, sphere-cast pull-in, placement) but puts orbit before zoom in one call, where the donor runs zoom in `Update` and the orbit in `LateUpdate`. It replaces `Vector3.Lerp` with an explicit clamp on `t`, which the donor leaves unclamped (Unity's `Lerp` is believed to clamp; not checked here). It takes the character's top point from the caller and omits the bone-stick offset, the zero-vector reset of the look-at (222-225), the smoothing-off branch, the camera-null guards, the NaN guard (256-259), the `IsObjectVisible` corner test, the login and dev cameras, and the `ApplyL2Fov` call sites. It keeps the donor's unrotated world-space offset. The Euler forward is derived from the donor's sign comment and was not run in Unity. The `export const` line is only there so the constants are used; it is not in the donor.

```ts
// Licence: Apache-2.0 (donor repo LICENSE; CameraController.cs has no per-file header). Permissive: adaptable with the licence notice kept.
// Clean-room sketch written from the described mechanism; Unity types replaced by plain objects.
type V3 = { x: number; y: number; z: number };
interface OrbitState {
  headingDeg: number;          // unbounded, as in the donor
  pitchDeg: number;            // clamped to +/- 80
  camDist: number;             // zoom distance (before collision)
  lerpLookAt: V3 | null;       // smoothed look-at point
}

const WORLD_SCALE = 0.85 / 1.6;          // Unity player height / L2 reference height
const PITCH_LIMIT = 80;
const MOUSE_GAIN = 3;                    // degrees per unit of mouse axis, per frame
const ZOOM_PER_SCROLL = 5 * 0.1;         // zoomSpeed * 0.1 per unit of scroll, per frame (metres)
const MIN_DIST = 1 * WORLD_SCALE;        // L2 minimum distance, scaled
const MAX_DIST = 8;                      // serialized default; the L2 constant of 6 is unused
const SMOOTH_RATE = 8;                   // look-at lerp rate per second
const COLLIDE_RADIUS = 0.1 * WORLD_SCALE;
const COLLIDE_EXTRA = 0.3 * WORLD_SCALE; // extra cast length beyond the desired distance
const MIN_COLLIDE_DIST = 0.05;
const ABOVE_HEAD = 0.2 * WORLD_SCALE;
const LOOK_ADJUST = -0.3;                // not scaled in the donor
const DEFAULT_DIST = 2.3 * WORLD_SCALE + 0.5;

// Unity Euler(pitch, yaw, 0) forward, with pitch positive looking down (donor comment). Derived, not run in Unity.
function forwardFromEuler(pitchDeg: number, yawDeg: number): V3 {
  const p = (pitchDeg * Math.PI) / 180;
  const y = (yawDeg * Math.PI) / 180;
  return { x: Math.cos(p) * Math.sin(y), y: -Math.sin(p), z: Math.cos(p) * Math.cos(y) };
}

function orbitFromMouse(s: OrbitState, mouseX: number, mouseY: number, rightHeld: boolean): void {
  if (!rightHeld) return;                // donor: only while right button held (and CameraMoving, not read)
  s.headingDeg += mouseX * MOUSE_GAIN;
  s.pitchDeg = Math.min(Math.max(s.pitchDeg - mouseY * MOUSE_GAIN, -PITCH_LIMIT), PITCH_LIMIT);
}

function zoomFromScroll(s: OrbitState, scroll: number): void {
  s.camDist = Math.min(Math.max(s.camDist - scroll * ZOOM_PER_SCROLL, MIN_DIST), MAX_DIST);
}

// Look-at point: character top plus a fixed world-space offset (not rotated by the camera, as in the donor).
function lookAtPoint(charTop: V3, camOffset: V3): V3 {
  return {
    x: charTop.x + camOffset.x,
    y: charTop.y + camOffset.y + (ABOVE_HEAD + LOOK_ADJUST),
    z: charTop.z + camOffset.z,
  };
}

// Donor: Vector3.Lerp(prev, target, 8 * dt). Here t is clamped explicitly.
function smoothLookAt(prev: V3 | null, target: V3, dtSec: number): V3 {
  if (prev === null) return target;
  const t = Math.min(Math.max(SMOOTH_RATE * dtSec, 0), 1);
  return {
    x: prev.x + (target.x - prev.x) * t,
    y: prev.y + (target.y - prev.y) * t,
    z: prev.z + (target.z - prev.z) * t,
  };
}

// Sphere cast from the look-at point toward the camera. Returns the distance of the sphere centre at first contact, or null.
type SphereCast = (origin: V3, dir: V3, maxDist: number, radius: number) => number | null;

function pullIn(lookAt: V3, dirToCamera: V3, desired: number, cast: SphereCast): number {
  if (desired <= 0.001) return desired;
  const hit = cast(lookAt, dirToCamera, desired + COLLIDE_EXTRA, Math.max(0.01, COLLIDE_RADIUS));
  if (hit === null) return desired;
  return Math.min(Math.max(hit, MIN_COLLIDE_DIST), desired);   // snaps: the donor does not smooth the distance
}

// One frame in donor order (donor: zoom in Update, orbit and placement in LateUpdate).
function tickOrbitCamera(
  s: OrbitState,
  charTop: V3,
  camOffset: V3,
  inp: { mouseX: number; mouseY: number; rightHeld: boolean; scroll: number },
  dtSec: number,
  cast: SphereCast,
): { position: V3; forward: V3 } {
  orbitFromMouse(s, inp.mouseX, inp.mouseY, inp.rightHeld);
  zoomFromScroll(s, inp.scroll);
  const look = smoothLookAt(s.lerpLookAt, lookAtPoint(charTop, camOffset), dtSec);
  s.lerpLookAt = look;
  const f = forwardFromEuler(s.pitchDeg, s.headingDeg);
  const dirToCam: V3 = { x: -f.x, y: -f.y, z: -f.z };
  const dist = pullIn(look, dirToCam, s.camDist, cast);
  return {
    position: { x: look.x + dirToCam.x * dist, y: look.y + dirToCam.y * dist, z: look.z + dirToCam.z * dist },
    forward: f,
  };
}

// Horizontal FOV held at 90 degrees; vertical derived from aspect (width / height).
function verticalFovFromHorizontal(hDeg: number, aspect: number): number {
  const h = (hDeg * Math.PI) / 180;
  const v = 2 * Math.atan(Math.tan(h * 0.5) / Math.max(0.01, aspect));
  return (v * 180) / Math.PI;
}

export const L2_DEFAULTS = { DEFAULT_DIST, MIN_DIST, MAX_DIST, COLLIDE_RADIUS, COLLIDE_EXTRA };
```

## 5. Lands in

- TARGET `src/fight/camera.ts` (proposed client-only world camera module; the camera never enters the engine). The Frankendom repo was not read, so whether the file exists is not verified.
- Parity-checklist row 11 (fight camera). Not a server-tick row: it reads the local character and never sends or receives server state.
- Reuse tag: adaptable (Apache-2.0: code may be adapted; keep the licence notice, and any NOTICE file if the repo has one)
- Brief rule served: 1 (one engine: the camera only reads the character and never changes outcomes). Rules 7-9 n/a: client-only.

## 6. Gaps and risks

- No shoulder. `_camOffset` is a world-space vector added to the look-at point (282, 286), zero by default (31). It is not rotated by heading, so it is not a shoulder offset. A Frankendom shoulder offset must be in camera right and up.
- Distance snaps. The distance is set with no smoothing (254) and zoom changes instantly per frame (212), so the camera jumps when a wall appears or the player zooms. Frankendom should ease the pull-in in and out separately; the donor does not.
- No auto-follow. `SetHeading` has one caller, at spawn (PlayerSpawner.cs:94). The heading changes only from the mouse while right button is held. The camera never turns to follow the character's facing, and nothing recentres it behind the character.
- Only the look-at point is smoothed (227); the orbit angles are applied directly (217). Rotation is immediate and the follow lags. That is a deliberate split; a Frankendom camera that also smooths the rotation would need to decide the lag for turning.
- Small pull-in sphere. Radius 0.053 m (derived) is small. Thin or small geometry can still be clipped, and the sphere cast only checks along the camera ray from the look-at point, not around the camera. Frankendom needs a second check or a larger radius for narrow spaces.
- Portrait FOV. The horizontal FOV is fixed at 90 degrees (8, 333), so a 375x812 portrait window gets a vertical FOV of about 130 degrees (derived from 339). That is very wide. Frankendom needs a vertical FOV cap for portrait.
- FOV set once. `ApplyL2Fov` runs only at `Start` (97) and `SetTarget` (149), so rotating the device or resizing does not update it.
- Visibility bug (not for the camera position). `GetCameraViewPortPoints` calls `Mathf.Tan(_camera.fieldOfView)` (CameraCollisionDetection.cs:99), which passes degrees to a function that takes radians and uses no half angle. The corner points for `IsObjectVisible` are therefore wrong, and `IsObjectVisible` is used by target selection (TargetManager.cs:104) and nameplates (NameplateEntryStore.cs:290). Frankendom must not copy line 99.
- Unused code: `GetCameraClipPoints` (CameraCollisionDetection.cs:70-86; no callers) has the same radians bug at line 76; `L2MaxDistanceMeters` (CameraController.cs:14) is unused, and the serialized maximum of 8 is used instead.
- Mouse-only orbit. The orbit needs right button held and a non-zero `CameraAxis` (InputManager.cs:133-149). There is no touch drag orbit in the code read. Frankendom is a phone game, so a drag-to-orbit gesture needs its own design.
- No lock-on or many-enemy framing, no combat FOV, no shake, no zoom pulse in this file. The only target link is the visibility test (TargetManager.cs:104), which is a candidate gate for lock-on, not framing.
- Minor: the zero-vector test at 222 resets the smoothed look-at whenever it is exactly zero; harmless in practice but not intended behaviour.

Reuse tag: adaptable (Apache-2.0: adapt with the licence notice kept)
Brief rule served: 1 (one engine; camera is client-only and never changes outcomes)



## Checker findings (Sonnet 5.5 medium, 2026-10-10)
**Verdict: CLEAN.** Independent check against the donor code.

**Errors / corrections:** None found. Verified: UpdatePosition 215-262 order (Euler 217, lookAt 218, lerp 220-232 with 8*dt at 227, DetectSphereCollision 244-249, snap 254, placement 255/261), UpdateInputs 192-202 (x3 gain, +/-80 clamp), UpdateZoom 204-213 (5*0.1, clamp), LookAtPoint 269-287 (0.2*scale, -0.3 unscaled), ApplyL2Fov 316-341, collision clamp(hit,0.05,desired) at CameraCollisionDetection 61, radius floor 0.01 at 54, tan(fov) radians bug at 99 and 76, SetHeading sole caller PlayerSpawner:94, TargetManager:104, NameplateEntryStore:290, InputManager 133-134/147-149, Apache-2.0 LICENSE, derived figures (0.53125, 1.7219 m, 130 deg portrait FOV).

**Missed:** Minor: InputManager.cs 153 only refreshes ZoomAxis when the mouse is not over UI, so a stale non-zero ZoomAxis can keep zooming each frame while over UI. Not covered.
