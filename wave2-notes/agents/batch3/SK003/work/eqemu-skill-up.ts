// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Chances are percentages (0-100), as the donor rules are. Every number here is a tuning field.

export interface SkillUpRules {
  maxChance: number;   // share for a fresh skill before per-use modifiers (donor rule default 25)
  minChance: number;   // floor after modifiers (donor rule default 2)
  modifier: number;    // global multiplier in percent (donor rule default 100)
}

// Chance (percent) that one use raises a skill. Decays with skill value; the per-use modifier shifts the top end.
export function skillUpChance(skill: number, rules: SkillUpRules, useMod: number): number {
  if (rules.maxChance + useMod - rules.minChance <= rules.minChance) {
    return rules.minChance; // donor returns the floor here, without the global modifier
  }
  const working = (rules.maxChance - rules.minChance + useMod) * Math.pow(0.99, skill) + rules.minChance;
  return (working * rules.modifier) / 100;
}

export interface SkillState { value: number; max: number; }

// One use of a skill. Trivial or player targets give nothing (donor gates, checked before the cap).
export function tryIncrease(
  s: SkillState, useMod: number, rules: SkillUpRules,
  roll: () => number,              // returns 0..99.99
  targetIsClientOrTrivial: boolean,
): boolean {
  if (targetIsClientOrTrivial) return false;
  if (s.value >= s.max) return false;
  const chance = skillUpChance(s.value, rules, useMod);
  if (roll() < chance) {
    s.value += 1;
    return true;
  }
  return false;
}

// Cap from a class, skill and level table. The level clamps to the skill's maximum level; a missing row gives 0.
export function skillCap(
  table: Map<string, number>, cls: number, skill: number, level: number, maxLevel: number,
): number {
  const lv = Math.min(level, maxLevel);
  return table.get(`${cls}:${skill}:${lv}`) ?? 0;
}

export {};
