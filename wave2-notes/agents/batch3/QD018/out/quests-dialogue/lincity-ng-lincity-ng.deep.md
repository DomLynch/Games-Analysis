# lincity-ng-lincity-ng (quests-dialogue, cell 12)

Donor: /mnt/frankendom-donors/lincity-ng-lincity-ng | Licence: GPL version 2 or later (COPYING.txt is GPL v2, June 1991; file headers say "either version 2 of the License, or (at your option) any later version") | C++ | symbol World::sustainability_test

Checked: opened simulate.cpp 53-94 and 251-339, stats.hpp 118-145, sustainable.hpp 24-40, lintypes.hpp 59-60, lin-city.hpp 95 (grep line), coalmine.cpp 96-136, oremine.cpp 112-119, tip.cpp 84-91, port.cpp 160-186, messages.cpp (whole file), lincity-ng/Game.cpp 840-862, lincity-ng/Dialog.cpp 270-300, COPYING.txt 1-2. Callers: sustainability_test has one caller (simulate.cpp:94); do_periodic_events has one caller (simulate.cpp:69). camera_scope: not a camera cell. Confidence high on the yearly test and the latch; medium on the intent of the port trade rule (design notes not opened). Not read: xmlloadsave.cpp save/load bodies (grep lines 387, 675, 888 only), pushMessage, the Port trade_connection body, other callers of sust_fire_cover.

Best transferable idea: a multi-criteria quest latch where each criterion keeps its own streak counter of periods, a violation (or a dirty flag set during the period) resets only that streak, and the objective completes once when every streak reaches its target.
Decision (proposed): adapt — Frankendom has no sustain-style objective; the streak latch can drive quest steps such as "keep zone population in band for 60 in-game days" with one reward write through the one ledger (row 18). Reject the six-criteria city economy itself, which has no place in a fast fight game.
Acceptance: a server test asserts that an objective with criteria pop (target 3 periods) and coal (target 2) with no dirty flag it completes exactly once at period 3 (pop 3, coal 2); a dirty flag in period 2 resets coal only and delays completion; the reward ledger receives exactly one entry.

## 1. Mechanism

The donor is a city builder. Its win condition is "economy is sustainable", tracked by six streak counters measured in in-game years. Once per year (after the daily step), the test updates each streak:

- Mining and trade are dirty flags. Coal mines, ore mines and tips clear `mining_flag` during the year; the port clears `trade_flag` on any day it trades. The yearly test sees a cleared flag, resets that streak to 0 and re-arms the flag. A clean year adds 1.
- Money must not fall against last year's total; a fall resets the money streak.
- Population and tech are tolerance bands against an anchor. Population resets when it leaves a band of 1/40 of the anchor, or drops below a floor. Tech resets on a drop of more than 1/100, and rises inside the band move the anchor up.
- Fire cover is checked only every 3 years. A passing check adds 3 years; a failing check resets to 0.

When all six streaks reach their targets, the test sets `sustainable = true` and pushes one message on the first latch only (simulate.cpp:314-317). The latch never clears. The UI shows a "You Won!" dialog for that message (Game.cpp:848-862).

## 2. Key functions

- `World::do_time_step` (simulate.cpp:54-70): increments time, updates stats, runs `simulate_mappoints`, then `do_periodic_events`.
- `World::do_periodic_events` (simulate.cpp:90-94): calls `sustainability_test` when `total_time % NUMOF_DAYS_IN_YEAR == 0`.
- `World::sustainability_test` (simulate.cpp:252-319): the yearly test. Mining and trade (254-265), money (267-271), population (274-281), tech (286-297), fire (300-305), then the all-six check and latch (307-318).
- `World::sust_fire_cover` (simulate.cpp:322-339): every non-transport construction must carry `FLAG_FIRE_COVER`, except monuments, ore mines, rockets, fire and power lines.
- Producers that write the dirty flags: `coalmine.cpp:102-103`, `oremine.cpp:114-117`, `tip.cpp:90`, `port.cpp:179-183`.
- Initial state: `mining_flag` and `trade_flag` start true (stats.hpp:127, 130); `sustainable` starts false (stats.hpp:144).

## 3. Numbers vs mechanism

- A year is `NUMOF_DAYS_IN_MONTH * 12` days (lintypes.hpp:59-60): 100 days x 12 = 1200 days. The streak counters count these years.
- Targets, in years (sustainable.hpp:30-35): ore/coal 180, port 180, money 60, population 60, tech 120, fire 60. The first yearly test already adds 1 to the mining and trade streaks, so 180 clean tests are needed for those.
- Population floor: `SUST_MIN_POPULATION` 5000, compared against `population_m` scaled by `NUMOF_DAYS_IN_MONTH` (sustainable.hpp:37, simulate.cpp:276).
- Population band: violation when `abs(i) > old_population / 40`, which is 2.5% (simulate.cpp:275). The comment two lines above says "2%" (simulate.cpp:273). Mismatch.
- Tech band: violation when `-i > old_tech / 100`, which is 1% (simulate.cpp:287). The comment at simulate.cpp:283 says "0.5%". Mismatch.
- Tech floor: `SUST_MIN_TECH_LEVEL` = `MAX_TECH_LEVEL/2` (sustainable.hpp:38); `MAX_TECH_LEVEL` is 1000000 (lin-city.hpp:95).
- Fire: checked when `total_time % (NUMOF_DAYS_IN_YEAR * 3) == 0` (simulate.cpp:300); a pass adds 3 years (302), so a target of 60 years is 20 passing checks.

## 4. TypeScript sketch

simplified: omits the donor's fire-cover scan (3-year check adding 3 years per pass), the tech anchor update (the caller computes holds), the money rule (passed in as a boolean), the donor's separate mine and port flags (reduced to one generic dirty flag), the message queue (replaced by a callback), and save/load. The streak update runs before the completion check, as in the donor. The population band keeps the donor's anchor-on-violation rule with the tolerance as data.

```ts
// Sustain objective: a quest step that completes once every criterion has
// held for its target number of periods in a row. A period is one game-year.
// A violation resets only that criterion's streak. Completion latches once.
export {};

export interface Criterion {
  readonly name: string;
  readonly targetPeriods: number; // data: periods of streak needed
  streak: number;
  dirty: boolean; // set by a system during the period; forces a reset at the next test
}

export interface Band {
  value: number; // anchor value the band is measured from
}

export interface Objective {
  readonly criteria: Criterion[];
  done: boolean;
}

export function newObjective(
  criteria: Array<{ name: string; targetPeriods: number }>,
): Objective {
  return {
    criteria: criteria.map((c) => ({ ...c, streak: 0, dirty: false })),
    done: false,
  };
}

// A producer marks a criterion dirty between periodic tests.
export function markDirty(obj: Objective, name: string): void {
  const c = obj.criteria.find((x) => x.name === name);
  if (c) c.dirty = true;
}

// Population-style band: holds while |now - anchor| * den <= anchor * num and
// now >= floor. On violation the anchor moves to now.
export function bandHolds(
  now: number,
  band: Band,
  num: number,
  den: number,
  floor: number,
): boolean {
  const ok = Math.abs(now - band.value) * den <= band.value * num && now >= floor;
  if (!ok) band.value = now;
  return ok;
}

// Called once per period. holds[name] is this period's result for each criterion.
// Returns true only on the call where the objective completes (latch).
export function periodTest(
  obj: Objective,
  holds: Record<string, boolean>,
  onComplete: () => void,
): boolean {
  if (obj.done) return false;
  for (const c of obj.criteria) {
    const ok = !c.dirty && (holds[c.name] ?? false);
    c.streak = ok ? c.streak + 1 : 0;
    c.dirty = false;
  }
  if (obj.criteria.every((c) => c.streak >= c.targetPeriods)) {
    obj.done = true;
    onComplete();
    return true;
  }
  return false;
}

// Example use: one objective, three criteria, one 1/40 population band.
const band = { value: 5000 };
const obj = newObjective([
  { name: "pop", targetPeriods: 60 },
  { name: "tech", targetPeriods: 120 },
  { name: "coal", targetPeriods: 180 },
]);
markDirty(obj, "coal");
const holdsPop = bandHolds(5100, band, 1, 40, 5000);
periodTest(obj, { pop: holdsPop, tech: true, coal: true }, () => {});
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

Target: origins/quests/sustain-objective.ts (new quest-step module; objective state lives in the one runtime, zones as data).
Parity row: 18 (loot roll and XP award). The completion reward is one write to the one ledger, which is the row-18 seam. Row 23 applies only if a zone-population criterion is used in a zone. The periodic test runs on the server tick (sub-line "server tick: fixed step, input intake, per-tick NPC budget"); the period length is a data field, not a client timer.

## 6. Gaps and risks

- One engine and server-verified: the donor decides the latch inside the world's own update (one process; no client/server split was read). Frankendom must decide `done` on the server only; the client never flips it.
- One ledger: the donor has no reward ledger. The win is a dialog and a sentence about a pension (Game.cpp:854-858). Frankendom must write one ledger entry; the sketch's `onComplete` is that seam.
- Zones as data: the donor's targets are file constants. The sketch moves them to data (criteria and target periods per objective). The period (1200 sim days) must be replaced with a Frankendom in-game clock.
- Pit as client: this runs in the zone, never in the Pit. The Pit only displays the result.
- MAX_ATTACKERS = 3: not applicable; the donor has no combat.
- Defect 1 (comment vs code, tech): the comment says 0.5%, the code uses 1%. fix: make the tolerance data and state one number in the design doc; the sketch takes the ratio as a parameter, so 0.5% (1/200) or 1% (1/100) is a data choice.
- Defect 2 (comment vs code, population): the comment says 2%, the code uses 2.5%. fix: same as defect 1; the sketch takes the ratio as data.
- Possible inversion (not confirmed): the port flag clears on any trade day (port.cpp:179-183), so a port that trades daily can never complete the trade streak. Intent is not stated in the code and the design notes were not opened. fix: the designer decides; the sketch keeps the rule as a dirty flag so it stays data.
- Latch never clears (simulate.cpp:317 with no reset path): an economy that collapses after the win keeps the win. Fine for a one-time quest; state it in the acceptance test.
- Timing granularity: the test runs once per period, so completion can lag by up to one period. Acceptable for quests; note it in the spec.

Reuse tag: donor-only; no Frankendom search was done in this pass.
Brief rule served: judge the idea, not the genre (rule 2); receipts for every cited line (rule 10, 46 receipts verified); keep the idea and fix the defects (Dom's 2026-10-10 rule).
