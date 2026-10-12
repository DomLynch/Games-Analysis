// Licence: unclear in the donor (GPL-2.0-or-later on two files, no header on the renown code files, no repo LICENSE). Clean-room: re-expressed from the mechanism, not translated.
interface Standing { rank: number; progress: number }   // rank 0..need.length; need.length is the top rank

// Kill award for a player kill: scales with the victim's rank and level. rate is the server config (default 1).
function killAward(victimRank: number, victimLevel: number, rate: number): number {
  return (victimRank * 4 + victimLevel * 6) * rate;
}

// Group share: every in-range member (killer included) gets the award divided by the in-range count, rounded down.
function groupShare(award: number, inRangeCount: number): number {
  return Math.floor(award / inRangeCount);
}

// need[r] = points to leave rank r (data, one row per rank). Donor rule: rank up when progress is strictly above need.
// fix: the donor keeps the old total on rank-up and adds the overshoot on top, which double-counts. Here the
// progress is reset to the overshoot. At the top rank gains stop and the excess is dropped, as in the donor.
function addStanding(s: Standing, gain: number, need: number[]): Standing {
  let rank = s.rank;
  let progress = s.progress + gain;
  while (rank < need.length && progress > need[rank]) {
    progress -= need[rank];
    rank += 1;
  }
  if (rank >= need.length) return { rank: need.length, progress: 0 };
  return { rank, progress };
}

export {};
