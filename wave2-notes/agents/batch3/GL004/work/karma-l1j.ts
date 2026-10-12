// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Numbers marked "donor" are the donor's values (L1Karma.java 24-27, C_NPCAction.java 1041-1074).

export {};

const KARMA_MAX = 15500000;                                        // donor: KARMA_RANGE
const KARMA_STEPS = [10000, 20000, 100000, 500000, 1500000, 3000000, 5000000, 10000000, 15500000]; // donor: KARMA_POINT
const BETRAY_TRIGGER = -10000000;                                   // donor: C_NPCAction.java 1041
const BETRAY_RESET = 1000000;                                       // donor: C_NPCAction.java 1042

export interface Soul { karma: number; carry: number; }            // carry = fraction of a point owed (fix, see note)

export function clampKarma(v: number): number {
  return Math.max(-KARMA_MAX, Math.min(KARMA_MAX, v));
}

// Signed level: sign of karma times the number of steps reached, capped at 8 (donor getLevel, L1Karma.java 43-68).
export function karmaLevel(k: number): number {
  const mag = Math.abs(k);
  let level = 0;
  for (const step of KARMA_STEPS) {
    if (mag >= step) { level++; if (level >= 8) break; } else break;
  }
  return k < 0 ? -level : level;
}

// Percent toward the next step (donor getPercent). Same single integer division as the donor, written as an explicit floor.
export function karmaPercent(k: number): number {
  const lvl = Math.abs(karmaLevel(k));
  if (lvl === 0) return 0;
  const mag = Math.abs(k);
  const lo = KARMA_STEPS[lvl - 1];
  const hi = KARMA_STEPS[lvl];
  return Math.floor((100 * (mag - lo)) / (hi - lo));
}

// Award from a kill or an exp event. Opposite-sign karma of the monster is worth five times, and so is an aligned award
// when the exp path uses it (donor: L1MonsterInstance.java 589-592; CalcExp.java 531-533 aligned x5).
// Fix (donor defect): the rate is applied with a carry, so a fractional rate does not silently drop small awards.
export function awardKarma(soul: Soul, amount: number, rate: number, oppositeSign: boolean): number {
  const scaled = amount * (oppositeSign ? 5 : 1) * rate + soul.carry;
  const whole = Math.trunc(scaled);
  soul.carry = scaled - whole;
  soul.karma = clampKarma(soul.karma + whole);
  return whole;
}

// Purchase of karma reduction (donor: C_NPCAction.java 1057-1074, tiers 1, 10 and 100 items for -100, -1000, -10000).
// Fix (donor defect): the donor has no sign check, so a lawful player can buy their own karma down. Here a purchase moves karma only toward zero.
export function purchaseReduction(soul: Soul, tier: 0 | 1 | 2, items: number, rate: number): boolean {
  const cost = [1, 10, 100][tier];
  const points = [100, 1000, 10000][tier] * rate;
  if (items < cost || soul.karma === 0) return false;
  // Move toward zero and never cross it in one purchase.
  soul.karma = soul.karma > 0 ? Math.max(0, soul.karma - points) : Math.min(0, soul.karma + points);
  return true;
}

// Betrayal reset (donor: C_NPCAction.java 1041-1042): at or below the trigger, karma becomes a fixed value.
export function betray(soul: Soul): boolean {
  if (soul.karma > BETRAY_TRIGGER) return false;
  soul.karma = BETRAY_RESET;
  return true;
}
