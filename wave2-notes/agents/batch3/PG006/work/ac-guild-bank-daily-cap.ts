// Licence: GPL-2.0 (donor LICENSE; file header "either version 2 of the License"). Clean-room: shape only, written from the described mechanism.
export interface Rank {
  isLeader: boolean;      // guild master: unlimited
  canWithdrawGold: boolean;
  goldPerDay: number;     // daily cap for this rank
}

export interface MemberCounter {
  usedGoldToday: number;  // reset once a day for every member
}

export interface Bank {
  gold: number;
}

// Remaining gold this member may still take today.
export function remainingGold(rank: Rank, m: MemberCounter): number {
  if (rank.isLeader) return Infinity;
  if (!rank.canWithdrawGold) return 0;
  const left = rank.goldPerDay - m.usedGoldToday;
  return left > 0 ? left : 0;
}

// Order: bank has enough, daily cap has room, debit bank, credit player (roll back if refused),
// then count the withdrawal against the member's day. One call, one ledger.
export function withdrawGold(
  bank: Bank,
  rank: Rank,
  m: MemberCounter,
  amount: number,
  credit: (n: number) => boolean,
): boolean {
  if (amount <= 0) return false;
  if (bank.gold < amount) return false;
  if (remainingGold(rank, m) < amount) return false;
  bank.gold -= amount;
  if (!credit(amount)) {
    bank.gold += amount; // roll back the bank side
    return false;
  }
  m.usedGoldToday += amount;
  return true;
}

// Daily reset: zero every member's counter (the world calls this when the day boundary passes).
export function dailyReset(members: MemberCounter[]): void {
  for (const m of members) m.usedGoldToday = 0;
}

export {};
