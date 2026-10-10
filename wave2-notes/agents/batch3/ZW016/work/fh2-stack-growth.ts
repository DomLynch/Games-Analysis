// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
// randInt returns an integer in [lo, hi], both ends included.
type RandInt = (lo: number, hi: number) => number;

interface Stack { count: number; }

// Donor: growth per period is count / 7, and the fraction is paid by one draw.
const GROWTH_DIVISOR = 7;
// Donor: no growth in the first period (world.cpp 465).
const FIRST_GROWING_PERIOD = 2;

// One growth step for one neutral stack. Expected growth is exactly count / 7.
function growStack(s: Stack, limit: number, randInt: RandInt): number {
  const before = s.count;
  if (before === 0) return 0;            // a cleared stack does not regrow
  if (before >= limit) return 0;         // at or over the cap: no growth
  const remainder = before % GROWTH_DIVISOR;
  const bonus = randInt(1, GROWTH_DIVISOR) <= remainder ? 1 : 0;
  let growth = Math.floor(before / GROWTH_DIVISOR) + bonus;
  growth = Math.min(growth, limit - before);
  s.count = before + growth;
  return growth;
}

// One period across all neutral stacks on the map.
function runPeriod(stacks: Stack[], period: number, limit: number, randInt: RandInt): void {
  if (period < FIRST_GROWING_PERIOD) return;
  for (const s of stacks) growStack(s, limit, randInt);
}

export {};
