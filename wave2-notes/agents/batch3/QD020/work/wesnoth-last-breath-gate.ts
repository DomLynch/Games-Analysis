// Death-gated victory with a last-breath beat, plus the carryover start-gold rule.
// Clean-room shape of Wesnoth's scenario events and carryover.cpp, written in Frankendom terms.
// simplified: omits the KILL_COUNT macro semantics (macro not read), the speech and animation
// timing, the turn-limit defeat, and the per-side carryover variables; it reorders nothing.
export type Phase = "fighting" | "last-breath" | "won" | "lost";

export interface QuestGate {
  phase: Phase;
  bossAlive: boolean;
  linkedAlive: number; // linked minions still alive, counted from server-verified deaths
}

// Boss death does not end the fight at once: it opens a last-breath beat.
export function onBossDeath(g: QuestGate): QuestGate {
  if (g.phase !== "fighting") return g;
  return { ...g, bossAlive: false, phase: "last-breath" };
}

// A linked minion dies. The win fires only when the last linked minion falls during last-breath.
export function onLinkedDeath(g: QuestGate): QuestGate {
  const linkedAlive = Math.max(0, g.linkedAlive - 1);
  if (g.phase === "last-breath" && linkedAlive === 0) {
    return { ...g, linkedAlive, phase: "won" };
  }
  return { ...g, linkedAlive };
}

// Start gold for the next zone: the same two branches as carryover::transfer_all_gold_to.
export function nextStartGold(base: number, carried: number, add: boolean): number {
  if (add && carried > 0) return base + carried;
  return carried > base ? carried : base;
}

export {};
