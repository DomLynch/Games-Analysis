# OpenRCT2-OpenRCT2 (quests-dialogue, cell 12)

Donor: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/scenario/ScenarioObjective.cpp` | Licence: GPL-3.0 (program header line 7: "OpenRCT2 is licensed under the GNU General Public License version 3"; `licence.txt` at the repo root is the GPL v3 text) | C++ | symbol `Objective::Check`

Checked: Symbol `Objective::Check` is at ScenarioObjective.cpp 222-252 and was read in full, as were all nine objective checkers (23-216), `onFailure` (254-268), and the header ScenarioObjective.h (1-100). Callers of `Check`: only `ScenarioCheckObjective` (Scenario.cpp 638-, call at 641), found by grep over `src/openrct2` for the objective call and the function name. `ScenarioCheckObjective` is called from `ScenarioDayUpdate` (312, 316) and `ScenarioMonthUpdate` (362), both read. `ScenarioUpdate` (Scenario.cpp 408) is called from `GameState.cpp:310` (not read). Confidence high on the objective mechanism and its day and month cadence. Not read: the highscore and name-entry tail of `ScenarioSuccess` (Scenario.cpp 171-190), `ScenarioEnd`, the game loop that calls `ScenarioUpdate`, the completion logic for `haveFun` and `buildTheBest` (only referenced at `actions/ride/RideCreateAction.cpp:228` and the importers, not read). camera_scope: n/a (not a camera cell).

## 1. Mechanism

- Quest-state objective. One predicate, `Objective::Check` (222-252), reads the park and the game state and returns one of three values: `undecided`, `success`, `failure` (header enum, ScenarioObjective.h 48-53). It switches on the objective type (229-251); each type has its own checker.
- Terminal guard first: if a completion value is already recorded (`scenarioCompletedCompanyValue != kMoney64Undefined`), `Check` returns `undecided` at once (224-227). After an ending, the check produces no more results.
- Cadence is calendar, not per frame. `ScenarioUpdate` (408) runs `ScenarioDayUpdate` on a day start, `ScenarioMonthUpdate` on a month start (429), and a fortnight and week update in between.
- Day update order (`ScenarioDayUpdate`, 299-): finance and queue updates, then the low-rating counter `scenarioUpdateLowRatingDayCount` (303), then the objective check. The check runs every day for five types: `tenRollercoasters`, `guestsAndRating`, `tenRollercoastersLength`, `finishFiveRollercoasters`, `repayLoanAndParkValue` (307-312). Every other type is checked on a day only when `AllowEarlyCompletion()` is true (315-316).
- Month update order (`ScenarioMonthUpdate`, 359-): the expenditure table shifts first (361), then the check runs (362). So the monthly-income checkers, which read `expenditureTable[1]` (ScenarioObjective.cpp 116, 204), see last month's numbers.
- Outcome. Success calls `ScenarioSuccess` (171): it writes the park's company value into the one completion field (175), gives applause, and records a highscore. Failure calls `ScenarioFailure` (160): it writes the failed sentinel into the same field (162), runs `onFailure` (163), then ends the scenario.
- The checkers (each is a pure predicate over state, no side effect):
  - `guestsBy` (23-42): decided only at the final month (`MONTH_COUNT * Year`) or when early completion is allowed (28). Success if park rating >= 600 and guests >= `NumGuests` (30). Failure only at the final month (35-37). Otherwise undecided.
  - `parkValueBy` (44-64): same window (50). Success if park value >= `Currency` (52-55). Failure at the final month (57-59).
  - `guestsAndRating` (103-112): no deadline. Success is tested first: rating >= `kLowParkRatingThreshold` (700, ScenarioObjective.h 71) and guests >= `NumGuests` (105). Only then failure: `scenarioParkRatingWarningDays == 29` (108).
  - Low-rating counter (Scenario.cpp 263-297): each day it adds 1 while park rating < 700 and at least one month has elapsed (265-267). Otherwise it resets to 0, except when the quest has already failed (293-295).
  - `tenRollercoasters` (71-97): counts open rides with excitement >= 6.00 (`RideRating::make(6, 00)`, 77), one per ride subtype (83-85). Success at 10.
  - `tenRollercoastersLength` (130-159): as above with excitement 7.00 (136) and a minimum length (144). Success at 10.
  - `finishFiveRollercoasters` (161-187): counts rides whose status is not `closed` with excitement >= `MinimumExcitement` (168), that have the indestructible-track flag and the roller-coaster category (173-174). No subtype de-duplication. Success at 5 (181).
  - `repayLoanAndParkValue` (189-200): success when loan <= 0 and park value >= `Currency`.
  - `monthlyRideIncome` (114-123) and `monthlyFoodIncome` (202-216): success when last month's income reaches `Currency`.
  - `haveFun` and `buildTheBest` are in the enum (ScenarioObjective.h 33-34) but have no case in `Check`; they fall to the default `undecided` (249-250).
- `onFailure` (254-268): only `guestsAndRating` acts. It adds a news item, clears the park-open flag, and sets the initial guest happiness to 50.
- Early completion (`AllowEarlyCompletion`, 625-636): in client network mode it returns a value replicated from the server (630). In single player or server mode it returns the config option. The value is set through a game action (`actions/general/ScenarioSetSettingAction.cpp:174`).

## 2. Key functions

- `Objective::Check`: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/scenario/ScenarioObjective.cpp` 222-252. Terminal guard (224-227), then a switch to the checker for each type.
- `guestsBy` and `parkValueBy` deadline checks: same file, 23-42 and 44-64. Deadline window (28, 50), success (30, 52), failure only at the final month (35, 57).
- `guestsAndRating` checker: same file, 103-112. Success before failure (105, 108).
- Low-rating counter: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/scenario/Scenario.cpp` 263-297. Increment (267), reset (295).
- Day update and cadence: Scenario.cpp 299-316 (counter before check at 303; daily types at 307-312; early gate at 315-316).
- Month update: Scenario.cpp 359-365 (shift at 361, check at 362).
- Dispatch and ledger write: Scenario.cpp 638-650 (call at 641, success and failure branches at 642-649), success write at 175, failure write at 162.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Three-valued result (undecided, success, failure) from a predicate over state | None (the enum) |
| Terminal guard: no result once an ending is recorded | Failed sentinel `kCompanyValueOnFailedObjective` (value not read) |
| Success is tested before failure in the same check | None (order at 105 then 108) |
| Deadline window: decide only at the final period, unless early completion is allowed | Final month `MONTH_COUNT * Year` (28, 35); early-completion flag (`AllowEarlyCompletion`) |
| Streak counter of bad days, +1 per day, reset on recovery, failure at a count | Rating threshold 700 (ScenarioObjective.h 71); failure count 29 (108); counting starts after month 1 (265) |
| Success thresholds | Rating 600 for `guestsBy` (30); guests `NumGuests` and money `Currency` are per-scenario fields, not literals in this file |
| Early-day check set vs gated set | Five types checked daily (307-312); the rest gated (315) |
| Ride thresholds | Excitement 6.00 (77), 7.00 (136) written as `RideRating::make`; minimum length (144) and minimum excitement (168) per scenario |

## 4. TypeScript sketch

simplified: the sketch keeps the order of the donor: terminal guard first, success before failure, deadline window for the `guestsBy` shape, streak counter for the `guestsAndRating` shape. It changes one thing on purpose: the failure test is `>=` (donor: `== 29`, line 108), so a counter that starts above the count still fails. It omits the news items, the highscore record, `onFailure` side effects (park closed, happiness reset), the money-gated objective validity (`IsValid`, header 78-84), the day and month scheduling, the counter's own update (the caller advances it), and the monthly-income checkers. The sketch assumes the caller has already advanced `lowRatingDays`, as the donor does at 303 before the check.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type ObjectiveStatus = 'undecided' | 'success' | 'failure';

// One ledger field for the whole quest: undefined = running, number = recorded score, 'failed' = sentinel.
export type QuestLedger = number | 'failed' | undefined;

export interface ParkView {
  rating: number;
  guests: number;
  lowRatingDays: number; // advanced by the caller before the check runs
}

export interface QuestRules {
  kind: 'deadline' | 'streak';
  minRating: number;        // donor: 600 for the deadline kind, 700 for the streak kind
  minGuests: number;
  deadlineMonth: number;    // deadline kind: last month index of the quest
  allowEarly: boolean;      // early success allowed; a server-owned setting in multiplayer
  failAfterLowDays: number; // streak kind: donor fails on exactly 29 (==); this sketch uses >=
}

// The check. The terminal guard comes first; success is tested before failure, as in the donor.
export function checkQuest(p: ParkView, q: QuestRules, monthIndex: number, ledger: QuestLedger): ObjectiveStatus {
  if (ledger !== undefined) return 'undecided';

  const meets = p.rating >= q.minRating && p.guests >= q.minGuests;

  if (q.kind === 'deadline') {
    const atDeadline = monthIndex >= q.deadlineMonth;
    if (!atDeadline && !q.allowEarly) return 'undecided';
    if (meets) return 'success';
    return atDeadline ? 'failure' : 'undecided';
  }

  // streak kind: success is checked every time; failure after a run of low-rating days
  if (meets) return 'success';
  if (p.lowRatingDays >= q.failAfterLowDays) return 'failure';
  return 'undecided';
}

// Writes the one ledger field once and only on a terminal result. Returns the new ledger value.
export function settle(ledger: QuestLedger, status: ObjectiveStatus, score: number): QuestLedger {
  if (ledger !== undefined || status === 'undecided') return ledger;
  return status === 'success' ? score : 'failed';
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (run on a copy at /tmp/openrct2-quest-objective.ts).

## 5. Lands in

- TARGET `origins/server/quests.ts` (proposed new module for quest objectives; the Frankendom repo was not read, so the existing layout is unknown). Engine rule: the server evaluates the objective and writes the one ledger field; the client only displays it. Parity-checklist row 18 (loot roll and XP award): the `settle` step is where the quest reward is written, once. Server tick sub-line: this check is calendar-driven in the donor. For Frankendom the check runs on the event that changed state and on the server tick for deadlines (design, not from the donor).
- today: not checked (repo not read).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: one ledger (one completion field, written once); server-verified completion (early completion is a server setting); zones as data (thresholds are quest data, not literals).

## 6. Gaps and risks

- GPL-3.0 copyleft: clean-room only. The sketch is written from the mechanism.
- Defect 1, equality on the failure count (`== 29`, ScenarioObjective.cpp 108). In normal play the counter moves by 1 and resets to 0, so it passes 29 exactly. A script binding can write the counter directly (`ScScenario.hpp` 288; the setter is read at 278-291, and its game-state mutability guard is not read). If a script sets it past 29 while rating stays low, the streak failure never fires. Fix: `>=` and the terminal-once ledger (sketch uses both).
- Defect 2, inconsistent coaster rules. The ten-coaster checks require open rides and count each subtype once (77, 83). The finish-five check counts any non-closed ride and does not de-duplicate (168, no `type_already_counted` in 161-187). The donor's own comment (163-164) says the original did not check null rides or the category. Fix: one rule for all coaster quest objectives, stated as data (status, dedupe by type).
- Defect 3, inline literals. Thresholds sit in the code (600 at 30, 29 at 108, 6.00 at 77, 7.00 at 136), not in the scenario data. Fix: every threshold is a quest data field with a default, so designers change it without editing the checker.
- Defect 4, objective types with no checker. `haveFun` and `buildTheBest` return `undecided` from `Check` (249-250). Their completion is handled elsewhere (not read). Fix: a quest type with no checker cannot be assigned; the loader rejects it.
- Defect 5, settings-gated validity. `IsValid` (header 78-84) hides money-based objectives when money is off. The objective can then be silently invalid. Fix: validate at quest load and report the reason.
- Defect 6, index dependency. Monthly checks read `expenditureTable[1]` and depend on the shift at 361 running first. Fix: name the value ("last period") rather than rely on an index and an order.
- Multiplayer. In client mode early completion comes from a replicated setting (630, set by an action at ScenarioSetSettingAction.cpp 174). Frankendom must keep completion decided on the server. Whether clients also run `ScenarioCheckObjective` is not read.
- Not in this donor: dialogue trees and parked scripts. This file has no dialogue or script runner. Only the objective and outcome logic transfers.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: 1 (one ledger, one completion field written once); server-verified completion for quest state; zones as data for thresholds

Best transferable idea: Store a quest's outcome in one field that holds running, a score, or a failed sentinel, written once by a settle step, with success tested before failure in each check.

Decision (proposed): adapt — the tri-state check, the terminal-once ledger and the deadline-with-early-success shape fit the one ledger and server-decided completion; the park predicates (rating, coasters) do not, so Frankendom swaps in fight and quest predicates and fixes the `== 29` test.
Acceptance: Server test on a deadline quest with early completion off: at the deadline with the objective unmet, the ledger records 'failed' once with no reward; a second deadline tick writes nothing; with early completion on, the first tick that meets the objective records the score once and pays the reward once.
