// Licence: GPL-2.0-or-later (donor). Clean-room sketch from the described mechanism; not a translation of the donor lines.
// clean-room
export interface Vec3 { x: number; y: number; z: number; }

export interface Target {
  id: number;
  origin: Vec3;             // entity origin
  mins: Vec3;               // box, relative to origin
  maxs: Vec3;
  canBeAimed: boolean;      // donor: takedamage == DAMAGE_AIM
  alive: boolean;
  team: number;
}

export interface Shooter { id: number; team: number; origin: Vec3; }

export interface AimCfg {
  cosThreshold: number;     // donor sv_aim default 0.93 (about 21.6 degrees); must be in (0, 1]
  maxRange: number;         // units; donor has no range limit (added here)
  teamplay: boolean;
  optOut: boolean;          // QuakeWorld per-client "noaim" setting
}

// Engine supplies the trace: id of the first entity struck along dir up to range, or null.
export type FirstHit = (from: Vec3, dir: Vec3, range: number, exceptId: number) => number | null;

export interface AimResult { dir: Vec3; targetId: number | null; }

const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const add = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const scale = (a: Vec3, k: number): Vec3 => ({ x: a.x * k, y: a.y * k, z: a.z * k });
const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const len = (a: Vec3): number => Math.sqrt(dot(a, a));
const unit = (a: Vec3): Vec3 => scale(a, 1 / len(a));

// One aim point for both the test and the output (donor mixes box centre and origin).
const aimPoint = (t: Target): Vec3 => add(t.origin, scale(add(t.mins, t.maxs), 0.5));

export function aimVector(
  shooter: Shooter,
  facing: Vec3,
  targets: Target[],
  cfg: AimCfg,
  firstHit: FirstHit,
): AimResult {
  const fwd = unit(facing);
  if (cfg.optOut) return { dir: fwd, targetId: null };

  const eye: Vec3 = { x: shooter.origin.x, y: shooter.origin.y, z: shooter.origin.z + 20 };

  // 1. Straight trace along the facing: a hit on an aimable enemy keeps the facing as is.
  const straight = firstHit(eye, fwd, 2048, shooter.id);
  if (straight !== null) {
    const hit = targets.find((t) => t.id === straight);
    if (hit && hit.canBeAimed && !(cfg.teamplay && shooter.team > 0 && hit.team === shooter.team)) {
      return { dir: fwd, targetId: hit.id };
    }
  }

  // 2. Cone search: the most central visible aimable target inside the cone wins.
  let best = cfg.cosThreshold;
  let bestT: Target | null = null;
  for (const t of targets) {
    if (!t.canBeAimed || !t.alive || t.id === shooter.id) continue;
    if (cfg.teamplay && shooter.team > 0 && t.team === shooter.team) continue;
    const toT = sub(aimPoint(t), eye);
    const d = len(toT);
    if (d === 0 || d > cfg.maxRange) continue;
    const c = dot(scale(toT, 1 / d), fwd);
    if (c < best) continue;                                  // outside the cone, or less central than the best so far
    if (firstHit(eye, scale(toT, 1 / d), d, shooter.id) === t.id) { best = c; bestT = t; }
  }

  if (bestT === null) return { dir: fwd, targetId: null };

  // 3. Keep the facing's yaw; take the height from the target (vertical-only snap).
  const rel = sub(aimPoint(bestT), shooter.origin);
  const along = dot(rel, fwd);
  const v: Vec3 = { x: fwd.x * along, y: fwd.y * along, z: rel.z };
  if (Math.hypot(v.x, v.y) < 1e-9) return { dir: fwd, targetId: null };  // facing straight up or down
  return { dir: unit(v), targetId: bestT.id };
}

export {};
