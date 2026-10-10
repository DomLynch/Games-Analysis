# MovingBlocks-Terasology (camera, cell 14)

Donor: `/mnt/frankendom-donors/MovingBlocks-Terasology/engine/src/main/java/org/terasology/engine/rendering/cameras/PerspectiveCamera.java` | Licence: Apache-2.0 (as read: LICENSE file, "Apache License, Version 2.0, January 2004"; SPDX header in PerspectiveCamera.java and CameraClientSystem.java) | Java | symbol `PerspectiveCamera.update` (applyCinematicEffect, calculateVector) | camera_scope: world camera

Checked: camera_scope = world camera. The list's hint file `core/subsystem/headless/renderer/NullCamera.java` is a headless stub (`updateMatrices` is empty, `isBobbingAllowed` returns false; read in full). The real camera code was read: `rendering/cameras/PerspectiveCamera.java` (1-160, the update, smoothing, bobbing and matrix path), `rendering/cameras/Camera.java` (36-37, 82-107, FOV easing and extension), `logic/players/LocalPlayerSystem.java` (127-141, 154-157, 403-429, 477-479), `rendering/nui/layers/mainMenu/videoSettings/CameraSetting.java` (1-26), `rendering/world/WorldRendererImpl.java` (263-270, the per-frame caller). Important: this donor has NO third-person camera. A grep for `thirdperson|third_person` (case-insensitive) found only `logic/players/ThirdPersonRemoteClientSystem.java`, which animates another player's mount points (321-329, read only those lines; not a camera). So what transfers is the smoothing, FOV and bob, not a follow rig. Not read: `LocalPlayer.getViewPosition`, the source of `CharacterMovementComponent.footstepDelta`, the `RenderingConfig` default for `cameraSettings` (the field has no initialiser; the value comes from the loaded config, not read), `CameraTargetSystem` beyond its first 60 lines (a target raycast whose focal distance the code comments as used for depth-of-field effects). Confidence: high on the camera-side mechanism (read end to end); the donor is first-person, so the third-person mapping is my judgement.

## 1. Mechanism

- `WorldRendererImpl` calls `playerCamera.update(secondsSinceLastFrame)` once per frame (267, per the block comment at 261-262). `LocalPlayerSystem.update` (127-141) sets the raw camera position and orientation from the local player's view position and rotation (139-140 and `updateCamera` 403-405), and updates the bob factors and FOV target (403-429). The order of those two calls within a frame was not checked.
- Order inside `PerspectiveCamera.update` (64-70):
  (a) `applyCinematicEffect` (72-84): push the current position and viewing direction onto the front of two history deques (73-74); trim both from the back while the length is above `cameraSetting.getSmoothingFrames()` (76-80); then replace the position and the viewing direction with `calculateVector` of each history (82-83).
  (b) `calculateVector` (86-103): weight of sample i is `0.9^i` with the newest sample at i = 0 (94); the sum is divided out (102). Smoothing is therefore an exponential-weight moving average over frames.
  (c) `super.update(deltaT)` (`Camera.update`, 82-99): ease `activeFov` toward `targetFov` at 50 degrees per second of `deltaT`; snap when within 1 degree (83-87, 89).
  (d) `updateMatrices()` (105-130, 160): the projection uses `activeFov` (125-126). Bob roll is applied through the right vector (121-122), and bob vertical offset is applied to the look-at eye and centre (128-130).
- Setting: `CameraSetting` has three values with frame counts: NORMAL 1, SMOOTH 5, CINEMATIC 60 (`CameraSetting.java` 6-8). Count 1 means no smoothing. The frame count is a count of update calls, not of seconds; `deltaT` is passed in but `applyCinematicEffect` never reads it.
- FOV: `targetFov` is the configured FOV (`Camera.java` 36); `activeFov` starts at `targetFov / 4` (37), so the view opens zoomed in and eases out. `extendFov(fov)` sets the target to the configured FOV plus `fov` (101-103); `resetFov()` restores it (105-107).
- Mode-keyed FOV: in `updateCamera`, `MovementMode.GHOSTING` calls `extendFov(24)` (424-425); any other mode calls `resetFov()` (427).
- Look: `lookPitch` is clamped to -89..89 on each `processInput` pass (156). `lookYaw` wraps at 360 (154).
- Bob: `bobFactor` advances by the change in `footstepDelta` (407-411), so the bob phase moves with footsteps, not with time: standing still leaves `footstepDelta` unchanged and the bob stops. Roll uses amplitude 0.01 at frequency 2.5 (416); vertical uses amplitude 0.025 at frequency 3 with phase pi/4 (417). Each is `sin(bobFactor * frequency + phase) * amplitude` (477-479). The bob is set directly per frame and is not smoothed by the history (it is applied in `updateMatrices`). It is switched off by `config.getRendering().isCameraBobbing()` (415-421).

## 2. Key functions

- `PerspectiveCamera.update`: `/mnt/frankendom-donors/MovingBlocks-Terasology/engine/src/main/java/org/terasology/engine/rendering/cameras/PerspectiveCamera.java` 64-70.
- `PerspectiveCamera.applyCinematicEffect` and `calculateVector`: same file, 72-84 and 86-103.
- `PerspectiveCamera.updateMatrices`: same file, 105-130 (bob and FOV use in 121-128).
- `Camera.update`, `extendFov`, `resetFov`: `/mnt/frankendom-donors/MovingBlocks-Terasology/engine/src/main/java/org/terasology/engine/rendering/cameras/Camera.java` 82-99, 101-103, 105-107; the FOV start value at 36-37.
- `LocalPlayerSystem.update` and `updateCamera`: `/mnt/frankendom-donors/MovingBlocks-Terasology/engine/src/main/java/org/terasology/engine/logic/players/LocalPlayerSystem.java` 127-141 and 403-429; bob function 477-479.
- Setting values: `/mnt/frankendom-donors/MovingBlocks-Terasology/engine/src/main/java/org/terasology/engine/rendering/nui/layers/mainMenu/videoSettings/CameraSetting.java` 5-8.
- Caller: `/mnt/frankendom-donors/MovingBlocks-Terasology/engine/src/main/java/org/terasology/engine/rendering/world/WorldRendererImpl.java` 263-270.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Exponential-weight moving average of recent camera samples (position and direction) | Weight base 0.9 (theirs, PerspectiveCamera.java 30); history length 1 / 5 / 60 frames (theirs, CameraSetting.java 6-8) |
| FOV eases toward a target at a fixed rate, snapping within 1 degree | Rate 50 degrees per second of delta (theirs, Camera.java 89); snap threshold 1 degree (theirs, 83-86) |
| FOV opens zoomed in and eases to base | Start at target / 4 (theirs, Camera.java 37) |
| FOV extension keyed to a movement mode | Ghosting extends by 24 degrees (theirs, LocalPlayerSystem.java 425) |
| Look pitch limit | +/-89 degrees (theirs, LocalPlayerSystem.java 156) |
| Footstep-phase bob | Roll 0.01 at 2.5; vertical 0.025 at 3 with phase pi/4 (theirs, LocalPlayerSystem.java 416-417) |
| Settings slider bounds | FOV minimum 70 (theirs, VideoSettingsScreen.java 158) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's frame-history average (push, trim, weighted average) and the FOV ease with the mode-keyed target. It is written in the donor's frame-count form so the mechanism is faithful; Frankendom should change the history to a time constant (see section 6). It omits the bob (roll and vertical, and the footstep-phase input), the camera rotation, the position and direction pairing (this sketch smooths one vector), the pitch and yaw clamps, `updateCamera`, and the matrix build. It reorders nothing: smoothing runs before the FOV ease, as in `PerspectiveCamera.update`.

```ts
// Licence: Apache-2.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface V3 { x: number; y: number; z: number; }

// Frame-history smoothing: keep the newest `frames` samples and average them with weights decay^i (newest is i = 0).
class HistorySmoother {
  private history: V3[] = [];
  constructor(private readonly frames: number, private readonly decay: number = 0.9) {}

  push(sample: V3): V3 {
    this.history.unshift({ ...sample });
    while (this.history.length > this.frames) this.history.pop();
    let wSum = 0, x = 0, y = 0, z = 0;
    this.history.forEach((s, i) => {
      const k = Math.pow(this.decay, i);
      wSum += k;
      x += s.x * k; y += s.y * k; z += s.z * k;
    });
    return { x: x / wSum, y: y / wSum, z: z / wSum };
  }
}

interface FovState { active: number; target: number; }
const FOV_EASE_PER_SECOND = 50;   // degrees per second toward the target (donor counts seconds of delta)

// Ease the active FOV toward the target; snap when within 1 degree.
function stepFov(f: FovState, dt: number): void {
  if (Math.abs(f.active - f.target) < 1) { f.active = f.target; return; }
  const step = FOV_EASE_PER_SECOND * dt;
  if (f.active < f.target) f.active = Math.min(f.target, f.active + step);
  else f.active = Math.max(f.target, f.active - step);
}

// Mode-keyed FOV target: the base FOV, plus an extension while the mode asks for it.
function fovTarget(baseFov: number, extraFov: number, extended: boolean): number {
  return extended ? baseFov + extraFov : baseFov;
}
```

## 5. Lands in

- TARGET `origins/client/world-camera.ts` (proposed new client file; the Frankendom repo was not checked for an existing camera module). The camera is client-only (ruling), so the server never reads these values.
- Parity row 11 (fight camera). Row 11 is the fight camera; there is no checklist row for the world camera (see section 6).
- Reuse tag: rewrite-from-idea (Apache-2.0; code may be adapted with the notice kept; this note is written clean-room)
- Brief rule served: camera is client-only; zones as data (the FOV extension and smoothing amounts are data, not constants in the function)

Best transferable idea: Smooth the third-person camera by averaging its recent positions with decaying weights, ease the FOV toward a mode-keyed target at a fixed rate, and tie the view bob to footstep progress so it stops when the character stands still.

Decision (proposed): adapt - take the decaying-average smoothing, the rate-limited FOV ease with a mode-keyed extension, and the footstep-phase bob. Change the smoothing from a frame count to a time constant, because the donor counts frames and so runs at a different lag at 30 and 144 fps.

Acceptance: At 30 fps and at 144 fps, the camera's lag behind a hero running at a fixed speed is the same within 5 percent, and a fight start widens the FOV by 12 degrees in about 0.24 s (12 / 50 s) and the end restores it. A client unit test with a fixed-step clock asserts both.

## 6. Gaps and risks

- No third-person camera: this donor is first-person. The third-person rig (orbit, wall pull-in, aim point, lock-on framing) has to come from another donor (the dhewm3 and Card-Forge notes cover parts of it). Only the smoothing, FOV and bob transfer from here.
- Frame-count smoothing: `applyCinematicEffect` counts update calls and never reads `deltaT` (WorldRendererImpl 267 passes the time in, but it is not used for smoothing). The lag therefore changes with frame rate. Frankendom must use a time constant (for example exponential smoothing with `1 - exp(-dt / tau)`).
- Smoothing lags the raw camera. Frankendom's world camera needs the same lag rule for the target and for the look-at point; if only one is smoothed, the hero drifts off centre during turns.
- Mixed clocks in one frame block: the same `WorldRendererImpl` block lerps the light intensity by time (264-265) but smooths the camera by frames. Frankendom should keep one clock for camera and light.
- Footstep bob: the bob is driven by footstep progress, so it stops when the character stands. This is good for a walking character; a fight camera may want a separate, time-based shake instead. Not read: where `footstepDelta` comes from.
- FOV start at target / 4 means a new camera opens zoomed in (the value is set when the camera is constructed). Check that this is wanted before copying it.
- Config default: the default `CameraSetting` is not in the code read (the field has no initialiser). Frankendom should set its own default in data, not copy the setting.
- Parity: row 11 is the fight camera. The world camera has no checklist row, so Lead should add one before this lands. Same flag as the other two camera notes.
- Licence Apache-2.0: code may be adapted with the notice kept. This note is clean-room anyway; the sketch is written from the described mechanism.
