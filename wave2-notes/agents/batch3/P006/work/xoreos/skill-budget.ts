// clean-room: written from the described mechanism, not a translation of the donor lines
export interface Skill { classSkill: boolean; rank: number }

// Ability modifier from a total score: floor(score / 2) - 5.
export function abilityMod(total: number): number {
  return Math.floor(total / 2) - 5;
}

// Points for one level. Modifier is clamped at 0, then class base, then +1 for a bonus feat,
// then x4 when this is the first level (hitDice 0).
export function levelPool(abilityModValue: number, classBase: number, hasBonusFeat: boolean, hitDice: number): number {
  let pool = Math.max(0, abilityModValue) + classBase;
  if (hasBonusFeat) pool += 1;
  if (hitDice === 0) pool *= 4;
  return pool;
}

// Highest rank a skill may reach. A cross-class skill gets half the cap, rounded down.
export function rankCap(hitDice: number, classSkill: boolean): number {
  const cap = 4 + hitDice;
  return classSkill ? cap : Math.floor(cap / 2);
}

// Points per rank: 1 for a class skill, 2 for a cross-class skill.
export function rankCost(classSkill: boolean): number {
  return classSkill ? 1 : 2;
}

// Raise one skill by one rank. Returns the new pool, or null if the cap or the pool blocks it.
export function rankUp(pool: number, s: Skill, hitDice: number): number | null {
  if (s.rank >= rankCap(hitDice, s.classSkill)) return null;
  const cost = rankCost(s.classSkill);
  if (pool - cost < 0) return null;
  s.rank += 1;
  return pool - cost;
}

// Reset: give back every point spent on these skills.
export function resetPool(pool: number, skills: Skill[]): number {
  let refund = 0;
  for (const s of skills) refund += s.rank * rankCost(s.classSkill);
  return pool + refund;
}

export {};
