// Licence: GPL-2.0 (donor LICENSE file). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
// camera_scope: world camera
export interface Vec3 { x: number; y: number; z: number; }

// yaw in radians; eyeZ = eye height above pos.z
export interface Hero { pos: Vec3; yaw: number; eyeZ: number; }

// Tuning values are zone or client data, not engine constants.
export interface CamTuning {
  dist: number;       // units behind the hero (donor standard default 192)
  height: number;     // units above the hero's eye line (donor standard default 40)
  speed: number;      // fraction of the gap closed per tick (donor default 0.3)
  camHeight: number;  // camera body height for the ceiling and wall tests (donor 16)
  ceilPad: number;    // gap kept under a ceiling (donor 11)
  lookAhead: number;  // aim point in front of the hero (donor 64)
}

export interface ChaseCam { pos: Vec3; mom: Vec3; yaw: number; }

export interface CamWorld {
  canOccupy(p: Vec3, bodyH: number): boolean; // true if a camera body fits at p
  ceilingAt(x: number, y: number): number;    // ceiling height at x, y
  hasSight(a: Vec3, b: Vec3): boolean;        // unobstructed line from a to b
}

// simplified: one call per tick. Omits the wall slide (donor stops and reports instead), the pitch easing, the CS_SIMPLE side shift, 3D floor and polyobject checks, the grounded-only slope rule, the quake shake and the FOV change. The yaw uses the position after the move in this same call.
export function tickChaseCam(
  cam: ChaseCam,
  hero: Hero,
  t: CamTuning,
  w: CamWorld,
  reset: (c: ChaseCam) => void,
): void {
  // 1. Apply the momentum computed on the previous tick.
  const next: Vec3 = { x: cam.pos.x + cam.mom.x, y: cam.pos.y + cam.mom.y, z: cam.pos.z + cam.mom.z };
  if (cam.mom.x !== 0 || cam.mom.y !== 0 || cam.mom.z !== 0) {
    if (w.canOccupy(next, t.camHeight)) {
      cam.pos = next;
    } else if (!w.hasSight(cam.pos, hero.pos)) {
      reset(cam); // no sight to the hero: snap behind
      return;
    } else {
      cam.mom = { x: 0, y: 0, z: 0 }; // stop at the wall
    }
  }

  // 2. Ideal spot: behind the hero on its yaw, above the eye line.
  const bx = Math.cos(hero.yaw);
  const by = Math.sin(hero.yaw);
  const ideal: Vec3 = {
    x: hero.pos.x - bx * t.dist,
    y: hero.pos.y - by * t.dist,
    z: hero.pos.z + hero.eyeZ + t.height,
  };

  // 3. Pull under a ceiling so the camera stays in the room.
  const ceil = w.ceilingAt(ideal.x, ideal.y);
  if (ideal.z + t.camHeight > ceil) ideal.z = ceil - t.camHeight - t.ceilPad;

  // 4. Ease toward the ideal spot. The move is applied on the next tick.
  cam.mom = {
    x: (ideal.x - cam.pos.x) * t.speed,
    y: (ideal.y - cam.pos.y) * t.speed,
    z: (ideal.z - cam.pos.z) * t.speed,
  };

  // 5. Yaw looks from the camera at a point in front of the hero.
  const lx = hero.pos.x + bx * t.lookAhead;
  const ly = hero.pos.y + by * t.lookAhead;
  cam.yaw = Math.atan2(ly - cam.pos.y, lx - cam.pos.x);
}

export {};
