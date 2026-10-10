# pmbstyle-L2Solo (server-tick-netcode, cell 1)

Donor: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Bot/Population/BackgroundJobRegistry.js` | Licence: Apache-2.0 (LICENSE file, "Version 2.0, January 2004"; README line 290 "licensed under the Apache 2.0 license") | JavaScript (Node) | symbol `Registry.tick`

Checked: Read in full: BackgroundJobRegistry.js (160 lines), BackgroundWorkGovernor.js (277 lines), PopulationMetrics.js 150-172 and 492-496 (event-loop lag sampler), PopulationService.js 1545-1620 (registry set-up) and 1636-1670 (clan action admission), tests/test_background_job_registry.js. Not read: the other two governor callers (about PopulationService.js 1678 and 1750, seen only in grep); the call site of startBackgroundJobRegistry (1076, its surrounding function not read); `Config.eventLoopSampleMs` value; ClanSimulationConfig values; the 40 ms throttle in ColdSimulationCoordinator.js 1613. Confidence high on the scheduler and governor order of operations; medium on how lag is sampled in production. camera_scope not applicable. Important: this is the bot-population server's background job scheduler, not player netcode. No packet sync, input buffering, rollback or interpolation appears in anything I read.

## 1. Mechanism

Two cooperating pieces run on the Node server event loop.

(a) Fixed-step job scheduler. `start` gives each registered job its first due time (start time plus offset) and then runs one immediate tick (BackgroundJobRegistry.js 54-63). A `setInterval(tickMs)` calls `tick` (60); the timer is unref'd so it does not keep the process alive (61). `tick(now)` skips a job until `now` reaches `nextDueAt` (76), works out how many due times have passed, `dueCount = floor((now - nextDueAt) / interval) + 1` (77), and advances `nextDueAt` by that whole count (78). So a stalled server runs each job once, not once per missed interval. If the job is still running, its due passes go to `deferred` and nothing starts (81-85): a job never overlaps itself. Otherwise passes beyond the first go to `coalesced` (86-89), the job is marked in flight (90), and `run` is called from a microtask (94-95). `inFlight` is cleared in `finally` (111-115). An error goes to `onError` and does not stop the registry (105-110).

(b) Admission governor (BackgroundWorkGovernor.js). `admit` runs in a fixed order (144-201). First it reads pressure: event-loop lag and database queue depth, from the live metrics when the caller does not pass them (102-127). Then it rolls the window if the window is at least `windowMs` old or the clock went backwards (92-100), which bumps `generation` and zeroes `usedMs`. Then: bypass if the governor is disabled (152); lag gate, defer with `event_loop_lag` if lag is at or above the abort value (170-171); DB gate, defer with `database_queue` if pending is above the queue max (173-176); resource lock, defer with `resource_busy` if the named resource is already held (177); cap, 50 ms when a real player is protected and 250 ms otherwise (179, 86-90); if the remaining budget is below the minimum, defer with `budget_exhausted` (180-181); otherwise grant `max(minimum, min(requested, floor(available)))` (183), add it to `usedMs` (193) and take the resource lock (194). The minimum is `min(requested, minimumBudgetMs)` (146).

`complete(lease, {durationMs})` (203-221) frees the resource lock (207). If the lease belongs to the current window, it replaces the grant with the measured time: `usedMs = usedMs - grant + actual` (208-210). An overrun is counted when the actual time is larger than the grant (216-218).

Caller (PopulationService.js). The `clan_actions` job is registered with `run: () => this.nextClanActionAt > Date.now() ? skipped : this.resolveClanActions()` (1560-1567). `resolveClanActions` requests a budget of 80 ms idle or 20 ms when the player is protected (code fallbacks at 1636-1637), a minimum of `min(10, requested)` (1643), and the resource `sqlite-heavy` (1641). It then calls `complete` with the measured duration in `finally` (1666).

Lag source. `startEventLoopMonitor` (PopulationMetrics.js 150-172) runs a `setInterval(Config.eventLoopSampleMs)`. Each sample sets `lagMs = measuredAt - expectedAt` (161-163) and schedules the next expected time from the measured time (170). `currentEventLoopLag()` returns that last sample (494-495).

Tick driving: a fixed-interval timer with no accumulator and no variable step. Missed timer fires are not replayed; the due-count formula in (a) catches up in one run per job.

## 2. Key functions

- `Registry.tick`: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Bot/Population/BackgroundJobRegistry.js` 71-117. Due check, catch-up count, deferral, coalescing, run and settle.
- `Registry.start`: same file, 54-63. First due times, first tick, the interval timer.
- `Registry.register`: same file, 22-52. Interval floor at tickMs (28), offset floor at 0 (32).
- `admit`: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Bot/Population/BackgroundWorkGovernor.js` 144-201. Gate order and grant.
- `complete`: same file, 203-221. Refund-or-charge with the measured time.
- `refreshWindow`: same file, 92-100. Window roll and generation bump.
- `startEventLoopMonitor`: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Bot/Population/PopulationMetrics.js` 150-172. The lag sampler.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Fixed-step timer; each job first due at start + offset | Tick default 250 ms, floor 50 ms (BackgroundJobRegistry.js 10; PopulationConfig.js 65; PopulationService.js 1548) |
| Catch-up count in one run; in-flight passes deferred, never overlapped | None (arithmetic, 77-85) |
| Goal and clan continuation interval = max(tick, governor window), floor 100 ms, default window 1000 ms | theirs: PopulationService.js 1579-1581; PopulationConfig.js 66 |
| Per-window millisecond budget, 250 ms idle, 50 ms when a real player is protected | theirs: PopulationConfig.js 67-68; BackgroundWorkGovernor.js 86-90 |
| Lag gate: defer while the last event-loop sample is at or above 120 ms | theirs: PopulationConfig.js 71; BackgroundWorkGovernor.js 170-171 |
| DB queue gate: 8 when idle, 0 when a player is protected | theirs: PopulationConfig.js 69-70; BackgroundWorkGovernor.js 173-175 (not useful to Frankendom, no DB in the fight) |
| Charge the measured time at completion, not the grant | None (208-210) |
| Clan job request 80 ms idle / 20 ms protected, minimum 10 ms | theirs: PopulationService.js 1636-1643 (fallbacks in code; the ClanSimulationConfig values were not read) |

The 5:1 ratio between the idle and protected caps is the donor's design choice: real-player protection cuts background work to a fifth.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (lag gate, DB gate, resource lock, budget, then grant) and the catch-up and in-flight deferral in the scheduler. It omits the error hook, the per-job metrics and snapshot, the disabled-governor bypass, the stage and progress statistics, the overrun counter, and the `realPlayers` input. Lag and DB-pending values are passed in as numbers instead of being sampled. The clock is passed in instead of read from `Date.now`. The two classes are separate here; in the donor, the clan job calls the governor from inside its own run function.

```ts
// Licence: Apache-2.0 (donor, permissive). Shape only: written from the described mechanism, not a copy of the donor lines.

type JobOutcome = { skipped?: boolean } | void;

interface Job {
  name: string;
  intervalMs: number;   // floored to the tick
  offsetMs: number;     // first due time after start
  nextDueAt: number;
  inFlight: boolean;
  started: number;
  deferred: number;     // due passes that arrived while the job was still running
  coalesced: number;    // extra due passes folded into one run after a stall
  run: () => Promise<JobOutcome>;
}

// Fixed-step scheduler: one timer calls tick(); a job never overlaps itself.
class TickScheduler {
  private jobs: Job[] = [];
  constructor(private readonly tickMs: number) {}

  register(name: string, intervalMs: number, offsetMs: number, run: () => Promise<JobOutcome>): void {
    this.jobs.push({
      name,
      intervalMs: Math.max(this.tickMs, Math.floor(intervalMs)),
      offsetMs: Math.max(0, Math.floor(offsetMs)),
      nextDueAt: 0,
      inFlight: false,
      started: 0,
      deferred: 0,
      coalesced: 0,
      run,
    });
  }

  start(now: number): void {
    for (const job of this.jobs) job.nextDueAt = now + job.offsetMs;
    this.tick(now);
  }

  tick(now: number): void {
    for (const job of this.jobs) {
      if (now < job.nextDueAt) continue;
      const dueCount = Math.floor((now - job.nextDueAt) / job.intervalMs) + 1;
      job.nextDueAt += dueCount * job.intervalMs;
      if (job.inFlight) { job.deferred += dueCount; continue; }
      if (dueCount > 1) job.coalesced += dueCount - 1;
      job.inFlight = true;
      job.started += 1;
      Promise.resolve()
        .then(() => job.run())
        .catch(() => undefined)
        .finally(() => { job.inFlight = false; });
    }
  }
}

// Per-window time budget with lag and DB-queue gates. Player-protected mode gets a smaller cap.
interface GovernorConfig {
  windowMs: number;          // 1000
  idleBudgetMs: number;      // 250
  playerBudgetMs: number;    // 50
  lagAbortMs: number;        // 120
  idleDbQueueMax: number;    // 8
  playerDbQueueMax: number;  // 0
}
interface Pressure { lagMs: number; dbPending: number; playerProtected: boolean; }
interface Lease { id: number; generation: number; budgetMs: number; resource: string | null; }
type Admission =
  | { ok: true; budgetMs: number; lease: Lease }
  | { ok: false; reason: 'event_loop_lag' | 'database_queue' | 'resource_busy' | 'budget_exhausted' };

class WorkGovernor {
  private windowStart = 0;
  private generation = 0;
  private usedMs = 0;
  private nextId = 1;
  private busy = new Map<string, number>(); // resource -> lease id

  constructor(private readonly cfg: GovernorConfig) {}

  admit(now: number, p: Pressure, requestedMs: number, minimumMs: number, resource: string | null): Admission {
    if (this.windowStart === 0 || now < this.windowStart || now - this.windowStart >= this.cfg.windowMs) {
      this.windowStart = now;
      this.generation += 1;
      this.usedMs = 0;
    }
    if (p.lagMs >= this.cfg.lagAbortMs) return { ok: false, reason: 'event_loop_lag' };
    const dbMax = p.playerProtected ? this.cfg.playerDbQueueMax : this.cfg.idleDbQueueMax;
    if (p.dbPending > dbMax) return { ok: false, reason: 'database_queue' };
    if (resource !== null && this.busy.has(resource)) return { ok: false, reason: 'resource_busy' };
    const capMs = p.playerProtected ? this.cfg.playerBudgetMs : this.cfg.idleBudgetMs;
    const availableMs = Math.max(0, capMs - this.usedMs);
    const minimum = Math.min(requestedMs, minimumMs);
    if (availableMs < minimum) return { ok: false, reason: 'budget_exhausted' };
    const budgetMs = Math.max(minimum, Math.min(requestedMs, Math.floor(availableMs)));
    const lease: Lease = { id: this.nextId++, generation: this.generation, budgetMs, resource };
    this.usedMs += budgetMs;
    if (resource !== null) this.busy.set(resource, lease.id);
    return { ok: true, budgetMs, lease };
  }

  // Replace the granted budget with the measured time, but only if the window has not rolled over.
  complete(lease: Lease, actualMs: number): void {
    if (lease.resource !== null && this.busy.get(lease.resource) === lease.id) this.busy.delete(lease.resource);
    if (lease.generation === this.generation) {
      this.usedMs = Math.max(0, this.usedMs - lease.budgetMs + actualMs);
    }
  }
}

export {};
```

## 5. Lands in

- TARGET `src/fight/tick.ts` (new module): the server's fixed-step loop. The governor half (lag gate, per-window budget, protected cap) sits next to it as the per-tick budget for background passes such as zone NPC work. The fight step itself is not gated by it.
- Parity-checklist row 18 (loot roll and XP award), sub-line "server tick: fixed step, input intake, per-tick NPC budget" (post-K item 3). Row 5 (controls and input intake) is the other half of that sub-line and is not covered by this donor.

- Reuse tag: adapt-allowed (Apache-2.0: code may be adapted with the licence notice kept; the sketch is written from the mechanism)
- Brief rule served: 1 (one engine, one fixed step; background work yields to the fight); rule 7 (zones as data) for the per-zone interval and offset

## 6. Gaps and risks

- Not player netcode. This donor schedules bot and economy jobs. Frankendom's server tick still needs input intake, snapshots and server-verified kills from elsewhere; this note supplies only the scheduling and budget shape.
- Clock: the default clock is wall time, `Date.now` (BackgroundJobRegistry.js 11). The governor resets its window only when the clock goes backwards (BackgroundWorkGovernor.js 94). Frankendom should drive the tick from a monotonic clock and test a clock jump.
- Lag is the last sample only (PopulationMetrics.js 163, 494-495). One spike closes the gate for the next pass, and the donor has no smoothing or hysteresis in the governor. The 40 ms throttle exists in the donor (PopulationConfig.js 62) but the governor does not read it; it is used in ColdSimulationCoordinator.js 1613, which was not read. For the fight, the gate must never stop the fight step: only background passes wait. MAX_ATTACKERS = 3 stays a fight rule that the engine enforces, not a budget.
- Overrun leak: `complete` only charges the window when the lease is from the current generation (BackgroundWorkGovernor.js 208). A job that runs across a window roll is not charged, so it can use the next window's budget too. Frankendom must charge every pass, or cap a pass by its own deadline.
- The numbers are a bot-population budget on a 250 ms tick. A 50 ms protected cap per 1000 ms window is 5 percent of wall time. A 60 Hz fight step needs its own budget. Do not copy the numbers; set them as zone data or engine constants after measuring the fight tick.
- Zones as data: the per-job interval and offset (PopulationService.js 1579-1593) are the shape to copy for zone population passes (parity row 23). The interval is zone data; the window and protected cap are engine constants.
- One ledger and server-verified kills: nothing here touches kills or loot. The donor's job results are not a ledger.
- Pit as client: the Pit is a client and does not use this scheduler. The sketch is server-only.

Best transferable idea: Let background work take a leased slice of a per-second millisecond budget, cut the slice while a player is in a fight, charge the measured time when the work ends, and never let a job overlap itself.
Decision (proposed): adapt - the shape (no-overlap fixed-interval jobs that catch up in one run, and a budget that yields to the protected player) fits the per-tick NPC budget; the donor numbers, the DB and SQLite gates, and the bot job names do not transfer.
Acceptance: a server test in which a 90 ms zone NPC pass is charged 90 ms, a second pass in the same 1000 ms window is deferred as budget_exhausted while a fight is protected (50 ms cap), and the fight step still runs on its fixed tick while the lag gate is closed.
