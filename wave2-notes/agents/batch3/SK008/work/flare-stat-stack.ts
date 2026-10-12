// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism; no donor lines translated.
// clean-room
// Derived stat = (base + bonuses) * multiplier, with base built from level and primary points.
interface StatSpec {
  starting: number;      // value at level 1 with no points
  perLevel: number;      // added for each level above 1
  perPrimary: number[];  // added for each point above the first in each primary stat
}

interface Effects {
  add: number;           // sum of additive bonuses (items, timed effects)
  mult: number;          // product of multiplicative bonuses, starts at 1
}

// One derived value. Order matches the donor: base from level, then points, then (base + add) * mult, then the floor.
function derivedStat(
  spec: StatSpec,
  level: number,
  points: number[],        // points spent in each primary stat
  pointBonus: number[],    // whole-point primary bonuses from effects
  fx: Effects,
  floorAtOne: boolean,     // HP and MP max never go below 1
): number {
  const lev0 = Math.max(level - 1, 0);
  let base = spec.starting + lev0 * spec.perLevel;
  for (let j = 0; j < points.length; j++) {
    const spent = Math.max(points[j] + pointBonus[j] - 1, 0); // the first point is free, as in the donor
    base += spent * spec.perPrimary[j];
  }
  let value = (base + fx.add) * fx.mult;
  if (floorAtOne) value = Math.max(value, 1);
  return value;
}

// Example values for the check only. They are NOT donor numbers: the donor's default mod has no class stats.
const hpSpec: StatSpec = { starting: 10, perLevel: 2, perPrimary: [4, 0, 0, 0] };
export const exampleHp: number = derivedStat(hpSpec, 3, [3, 1, 1, 1], [0, 0, 0, 0], { add: 5, mult: 1.5 }, true);
// Expect: lev0 2 -> 14; spent 2 in physical -> +8 = 22; (22 + 5) * 1.5 = 40.5
export {};
