// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type Outcome = "miss" | "dodge" | "parry" | "block" | "glancing" | "crushing" | "crit" | "normal";

// All widths are in hundredths of a percent (10000 = 100%). roll is drawn from 0..10000 inclusive.
export interface Bands {
  miss: number;
  dodge: number;      // defence band, reduced by the skill bonus
  parry: number;      // defence band, reduced by the skill bonus
  block: number;      // defence band, reduced by the skill bonus
  glancing: number;   // precomputed from the skill gap (donor caps it at 4000)
  crushing: number;   // precomputed from the skill gap (donor: gap >= 15 points, 2% per point over a 15% base)
  crit: number;
}

// One roll sorted into ordered bands: a band is tested only while the running sum is still above the roll.
// The skill bonus (4 per attacker skill point over the victim's skill) lowers dodge, parry and block only,
// and is applied only after the raw width passed the > 0 check (donor order).
export function rollOutcome(b: Bands, skillBonus: number, roll: number): Outcome {
  let sum = 0;
  const inBand = (width: number, bonus = 0): boolean => {
    if (width <= 0) return false; // zero-width band stays closed, even if bonus is negative
    const w = width - bonus;
    if (w <= 0) return false;
    sum += w;
    return roll < sum;
  };
  if (inBand(b.miss)) return "miss";
  if (inBand(b.dodge, skillBonus)) return "dodge";
  if (inBand(b.parry, skillBonus)) return "parry";
  if (inBand(b.block, skillBonus)) return "block";
  if (inBand(b.glancing)) return "glancing";
  if (inBand(b.crushing)) return "crushing";
  if (inBand(b.crit)) return "crit";
  return "normal";
}

// Armour: a fraction f = a / (1 + a), a = 0.1 x armour / (8.5 x L + 40), capped at 0.75. Result is rounded up.
export function armourReduced(damage: number, armour: number, attackerLevel: number): number {
  const armourClamped = Math.max(armour, 0);
  const L = attackerLevel > 59 ? attackerLevel + 4.5 * (attackerLevel - 59) : attackerLevel;
  let f = 0.1 * armourClamped / (8.5 * L + 40);
  f = f / (1 + f);
  f = Math.min(Math.max(f, 0), 0.75);
  return Math.ceil(Math.max(damage * (1 - f), 0));
}

// Damage that an outcome leaves, applied to the already armour-reduced damage.
export function outcomeDamage(o: Outcome, afterArmour: number, blockValue: number, glanceFactor: number): number {
  switch (o) {
    case "miss":
    case "dodge":
    case "parry":
      return 0;
    case "block":
      return Math.max(afterArmour - blockValue, 0);
    case "glancing":
      return Math.trunc(afterArmour * glanceFactor); // glanceFactor = 1 - 0.1 x min(levelGap, 3)
    case "crushing":
      return afterArmour + Math.trunc(afterArmour / 2);
    case "crit":
      return afterArmour * 2;
    default:
      return afterArmour;
  }
}

export {};
