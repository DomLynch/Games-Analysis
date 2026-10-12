// Licence: GPL-2.0-or-later (per the Renown_Info.cs header; no licence file in the donor box). clean-room sketch from the described rule, not a translation.
// clean-room
interface Renowner {
  rank: number;     // renown rank, 1 to maxRank
  points: number;   // points inside the current rank
}

const RP_PER_VICTIM_RANK = 4;   // donor: victim renown rank x 4
const RP_PER_VICTIM_LEVEL = 6;  // donor: victim level x 6

// Points for one kill, from the VICTIM's rank and level (the donor scales by victim, not killer).
function renownAward(victimRank: number, victimLevel: number, rate: number): number {
  if (rate <= 0) rate = 1;
  return (victimRank * RP_PER_VICTIM_RANK + victimLevel * RP_PER_VICTIM_LEVEL) * rate;
}

// Group split: each active member gets the award divided by the active count, rounded down.
function groupShare(award: number, activeMembers: number): number {
  return Math.floor(award / Math.max(1, activeMembers));
}

// thresholds[r] = points needed to leave rank r (rank is 1-based; index 0 unused).
// Fix for the donor: the overflow is carried into a reset progress counter, not added to the old one,
// and the cap keeps a valid threshold (the donor sets its threshold to null at the cap).
function addRenown(r: Renowner, gain: number, thresholds: number[], maxRank: number): Renowner {
  let rank = r.rank;
  let points = r.points + gain;
  while (rank < maxRank && points >= thresholds[rank]) {
    points -= thresholds[rank];
    rank += 1;
  }
  if (rank >= maxRank) return { rank: maxRank, points: 0 };  // at the cap, surplus is not stored (explicit)
  return { rank, points };
}

export {};
