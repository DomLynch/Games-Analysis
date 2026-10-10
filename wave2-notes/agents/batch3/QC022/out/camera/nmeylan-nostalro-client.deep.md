# nmeylan-nostalro-client (camera, cell 14)

Donor: `/mnt/frankendom-donors/nmeylan-nostalro-client/lib/renderer/src/camera.rs` (struct `Camera`, `interpolate`, `eye`, `apply_drag`, `apply_wheel`, `on_map_enter`) with shake in `lib/renderer/src/effect/holder.rs` (`ShakeController`) and `lib/effects/src/table.rs` (`spawn_camera_shake`) | Licence: Apache-2.0 (LICENSE.md line 1 "Apache License", line 2 "Version 2.0, January 2004"; permissive, code may be adapted with the notice kept) | Rust

Checked: camera_scope world camera. Read: `camera.rs` lines 1-470 in full (the struct, constants, bands, input, interpolation, eye, view matrix, projection), and tests at 562-606, 616, 645-664, 735-772, 789-796. Shake: `holder.rs` 42-83 (ShakeController), 336-337, 586-683, 719-721; `table.rs` 932-948. Driver: `client/src/game_updates/movement.rs` 183-208, `client/src/game_updates/mod.rs` 58-66 and 161-163, `client/src/input/mod.rs` 51-61, `client/src/main.rs` 882-892 (frame delta clamp). Not read: `camera.rs` 470-560 (uniform and most test bodies) and 664-735, 773-788, 798-810; the rest of the effect holder; the GAT height loader; `window_events.rs` beyond the three call sites found by grep (130, 418, 438). No runtime FOV change found (the only FOV is the default 15 degrees). Confidence: high on the band numbers and the distance-band arithmetic (replicated in Python from the same formula); high on the shake; medium on the eye floor (the donor's own comment says world Y grows downwards, and the test at 789 agrees).

Best transferable idea: Move the drawn camera by fixed 60 Hz steps (rounded, at most 4 per frame) with a band rule that divides big errors hard, medium errors softly and snaps tiny ones, and shake it with a linearly decaying offset that keeps the larger of the old and new amplitudes.
Decision (proposed): adapt - take the band rule, the ground floor and the shake stacking rule; replace the rounded step count with a 60 Hz accumulator so speed does not depend on frame rate; set the distance big and small divisors to 9 and 4 (the donor's 1.0 pops a wheel notch in one step and its 0.6 rings); do not copy the indoor pitch band, which is inverted (see section 6).
Acceptance: A client test asserts that a 24.3-unit wheel notch takes at least 5 camera steps to arrive (no one-step pop), that a 4-unit distance change converges monotonically within 20 steps with no sign change, and that one simulated second at 60 fps and at 144 fps ends with the camera within 1 percent of the same position; a shake test asserts a ScreenQuake offset of 1.5 units at trigger that decays to zero within 1.667 s.

## 1. Mechanism

- One `Camera` holds a destination (`dest_yaw`, `dest_pitch`, `dest_distance`, `dest_target`) written by input and a current state (`yaw`, `pitch`, `distance`, `target`) that is drawn. Input only writes the destination (`apply_drag` 211-221, `apply_wheel` 238-244, `apply_reset_gesture` 226-236, `set_target` 170-172).
- Per frame (`client/src/game_updates/mod.rs` 63-64): `update_movement` sets the camera target to the player's cell centre, with its ground height (`movement.rs` 183-186; `input/mod.rs` 58-60), then `update_camera` calls `interpolate(delta)` (`movement.rs` 193). The frame delta is the real frame time clamped to 0.1 s (`main.rs` 882, 892).
- Fixed step: `interpolate` (294-299) rounds `delta / (1/60)` to a whole number of steps, clamped to 1..4 (295). The rounding means the camera's speed relative to real time is round(x) / x, where x = 60 x delta (derived), and the minimum of one step makes a frame shorter than 1/120 s advance a full 60 Hz step (derived; see section 6). Each step (`interpolate_once` 301-326) first wraps the destination yaw (302), then moves yaw (303-304), pitch (306-307), distance (309-315) and the three target axes (317-325) by one band step each.
- Band rule (`interpolation_step` 90-98): if the error is above `big`, move error / big_div; else if above `small`, move error / small_div; else snap. Values:
  - Angles (yaw, pitch; degrees): big 5.5 / div 10; small 0.06 / div 4 (75-78).
  - Distance: big 5 / div 1.0 (a full snap); small 0.04 / div 0.6 (79-82).
  - Target axes: big 5 / div 9; small 0.08 / div 4 (83-86).
  Derived: a distance error in the small band is multiplied by 1 - 1/0.6 = -0.67 each step, so it overshoots and rings (see section 6). A wheel notch of 24.3 is above the big threshold, so it is one full step.
- Eye (`eye_unclamped` 340-347): target + (d cos p sin y, -d sin p, -d cos p cos y). The comment at 17-18 says world Y grows downwards, so a positive pitch puts the eye at a smaller Y, above the target.
- Ground floor (`eye` 349-357): if an optional floor is set and the eye's Y is larger than the floor (below it), set the eye's Y to the floor. The floor is computed each frame from the eye's own cell (`movement.rs` 194-207): `gat.get_height` at that cell, only when the cell is valid. The floor has no margin and no damping (test 789-796).
- View (359-365): look-at from `eye() + shake_offset` to `target + shake_offset`, up = negative Y (363). Shake is a pure translation of eye and target.
- Shake (`holder.rs` 42-83): a trigger keeps the larger of the new amplitude and what remains of the old one (52, 56), restarts elapsed (58) and sets the duration from the request (57). Tick adds real dt (63). Offset: amplitude times (1 - elapsed/duration) (71), with a deterministic hash per 60 Hz frame (72-80): x = j1 x amp, y = j2 x amp x 0.5, z = j3 x amp (81). The triggers come from effect spawns (336-337) and are queued and applied each update (680-683). Table (`table.rs` 932-943): ScreenQuake 1.5 for 1667 ms; NpcEarthquake 2.2 for 1300 ms; Dragonfear, Teihit1x, Gumgang2, Hitline, Hitline2, Bash3d2 1.0 for 650 ms.
- Input mapping (`camera.rs` 211-244): drag yaw = -dx x 1 degree (213); shift-drag pitch = dy x 0.5 degrees (216); ctrl-drag distance = -dy x 0.5 (219). Plain wheel distance = notches x 24.3 (242); shift wheel pitch = -notches x 5 degrees (240). Ctrl-reset distance 300 (228); shift-reset pitch 50 (231); plain reset yaw 0 (234), refused indoors.
- Bands and limits: distance outdoor 50 to 1500, indoor 150 to 300, default 200 (45-49). Pitch: default 55 degrees (51); centre 45 with half-width 20 outdoors and 10 indoors (54-56); narrow floor centre 70 without Ctrl (58, 267); ceiling = centre + half-width (261). Indoor yaw fixed at -45 with half-width 20 (52-53, 248-251). Star gazing: distance ceiling x 3 (67, 278), pitch raised to at least 50 when beyond the normal range (68, 280). Ctrl or unbounded lets distance go down to 5 (283-284).
- Map entry (`on_map_enter` 189-209): pitch clamped to its band; indoor yaw forced to -45 (198-199); distance clamped to the environment range (205-206). It sets both current and destination, so entry snaps.

## 2. Key functions

- `Camera::interpolate` and `interpolate_once`: `/mnt/frankendom-donors/nmeylan-nostalro-client/lib/renderer/src/camera.rs` 294-326.
- `interpolation_step`: same file, 90-98. `angle_step`: 328-336.
- `Camera::eye_unclamped` and `Camera::eye` (ground floor): same file, 340-357.
- `Camera::view_matrix` (shake added): same file, 359-365.
- `Camera::apply_drag`, `apply_wheel`, `apply_reset_gesture`, `rotate`, `adjust_pitch`, `adjust_distance`: same file, 211-288.
- `Camera::on_map_enter`: same file, 189-209.
- `ShakeController::trigger`, `tick`, `offset`: `/mnt/frankendom-donors/nmeylan-nostalro-client/lib/renderer/src/effect/holder.rs` 49-82.
- `spawn_camera_shake`: `/mnt/frankendom-donors/nmeylan-nostalro-client/lib/effects/src/table.rs` 932-948.
- Driver: `update_camera`, `/mnt/frankendom-donors/nmeylan-nostalro-client/client/src/game_updates/movement.rs` 189-208.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Fixed 60 Hz step count from frame delta, rounded, capped | 1/60 s step, 4 steps max (theirs, camera.rs 72-73, 295); frame delta cap 0.1 s (theirs, main.rs 892) |
| Band rule: big error divided hard, medium softly, tiny snaps | Angles 5.5 / 0.06 with divisors 10 / 4 (theirs, 75-78). Target 5 / 0.08 with divisors 9 / 4 (theirs, 83-86). Distance 5 / 0.04 with divisors 1.0 / 0.6 (theirs, 79-82) |
| Input writes the destination only | Drag 1 degree and 0.5 degree per pixel, distance 0.5 per pixel (theirs, 59-61); wheel 24.3 per notch, pitch 5 degrees per notch (theirs, 62-63) |
| Zone bands as data | Distance 50-1500 outdoor, 150-300 indoor, default 200 (theirs, 45-49). Pitch centre 45 with half-width 20 outdoor, 10 indoor (theirs, 54-56). Indoor yaw -45 with half-width 20 (theirs, 52-53) |
| Ground floor on the eye | No margin (theirs, camera.rs 351-355; test 789-796) |
| Shake: linear decay, stacking, hashed offset | ScreenQuake 1.5 for 1667 ms, NpcEarthquake 2.2 for 1300 ms, six effects 1.0 for 650 ms (theirs, table.rs 934-943); offset y half of x and z (theirs, holder.rs 81) |

## 4. TypeScript sketch

simplified: keeps the donor's fixed-step band interpolation (a whole number of 60 Hz steps, rounded, capped at 4), the band rule, the eye formula, the ground floor, and the shake (linear decay, stacking, hashed offset). It changes two values: the distance big divisor is 9 (donor 1.0) and the distance small divisor is 4 (donor 0.6), so a wheel notch glides and a medium zoom does not ring; the DONOR_TUNING constant keeps the donor's numbers for comparison. It omits the drag and wheel input mapping, the pitch and yaw limits, the indoor band, the star-gazing and reset rules, the map-entry snap, and the cell lookup for the target (the target is passed in as a destination). The shake's hash is a port of the donor's arithmetic, not a copy of its text.

```ts
// Licence: Apache-2.0 (donor, LICENSE.md). Adapted mechanism; the donor's band rule and shake are kept, with the one change noted in the simplified line.
type Vec3 = { x: number; y: number; z: number };

const STEP = 1 / 60;   // 60 Hz interpolation step
const MAX_STEPS = 4;   // at most 4 steps per frame
const DEG = Math.PI / 180;

// Band rule: a large error is divided by a large divisor, a medium error by a small divisor, a tiny error snaps.
function bandStep(err: number, big: number, small: number, bigDiv: number, smallDiv: number): number {
  const a = Math.abs(err);
  if (a > big) return err / bigDiv;
  if (a > small) return err / smallDiv;
  return err;
}

export interface BandTuning {
  angleBigDeg: number;
  angleSmallDeg: number;
  angleBigDiv: number;
  angleSmallDiv: number;
  distBig: number;
  distSmall: number;
  distBigDiv: number;
  distSmallDiv: number;
  targetBig: number;
  targetSmall: number;
  targetBigDiv: number;
  targetSmallDiv: number;
}

// Donor values. distSmallDiv 0.6 overshoots and rings (see section 6).
export const DONOR_TUNING: BandTuning = {
  angleBigDeg: 5.5, angleSmallDeg: 0.06, angleBigDiv: 10, angleSmallDiv: 4,
  distBig: 5, distSmall: 0.04, distBigDiv: 1, distSmallDiv: 0.6,
  targetBig: 5, targetSmall: 0.08, targetBigDiv: 9, targetSmallDiv: 4,
};

// Sketch values: the distance big divisor is 9 (a wheel notch glides instead of popping in one step) and the
// distance small divisor is 4 (a medium zoom glides instead of ringing).
export const SKETCH_TUNING: BandTuning = { ...DONOR_TUNING, distBigDiv: 9, distSmallDiv: 4 };

const wrapRad = (a: number): number => {
  const t = ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return t > Math.PI ? t - 2 * Math.PI : t;
};
const wrapDeg = (d: number): number => ((((d + 180) % 360) + 360) % 360) - 180;

export class BandCamera {
  yaw = 0;
  pitch = 55 * DEG;
  dist = 200;
  target: Vec3 = { x: 0, y: 0, z: 0 };
  dYaw = 0;
  dPitch = 55 * DEG;
  dDist = 200;
  dTarget: Vec3 = { x: 0, y: 0, z: 0 };

  constructor(private readonly t: BandTuning) {}

  // dt in seconds: a whole number of 60 Hz steps, rounded, capped at MAX_STEPS.
  interpolate(dt: number): void {
    const steps = Math.min(MAX_STEPS, Math.max(1, Math.round(dt / STEP)));
    for (let i = 0; i < steps; i++) this.once();
  }

  private once(): void {
    const t = this.t;
    this.dYaw = wrapRad(this.dYaw);
    const yawStep = bandStep(wrapDeg((this.dYaw - this.yaw) / DEG), t.angleBigDeg, t.angleSmallDeg, t.angleBigDiv, t.angleSmallDiv);
    this.yaw = wrapRad(this.yaw + yawStep * DEG);
    const pitchStep = bandStep((this.dPitch - this.pitch) / DEG, t.angleBigDeg, t.angleSmallDeg, t.angleBigDiv, t.angleSmallDiv);
    this.pitch += pitchStep * DEG;
    this.dist += bandStep(this.dDist - this.dist, t.distBig, t.distSmall, t.distBigDiv, t.distSmallDiv);
    this.target = {
      x: this.target.x + bandStep(this.dTarget.x - this.target.x, t.targetBig, t.targetSmall, t.targetBigDiv, t.targetSmallDiv),
      y: this.target.y + bandStep(this.dTarget.y - this.target.y, t.targetBig, t.targetSmall, t.targetBigDiv, t.targetSmallDiv),
      z: this.target.z + bandStep(this.dTarget.z - this.target.z, t.targetBig, t.targetSmall, t.targetBigDiv, t.targetSmallDiv),
    };
  }

  // World Y grows downwards (donor comment), so a positive pitch lifts the eye to a smaller Y.
  eyeUnclamped(): Vec3 {
    const d = this.dist;
    return {
      x: this.target.x + d * Math.cos(this.pitch) * Math.sin(this.yaw),
      y: this.target.y - d * Math.sin(this.pitch),
      z: this.target.z - d * Math.cos(this.pitch) * Math.cos(this.yaw),
    };
  }

  // Ground floor: if the eye is below the floor (larger Y), pull it up to the floor. No margin, as in the donor.
  eye(floor: number | null): Vec3 {
    const e = this.eyeUnclamped();
    if (floor !== null && e.y > floor) e.y = floor;
    return e;
  }
}

// Shake: linear decay, a stacking rule that keeps the larger of the new and remaining amplitude, hashed per 60 Hz frame.
export class Shake {
  private amp = 0;
  private elapsed = 0;
  private dur = 0;

  trigger(amplitude: number, durationMs: number): void {
    const remaining = this.dur > 0 ? this.amp * (1 - Math.min(1, Math.max(0, this.elapsed / this.dur))) : 0;
    this.amp = Math.max(amplitude, remaining);
    this.dur = Math.max(durationMs / 1000, 1e-3);
    this.elapsed = 0;
  }

  tick(dt: number): void {
    if (this.dur > 0) this.elapsed += dt;
  }

  offset(): Vec3 {
    if (this.dur <= 0 || this.elapsed >= this.dur) return { x: 0, y: 0, z: 0 };
    const amp = this.amp * (1 - this.elapsed / this.dur);
    const frame = Math.floor(this.elapsed * 60) >>> 0;
    const j = (salt: number): number => {
      let x = (Math.imul(frame, 2654435761 | 0) + Math.imul(salt, 40503) + 0x9e3779b9) >>> 0;
      x = (x ^ (x >>> 15)) >>> 0;
      return ((x % 100000) / 100000) * 2 - 1;
    };
    return { x: j(1) * amp, y: j(2) * amp * 0.5, z: j(3) * amp };
  }
}

export {};
```

## 5. Lands in

- TARGET `src/fight/camera.ts` (client-only world camera; new module, not checked against the Frankendom tree). Parity-checklist row 11 (fight camera). The shake hook would belong to row 10 (hit impact) if Lead splits it out; this note files the whole mechanism under row 11 for now. The zone bands (distance, pitch centre and half-widths, indoor yaw) belong in zone data.
- Reuse tag: adapt-with-notice (Apache-2.0: code may be adapted; keep the licence notice and say the source).
- Brief rule served: camera is client-only (the engine never reads it); zone bands are zone data; the step is a fixed 60 Hz count, so the view does not depend on the frame rate beyond the 4-step cap.

## 6. Gaps and risks

- The distance small-band divisor is 0.6 (camera.rs 82). The donor's own test set does not check distance per step. Derived and replicated in Python: a 4-unit error goes 4 to -2.67 to 1.78 to -1.19 and so on, flipping sign and shrinking by two thirds each step, about 13 steps (0.22 s) to snap. Drag-driven zoom in ctrl-drag (0.5 per pixel) lands in this band, so it rings. Do not copy 0.6.
- The distance big divisor is 1.0 (camera.rs 81): any error above 5 is applied in full in one 60 Hz step. A wheel notch of 24.3 is therefore a visible one-step pop, not a glide. The sketch uses 9.
- Indoor pitch band is inverted (camera.rs 261, 264-269). Without Ctrl the ceiling is 45 + 10 = 55 and the floor is 70 - 10 = 60. `deg.min(55)` then `deg.max(60)` always returns 60, so any indoor pitch adjustment without Ctrl lands on 60 degrees. The on-entry clamp (194) uses the band 35 to 55, so the indoor pitch changes on the first adjustment. The only pitch test (606-642) covers the outdoor case; no test covers indoor. Read as a bug or a deliberate lock; do not copy.
- Frame-rate dependence (derived from 295 and main.rs 892). The step count is round(60 x delta), clamped to 1..4. The camera's speed relative to real time is round(x) / x with x = 60 x delta, so at a steady frame rate it is fixed for that rate but not the same across rates: about 0.83 at 25 or 50 fps and about 1.33 at 40 fps. Above 120 fps the rounding gives 0 and the minimum of 1 applies, so the camera advances 60 steps per second whatever the frame rate: 2.4 times intended at 144 fps. Below about 13 fps (delta above 0.075 s) the cap of 4 applies and the camera runs slow (4 steps per 0.1 s at 10 fps is two thirds speed). Frankendom should use an accumulator, not this rounding.
- Eye floor: a single GAT height sample at the eye's cell (`movement.rs` 201-206). No margin, no damping; the eye jumps when the ground rises under it. The floor is applied only when the eye's cell is valid; off the map there is no floor.
- Target is the player's cell centre at ground height (`input/mod.rs` 58-59), not the character's head. The look-at point is at ground level, so the framing depends on the eye distance and pitch only. No over-the-shoulder offset (eye = target plus a spherical offset, `camera.rs` 343-345).
- No wall or object test. The only collision is the ground floor (camera.rs 351-355).
- No target framing. The camera follows the player only (`movement.rs` 183-186). No lock-on or many-enemy framing was found (grep for lock and target framing found none in the camera code). No combat FOV change: the FOV is the default 15 degrees (camera.rs 33) and no assignment to `fov_y` was found outside the struct.
- Shake is pure translation of eye and target (camera.rs 361-362). It is triggered by specific effect ids (table.rs 932-943). Frankendom should key shake to hit events on the server-verified outcome, not to the effect's presence on screen. The hash noise is deterministic per 60 Hz frame, which keeps replays reproducible.
- Client only. Server kills and damage are unaffected.
- Not run: no build, no visual check, no test run. The Python replication of the distance band is arithmetic from the same formula, not a run of the donor.
