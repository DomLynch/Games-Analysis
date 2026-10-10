// Licence: Valve Half-Life 1 SDK licence (donor, restricted). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Vec3 { x: number; y: number; z: number }

// Damage tier -> wall splat count and aim jitter (donor tiers: flDamage < 10, < 25, else).
export interface SplatTier { count: number; spread: number }
export function splatTier(damage: number): SplatTier {
  if (damage < 10) return { count: 1, spread: 0.1 };
  if (damage < 25) return { count: 2, spread: 0.2 };
  return { count: 4, spread: 0.3 };
}

// Only these damage kinds leave a wall splat; fire, poison and similar do not.
const SPLAT_KINDS = new Set(["crush", "bullet", "slash", "blast", "club", "mortar"]);

export interface Hit { point: Vec3; dir: Vec3; damage: number; kind: string; color: "red" | "yellow" | "none" }

// Engine raycast supplied by the caller: returns the first wall point, or null for no hit.
export type Ray = (from: Vec3, to: Vec3) => Vec3 | null;

// One call per hit: returns the wall points that received a splat.
export function wallSplats(hit: Hit, rng: () => number, ray: Ray, length: number, visible: boolean): Vec3[] {
  if (!visible || hit.color === "none") return [];
  if (hit.damage === 0 || !SPLAT_KINDS.has(hit.kind)) return [];
  const { count, spread } = splatTier(hit.damage);
  const out: Vec3[] = [];
  for (let i = 0; i < count; i++) {
    // Jitter each axis of the shot direction, then trace along it (not normalised, as in the donor).
    const j = (v: number): number => v + (rng() * 2 - 1) * spread;
    const d = { x: j(hit.dir.x), y: j(hit.dir.y), z: j(hit.dir.z) };
    const to = { x: hit.point.x + d.x * length, y: hit.point.y + d.y * length, z: hit.point.z + d.z * length };
    const p = ray(hit.point, to);
    if (p) out.push(p);
  }
  return out;
}
export {};
