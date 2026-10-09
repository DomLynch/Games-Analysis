# pmbstyle-L2Solo (parties-guilds-chat, cell 18)

Donor: /mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Clan/ClanActionService.js | Licence: Apache-2.0 | JavaScript | symbol ClanActionService.resolveBatch (input line 560 verified: `resolveBatch`). Note: this is the donor's simulated bot-clan action queue (clan goals, equipment, market), not a player guild or party roster; what carries over is the budgeted claim-and-settle worker.

## 1. Mechanism
- resolveBatch (560-642) is a budgeted worker pass over queued clan actions. Its inputs are options.budgetMs (at least 1) and options.limit (clamped to 1..100, lines 562-563); each falls back to config (ClanSimulationConfig.js lines 34, 38, 39: resolve budget 80 ms, batch size 8, lease 120000 ms). If the feature is disabled it returns an all-zero summary at once (561).
- Setup runs before the budget starts: bootstrap (566), scheduleSupplies (580), refreshQueueStats (581). The file comment (582-585) says these reads are admission overhead, not clan work, and that starting the budget earlier made a live queue claim and release the same action forever.
- The deadline is now plus budgetMs. The loop runs while attempted is below the limit (the limit is at most 100 per call). Before each step it checks the deadline and stops with budgetStopped if passed.
- Each pass claims one action with a lease (`Database.claimClanAction`, 594); lease recoveries reported by the claim are counted (599). When no action is claimed, the loop breaks (601). If the deadline passed during the claim, the claim is released unstarted (610-616, conditional on the expected attempt and lease expiry) and the loop stops with budgetStopped (623-625).
- Otherwise resolveAction (427-550) runs the action with the deadline. Its result is either deferred (released with availableAt in the future, per deferredRetryDelay, 436-461) or settled as succeeded or failed (463-470). A release or settle that loses its conditional check is counted as a conflict and returned with ok false (447-450, 471-474); an already-settled (idempotent) result returns early (477). For a newly settled action, follow-up work then runs (479-509): a title review (except after a titles action), then one of: nothing for titles, supplies and production actions; the next plan after a level-up; a retry after a market miss in player-managed market mode; a plan after a market miss; or a review delay from `reviewDelayFor` (143-153). An exception inside the action is caught and settles the action as failed (519-538).
- Output (635-638): summary { bootstrap, attempted, claimed, resolved, released, succeeded, failed, leftRunning, budgetStopped, queue }, where leftRunning and queue come from a final refreshQueueStats. The batch counts an action as failed when its result status is failed or its ok is false (632), which includes release and settle conflicts.
- Tick: the caller that invokes resolveBatch was not read. The pass itself has no internal timer.

## 2. Key functions
- resolveBatch: /mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Clan/ClanActionService.js, lines 560-642. Budgeted claim-resolve loop with a release-if-late step.
- resolveAction: /mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Clan/ClanActionService.js, lines 427-550. Runs execute, then defers, settles, and schedules follow-ups; catch path settles as failed.
- deferredRetryDelay: /mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Clan/ClanActionService.js, lines 155-181. Maps retryable or pending results to a delay with caps of 5000 and 1000 ms.
- workDone: /mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Clan/ClanActionService.js, lines 133-141. Decides whether a result counts as productive per action type.
- reviewDelayFor: same file, lines 143-153. Next-review delay: retry delay on failure, equipment review for equipment plans, 0 if productive, else goal review or retry.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
| Fixed deadline checked before each claim, with a release for a claim that came in late | Resolve budget 80 ms (theirs, ClanSimulationConfig.js line 34) |
| Lease on each claim, recovered when it expires | Lease 120000 ms (theirs, config line 39); recovery itself is in Database, not read |
| Defer with a retry delay, capped | Planning deferral cap 5000 ms (theirs, ClanActionService.js line 158); LLM and titles pending cap 1000 ms (lines 165, 168); retry delay 60000 ms (config line 40) |
| Bounded batch per pass | Batch size 8 default (config line 38), 100 maximum per call (ClanActionService.js line 563) (theirs) |

## 4. TypeScript sketch
Lift. The budgeted claim, late-release and tally order is lifted from resolveBatch (Apache-2.0). Metrics, stage timers and the donor's clan logic are removed. The database calls are passed in as an interface.

simplified: the sketch keeps the loop order (limit check, deadline check, claim, late release, execute, tally) but drops the disabled return, bootstrap/supplies/queue-stats setup and the final queue refresh, the `claimed`, `released`, `resolved` and `leftRunning` counters (the sketch's summary has only attempted, succeeded, failed, budgetStopped), lease-recovery and queue-age metrics, and the `expectedAttempt`/`expectedLeaseUntil` conditions on release. The sketch's `execute` stands for the whole of resolveAction (defer, settle, idempotent return, follow-ups, exception-to-failed), which the donor does inside resolveAction, and its late check before the claim is the donor's loop-top deadline check.

```ts
// Licence: Apache-2.0
// Lifted from /mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Clan/ClanActionService.js (resolveBatch, lines 560-642); metrics and stage timers removed.

type Action = { id: string; attempt: number; leaseUntil: number };

interface Queue {
  claim(leaseMs: number): Promise<{ action: Action | null }>;
  release(a: Action): Promise<{ ok: boolean }>;
  // stands for resolveAction: it releases a deferred action (future availableAt) or settles it itself
  execute(a: Action, deadlineAt: number): Promise<{ ok: boolean; status?: 'succeeded' | 'failed' }>;
}

export async function resolveBatch(q: Queue, opts: { budgetMs: number; limit: number; leaseMs: number }) {
  const limit = Math.max(1, Math.min(100, Math.floor(opts.limit)));
  const deadlineAt = Date.now() + Math.max(1, opts.budgetMs);
  const summary = { attempted: 0, succeeded: 0, failed: 0, budgetStopped: false };

  while (summary.attempted < limit) {
    const late = Date.now() >= deadlineAt;
    if (late) { summary.budgetStopped = true; break; }
    const { action } = await q.claim(opts.leaseMs);
    if (!action) break;
    if (Date.now() >= deadlineAt) { await q.release(action); summary.budgetStopped = true; break; }
    const r = await q.execute(action, deadlineAt);
    summary.attempted += 1;
    if (r.status === 'succeeded') summary.succeeded += 1;
    if (r.status === 'failed' || r.ok === false) summary.failed += 1;
  }
  return summary;
}
```

## 5. Lands in
- Frankendom target: NEW `origins/server/work-queue.ts` (a budgeted claim, lease and settle worker for server jobs such as reward settlement; does not exist today). Neighbouring server modules `origins/server/mob-rewards.ts` and `origins/server/quest-advance.ts` exist on the VPS snapshot /root/work-k7 (not main); their contents were not read.
- Parity-checklist row: 18 (loot roll and XP award; post-K item 3, the server tick that unifies rewards) for the queue-and-settle shape. The clan simulation itself is not a Frankendom feature.
- Reuse tag: adapt
- Brief rule served: (category default, not per-cell) 10 (zone copies); rules 7-9 n/a

## 6. Gaps and risks
- The claim, lease recovery and idempotent settle all live in `Database` (claimClanAction, releaseClanAction, resolveClanAction), which was not read. The pass is only as safe as those calls. Frankendom's one-ledger ruling needs the same conditional-on-attempt-and-lease release and an idempotent settle as one ledger write.
- The caller of resolveBatch and its timer were not read, so the tick rate is unknown.
- The budget is wall-clock (`Date.now()`), so the number of actions per pass changes with load. The donor counts overruns (545-547); Frankendom's 60 Hz fight loop must not share a thread with this kind of pass.
- reviewDelayFor, deferredRetryDelay and the follow-ups carry donor-specific clan logic (titles, markets, LLM planning). None of that maps to a Frankendom system.
- Release and settle conflicts are counted as failed actions in the batch summary (632), so a lost lease looks like a failure; a Frankendom reward queue should report them separately.
- `execute` (the body before line 424) was not read, so what an action does inside it is outside this note.
- Pit is a client only and zones are data; a work queue is a server module. Server-verified kills and one engine are untouched; MAX_ATTACKERS = 3 does not apply.
