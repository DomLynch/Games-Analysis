// Licence: AGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type RequesterKind = "mod" | "topOnline" | "tournamentLeader" | "report";

const PRIORITY: Record<RequesterKind, number> = {
  topOnline: 10,
  tournamentLeader: 20,
  report: 30,
  mod: 100,
};

interface Pred {
  percent: number;            // whole percent of the model's 0..1 score, truncated
  protectedAccount: boolean;  // titled accounts are routed to a human, never auto-actioned
}

interface Thresholds {
  report: number;             // at or above: a human report is filed
  mark: number;               // at or above: automatic action (or a report if protected)
}

interface Queued {
  id: string;
  priority: number;
  queuedAt: number;           // ms
  startedAt: number | null;
  response: Pred | null;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MIN_MOVES = 1050;

// Re-request rules: a higher-priority asker lifts an unstarted entry; a mod or a stale entry re-queues;
// otherwise the request is ignored, so repeated asks within a week do not re-queue.
function queueAgain(q: Queued, by: RequesterKind, now: number): Queued | null {
  if (q.startedAt === null && PRIORITY[by] > q.priority) return { ...q, priority: PRIORITY[by] };
  const recent = now - q.queuedAt < WEEK_MS;
  if (by === "mod" || !recent) {
    return { ...q, priority: PRIORITY[by], queuedAt: now, startedAt: null, response: null };
  }
  return null;
}

// Evidence gate: no score is requested until the player has enough recent rated moves.
// Cheap check first; the expensive count runs only when the cheap check passes.
function hasEnoughEvidence(cheapPass: boolean, ratedGames: { speed: "blitz" | "rapid" | "other"; turns: number }[]): boolean {
  if (!cheapPass) return false;
  let blitz = 0;
  let rapid = 0;
  for (const g of ratedGames) {
    const moves = Math.floor(g.turns / 2);
    if (g.speed === "blitz") blitz += moves;
    else if (g.speed === "rapid") rapid += moves;
  }
  return blitz >= MIN_MOVES || rapid >= MIN_MOVES;
}

// Action ladder. A threshold of 101 can never be reached by a 0..100 percent, so it disables that rung.
function act(pred: Pred, t: Thresholds): "auto-mark" | "report" | "none" {
  if (pred.percent >= t.mark) return pred.protectedAccount ? "report" : "auto-mark";
  if (pred.percent >= t.report) return "report";
  return "none";
}

export { queueAgain, hasEnoughEvidence, act };
export {};
