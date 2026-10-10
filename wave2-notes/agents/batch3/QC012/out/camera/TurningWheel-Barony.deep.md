# TurningWheel-Barony (camera, cell 14)

Donor: `/mnt/frankendom-donors/TurningWheel-Barony/src/actplayer.cpp` | Licence: BSD 2-Clause (`/mnt/frankendom-donors/TurningWheel-Barony/LICENSE.txt` line 3: "licensed under the BSD 2-Clause License:"; the donor's ImGui and other bundled libraries are separate MIT/other licences and are not used here) | C++ | symbol `Player::PlayerMovement_t::handlePlayerCameraPosition` (with `TimerExperiments::updateClocks` and `TimerExperiments::renderCameras` in `src/game.cpp`)

Checked: camera_scope world camera (the living player's first-person follow camera, plus the spirit/ghost camera that can pull back to third person). Read in full: the logic step and accumulator (`game.cpp` 4129-4139, 5309-5313, 578-700), the render blend and view read (`game.cpp` 385-455), the living-player camera (`actplayer.cpp` 4882-5034), the ghost camera setter and pull-back (`actplayer.cpp` 2212, 2473-2580), the shake step and view apply (`game.cpp` 1038-1090, 6810-6822), and the hit that adds shake (`actgeneral.cpp` 6107). Partly read: the bob branches (`actplayer.cpp` 4048-4270: the land and swim clamps and the reset are read; the per-step accel branches at 4075-4111 are only sampled), the spawn-animation percent (2346-2372, read but not traced frame by frame), the race and effect eye offsets (read as the lines in 4919-4974, not each race's behaviour). Not read: `updateEntityInterpolationPosition`'s caller list, the `resetMovement` condition (`game.cpp` 7895-7897), and the drunkenness sway (`cosspin`, `sinspin`). Confidence: high on the living camera's order of steps and numbers, the render loop and the shake; medium on the ghost pull-back's trigger (I read the setter and the percent, not the spirit-sprite branch in full). Collision: grep for raycast, clip, wall and collision in the camera ranges found no pull-in; the only `clipMove` calls (`actplayer.cpp` 2634, 2730) move the ghost body.

## 1. Mechanism

- Two clocks. The logic clock is fixed at 50 ticks per second (`src/game.hpp` 389). Each rendered frame adds its time to a counter and runs one logic step per 20 ms, with at most 5 steps per frame (`src/game.cpp` 4129-4139). Each step calls `gameLogic` (5309-5313), which dispatches every entity's behaviour (1282).
- Living player (default settings). `handlePlayerCameraPosition` is called from `actPlayer` at `actplayer.cpp` 14687, when `usecamerasmoothing` is false (14685). The `actPlayer` header is at 6144 and no column-0 function header appears between them (a column-0 scan, not a full parse). Each step it does, in order:
  1. x and y: the camera velocity is set to lerpFactor times the error between the body position (`my->x / 16`) and the camera position (4915). lerpFactor is 30 by default (`game.cpp` 292, cvar `/cameralerp` at 622).
  2. Eye height z: the setpoint is `my->z * 2 - 2.5`, plus 1 when swimming (4919). Race offsets follow (4920-4966), then minimise and maximise (`EFF_MINIMISE`, `EFF_MAXIMISE`, 0.4 per level, 4967-4974).
  3. If the eye is more than 0.01 from the setpoint, and the body is not hovering, it moves toward the setpoint by `clamp(0.5 x error, 0.3, 2.0) x refreshRateDelta` (4979), never overshooting (4983-4990). While moving, the velocity aims at the eye alone, with no bob (4998-4999).
  4. When the eye is within 0.01 of the setpoint, the else branch sets it to the setpoint (5013) and aims at the eye plus bob (5021). In the moving branch, the bob is reset on arrival (5004-5008).
- Bob: each step `PLAYER_BOB += PLAYER_BOBMOVE` (4258). Land clamps the move to ±0.1 (4221, 4247). Swim clamps it to ±0.3 (4234, 4239). The walk accel is ±0.0125 per step (4097, 4101), and ±0.025 in another mode branch (4108, 4112); the conditions for those branches were only sampled. When not moving the bob resets to zero (4118-4126). The bob is held out of the eye target while the eye is still moving (step 3 above).
- Yaw and pitch. In interpolation mode `handlePlayerCameraPosition` does not aim yaw or pitch. The view reads the body's render interpolation: `camera.ang = entity->lerpRenderState.yaw` (`game.cpp` 440), and the body's yaw velocity is lerpFactor times the error (`game.cpp` 348 for x; yaw at 360, pitch at 371, same pattern). Z is the camera render state (443).
- Render side (`TimerExperiments::updateClocks`, `game.cpp` 578). Frame time is clamped by a cvar (606, 631) and added to the accumulator (635). While the accumulator holds at least one step of 1/60 s, the camera and body states are copied to "previous", integrated at 1/60 s (`integrate`, 300), and the accumulator is reduced by one step (658-681). The rest is `alpha = accumulator / dt` (684), and the render state is the blend of previous and current by alpha (687).
- Auto lerp (`game.cpp` 625, 640-644): when the measured frame rate is below 32, lerpFactor becomes `max(1, fps - 2)`; otherwise it is 30.
- Ghost (spirit) camera, `actDeathGhost` (`actplayer.cpp` 2212; camera block 2473-2570). It aims the camera at the ghost body (2484-2486) and writes yaw and pitch velocities at 2559 and 2569. The third-person pull-back is on when the cvar `/ghost_thirdperson` is set, or a spawn animation plays, or the percent is above 0.01 (2521). The camera is pulled back along yaw and pitch by `1.5` (x: 2528, y: 2529), and lowered by `sin(pitch) x 16` (2530). The pull-back `dist` is 1.0 unless the spawn animation or the percent is active, in which case `dist = cos((1 - p) x PI/2)` (2526), so it eases in as p goes from 0 to 1. The spawn animation sets p to 1 and then ramps it down (2366-2369). The ghost's camera z is capped at 8 while the spirit sprite is shown and the third-person percent is above 0.01 (2503).
- Shake. One source adds 0.1 to the yaw jolt and 10 to the pitch jolt (`actgeneral.cpp` 6107-6108; the context of that source was not read). Each logic step (inside `gameLogic`, 1038-1090): the yaw jolt is capped at shake_max / 100 and the pitch jolt at shake_max, default 15 (1044-1046). The yaw jolt is low-passed as `x2 = (x2 + x) x 0.8` (1048), the pitch jolt as `y2 = (y2 + y) x 0.9` (1049). The raw yaw jolt decays by 0.01 per step toward zero (1059) and the raw pitch jolt by 1 (1076). At render the view yaw has `x2` subtracted and the view pitch has `y2 / 200` subtracted (`game.cpp` 6817-6818).

## 2. Key functions

- `Player::PlayerMovement_t::handlePlayerCameraPosition`: `/mnt/frankendom-donors/TurningWheel-Barony/src/actplayer.cpp` 4882-5034. Steps 1-4 above. Called only when `usecamerasmoothing` is false (14685-14687); the other call site is in `drawAllPlayerCameras` (`game.cpp` 6612-6619) and runs only when the console command `/usecamerasmoothing` has turned the flag on (`src/interface/consolecommand.cpp` 3562). Default is off (`actplayer.cpp` 38).
- `TimerExperiments::updateClocks`: `/mnt/frankendom-donors/TurningWheel-Barony/src/game.cpp` 578-700. Accumulator, fixed 1/60 s integration and alpha blend.
- `TimerExperiments::renderCameras`: `/mnt/frankendom-donors/TurningWheel-Barony/src/game.cpp` 385-455 (the live code; the return at 455 is followed by commented-out code to the closing brace at 491). Which state the view reads: body render state for x, y, yaw, pitch; camera render state for z; debug paths aside.
- `Player::Ghost_t` ghost camera, inside `actDeathGhost`: `/mnt/frankendom-donors/TurningWheel-Barony/src/actplayer.cpp` 2473-2570. Pull-back at 2515-2530.
- Shake step, inside `gameLogic`: `/mnt/frankendom-donors/TurningWheel-Barony/src/game.cpp` 1038-1090. View apply: 6810-6822, in `drawAllPlayerCameras` (6550).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Fixed logic step, capped steps per frame | 50 ticks per second (`game.hpp` 389), 20 ms step (`game.cpp` 4129), at most 5 steps per frame (4136, 4139) |
| Camera lag: aim velocity = gain x error, integrate at a fixed render step, blend by alpha | gain 30 per second (`game.cpp` 292), auto gain `max(1, fps - 2)` below 32 fps (642-644); render step 1/60 s (285); integrate 300; blend 687 |
| Eye height toward a setpoint, rate-limited, never overshoot, snap within 0.01 | setpoint `z*2 - 2.5`, swim +1 (`actplayer.cpp` 4919); rate `clamp(0.5 x error, 0.3, 2.0)` (4979); snap 0.01 (5004) |
| Bob added only once the eye has settled | move clamp ±0.1 land (4221), ±0.3 swim (4234, 4239); accel ±0.0125 (4097, 4101) and ±0.025 (4108, 4112); bob integrated per step (4258) |
| Third-person pull-back along the view, eased in, with height drop | back 1.5 (2528-2529), drop `sin(pitch) x 16` (2530), ease `cos((1 - p) x PI/2)` (2526), p from spawn anim (2366-2369) |
| Hit shake: cap, low-pass, decay, apply offset | cap shake_max 15 (`game.cpp` 1044), low-pass 0.8 / 0.9 (1048-1049), decay 0.01 / 1 per step (1059, 1076), one source adds 0.1 / 10 (`actgeneral.cpp` 6107-6108), pitch divisor 200 (`game.cpp` 6818) |
| Ghost pitch limit | ±PI/3 (`actplayer.cpp` 2061) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: logic-step aim, fixed 1/60 s integration with an accumulator and alpha blend, rate-limited eye height with bob held until settled, shake low-pass and decay, and the ghost pull-back. It omits the race offsets, the minimise and maximise offsets, the hover gate, the race offsets (including the swimming rat and spider rule), the bob accel branches (the sketch takes bob as input), the shake zeroing branch for small values, and the donor's `lerpAngle` (the sketch blends yaw and pitch linearly). It does not model the body's own render interpolation, which the donor uses for yaw and pitch. The pull-back is shown with no wall test, as the donor has none.

```ts
// Licence: BSD-2-Clause (donor, Turning Wheel LLC). Clean-room sketch of the mechanism; not a translation of the donor lines.
// clean-room
const LOGIC_HZ = 50;            // logic ticks per second (donor: TICKS_PER_SECOND)
const STEP = 1 / 60;            // render-side integration step in seconds (donor: TimerExperiments::dt)
const TWO_PI = 2 * Math.PI;

interface Axis { pos: number; vel: number; }
interface Pose { x: Axis; y: Axis; z: Axis; yaw: Axis; pitch: Axis; }
interface Target { x: number; y: number; z: number; yaw: number; pitch: number; }

function wrapPi(a: number): number {
  let d = a;
  if (d >= Math.PI) d -= TWO_PI;
  else if (d < -Math.PI) d += TWO_PI;
  return d;
}

// Logic tick (LOGIC_HZ): aim each axis at its target. Velocity = gain * error, so the
// render step closes the gap at a rate set by gain (first-order lag). Yaw/pitch use the shortest turn.
function aim(pose: Pose, t: Target, gain: number): void {
  pose.x.vel = gain * (t.x - pose.x.pos);
  pose.y.vel = gain * (t.y - pose.y.pos);
  pose.z.vel = gain * (t.z - pose.z.pos);
  pose.yaw.vel = gain * wrapPi(t.yaw - pose.yaw.pos);
  pose.pitch.vel = gain * wrapPi(t.pitch - pose.pitch.pos);
}

// Auto gain, as the donor does per frame: 30 normally; below 32 fps it drops to max(1, fps - 2).
function autoGain(fps: number): number {
  return fps < 32 ? Math.max(1, Math.trunc(fps) - 2) : 30;
}

function clonePose(p: Pose): Pose {
  return {
    x: { ...p.x }, y: { ...p.y }, z: { ...p.z }, yaw: { ...p.yaw }, pitch: { ...p.pitch },
  };
}

function integrate(p: Pose, dt: number): void {
  for (const a of [p.x, p.y, p.z, p.yaw, p.pitch]) a.pos += a.vel * dt;
}

interface Clock { acc: number; prev: Pose; cur: Pose; }

// Render frame: add frame time, integrate in fixed STEPs while acc >= STEP, then blend prev/cur by alpha.
// The donor blends yaw/pitch with lerpAngle; this sketch blends linearly (simplified).
function renderFrame(c: Clock, frameSeconds: number): { alpha: number; shown: Pose } {
  c.acc += frameSeconds;
  while (c.acc >= STEP) {
    c.prev = clonePose(c.cur);
    integrate(c.cur, STEP);
    c.acc -= STEP;
  }
  const alpha = c.acc / STEP;
  const mix = (a: Axis, b: Axis): Axis => ({ pos: b.pos * alpha + a.pos * (1 - alpha), vel: b.vel });
  const shown: Pose = {
    x: mix(c.prev.x, c.cur.x), y: mix(c.prev.y, c.cur.y), z: mix(c.prev.z, c.cur.z),
    yaw: mix(c.prev.yaw, c.cur.yaw), pitch: mix(c.prev.pitch, c.cur.pitch),
  };
  return { alpha, shown };
}

// Eye height. The setpoint is the body height scaled, minus a fixed eye offset; swimming adds 1.
// (Race and effect offsets in the donor are omitted here.)
function eyeSetpoint(bodyZ: number, swimming: boolean): number {
  return bodyZ * 2 - 2.5 + (swimming ? 1 : 0);
}

interface ZState { accel: number; bob: number; }

// Moves the rate-limited eye height toward the setpoint: step = clamp(0.5 * error, 0.3, 2.0) per tick,
// never overshooting; within 0.01 it snaps. Returns true while still moving.
function stepEyeZ(s: ZState, setpoint: number, refreshDelta: number): boolean {
  const diff = Math.abs(s.accel - setpoint);
  if (diff > 0.01) {
    const rate = Math.min(2.0, Math.max(0.3, diff * 0.5)) * refreshDelta;
    s.accel = setpoint >= 0 ? Math.min(setpoint, s.accel + rate) : Math.max(setpoint, s.accel - rate);
    return true;
  }
  s.accel = setpoint;
  return false;
}

// Bob is added to the eye height only once the eye has settled (the donor's moving branch omits it).
function eyeZTarget(s: ZState, moving: boolean): number {
  return moving ? s.accel : s.accel + s.bob;
}

interface Shake {
  x: number; y: number;     // yaw jolt and pitch jolt (donor: shakex, shakey)
  x2: number; y2: number;   // smoothed copies used for the view (donor: shakex2, shakey2)
}

// Per logic tick. Caps the jolt, low-passes it into x2/y2, then decays the raw jolt toward zero.
// (The donor also zeroes small values; that branch is omitted.)
function shakeTick(s: Shake, shakeMax: number): void {
  s.x = Math.min(s.x, shakeMax / 100);
  s.y = Math.min(s.y, shakeMax);
  s.x2 = (s.x2 + s.x) * 0.8;
  s.y2 = (s.y2 + s.y) * 0.9;
  if (s.x2 > 0) s.x -= 0.01;
  else if (s.x2 < 0) s.x += 0.01;
  if (s.y2 > 0) s.y -= 1;
  else if (s.y2 < 0) s.y += 1;
}

// View applied after the pose: yaw minus x2, pitch minus y2 / 200.
function applyShake(yaw: number, pitch: number, s: Shake): { yaw: number; pitch: number } {
  return { yaw: yaw - s.x2, pitch: pitch - s.y2 / 200 };
}

// Third-person pull-back (spirit/ghost camera only in the donor). When active, the camera moves back
// 1.5 map units along the view yaw/pitch and drops by sin(pitch) * 16 z units. Eased in by p (0..1).
// No wall test: the donor applies this offset without collision (see note).
function thirdPersonOffset(active: boolean, p: number, yaw: number, pitch: number,
                           x: number, y: number, z: number): { x: number; y: number; z: number } {
  if (!active) return { x, y, z };
  const dist = p > 0.01 ? Math.cos((1 - p) * Math.PI / 2) : 1.0;
  return {
    x: x - dist * Math.cos(yaw) * Math.cos(pitch) * 1.5,
    y: y - dist * Math.sin(yaw) * Math.cos(pitch) * 1.5,
    z: z - dist * Math.sin(pitch) * 16,
  };
}

export {};
```

## 5. Lands in

- TARGET `src/fight/camera.ts` (proposed new client-only module: one world-camera step, with the view read by the renderer). The brief asks for a `src/fight/<module>.ts` name; the Frankendom repo is not read here, so this is a proposal.
- Parity-checklist row 11 (fight camera). This is the nearest row. The world camera is not the Pit fight camera, so the row is a proxy and the lane should confirm it.
- Reuse tag: adapt-allowed (BSD-2-Clause, so code may be adapted with attribution; this sketch is clean-room, written from the described mechanism)
- Brief rule served: camera is client-only (the engine never reads it); rule 1 (one engine) and rule 9 (Pit as client) are not changed by this camera step.

Best transferable idea: aim each camera axis at its target at the logic step (velocity = gain x error), integrate at a fixed render step, blend by alpha, rate-limit the eye height to a setpoint with the bob held until it settles, and add a view-direction pull-back for a third-person camera.
Decision (proposed): adapt - take the fixed-step aim and render blend, the rate-limited eye setpoint and the view-direction pull-back shape for the world camera; change it to add a wall pull-in (the donor has none), move the pull-back distance and drop into per-zone client data, and keep the first-person eye as the default with the over-the-shoulder offset as an option. Why: the donor's living camera is first-person, and its only third-person mode is the ghost camera with no collision, so the shape transfers but the collision and the framing do not.
Acceptance: in a zone the camera height eases over a fraction of a second on a step with no snap, the view pulls in when a wall is behind the character and never clips, and a headless test asserts the camera converges to its target within N render steps with bob at zero while the eye height is moving.

## 6. Gaps and risks

- The camera is client-only. Nothing in this camera step may feed a hit test, a kill, a target lock or the ledger; kills stay server-verified.
- No collision pull-in in the donor. The ghost pull-back (2526-2530) is applied with no wall test, so a third-person camera in Frankendom needs its own ray test and pull-in before the offset is applied. This is the largest gap against the owner's over-the-shoulder concern.
- No lock-on, no many-enemy framing and no combat FOV or zoom change were found in the camera code read (`game.cpp` 6550-6822 has a `fov` swap at 6822 but its use was not traced). For MAX_ATTACKERS = 3 the framing has to be designed, not ported.
- Designer data versus engine constants: pull-back distance and drop are the values a zone designer would tune (zone data). The lerp gain, the eye offset, the shake caps and the step size are client engine constants. The donor keeps all of them as constants or cvars; Frankendom should not copy the cvars as zone data.
- Frame-rate dependence: several donor constants are per step (0.01 shake decay, the ±0.0125 bob accel, the bob clamps). Frankendom should keep them per fixed step, not per frame. The donor's render-rate branch (`game.cpp` 6612) multiplies by a refresh delta, which is a second timing path to avoid.
- Two writers: the ghost yaw velocity is written in `handleGhostCameraUpdate` (2096) and again in the camera block (2559) in the same step. Frankendom should have one writer per axis.
- Pit camera: the Pit camera is frozen and tuned. This world camera module must not touch the Pit camera path.
- Not read: the bob accel branches in full, the spawn-animation timing, the per-race behaviour behind the race offsets, `updateEntityInterpolationPosition`'s callers, the `resetMovement` condition (7895-7897), the per-race behaviour behind the race offsets, and the drunkenness sway. Any value from those is unverified.
