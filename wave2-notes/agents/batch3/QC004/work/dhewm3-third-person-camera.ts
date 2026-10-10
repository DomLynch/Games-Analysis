// Licence: GPL-3.0-or-later (donor header). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface V3 { x: number; y: number; z: number; }
interface Sweep { fraction: number; endpos: V3; }
// Sweep a small box from `from` to `to` against solid world geometry. fraction 1 = nothing hit.
type SweepFn = (from: V3, to: V3, halfSize: number) => Sweep;

interface ThirdPersonParams {
  range: number;      // camera distance behind the player (units)
  height: number;     // camera height offset (units)
  angleDeg: number;   // orbit angle: 0 = directly behind, 180 = in front
  clip: boolean;      // pull the camera in when a wall is between it and the player
}

const FOCUS_DISTANCE = 512;  // aim point this far ahead of the player
const PITCH_MAX_DEG = 45;    // do not look too far over the head
const CLIP_HALF_SIZE = 4;    // 8 x 8 x 8 probe box
const CLIP_LIFT = 32;        // units of lift when the camera was pulled in

const rad = (deg: number): number => (deg * Math.PI) / 180;
const deg = (r: number): number => (r * 180) / Math.PI;

// Forward and left unit vectors (z up). Pitch is positive looking down, as in the donor.
function forwardOf(yawDeg: number, pitchDeg: number): V3 {
  const y = rad(yawDeg), p = rad(pitchDeg);
  return { x: Math.cos(p) * Math.cos(y), y: Math.cos(p) * Math.sin(y), z: -Math.sin(p) };
}
function leftOf(yawDeg: number): V3 {
  const y = rad(yawDeg);
  return { x: -Math.sin(y), y: Math.cos(y), z: 0 };
}

function thirdPersonView(origin: V3, yawDeg: number, pitchDeg: number, p: ThirdPersonParams, sweep: SweepFn) {
  // Orbit: pitch is ignored while orbiting. Pitch is clamped to look-down limit.
  let pitch = p.angleDeg !== 0 ? 0 : pitchDeg;
  if (pitch > PITCH_MAX_DEG) pitch = PITCH_MAX_DEG;

  // Aim point ahead of the player, raised by the height offset.
  const f = forwardOf(yawDeg, pitch);
  const focus: V3 = { x: origin.x + f.x * FOCUS_DISTANCE, y: origin.y + f.y * FOCUS_DISTANCE, z: origin.z + f.z * FOCUS_DISTANCE + p.height };

  // Desired camera spot: behind and beside the player on a circle of radius `range`.
  // The offset axis uses half the pitch, so the camera does not drop far when looking down.
  let view: V3 = { x: origin.x, y: origin.y, z: origin.z + 8 + p.height };
  const fo = forwardOf(yawDeg, pitch * 0.5);
  const le = leftOf(yawDeg);
  const a = rad(p.angleDeg);
  view = { x: view.x - p.range * Math.cos(a) * fo.x + p.range * Math.sin(a) * le.x,
           y: view.y - p.range * Math.cos(a) * fo.y + p.range * Math.sin(a) * le.y,
           z: view.z - p.range * Math.cos(a) * fo.z + p.range * Math.sin(a) * le.z };

  // Clip: sweep from the player to the spot. On a hit, stop at the hit point, lift by how deep it was,
  // then sweep again from the player so a low ceiling or tunnel does not keep the camera inside.
  if (p.clip) {
    let hit = sweep(origin, view, CLIP_HALF_SIZE);
    if (hit.fraction !== 1) {
      view = { x: hit.endpos.x, y: hit.endpos.y, z: hit.endpos.z + (1 - hit.fraction) * CLIP_LIFT };
      hit = sweep(origin, view, CLIP_HALF_SIZE);
      view = hit.endpos;
    }
  }

  // Aim: pitch from the camera to the focus point (horizontal distance floored at 1), yaw turned back by the orbit angle.
  const dx = focus.x - view.x, dy = focus.y - view.y, dz = focus.z - view.z;
  const focusDist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
  return { vieworg: view, yawDeg: yawDeg - p.angleDeg, pitchDeg: -deg(Math.atan2(dz, focusDist)) };
}
export {}
