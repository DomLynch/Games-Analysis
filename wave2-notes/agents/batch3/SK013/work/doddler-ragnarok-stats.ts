// Licence: custom non-commercial licence (donor license.txt; restricted, shape only). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
// Integer semantics follow the donor's int arithmetic (Math.trunc where the donor divides ints).

// Melee physical attack range (bow path and monster path omitted).
function meleeAttackRange(str: number, dex: number, weaponAttack: number, weaponLevel: number, addAttack: number, attackPct: number): [number, number] {
  let min = Math.trunc(Math.min(weaponAttack * 0.33, str) + dex * (0.8 + 0.2 * weaponLevel));
  const max = Math.trunc(weaponAttack * (200 + str) / 200);
  if (min > max) min = max;
  const statAtk = addAttack + str + Math.trunc(dex / 5) + Math.trunc(str / 10) * Math.trunc(str / 10);
  let lo = Math.trunc((statAtk + min) * attackPct / 100);
  let hi = Math.trunc((statAtk + max) * attackPct / 100);
  if (lo <= 0) lo = 1;
  if (hi < lo) hi = lo;
  return [lo, hi];
}

// Soft defence for a player defender: a band from VIT. rnd(n) returns an integer 0..n-1 from the engine's seeded stream.
function playerSoftDef(vit: number, rnd: (n: number) => number): number {
  const vit30 = Math.trunc(3 * vit / 10);
  let width = Math.trunc(vit * vit / 150) - vit30;
  if (width < 1) width = 1;
  return vit30 + (rnd(20001) % width) + Math.trunc(vit / 2);
}

// Hard defence: index = DEF x 10 + refine x 7. Below index 300, 1 def = 0.1 percent; above, a diminishing curve with a 10 percent floor.
// simplified: a negative index is clamped to 0 here; the donor's fallback returns a value above 1 for negative indexes (see defects).
function hardDefCut(index: number): number {
  if (index < 300) return 1 - Math.max(0, index) / 1000;
  return Math.max(0.1, Math.pow(0.99, index / 10 - 30) - 0.3);
}

// Attacker penalty: a player attacked by more than two enemies loses 5 percent of DEF and soft DEF per extra attacker, and gets a flat hit bonus.
function attackerPenaltyFor(attackers: number): number {
  return attackers > 2 ? attackers - 2 : 0;
}
function penalisedDef(def: number, penalty: number): number {
  return penalty > 0 ? def - Math.trunc(5 * def * penalty / 100) : def;
}
function evasionPenaltyHitBonus(penalty: number): number {
  return penalty * (5 + Math.trunc(penalty / 2));
}

// Hit test: attacker hit = level + DEX + AddHit; defender flee = level + AGI + AddFlee; rate = hit + 75 - flee, floor 5, scaled by the skill accuracy ratio.
// The donor's 95 cap for players is commented out, so a rate above 99 always hits.
function hitTest(attackerLevel: number, dex: number, addHit: number, defenderLevel: number, agi: number, addFlee: number, accuracyRatio: number, flatPenalty: number, roll: number): boolean {
  const attackerHit = attackerLevel + dex + addHit;
  const defenderFlee = defenderLevel + agi + addFlee;
  if (defenderFlee < 0) return true;
  let rate = attackerHit + 75 - defenderFlee;
  if (rate < 5) rate = 5;
  rate = Math.trunc(rate * accuracyRatio / 100);
  if (flatPenalty > 0) rate = Math.min(Math.max(rate + flatPenalty, 5), 100);
  return rate > roll;
}

// Crit rate in tenths of a percent (1000 = 100 percent): (1 + LUK/3 + AddCrit) x 10 + level/5.
function baseCritRate(luk: number, addCrit: number, level: number): number {
  return (1 + Math.trunc(luk / 3) + addCrit) * 10 + Math.trunc(level / 5);
}

// Damage assembly after the hit is decided: soft DEF is subtracted before the element, race, range, size and special multipliers.
function assembleDamage(base: number, addDamage: number, attackMult: number, defCut: number, subDef: number, addFinal: number,
                        eleMod: number, racialMod: number, rangeMod: number, sizeMod: number, specialMod: number, levelCut: number): number {
  let dmg = Math.trunc(((base + addDamage) * attackMult * defCut - subDef + addFinal) * (eleMod / 100) * (racialMod / 100) * (rangeMod / 100) * (sizeMod / 100) * (specialMod / 100));
  if (dmg < 1) dmg = 1;
  dmg = Math.trunc(levelCut * dmg);
  return dmg < 1 ? 1 : dmg;
}

// Level cut when a monster hits a player: 0.25 percent per level the player is above the monster, floor 0.5.
function levelCutMonsterOnPlayer(playerLevel: number, monsterLevel: number): number {
  const c = 1 - 0.0025 * (playerLevel - monsterLevel);
  return Math.min(1, Math.max(0.5, c));
}

// Skill points: earned = prereq points + job level - 1 (novice capped at 9); spent = sum of learned levels. Overspend clamps to 0 here, as the donor does.
function skillPointsLeft(prereqPoints: number, jobLevel: number, isNovice: boolean, learnedLevels: number[]): number {
  let earned = prereqPoints + (jobLevel - 1);
  if (isNovice && earned > 9) earned = 9;
  const used = learnedLevels.reduce((a, b) => a + b, 0);
  return earned < used ? 0 : earned - used;
}

// SP cost per cast: table entry for the level (clamped to the last entry) x (100 + SpConsumption) / 100.
function spCost(table: number[], level: number, spConsumptionPct: number): number {
  if (table.length === 0) return 0;
  const lv = Math.min(level, table.length);
  return Math.trunc(table[lv - 1] * (100 + spConsumptionPct) / 100);
}

// Raise one skill level: points left, below max, tier gate (9 + (rank - 1) x 49 when rank > 0), prerequisites met.
function canRaiseSkill(known: number, maxLevel: number, points: number, tierPointsUsed: number, tierGate: number | null, prereqsMet: boolean): boolean {
  if (points <= 0 || known >= maxLevel) return false;
  if (tierGate !== null && tierPointsUsed < tierGate) return false;
  return prereqsMet;
}

// Attack recharge (delay) from job delay, AGI and DEX: speed score = 1 - (AGI + DEX/4) / 250; bonus decays by 0.99 per point.
// Donor also: dual wield sets jobDelay = (main + off) x 0.7 (Player.cs 823-824), and the result is capped at 2 (ceiling only, no floor; 859-860).
function attackRecharge(jobDelay: number, agi: number, dex: number, aspdBonus: number): number {
  const score = 1 - (agi + dex / 4) / 250;
  const bonus = aspdBonus >= 0 ? aspdBonus * Math.pow(1.0064, aspdBonus) : aspdBonus;
  return Math.min(2, jobDelay * score * Math.pow(0.99, bonus));
}

export {};
