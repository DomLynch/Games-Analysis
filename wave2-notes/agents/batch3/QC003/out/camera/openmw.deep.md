# openmw (camera, cell 14)

Donor: `/mnt/frankendom-donors/openmw/apps/openmw/mwrender/camera.cpp` (`Camera::updatePosition`, `Camera::updateFocalPointOffset`; policy in `/mnt/frankendom-donors/openmw/files/data/scripts/omw/camera/third_person.lua` and `/mnt/frankendom-donors/openmw/files/data/scripts/omw/camera/camera.lua`) | Licence: GPL-3.0 (the `LICENSE` file is "GNU GENERAL PUBLIC LICENSE, Version 3, 29 June 2007"; no per-file header read) | C++ and Lua | symbol `Camera::updatePosition`

Checked: camera_scope: world camera. `camera.cpp` read in full (1-454). `third_person.lua` read in full (1-164). `camera.lua` read 1-260 (the interface table after 260 not read). `camera.hpp` read at the member block (120-177) and the Mode enum (29-35); lines 60-120 not read. `settings.lua` read at the defaults (43-48) and the update block (78-84) only. Callers checked: `setFocalPointTargetOffset` has one caller under `apps/` and `components/`, the Lua binding `setFocalPreferredOffset` at `camerabindings.cpp` 84; `Camera::update` is reached from `worldimp.cpp` 1587 (`mRendering->update(duration, paused)`), and the renderer's own call into `Camera::update` was not read. The list's hint file `character.cpp` is the wrong file: its only camera-related hit is a death-camera call (line 877). Confidence: high on the per-frame order, the shoulder rules and the numbers; medium on the exact carry-over maths (the donor keeps an extra-offset accumulator that this note does not trace line by line) and on the pitch sign convention (not derived). Not read: `move360`, `head_bobbing`, `first_person_auto_switch`, the vanity and preview interface details after `camera.lua` 260.

## 1. Mechanism

- A third-person follow camera with an over-the-shoulder offset. The character's tracked point is the anchor. A focal point is placed at `tracked + offset`, where the offset is the focal-offset vector (x = lateral, y = vertical) rotated by yaw (`camera.cpp` 102-107). The camera sits behind the focal point at a distance, and it looks at the focal point. So the character is framed off-centre, not in the middle.
- Each frame, in order:
  1. Lua `onUpdate(dt)` (`camera.lua` 188-199) resets the extra pitch, yaw and roll and the first-person offset, then updates the smoothed speed (130-135): raw speed is soft-capped as `speed / (1 + speed/500)` (132), then moves toward that value by at most `300 * dt` (133-134).
  2. Lua `onFrame(dt)` (211-244) handles POV toggling, vanity, standing preview and zoom input (`Zoom3rdPerson`), then calls `third_person.update(dt, smoothedSpeed)` (236).
  3. `third_person.update` (129-162): if `viewOverShoulder` is off, the focal offset is set to zero once and the distance is the base distance (136-143). If it is on, `updateState()` runs (146-150): combat stance selects the combat state (89-90) and a stance change selects the transition speed (110-117: vanity 0.2, combat 5.0, otherwise 1.0). If the state is a shoulder, `trySwitchShoulder` runs (98-105): four side rays from the tracked point at yaw plus or minus 90 and plus or minus 30 degrees (63-66), each ray a free length capped at 300 (limit + 1). The left side is blocked if the nearer of its two rays is under 120 (68-71). Right shoulder is picked when the left is blocked and the right is clear beyond 300 (71-72); left is picked the other way (73-74); with both clear the default is used (75-76). When the state changes (106-126), the focal offset target is set to `(+30, -10)` for right, `(-30, -10)` for left, or `(0, 15)` for combat (119-125, from the settings defaults in `settings.lua` 45-46).
  4. `calculateDistance` (80-84): `base + max(pitch, 0) * 50 + s^2 / (s^2 + 300^2) * zoomOutCoef`, where `s` is the smoothed speed. The base is 192 (`third_person.lua` 16); the zoom-out coefficient is 20 by default (`settings.lua` 48). The distance then changes by `min(wanted, current + dt * (100 + base))` (158-160): it drops at once and rises by at most `dt * (100 + base)` per frame.
  5. Lua zoom input (`camera.lua` 139-160): with `Zoom3rdPerson` the base distance moves by the input, clamped between 30 (137) and `maxDistance` (default 800, `settings.lua` 43). Zooming in past 30 switches to first person (147-150).
  6. C++ `Camera::update(duration, paused)` (132): when not paused, `updateFocalPointOffset(duration)` (145) moves the current focal offset toward the target. A new target keeps the last velocity and lets it fade (`setFocalPointTargetOffset` at 247-251 sets the carry-over influence to 1; 269-275 decays it by `duration * speedCoef`). The step is `coef = duration * (1 + 5/len) * speedCoef * (1 - influence)` (283), applied as `delta * min(coef, 1)` (285): targets that are close move a larger fraction per second, and the step never overshoots. A zero duration does nothing (256). When the instant-transition flag is set (set at 425, read at 259-264), the next update snaps to the target instead of easing.
  7. `updatePosition()` (160-208): the tracked point is the node position plus `mHeight * heightScale` (97; `mHeight` 124 at 63). The focal point is `tracked + offset` (179). A sphere of radius 10 is cast from the character side to the focal point (186); if it hits, the offset is shortened so the focal point stops in front of the hit (189-191). The camera distance starts at the preferred distance (196), the backward offset is `orient * (0, -distance, 0)` (199), and a sphere of radius 5 is cast from the focal point to the camera (201); if it hits, the distance is set to the hit point plus the normal times 5 (204) and the camera is moved onto that line (208).
- Pitch is clamped to just under 90 degrees (`setPitch` 323-326). The Lua `getPitch` and `getYaw` return the negation of the internal values (`camerabindings.cpp` 50-51), so the sign of "looking down" in the Lua numbers was not checked.
- Deferred rotation: after leaving preview or vanity, the character is turned toward the view with a rate that eases with `dt` (`applyDeferredPreviewRotationToPlayer`, line 389: `min(delta, (delta + 1) * 3 * dt)`). `instantTransition` sets the snap flag at 425 and clears the deferred rotation.
- Vanity: after the idle delay, the yaw drifts at 3 degrees per second times `dt` (`camera.lua` 125).

## 2. Key functions

- `Camera::update`: `/mnt/frankendom-donors/openmw/apps/openmw/mwrender/camera.cpp` 132-146. Frame entry point. Calls the focal transition, then `updatePosition`.
- `Camera::updateFocalPointOffset`: `camera.cpp` 254-294. Eases the focal offset toward its target with the carry-over and the closer-faster rule.
- `Camera::updatePosition`: `camera.cpp` 160-209. Focal point, focal sphere pull-back, distance and camera sphere pull-in.
- `third_person.update`: `/mnt/frankendom-donors/openmw/files/data/scripts/omw/camera/third_person.lua` 129-162. Preferred distance and shoulder state per frame.
- `trySwitchShoulder`: `third_person.lua` 58-78. Four side rays and the switch thresholds.
- `calculateDistance`: `third_person.lua` 80-84. Base, pitch term and speed term.
- `onFrame` and `onUpdate`: `/mnt/frankendom-donors/openmw/files/data/scripts/omw/camera/camera.lua` 211-244 and 188-199. Frame order and smoothed speed.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants (units: map units unless stated) |
|---|---|
| Over-the-shoulder focal offset, right and left | Offset x = plus or minus 30, y = -10 (`settings.lua` 45-46 defaults; applied at `third_person.lua` 39-40 with the sign from the setting at 38) |
| Combat focal offset (centred, raised) | (0, 15) (`third_person.lua` 27, applied 124) |
| Shoulder switch thresholds | Switch when the nearer side ray is under 120 and the other side is clear beyond 300 (`third_person.lua` 59-60, 71-74); side rays at plus or minus 90 and 30 degrees (63-66); each ray capped at 301 |
| Focal transition speed | 1.0 default (`third_person.lua` 116), 5.0 when entering or leaving combat (114), 0.2 in vanity (110) |
| Closer target moves faster | Factor 1 + 5/len (`camera.cpp` 283); step capped at reaching the target (285) |
| Carry-over of an unfinished transition | Influence starts at 1 (251) and decays by `duration * speedCoef` (275) |
| Focal point stays off geometry | Sphere radius 10 (`camera.cpp` 173); lifted 10 for ceiling clips (180) |
| Camera stays off geometry | Sphere radius 5 (`camera.cpp` 172); pulled to the hit point (204) |
| Tracked height | 124 (`camera.cpp` 63), times the node scale |
| Base distance | 192 (`third_person.lua` 16); minimum 30 (`camera.lua` 137); maximum 800 (`settings.lua` 43) |
| Pitch term | 50 per radian of positive pitch (`third_person.lua` 82) |
| Speed zoom-out | Coefficient 20 (`settings.lua` 48) times s^2/(s^2 + 300^2) (`third_person.lua` 83) |
| Speed soft cap | Divisor 500 (`camera.lua` 132); approach at most 300 per second (133) |
| Distance rise rate | `dt * (100 + base)` per frame (`third_person.lua` 158) |
| Vanity yaw drift | 3 degrees per second (`camera.lua` 125) |

## 4. TypeScript sketch

simplified: the donor keeps an extra-offset accumulator for the carry-over (`camera.cpp` 254-294); the sketch uses one decaying velocity. The focal-point pull-back in the donor scales the offset back by a ratio (189-191); the sketch sets the focal point to the safe point in front of the hit. The donor casts the focal sphere from 10 units below the tracked point; the sketch casts from the tracked point. The pitch sign convention and the quaternion order are the sketch's own (the donor's were not re-derived). The Lua `getPitch` is taken as radians. The sketch omits the first-person path, the deferred rotation, the vanity drift, the POV toggle, the standing preview, the move360 and head-bob code, the combat-stance detection, and the input zoom.

```ts
// Licence: GPL-3.0 (openmw LICENSE file, version 3). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
// camera_scope: world camera
export interface V2 { x: number; y: number; }
export interface V3 { x: number; y: number; z: number; }
export interface Hit { pos: V3; normal: V3; }
export interface World { sphereCast(a: V3, b: V3, radius: number): Hit | null; }

export type Shoulder = "right" | "left";

// Shoulder choice from four side-ray free lengths (donor: third_person.lua trySwitchShoulder, limits 120 and 300).
export function pickShoulder(leftFree: number, rightFree: number, dflt: Shoulder, switchAt = 120, switchBackAt = 300): Shoulder {
  if (leftFree < switchAt && rightFree > switchBackAt) return "right";
  if (rightFree < switchAt && leftFree > switchBackAt) return "left";
  return dflt;
}

// Focal offset transition: x = lateral (+ = right of the character), y = vertical. Speed comes from the mode (donor 0.2 vanity, 1.0 default, 5.0 combat).
export interface Focal { cur: V2; target: V2; speed: number; vel: V2; carry: V2; carryInfl: number; }

// A new target keeps the last velocity and lets it fade out (donor: mPreviousTransitionInfluence = 1).
export function setFocalTarget(f: Focal, t: V2): void {
  f.target = t;
  f.carry = { x: f.vel.x, y: f.vel.y };
  f.carryInfl = 1;
}

// simplified: the donor keeps an extra-offset accumulator; here the carry-over is one decaying velocity. Frame-time dt in seconds.
export function stepFocal(f: Focal, dt: number): void {
  if (dt <= 0) return;
  const before = { x: f.cur.x, y: f.cur.y };
  f.cur.x += f.carry.x * f.carryInfl * dt;
  f.cur.y += f.carry.y * f.carryInfl * dt;
  f.carryInfl = Math.max(0, f.carryInfl - dt * f.speed);
  const dx = f.target.x - f.cur.x;
  const dy = f.target.y - f.cur.y;
  const len = Math.hypot(dx, dy);
  if (len > 0) {
    // closer targets move a larger fraction per second (1 + 5/len), capped at reaching the target
    const k = Math.min(1, dt * (1 + 5 / len) * f.speed * (1 - f.carryInfl));
    f.cur.x += dx * k;
    f.cur.y += dy * k;
  }
  f.vel = { x: (f.cur.x - before.x) / dt, y: (f.cur.y - before.y) / dt };
}

// Camera placement behind the character (donor: camera.cpp updatePosition). Pitch convention is this sketch's own (donor quaternion order not re-derived).
export interface Placed { focal: V3; pos: V3; dist: number; }

function len3(a: V3): number { return Math.hypot(a.x, a.y, a.z); }

export function placeCamera(tracked: V3, f: Focal, yaw: number, pitch: number, preferred: number, world: World): Placed {
  const ox = f.cur.x * Math.cos(yaw);
  const oy = f.cur.x * Math.sin(yaw);
  const oz = f.cur.y;
  let focal: V3 = { x: tracked.x + ox, y: tracked.y + oy, z: tracked.z + oz };
  // focal point stays off geometry: if the line from the character to the focal point hits, stop 10 units in front of the hit
  const hitF = world.sphereCast(tracked, focal, 10);
  if (hitF) {
    focal = { x: hitF.pos.x + hitF.normal.x * 10, y: hitF.pos.y + hitF.normal.y * 10, z: hitF.pos.z + hitF.normal.z * 10 };
  }
  const cp = Math.cos(pitch);
  const back: V3 = { x: Math.sin(yaw) * cp, y: -Math.cos(yaw) * cp, z: -Math.sin(pitch) };
  let dist = preferred;
  const want: V3 = { x: focal.x + back.x * dist, y: focal.y + back.y * dist, z: focal.z + back.z * dist };
  const hitC = world.sphereCast(focal, want, 5);
  if (hitC) {
    const p: V3 = { x: hitC.pos.x + hitC.normal.x * 5, y: hitC.pos.y + hitC.normal.y * 5, z: hitC.pos.z + hitC.normal.z * 5 };
    dist = len3({ x: p.x - focal.x, y: p.y - focal.y, z: p.z - focal.z });
  }
  const pos: V3 = { x: focal.x + back.x * dist, y: focal.y + back.y * dist, z: focal.z + back.z * dist };
  return { focal, pos, dist };
}

// Wanted distance: base + pitch term + speed term (donor: third_person.lua calculateDistance). Speed is the smoothed speed.
export function wantedDistance(base: number, pitch: number, smoothedSpeed: number, zoomOutCoef: number): number {
  const s2 = smoothedSpeed * smoothedSpeed;
  return base + Math.max(pitch, 0) * 50 + (s2 / (s2 + 300 * 300)) * zoomOutCoef;
}

// Distance drops at once; it rises at most dt * (100 + base) per frame (donor: third_person.lua update).
export function stepDistance(cur: number, want: number, dt: number, base: number): number {
  return Math.min(want, cur + dt * (100 + base));
}

// Smoothed speed: soft cap, then approach at most 300 units per second (donor: camera.lua updateSmoothedSpeed).
export function stepSmoothedSpeed(sm: number, speed: number, dt: number): number {
  const soft = speed / (1 + speed / 500);
  const maxDelta = 300 * dt;
  return sm + Math.max(-maxDelta, Math.min(maxDelta, soft - sm));
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (file `/tmp/QC003_openmw_worldcam.ts`) exit 0.

## 5. Lands in

- TARGET `src/fight/camera.ts` (proposed client-only module; this reader did not read the Frankendom file). Holds the world third-person follow only, with no engine state and no server write. The Pit camera stays frozen and is not touched.
- Parity-checklist row 11 (fight camera). No row covers the world camera; row 11 is the nearest.
- today: not read (Frankendom camera location not read by this reader).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 1 (one engine; the camera is client-only, so the engine never reads it); rules 7-9 n/a
- Best transferable idea: an over-the-shoulder focal point that eases between shoulders by side-ray probes, pulls the camera in on a sphere cast, and widens or raises the focal point in combat, all in dt-based steps.
- Decision (proposed): adapt — take the focal-offset shape, the side-ray shoulder switch and the sphere pull-in for the owner's over-the-shoulder ask, but retune the offsets and thresholds for a 375 px phone view and keep the camera client-only; do not copy the Lua policy layer as is.
- Acceptance: at 375 px wide in a zone with a wall on the right within 120 units, the view moves to the left shoulder over about one second, the camera stays off walls in a headless probe test (sphere radius 5), and in combat the focal point rises 15 units and eases over about 0.2 seconds.

## 6. Gaps and risks

- The default in the donor is no over-the-shoulder (`viewOverShoulder` false, `settings.lua` 44). The shoulder view is opt-in in the donor, so Frankendom would make it the default on purpose.
- Frankendom's camera is client-only. The donor is also client-only (rendering and Lua scripts), so placement is not a problem here, unlike the SRB2 donor.
- Engine order between the two Lua callbacks and the C++ `Camera::update` was not read; the note assumes the focal target set by Lua is eased on the following C++ update.
- Frame-rate: all steps are dt-based (`camera.cpp` 283, `third_person.lua` 158, `camera.lua` 133). Frame-rate independence is a feature here, not a risk.
- Donor numbers are in map units (the donor's own scale). Frankendom needs its own unit mapping before the 120, 300 and 30 thresholds mean anything on a phone view.
- Lock-on and many-enemy framing: not in the code read. The combat state only raises the focal point (`third_person.lua` 27, 124). Framing several enemies in a fight is not covered.
- Camera shake, FOV change and hit impact: not searched in this donor.
- The pitch sign and the quaternion order (`camera.cpp` 194-195) were not re-derived; the sketch uses its own convention. Any port must test the look direction.
- The carry-over is the least certain part: the sketch's one-velocity version is a simplification of the donor's accumulator (`camera.cpp` 254-294).
- Zone data: the shoulder thresholds (120 and 300) and the offsets (30, -10) are tuning values. Per-zone values are a sensible guess, not a donor fact: the donor has them as global settings.
