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
