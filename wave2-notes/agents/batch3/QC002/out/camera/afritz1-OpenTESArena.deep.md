# afritz1-OpenTESArena (camera, cell 14)

Donor: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Game/Game.cpp` | Licence: as read: MIT (`/mnt/frankendom-donors/afritz1-OpenTESArena/LICENSE.txt`: "The MIT License (MIT)", Copyright (c) 2016-2026 The OpenTESArena Developers) | C++ | symbol `Game::loop` (camera path: `Player::rotateY`, `Player::getEyePosition`, `RenderCamera::init`)

Checked: camera scope is world camera (the donor's camera is a first-person eye in open zones; it has no pit/arena camera in the code read). Opened and read: Game/Game.cpp (loop 804-1034: turn 880-889, physics 938-941, eye and camera 953-959, render camera 1027-1031; loop header at 804), Player/Player.cpp (519-545 yaw and pitch, 632-637 eye), Player/Player.h (29-33, 191), Player/PlayerLogic.cpp (915-1015 turn input), Rendering/RenderCamera.h and .cpp (whole files), Game/Options.h (81-86, 185), options/options-default.txt (29, 77, 84), Math/MathUtils.cpp (66-68), Interface/OptionsUiMVC.cpp (326-331). Candidate files opened: World/ArenaMeshUtils.cpp (the list hint is the wrong file: its only "camera" hit is a chasm mesh offset, lines 80-101, not a camera), Player/Player.cpp, Game/Game.cpp, Player/PlayerLogic.cpp, Rendering/RenderCamera.cpp. Callers: `Player::rotateY` has one caller (Game.cpp:889); `makeTurningAngularValues` has one caller (Game.cpp:880); `getInputAcceleration` has one caller (Game.cpp:897); all five `renderCamera.init` sites take the options FOV (Game.cpp:598, 959, 1031; GameState.cpp:1211; GameWorldUiMVC.cpp:343 (grep only)). Confidence: high for what the camera path does (read end to end); high that the donor has no third-person follow camera (grep for third-person, orbit, follow, shake, smooth, lerp, bob and sway across Player, Game, Rendering and Interface found no camera rig; the Rendering hits are geometry lerps, SoftwareRenderer.cpp:57 and 1817). Not read: the Jolt CharacterVirtual settings and `ExtendedUpdate` (named only), `getInputAccelerationModern` (PlayerLogic.cpp:196, not read), `FrameTimer` (not read), `Player::accelerate` past its first half (Player.cpp:707-731).
Best transferable idea: Derive the camera from the character's post-physics position in the same tick, with turn input applied before the physics step and pitch clamped to a player-set limit, and normalise mouse look by the smaller screen side so turn speed does not depend on aspect ratio.
Decision (proposed): adapt - the update order and aspect-normalised look are what Frankendom's world camera needs, but this donor is first-person with no shoulder offset or collision pull-in, so the over-the-shoulder rig must be designed on top of these rules; the Pit camera stays frozen and does not need it.
Acceptance: A client test asserts that after one physics step the camera eye equals the collider centre plus the eye offset (within 1e-6), that pitch never exceeds the limit, and that a mouse move of the same pixel length gives the same yaw on a 1600x900 and a 1200x900 window.

## 1. Mechanism

- This is a first-person eye, not a follow camera. The camera has no state of its own: each tick it is rebuilt from the character's collider position plus the player's yaw and pitch. Nothing lags behind the character and nothing is smoothed (the donor has no camera smoothing, see the Checked line).
- Order of steps inside one frame of `Game::loop` (Game.cpp, from line 804, variable step on `clampedDeltaTime`):
  (a) Turn input. `makeTurningAngularValues` (PlayerLogic.cpp:915) returns a turn value. Classic mode: keyboard A or D gives `turningScale * dt` (1.0 on foot, 2/3 when swimming, PlayerLogic.cpp:935, 989); holding the left mouse button turns by cursor position in the screen-edge regions, scaled by `dt` (PlayerLogic.cpp:982). Modern mode: the raw mouse delta divided by the smaller window side (PlayerLogic.cpp:1010-1014), not scaled by `dt`.
  (b) Scaling. Game.cpp:883-884 multiply the turn value by `100 x` option sensitivity to get degrees. Vertical sign flips if invert is on (885-886). The pitch limit is read from options (887).
  (c) Apply. `rotateX` adds yaw and wraps it with `fmod` into 0-360 (Player.cpp:522). `rotateY` adds pitch and clamps it to plus or minus the pitch limit (Player.cpp:540); yaw is not clamped.
  (d) Movement. The input acceleration is applied with `clampedDeltaTime` (Game.cpp:915, `Player::accelerate`). Only the first half of `accelerate` was read.
  (e) Physics. `prePhysicsStep`, then `physicsSystem.Update(clampedDeltaTime, frameTimer.physicsSteps, ...)` (Game.cpp:938-941). Jolt resolves walls; the character collider radius is 0.20 (Player.h:33).
  (f) Eye. `getEyePosition` (Player.cpp:632-637) takes the collider centre, adds half of the top-of-head height, then subtracts the eye-to-top distance. With EyeHeight 60 and TopOfHeadHeight 61 over ARENA_UNITS 128, that is centre plus 29.5/128, about 0.2305 world units above the collider centre (derived from those constants).
  (g) Camera. `renderCamera.init(eye, angleX, angleY, VerticalFOV, aspect, tallPixelRatio)` (Game.cpp:953-959). The view is built from yaw and pitch at the eye; zoom is `1 / tan(fovY / 2)` (MathUtils.cpp:68, RenderCamera.cpp:28). The render pass reads the eye again and re-initialises the camera before drawing (Game.cpp:1027-1031), so a scene change in the late tick is picked up.
- Tick: variable step. Input, movement and physics all use `clampedDeltaTime`; the physics call also receives `frameTimer.physicsSteps` (the step count is set in `FrameTimer`, which was not read).
- The eye point is also the start of interaction ray casts (GameWorldUiMVC.cpp:1232 and 1299, PlayerLogic.cpp:1249; grep only) and the audio listener takes the same eye position and forward (Game.cpp:976).

## 2. Key functions

- `Game::loop` camera path: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Game/Game.cpp` 880-889 (turn, scale, pitch limit, rotate), 938-941 (physics), 953-959 (eye and camera init), 1027-1031 (render camera re-init).
- `PlayerLogic::makeTurningAngularValues`: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Player/PlayerLogic.cpp` 915-1016 (classic edge and keyboard turn, modern mouse look normalised by the smaller side).
- `Player::rotateX` and `Player::rotateY`: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Player/Player.cpp` 519-545 (yaw wrap, pitch clamp).
- `Player::getEyePosition`: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Player/Player.cpp` 632-637 (eye from collider centre).
- `RenderCamera::init`: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Rendering/RenderCamera.cpp` 18-58 (view matrix, zoom from FOV, frustum); read in full.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Turn = raw input x sensitivity x 100 (degrees) | Sensitivity option default 2.5, range 0.50-12.0 (options-default.txt:77; Options.h:81-82); x100 (Game.cpp:882-884) |
| Mouse look normalised by the smaller screen side | min(width, height) (PlayerLogic.cpp:1010-1012); no dt scaling in modern mode |
| Classic keyboard turn scales with dt | turningScale 1.0 on foot, 2/3 swimming (PlayerLogic.cpp:935); with sensitivity 2.5 this is 250 degrees per second on foot (derived: 1.0 x 100 x 2.5) |
| Pitch clamp | Pitch limit option default 90 degrees, range 0-90 (options-default.txt:84; Options.h:85-86) |
| Yaw wrap | fmod 360 (Player.cpp:522) |
| Eye offset above collider centre | (EyeHeight 60 - TopOfHeadHeight 61 / 2) / ARENA_UNITS 128 = 29.5/128, about 0.2305 (Player.h:29-31; ArenaPlayerUtils.h:15; MIFUtils.h:23) |
| Vertical FOV and zoom | VerticalFOV default 60, range 40-120 (options-default.txt:29; Options.h:69-70); zoom = 1 / tan(fov/2) (MathUtils.cpp:68) |
| Collider radius (wall stop) | 0.20 world units (Player.h:33) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (turn and pitch clamp before the physics step, eye from the collider centre after it). It wraps yaw in one expression instead of fmod plus add. It deviates in one place: it adds classic keyboard turn and modern mouse look in the same frame when a caller passes both, whereas the donor uses one branch per interface mode (PlayerLogic.cpp:926 classic, 997 modern) and never both. It omits classic edge-of-screen turning (cursor regions), ghost mode, the climbing states, the setDirectionToHorizon reset on mode switch, the render-pass re-init after a scene change, the FOV and zoom maths (the sketch does not render), and the donor's frustum. It adds no smoothing, because the donor has none.

```ts
// Licence: MIT (donor, OpenTESArena LICENSE.txt). Clean-room sketch of the update order and the look rules; not a line-by-line copy.
// Client-only: nothing here touches the engine's health, hits or spawns.
type Vec3 = { x: number; y: number; z: number };

interface Settings {
  sensitivityH: number;   // options default 2.5, range 0.5..12
  sensitivityV: number;   // options default 2.5, range 0.5..12
  pitchLimitDeg: number;  // options default 90, range 0..90
  invertV: boolean;       // options default false
}

interface Rig {
  yawDeg: number;         // unclamped in degrees, wrapped to [0, 360)
  pitchDeg: number;       // clamped to +/- pitchLimitDeg
}

const DEG_PER_OPTION_UNIT = 100;                 // donor multiplies option values by 100
const EYE_OFFSET_UNITS = (60 - 61 * 0.5) / 128;  // eye = collider centre + (EyeHeight - TopOfHead/2) / ARENA_UNITS

// Per-frame turn from a mouse delta in pixels. Divided by the smaller screen side so look speed is the same at any aspect ratio.
function mouseLookDeltaDeg(dxPx: number, dyPx: number, screenW: number, screenH: number, s: Settings): { dYaw: number; dPitch: number } {
  const minSide = Math.min(screenW, screenH);
  const dxPercent = dxPx / minSide;
  const dyPercent = dyPx / minSide;
  const vSign = s.invertV ? -1 : 1;
  return {
    dYaw: -dxPercent * (DEG_PER_OPTION_UNIT * s.sensitivityH),
    dPitch: -dyPercent * (DEG_PER_OPTION_UNIT * s.sensitivityV) * vSign,
  };
}

// Keyboard turn (classic mode). turningScale is 1.0 on foot and 2/3 when swimming; dt is seconds.
function keyboardYawDeltaDeg(turnLeft: boolean, turnRight: boolean, swimming: boolean, dtSec: number, s: Settings): number {
  const turningScale = swimming ? 2 / 3 : 1.0;
  const sign = turnLeft ? 1 : turnRight ? -1 : 0;
  return sign * turningScale * dtSec * (DEG_PER_OPTION_UNIT * s.sensitivityH);
}

// Apply turn, clamped pitch and wrapped yaw to the rig. Called BEFORE the physics step.
function applyTurn(rig: Rig, dYaw: number, dPitch: number, s: Settings): void {
  const limit = Math.min(Math.max(s.pitchLimitDeg, 0), 90);
  rig.yawDeg = ((rig.yawDeg + dYaw) % 360 + 360) % 360;
  rig.pitchDeg = Math.min(Math.max(rig.pitchDeg + dPitch, -limit), limit);
}

// Camera eye, derived from the collider centre AFTER this tick's physics step (no smoothing, no lag).
function eyeFromCentre(centreAfterPhysics: Vec3): Vec3 {
  return { x: centreAfterPhysics.x, y: centreAfterPhysics.y + EYE_OFFSET_UNITS, z: centreAfterPhysics.z };
}

// One frame in donor order: turn, then physics, then camera eye.
function tickCameraFrame(
  rig: Rig,
  s: Settings,
  look: { dxPx: number; dyPx: number },
  keyboard: { left: boolean; right: boolean; swimming: boolean },
  dtSec: number,
  screenW: number,
  screenH: number,
  stepPhysics: () => Vec3,   // returns the collider centre after the physics step
): { eye: Vec3; yawDeg: number; pitchDeg: number } {
  const mouse = mouseLookDeltaDeg(look.dxPx, look.dyPx, screenW, screenH, s);
  const keyYaw = keyboardYawDeltaDeg(keyboard.left, keyboard.right, keyboard.swimming, dtSec, s);
  applyTurn(rig, mouse.dYaw + keyYaw, mouse.dPitch, s);
  const centre = stepPhysics();
  return { eye: eyeFromCentre(centre), yawDeg: rig.yawDeg, pitchDeg: rig.pitchDeg };
}
```

## 5. Lands in

- TARGET `src/fight/camera.ts` (client-only world camera module, proposed name; the camera is client-only, so it does not enter the engine). The Frankendom repo was not read, so whether this file exists is not verified.
- Parity-checklist row 11 (fight camera). The donor's turn-then-physics-then-eye order is the client side of the server tick sub-line in row 18 / post-K item 3, but the camera itself never sends or receives server state, so row 11 is the only row cited.
- Reuse tag: adaptable (MIT; code may be adapted, keep the licence notice; the sketch is written from the mechanism)
- Brief rule served: 1 (one engine: the camera reads post-physics state and never changes outcomes); camera is client-only, so rules 7-9 n/a

## 6. Gaps and risks

- No third-person camera. The donor has no shoulder offset, no collision pull-in for the camera, no lock-on, no framing for several enemies, no combat FOV or zoom pulse, no shake and no recentring. The owner's complaint about the over-the-shoulder view is not answered by this donor; it gives only the update order and the look rules.
- The eye sits inside the collider. Walls stop the character (collider radius 0.20, Player.h:33), not the camera. A third-person camera needs its own pull-in ray cast, which is not in the donor.
- Modern mouse look is per frame and not scaled by `dt` (PlayerLogic.cpp:1014); classic keyboard turn is scaled by `dt` (PlayerLogic.cpp:989). Frankendom should pick one rule and test the feel under frame drops.
- Pitch limit defaults to 90 degrees (options-default.txt:84). For a world camera the limit should be a data field with a tighter default; the donor does not argue for either.
- The camera is read after physics, which is correct for a single-player client. Frankendom's clients act on server-verified state; the donor has no prediction or reconciliation, so the camera must follow the authoritative position for that tick, not a predicted one, or it will judder.
- The eye offset of about 0.23 units is a first-person value tied to the donor's character height. A third-person rig needs its own offset and must not reuse this one.
- Only the camera path was read. Jolt's character settings, `getInputAccelerationModern`, `FrameTimer` and the second half of `Player::accelerate` were not read, so any claim about slopes, stepping or the exact frame timing is unverified.

Reuse tag: adaptable (MIT; code may be adapted, keep the licence notice)
Brief rule served: 1 (one engine; camera is client-only and never changes outcomes)
