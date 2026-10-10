// Licence: Valve Source 1 SDK licence (donor, restricted). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface V3 { x: number; y: number; z: number }
const add = (a: V3, b: V3): V3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const mul = (a: V3, k: number): V3 => ({ x: a.x * k, y: a.y * k, z: a.z * k });
const cross = (a: V3, b: V3): V3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });

// Spray layers, one bit each (donor: FX_BLOODSPRAY_DROPS 0x01, GORE 0x02, CLOUD 0x04).
export const SPRAY_DROPS = 0x01;
export const SPRAY_GORE = 0x02;
export const SPRAY_CLOUD = 0x04;

export interface Particle { layer: "drop-long" | "drop-short" | "gore" | "cloud"; pos: V3; vel: V3; life: number; gravity: number; width?: number; length?: number; sizeStart?: number; sizeEnd?: number }

// The caller supplies the random source (uniform range) and the vector helper.
export interface Rnd { f(lo: number, hi: number): number; vec(lo: number, hi: number): V3 }

// One call per spray. `scale` is the server amount (4, 8, 11 in the donor's callers).
export function bloodSpray(origin: V3, normal: V3, scale: number, flags: number, rnd: Rnd, lowViolence: boolean): Particle[] {
  if (lowViolence) return [];
  // Basis perpendicular to the normal. Donor: right = normal x up; up = right x normal.
  // Fallback for a vertical normal (the donor's cross product is zero there): use fixed axes.
  const vertical = normal.x === 0 && normal.y === 0 && Math.abs(normal.z) === 1;
  const right: V3 = vertical ? { x: 1, y: 0, z: 0 } : cross(normal, { x: 0, y: 0, z: 1 });
  const up: V3 = vertical ? { x: 0, y: 1, z: 0 } : cross(right, normal);
  const out: Particle[] = [];

  if (flags & SPRAY_DROPS) {
    // 14 long stringy drops, then 24 short ones. Gravity 600 (donor units); the donor also sets velocity dampen 0.2 (not modelled here).
    for (let i = 0; i < 14; i++) {
      const off = add(add(origin, mul(right, rnd.f(-0.5, 0.5) * scale)), mul(up, rnd.f(-0.5, 0.5) * scale));
      const dir = add(normal, rnd.vec(-0.3, 0.3));
      const vel = add(mul(dir, rnd.f(4 * scale, 40 * scale)), { x: 0, y: 0, z: rnd.f(4, 16) * scale });
      out.push({ layer: "drop-long", pos: off, vel, life: rnd.f(0.5, 1.0), gravity: 600, width: rnd.f(0.125, 0.275) * scale, length: rnd.f(0.02, 0.03) * scale });
    }
    for (let i = 0; i < 24; i++) {
      const off = add(add(origin, mul(right, rnd.f(-0.5, 0.5) * scale)), mul(up, rnd.f(-0.5, 0.5) * scale));
      const d0 = add(normal, rnd.vec(-1, 1));
      const dir = { x: d0.x, y: d0.y, z: d0.z + rnd.f(0, 1) };
      const vel = add(mul(dir, rnd.f(2 * scale, 25 * scale)), { x: 0, y: 0, z: rnd.f(4, 16) * scale });
      out.push({ layer: "drop-short", pos: off, vel, life: rnd.f(0.5, 1.0), gravity: 600, width: rnd.f(0.25, 0.375) * scale, length: rnd.f(0.0025, 0.005) * scale });
    }
  }
  if (flags & SPRAY_GORE) {
    // 6 tight gore particles at the exit point, short-lived, pushed along the normal.
    for (let i = 0; i < 6; i++) {
      const off = add(add(add(origin, mul(normal, 0.5 * scale)), mul(right, rnd.f(-0.5, 0.5) * scale)), mul(up, rnd.f(-0.5, 0.5) * scale));
      const vel = add(rnd.vec(-0.2, 0.2), mul(normal, rnd.f(10, 100)));
      const s = rnd.f(scale * 0.25, scale);
      out.push({ layer: "gore", pos: off, vel, life: 0.3, sizeStart: s, sizeEnd: s * 2, gravity: 0 });
    }
  }
  if (flags & SPRAY_CLOUD) {
    // 6 diffuse puffs just in front of the wound.
    for (let i = 0; i < 6; i++) {
      const off = add(add(add(origin, mul(normal, scale)), mul(right, rnd.f(-1, 1) * scale)), mul(up, rnd.f(-1, 1) * scale));
      const vel = add(rnd.vec(-0.5, 0.5), mul(normal, rnd.f(100, 200)));
      const s = rnd.f(scale * 1.5, scale * 2.0);
      out.push({ layer: "cloud", pos: off, vel, life: rnd.f(0.5, 0.8), sizeStart: s, sizeEnd: s * 4, gravity: 0 });
    }
  }
  return out;
}
export {};
