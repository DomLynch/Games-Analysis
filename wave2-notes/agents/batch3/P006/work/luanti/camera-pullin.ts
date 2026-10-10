// clean-room: written from the described mechanism, not a translation of the donor lines
type V3 = { x: number; y: number; z: number };

const UNIT = 10;        // units per node (donor BS)
const LIFT = 2;         // raw units added above the eye before the march
const PITCH_FROM = 13;  // march step from which Y follows the view pitch

// Third-person camera: march back from the eye along the view ray in 1-unit steps,
// stop short of the first walkable sample, then clamp height near the feet.
export function thirdPersonCamera(
  eye: V3, dir: V3, feetY: number, isWalkable: (p: V3) => boolean,
): V3 {
  const cam: V3 = { x: eye.x, y: eye.y + LIFT, z: eye.z };
  let hit = false;
  for (let i = UNIT; i <= UNIT * 2.75; i++) {
    cam.x = eye.x - dir.x * i;
    cam.z = eye.z - dir.z * i;
    if (i > PITCH_FROM) cam.y = eye.y - dir.y * i;
    if (isWalkable(cam)) {
      cam.x += dir.x * (UNIT / 2);
      cam.y += dir.y * (UNIT / 2);
      cam.z += dir.z * (UNIT / 2);
      hit = true;
      break;
    }
  }
  if (hit && cam.y > feetY + UNIT * 2) cam.y = feetY + UNIT * 2;
  return cam;
}

// Exponential smoothing toward a target; lambda = dt / smoothing time.
export function damp(a: number, b: number, lambda: number): number {
  return a + (b - a) * (1 - Math.exp(-lambda));
}

export {};
