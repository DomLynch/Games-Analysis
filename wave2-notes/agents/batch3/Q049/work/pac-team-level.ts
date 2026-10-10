// Licence: GPL-3.0 (donor LICENSE). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
// Cost to clear each level (index = level). Donor: ExpTable, read as data.
const COST_FROM: number[] = [0, 0, 2, 6, 10, 22, 34, 52, 72, 72];
const MAX_LEVEL = 9;

interface TeamLevel {
  level: number;
  xp: number;   // XP stored toward the next level (always 0 at the cap)
}

// Adds XP and returns the part that counted toward progress. Callers that feed other
// systems (for example a unit's evolution stack) must use this return value, not the request.
function addXp(t: TeamLevel, quantity: number): number {
  let pool = t.xp + quantity;
  let level = t.level;
  while (level < MAX_LEVEL && pool >= COST_FROM[level]) {
    pool -= COST_FROM[level];
    level += 1;
  }
  t.level = level;
  if (level >= MAX_LEVEL) {
    // Overflow beyond the cap is discarded. Only the part of it that came from this call is taken off the return value.
    const overflowFromThisCall = Math.min(quantity, pool);
    t.xp = 0;
    return quantity - overflowFromThisCall;
  }
  t.xp = pool;
  return quantity;
}

// Stack gain for a unit that earns stacks from the XP its ability produced.
// The gain is the returned XP, so an overflowing call cannot inflate the stack.
function thiefStackGain(t: TeamLevel, stars: number): number {
  const xpGain = [1, 1, 1, 2, 3][stars - 1] ?? 3;
  return addXp(t, xpGain);
}

export {}
