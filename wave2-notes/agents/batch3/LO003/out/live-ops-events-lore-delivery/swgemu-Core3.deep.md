# swgemu-Core3 (live-ops-events-lore-delivery, cell 1)

Donor: `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/managers/gcw/GCWManagerImplementation.cpp` | Licence: AGPL-3.0 (COPYING read: GNU Affero General Public License, Version 3, 19 November 2007) | C++ (Engine3 server) with Lua config | symbol `GCWManagerImplementation::refreshExpiredVulnerability` (with `startVulnerability`, `endVulnerability`, `scheduleVulnerabilityStart` / `End`, `checkVulnerabilityData`)

Checked: category_no 32 (live-ops-events-lore-delivery), list cell 1 of 3. Read in full: `startVulnerability` (973-1004), `endVulnerability` (1007-1047, through the schedule call), `scheduleVulnerabilityStart` (1076-1093), `scheduleVulnerabilityEnd` (1097-1117), `refreshExpiredVulnerability` (1122-1181), `checkVulnerabilityData` (1184-1212), `isBaseVulnerable` (1240-1247), `CheckGCWTask.h` (whole file), `gcw_manager.lua` lines 1-8 and 98, `GCWManager.idl` constructor lines 147-177. Only the countdown lines of `getVulnerableStatus` were read (line 1227). Confidence: high on the window mechanism and its order of operations; medium on what it means as a lore or event feature, because this donor's window is a base-siege flag, not a story event. Not read: the engine `Time` class (not in this tree; the sign of `miliDifference()` is inferred from the call sites: a negative value means the target is in the future), `Task::schedule` internals, `performGCWTasks` body (332-400, only the sweep's start and end), the base placement path (625-650, read only in part). Lore search: `lore`, `codex`, `backstory` gave no hits in `src/server/zone/managers` or `objects/player`; `journal` hits are quest code (not read). `nameplate` was not searched. camera_scope n/a.

## 1. Mechanism

- A recurring, server-timed window in which a player base can be attacked, with a countdown shown to players. Each base stores three absolute times (last start, next start, window end) and a state (VULNERABLE, INVULNERABLE, SHUTDOWNSEQUENCE). Start and end are one-shot timer tasks set to the absolute time. Nothing checks the window every frame.
- Order of operations as the code runs:
  - (a) Open. `startVulnerability` (973) moves the last start to the stored next start (984), spawns the base's defences and terminals, and, only if the base is overt (PvP flag), schedules the end task (1000-1001).
  - (b) Close. `endVulnerability` (1007) returns at once if the base is not overt (1008). Otherwise it takes the stored next start (1020), sets last start to it (1022), then adds one period while the next start is in the past (1024-1025). It then sets next start (1028), sets the window end to next start plus duration (1029-1030), sets state INVULNERABLE (1031), and schedules the next start task (1047).
  - (c) Timers. `scheduleVulnerabilityStart` (1076) takes the signed difference between the stored next start and now (1085-1086), returns if the difference is not negative (1088), and otherwise schedules the start task after `llabs(vulnDif)` ms (1092). `scheduleVulnerabilityEnd` (1097) does the same for the window end, only when overt (1098, 1116).
  - (d) Restart catch-up. On load, `checkVulnerabilityData` (1184) chooses a branch: next start in the future, so schedule the start (1197-1198); past start and future end, so `startVulnerability` runs now (1199-1200); past end, so `refreshExpiredVulnerability` runs (1201-1202). Covert bases are reset to VULNERABLE (1208). A base in SHUTDOWNSEQUENCE is scheduled for destruction (1211-1212).
  - (e) `refreshExpiredVulnerability` (1122) advances the stored last start by whole periods while start + period is not in the future (1134-1136). It then tests whether start + duration is still in the future (1140-1145). If so, it sets the window as open: last start, end = start + duration, next = start + period (1148-1157), state VULNERABLE, schedules the end (1164). If not, it sets next = start + period, end = next + duration (1166-1173), state INVULNERABLE, and schedules the start (1177).
  - (f) Sweep and countdown. `performGCWTasks` runs on a timer every `gcwCheckTimer` seconds (402). The check task runs on the `slowQueue` (CheckGCWTask.h:21). If the server is not online yet, the check task retries after 60 + random 0-29 seconds (CheckGCWTask.h:36-37). The terminal countdown is next start minus wall-clock now, split into days and hours, with minutes rounded up (1227).
- Tick: no per-frame loop. Each base has its own start and end task objects, plus a periodic sweep over all bases.

## 2. Key functions

- `refreshExpiredVulnerability`: `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/managers/gcw/GCWManagerImplementation.cpp` 1122-1181. Catch-up after downtime; open and closed branches.
- `endVulnerability`: same file, 1007-1047. Closes a window and arms the next start.
- `startVulnerability`: same file, 973-1004. Opens a window; arms the end only when overt.
- `scheduleVulnerabilityStart` / `scheduleVulnerabilityEnd`: same file, 1076-1093 and 1097-1117. Timer arming from absolute times.
- `checkVulnerabilityData`: same file, 1184-1212. Restart branch.
- `CheckGCWTask::run` (in the task header): `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/managers/gcw/tasks/CheckGCWTask.h` 21, 36-37. Queue and offline retry.

## 3. Numbers vs mechanism

| Quantity | Formula | Donor value (range) | file:line |
|---|---|---|---|
| Window duration D | open while start + D is in the future | 10800 s (Lua, used at load); IDL default 7200 s | gcw_manager.lua:5; GCWManager.idl:149 |
| Window period P | next start = start + P | 172800 s (48 h) | gcw_manager.lua:8; GCWManager.idl:150 |
| Open share of time | D / P | 10800 / 172800 = 0.0625 (1/16); with IDL 7200: 1/24 (0.0417) | derived from the two rows above |
| Catch-up passes after downtime | floor((now - stored start) / P) loop passes, one per whole period missed | server down 10 days after a start: floor(10 / 2) = 5 passes | GCWManagerImplementation.cpp:1134-1136 |
| Start timer delay | max(0, next start - now) in ms (`llabs` of the signed difference) | 0 up to one period: 0 to 172800000 ms | GCWManagerImplementation.cpp:1085-1092 |
| End timer delay | the same rule against the window end | 0 up to duration + period | GCWManagerImplementation.cpp:1109-1116 |
| Countdown | days = floor(s / 86400); hours = floor(rem / 3600); minutes = ceil(rem / 60) | e.g. 1 d 4 h 12 min (sketch countdownParts) | GCWManagerImplementation.cpp:1227 |
| Sweep interval | sweep re-arms every gcwCheckTimer s | 3600 s | gcw_manager.lua:2; GCWManagerImplementation.cpp:402 |
| Offline retry | 60 + floor(rand x 30) s | 60 to 89 s | CheckGCWTask.h:37 |
| Initial delay | first window after delay s (0 = at once) | 0 s | gcw_manager.lua:98; GCWManagerImplementation.cpp:625, 643 |
| Uplink jam reset (separate timer) | reset after 24 h | 86400000 ms | GCWManagerImplementation.cpp:1530 |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order: restart catch-up first (advance the stored start by whole periods, derive the open flag and the end), then timer delays, then the countdown. Changes: (1) one `now` is passed in, so the countdown and the timers read the same clock (the donor's countdown uses wall-clock `time(0)` at 1227 while timers use the engine Time class); (2) it throws when the period is 0 or less (the donor has no guard, and a zero period would never leave the loop at 1134). It omits the per-base Task objects and managed references, the overt (PvP flag) gate, the state enum (VULNERABLE, INVULNERABLE, SHUTDOWNSEQUENCE), the terminal and defence spawns, the uplink band renewal, the covert reset, the initial-delay path, and the uplink timer. Donor values come from the Lua file; the sketch takes them as arguments.

```ts
// Licence: AGPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
// All times are epoch seconds on ONE clock: `now` is passed in, so the countdown and the scheduler read the same value.

export interface WindowSpec {
  periodSec: number;    // time from one window start to the next (zone data)
  durationSec: number;  // how long a window stays open (zone data)
}

export interface WindowState {
  lastStart: number;    // start of the most recent window
  nextStart: number;    // start of the next window, always after `now`
  end: number;          // end of the open window, or of the next one if none is open
  open: boolean;
}

// Restart / catch-up: move the stored start forward by whole periods until the next
// start lies in the future, then derive the open flag and the end time.
export function catchUp(spec: WindowSpec, storedStart: number, now: number): WindowState {
  if (spec.periodSec <= 0) throw new Error("periodSec must be > 0");  // guard: a zero period would loop forever
  let start = storedStart;
  while (start + spec.periodSec <= now) {
    start += spec.periodSec;
  }
  const nextStart = start + spec.periodSec;
  const open = start + spec.durationSec > now;
  const end = open ? start + spec.durationSec : nextStart + spec.durationSec;
  return { lastStart: start, nextStart, end, open };
}

// Delay for a timer that fires at an absolute epoch second. A target already in the past fires at once.
export function delayMs(targetSec: number, now: number): number {
  return Math.max(0, (targetSec - now) * 1000);
}

// Countdown as the player reads it: whole days and hours, minutes rounded up.
export function countdownParts(nextStart: number, now: number): { days: number; hours: number; minutes: number } {
  let dif = Math.max(0, nextStart - now);
  const days = Math.floor(dif / 86400);
  dif -= days * 86400;
  const hours = Math.floor(dif / 3600);
  dif -= hours * 3600;
  const minutes = Math.ceil(dif / 60);
  return { days, hours, minutes };
}

// Retry delay when the server is not yet online: 60 + 0..29 seconds (random01 in [0, 1)).
export function offlineRetryMs(random01: number): number {
  return (60 + Math.floor(random01 * 30)) * 1000;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` run on the VPS on the file above (copied to /tmp): exit 0, no errors.

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population owner). Add the window as zone data on the zone, with one scheduler per zone that is checked from the server tick, not one timer object per base. Parity-checklist row 23 (zone population: spawn caps, respawn, despawn). The invasion wave spawns when a window opens, which is the zone population for that window. Server tick sub-line: "server tick: fixed step, input intake, per-tick NPC budget" (post-K item 3, the tick has no row of its own; the window check runs on that tick).
- today: `origins/server/world-spawns.ts` (Frankendom repo file; not read in this pass, so its current contents are unverified).
- Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
- Brief rule served: zones as data (the window period, duration and initial delay are zone fields); one engine (one scheduler on the server tick, not per-object timers); server-verified (the window state lives on the server, and the countdown is read from the same clock).

## 6. Gaps and risks

- AGPL-3.0: clean-room, shape only. The sketch is written from the mechanism; the donor is not translated.
- A donor window is a PvP-flag siege on a building. Frankendom has no base. Apply the shape to a zone-level invasion window only. Do not attach timers to buildings or players.
- Defects found in the donor (idea kept, fix stated):
  - Unguarded catch-up loop: the while loops at 1024-1025 and 1134-1136 never exit if the period is 0. fix: reject period <= 0 at load (sketch throws).
  - Two configs disagree: IDL default duration 7200 (GCWManager.idl:149) vs Lua 10800 (gcw_manager.lua:5); the Lua value wins once the file is read (loader 102). fix: one data file per zone; no engine default for a zone number.
  - Two clocks: the countdown uses wall-clock `time(0)` (1227) while the timers use the engine `Time` class (1086, class not read). fix: one injected `now` (sketch).
- Early return at 1008: a base that goes covert does not advance its window in `endVulnerability`; the donor relies on the restart path (`checkVulnerabilityData`) to catch up. How a base that goes covert and then overt again rejoins the cycle was not traced. Do not port the early return without a test.
- Not read: engine `Time`, `Task::schedule`, the rest of `performGCWTasks`. The sign convention of `miliDifference()` is inferred, not verified.
- Lore: no narrative text, codex, nameplate or kill-card code is in this donor's managers or player code. The legends-rule is not engaged; no story text was taken.

Fold-in (HUD, accessibility): the countdown is a text string built from a string-table key with the numbers appended (`@player_structure:next_vulnerability_prompt`, in `getVulnerableStatus`; countdown line 1227), so a screen reader reads words, not a timer icon. Frankendom's zone map banner should use the same plain string ("Invasion in 1 d 4 h 12 min"); the string table entry itself was not read.

Fold-in (progression pacing): the donor's open share is 1/16 of the time (3 h open every 48 h), with 1/24 if the IDL default is used. A player who logs in at a random hour sees the countdown rather than a fixed clock. Frankendom should set the open share as one zone field and test the pacing against the 3 h duration, not against a fixed daily time.

Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
Brief rule served: zones as data; one engine (server-tick scheduler); server-verified window state

Best transferable idea: Run recurring event windows (invasions, siege hours) from absolute epoch times stored per zone, with a restart catch-up that skips missed whole periods, and show the same countdown the scheduler uses.

Decision (proposed): adapt - the window shape is right for zone invasions, but Frankendom keeps the window as zone data read by one zone scheduler on the server tick, with one clock, not one timer object per base.
Acceptance: On the zone map a banner shows "Invasion in 1 d 4 h 12 min"; during the window it shows "Invasion: 2 h 40 min left". A server test restarts the server 90 minutes into a window and asserts the same end time, one open window, no second invasion wave, and that after close the countdown equals next start minus now.
