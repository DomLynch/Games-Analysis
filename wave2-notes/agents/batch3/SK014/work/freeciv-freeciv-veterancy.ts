// Licence: GPL-2.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Target: src/fight/veterancy.ts (proposed). Parity row 21 (catalogue fields).

export {};

// One row per veteran level. The donor keeps these as parallel arrays in [veteran_system].
interface VeteranLevel {
  name: string;
  powerPct: number;      // attack and defence multiplier, percent
  moveBonus: number;     // extra moves, in the ruleset's fractional units
  baseRaisePct: number;  // chance to gain the next level after a fight, percent
  workRaisePct: number;  // chance per turn of useful work, percent (not used in fights)
}

const LADDER: VeteranLevel[] = [
  { name: "green", powerPct: 100, moveBonus: 0, baseRaisePct: 50, workRaisePct: 3 },
  { name: "veteran", powerPct: 150, moveBonus: 0, baseRaisePct: 33, workRaisePct: 2 },
  { name: "hardened", powerPct: 175, moveBonus: 0, baseRaisePct: 20, workRaisePct: 1 },
  { name: "elite", powerPct: 200, moveBonus: 0, baseRaisePct: 0, workRaisePct: 0 },
];

interface Unit {
  attack: number;
  defense: number;
  hp: number;
  maxHp: number;
  firepower: number;   // HP removed from the other side per won round
  moveRate: number;
  moves: number;
  level: number;       // index into LADDER
  damageSlows: boolean;
}

interface VetRules {
  oddsScaled: boolean;     // combat_odds_scaled_veterancy
  onlyRealFight: boolean;  // only_real_fight_makes_veteran
  onlyKilling: boolean;    // only_killing_makes_veteran
}

// Attack power: base attack x level power factor. A tired attack (under one move) scales by moves left.
function attackPower(u: Unit, tiredAttacks: boolean): number {
  let p = u.attack * LADDER[u.level].powerPct / 100;
  if (tiredAttacks && u.moves < 1) {
    p = p * u.moves;
  }
  return p;
}

// Defence power: base defence x level power factor. Terrain bonus is passed in as a percent.
function defencePower(u: Unit, terrainBonusPct: number): number {
  return u.defense * LADDER[u.level].powerPct / 100 * (100 + terrainBonusPct) / 100;
}

// Round loop: each round the attacker wins with probability attack / (attack + defence).
// The winner of a round removes the other side's firepower in HP.
function resolveFight(a: Unit, d: Unit, rng: () => number, maxRounds: number):
    { aHp: number; dHp: number; rounds: number } {
  const att = attackPower(a, true);
  const def = defencePower(d, 0);
  let aHp = a.hp;
  let dHp = d.hp;
  let rounds = 0;
  while (aHp > 0 && dHp > 0 && (maxRounds <= 0 || rounds < maxRounds)) {
    if (rng() * (att + def) >= def) {
      dHp -= a.firepower;
    } else {
      aHp -= d.firepower;
    }
    rounds++;
  }
  return { aHp: Math.max(0, aHp), dHp: Math.max(0, dHp), rounds };
}

// Odds percent from the pre-fight strength ratio, for either side of ONE fight (donor unittools.c 320-327):
// att_strength = attack power x attacker hp x attacker firepower; def_strength = defence power x defender hp x defender firepower.
// attacker odds = 100 x def_strength x 2 / sum; defender odds = 100 x att_strength x 2 / sum. 100 at equal strength.
// Fix: the donor divides here with no zero guard; this sketch returns 100 when both strengths are zero.
function oddsPct(a: Unit, d: Unit, forAttacker: boolean): number {
  const attStrength = attackPower(a, false) * a.hp * a.firepower;
  const defStrength = defencePower(d, 0) * d.hp * d.firepower;
  if (attStrength + defStrength === 0) {
    return 100;
  }
  return forAttacker
    ? 100 * defStrength * 2 / (attStrength + defStrength)
    : 100 * attStrength * 2 / (attStrength + defStrength);
}

// Raise after a fight: chance = base raise % x (odds % + effect bonus) / 100. Never past the top level.
function maybeRaise(u: Unit, oddsPctValue: number, effectBonusPct: number, rng: () => number): boolean {
  if (u.level + 1 >= LADDER.length) {
    return false;
  }
  const mod = oddsPctValue + effectBonusPct;
  const chance = LADDER[u.level].baseRaisePct * mod / 100;
  if (rng() * 100 < chance) {
    u.level++;
    return true;
  }
  return false;
}

// Settle veterancy for both sides after a fight, with the same gates as the donor.
function settleVeterancy(a: Unit, d: Unit, aHp: number, dHp: number,
                         aOdds: number, dOdds: number, powerless: boolean,
                         rules: VetRules, rng: () => number): void {
  if (powerless && rules.onlyRealFight) {
    return;
  }
  if (aHp > 0 && dHp > 0 && rules.onlyKilling) {
    return;
  }
  const useA = rules.oddsScaled ? aOdds : 100;
  const useD = rules.oddsScaled ? dOdds : 100;
  if (aHp > 0) {
    maybeRaise(a, useA, 0, rng);
  }
  if (dHp > 0) {
    maybeRaise(d, useD, 0, rng);
  }
}

// Move rate: type move rate plus level move bonus; damage-slowed classes scale by hp / max hp.
function moveRate(u: Unit): number {
  let m = u.moveRate + LADDER[u.level].moveBonus;
  if (u.damageSlows) {
    m = m * u.hp / u.maxHp;
  }
  return m;
}

// Usage check (not a test): a green Warriors-like unit against an elite defender.
const att: Unit = { attack: 1, defense: 1, hp: 10, maxHp: 10, firepower: 1, moveRate: 1, moves: 1, level: 0, damageSlows: false };
const def: Unit = { attack: 1, defense: 1, hp: 10, maxHp: 10, firepower: 1, moveRate: 1, moves: 1, level: 3, damageSlows: false };
const fight = resolveFight(att, def, Math.random, 0);
void fight;
void moveRate(att);
