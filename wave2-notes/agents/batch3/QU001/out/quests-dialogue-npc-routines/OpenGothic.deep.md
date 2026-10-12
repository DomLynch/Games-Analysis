# OpenGothic (quests-dialogue-npc-routines, cell 1)

Donor: `/mnt/frankendom-donors/OpenGothic/common/world/objects/npc.cpp` (routine table: `Npc::currentRoutine`, `Npc::endTime`, `Npc::tickRoutine`, `Npc::addRoutine`) with `common/game/gamescript.cpp` (`ta_min`, `npc_exchangeroutine`, `dialogChoices`, `exec`) and `common/game/questlog.cpp` | Licence: MIT (root `LICENSE`: "MIT License", Copyright (c) 2019 Try; code may be adapted) | C++ | symbol `Npc::currentRoutine`

Checked: Opened npc.cpp 2755-2800, 3001-3060, 3236-3300, 3381-3390, 4320-4362 and npc.h 420-436; gamescript.cpp 440-452, 868-985, 2055-2070, 2527-2545, 3265-3290, 3360-3425; questlog.h and questlog.cpp (whole files); gamemenu.h 38-46 and gamemenu.cpp 326-349; directmemory.cpp 170-176. Confidence: high for the routine lookup and the dialogue-choice filter (read end to end, numbers checked against the lines). Medium for the far-NPC fast path, whose intent is not stated (see section 6; the condition is `AiFar2 && routines.empty()`, npc.cpp 3028). Not read: `lib/ZenKit` (an empty directory in this box, so the C_INFO and INpc struct layouts are known only from field use in gamescript.cpp); the Daedalus game scripts (no game data in the box, so the real routine and quest rows are not seen); the AI output pipe (`openDlgOuput`, `AI_Output`) and NPC barks; quest markers; the routine save/load in npc.cpp 346-372 (grep only); all callers of `currentRoutine` (read: tickRoutine, resumeAiRoutine, currentTaPoint, isInRoutine via grep). Scope of this note: quests, dialogue and routines, not camera.

Best transferable idea: a daily NPC schedule as a plain list of (start, end, state, waypoint) rows, where the lookup takes the window that holds the clock time, wraps midnight, and falls back to the nearest earlier end so an NPC is never without a job.
Decision (proposed): adapt - keep the row list and the fallback lookup, but store the rows as zone data on the zone population director, and keep the fallback rule as an engine constant.
Acceptance: a server test loads a zone with a guard row 22:00-02:00 and a vendor row 08:00-18:00; at 23:30 the guard's state is active, at 19:00 (no window holds it) the vendor's state is picked because its end 18:00 is the nearest earlier end, at 03:00 the guard's state is picked because its end 02:00 is the nearest earlier end, and each picked row resolves its waypoint; the test runs with no client connected.

## 1. Mechanism

- Data: a daily routine is one row with a start clock (hh:mm), an end clock (hh:mm), a state (a script function index) and a waypoint name. Rows arrive one at a time from script calls `ta_min` (gamescript.cpp 3271), which calls `addRoutine` (npc.cpp 4340). `addRoutine` appends the row and stable-sorts the table by start (npc.cpp 4352-4353), so insertion order does not matter.
- Loading a plan: `npc_exchangeroutine` (gamescript.cpp 2059-2068) builds the symbol name `Rtn_<name>_<instance id>` (2063), finds it, and calls `excRoutine` (npc.cpp 4357-4359). `excRoutine` clears the table (4358) and runs that Daedalus function, which calls `ta_min` once per row. Swapping a whole daily plan is one call.
- Lookup: `currentRoutine` (npc.cpp 3240-3272). Step 1: return the first row whose window holds the clock time; a window with end before start wraps midnight (3247, 3249). Step 2, when no window holds the time: take the row whose end is the nearest one before now, using minutes with a 24 h wrap (3259, 3263); on a tie the later row in the table wins (3262). If the table is empty it returns a static empty routine (3271-3272). The `assertWp` flag skips rows with no waypoint; `currentTaPoint` uses it (3278).
- Tick: `tickRoutine` (npc.cpp 3001-3010). When the NPC has no running state, it looks up the current row and starts the row's state with the waypoint and an end time from `endTime` (3006). If there is no row callback, it falls back to the NPC's `start_aistate` with an end time of now plus `gtime(4,0)` (3008-3010). Resume after an interrupt does the same lookup again (`resumeAiRoutine`, 3386).
- End time: `Npc::endTime` (npc.cpp 3281-3300) turns a row's end clock into an absolute time. End before start: today if the clock is before the end, else tomorrow (3287-3289). Start before end: tomorrow when the end hour is 0 or the end is already past (3292), else today. Start equal to end at 00:00: next midnight (3296). Other start equal to end: returns now, with the comment "error - routine is not active now" (3300).
- Loop: the state's loop function runs every `perceptionTimeClampt()` ticks (npc.cpp 3030; the clamp is max(perceptionTime, 1), 4168). When the end time has passed and no target or output pipe is busy, the loop returns LOOP_END (3050-3053) and the state is cleared, so the next tick picks the current row again.
- Dialogue choices: `dialogChoices` (gamescript.cpp 871-929) collects every C_INFO instance whose NPC symbol matches (879). It makes two passes, important tier (1) first and then normal (0), and returns as soon as one tier has a valid line (885, 923). A non-permanent line the player already has is skipped (891). The known set is keyed by (symbol of the handle passed in, info symbol) (3417, 3422; `exec` passes the player handle at 964-967). Each info already belongs to one NPC (879), so a known line is in effect per NPC-line; the key is not per player in any multi-player sense because the engine has one player. A permanent important line is skipped if its answer is in the `except` list (894). A condition is a script function called with self set to the NPC and other set to the player (875, 909). Choices are sorted by the info `nr` field (920) and then by script function index (3411).
- Picking a line: `exec` (gamescript.cpp 956-975). If the picked answer is the line's main answer, the line is marked known for this player (966-967). If it is a sub-answer, that sub-answer is removed from the info object (971) before the script function runs (975). Sub-answers are added at run time by `info_addchoice` (3367) and cleared by `info_clearchoices` (3370).
- Quest log: `QuestLog` (questlog.h 9-48, questlog.cpp 1-53). A topic is a row: name (string key), section (Mission or Note), status (Running, Success, Failed, Obsolete), and a list of entry strings. Script calls reach it through `log_createtopic` (3274-3277), `log_settopicstatus` (3279-3285, which checks the value first at 3280) and `log_addentry` (3287-3288). `setStatus` creates the topic when it is missing, except that an Obsolete on an unknown topic is ignored (questlog.cpp 19, 21). Entries are only appended (27). Save writes a count, then name, section, status and entries per topic (37-43); load mirrors it (45-53); the session stores it under `game/quests` (gamesession.cpp 221-222).
- Journal tabs: `GameMenu::toStatus` maps the tab strings (gamemenu.cpp 326-336). `isCompatible` compares the numeric status value (341) and shows Notes only on the Log tab (339-340).

Quest objectives, steps, prerequisites, rewards and transition rules are not in the engine at all. They are script code that calls the three log functions above.

## 2. Key functions

- `Npc::currentRoutine`: `/mnt/frankendom-donors/OpenGothic/common/world/objects/npc.cpp` 3240-3272. Window test, fallback by nearest earlier end, empty-table default.
- `Npc::endTime`: `/mnt/frankendom-donors/OpenGothic/common/world/objects/npc.cpp` 3281-3300. Turns a row's end clock into an absolute time.
- `Npc::tickRoutine`: `/mnt/frankendom-donors/OpenGothic/common/world/objects/npc.cpp` 3001-3060. Starts the current row's state when idle; ends the state at its end time.
- `Npc::addRoutine` and `Npc::excRoutine`: `/mnt/frankendom-donors/OpenGothic/common/world/objects/npc.cpp` 4340-4360.
- `ta_min` and `npc_exchangeroutine`: `/mnt/frankendom-donors/OpenGothic/common/game/gamescript.cpp` 2059-2068 and 3268-3271.
- `GameScript::dialogChoices`: `/mnt/frankendom-donors/OpenGothic/common/game/gamescript.cpp` 871-929; `GameScript::exec` at 956-976.
- `QuestLog::setStatus` and `QuestLog::addEntry`: `/mnt/frankendom-donors/OpenGothic/common/game/questlog.cpp` 17-28.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants (donor) |
|---|---|
| Window lookup with midnight wrap; fallback to the nearest earlier end, 24 h wrap; tie to the later row | Day length 24 h (`gtime(24,0).toInt()`, npc.cpp 3253) |
| Table kept sorted by start on insert | Sort key is the start clock (npc.cpp 4353) |
| Dialogue open range (squared distance compare) | `PERC_DIST_DIALOG = 2000` (npc.cpp 2760, 2775) |
| Far-NPC threshold (squared distance compare) | `MAX_DIST = 300` (npc.cpp 3033-3034); applies only to far NPCs with no routine, see section 6 |
| Fallback state end | now plus `gtime(4,0)` via `addMilis` (npc.cpp 3010); unit of `toInt()` not read |
| Loop interval | `max(perceptionTime, 1)` ticks (npc.cpp 4168) |
| Dialogue tiers | important (1) before normal (0) (gamescript.cpp 885, 923) |
| Known-once memory | Pair key (player symbol, info symbol) (gamescript.cpp 3417, 3422) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: sort on insert, the window test with midnight wrap, the fallback by nearest earlier end with ties to the later row, and the end-time rule. It omits the Daedalus state and callback validity, the `start_aistate` fallback and its 4 h offset, the perception clamp, the interrupt rules for talk and attack, the empty-table static default, the dialogue and quest-log parts, and the save and load. The end-time rule is written with hours, so `r.end < 60` stands for the donor's `r.end.hour()==0`.

```ts
// clean-room sketch of the OpenGothic NPC routine table (MIT donor; shape only, written from the described steps)
// Clock values are minutes of the day, 0..1439.
interface Routine { start: number; end: number; state: string; waypoint: string; }

const DAY = 24 * 60;

// addRoutine: append, then keep the table sorted by start (stable sort).
function addRoutine(table: Routine[], r: Routine): void {
  table.push(r);
  table.sort((a, b) => a.start - b.start);
}

// currentRoutine: the entry whose window holds `now` (a window with end < start wraps midnight).
// If none holds it, take the entry whose end is the nearest one before `now` (24 h wrap);
// on a tie the later entry in table order wins.
function currentRoutine(table: Routine[], now: number, needWaypoint = false): Routine | undefined {
  const usable = needWaypoint ? table.filter(r => r.waypoint !== "") : table;
  for (const r of usable) {
    if (r.end < r.start && (now < r.end || r.start <= now)) return r;
    if (r.start <= now && now < r.end) return r;
  }
  let best: Routine | undefined;
  let bestD = Number.MAX_SAFE_INTEGER;
  for (const r of usable) {
    let d = now - r.end;
    if (d < 0) d += DAY;
    if (d <= bestD) { best = r; bestD = d; }
  }
  return best;
}

// endTime: absolute minute (counted from day 0) at which this routine hands over.
function endTime(r: Routine, nowAbs: number): number {
  const dayStart = Math.floor(nowAbs / DAY) * DAY;
  const time = nowAbs - dayStart;
  if (r.end < r.start) return time < r.end ? dayStart + r.end : dayStart + DAY + r.end;
  if (r.start < r.end) return (r.end < 60 || r.end < time) ? dayStart + DAY + r.end : dayStart + r.end;
  if (r.start === r.end && r.end === 0) return dayStart + DAY;
  return nowAbs; // donor: start == end and not zero is treated as "not active now"
}

// tick: when no state is running, start the current routine's state until its end time.
function tickStart(table: Routine[], nowAbs: number, stateRunning: boolean): { state: string; until: number } | null {
  if (stateRunning) return null;
  const r = currentRoutine(table, nowAbs % DAY, false);
  if (r === undefined) return null;
  return { state: r.state, until: endTime(r, nowAbs) };
}

export {};
```

Typecheck: copied to the VPS as /tmp/qu001-opengothic-routine.ts; `npx -p typescript tsc --noEmit --strict --target es2020` exit 0.

## 5. Lands in

- TARGET `origins/server/world-spawns.ts`: the zone population director. A zone row holds NPC schedule rows (start, end, state, waypoint), and the server runs the same window lookup per tick to decide which NPC is present and in what state. Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer). The server tick sub-line (post-K item 3, "server tick: fixed step, input intake, per-tick NPC budget") is not the subject here.
- The dialogue-choice filter and the quest journal are not fight topics. No row 1-23 fits them. If Lead wants them tracked, they need a new row; this note does not invent one. Today's contracts and story tags are the nearest existing data.
- Reuse tag: rewrite-from-idea (MIT, so adaptation is allowed; the sketch is clean-room and does not copy donor lines).
- Brief rule served: zones as data (one runtime, the zone row carries the schedule); one ledger for dialogue memory (see section 6). Rules 7-9 n/a.

## 6. Gaps and risks

- Far-NPC fast path, npc.cpp 3028-3038. `fastPath = (aiPolicy==AiFar2 && routines.empty())` (3028, comment "HACK: don't process far away Npc"). Only far NPCs that have NO routine take it; for them the state's loop function is skipped while the NPC is within 300 units of its current waypoint (`currentFp`, npc.h 379) and invoked beyond that (the branch marked "for debugging" invokes it too, so both outer paths run it). This is plausibly intended (a far, idle, parked NPC is not simulated), not clearly inverted; the earlier "inverted" reading omitted `routines.empty()`. The callers of the fast path were not read. Fix: do not port the branch; use an explicit per-tick NPC budget (server rule), with parked NPCs skipped while far, and decide the intent in a test before any LOD gate ships.
- Donor defect candidates in the routine lookup: a non-zero start equal to end returns now (npc.cpp 3300) and the donor's own comment asks whether invalid sequences should extend (3285). Not traced to a behaviour bug in this read. Fix: reject such rows at load (the data validator), so the engine never sees them.
- Silent failure on a missing plan: `npc_exchangeroutine` does nothing when the `Rtn_` symbol is missing (gamescript.cpp 2067-2068), so the NPC keeps its old state. Fix: the server validates each zone row at load and refuses the zone; no silent empty schedule.
- Shared dialogue state: `exec` removes a sub-answer from the info object (gamescript.cpp 971), and that object is shared by the whole session. In a multi-player server one player's pick would remove the answer for everyone. Fix: store the known set and any used sub-answer per character in the one ledger, not on the shared info object.
- Obsolete topics are invisible: the status values are Running=1, Success=2, Failed=3, Obsolete=4 (questlog.h 13-18), the journal tab values are Current=1, Old=3, Failed=2, Log=5 (gamemenu.h 41-46), and `isCompatible` compares the raw number (gamemenu.cpp 339-341), so no tab matches Obsolete (4). Fix: give Obsolete its own tab or fold it into Old on purpose.
- `QuestLog::addEntry` silently drops an entry for an unknown topic (questlog.cpp 25-28) while `setStatus` auto-creates one (17-23). Fix: one rule for both (create or refuse loudly).
- Quest status has no transition guard: `setStatus` accepts any value from any value (questlog.cpp 17-23). Fix: the journal accepts only Running to Success, Failed or Obsolete, and refuses a move back to Running; the server test asserts it.
- Enum names do not match the values they select on the journal tabs: `Old` is bound to the Failed value and `Failed` to the Success value (gamemenu.h 43-44), and the filter compares numbers (gamemenu.cpp 341). Whether the original menu wanted that is not in the box. Fix: key tabs by status value and name them after it.
- `LOG_MOVETOTOP` is a no-op with an error log (directmemory.cpp 173-175). Frankendom should not copy the stub.
- Single-player engine: no server authority and no concurrency. The donor's dialogue and routine state are per process. Frankendom must run schedules on the server and the dialogue step as a server call.
- Quest logic (objectives, prerequisites, rewards) is not in the engine. The schema we can take is the journal (name, section, status, entries), not the objective model. Frankendom needs its own objective schema if it wants one.

## 7. As-data shape (PASS2)

- Routine row. Donor table: none. Each row is a `ta_min` call inside a Daedalus `Rtn_<name>_<id>` function (gamescript.cpp 2063, 3271). Row fields: start_h int, start_m int, stop_h int, stop_m int, action int (script state function index), waypoint string. A new routine is one row: yes in Frankendom's data (a row of numbers plus a waypoint id), because the lookup needs no code and rows are sorted on insert. In the donor it is a script line, not a data file, so the donor's own data is not reusable as-is.
- Dialogue line. Donor: C_INFO instances (gamescript.cpp 446). Row fields (from field use, ZenKit struct not read): npc int (symbol index), nr int (sort), important 0/1, permanent bool, condition int (function index or 0), information int (answer function index), description string, trade 0/1, choices (runtime list of text and function, added by info_addchoice). A new dialogue line is one row: yes (one C_INFO instance). Sub-answers: no, they are added at run time by script calls, not stored as rows.
- Quest topic. Donor: `QuestLog` (questlog.h 9-48). Row fields: name string (key), section Mission|Note, status Running|Success|Failed|Obsolete, entry list of string. A new quest is one row: yes for the journal entry. No for objectives, steps, prerequisites or rewards: the donor does not store them, they are script code.
- Provenance per claim: all from `/mnt/frankendom-donors/OpenGothic` (clone with one commit, 801f6ed). MIT per root LICENSE. Row shapes are the contract; MIT allows reuse, but the sketch is clean-room anyway.

## 8. Provenance and licence

Every claim above that names a file and line has a receipt in `/private/tmp/p2/wave2-haiku/batch3/QU001/receipts.tsv` (82 rows, verifier passed). The licence is MIT (`/mnt/frankendom-donors/OpenGothic/LICENSE`, first lines read). Commit provenance: the clone has one commit (801f6ed, "ai_readyspell: only execute if npc has spell (#1003)").

## 9. What they patched later

- No history available for routines, dialogue or quests: the clone is shallow (one commit). The following are comments in the code that look like patches or workarounds:
  - Routines: npc.cpp 3296-3297, "for example Rtn_Start_1081 in NTR is filled with zeros", the reason the zero start-equals-end rule exists. Patch: the zero-window case is handled as "next midnight".
  - Routines: npc.cpp 3285, "NOTE: should we consider time extension for invalid routine sequences?" is an open question, not a patch.
  - Dialogue: npc.cpp 3022, "WA: for gothic1 dialogs" (perception time set on the first tick). Workaround.
  - Dialogue ordering: gamescript.cpp 3411, "small hack with scriptfn to reproduce behavior of original game". Tie-break by function index to match the original game.
  - NPC loop: npc.cpp 3028, "HACK: don't process far away Npc" (the condition also requires an empty routine table), and 3038, "for debugging". The fast path (section 6).
  - Quest log: directmemory.cpp 175, "not implemented call [LOG_MOVETOTOP]". A known gap.

## 10. Rulings for Dom

1. Should NPC daily schedules be zone-data rows (start, end, state, waypoint) on the zone population director, so a designer can change a schedule without code? Recommendation: yes; the fallback rule stays an engine constant.
2. Should the quest journal enforce legal status moves (Running to Success, Failed or Obsolete only) in the one ledger? Recommendation: yes.
3. Should dialogue memory (known lines and used sub-answers) be per character rather than shared? Recommendation: yes; the donor has one player, so "shared across players" is moot there, but the sub-answer list lives on the shared info object and would be shared in a multi-player server.

Reuse tag: rewrite-from-idea (MIT; clean-room sketch).
Brief rule served: zones as data and one ledger (Frankendom rulings). Rules 7-9 n/a.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR.
- Far-NPC fast path was mis-described as inverted: real condition is AiFar2 && routines.empty() (npc.cpp 3028); advice and section 3 row rested on that (confirmed).
- "Known set not per NPC" is loose: the info belongs to one NPC, so lines are per NPC-line; "shared across players" is moot in a single-player engine (confirmed).
- Missed: Obsolete (4) matches no journal tab (gamemenu.h 41-46, gamemenu.cpp 339-341); addEntry drops entries for unknown topics while setStatus auto-creates (questlog.cpp 17-28) (confirmed).

Fixed 2026-10-12: fast-path description (header, section 3, section 6, section 9), known-set wording, ruling 3, added the Obsolete-invisible and addEntry asymmetry lines. Sketch unchanged (it does not cover these parts).
