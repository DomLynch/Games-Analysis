// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Target {
  hp: number;
  invulnerable: boolean;
  resistance: Record<string, number>; // resistance points per damage type (0 = none)
}

interface HitOutcome { healthChange: number; blocked: boolean; killed: boolean; }

// Each damage type is scaled by 0.9 per resistance point, then the types are summed.
function effectiveDamage(raw: Record<string, number>, target: Target): number {
  let total = 0;
  for (const type in raw) total += raw[type] * Math.pow(0.9, target.resistance[type] ?? 0);
  return total;
}

// One hit on one target. Invulnerable targets refuse the hit; the caller decides whether a projectile keeps flying.
function applyHit(target: Target, raw: Record<string, number>, bonus: number): HitOutcome {
  if (target.invulnerable) return { healthChange: 0, blocked: true, killed: false };
  const amount = effectiveDamage(raw, target) * bonus;
  if (!amount || target.hp <= 0) return { healthChange: 0, blocked: false, killed: false };
  if (amount >= target.hp) {
    const lost = target.hp;
    target.hp = 0;
    return { healthChange: -lost, blocked: false, killed: true };
  }
  target.hp -= amount;
  return { healthChange: -amount, blocked: false, killed: false };
}

// Circular splash: quadratic falloff from 1 at the centre to 0 at the radius, clamped at 0.
function circularSplash(distance: number, radius: number): number {
  return Math.max(0, 1 - (distance * distance) / (radius * radius));
}

// Time for a projectile of horizontal speed s to meet a target moving at constant velocity.
// Solves a t^2 + 2 b t + c = 0 with a = |v|^2 - s^2, b = rel.v, c = |rel|^2; false when no meeting.
function predictTimeToTarget(rel: { x: number; z: number }, v: { x: number; z: number }, s: number): number | false {
  const a = v.x * v.x + v.z * v.z - s * s;
  const b = rel.x * v.x + rel.z * v.z;
  const c = rel.x * rel.x + rel.z * rel.z;
  if (c === 0) return 0;
  const disc = b * b - a * c;
  if (a < 0 || (b < 0 && disc >= 0)) return c / (Math.sqrt(disc) - b);
  return false;
}

export {};
