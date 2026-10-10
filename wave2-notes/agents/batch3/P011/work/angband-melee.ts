// Licence: dual GPL-2.0 (option a) or "Angband licence" (option b) per player-attack.c header. Treated as GPL: clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Rng {
  int1(n: number): number; // 1..n
  int0(n: number): number; // 0..n-1
}

interface Fighter {
  skill: number;     // melee to-hit skill
  toH: number;       // to-hit from gear and bonuses
  toD: number;       // to-dam from gear and bonuses, added after the crit
  level: number;
  blessed: boolean;
}

interface Weapon {
  weight: number;    // as the donor's object_weight_one returns it (units not read)
  toH: number;
  toD: number;
  diceCount: number;
  diceSides: number;
}

interface Target {
  ac: number;
  visible: boolean;
  debuffed: boolean; // confused, held, feared or stunned
}

const BTH_PLUS_ADJ = 3;
const ALWAYS_HIT = 1200;   // out of 10000
const ALWAYS_MISS = 500;   // out of 10000

// Melee to-hit before the target is considered.
function meleeToHit(f: Fighter, w: Weapon | null): number {
  const bonus = f.toH + (w ? w.toH : 0) + (f.blessed ? 2 : 0);
  return f.skill + bonus * BTH_PLUS_ADJ;
}

// Hit chance out of 10000: a ratio of (to-hit minus two thirds of AC), then 83% of it, plus a guaranteed 12% hit.
function hitChance10k(toHitRaw: number, ac: number): number {
  const toHit = Math.max(9, toHitRaw);
  let num = Math.max(0, toHit - Math.trunc((ac * 2) / 3));
  num = Math.trunc((10000 * num) / toHit);
  num = Math.trunc((num * (10000 - ALWAYS_MISS - ALWAYS_HIT)) / 10000);
  return num + ALWAYS_HIT;
}

function testHit(toHit: number, ac: number, rng: Rng): boolean {
  // assumes a uniform roll over 10000; the donor's random_chance_check was not read
  return rng.int0(10000) < hitChance10k(toHit, ac);
}

// Melee crit: a chance from weight, to-hit, level and skill, then a power that picks a band.
const CRIT_BANDS = [
  { cutoff: 400, mult: 2, add: 5 },
  { cutoff: 700, mult: 2, add: 10 },
  { cutoff: 900, mult: 3, add: 15 },
  { cutoff: 1300, mult: 3, add: 20 },
  { cutoff: Infinity, mult: 4, add: 20 }, // last band catches the rest
];

function meleeCrit(f: Fighter, w: Weapon, dmg: number, rng: Rng, debuffed: boolean): { dmg: number; band: number } {
  let toH = f.toH + w.toH;
  if (debuffed) toH += 10;
  const chance = 1 * w.weight + 5 * toH + 0 * f.level + 1 * f.skill - 60;
  if (rng.int1(5000) > chance) return { dmg, band: -1 }; // no crit
  const power = 1 * w.weight + rng.int1(650);
  let band = 0;
  while (power >= CRIT_BANDS[band].cutoff && band < CRIT_BANDS.length - 1) band++;
  const b = CRIT_BANDS[band];
  return { dmg: b.add + b.mult * dmg, band };
}

function rollDice(count: number, sides: number, rng: Rng): number {
  let s = 0;
  for (let i = 0; i < count; i++) s += rng.int1(sides);
  return s;
}

// One melee blow, in donor order: hit roll, base dice plus weapon to-dam, crit on the weapon, fighter to-dam, zero floor.
function resolveMeleeBlow(f: Fighter, w: Weapon | null, t: Target, rng: Rng): { hit: boolean; damage: number; band: number } {
  let toHit = meleeToHit(f, w);
  if (!t.visible) toHit = Math.trunc(toHit / 2);
  if (!testHit(toHit, t.ac, rng)) return { hit: false, damage: 0, band: -1 };

  let dmg = w ? rollDice(w.diceCount, w.diceSides, rng) : 1;
  if (w) dmg += w.toD;
  let band = -1;
  if (w) {
    const c = meleeCrit(f, w, dmg, rng, t.debuffed);
    dmg = c.dmg;
    band = c.band;
  }
  dmg += f.toD;
  if (dmg <= 0) dmg = 0;
  return { hit: true, damage: dmg, band };
}

// Monster blow vs player: the monster's to-hit, then armour soaks part of the damage (AC capped at 240, out of 400).
function monsterToHit(monsterLevel: number, effectPower: number): number {
  return Math.max(monsterLevel, 1) * 3 + effectPower;
}

function armourSoak(damage: number, ac: number): number {
  return damage - Math.trunc((damage * Math.min(ac, 240)) / 400);
}

export {};
