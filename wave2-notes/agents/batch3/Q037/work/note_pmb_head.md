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

