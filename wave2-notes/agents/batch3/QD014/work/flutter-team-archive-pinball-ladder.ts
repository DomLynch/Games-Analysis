// Licence: MIT (donor LICENSE, Copyright (c) 2021 Very Good Ventures). Clean-room shape written from the mechanism, not a translation of the Dart.
type LedgerEvent =
  | { kind: "scored"; points: number }
  | { kind: "multiplier" }
  | { kind: "bonus"; bonus: string }
  | { kind: "roundLost" };

interface Ledger {
  totalScore: number;
  roundScore: number;
  multiplier: number;
  rounds: number;
  bonusHistory: string[];
}

const MAX_SCORE = 9999999999;
const MAX_MULTIPLIER = 6;

// The only writer of the ledger. Every reward goes through here as an event.
function apply(s: Ledger, e: LedgerEvent): Ledger {
  switch (e.kind) {
    case "scored": {
      const combined = Math.min(s.totalScore + s.roundScore + e.points, MAX_SCORE);
      return { ...s, roundScore: combined - s.totalScore };
    }
    case "multiplier":
      return { ...s, multiplier: Math.min(s.multiplier + 1, MAX_MULTIPLIER) };
    case "bonus":
      return { ...s, bonusHistory: [...s.bonusHistory, e.bonus] };
    case "roundLost": {
      const banked = Math.min(s.totalScore + s.roundScore * s.multiplier, MAX_SCORE);
      return { ...s, totalScore: banked, roundScore: 0, multiplier: 1, rounds: Math.max(s.rounds - 1, 0) };
    }
  }
}

// Objective ladder: a sweep completes when every target has been hit at least once.
// The final sweep is the reward and the ladder wraps to 0.
interface Ladder {
  targets: string[];
  touched: Set<string>;
  stage: number;
  stages: number;
  resetOn: "roundLost" | "gameStart"; // data: which ledger event clears this ladder
}

// Returns true when this hit completed the final sweep (reward due).
function hit(l: Ladder, target: string): boolean {
  if (!l.targets.includes(target)) return false;
  l.touched.add(target);
  if (l.touched.size < l.targets.length) return false;
  l.touched.clear();
  l.stage += 1;
  if (l.stage < l.stages) return false;
  l.stage = 0;
  return true;
}

// Progress is cleared only by the events the ladder names, not by every event.
function onLedgerEvent(ladders: Ladder[], kind: "roundLost" | "gameStart"): void {
  for (const l of ladders) {
    if (l.resetOn === kind) {
      l.touched.clear();
      l.stage = 0;
    }
  }
}

// Delayed reward: the item appears after a fixed delay, not at the moment of completion.
interface PendingReward {
  dueAt: number;
  bonus: string;
}

function scheduleReward(queue: PendingReward[], now: number, bonus: string, delayMs: number): void {
  queue.push({ dueAt: now + delayMs, bonus });
}

function drainDue(queue: PendingReward[], now: number): PendingReward[] {
  const due: PendingReward[] = [];
  for (let i = queue.length - 1; i >= 0; i--) {
    if (queue[i].dueAt <= now) {
      due.unshift(queue[i]);
      queue.splice(i, 1);
    }
  }
  return due;
}

// Example wiring: three targets, three sweeps, a 5000 ms reward delay.
const ladder: Ladder = {
  targets: ["bumperA", "bumperB", "bumperC"],
  touched: new Set<string>(),
  stage: 0,
  stages: 3,
  resetOn: "gameStart",
};
let ledger: Ledger = { totalScore: 0, roundScore: 0, multiplier: 1, rounds: 3, bonusHistory: [] };
const pending: PendingReward[] = [];

for (const t of ["bumperA", "bumperB", "bumperC", "bumperA", "bumperB", "bumperC", "bumperA", "bumperB", "bumperC"]) {
  if (hit(ladder, t)) {
    ledger = apply(ledger, { kind: "bonus", bonus: "dashNest" });
    scheduleReward(pending, 0, "bonusBall", 5000);
  }
}
ledger = apply(ledger, { kind: "scored", points: 5000 });
onLedgerEvent([ladder], "roundLost");
const ready = drainDue(pending, 5000);

export {};
