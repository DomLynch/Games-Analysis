// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Numbers marked "donor" are the donor's values (ReputationMgr.cpp 40-54, 58).

export {};

const STAND_MIN = -42000; // donor: lowest threshold
const STAND_CAP = 42000;  // donor: Reputation_Cap
const RANK_STARTS = [-42000, -6000, -3000, 0, 3000, 9000, 21000, 42000]; // donor thresholds, sorted

interface Standing { value: number; spillCarry: number; } // spillCarry = fraction owed to sisters
interface Faction { id: string; parent?: string; sisters: string[]; spillMod: number; gainRate: number; standing: Standing; }

// Rank = how many thresholds the standing has reached, minus one (-1 if below the first).
export function rankOf(value: number): number {
  let rank = -1;
  for (const t of RANK_STARTS) {
    if (value >= t) rank++;
    else break;
  }
  return rank;
}

// Paragon overflow: above the cap the faction keeps gaining in fixed steps. The cap is the next boundary minus one,
// plus one more step while the reward quest is still untaken (donor: ReputationMgr.cpp 163-166).
export function paragonCap(value: number, step: number, rewardTaken: boolean): number {
  let cap = value + step - (value % step) - 1;
  if (!rewardTaken) cap += step;
  return cap;
}

// Apply a change. incremental = gain or loss relative to now, scaled by the world gain rate with round-half-up.
// Fix (donor defect): the donor truncates spill to int, so small gains lose their share. Here the fraction is carried.
export function applyStanding(f: Faction, amount: number, incremental: boolean, world: Map<string, Faction>): number {
  let delta = amount;
  if (incremental) delta = Math.floor(amount * f.gainRate + 0.5);
  const before = f.standing.value;
  const after = Math.min(STAND_CAP, Math.max(STAND_MIN, incremental ? before + delta : delta));
  f.standing.value = after;

  // Sister spill: a fraction of the change, carried until a whole point is owed.
  const owed = (after - before) * f.spillMod + f.standing.spillCarry;
  const whole = Math.trunc(owed);
  f.standing.spillCarry = owed - whole;
  if (whole !== 0 && f.parent !== undefined) {
    for (const sid of f.sisters) {
      const s = world.get(sid);
      if (s !== undefined) s.standing.value = Math.min(STAND_CAP, Math.max(STAND_MIN, s.standing.value + whole));
    }
  }
  return after - before;
}
