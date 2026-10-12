// Licence: GPL-3.0 donor (clean-room). Sketch written from the described mechanism, not a translation of the donor lines.
export interface CasterStats {
  schoolSkill: number;   // skill in the spell's school (donor uses 2 * skill as the margin base)
  willpower: number;
  luck: number;
  fatigueTerm: number;   // fatigue ratio mapped to a multiplier (donor: fFatigueBase - fFatigueMult * (1 - normalised))
  magicka: number;
  silenced: boolean;
  soundBonus: number;    // magnitude of a Sound effect: subtracts from the chance
}

export interface EffectTerm {
  min: number;
  max: number;
  baseCost: number;
  duration: number;
  area: number;
  targetRange: boolean;  // donor: target range multiplies the margin by 1.5
  appliedOnce?: boolean; // donor: AppliedOnce effects skip the duration floor
  hasMagnitude?: boolean; // donor: false (NoMagnitude) means magnitude 1
  hasDuration?: boolean;  // donor: false (NoDuration) means duration 1
}

// Cost of one effect (the donor's GameSpell method: no duration offset, no minimum area).
// Floors as the donor: magnitude min and max at 1, duration at 1 unless appliedOnce; no-magnitude/no-duration effects use 1.
export function effectCost(e: EffectTerm, costMult: number): number {
  const minM = Math.max(1, e.hasMagnitude === false ? 1 : e.min);
  const maxM = Math.max(1, e.hasMagnitude === false ? 1 : e.max);
  let dur = e.hasDuration === false ? 1 : e.duration;
  if (!e.appliedOnce) dur = Math.max(1, dur);
  let x = 0.5 * (minM + maxM);
  x *= 0.1 * e.baseCost;
  x *= dur;
  x += 0.05 * e.area * e.baseCost;
  return x * costMult;
}

// Spell cost: sum of effect costs, each floored at 0, target-range effects x1.5, rounded.
export function spellCost(effects: EffectTerm[], costMult: number): number {
  let total = 0;
  for (const e of effects) {
    const c = Math.max(0, effectCost(e, costMult));
    total += e.targetRange ? c * 1.5 : c;
  }
  return Math.round(total);
}

// Base success chance: the effect with the smallest (2*skill - margin) sets the school. Donor: calcSpellBaseSuccessChance.
export function baseChance(effects: { skill: number; margin: number }[], cost: number, c: CasterStats): number {
  let best = Number.MAX_VALUE;
  let lowest = 0;
  for (const e of effects) {
    const s = 2 * e.skill;
    if (s - e.margin < best) {
      best = s - e.margin;
      lowest = s;
    }
  }
  return lowest - cost + 0.2 * c.willpower + 0.1 * c.luck;
}

// Cast gate. Roll is success when roll (0..99) is below the chance. Donor: getSpellSuccessChance and CastSpell::cast.
export function castChance(c: CasterStats, base: number, cost: number, opts: { alwaysSucceeds: boolean; checkMagicka: boolean; cap: boolean }): number {
  if (c.silenced) return 0;
  if (opts.checkMagicka && cost > 0 && c.magicka < cost) return 0;
  if (opts.alwaysSucceeds) return 100;
  const chance = (base - c.soundBonus) * c.fatigueTerm;
  return opts.cap ? Math.min(100, Math.max(0, chance)) : Math.max(0, chance);
}

// Resistance removed from one magnitude effect, in percent (0..100).
// threshold: the caster's uncapped cast chance; rnd: uniform 0..100; attrResist: resist minus weakness (0..100).
// FIX vs donor: the roll term is returned as a percent. The donor returns roll / threshold (0..1) and then reads it as a percent.
export function magnitudeResistPercent(c: CasterStats, threshold: number, rnd: number, attrResist: number): number {
  let x = (c.willpower + 0.1 * c.luck) * c.fatigueTerm;
  if (threshold > 0) x *= 50 / threshold;     // easy spells are harder to resist, hard spells easier
  if (x <= rnd) return Math.min(attrResist, 100);  // roll beats the threshold: no roll resistance
  const fromRoll = (100 * rnd) / Math.min(x, 100); // FIX: percent (donor: rnd / min(x, 100), a 0..1 fraction)
  return Math.min(fromRoll + attrResist, 100);
}

// Surviving share of a magnitude effect (0..1). Zero share means fully resisted.
export function survivingShare(resistPercent: number): number {
  return 1 - resistPercent / 100;
}

export {};
