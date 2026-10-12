// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
export {};

interface CastSpec {
  castMs: number;            // CastTime for this skill level (the variable part)
  fixedMs: number | null;    // FixedCastTime; null = take the default share of castMs as fixed
  cancellableOnHit: boolean; // CastCancel
  ignoresStats: boolean;     // skill ignores the speed/focus cut
}

interface CasterStats { speed: number; focus: number; } // donor: DEX and INT

const STAT_SCALE = 530;   // donor vcast_stat_scale (renewal build)
const FIXED_SHARE = 0.2;  // donor default_fixed_castrate (20 percent)
const MIN_DELAY_MS = 100; // donor min_skill_delay_limit
const SECURITY_MS = 100;  // donor SECURITY_CASTTIME

// Renewal-style split. Variable part: cut by stats, then by gear. Fixed part: cut by gear only.
// gearCutPct and fixedCutPct are 0..100.
export function castTimeMs(spec: CastSpec, s: CasterStats, gearCutPct: number, fixedCutPct: number): number {
  let variable: number;
  let fixed: number;
  if (spec.fixedMs === null) {
    fixed = spec.castMs * FIXED_SHARE;
    variable = spec.castMs - fixed;
  } else {
    variable = spec.castMs;
    fixed = spec.fixedMs;
  }
  if (!spec.ignoresStats) {
    variable = variable * (1 - Math.sqrt((2 * s.speed + s.focus) / STAT_SCALE));
  }
  variable = variable * (1 - Math.min(gearCutPct, 100) / 100);
  const v = Math.max(Math.floor(variable), 0); // clamp the variable part before the fixed part is added
  const f = Math.max(fixed, 0) * (1 - Math.min(fixedCutPct, 100) / 100);
  return Math.floor(v + f);
}

export interface ActiveCast { skillId: string; endsAtMs: number; cancellable: boolean; }

// A damaging hit on the caster. exempt is computed by the caller (donor: no-cancel status outside GvG and battlegrounds).
export function onDamage(cast: ActiveCast | null, exempt: boolean): ActiveCast | null {
  if (cast === null) return null;
  if (!cast.cancellable || exempt) return cast;
  return null;
}

// Cast start delay: the caster may act again at max(current, now + max(castMs, minDelay)) + security.
export function canActAtMs(nowMs: number, castMs: number, currentCanActMs: number): number {
  const delay = Math.max(castMs, MIN_DELAY_MS);
  return Math.max(currentCanActMs, nowMs + delay) + SECURITY_MS;
}

// Cast end: the security delay is taken back, then the after-cast delay applies.
export function onCastEnd(currentCanActMs: number, nowMs: number, afterCastMs: number): number {
  return Math.max(nowMs + afterCastMs, currentCanActMs - SECURITY_MS);
}
