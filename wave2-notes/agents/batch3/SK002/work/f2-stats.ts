// Licence: Sustainable Use License 1.0 (donor; restricted). clean-room sketch from the described rules, not a translation.
export interface Special { str: number; per: number; end: number; int: number; agi: number; luck: number; chr: number; }

// Derived stats from the SPECIAL values, using the donor's non-trait formulas.
export function derivedStats(s: Special) {
  return {
    maxHp: s.str + 2 * s.end + 15,
    maxAp: Math.trunc(s.agi / 2) + 5,
    armourClass: s.agi,
    meleeDamage: Math.max(s.str - 5, 1),
    carryWeight: 25 * s.str + 25,
    sequence: 2 * s.per,
    healingRate: Math.max(Math.trunc(s.end / 3), 1),
    critChance: s.luck,
    radiationRes: 2 * s.end,
    poisonRes: 5 * s.end,
  };
}

// Clamp to the stat table range (min and max per stat).
export function clampStat(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

// Action points lost to overweight: -(trunc(over / 40) + 1) when carried weight exceeds the carry limit.
export function apCarryPenalty(carryMax: number, inventoryWeight: number): number {
  const remaining = carryMax - inventoryWeight;
  return remaining < 0 ? -(Math.trunc(-remaining / 40) + 1) : 0;
}

// Skill value: default + statModifier * (stat1 + stat2) + base points * multiplier.
// A tagged skill doubles the base-point term and gets +20 unless it is the fourth tag while the Tag perk is held.
export interface SkillRow { defaultValue: number; statModifier: number; baseValueMult: number; }
export function skillValue(
  row: SkillRow, statSum: number, basePoints: number,
  tagged: boolean, skipTagBonus: boolean, traitMod: number, perkMod: number, difficultyMod: number,
): number {
  let value = row.defaultValue + row.statModifier * statSum + basePoints * row.baseValueMult;
  if (tagged) {
    value += basePoints * row.baseValueMult;
    if (!skipTagBonus) value += 20;
  }
  value += traitMod + perkMod + difficultyMod;
  return Math.min(value, 300);
}

// Cost in points to raise a skill by one, by its current value.
export function skillCost(value: number): number {
  if (value >= 201) return 6;
  if (value >= 176) return 5;
  if (value >= 151) return 4;
  if (value >= 126) return 3;
  if (value >= 101) return 2;
  return 1;
}

// Skill check against a d100. delta = difficulty - d100. Crit bands use a second d100 and are open only after the day gate.
export type Outcome = "crit-fail" | "fail" | "success" | "crit-success";
export function d100Check(difficulty: number, critMod: number, d100: number, critD100: number, critGateOpen: boolean): Outcome {
  const delta = difficulty - d100;
  if (delta < 0) {
    return critGateOpen && critD100 <= Math.trunc(-delta / 10) ? "crit-fail" : "fail";
  }
  return critGateOpen && critD100 <= Math.trunc(delta / 10) + critMod ? "crit-success" : "success";
}

// Stat check: one d10 (1..10) against the stat plus a modifier. No clamp: a value of 10 or more always passes.
export function statCheck(value: number, d10: number): boolean {
  return d10 <= value;
}

// XP needed to reach a level (0 = nothing). Odd levels: 1000 * (L/2) * L. Even: 1000 * (L/2) * (L - 1).
export function xpForLevel(level: number): number {
  if (level >= 99) return -1;
  const v1 = Math.trunc(level / 2);
  return level % 2 !== 0 ? 1000 * v1 * level : 1000 * v1 * (level - 1);
}

// Skill use cap: slots holds the last three use times (null = empty, index 0 oldest). Refused while the oldest is within 24 hours.
export function useAllowed(slots: Array<number | null>, nowHours: number): boolean {
  if (slots.some((t) => t === null)) return true;
  return nowHours - (slots[0] as number) > 24;
}

// Armour: raw damage, then the donor's halving (divisor 2; Frankendom sets 1), a difficulty percent, then the flat
// threshold (DT) and the percent resistance (DR). Bypass scales both DT and DR to 20 percent.
export function armourDamage(raw: number, dt: number, drPct: number, difficultyPct: number, divisor: number, bypass: boolean): number {
  let threshold = dt;
  let dr = Math.min(100, Math.max(0, drPct));
  if (bypass) {
    threshold = Math.trunc((20 * threshold) / 100);
    dr = Math.trunc((20 * dr) / 100);
  }
  let damage = Math.trunc(raw / divisor);
  damage = Math.trunc((damage * difficultyPct) / 100);
  damage -= threshold;
  if (damage > 0) damage -= Math.trunc((damage * dr) / 100);
  return Math.max(0, damage);
}

export {};
