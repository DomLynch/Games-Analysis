# clockworklabs-SpacetimeDB (server-tick-netcode, cell 5)

Donor: `/mnt/frankendom-donors/clockworklabs-SpacetimeDB/crates/core/src/host/scheduler.rs` | Licence: Business Source License 1.1 (Clockwork Laboratories; LICENSE.txt in the donor root): production use limited (one instance, no "Database Service"); Change Date 2031-10-08, then AGPL-3.0 with a linking exception. Treat as clean-room, shape only | Rust | symbol `SchedulerActor::run` / `next_interval_tick_after`

Checked: The hint file `crates/engine/src/update.rs` is database schema-migration code (function list read via grep: update_database, auto_migrate_database, create_table_from_def...), not a tick loop. The real tick mechanism is the reducer scheduler `crates/core/src/host/scheduler.rs`, read in full lines 1-1142 (including its unit tests). `ScheduleAt` is in `crates/lib/src/scheduler.rs` (lines 21-65 read). The commit-and-broadcast step was read only at `crates/core/src/subscription/module_subscription_actor.rs` 2037-2090 (the first part of the function); the rest of the fan-out (query evaluation per subscriber, the websocket send side in `crates/client-api/src/routes/subscribe.rs`) was NOT read. There is no hard-coded "game tick" in this database: a module author schedules a repeating reducer, and that is the tick. How the module host serialises reducers on one instance (`call_scheduled_reducer`, module_host.rs) was not read; I only know the scheduler hands each due call to the module host. Confidence: high on the timing and rescheduling rules, low on the end-to-end netcode.

## 1. Mechanism

- Model: a tick is a row in a "scheduled table" with a `ScheduleAt` column, either `Interval(duration)` or `Time(timestamp)` (lib/src/scheduler.rs 21-27). The scheduler turns each row into a pending queue entry and calls the named reducer when it is due. A repeating game tick is an `Interval` row.
- One actor, one loop: `SchedulerActor::run` is a `select!` over three sources: new schedule messages, the next due queue entry, and finished in-flight calls (scheduler.rs 354-367). Due entries are not run inline: they are pushed onto an in-flight set of futures (409), so a slow tick does not block popping other due items.
- Pending queue: a delay queue (a timer wheel) keyed by a map from schedule id to queue key; scheduling the same id again removes the old entry first, so a job never has two pending entries (465-478). On startup the queue is rebuilt from the database tables (108-145), after draining any message already sent, to avoid duplicates (98-105). Delays beyond about 2.18 years are refused rather than allowed to panic the timer (190, 239).
- Running a due tick: open a serializable transaction (660); look up the schedule row; if the row is gone the schedule was cancelled, so skip (987-990); if the row's hash differs from the hash recorded when it was queued, the entry is stale, so skip (992-995). The reducer is told a timestamp that is the later of the intended time and now (1046-1052). Lateness = actual start minus intended time, recorded as a metric, with a trace log if over 30 ms (724-744, 196).
- After the reducer finishes, the schedule row is handled (782-792): a one-shot row is deleted and the deletion is committed and broadcast in the same step (898-906); an interval row stays and is handed back for rescheduling (819-823). For procedures (async functions) the row is handled BEFORE the call, because a half-run procedure must not be retried (624-636).
- Drift-free interval: `next_interval_tick_after(last_intended_at, interval, now)` returns the first tick after `now` that lies on the grid anchored at the last intended time: `ticks = floor(elapsed / interval) + 1` (or 1 if no time has elapsed), result `last_intended + ticks x interval` (838-859). So a late tick does not shift the grid, and missed ticks are skipped, not replayed (the tests check: last 1000, interval 100, now 1350 gives 1400; now exactly on a boundary 1300 gives 1400, i.e. strictly after now) (1096-1112). The next entry is only queued after the current call completes (handle_completion 413-452), so one interval row never overlaps itself.
- Commit and broadcast: committing a transaction takes a read lock on the subscription list BEFORE commit, so subscribers do not get duplicate updates (module_subscription_actor 2049); the broadcast payload is built from the committed writes (2064); a failed transaction rolls back and sends no table update (2067-2072).
- Tick shape: variable arrival, fixed grid. There is no accumulator that replays missed steps; the grid is wall-clock based with skip-ahead.

## 2. Key functions

- `SchedulerActor::run`: `/mnt/frankendom-donors/clockworklabs-SpacetimeDB/crates/core/src/host/scheduler.rs` 345-369. The select loop.
- `next_interval_tick_after`: same file 838-859. The grid maths.
- `call_scheduled_reducer_until_done` and `call_scheduled_reducer_with_tx`: same file 650-699 and 747-801. Open tx, stale/cancel checks, run, then reschedule.
- `delete_scheduled_function_row`: same file 808-824. One-shot delete or interval hand-back anchored at the intended time.
- `insert_scheduled_queue_item`: same file 465-478. Replace-by-id.
- `ModuleSubscriptions::commit_and_broadcast_event`: `/mnt/frankendom-donors/clockworklabs-SpacetimeDB/crates/core/src/subscription/module_subscription_actor.rs` 2041 (first 50 lines read). Commit then fan-out.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Interval jobs re-anchored on the last intended time, skipping missed ticks | None; interval comes from the row |
| Replace-by-id: one pending entry per job | None |
| Stale-entry check: hash of the job row at queue time vs now | Hash of the row (mechanism) |
| Lateness metric (actual minus intended) with a warn threshold | 30 ms warn (theirs, scheduler.rs 196) |
| Run in a transaction, then commit and broadcast once | Isolation level Serializable (theirs, 660) |
| Rebuild pending queue from stored schedule rows at startup | None |
| Max delay guard | about 2.18 years (theirs, 190) |

## 4. TypeScript sketch

simplified: single-threaded and synchronous, so there is no in-flight set (jobs run inline inside `poll`); it keeps the replace-by-id queue, the version check (stands in for the row hash), the lateness log, and the skip-missed-ticks grid, and re-anchors from the intended time. It omits transactions, commit and broadcast, procedures, the startup rebuild from storage, and the delay limit. The clock is injected so tests can drive time.

```ts
// Licence: BSL 1.1 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Job {
  id: string;
  intervalMs: number | null; // null = one-shot
  intendedAt: number;        // ms, the time this run was supposed to start
  version: number;           // bumped when the job row changes; stale queue entries are dropped
  run: (intendedAt: number, lateMs: number) => void;
}

// first tick strictly after `now`, anchored at the last intended time; missed ticks are skipped
function nextTickAfter(lastIntended: number, intervalMs: number, now: number): number {
  if (intervalMs <= 0) return lastIntended + intervalMs;
  const elapsed = now - lastIntended;
  const ticks = elapsed <= 0 ? 1 : Math.floor(elapsed / intervalMs) + 1;
  return lastIntended + ticks * intervalMs;
}

interface QueueEntry { id: string; dueAt: number; version: number; }

class TickScheduler {
  private jobs = new Map<string, Job>();
  private pending = new Map<string, QueueEntry>(); // one pending entry per job id
  private inFlight = new Set<string>();
  readonly lateWarnMs = 30;
  lateLog: { id: string; lateMs: number }[] = [];
  constructor(private readonly clock: () => number) {}

  schedule(job: Job): void {
    this.jobs.set(job.id, job);
    this.pending.set(job.id, { id: job.id, dueAt: job.intendedAt, version: job.version }); // replaces any pending entry
  }

  cancel(id: string): void {
    this.jobs.delete(id);
    this.pending.delete(id);
  }

  // call from the host loop; `now` in ms. Returns how many jobs ran.
  poll(now: number): number {
    let ran = 0;
    for (const [id, entry] of [...this.pending]) {
      if (entry.dueAt > now || this.inFlight.has(id)) continue;
      this.pending.delete(id);
      const job = this.jobs.get(id);
      if (job === undefined || job.version !== entry.version) continue; // cancelled or stale
      const lateMs = Math.max(0, now - entry.dueAt);
      if (lateMs > this.lateWarnMs) this.lateLog.push({ id, lateMs });
      this.inFlight.add(id);
      try {
        job.run(entry.dueAt, lateMs);
      } finally {
        this.inFlight.delete(id);
      }
      ran += 1;
      if (job.intervalMs === null) {
        this.jobs.delete(id);
      } else {
        const next = nextTickAfter(entry.dueAt, job.intervalMs, this.clock());
        job.intendedAt = next;
        this.pending.set(id, { id, dueAt: next, version: job.version });
      }
    }
    return ran;
  }
}

export { TickScheduler, nextTickAfter, Job };
```

Typechecked on the VPS: `npx -p typescript tsc --noEmit --strict --target es2020` returned no errors (file with `export {}` appended).

## 5. Lands in

- TARGET `src/fight/tick.ts` (new module, fixed-step driver for the server world; called from `origins/server/world-spawns.ts` and the zone runtime): server tick: fixed step, input intake, per-tick NPC budget. Parity-checklist row 18 / post-K item 3 (server tick has no row of its own).
- today: not checked.
- Reuse tag: rewrite-from-idea (BSL 1.1; clean-room only)
- Brief rule served: server tick (row 18 / post-K item 3); lateness metric supports the per-tick NPC budget

## 6. Gaps and risks

- BSL 1.1: not open source until 2031 and the grant forbids offering a "Database Service". Shape only, nothing copied.
- This is a job scheduler, not a game loop: it has no input intake, no world step, no per-tick budget. What transfers is the timing discipline (grid anchored to the intended time, skip missed ticks, lateness metric, replace-by-id, stale check). Input intake and NPC budgeting are not in this donor.
- Skip-ahead vs replay: the donor never replays missed ticks. For a fast duel that is a ruling to make: skipping keeps the server alive after a stall but makes a stalled fight lose steps. If the fight sim must be deterministic from the record (row 19), steps must be indexed by tick number rather than wall clock; the donor's anchor-based grid could provide the tick number (`ticks`) but does not.
- One tick row per zone (zones as data) would give each zone its own interval and its own lateness numbers; the donor handles many independent schedule rows in one actor, which supports that, but I did not read how load is shed when many fire at once.
- Server-verified kills: the donor runs each tick in a transaction and broadcasts only after commit. Frankendom should keep the same order (settle the step, then publish), so the client never shows a kill the server has not committed.
- The lateness warn threshold (30 ms) is for a database; a 20-30 Hz fight tick has a 33-50 ms step, so Frankendom's threshold should be a fraction of the step, as a zone data field.
- Not read: the websocket send path and backpressure, the module-host reducer serialisation, the query evaluation per subscriber. Do not cite this note for lag handling or rollback; the donor mechanism read here is server-side only.
