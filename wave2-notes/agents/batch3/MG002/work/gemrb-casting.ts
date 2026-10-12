// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

// One extended header per caster-level tier. castingTimeUnits is 0..10 (10 = one full round).
export interface CastTier { requiredLevel: number; castingTimeUnits: number; }

// Donor order: walk the tiers and stop at the first one whose next tier needs more level than the caster has.
export function pickTier(tiers: CastTier[], casterLevel: number): CastTier {
  for (let i = 0; i < tiers.length - 1; i++) {
    if (tiers[i + 1].requiredLevel > casterLevel) return tiers[i];
  }
  return tiers[tiers.length - 1];
}

export interface CastInput { tier: CastTier; mentalSpeed: number; capUnits?: number; roundMs: number; }

// Cast time in ms. A cap (if set below 10) replaces the tier value and skips haste; otherwise haste is subtracted.
// The result is clamped to 0..10 units before it is scaled to milliseconds.
export function castTimeMs(i: CastInput): number {
  let units = i.tier.castingTimeUnits;
  if (i.capUnits !== undefined && i.capUnits < 10 && units > i.capUnits) units = i.capUnits;
  else units -= i.mentalSpeed;
  units = Math.min(10, Math.max(0, units));
  return (units * i.roundMs) / 10;
}

// Which rule a hit uses to break a cast in progress.
export type DisruptRule =
  | { kind: "simple" }                                                // break when d20 < damage + spellLevel
  | { kind: "concentration"; skill: number; bonus: number }           // break when d20 + skill + bonus <= 10 + damage + spellLevel
  | { kind: "any-hit" };                                              // first-edition style: any damage breaks, no roll

export function castBroken(rule: DisruptRule, d20: number, damage: number, spellLevel: number): boolean {
  switch (rule.kind) {
    case "simple":
      return d20 < damage + spellLevel;
    case "concentration":
      return d20 + rule.skill + rule.bonus <= 10 + damage + spellLevel;
    case "any-hit":
      return true;
  }
}

// Dispel chance in percent. Base 50; +5 per level the dispeller is above the effect's caster, -10 per level below.
// A d100 roll of 1 always fails and 100 always succeeds.
export function dispelSucceeds(dispelLevel: number, casterLevel: number, d100: number): boolean {
  let diff = dispelLevel - casterLevel;
  if (diff > 0) diff *= 5;
  else if (diff < 0) diff *= 10;
  diff += 50;
  if (d100 === 1) return false;
  return d100 === 100 || d100 < diff;
}

export {};
