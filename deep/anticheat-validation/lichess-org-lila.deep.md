# lichess-org-lila (anticheat-validation, cell 6)

Donor: `/mnt/frankendom-donors/lichess-org-lila/modules/irwin/src/main/KaladinApi.scala` | Licence: AGPL-3.0 | Scala | symbol `KaladinApi.request/markOrReport` (verified: `request` at 63, `readResponses` at 80, `readResponse` at 96, `markOrReport` at 108).

## 1. Mechanism

- This is an outcome audit, not a per-action gate. It runs off the game path. A moderator (59-61), a tournament-leader sweep (208-209), a top-online sweep (211-212) or a cheat report (217-218) asks for a review; `request` (63-78) skips bots, then queues the suspect in a Mongo collection, and only if the suspect has enough recent rated move history. A new or re-queued entry is written with an upsert after the game history is indexed (73-74).
- Eligibility (`hasEnoughRecentMoves`, 168-203): the user's blitz plus rapid game count must be above 30 (203), and the rated games of the last six months (184) must add up to at least 1050 moves in blitz alone or in rapid alone, not combined (175); a game counts half its turns (196) and only blitz and rapid games count (194). The scan stops as soon as one speed reaches 1050 (197). The result is cached for an hour (177).
- Queue writes go through one shared async sequencer (512 entries, two-minute timeout, 32-37), which serialises all requests, not only those for one suspect; the suspect's existing entry is loaded inside it (39-40). An existing entry is passed to `queueAgain` and a new one is made with `KaladinUser.make` (65); what `queueAgain` allows is not read, so whether a queued suspect is refused or refreshed is unknown.
- An external scorer later writes a response (a percent and a note) to the queue entry. `readResponses` (80-94) takes up to 50 unread responses in response-time order, marks them read, and calls `readResponse` (96-106).
- `markOrReport` (108-136): at or above the mark threshold (read from a settings store, 126), a titled player gets a report filed under the Kaladin user with the reason "cheat" and the model's note (110-124, 131); an untitled player gets an automatic engine mark applied as the Kaladin user (133). At or above the report threshold only, a report is filed (135). Below both, nothing. `readResponse` also notifies the requesting moderators and records the score in a metric (101-102); a response with no score only records its error (103-106).
- Inputs: suspect, move history, external score. Outputs: queue entry, reports, automatic marks, moderator notifications.
- Tick: a request, or a periodic read of responses (the scheduler that calls `readResponses` is not read).

## 2. Key functions

- `KaladinApi.request`: `/mnt/frankendom-donors/lichess-org-lila/modules/irwin/src/main/KaladinApi.scala` lines 63-78. Eligibility gate, then a queue write per suspect.
- `KaladinApi.readResponses`: `/mnt/frankendom-donors/lichess-org-lila/modules/irwin/src/main/KaladinApi.scala` lines 80-94. Batch read of unread responses, marked read before handling.
- `KaladinApi.readResponse`: `/mnt/frankendom-donors/lichess-org-lila/modules/irwin/src/main/KaladinApi.scala` lines 96-106. Routes a response with a score to mark or report.
- `KaladinApi.markOrReport`: `/mnt/frankendom-donors/lichess-org-lila/modules/irwin/src/main/KaladinApi.scala` lines 108-136. Two thresholds: an automatic mark, or a report.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Eligibility by sample size before any review is queued | More than 30 blitz-plus-rapid games (line 203); 1050 moves in blitz or in rapid within six months (lines 169, 175, 184) (theirs) |
| Two-threshold action: high score marks, mid score reports | mark and report thresholds from settings (theirs, lines 30 and 126-135; values not read) |
| Batch read of outcomes, marked read before handling | batch of 50 (theirs, line 89) |
| Cached eligibility | one-hour cache, 1024 entries (theirs, lines 176-177) |
| Serialized per-subject writes | 512 queue, two-minute timeout (theirs, lines 32-37) |

## 4. TypeScript sketch

simplified: the sketch drops the bot exclusion, the shared sequencer, the queue-again rule, the history indexing, the six-month scan with early stop, the metrics, the moderator notification, and the report content (reason and note). `eligible` takes per-speed move counts and tests either one, as the donor does. `drainResponses` marks the whole batch read before acting, as the donor does with one bulk update. `decide` keeps the titled-player exception at the mark threshold.

```ts
// Licence: AGPL-3.0 (donor). CLEAN-ROOM sketch: written from the mechanism description, not a translation of donor lines.
interface Review { subject: string; score: number | null; note: string; read: boolean; }
interface Thresholds { mark: number; report: number; }

// Sample-size gate: review is queued only if the subject has enough recent games.
function eligible(fastGames: number, blitzMoves: number, rapidMoves: number, minGames: number, minMoves: number): boolean {
  return fastGames > minGames && (blitzMoves >= minMoves || rapidMoves >= minMoves);
}

// Read unread outcomes in order, mark them read first, then act on each.
function drainResponses(queue: Review[], batch: number, act: (r: Review) => void): number {
  const todo = queue.filter(r => !r.read && r.score !== null).slice(0, batch);
  for (const r of todo) r.read = true;
  for (const r of todo) act(r);
  return todo.length;
}

// Two thresholds: the higher one acts on the account, the lower one files a report.
function decide(score: number, t: Thresholds, titled: boolean): "mark" | "report" | "none" {
  if (score >= t.mark) return titled ? "report" : "mark";
  if (score >= t.report) return "report";
  return "none";
}
```

## 5. Lands in

- Frankendom target: NEW `origins/server/kill-audit.ts` (server side, not an engine gate): a post-hoc outcome audit over verified fights, run beside the existing anti-farm layer `src/net/duel-antifarm.ts` (its header: the verifier's result is the only input that counts, never a client claim) and the verifier `src/net/verify-duel.ts`. The pay point is `origins/server/mob-rewards.ts` (a verified creature kill pays inside one transaction). All on the VPS snapshot /root/work-k7 (not main); header comments read only.
- Parity-checklist row: 18 (loot roll and XP award; post-K item 3: rewards on the server) for the pay side, 19 (fight record and replay) for the evidence. Feature-map section: server-verified kills (audit as a second layer). Not an engine row.
- Reuse tag: rewrite-from-idea
- Brief rule served: 2 (engage is a state change; kills server-verified); rules 7-9 n/a

## 6. Gaps and risks

- The donor is post-hoc. It never refuses an action. Frankendom's ruling requires kills to be server-verified at the moment they happen (the encounter verifier re-simulates with server-held parameters). This donor adds an audit after the fact and does not implement that ruling.
- The score comes from an external model that is not in the donor repo (the response arrives in the queue entry). Frankendom would need its own rule or model; the two-threshold shape is the reusable part, and the thresholds are runtime settings (30, 126), not constants.
- The automatic mark is a sanction applied on a score (133). Frankendom has no such sanction; a sanction rule is a Lead and policy decision, and a pay hold (as anti-farm does) is a gentler form that fits the one ledger.
- Eligibility uses real-time chess move counts (169-196). A fight engine has no equivalent of a move count; the sample-size gate would use verified fights per account over a window, and the unit must be chosen by Lead.
- Per-suspect state sits in a document store with one global write queue (32-40); Frankendom's single shard can use one table with a unique key per account.
- Pit is a client only; the audit reads server records, not client state. MAX_ATTACKERS = 3 and one engine are unaffected.
- Not read: `KaladinUser` (queueAgain, make), `IrwinThresholds`, the scheduler that calls `readResponses`, and `ModApi.autoEngine`.
