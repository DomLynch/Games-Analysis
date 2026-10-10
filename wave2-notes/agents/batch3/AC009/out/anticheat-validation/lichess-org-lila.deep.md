# lichess-org-lila (anticheat-validation, cell 6)

Donor: `/mnt/frankendom-donors/lichess-org-lila/modules/irwin/src/main/KaladinApi.scala` (with `KaladinUser.scala`, `IrwinThresholds.scala`, `Env.scala`, `modules/core/src/main/lilaism/LilaLibraryExtensions.scala`, `modules/report/src/main/ReportApi.scala`) | Licence: GNU AGPL v3 (LICENSE file: "GNU AFFERO GENERAL PUBLIC LICENSE Version 3, 19 November 2007") | Scala | symbol `KaladinApi` (`request`, `readResponses`, `markOrReport`, `hasEnoughRecentMoves`), `KaladinUser.queueAgain`

Checked: Read in full: `KaladinApi.scala` (218 lines, the hint file), `KaladinUser.scala` (75), `IrwinThresholds.scala` (36), `IrwinRequest.scala` (16). Read the scheduling block `Env.scala` 30-80 (the Kaladin jobs), the `>>&` definition in `LilaLibraryExtensions.scala` 186-196, and the report event in `ReportApi.scala` 91 (grep). Sibling `IrwinApi.scala` was grep-only. Not read: `modApi.autoEngine` and `reportApi.create` (other modules), the scorer that writes `KaladinUser.Response` (not in the files I searched: I listed every file name containing "kaladin" on the donor and found no model or worker), the Mongo index definitions (only a comment). Confidence: high on the queue, evidence gate, response loop and threshold ladder (every line used was read); high on `>>&` (short-circuit, read in its definition). Scope, stated plainly: this is the human-review and automatic-mark pipeline around a cheat score. The score itself is not in this donor. camera_scope: not applicable.

## 1. Mechanism

Pipeline from suspicion to action, in the order the code runs:

1. Intake, four sources, each with a fixed priority (KaladinUser.scala 51-56): top online players (priority 10, Env.scala 57-59, every 15 min, top 50); tournament leaders (priority 20, Env.scala 41-51, every 5 min, the top 2 percent of each tournament's standing, capped at 20 per tournament); a cheat report (priority 30, the event at ReportApi.scala 91, subscribed at KaladinApi.scala 217); a moderator (priority 100, `modRequest`, KaladinApi.scala 59).
2. Request gate (KaladinApi.scala 63-80): bot accounts are skipped (`noBot`, line 63). Then the evidence gate `hasEnoughRecentMoves` (168-204): a cheap pre-check first, more than 30 blitz plus rapid games (203); only then a cached count (1 hour, 177) of rated blitz and rapid moves in the last six months (184), where a game's moves are its turns divided by two (196). The player needs at least 1050 moves in one speed (169, 175). If the gate fails, the code counts `insufficientMoves` and queues nothing (76). If it passes, it indexes the player's insight data (73) and upserts the queue record (74).
3. Re-queue rule (KaladinUser.scala 20-33, `queueAgain`): if the entry has not started and the new asker has a higher priority, the entry only takes the higher priority (23). Otherwise a mod request, or an entry queued more than a week ago, re-queues it fresh and clears the start time and the response (28, with the reset in the same branch). Anything else is ignored.
4. Serial work: all queue writes pass through one async sequencer with a cap of 512 entries and a two-minute timeout (KaladinApi.scala 32-34), so they run one at a time within the process.
5. Response loop: scheduled every 5 seconds after an 83-second start delay (Env.scala 65-66). It reads up to 50 unread responses (89), marks them `read` in one update (92), and only then acts on them one at a time (93). Marking first means each response is acted on at most once.
6. Action ladder (`markOrReport`, KaladinApi.scala 126-135). `percent` is the activation times 100, truncated (KaladinUser.scala 62). If `percent >= mark`: a titled account gets a report (128-131); any other account gets an automatic engine mark through `modApi.autoEngine` (133). Else, if `percent >= report`, a report is filed (135). Else nothing.
7. Thresholds are settings, not code. The setting is `kaladinThresholds` with the pair (report, mark). The default is (101, 101) (IrwinThresholds.scala 15), and the setting help text says 101 disables it (35). Since a percent cannot exceed 100, 101 turns that rung off.
8. The whole Kaladin path is off unless `kaladin.enabled` is set (Env.scala 39). Mods who asked are notified when their request's response is read (the `notification` object, KaladinApi.scala 138-150).

## 2. Key functions

- `KaladinApi.request` and `hasEnoughRecentMoves`: `/mnt/frankendom-donors/lichess-org-lila/modules/irwin/src/main/KaladinApi.scala` 63-80 and 168-204. The gate, the queue write, and the cheap-first count.
- `KaladinApi.readResponses` and `readResponse`: the same file, 80-106 (the update at 92, the sequential act at 93). Mark-then-act.
- `KaladinApi.markOrReport`: the same file, 108-136. The ladder.
- `KaladinUser.queueAgain`: `/mnt/frankendom-donors/lichess-org-lila/modules/irwin/src/main/KaladinUser.scala` 20-33 (`recentlyQueued` at 20, `queueAgain` at 22-33).
- Schedule: `/mnt/frankendom-donors/lichess-org-lila/modules/irwin/src/main/Env.scala` 39-68.
- Short-circuit operator: `/mnt/frankendom-donors/lichess-org-lila/modules/core/src/main/lilaism/LilaLibraryExtensions.scala` 190-191.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Ranked intake queue with priorities, so a mod request outranks a report, a report outranks a tournament leader, and a tournament leader outranks a top-online sweep | Priorities 100 / 30 / 20 / 10 (theirs, KaladinUser.scala 51-56) |
| Evidence gate before any score: a cheap count first, then the real count, cached | Pre-check more than 30 blitz plus rapid games (theirs, KaladinApi.scala 203); 1050 moves in one speed (theirs, 169); six-month window (theirs, 184); 1-hour cache (theirs, 177) |
| Re-ask rule: a higher-priority ask lifts an unstarted entry; a stale entry re-queues after one week | One week (theirs, KaladinUser.scala 20) |
| Bounded serial queue with a timeout | Cap 512, timeout 2 min (theirs, KaladinApi.scala 33-34) |
| Mark-then-act batch: read flag first, act once | Batch 50 (theirs, 89); start delay 83 s, period 5 s (theirs, Env.scala 65) |
| Two-rung ladder on one score, human route for protected accounts | Thresholds are settings; default 101 = off (theirs, IrwinThresholds.scala 15, 35) |
| Score as a whole percent, truncated | `(activation * 100).toInt` (theirs, KaladinUser.scala 62) |
| Tournament sweep: top 2 percent per tournament, at most 20 | 2 percent, cap 20 (theirs, Env.scala 49, 51); period 5 min (theirs, 41) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's re-queue rule, the evidence gate (cheap check first, then the move count, floor of turns over two, either speed reaching the minimum) and the action ladder (mark rung first, protected accounts to a human, then the report rung). It omits: the Mongo upsert and read, the insight indexing, the mark-then-act batch and the response loop, the notification of the requesting mods, the serial actor and its timeout, the bot skip, the moderator's identity, the cache, and the scorer. The thresholds are passed in as values, not read from settings.

```ts
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
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/ac009-lila-ladder.ts), exit 0.

## 5. Lands in

- TARGET `origins/server/flag_ladder.ts` (new): the flag pipeline (queue, evidence gate, action ladder) as server code. It is not part of `src/fight`; the engine's kill rule stays server-verified and needs no score.
- Parity-checklist row 19 (fight record / replay). This is the closest row, because the evidence this pipeline reads is a record of a player's moves, which is a fight record for us. No row in 1-23 covers a flag or ban pipeline; say so plainly, and treat row 19 as a loose fit.
- Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only; shape of the pipeline, not the code and not the model)
- Brief rule served: server-verified kills (the ladder only applies to suspicion that the engine did not already refuse); one ledger (each action is one record)

Best transferable idea: Before any suspicion score is used, require enough recorded play to score, route anything that would cost a player to a human when the account is protected, and act on each response at most once by marking it read before acting, with thresholds stored as data that can be switched off above 100.
Decision (proposed): adapt — take the evidence gate, the priority queue and the protected-account route, but not the model or the automatic mark; Frankendom's kills are server-verified, so the engine refuses most cheating outright, and only a deterministic signal should ever act without a human.
Acceptance: A server test with a suspect scored 75 and thresholds report=60, mark=90 files a report and no automatic action; a protected account scored 95 gets a report, not an automatic action; a player below the minimum fight records is counted as insufficient and not queued; and a response batch is marked read before any action runs.

## 6. Gaps and risks

- Licence: AGPL-3.0, so clean-room only. The sketch is written from the mechanism; nothing is translated line by line.
- The score is not in this donor. `KaladinUser.Response` carries a `Pred` written by something outside these files. I did not find the writer, so this donor shows the pipeline around a detector, not the detector. Do not read it as proof that the detector works.
- At most once, not at least once: the response batch is marked read (KaladinApi.scala 92) before each response is acted on (93). A crash between the two loses the action and nothing repeats it. If Frankendom copies this, the action and the read mark need one write, or the action must be idempotent.
- Automatic action is real: an account at or above the mark rung gets `modApi.autoEngine` (133), which is an automatic punishment path. Frankendom should not auto-ban on a statistical score. Our rung should be a flag for a human, except a deterministic server rejection (for example an impossible kill the engine refused), which is not a score at all.
- The evidence gate counts rated moves in two speeds. Frankendom has no move count; its equivalent would be a count of recorded fights (and kills, hits) per player in a window. That needs its own minimum, set as data.
- Thresholds are per account type and per model, and they live in settings with a 101 off switch (IrwinThresholds.scala 15, 35). Frankendom's rule that zones are data would put thresholds in zone data only if they differ by zone; a flag threshold is more likely an engine constant.
- The queue is serial and in one process (KaladinApi.scala 32-34). With several game nodes, two nodes can queue the same account; the donor does not handle that across processes.
- Notifications reach only the moderators who asked (KaladinApi.scala 138-150). Frankendom's one-ledger rule means every flag and action needs one record that any reviewer can see.
- Titled accounts always go to a human (131). Frankendom's analogue would be protected or verified accounts; the rule is the same shape and worth keeping.
- The off switch is a value outside the score range (101). Use the same convention (a value no score can reach) so a rung can be disabled without a code change.
