// Licence: GPL-2.0 (donor). clean-room sketch written from the described rule, not a translation of the donor lines.
// clean-room
interface Queued {
  teamRating: number;       // team rating (season ladder number)
  mmr: number;              // matchmaker rating (separate, drives pairing)
  joinMs: number;           // time the team joined the queue
}

interface Ledger { points: number; carry: number; }

// Data fields (donor defaults in comments; all tunable per zone or per season)
const SCALE = 650;          // chance = 1 / (1 + 10^((opp - own) / SCALE))
const WIN_LOW = 48;         // win modifier below TIER_LOW
const WIN_HIGH = 24;        // win modifier at or above TIER_HIGH
const LOSE_MOD = 24;        // loss modifier, applied as -LOSE_MOD * chance
const TIER_LOW = 1000;
const TIER_HIGH = 1300;
const MAX_MMR_DIFF = 150;   // pairing window half-width
const DISCARD_MS = 10 * 60 * 1000; // after this wait, rating is ignored for pairing

function chanceAgainst(own: number, opp: number): number {
  return 1 / (1 + Math.pow(10, (opp - own) / SCALE));
}

// Win modifier by rating tier; linear taper from WIN_LOW at TIER_LOW to half of it at TIER_HIGH.
function winModifier(own: number): number {
  if (own >= TIER_HIGH) return WIN_HIGH;
  if (own < TIER_LOW) return WIN_LOW;
  return WIN_LOW / 2 + (WIN_LOW / 2) * (TIER_HIGH - own) / (TIER_HIGH - TIER_LOW);
}

// Exact (fractional) change for one result.
function exactChange(own: number, opp: number, won: boolean): number {
  const c = chanceAgainst(own, opp);
  return won ? winModifier(own) * (1 - c) : -LOSE_MOD * c;
}

// Fix for the donor's ceil(): keep the fraction in a carry so small losses are not lost.
function settle(ledger: Ledger, change: number): Ledger {
  const exact = change + ledger.carry;
  const whole = Math.trunc(exact);
  return { points: Math.max(0, ledger.points + whole), carry: exact - whole };
}

function inWindow(anchorMmr: number, c: Queued, nowMs: number): boolean {
  if (c.joinMs < nowMs - DISCARD_MS) return true;   // waited past the discard timer
  return c.mmr >= Math.max(0, anchorMmr - MAX_MMR_DIFF) && c.mmr <= anchorMmr + MAX_MMR_DIFF;
}

// The longest-waiting team sets the window; the first two teams inside it are paired.
function pickPair(queue: Queued[], nowMs: number): [number, number] | null {
  if (queue.length === 0) return null;
  const anchor = queue[0];
  const pool = queue.filter(c => inWindow(anchor.mmr, c, nowMs));
  if (pool.length < 2) return null;
  return [queue.indexOf(pool[0]), queue.indexOf(pool[1])];
}

export {};
