// Licence: MIT (donor LICENSE). Written from the formulas read in PlayerCharacter.java, CombatManager.java and CharacterSkill.java; not a line-by-line translation.
// Frankendom target: src/fight/stats.ts (pools, swing cost, regen, skill amount). Values come from catalogue data, not constants.

export interface Mods { hp: number; mana: number; stam: number; }

export interface PoolInput {
  level: number;
  promoted: boolean;
  con: number;          // current Constitution
  spi: number;          // current Spirit
  toughness: number;    // skill amount
  athletics: number;    // skill amount
  classBase: Mods;      // per class (catalogue data)
  classPromo: Mods;     // per promotion (catalogue data)
  race: Mods;           // per race (catalogue data)
}

export interface Pools { hp: number; mana: number; stam: number; }

// Level weights f (level-equivalent) and g (promotion-equivalent), six bands.
export function levelWeights(level: number, promoted: boolean): { f: number; g: number } {
  if (level < 10 || !promoted) return { f: level, g: 0 };
  if (level < 20) return { f: level, g: level - 9 };
  if (level < 30) return { f: 19 + (level - 19) * 0.8, g: 10 + (level - 19) * 0.8 };
  if (level < 40) return { f: 27 + (level - 29) * 0.6, g: 18 + (level - 29) * 0.6 };
  if (level < 50) return { f: 33 + (level - 39) * 0.4, g: 24 + (level - 39) * 0.4 };
  if (level < 60) return { f: 37 + (level - 49) * 0.2, g: 28 + (level - 49) * 0.2 };
  return { f: 39 + (level - 59) * 0.1, g: 30 + (level - 59) * 0.1 };
}

export function pools(p: PoolInput): Pools {
  const { f, g } = levelWeights(p.level, p.promoted);
  const conMul = 0.3 + 0.005 * p.con;
  const spiMul = 0.3 + 0.005 * p.spi;
  const tough = Math.trunc(p.toughness);
  const ath = Math.trunc(p.athletics);
  const hp = ((f * p.classBase.hp + g * p.classPromo.hp) * conMul + (p.con + p.race.hp)) * (1 + tough / 400);
  const mana = (f * p.classBase.mana + g * p.classPromo.mana) * spiMul + (p.spi + p.race.mana);
  const stam = ((f * p.classBase.stam + g * p.classPromo.stam) * conMul + (p.con + p.race.stam)) * (1 + ath / 300);
  return { hp: hp > 0 ? hp : 1, mana: mana > -1 ? mana : 0, stam: stam > -1 ? stam : 0 };
}

// Swing gate and cost. weaponWeight null = bare hands.
export function canSwing(stamina: number, weaponWeight: number | null): boolean {
  return weaponWeight === null ? stamina >= 1 : stamina >= weaponWeight;
}

export function swingCost(weaponWeight: number | null): number {
  if (weaponWeight === null) return 0.5;
  const c = weaponWeight / 3;
  return c < 1 ? 1 : c;
}

// Regen: rate per second times seconds since the last stamina update, clamped to [0, max].
// Fix (donor defect): the delta is capped at 1 s, so a long gap cannot apply all at once.
export function regenStamina(stam: number, max: number, ratePerSec: number, dtSec: number): number {
  const dt = dtSec > 1 ? 1 : dtSec;
  const next = stam + ratePerSec * dt;
  return next > max ? max : next < 0 ? 0 : next;
}

// Skill amount: base 7 + table at a stat-weighted index, plus a train bonus curve.
export function skillBase(weightedStat: number, table: readonly number[]): number {
  let idx = weightedStat;
  if (idx < 1) idx = 1;
  else if (idx > 600) idx = 600;
  return 7 + table[Math.trunc(idx)];
}

export function trainBonus(trains: number): number {
  if (trains < 10) return trains * 2;
  if (trains < 90) return 10 + trains;
  if (trains < 134) return 100 + Math.trunc((trains - 90) / 2);
  return 122 + Math.trunc((trains - 134) / 3);
}

// Fix (donor defect): the displayed percent comes from the same curve as the amount, so the two cannot drift.
export function skillPercentShown(trains: number): number {
  return trainBonus(trains);
}

// Train cap by base Intelligence: table for 1..190, donor formula beyond.
export function trainCap(intelligence: number, table: readonly number[]): number {
  if (intelligence > 0 && intelligence < 191) return table[intelligence];
  return Math.trunc(33 + 1.25 * intelligence - 0.005 * intelligence * intelligence);
}

export {};
