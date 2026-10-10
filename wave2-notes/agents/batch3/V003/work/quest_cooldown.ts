// Licence: AGPL-3.0 (donor). Clean-room sketch of the described mechanism (solve cooldown + max solves + bit field), not a translation.
// clean-room
export interface QuestRule {
  minDeltaS: number;      // seconds between solves (zone data)
  maxSolves: number;      // -1 = unlimited (zone data)
}

export interface QuestRecord {
  lastSolvedUnixS: number;
  solves: number;         // count of solves; also used as a bit field by the donor
}

export type SolveCheck =
  | { ok: true }
  | { ok: false; reason: "max-solves" | "cooldown" | "unknown-quest"; remainingS: number };

// Engine constant: global scale on every cooldown (the donor's quest_mindelta_rate, default 1).
const COOLDOWN_SCALE = 1;

export function canSolve(
  rule: QuestRule | undefined,
  rec: QuestRecord | undefined,
  nowUnixS: number,
): SolveCheck {
  if (!rule) return { ok: false, reason: "unknown-quest", remainingS: Number.POSITIVE_INFINITY };
  if (!rec) return { ok: true };                         // never solved: no gate
  if (rule.maxSolves > -1 && rec.solves >= rule.maxSolves)
    return { ok: false, reason: "max-solves", remainingS: Number.POSITIVE_INFINITY };
  const nextAt = rec.lastSolvedUnixS + Math.floor(rule.minDeltaS * COOLDOWN_SCALE);
  if (nowUnixS >= nextAt) return { ok: true };
  return { ok: false, reason: "cooldown", remainingS: nextAt - nowUnixS };
}

// Records a solve. Mirrors the donor's Update(): the first solve writes solves = 1;
// later solves are refused silently once the max is reached.
export function recordSolve(rule: QuestRule, rec: QuestRecord | undefined, nowUnixS: number): QuestRecord {
  if (!rec) return { lastSolvedUnixS: nowUnixS, solves: 1 };
  if (rule.maxSolves > -1 && rec.solves >= rule.maxSolves) return rec;
  return { lastSolvedUnixS: nowUnixS, solves: rec.solves + 1 };
}

// Example: a 1-hour quest with 2 solves allowed.
const rule: QuestRule = { minDeltaS: 3600, maxSolves: 2 };
let rec: QuestRecord | undefined = undefined;
const t0 = 1_000_000;
rec = recordSolve(rule, rec, t0);
const early = canSolve(rule, rec, t0 + 60);       // cooldown, 3540 s left
rec = recordSolve(rule, rec, t0 + 3600);
const capped = canSolve(rule, rec, t0 + 10_000);  // max-solves
void early; void capped;
export {};
