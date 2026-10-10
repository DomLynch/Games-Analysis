// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface ArmourInput {
  armour: number;        // victim armour before penetration (donor: victim->GetArmor() after per-target multipliers)
  constantK: number;     // armour constant for the attacker's level (donor: DB2 expected_stat table)
  penRatingPct: number;  // attacker's armour-penetration rating in percent, clamped to 0..100
  victimLevel: number;   // victim level as the attacker sees it
}

export const ARMOUR_MITIGATION_CAP = 0.85;

// Penetration removes a percentage of a capped amount, not of raw armour.
export function effectiveArmour(a: ArmourInput): number {
  const pct = Math.min(Math.max(a.penRatingPct, 0), 100);
  const base = a.victimLevel < 60
    ? 400 + 85 * a.victimLevel
    : 400 + 85 * a.victimLevel + 4.5 * 85 * (a.victimLevel - 59);
  const cap = Math.min((a.armour + base) / 3, a.armour);
  return a.armour - (cap * pct) / 100;
}

// Diminishing returns: armour / (armour + K), never more than the cap. Result is floored, never negative.
export function mitigateHit(damage: number, a: ArmourInput): number {
  const armour = effectiveArmour(a);
  if (armour <= 0) return damage;
  if (armour + a.constantK === 0) return damage;
  const mitigation = Math.min(armour / (armour + a.constantK), ARMOUR_MITIGATION_CAP);
  return Math.floor(Math.max(damage * (1 - mitigation), 0));
}

export {};
