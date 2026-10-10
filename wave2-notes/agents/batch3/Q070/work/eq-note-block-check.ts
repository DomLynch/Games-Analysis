// Licence: GPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism; not a translation of the donor lines.
export type Rng = (n: number) => number; // integer in [0, n)

// Percent check: true with probability chance/100 (Roll(x) taken as a percent check).
const roll = (rng: Rng, chance: number): boolean => chance > 0 && rng(100) < chance;

// Ratio roll: offense against mitigation gives a multiplier from 0.1 to 2.0 in steps of 0.1.
export function rollRatio(offense: number, mitigation: number, rng: Rng): number {
  const atk = rng(offense + 5);
  const def = rng(mitigation + 5);
  const avg = Math.max(1, Math.floor((offense + mitigation + 10) / 2));
  let index = Math.max(0, (atk - def) + Math.floor(avg / 2));
  index = Math.min(Math.max(Math.floor((index * 20) / avg), 0), 19);
  return (index + 1) / 10;
}

// Hit test: accuracy against avoidance, one roll each; a tie is a coin flip. (Sitting-defender auto-hit not modelled.)
export function hitLands(accuracy: number, avoidance: number, rng: Rng): boolean {
  if (avoidance === -1) return false; // auto avoid, checked first (donor 349-351)
  if (accuracy === -1) return true;
  const t = rng(Math.max(1, accuracy));
  const a = rng(Math.max(1, avoidance));
  if (t === a) return rng(100) < 50;
  return t > a;
}

// One avoidance chance: skill plus 100, scaled by bonus percent, divided by a per-skill divisor,
// then a heroic stat term less the attacker's strikethrough (never below zero from the stat).
export function avoidChance(skill: number, bonusPct: number, divisor: number, heroic: number, strikethrough: number): number {
  let chance = skill + 100;
  chance += Math.floor((chance * bonusPct) / 100);
  chance = Math.floor(chance / divisor);
  return chance + heroic - Math.min(strikethrough, heroic);
}

export interface Defender {
  inFront: boolean;
  canRiposte: boolean; riposteChance: number;   // divisor 50
  canBlock: boolean;   blockChance: number;     // divisor 25
  blockBehindChance: number;                    // separate roll that lets a block work from the rear
  canParry: boolean;   parryChance: number;     // divisor 45
  canDodge: boolean;   dodgeChance: number;     // divisor 45; canDodge already folds in the front-or-monk rule
}

// Avoidance ladder: the first success ends it. Order: riposte, block (front or rear), parry, dodge.
// Shield block and two-hand blunt block (donor rungs after dodge) are not modelled.
export function avoidLadder(d: Defender, rng: Rng): 'riposte' | 'block' | 'parry' | 'dodge' | null {
  if (d.canRiposte && d.inFront && roll(rng, d.riposteChance)) return 'riposte';
  const rearBlock = roll(rng, d.blockBehindChance);
  if (d.canBlock && (d.inFront || rearBlock) && roll(rng, d.blockChance)) return 'block';
  if (d.canParry && d.inFront && roll(rng, d.parryChance)) return 'parry';
  if (d.canDodge && roll(rng, d.dodgeChance)) return 'dodge';
  return null;
}

// Critical: a die from 1..difficulty must fall under a DEX-based threshold.
export function critLands(dex: number, critChanceBonus: number, innate: boolean, difficulty: number, rng: Rng): boolean {
  if (!innate && !critChanceBonus) return false; // donor only rolls a crit with innate crit or a chance bonus (5444)
  const die = 1 + rng(difficulty);
  let dexBonus = dex > 255 ? 255 + Math.floor((dex - 255) / 5) : dex;
  dexBonus += 45;
  if (!innate) dexBonus = Math.floor((dexBonus * 3) / 5);
  if (critChanceBonus) dexBonus += Math.floor((dexBonus * critChanceBonus) / 100);
  return die < dexBonus;
}

// Whole swing: avoidance, hit test, mitigation ratio, critical, then the minimum damage added last.
export function resolveSwing(
  d: Defender, accuracy: number, avoidance: number, base: number, offense: number, mitigation: number,
  minDamage: number, crit: { dex: number; bonusPct: number; innate: boolean; difficulty: number; critDmgMod: number },
  rng: Rng,
): number {
  if (avoidLadder(d, rng) !== null) return 0;
  if (!hitLands(accuracy, avoidance, rng)) return 0;
  let dmg = Math.max(Math.floor(rollRatio(offense, mitigation, rng) * base + 0.5), 1);
  if (critLands(crit.dex, crit.bonusPct, crit.innate, crit.difficulty, rng)) {
    const mod = Math.max(170 + crit.critDmgMod, 100);
    dmg = Math.floor(((Math.max(dmg, base) + 5) * mod) / 100);
  }
  return dmg + minDamage;
}

export {};
