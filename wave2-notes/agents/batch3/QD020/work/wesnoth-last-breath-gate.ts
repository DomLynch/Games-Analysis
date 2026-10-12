// Boss-death-gated victory with a minion sweep, plus the carryover rules.
// Clean-room shape of Wesnoth's scenario events and carryover, written in Frankendom terms.
// simplified: omits the animated-kill cap (KILL_COUNT), the speech and animation timing, the
// turn-limit defeat, the finishing bonus and the per-side carryover variables.
export type Phase = "fighting" | "last-breath" | "won" | "lost";

export interface QuestGate {
  phase: Phase;
  bossAlive: boolean;
  linkedAlive: number; // linked minions still alive, from server-verified state
}

// Boss death does not end the fight at once: it opens a last-breath beat.
export function onBossDeath(g: QuestGate): QuestGate {
  if (g.phase !== "fighting") return g;
  return { ...g, bossAlive: false, phase: "last-breath" };
}

// The beat resolves in one step, like the donor's nested die handler: every linked minion is
// removed and the win fires exactly once. It does not wait for the minions to die.
export function resolveLastBreath(g: QuestGate): QuestGate {
  if (g.phase !== "last-breath") return g;
  return { ...g, linkedAlive: 0, phase: "won" };
}

// Gold kept at level end: ceil((gold + bonus) * pct / 100), as data/lua/carryover_gold.lua.
export function carriedGold(gold: number, bonus: number, pct: number): number {
  return Math.ceil(((gold + bonus) * pct) / 100);
}

// Start gold for the next zone: the same two branches as carryover::transfer_all_gold_to.
export function nextStartGold(base: number, carried: number, add: boolean): number {
  if (add && carried > 0) return base + carried;
  return carried > base ? carried : base;
}

export {};
