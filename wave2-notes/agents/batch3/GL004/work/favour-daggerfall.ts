// Licence: MIT (donor, Daggerfall Unity). Clean-room sketch of the favour idea; numbers are the donor's values, marked where used.
// Donor constants: favour clamp -100..100 (PersistentFactionData.cs:32-33); rank requirements 0,10..90 (Guild.cs:37);
// decay every 161280 game minutes = 112 days (PlayerEntity.cs:458).

export {};

const REP_MIN = -100;
const REP_MAX = 100;
const RANK_REQ_REP = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90];
const DECAY_EVERY_GAME_MIN = 161280;

interface FactionRow { id: string; rep: number; allies: string[]; enemies: string[]; }
type Ledger = Map<string, FactionRow>;
interface Wallet { gold: number; }

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

// Fix (donor defect): the half-change is rounded away from zero, so a +1 or -1 still reaches allies and enemies.
// Donor uses amount / 2 with C# integer division, which turns +1 and -1 into 0.
function changeFavour(ledger: Ledger, id: string, amount: number, propagate: boolean): void {
  const row = ledger.get(id);
  if (row === undefined) return;
  row.rep = clamp(row.rep + amount, REP_MIN, REP_MAX);
  if (!propagate) return;
  const half = Math.sign(amount) * Math.ceil(Math.abs(amount) / 2);
  for (const a of row.allies) changeFavour(ledger, a, half, false);
  for (const e of row.enemies) changeFavour(ledger, e, -half, false);
}

// Donation chance in percent: floor(2 * gold / max(|favour|, 1)) + 1. Can exceed 100, which means certain success.
export function donationChance(gold: number, rep: number): number {
  return Math.trunc((2 * gold) / Math.max(Math.abs(rep), 1)) + 1;
}

// roll() returns an integer 0..99. Success when roll < chance, as the donor's Dice100.SuccessRoll does.
export function donate(ledger: Ledger, deity: string, gold: number, wallet: Wallet, roll: () => number): boolean {
  if (wallet.gold < gold) return false;
  wallet.gold -= gold;
  const row = ledger.get(deity);
  if (row === undefined) return false;
  if (roll() < donationChance(gold, row.rep)) changeFavour(ledger, deity, 1, false);
  return true;
}

// Rank from favour: highest rank whose requirement is met; below 0 is expelled (-1). The donor also checks skills (omitted).
export function rankFor(rep: number): number {
  if (rep < 0) return -1;
  let r = 0;
  while (r + 1 < RANK_REQ_REP.length && rep >= RANK_REQ_REP[r + 1]) r++;
  return r;
}

// Decay, called once per DECAY_EVERY_GAME_MIN game minutes: each non-zero favour moves one point toward 0.
export function decayStep(ledger: Ledger): void {
  for (const row of ledger.values()) {
    if (row.rep < 0) row.rep += 1;
    else if (row.rep > 0) row.rep -= 1;
  }
}

// Rank-scaled boons. Fix (donor defect): cure cost is computed as one floor of price * (10 - rank) / 10,
// not the donor's shift-then-divide chain that truncates before the multiply.
export function cureCost(price: number, rank: number): number {
  return Math.floor((price * (10 - rank)) / 10);
}

export function fastTravelSeconds(durationS: number, rank: number): number {
  return Math.trunc(((95 - rank) / 100) * durationS);
}

// Stendarr-style death avoidance: roll in 0..49 must be below rank (chance rank / 50). Caller supplies the roll.
export function avoidDeath(rank: number, roll: () => number): boolean {
  return roll() < rank;
}

// Blessing. Donor computes a boost but applies no stat (TODO). Fix: the boost becomes a timed status row on the effect ladder.
export interface TimedStatRow { stat: string; amount: number; expiresAtS: number; }
export function blessingRow(stat: string, amount: number, nowS: number, durationS: number): TimedStatRow {
  return { stat, amount, expiresAtS: nowS + durationS };
}
