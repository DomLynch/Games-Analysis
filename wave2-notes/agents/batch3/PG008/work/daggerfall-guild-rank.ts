// Licence: MIT (donor, Daggerfall Workshop 2009-2023). Shape adapted and rewritten from the mechanism; not a line translation.
export interface GuildRules {
  reputationNeeded: number[];  // donor rankReqReputation: 0, 10 ... 90
  highNeeded: number[];        // donor rankReqSkillHigh: skill level for a "high" skill, per rank
  lowNeeded: number[];         // donor rankReqSkillLow: skill level for a "low" skill, per rank
  reviewDays: number;          // donor 28
  neverExpel: boolean;         // donor: Thieves Guild and Dark Brotherhood clamp -1 to 0
}

export interface Member {
  rank: number;                // -1 = not a member
  lastRankChange: number;      // day number
}

// Highest rank whose bar is met. Bars are cumulative: the loop stops at the first rank that fails.
export function computeRank(rep: number, guildSkills: number[], rules: GuildRules): number {
  if (rep < 0) return -1;      // expelled by reputation
  let rank = -1;
  for (let i = 0; i < rules.reputationNeeded.length; i++) {
    let high = 0;
    let low = 0;
    for (const s of guildSkills) {
      if (s >= rules.highNeeded[i]) high++;
      else if (s >= rules.lowNeeded[i]) low++;
    }
    if (rep < rules.reputationNeeded[i] || high < 1 || low + high < 2) break;
    rank = i;
  }
  return rank;
}

export type RankEvent = "none" | "promote" | "demote" | "expel";

// The review only runs after reviewDays since the last rank change. A change resets the clock; no change does not.
export function reviewRank(
  m: Member, rep: number, guildSkills: number[], today: number, rules: GuildRules,
): RankEvent {
  if (today < m.lastRankChange + rules.reviewDays) return "none";
  let next = computeRank(rep, guildSkills, rules);
  if (next < 0 && rules.neverExpel) next = 0;
  if (next === m.rank) return "none";
  const event: RankEvent = next > m.rank ? "promote" : next < 0 ? "expel" : "demote";
  m.rank = next;
  m.lastRankChange = today;
  return event;
}

// Perks scale with rank in 8-bit fixed point, as the donor does (integer division, then >> 8).
export function rewardScaled(rank: number, reward: number): number {
  return (Math.trunc(((10 + rank) << 8) / 10) * reward) >> 8;   // +10% per rank
}

export function repairScaled(rank: number, price: number): number {
  return (Math.trunc(((10 - rank) << 8) / 10) * price) >> 8;    // -10% per rank
}

// Service gates are plain rank thresholds, as in the donor's CanAccessService switches.
export const serviceMinRank = { library: 2, buyMagicItems: 3, hallAnytime: 6 } as const;

export {};
