# OpenDAoC-OpenDAoC-Core (live-ops-events-lore-delivery, cell 2)

Donor: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/ECS-Services/RolloverSchedulerService.cs` (with `PeriodicQuestService.cs`, `GameLoop.cs`, `CoreDatabase/Tables/DbScheduledRollover.cs`) | Licence: GPL-3.0 (repo `LICENSE`); the project's header template `gplheader.txt` says GPL version 2 or later; the donor file itself has no header (copyleft, clean-room) | C# | symbols `RolloverSchedulerService`, `PeriodicQuestService`

Checked: Read in full: `RolloverSchedulerService.cs` (213 lines), `PeriodicQuestService.cs` (81), `DbScheduledRollover.cs` (34), and the step registration in `GameLoop.cs` (150-175, the lines around 162). Read `GamePlayer.cs` 233-237 (property getter and setter only) and 7780-7790 (join path). Subscribers `HouseRentService` and `GravestoneService` seen by grep only (their callbacks not read). Not read: `RemoveFinishedQuests` (what counts as finished), the `PreviousLoginDate` setter path, `ClientService.GetPlayers`, `GameLoop.ExecuteForEach` (whether it runs in parallel), the `GameLoopTickPacer` pacing, and how `GameLoop` handles an exception thrown by a tick step. Searched for invasions, holidays and seasons (`grep -rli` over GameServer, CoreBase, CoreServer, CoreDatabase, sharedModules): no invasion or seasonal event system found; hits were weather, daily and weekly quest files, named mobs and the service above. Confidence: high on the rollover arithmetic and the login check (read in full). camera_scope: n/a.

## 1. Mechanism

Four boundary rules, one database row per rule, one tick that fires each due rule once, and a lazy check for players who were offline.

- Four intervals are registered in the constructor (RolloverSchedulerService.cs 24-33): hourly (next start of hour), daily (next midnight), weekly (next Monday, 7 days if the last one was a Monday), monthly (first of next month). Each is a `Func<DateTime, DateTime>` from the last rollover time to the next boundary.
- Startup (35-72): loads all stored `ScheduledRollovers` rows (35). For each interval, finds its row by key (41-48). If there is a row, `NextRollover` = boundary of the stored `LastRollover` (50-55). If there is none, it inserts a row stamped now (58-70). The trackers are then sorted by `NextRollover` (74).
- Tick (87-109), one call per game-loop step (`GameLoop.cs` 162). Trackers are sorted, earliest first (94). The loop breaks at the first tracker that is not yet due (100). Every due tracker runs once (103), even when several boundaries were missed; after that the list is re-sorted (107-108).
- Execute (167-187): save the new `LastRollover` to the database (169-170), set the in-memory `LastRollover` to the run time and `NextRollover` to the boundary after the run time (172-173), then run each subscribed callback in its own try block (175-186).
- Login check (`PeriodicQuestService.OnPlayerJoin`, 22-51): for each registered quest interval, if the player's `PreviousLoginDate` is before that interval's `GetLastRollover` (32), set the interval's bit in a mask (33). If any bit is set, remove finished quests of those types (39-50).
- Online players: the same rollover callback (`ResetQuests<T>`, 60-64) removes finished quests of type T from every online player (63; `ResetPlayerQuests<T>` 66-77 calls `RemoveFinishedQuests` 70). So an online player is reset at the boundary, and an offline player is reset on the next login.
- Quest registration: daily, weekly and monthly quest classes are bound to their interval (17-19). Each registration takes one bit (57), so up to 32 intervals (55).

## 2. Key functions

- `RolloverSchedulerService` constructor: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/ECS-Services/RolloverSchedulerService.cs` 15-75 (interval rules 24-33; load and create 35-72).
- `RolloverSchedulerService.Tick`: same file, 87-109.
- `RolloverSchedulerService.ExecuteRollover`: same file, 167-187.
- `RolloverSchedulerService.GetLastRollover`: same file, 123-134.
- `PeriodicQuestService.OnPlayerJoin`: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/ECS-Services/PeriodicQuestService.cs` 22-51.
- `PeriodicQuestService.ResetQuests<T>` and `ResetPlayerQuests<T>`: same file, 60-77.
- `DbScheduledRollover` table `ScheduledRollovers`: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/CoreDatabase/Tables/DbScheduledRollover.cs` 6-32 (LastRollover, and RolloverIntervalKey unique).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants and rules |
|---|---|
| Boundary function per interval, from the last stamp | Hourly: start of next hour (24). Daily: next midnight (25). Weekly: next Monday, 7 if already Monday (29-30). Monthly: 1st of next month (33) |
| One persisted timestamp per interval key | Unique key per interval (DbScheduledRollover 23); enum values Hourly=1, Daily=2, Weekly=3, Monthly=4 (`IntervalKey`, 194-201) |
| Sorted due list; stop at first future item | `_trackers.Sort` by NextRollover (191); break at first not due (100) |
| Missed periods collapse into one run | `NextRollover = CalculateNextRollover(now)` (173), so a long outage fires each interval once on the next tick |
| Lazy reset on login | `login < GetLastRollover` (32), mask of intervals (33) |
| Up to 32 interval kinds | `1u << _registrations.Count` (57), comment (55) |
| Callback isolation | try/catch per callback (177-185) |
| Clock | `DateTime.Now`, local time (63, 91). No UTC |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's boundary rules, sorted due list, single fire per missed period, per-callback isolation, and lazy login check. It changes three things: it uses UTC (the donor uses local `DateTime.Now`), it advances the timer before the save, and it contains a failing save (the donor saves first, with no try, at 169-170, so a throw stops the advance at 172-173). It omits: the database row create-or-load and the `Hourly`/`Monthly` key enum, `ForceExecute` and `ForceExecuteAll`, the server log calls, the per-player reset loop, quest bit masks (replaced by an interval list), and the `PreviousLoginDate` source.

```ts
// Licence: repo LICENSE is GPL-3.0; project header template gplheader.txt says GPL-2.0-or-later. Donor file itself has no header. clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Interval = "hourly" | "daily" | "weekly" | "monthly";
const INTERVALS: Interval[] = ["hourly", "daily", "weekly", "monthly"];

// Next boundary strictly after `last`, in UTC (Frankendom choice; donor uses local DateTime.Now).
function nextBoundary(kind: Interval, last: Date): Date {
  const y = last.getUTCFullYear();
  const m = last.getUTCMonth();
  const d = last.getUTCDate();
  switch (kind) {
    case "hourly":
      return new Date(Date.UTC(y, m, d, last.getUTCHours() + 1));
    case "daily":
      return new Date(Date.UTC(y, m, d + 1));
    case "weekly": {
      const monBased = (last.getUTCDay() + 6) % 7; // Monday = 0
      return new Date(Date.UTC(y, m, d + (7 - monBased))); // 7 when already Monday
    }
    case "monthly":
      return new Date(Date.UTC(y, m + 1, 1));
  }
}

interface Tracker {
  kind: Interval;
  last: Date;
  next: Date;
  callbacks: Array<() => void>;
}

class RolloverScheduler {
  private trackers: Tracker[];

  // stored: last rollover per interval from the database (undefined on first run).
  constructor(
    stored: Partial<Record<Interval, Date>>,
    now: Date,
    private save: (kind: Interval, at: Date) => void,
  ) {
    this.trackers = INTERVALS.map((kind) => {
      const last = stored[kind] ?? now; // first run stamps now
      return { kind, last, next: nextBoundary(kind, last), callbacks: [] };
    });
    this.sortTrackers();
  }

  subscribe(kind: Interval, cb: () => void): void {
    const t = this.trackers.find((x) => x.kind === kind);
    if (t) t.callbacks.push(cb);
  }

  // Called once per game tick. Trackers are sorted, so stop at the first one not yet due.
  tick(now: Date): void {
    let fired = false;
    for (const t of this.trackers) {
      if (now.getTime() < t.next.getTime()) break;
      this.fire(t, now);
      fired = true;
    }
    if (fired) this.sortTrackers();
  }

  private fire(t: Tracker, now: Date): void {
    // Fix for donor defect: advance the timer before the save, and contain a failing save,
    // so one bad database write cannot stall this tracker or the ones after it.
    t.last = now;
    t.next = nextBoundary(t.kind, now);
    try {
      this.save(t.kind, now);
    } catch {
      // log and continue
    }
    for (const cb of t.callbacks) {
      try {
        cb();
      } catch {
        // log and continue; one bad callback does not stop the others
      }
    }
  }

  lastRollover(kind: Interval): Date | undefined {
    return this.trackers.find((x) => x.kind === kind)?.last;
  }

  private sortTrackers(): void {
    this.trackers.sort((a, b) => a.next.getTime() - b.next.getTime());
  }
}

// Lazy reset for a player who was offline: any interval rolled over after their previous login.
function intervalsToResetOnLogin(previousLogin: Date, sched: RolloverScheduler): Interval[] {
  return INTERVALS.filter((k) => {
    const last = sched.lastRollover(k);
    return last !== undefined && previousLogin.getTime() < last.getTime();
  });
}

export {};
```

Typecheck: copied to `/tmp/LO001-opendaoc-rollover.ts` on the VPS; `npx -p typescript tsc --noEmit --strict --target es2020` exit 0.

## 5. Lands in

- TARGET `origins/server/periodic-resets.ts` (new file, proposed): the server-side boundary table for daily, weekly and monthly contracts, with the lazy login check. It runs as a server tick step, next to the other tick steps.
- Parity-checklist row 18 (loot roll and XP award; contract rewards come from there), sub-line "server tick: fixed step, input intake, per-tick NPC budget" (post-K item 3). The rollover itself is a tick step (GameLoop 162), which is the sub-line's territory. No row covers calendar resets, so this is the nearest fit.
- Reuse tag: rewrite-from-idea (GPL-3.0 repo; clean-room only)
- Brief rule served: one ledger (the last-rollover table is server state; the login check reads the server's last-login value); server-verified state; no client clock is trusted.

## 6. Gaps and risks

- GPL-3.0 (repo) and GPL-2.0-or-later (header template): clean-room only. The sketch is written from the mechanism.
- Defect (save before advance; no catch): `ExecuteRollover` saves the record at 169-170 and advances `NextRollover` at 173. If the save throws, the advance never runs. The same tracker is then due on every tick and blocks the trackers after it, because the loop breaks only on a future item and throws leave the loop. Whether the game loop catches the throw was not read. Fix: advance first, then contain the save (the sketch does this).
- Defect (clock): all boundaries come from `DateTime.Now` (63, 91), so a server's local zone and its DST changes move the daily and weekly resets. Fix: compute boundaries in UTC (the sketch does this) and store UTC.
- Risk (spike on the boundary): the rollover callbacks reset every online player in one tick (63, 70). The per-player loop goes through `GameLoop.ExecuteForEach` (63; whether that runs in parallel was not read). With many players, the boundary tick can be heavy. Fix: spread the per-player reset over several ticks, with the login check as the backstop.
- Design note (not a defect): a stored LastRollover is the run time, not the boundary (172). Login checks compare against it (32), so a player who logged in before a late run is still reset. The next boundary is computed from the boundary rule, so there is no drift.
- Design note: a long outage fires each due interval once, not once per missed period (173). That fits quest resets, but a Frankendom contract that pays per period would need a count.
- Frankendom gap (server-verified, one ledger): the reset reads `PreviousLoginDate`, which the donor keeps on the player object (GamePlayer 233). Frankendom must keep the last-login and the last-rollover in the server ledger, not the client or the zone.
- Frankendom gap (what is reset): the donor clears finished quests of one type (70). Its `RemoveFinishedQuests` semantics were not read. Frankendom needs an explicit rule: contract progress resets, the reward ledger does not.
- Not found in the donor: invasion events, seasonal events, holiday content, and a codex or lore-delivery system. The donor has no event-to-player delivery path that I could read (the grep hits were weather, quests, and named mobs).

Best transferable idea: keep one persisted last-rollover time per interval, fire each due interval once per tick from a sorted list, and reset a returning player lazily by comparing their previous login with that time.
Decision (proposed): adapt — keep the boundary table, sorted due list and lazy login check for daily and weekly contracts, in UTC, with the timer advanced before a contained save; reject the local-clock boundary and the unbounded per-tick reset of every online player.
Acceptance: a server test with the daily boundary at 00:00 UTC, where a player last online 23:59 the day before sees the daily contract reset on login, an online player resets once at 00:00, and a throwing daily save still lets the weekly boundary fire on its day.

Reuse tag: rewrite-from-idea (GPL-3.0 repo; clean-room only)
Brief rule served: one ledger; server-verified state; zones as data not applicable; tick step per row 18 sub-line.
