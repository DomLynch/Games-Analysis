// Licence: LGPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface StatRule {
  base: number;      // starting value for the race
  max: number;       // highest value a build can reach
  dropped: number;   // step size below base (and for a decrease at base)
  step: number;      // step size above base
}

// Budget cost of one stat relative to its race base. Negative means a refund.
// At or above base: dropped * (cur - base) / step. Below base: -(step * (base - cur) / dropped).
// Integer division truncates toward zero, as in the donor.
export function statCost(r: StatRule, cur: number): number {
  if (cur >= r.base) return Math.trunc((r.dropped * (cur - r.base)) / r.step);
  return -Math.trunc((r.step * (r.base - cur)) / r.dropped);
}

// simplified: the donor recomputes the pool for the whole party (one shared pool of 50).
// This sketch takes one character's stats and one budget (the one-character rule).
export function buildCost(rules: StatRule[], stats: number[]): number {
  let spent = 0;
  for (let i = 0; i < rules.length; i++) spent += statCost(rules[i], stats[i]);
  return spent;
}

// One plus or minus click on one stat. Returns the new stats, or null when the click is refused.
// simplified: the donor's decrease floor is base minus 2; here the same floor applies to both directions.
export function clickStat(
  rules: StatRule[],
  stats: number[],
  i: number,
  dir: 1 | -1,
  budget: number,
): number[] | null {
  const r = rules[i];
  const cur = stats[i];
  // Donor: an increase below base uses the dropped step; a decrease at or below base uses the dropped step.
  const size = dir === 1 ? (cur < r.base ? r.dropped : r.step) : (cur <= r.base ? r.dropped : r.step);
  const next = cur + dir * size;
  if (next < r.base - 2 || next > r.max) return null;
  const after = stats.slice();
  after[i] = next;
  // fix: check the exact new cost against the budget. The donor compares the pool with one step factor.
  if (budget - buildCost(rules, after) < 0) return null;
  return after;
}

export {};
