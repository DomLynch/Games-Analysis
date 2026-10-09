# OpenGothic (camera, cell 14)

Donor: /mnt/frankendom-donors/OpenGothic/common/camera.cpp | Licence: MIT | C++ | symbol Camera::tickThirdPerson / Camera::followTarget / Camera::calcCameraColision

Symbol check (opened on the VPS, 2026-10-09): followTarget 599, followTrans 642, followRot 659, tick 691, tickThirdPerson 787, calcCameraColision ray-fan overload 858, calcLookAtAngles 902, calcCameraColision single-ray overload 915. Both collision overloads are used by tickThirdPerson.

## 1. Mechanism
- A third-person chase camera, run every frame from tickThirdPerson(dt). Output: an origin point and a set of look angles.
- Target: the desired aim point is the player's position plus a target offset, rotated by the camera spin. state.target is set elsewhere (not read). When the camera definition's collision flag is set, the offset is shortened by the single-ray overload of calcCameraColision (915-931, line 820): one ray from state.target along the offset, length offset+25, result = offset direction times max(len x hitFraction - 25, 0).
- Smoothing: followTarget (called at 824 with state.target + offset, only outside dialogue mode) moves the current aim toward the desired aim. In inertia mode it uses a velocity that eases toward the desired step (a damped spring). In plain mode it steps directly, a fraction of the gap each frame. If dt is not positive or the gap is below the minimum length, it returns the destination (snap).
- Range: the distance from aim to camera. It is set by the camera state, or by a dialogue range in dialogue mode. When the collision flag is set, the ray-fan overload (858-900) shortens it: 9 rays (u and v each in -1, 0, 1) from the aim point through points on the view frustum's near plane, each of length range+25; each hit is projected onto the view direction (dot with the aim-to-origin vector over range), 25 is subtracted, and the smallest value (floored at 0) is the new range. The frustum comes from projective() and mkView (not read). If the result is below 80, the camera switches to range 150 and pitch 80 (yaw stays state.spin.y) so it does not sink into the ground (the donor comment says vanilla moves up gradually).
- Origin: when the definition's translate flag is set, origin = followTrans(origin, aim + dir x range, dt, velo_trans) (642-657): a fraction min(1, 0.25 x velo_trans x dt) of the gap per frame, and a snap to the destination when dt < 0 (dialogue mode passes -1). Angles come from calcLookAtAngles: yaw from the horizontal direction, pitch from the vertical, minus the rotation offset, with the default spin yaw when the horizontal distance to the aim is under 4. The rotation offset itself eases to the definition value through followRot (slerp, velo_rot) outside dialogue mode (812). Out of scope here (tick(), 744-771, not in the sketch): global shake blend and water-state tracking.
- Inputs: player position, camera definition values, spin, dialogue state, world physics. Outputs: origin and angles. Per frame, no fixed tick.

## 2. Key functions
- Camera::tickThirdPerson (OpenGothic) | /mnt/frankendom-donors/OpenGothic/common/camera.cpp | 787-856 | per-frame driver: offset, collision pull-in, smoothing, range collision, origin and angles.
- Camera::followTarget (OpenGothic) | /mnt/frankendom-donors/OpenGothic/common/camera.cpp | 599-640 | eases the aim toward the desired point (inertia or direct); `followTrans` (642-657) and `followRot` (659-673) are separate functions.
- Camera::followTrans (OpenGothic) | /mnt/frankendom-donors/OpenGothic/common/camera.cpp | 642-657 | origin eases toward aim + dir x range.
- Camera::calcCameraColision (ray fan) (OpenGothic) | /mnt/frankendom-donors/OpenGothic/common/camera.cpp | 858-900 | 3x3 fan of physics rays from the aim, returns the nearest blocked distance minus padding.
- Camera::calcCameraColision (single ray) (OpenGothic) | /mnt/frankendom-donors/OpenGothic/common/camera.cpp | 915-931 | shortens the target offset with one ray.
- Camera::calcLookAtAngles (OpenGothic) | /mnt/frankendom-donors/OpenGothic/common/camera.cpp | 902-913 | yaw and pitch from origin to target.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Aim point = target + spin-rotated offset; offset pulled in by collision | target_offset and rot_offset values from the camera definition (theirs) |
| Two smoothing modes: velocity-damped (inertia) or direct fraction-per-frame | Gains 8 and 2 for inertia, 3 for direct (theirs) |
| Collision by a fan of rays, subtract a padding from the hit distance | Padding 25 (theirs, 860 and 916); fan is 3x3 rays (n = 1, nn = 1, 861) |
| Fallback when range is too short: fixed range and fixed pitch | Threshold 80, fallback range 150, fallback pitch 80 (theirs) |
| Minimum length snap | minLength 0.0001 (theirs, camera.cpp:78) |
| Origin ease | k 0.25 times velo_trans from the camera definition (theirs, 655) |

## 4. TypeScript sketch
simplified: the sketch omits the calcLookAtAngles/rotation matrices the donor uses to build the fan (the caller passes fanDirs), the collision-flag and translate-flag gating, the dialogue branch, followTrans and followRot, the state.target source, and the veloTrans update in plain mode (the donor sets veloTrans to the gap there). The fallback pitch also changes the direction vector, which the sketch leaves to the caller. norm uses the donor's 0.00001 guard rather than an exact normalise.
```ts
// Licence: MIT (OpenGothic). Logic lifted from common/camera.cpp (followTarget,
// tickThirdPerson, calcCameraColision) and rewritten in TS with local types.
interface V3 { x: number; y: number; z: number; }
const sub = (a: V3, b: V3): V3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const add = (a: V3, b: V3): V3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const scl = (a: V3, k: number): V3 => ({ x: a.x * k, y: a.y * k, z: a.z * k });
const len = (a: V3) => Math.hypot(a.x, a.y, a.z);

const MIN_LEN = 0.0001;    // theirs
const PADDING = 25;        // theirs
const FALLBACK_RANGE = 150; // theirs
const FALLBACK_PITCH = 80;  // theirs
const RANGE_FLOOR = 80;     // theirs

function follow(pos: V3, dest: V3, dt: number, vel: V3, inertia: boolean): V3 {
  const dp = sub(dest, pos);
  if (dt <= 0 || len(dp) <= MIN_LEN) return dest;
  if (inertia) {
    const v = add(vel, scl(sub(dp, vel), Math.min(1, 8 * dt)));
    vel.x = v.x; vel.y = v.y; vel.z = v.z;
    return add(pos, scl(v, Math.min(1, 2 * dt)));
  }
  return add(pos, scl(dp, Math.min(1, 3 * dt)));
}

const dot = (a: V3, b: V3) => a.x * b.x + a.y * b.y + a.z * b.z;
const norm = (a: V3): V3 => scl(a, 1 / (len(a) + 0.00001));

// Range collision. fanDirs are the 9 aim-to-near-plane directions (u, v in -1..1) the caller builds
// from its own projection; cast returns the hit point or null.
function collideRange(aim: V3, dir: V3, range: number, fanDirs: V3[], cast: (from: V3, to: V3) => V3 | null): number {
  let best = range;
  const dview = scl(dir, range);                   // origin - target in the donor
  for (const d of fanDirs) {
    const dr = scl(norm(d), range + PADDING);
    const hit = cast(aim, add(aim, dr));
    if (hit === null) continue;
    const dist = Math.max(dot(dview, sub(hit, aim)) / range - PADDING, 0);
    if (dist < best) best = dist;
  }
  return best;
}

// Target-offset collision: one ray along the offset.
function collideOffset(from: V3, offset: V3, castFraction: (from: V3, to: V3) => number | null): V3 {
  const l = len(offset) + PADDING;
  const n = norm(offset);
  const f = castFraction(from, add(from, scl(n, l)));
  return f === null ? offset : scl(n, Math.max(l * f - PADDING, 0));
}

function fallbackIfShort(range: number): { range: number; pitch: number | null } {
  return range < RANGE_FLOOR ? { range: FALLBACK_RANGE, pitch: FALLBACK_PITCH } : { range, pitch: null };
}
```

## 5. Lands in
- Frankendom target: src/fight/camera.ts (new module; today: src/camera* (moving), slice K4).
- Parity-checklist row: 11 (fight camera, camera kick, standoff).
- Reuse tag: adapt (MIT, so logic can be lifted; the sketch is a rewrite, and the gains are theirs)
- Brief rule served: (category default, not per-cell) 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks
- Built on the Gothic physics ray API. Frankendom needs its own ray query against its geometry.
- Collision uses a fan of rays with a magic padding; the donor notes the fallback is a vanilla quirk. Frankendom should treat the fallback as a design call, not a copy.
- Dialogue mode switches the range source. Frankendom's dialogue camera would need the same switch.
- Camera is client-only and does not affect state, which fits the server-verified rule.
