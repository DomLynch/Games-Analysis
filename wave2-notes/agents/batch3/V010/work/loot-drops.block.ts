// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Draw = () => number;                       // float in [0, 100)
const MAX_SLOTS = 18;                           // slots per corpse
const ROLL_TIMEOUT_S = 60;                      // group roll window

interface Entry {
  id: string;
  chance: number;                               // percent; 0 = equal-chance pool
  min: number; max: number; maxStack: number;   // stack count range
}

// Explicit entries share ONE draw in [0,100): walk the cumulative chances.
// A miss falls to the equal-chance pool (uniform). Invalid entries are removed first,
// so the draw range does not shrink and a filtered-out entry raises the chance of "nothing".
function pickFromGroup(group: Entry[], eligible: (e: Entry) => boolean, draw: Draw, rnd: () => number): Entry | null {
  const pool = group.filter(eligible);
  const explicit = pool.filter(e => e.chance !== 0);
  const equal = pool.filter(e => e.chance === 0);
  if (explicit.length > 0) {
    let r = draw();
    for (const e of explicit) {
      if (e.chance >= 100) return e;
      r -= e.chance;
      if (r < 0) return e;
    }
  }
  if (equal.length > 0) return equal[Math.floor(rnd() * equal.length)];
  return null;
}

// Ungrouped entry: independent roll. Quality rate multiplies the chance; the raw 100 check comes first.
function rollIndependent(chance: number, qualityRate: number, draw: Draw): boolean {
  if (chance >= 100) return true;
  return chance * qualityRate > draw();          // roll_chance: chance > draw
}

// Stack split: one count per entry, ceil(count / maxStack) stacks, stop at the slot cap.
function stacksFor(e: Entry, slotsUsed: number, rnd: () => number): { id: string; count: number }[] {
  let count = e.min + Math.floor(rnd() * (e.max - e.min + 1));
  const stacks = Math.ceil(count / e.maxStack);
  const out: { id: string; count: number }[] = [];
  for (let i = 0; i < stacks && slotsUsed + out.length < MAX_SLOTS; i++) {
    out.push({ id: e.id, count: Math.min(count, e.maxStack) });
    count -= e.maxStack;
  }
  return out;
}

// Group loot: needs beat greeds; highest 1-100 roll wins inside a class; passes never win.
type Vote = "need" | "greed" | "pass" | "none";
interface Ballot { vote: Vote; roll: number; }

// Returns the winner id, null for all-passed, or "pending" while votes are open and the timer runs.
function resolveRoll(ballots: Map<string, Ballot>, timedOut: boolean): string | null | "pending" {
  let winner: string | null = null;
  let winnerRoll = -1;
  let needSeen = false;
  let waiting = 0;
  for (const [pid, b] of ballots) {
    if (b.vote === "none") { waiting++; continue; }
    if (b.vote === "need") {
      if (!needSeen || b.roll > winnerRoll) { needSeen = true; winner = pid; winnerRoll = b.roll; }
    } else if (b.vote === "greed") {
      if (!needSeen && (winner === null || b.roll > winnerRoll)) { winner = pid; winnerRoll = b.roll; }
    }
  }
  if (waiting === 0 || timedOut) return winner;
  return "pending";
}

export {};
