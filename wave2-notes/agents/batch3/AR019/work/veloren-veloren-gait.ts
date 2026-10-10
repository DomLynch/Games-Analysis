// Licence: clean-room sketch written from the mechanism in the donor note (donor is GPL-3.0; no donor lines or formulas copied).
// Sample values below are ours, not the donor's.

export interface Vec3 { x: number; y: number; z: number; }
// One bone: local offset from its parent and one hinge angle about the x axis (radians). Quaternions omitted.
export interface Bone { p: Vec3; rx: number; }
export interface World { p: Vec3; rx: number; }
export type Rig = Record<string, Bone>;

// Tunable data. Donor values were read, not copied.
const PHASE_PER_DISTANCE = 0.65; // radians of gait phase per unit of accumulated distance at tempo 1
const SPEED_CAP = 16;            // speed used for step size is capped here
const SPEED_FULL = 12;           // step size reaches 1.0 at this speed
const BLEND_RATE = 15;           // per second; pose blend toward target
const SMOOTH_BASE = 0.1;         // velocity smoothing: kept fraction per second
const MOVING_EPS = 0.2;          // speed below this counts as standing still

// 1) Phase accumulator: unsigned distance-like integral, divided by body scale.
export function accumulatePhase(acc: number, speed: number, dt: number, scale: number): number {
  return acc + (speed * dt) / scale;
}

// Velocity smoothing with an exact per-second retention (frame-rate independent).
export function smoothVelocity(prev: Vec3, sample: Vec3, dt: number): Vec3 {
  const keep = Math.pow(SMOOTH_BASE, dt);
  return {
    x: keep * prev.x + (1 - keep) * sample.x,
    y: keep * prev.y + (1 - keep) * sample.y,
    z: keep * prev.z + (1 - keep) * sample.z,
  };
}

export function isMoving(v: Vec3): boolean {
  return v.x * v.x + v.y * v.y + v.z * v.z > MOVING_EPS * MOVING_EPS;
}

// 2) Foot phase per body. tempo is per creature (data), not per zone.
export function gaitAngle(acc: number, tempo: number): number {
  return acc * PHASE_PER_DISTANCE * tempo;
}

// Our own saturating wave (not the donor's sin over sqrt form): a planted foot holds near its extremes.
export function footWave(theta: number, sharp: number): number {
  return Math.tanh(sharp * Math.sin(theta)) / Math.tanh(sharp);
}

// Left and right feet are half a cycle apart.
export function footPair(theta: number): { left: number; right: number } {
  return { left: footWave(theta, 3), right: footWave(theta + Math.PI, 3) };
}

// Step amplitude grows with speed, capped.
export function stepAmount(speed: number): number {
  return Math.min(speed, SPEED_CAP) / SPEED_FULL;
}

// 3) Forward kinematics for one hinge chain: translate by the local offset rotated by the parent's angle.
export function compose(parent: World, local: Bone): World {
  const c = Math.cos(parent.rx);
  const s = Math.sin(parent.rx);
  const ly = local.p.y * c - local.p.z * s;
  const lz = local.p.y * s + local.p.z * c;
  return {
    p: { x: parent.p.x + local.p.x, y: parent.p.y + ly, z: parent.p.z + lz },
    rx: parent.rx + local.rx,
  };
}

// Attachment point: an offset in a parent bone's frame (a rider seat, a weapon grip).
export function attachPoint(parent: World, offset: Vec3): Vec3 {
  return compose(parent, { p: offset, rx: 0 }).p;
}

// 4) Pose blend toward the target pose, once per frame.
export function blendFactorLinear(dt: number): number {
  return Math.min(BLEND_RATE * dt, 1); // donor form: linear per frame, snaps when a frame is long
}

export function blendFactorExp(dt: number): number {
  return 1 - Math.exp(-BLEND_RATE * dt); // our form: same rate, no snap
}

export function lerpRig(current: Rig, target: Rig, f: number): Rig {
  const out: Rig = {};
  for (const key of Object.keys(target)) {
    const t = target[key];
    const c = current[key] ?? t;
    out[key] = {
      p: {
        x: c.p.x + (t.p.x - c.p.x) * f,
        y: c.p.y + (t.p.y - c.p.y) * f,
        z: c.p.z + (t.p.z - c.p.z) * f,
      },
      rx: c.rx + (t.rx - c.rx) * f,
    };
  }
  return out;
}

// 5) Leg offsets from the gait for one frame.
export function legOffsets(acc: number, tempo: number, speed: number): { left: number; right: number } {
  const amp = stepAmount(speed);
  const pair = footPair(gaitAngle(acc, tempo));
  return { left: amp * pair.left, right: amp * pair.right };
}
