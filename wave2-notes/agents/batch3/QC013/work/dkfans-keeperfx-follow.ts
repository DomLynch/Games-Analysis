// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const ANGLE_FULL = 2048;   // angle units per full turn (donor ANGLE_MASK + 1)
const TURN_LIMIT = 170;    // max yaw change per step (donor DEGREES_30)
const MOVE_LIMIT = 128;    // max focus move per step, per axis (donor clamp of 128)
const ZOOM_CAP = 30000;    // zoom cap used while possessing (donor literal 30000)

export interface FollowCam {
  x: number;          // focus point, map units
  y: number;
  yaw: number;        // camera yaw, angle units
  zoom: number;
  velocityX: number;  // input velocity, cleared by the follow step
  velocityY: number;
}

export interface FollowTarget {
  x: number;          // controlled creature position
  y: number;
  facing: number;     // creature facing, angle units
  eyeRadius: number;  // eye height plus creature height, map units
}

function wrapAngle(a: number): number {
  return ((a % ANGLE_FULL) + ANGLE_FULL) % ANGLE_FULL;
}

// Shortest signed turn from `from` to `to`, in (-1024, 1024].
function signedTurn(from: number, to: number): number {
  let d = wrapAngle(to - from);
  if (d > ANGLE_FULL / 2) d -= ANGLE_FULL;
  return d;
}

function clampN(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

// Donor zoom_in_step: multiply by 100/85 (integer), force at least +1, then cap.
function zoomInStep(zoom: number, cap: number): number {
  let next = Math.floor((100 * zoom) / 85);
  if (next === zoom) next++;
  return Math.min(next, cap);
}

// Offset along a yaw: x uses sin, y uses -cos (angle 0 points to map north, y decreasing).
function offsetAlongYaw(yaw: number, distance: number): { dx: number; dy: number } {
  const r = (2 * Math.PI * yaw) / ANGLE_FULL;
  return { dx: Math.floor(distance * Math.sin(r)), dy: -Math.floor(distance * Math.cos(r)) };
}

// One follow step per game turn. Order as in the donor: zoom in, turn yaw toward the
// creature's facing (at most TURN_LIMIT), then move the focus toward the point eyeRadius
// along the new yaw, clamped per axis to MOVE_LIMIT. Input velocity is cleared.
export function followStep(cam: FollowCam, t: FollowTarget): void {
  cam.zoom = zoomInStep(cam.zoom, ZOOM_CAP);
  const turn = clampN(signedTurn(cam.yaw, t.facing), -TURN_LIMIT, TURN_LIMIT);
  cam.yaw = wrapAngle(cam.yaw + turn);
  const ahead = offsetAlongYaw(cam.yaw, t.eyeRadius);
  cam.x += clampN(t.x + ahead.dx - cam.x, -MOVE_LIMIT, MOVE_LIMIT);
  cam.y += clampN(t.y + ahead.dy - cam.y, -MOVE_LIMIT, MOVE_LIMIT);
  cam.velocityX = 0;
  cam.velocityY = 0;
}

export {};
