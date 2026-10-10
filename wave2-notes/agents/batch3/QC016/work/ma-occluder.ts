// Licence: GPL-3.0 (donor LICENSE). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Vec3 { x: number; y: number; z: number; }

const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const len = (a: Vec3): number => Math.sqrt(dot(a, a));
const smoothstep = (e0: number, e1: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

// Fade amount of a point: 1 inside the eye-to-focus cylinder (full within radius / 2), 0 at radius and beyond,
// and 0 once past the focus plane (the last endCells before the plane fade out).
function occluderAmount(p: Vec3, eye: Vec3, focus: Vec3, radius: number, endCells: number): number {
  const axis = sub(focus, eye);
  const L = Math.max(len(axis), 0.01);
  const rel = sub(p, eye);
  const t = Math.min(1, Math.max(0, dot(rel, axis) / (L * L)));
  const onAxis: Vec3 = { x: axis.x * t, y: axis.y * t, z: axis.z * t };
  const radial = len(sub(rel, onAxis));
  const normal: Vec3 = { x: axis.x / L, y: axis.y / L, z: axis.z / L };
  const past = dot(sub(p, focus), normal);
  const a = 1 - smoothstep(radius * 0.5, radius, radial);
  const b = 1 - smoothstep(-endCells, 0, past);
  return a * b;
}

// Strength eases in over fadeInMs when occluded and out over fadeOutMs when clear; frame gap capped at 100 ms.
function stepStrength(s: number, occluded: boolean, dtMsRaw: number, fadeInMs: number, fadeOutMs: number): number {
  const dt = Math.min(dtMsRaw, 100);
  return occluded ? Math.min(1, s + dt / fadeInMs) : Math.max(0, s - dt / fadeOutMs);
}

// Fragment visibility: at full strength and full fade the fragment keeps the opacity setting.
function visibility(amount: number, strength: number, opacity: number): number {
  return 1 - amount * strength * (1 - opacity);
}

export {};
