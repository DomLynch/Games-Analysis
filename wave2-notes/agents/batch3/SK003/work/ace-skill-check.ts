// Licence: AGPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// One logistic skill-vs-difficulty chance, the evade roll built on it, the armour curve, the attribute damage bonus and rending.
// Every number here is a tuning field, not a fixed rule.

export interface AttackTuning {
  combatSlope: number;   // logistic slope for attack/defence (donor default 0.03)
  magicSlope: number;    // logistic slope for casting (donor default 0.07)
  armourK: number;       // armour curve constant (donor 200 / 3)
  attrPivot: number;     // attribute at which the damage bonus is zero (donor 55)
  attrPerPoint: number;  // damage bonus per point above the pivot (donor 0.011 melee, 0.008 bow)
  rendMin: number;       // fix: lowest armour multiplier rending may reach (donor has no clamp; comment says 60% max)
}

// Chance that a skill beats a difficulty: 0.5 when equal, rising with the gap (donor SkillCheck.GetSkillChance).
export function skillChance(skill: number, difficulty: number, slope: number): number {
  const chance = 1 - 1 / (1 + Math.exp(slope * (skill - difficulty)));
  return Math.min(1, Math.max(0, chance));
}

// Evade is the complement of the attack's chance to land (donor GetEvadeChance).
export function evadeChance(attackSkill: number, defenseSkill: number, t: AttackTuning): number {
  return 1 - skillChance(attackSkill, defenseSkill, t.combatSlope);
}

// Damage multiplier from one armour level. Positive: hyperbolic falloff. Negative: linear rise (donor CalcArmorMod).
export function armourMod(al: number, t: AttackTuning): number {
  if (al > 0) return t.armourK / (al + t.armourK);
  if (al < 0) return 1 - al / t.armourK;
  return 1;
}

// Attribute damage bonus: linear above the pivot, never below 1 (donor SkillFormula.GetAttributeMod).
export function attributeMod(attr: number, t: AttackTuning): number {
  return Math.max(1 + (attr - t.attrPivot) * t.attrPerPoint, 1);
}

// Rending: the share of armour a skill ignores, grown above a threshold. Fix: clamp at rendMin (donor has no clamp).
export function rendingMod(baseSkill: number, threshold: number, perPoint: number, t: AttackTuning): number {
  return Math.max(t.rendMin, 1 - Math.max(0, baseSkill - threshold) / perPoint);
}

export {};
