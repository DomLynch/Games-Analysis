# OpenRCT2-OpenRCT2 (quests-dialogue, cell 12)

Donor: /mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/scenario/ScenarioObjective.cpp | Licence: GPL-3.0 | C++ | symbol Objective::CheckGuestsBy / CheckParkValueBy (input line 23 verified: `CheckGuestsBy`)

## 1. Mechanism
- Donor: OpenRCT2 scenario objectives. Each scenario has one objective, a pure check over park state that returns success, failure or undecided.
- Check (222-252): if the scenario's completed company value is already set, the objective stays undecided (224-227). Otherwise it dispatches on nine objective types (229-251): guests by a deadline, park value by a deadline, ten roller coasters, guests and rating, monthly ride income, ten roller coasters with a minimum length, finish five roller coasters, repay the loan and reach a park value, monthly food income; any other value is undecided.
- Deadline objectives (CheckGuestsBy, 23-42; CheckParkValueBy, 44-64): when the elapsed month count equals the deadline (`MONTH_COUNT * Year`, where `Year` is the objective's own year field), or the objective allows early completion, the check returns success if the threshold is met (guests: park rating at least 600 and guest count at least the target, line 30; value: park value at least the currency target, line 52), and failure if it is the deadline month otherwise. Before that the result is undecided.
- The other types are threshold checks that can only succeed or stay undecided: ten roller coasters (71-97: open, excitement at least 6.00, a roller-coaster category, counting each ride subtype once; success at 10), ten with a minimum length (130-159: the same with excitement at least 7.00 and a length test), monthly ride income and food income (last month's expenditure at least the target), and repay-loan-and-value (loan at most 0 and value at least the target). Guests-and-rating (103-112) succeeds on rating and guests, and fails when the park-rating warning counter reaches 29 days.
- Only the guests-and-rating objective has a failure action (`onFailure`, 254-268): a news item is queued, the park-open flag is cleared, and the initial guest happiness option is set to 50.
- The caller that runs Check each period was not read; the check itself is pure over the park data passed in.
- Output: a status (success, failure, undecided) per objective, which the scenario uses to end or continue.

## 2. Key functions
- Objective::Check | /mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/scenario/ScenarioObjective.cpp | 222-252 | dispatches on objective type; undecided once the completed value is set.
- Objective::CheckGuestsBy | /mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/scenario/ScenarioObjective.cpp | 23-42 | success on rating and guest thresholds at the deadline or early; failure on the last month if not met.
- Objective::CheckParkValueBy | /mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/scenario/ScenarioObjective.cpp | 44-64 | the same shape for park value against the currency target.
- Objective::Check10RollerCoasters | /mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/scenario/ScenarioObjective.cpp | 71-97 | counts open coasters with distinct sub-types above a rating; success at ten.
- Objective::CheckGuestsAndRating | /mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/scenario/ScenarioObjective.cpp | 103-112 | rating and guests threshold; fails on the 29-day warning counter.
- Objective::onFailure | /mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/scenario/ScenarioObjective.cpp | 254-268 | the failure side-effect for the guests-and-rating objective.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Objective is a pure check over state, returning success, failure or undecided | Objective type list of nine (theirs, lines 229-251) |
| Deadline rule: fail only on the last period; early success allowed for some types | Deadline = `MONTH_COUNT * Year` elapsed months (theirs, lines 28 and 50) |
| Count of distinct qualifying items toward a target | Ten coasters (line 91), excitement 6.00 (line 77) and 7.00 (line 136) thresholds, minimum length (line 144), guest rating 600 (line 30), warning days 29 (line 108) (theirs) |
| Failure side effect separate from the check | Park closed and initial happiness set to 50 on guests-and-rating failure (theirs, lines 260-262) |

## 4. TypeScript sketch
simplified: the sketch covers two of the nine types (guests-by and value-by) plus the already-done guard. It omits the seven threshold types, the failure side effect (`onFailure`), the hard-coded 600 rating (the sketch makes the rating a goal field), and the count-distinct-subtype logic. Its period is a plain number; the donor's deadline compares elapsed months with `MONTH_COUNT * Year`.

```ts
// Licence: GPL-3.0 | clean-room: written from the mechanism, no donor lines.
// A quest objective is a pure check over state: success, failure or undecided.
// A deadline objective fails only on the last period; some objectives may succeed early.
type Status = "success" | "failure" | "undecided";
interface Park { rating: number; guests: number; value: number; period: number; }
interface Goal { needGuests: number; needRating: number; needValue: number; lastPeriod: number; earlyOk: boolean; }

function checkGuests(p: Park, g: Goal): Status {
  if (p.period === g.lastPeriod || g.earlyOk) {
    if (p.rating >= g.needRating && p.guests >= g.needGuests) return "success";
    if (p.period === g.lastPeriod) return "failure";
  }
  return "undecided";
}

function checkValue(p: Park, g: Goal): Status {
  if (p.period === g.lastPeriod || g.earlyOk) {
    if (p.value >= g.needValue) return "success";
    if (p.period === g.lastPeriod) return "failure";
  }
  return "undecided";
}

function check(kind: "guests" | "value", p: Park, g: Goal, alreadyDone: boolean): Status {
  if (alreadyDone) return "undecided";           // a completed scenario is not re-judged
  return kind === "guests" ? checkGuests(p, g) : checkValue(p, g);
}
```

## 5. Lands in
- Frankendom target: `origins/quests/journal.ts` (objective state and completion) and `origins/progression/model.ts` (the progress numbers the check reads); both exist on the VPS snapshot /root/work-k7 (not main), and only their header comments were read. A pure `holdsCondition` (the contracts' condition check, named in `origins/talk/README.md`) is the existing home for check-over-state logic.
- Parity-checklist row: none of rows 1 to 22. Feature-map section: Origins O2 quests (`docs/specs/origins/modernuo-quests.md`, `openmw-quest-journal.md` on the snapshot); zones as data.
- Reuse tag: rewrite-from-idea (GPL-3.0; mechanism only).
- Brief rule served: 4 (zones are data on one runtime); rules 7-9 n/a

## 6. Gaps and risks
- Park-level numbers (rating, guests, value) are the donor's. Frankendom's checks read server state (one ledger), not client numbers.
- Deadlines use the donor's calendar (months elapsed). Frankendom needs the server tick and a period definition in data.
- The only failure side effect is the donor's park closure (260-262). Frankendom must define what a failed objective does (no closure is implied), and a quest failure must not delete progress.
- The checks keep no state of their own (every method is `const`), so a pending objective has no timer or progress record in this file; Frankendom's journal stores stage and progress per character.
- Thresholds are hard-coded in the code (600 rating, 10 coasters, 6.00 and 7.00), not data. Frankendom keeps them in quest content.
- Pit is a client only and has no objectives. Nothing here touches fight authority, kill verification or MAX_ATTACKERS.
- Not read: the caller that runs `Check` each period, `GetDate`, the park data type, and the objective fields' definitions in `ScenarioObjective.h`.
