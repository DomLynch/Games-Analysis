// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type Alignment = 'lawful' | 'neutral' | 'chaotic' | 'liminal';

export interface Slot { lawful: number; }   // time-of-day slot lawful_bonus, as data (donor schedules.cfg)

export interface Light { mod: number; min: number; max: number; radius: number; dist: number; }

// Donor utils/math.hpp bounded_add: a step that stops at max (up) or min (down).
export function boundedAdd(base: number, inc: number, max: number, min = 0): number {
  return inc >= 0 ? Math.min(base + inc, Math.max(base, max)) : Math.max(base + inc, Math.min(base, min));
}

// Donor tod_manager.cpp: the brightest or darkest of the illuminating units, applied on a base.
export function illuminatedLawful(terrainLight: number, lights: Light[]): number {
  const active = lights.filter((l) => l.dist <= l.radius);
  if (active.length === 0) return terrainLight;
  let mostAdd = 0;
  let mostSub = 0;
  for (const l of active) {
    if (l.mod > mostAdd) mostAdd = l.mod;
    else if (l.mod < mostSub) mostSub = l.mod;
  }
  const netDarker = mostAdd < -mostSub;
  const base = terrainLight + (netDarker ? mostAdd : mostSub);
  let best = terrainLight;
  for (const l of active) {
    const r = boundedAdd(base, l.mod, l.max, l.min);
    if (netDarker ? r < best : r > best) best = r;
  }
  return best;
}

// Donor attack.cpp generic_combat_modifier: alignment decides the sign; fearless clamps at zero.
export function genericModifier(lawful: number, a: Alignment, fearless: boolean, liminalMax: number): number {
  let b = 0;
  switch (a) {
    case 'lawful': b = lawful; break;
    case 'neutral': b = 0; break;
    case 'chaotic': b = -lawful; break;
    case 'liminal': b = liminalMax - Math.abs(lawful); break;
    default: b = 0;
  }
  return fearless ? Math.max(b, 0) : b;
}

// Donor tod_manager.cpp calculate_best_liminal_bonus: pick the liminal value whose summed effect over the cycle
// is closest to the fearless lawful/chaotic total. Donor uses max(25, result) at tod_manager.cpp:55.
export function bestLiminalBonus(schedule: Slot[]): number {
  let fearlessChaotic = 0;
  let fearlessLawful = 0;
  const bonuses = new Set<number>();
  for (const s of schedule) {
    fearlessChaotic += genericModifier(s.lawful, 'chaotic', true, 0);
    fearlessLawful += genericModifier(s.lawful, 'lawful', true, 0);
    bonuses.add(Math.abs(s.lawful));
  }
  const target = Math.max(fearlessChaotic, fearlessLawful);
  let delta = target;
  let result = 0;
  for (const b of bonuses) {
    let liminal = 0;
    for (const s of schedule) liminal += genericModifier(s.lawful, 'liminal', false, b);
    if (Math.abs(target - liminal) < delta) { result = b; delta = Math.abs(target - liminal); }
  }
  return result;
}

// Donor utils/math.hpp round_damage: half-up at or below the divisor, half-down above it; minimum 1 when base > 0.
export function roundDamage(base: number, bonus: number, divisor: number): number {
  if (base === 0) return 0;
  const rounding = Math.trunc(divisor / 2) - (bonus <= divisor || divisor === 1 ? 0 : 1);
  return Math.max(1, Math.trunc(Math.trunc(base * bonus + rounding) / divisor));
}

// Donor attack.cpp: multiplier starts at 100 (percent), adds the alignment-by-time term, then multiplies by resistance.
export function damageFor(base: number, lawful: number, a: Alignment, fearless: boolean, liminalMax: number, resistPct = 100): number {
  let mult = 100;
  mult += genericModifier(lawful, a, fearless, liminalMax);
  mult = Math.trunc(mult * resistPct);
  return roundDamage(base, mult, 10000);
}

export {};
