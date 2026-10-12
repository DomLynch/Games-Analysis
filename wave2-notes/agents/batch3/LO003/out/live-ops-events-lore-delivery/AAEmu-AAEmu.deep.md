# AAEmu-AAEmu (live-ops-events-lore-delivery, cell 2)

Donor: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Core/Managers/GameScheduleManager.cs` | Licence: unclear (README "Licensing information" names LGPL-3.0; the repo also ships `LICENSE.GPL` (GPL-3.0 text) and `LICENSE.MIT` (MIT, Rain0Ash 2019); no per-file header in the file) | C# (.NET) with SQLite game data | symbol `GameScheduleManager.CheckData` (with `CheckPeriodStatus`, `GetCronExpression`, the NPC and doodad spawner gates)

Checked: category_no 32 (live-ops-events-lore-delivery), list cell 2 of 3. Read in full: `GameScheduleManager.cs` (1-599), the four schedule model files (`GameSchedules`, `GameScheduleSpawners`, `DayOfWeek`, `ScheduleItem`), `SchedulesGameData.cs` lines 1-120 (of 129; the tail not read), `DoodadSpawner.cs` 255-300 and 355-412, `NpcSpawner.cs` 275-300, 1018-1050, 1065-1080, 1126-1161. Callers checked by grep across the donor: `GetPeriodStatusNpc` and `GetPeriodStatusDoodad` have callers; `GetRemainingTime`, `GetCronRemainingTime`, `CheckSpawnerInGameSchedules`, `GetGameScheduleQuestsData` and `CheckData0` have no callers in this donor. Not read: `DoodadSpawner.cs` 300-355 and 412 onward; the body of `TaskManager2.CronSchedule` (only its signature, line 120); NCrontab. The schedule rows themselves are not on the box: the game data is a SQLite database that is not in the donor, and `SQL/aaemu_game.sql` has no `game_schedules` table, so the real values of weekday, times and dates are unknown. Confidence: high on the code paths; medium on how often live data hits the weekday-only case described in section 6 (data not read). camera_scope n/a.

## 1. Mechanism

- Data first. A schedule row (`game_schedules`) holds: `day_of_week_id` (1 = Sunday .. 7 = Saturday, 8 = any day), `start_time` and `start_time_min` (hour and minute of the window start), `end_time` and `end_time_min`, and optional start and end dates (`st_year`, `st_month`, `st_day`, `ed_year`, `ed_month`, `ed_day`; 0 = unset). Spawners and doodads link to rows through `game_schedule_spawners` and `game_schedule_doodads` (loaded at `SchedulesGameData.cs` 60-99). Quests are loaded the same way (100-119) but never gated (see section 6).
- Status of one row, `CheckData` (321-363). The clock is UTC (323). The weekday is converted to the custom enum (328). The row is "started" when the date bounds allow today (the time of day is compared only on the first bound date, 346) and the weekday matches or is 8 (350). The row is "ended" only when an end date is set and now is past it, at the end time (357).
- Status over the rows of one spawner or doodad, `CheckPeriodStatus` (162-193). A row is in progress when started and not ended (174). Order of precedence: any row in progress gives InProgress (188-189); otherwise any ended row gives Ended (191); otherwise NotStarted. The lookup returns NotFound when the id has no rows (`GetPeriodStatusNpc` 137-138, `GetPeriodStatusDoodad` 151-152).
- NPC spawn gate, `IsSpawnScheduled` path (1021-1047). InProgress sets RespawnDenied and IsSpawnScheduled and returns true (1026-1030). NotFound falls back to the template's own hour window (1050). NotStarted and Ended return false (1036-1042).
- Doodad spawn gate (`DoodadSpawner.cs`). NotStarted: the next start is taken as a cron string and registered as a task (378-394). NotFound: spawn now (369-377). InProgress: spawn (407-412).
- Doodad despawn gate (`DoodadSpawner.cs` 264-297). InProgress: the cron of the end is taken (287) and a despawn task is registered (297). NotStarted: no despawn (279-282).
- Next-switch times. `GetCronExpression` (408-598) builds a six-field cron string for the start or the end. The weekday is written as the cron day-of-week, with 8 written as `*` (594). Its result passes through a replace of `?` with `*` before it is returned (585).
- Tick. There is no per-frame loop for schedules. Each spawner checks its status when its spawn logic runs, and the cron tasks fire at the computed next time. The re-check frequency beyond these call sites was not traced.

## 2. Key functions

- `CheckData`: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Core/Managers/GameScheduleManager.cs` 321-363. One row, one UTC clock.
- `CheckPeriodStatus`: same file, 162-193. Aggregate over rows.
- `GetCronExpression`: same file, 408-598. Cron for the next start or end; the weekday and date branches.
- `GetDoodadCronRemainingTime` / `GetCronRemainingTime`: same file, 221-237 and 195-219. Last row wins (see section 6).
- `GetRemainingTime`: same file, 239-260 (keeps the minimum; no caller).
- NPC gate: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Game/NPChar/NpcSpawner.cs` 1021-1047; fallback window 1065-1080 and wrap helper 1149-1161.
- Doodad gates: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Game/DoodadObj/DoodadSpawner.cs` 264-297 (despawn) and 362-412 (spawn).

## 3. Numbers vs mechanism

| Quantity | Formula | Donor values (range) | file:line |
|---|---|---|---|
| Weekday | cron weekday = enum - 1 (Sunday 0 .. Saturday 6); 8 = any day (`*`) | 1..8 | GameScheduleManager.cs:328, 422-432, 594; DayOfWeek.cs:5-12 |
| Window start | start = start_time (h) x 60 + start_time_min | 0..23 h, 0..59 min | GameScheduleManager.cs:339 |
| Window end | end = end_time (h) x 60 + end_time_min | 0..23 h, 0..59 min | GameScheduleManager.cs:340 |
| Date bounds | 0 = unset; end date set is the only way to reach Ended | 0 or a real date | GameScheduleManager.cs:331-337, 357 |
| In-window test (dated row) | time of day tested only on the first and last date | see table row above | GameScheduleManager.cs:346-347 |
| In-window test (undated weekly row) | weekday only; time of day not tested | open all day on the weekday | GameScheduleManager.cs:346, 350 |
| Aggregate | InProgress if any row in progress; else Ended if any ended; else NotStarted; NotFound if no id | precedence 3 > 2 > 1 | GameScheduleManager.cs:162-193 |
| Doodad despawn cron | cron of the end (false), registered as a task | end row | DoodadSpawner.cs:287, 297 |
| Doodad spawn cron | cron of the start, registered as a task | start row | DoodadSpawner.cs:383, 394 |
| NPC fallback window | open while the game clock is between start and end hours (float); no window = always | template hours | NpcSpawner.cs:1067-1074, 1080 |
| Midnight wrap | if start > end: open when t >= start or t <= end | wrap | NpcSpawner.cs:1151-1158 |
| Sentinel guard | compared against `0 0 0 0 0 ?` (never returned, see section 6) | none | DoodadSpawner.cs:288, 328, 384, 452 |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's rule shape: one row with a weekday, a start and an end minute, and optional first and last dates; the status of several rows is "in progress beats ended beats not started". It changes three things: (1) the time of day is tested on every day the row covers, not only on the bound dates and not at all when no date is set (the donor's `CheckData` at 346-350); (2) it computes the status from one `now` (UTC) and returns the status, not cron strings; (3) it adds a `soonestMs` helper, where the donor's doodad cron path keeps only the last row (233). It omits the cron builder and its zero-field output, the `0 0 0 0 0 ?` guard, the NCrontab parse, the NPC game-clock fallback (1065-1080), the spawner and doodad tasks, the quest schedules, and the RespawnDenied and IsSpawnScheduled flags. A weekday window that crosses midnight is tested against the current day's weekday, which is what the donor does too.

```ts
// Licence: unclear (donor README names LGPL-3.0; repo ships LICENSE.GPL and LICENSE.MIT; no per-file header). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
// Times are UTC. One clock: `now` is passed in.

export type PeriodStatus = "NotFound" | "NotStarted" | "InProgress" | "Ended";

export interface YMD {
  y: number;
  m: number; // 1-based month
  d: number; // day of month
}

export interface ScheduleRow {
  weekday: number | null; // 0 = Sunday .. 6 = Saturday; null = any day
  startMinute: number;    // minute of the UTC day the window opens, 0..1439
  endMinute: number;      // minute of the UTC day the window closes; less than startMinute wraps midnight
  from: YMD | null;       // first date the row applies (null = no lower bound)
  to: YMD | null;         // last date the row applies (null = no upper bound)
}

function dayMs(d: YMD): number {
  return Date.UTC(d.y, d.m - 1, d.d);
}

// Minute-of-day inside [start, end]; when end is before start the window wraps midnight.
export function inWrappedWindow(minuteOfDay: number, start: number, end: number): boolean {
  if (start <= end) return minuteOfDay >= start && minuteOfDay <= end;
  return minuteOfDay >= start || minuteOfDay <= end;
}

// One row. The time of day is applied on every day the row covers (the donor tests it only on the
// first and last date, and skips it entirely when no date range is set).
export function rowStatus(row: ScheduleRow, now: Date): PeriodStatus {
  const nowMs = now.getTime();
  const fromMs = row.from ? dayMs(row.from) + row.startMinute * 60000 : -Infinity;
  const toMs = row.to ? dayMs(row.to) + row.endMinute * 60000 : Infinity;
  if (nowMs >= toMs) return "Ended";

  const minuteOfDay = now.getUTCHours() * 60 + now.getUTCMinutes();
  const weekdayOk = row.weekday === null || now.getUTCDay() === row.weekday;
  if (nowMs >= fromMs && weekdayOk && inWrappedWindow(minuteOfDay, row.startMinute, row.endMinute)) {
    return "InProgress";
  }
  return "NotStarted";
}

// Several rows on one spawner or doodad: any row in progress wins, then any ended, else not started.
export function periodStatus(rows: ScheduleRow[], now: Date): PeriodStatus {
  if (rows.length === 0) return "NotFound";
  let anyEnded = false;
  for (const r of rows) {
    const s = rowStatus(r, now);
    if (s === "InProgress") return "InProgress";
    if (s === "Ended") anyEnded = true;
  }
  return anyEnded ? "Ended" : "NotStarted";
}

// Soonest boundary among the rows' candidate times (ms). Keeps the minimum; the donor's cron path keeps the last row.
export function soonestMs(candidatesMs: number[]): number {
  return candidatesMs.length === 0 ? Infinity : Math.min(...candidatesMs);
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` run on the VPS on the file above (copied to /tmp): exit 0, no errors.

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population owner). A zone event row (weekday, start and end, optional first and last date) gates a spawn group, and several rows on one zone spawner resolve by the aggregate rule. Parity-checklist row 23 (zone population: spawn caps, respawn, despawn). Server tick sub-line: "server tick: fixed step, input intake, per-tick NPC budget" (post-K item 3). The next switch is one server-tick event per zone, not a cron string per spawner.
- today: `origins/server/world-spawns.ts` (Frankendom repo file; not read in this pass, so its current contents are unverified).
- Reuse tag: rewrite-from-idea (licence unclear; clean-room only)
- Brief rule served: zones as data (the row fields are zone data); one engine (one schedule check on the server tick, one clock); server-verified (the spawn gate is decided on the server).

## 6. Gaps and risks

- Licence unclear: clean-room, shape only. The sketch is written from the mechanism and is not a line-by-line translation.
- Defects found in the donor (idea kept, fix stated):
  - Time of day is skipped for undated and first/last-date rows. `CheckData` tests the time only on the bound dates (346-347) and never when no date is set (346 short-circuits on `startDate == DateTime.MinValue`). A weekly row with no dates is therefore open for the whole weekday (350), but the cron path for the same row does include the hour (531-534). The two disagree. fix: test the time of day on every day the row covers (sketch `rowStatus`).
  - Dead sentinel guard. The check against `0 0 0 0 0 ?` (DoodadSpawner.cs 288, 328, 384, 452) can never match, because `GetCronExpression` rewrites `?` to `*` (585) before it returns (587). fix: reject empty and all-zero rows explicitly at load, not by a string compare.
  - Last row wins for doodad cron. `GetDoodadCronRemainingTime` overwrites the cron on every row (233), so a doodad with several rows gets only the last row's boundary. `GetRemainingTime` (253-255) keeps the minimum. The doodad path (287, 327, 383, 451) uses the cron version. fix: take the soonest boundary across rows (`soonestMs`).
  - Zero day and month in weekly cron. For a weekly row without dates, `BuildCronExpression(0, startTimeMin, startTime, stDay, stMonth, dayOfWeek)` (534) writes 0 for day and month (590-595). Day 0 and month 0 are outside standard cron ranges. Whether NCrontab or the task scheduler accepts this was not run. fix: write `*` for unset day and month.
  - Two clocks. Schedule rows use UTC (323). The NPC template window uses the in-game clock in hours (1069-1070). fix: one clock on the server; the zone event uses the same clock as the countdown.
  - Latent throw. `CheckSpawnerScheduler` indexes the dictionary directly (97). It has no caller in this donor. fix: `TryGetValue`.
  - Comment mismatch: the comment at 585 says `*/1`, the code writes `*`. Cosmetic.
- Built but unused: `GetRemainingTime`, `GetCronRemainingTime`, `CheckSpawnerInGameSchedules`, `CheckData0`, `GetGameScheduleQuestsData` have no callers. The donor computes time-to-open and never shows it. Quest gating is a TODO (296).
- Undated rows never end. `Ended` needs an end date (357), so an open-ended weekly row repeats every week forever. Pacing needs an explicit end date or a run count on each event row.
- Data not read. The schedule values are not on the donor box (SQLite game data absent). Whether live rows are weekday-only with times is unknown; the defect in section 6 matters only if they are.
- Lore: no narrative text, codex, nameplate or kill-card code was found in this file. The donor's achievement seasons (`AchievementSeasonCategory`) were seen by name only (not read). The legends-rule is not engaged: no story text was taken.

Fold-in (HUD, accessibility): the donor can compute the time until a window opens (`GetRemainingTime`, `GetCronRemainingTime`) but nothing calls it, so a player never learns why a spawn is absent. Frankendom's zone map should show a plain text line such as "Opens in 1 h 12 min" (words, not an icon), built from the same status the spawn gate uses.

Fold-in (progression pacing): because an undated row never ends (357), a weekly event repeats for ever unless the row has a last date. Frankendom should give each timed zone event either a last date or a run count, so content has a planned end, and tune the window length against the play session length (the donor has no such rule).

Reuse tag: rewrite-from-idea (licence unclear; clean-room only)
Brief rule served: zones as data; one engine (one schedule check on the server tick); server-verified

Best transferable idea: One zone-event row (weekday, start and end minute, optional first and last date) gates a spawn group, and several rows on one spawner resolve by "in progress beats ended beats not started".

Decision (proposed): adapt - keep the row shape and the aggregate rule as zone data for timed invasions and events, but apply the time of day on every day the row covers, use one clock, and compute the next switch once per zone instead of one cron string per spawner.
Acceptance: A zone row set to Friday 20:00 to 22:00 UTC with no date range opens its spawn group only between 20:00 and 22:00 each Friday: a server test asserts Friday 19:59 closed, 20:00 open, 21:59 open, 22:01 closed and Saturday 20:30 closed; a row with a last date reports Ended after that date and never reopens.


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
Errors: All checked claims hold: CheckData 321-363 (UTC 323, weekday enum +1 at 328, time-of-day only on first bound date 346 and never when startDate==MinValue, ended needs end date 357), CheckPeriodStatus 162-193 precedence, NotFound at 137-138/151-152, last-row-wins at 233 (also 209) vs min in GetRemainingTime 253-255, dead sentinel '0 0 0 0 0 ?' at DoodadSpawner 288/328/384/452 vs Replace('?','*') at GameScheduleManager 585, NPC gate 1021-1047, fallback window 1065-1080 with wrap helper 1149-1161, doodad spawn gate 362-412, despawn 264-297, TODO quests at 296, CheckSpawnerScheduler indexer at 97, BuildCronExpression 590-596 (8 -> '*'), DayOfWeek enum Sunday=1..Invalid=8. Licence: README says LGPL-3.0-or-later wording; LICENSE.GPL and LICENSE.MIT exist; note's 'unclear' is honest. Sketch and acceptance (Fri 20:00-22:00 UTC cases) are consistent and would pass.
Missed: Doodad spawn Ended branch (DoodadSpawner 413+) not described; note says 412 onward not read (honest). Donor repo has AGENTS.md (treated as data, not followed).
