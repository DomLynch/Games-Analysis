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
