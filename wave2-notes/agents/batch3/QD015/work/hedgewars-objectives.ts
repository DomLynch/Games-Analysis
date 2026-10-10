// Licence: GPL-2.0 (donor, Hedgewars repo COPYING). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Verdict = { kind: "met" } | { kind: "pending" } | { kind: "failed"; reason: string };

interface Goal {
  id: string;
  failText?: string;      // the mission author's text, shown first if this goal fails
  check: () => Verdict;
}

interface NonGoal {
  id: string;
  failText?: string;
  check: () => boolean;   // true = the player loses
}

type Outcome = { kind: "win" } | { kind: "lose"; reason: string } | { kind: "open" };

// Non-goals first (any one loses). Then goals in list order: the first goal that is not met decides.
function evaluate(goals: Goal[], nonGoals: NonGoal[], defaultFail: string): Outcome {
  for (const n of nonGoals) {
    if (n.check()) return { kind: "lose", reason: n.failText ?? defaultFail };
  }
  for (const g of goals) {
    const v = g.check();
    if (v.kind === "met") continue;
    // fix: keep the author's text, then the reason the check gives (the donor drops both)
    if (v.kind === "failed") return { kind: "lose", reason: g.failText ?? v.reason };
    return { kind: "open" }; // pending: stop here and check again later
  }
  return goals.length > 0 ? { kind: "win" } : { kind: "open" };
}

// Facts an engine event writes once per event (not per frame).
interface GearFacts {
  destroyed: boolean;
  maxHit: number; // largest single blow the gear has taken
}

// Example goal: the gear must take one blow of at least `min`. If it is destroyed first,
// the goal still counts as met unless canDestroy is false (the donor's default).
function singleHitGoal(id: string, facts: GearFacts, min: number, canDestroy: boolean, failText?: string): Goal {
  return {
    id,
    failText,
    check: (): Verdict => {
      if (facts.maxHit >= min) return { kind: "met" };
      if (facts.destroyed) {
        return canDestroy
          ? { kind: "met" }
          : { kind: "failed", reason: "destroyed before it took the required hit" };
      }
      return { kind: "pending" };
    },
  };
}

// Turn counter goal: met once `turns` turn-ends have been counted.
function turnsGoal(id: string, counter: { turns: number }, turns: number): Goal {
  return {
    id,
    check: (): Verdict => (counter.turns >= turns ? { kind: "met" } : { kind: "pending" }),
  };
}

export {};
