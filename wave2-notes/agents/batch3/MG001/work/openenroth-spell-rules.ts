// Licence: LGPL-3.0 donor (clean-room). Sketch written from the described mechanism, not a translation of the donor lines.
export type Mastery = 1 | 2 | 3 | 4; // novice, expert, master, grandmaster

export interface SpellRow {
  mana: [number, number, number, number];            // cost per mastery
  recoveryTicks: [number, number, number, number];   // recovery per mastery, in donor ticks
  baseDamage: number;
  bonusPerLevel: number;                              // die faces per skill level (0 = no dice)
}

export const TICKS_PER_REAL_SECOND = 128;             // donor Duration: 128 ticks per real second

// Recovery in real seconds. A failed cast uses the recovery times a failure factor (donor default 0.5).
export function recoverySeconds(row: SpellRow, m: Mastery, failed: boolean, failureMod = 0.5): number {
  const ticks = row.recoveryTicks[m - 1] * (failed ? failureMod : 1);
  return ticks / TICKS_PER_REAL_SECOND;
}

// Damage: base plus one roll of 1..faces per skill level. rnd(n) returns 0..n-1 (donor random).
export function spellDamage(row: SpellRow, level: number, rnd: (n: number) => number): number {
  if (row.bonusPerLevel === 0) return row.baseDamage;
  let total = row.baseDamage;
  for (let i = 0; i < level; i++) total += 1 + rnd(row.bonusPerLevel);
  return total;
}

// Party damage reduction: up to four checks; each check at or above 30 halves the damage.
// Only applies when luck bonus plus resistance is positive (donor CalculateIncommingDamage).
export function reduceIncoming(dmg: number, luckBonus: number, resist: number, rnd: (n: number) => number): number {
  if (luckBonus + resist <= 0) return dmg;
  const divider = luckBonus + resist + 30;
  let out = dmg;
  for (let i = 0; i < 4; i++) {
    if (rnd(divider) >= 30) out = Math.trunc(out / 2);
    else break;
  }
  return out;
}

// Luck to bonus: first threshold the value meets; below the last threshold the last bonus applies (donor table lookup).
const PARAM_TO: number[] = [500, 400, 350, 300, 275, 250, 225, 200, 175, 150, 125, 100, 75, 50, 40, 35, 30, 25, 21, 19, 17, 15, 13, 11, 9, 7, 5, 3];
const BONUS: number[] = [30, 25, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, -1, -2, -3, -4, -5, -6];

export function parameterBonus(p: number): number {
  for (let i = 0; i < PARAM_TO.length; i++) {
    if (p >= PARAM_TO[i]) return BONUS[i];
  }
  return BONUS[BONUS.length - 1];
}

export interface Buff {
  expire: number;   // game time the buff ends
  power: number;
}

// A new buff replaces the old one only if it does not end earlier (donor SpellBuff::Apply).
export function applyBuff(current: Buff | null, next: Buff): Buff {
  if (current && next.expire < current.expire) return current;
  return next;
}

export {};
