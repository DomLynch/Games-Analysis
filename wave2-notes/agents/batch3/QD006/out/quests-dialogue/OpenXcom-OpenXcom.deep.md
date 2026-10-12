# OpenXcom-OpenXcom (quests-dialogue, cell 12)

Donor: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Savegame/AlienMission.cpp` (the hint file `AlienMission.h` is only the class declaration; the logic is in the .cpp) | Licence: GPL-3.0-or-later (header of AlienMission.h and AlienMission.cpp: "either version 3 of the License, or (at your option) any later version") | C++ | symbol `AlienMission::think` (with `isOver`, `ufoShotDown`, `ufoLifting`, `addScore`)

Checked: Read end to end the mission state and its pay rules: `isOver` (136-148), `think` (162-262), `start` (383-397), `ufoShotDown` (538-555), `ufoLifting` (564-591), `setWaveCountdown` (598-606), `addScore` (653-673), `spawnAlienBase` (680-706, the score line only); the caller loop `GeoscapeState::time30Minutes` (1229-1250), the points tally (1278-1292), the UFO logic that calls the waypoint, lifting and wave-countdown hooks (706-766), `DogfightState` shot-down hook (1036-1062), `Ufo` live counter (Ufo.cpp 67 in the destructor, 662 in `setMissionInfo`), ruleset fields (RuleAlienMission.h 34-60, 100-112; RuleAlienMission.cpp 76-82, 156-158). Not read: `spawnUfo` body (AlienMission.cpp 276-382), `ufoReachedWaypoint` after the landing-to-site branch (470-537), waypoint and landing-point helpers (738-810), `spawnMissionSite` (811-832), `AlienStrategy`, `MissionSite`. Confidence: high on the wave timer, the finish test, the shot-down delay and the pay rules; medium on the landing-to-site body (only its pay line read). The cell's topic is quest state and rewards; the wave spacing is a spawn rule, noted here because the same state machine carries it. camera_scope: n/a (not a camera cell).

## 1. Mechanism

- A mission is a state machine over waves. State: `_nextWave`, `_nextUfoCounter` (UFOs spawned in the current wave), `_spawnCountdown` (minutes to the next spawn), `_liveUfos`, the base link and the mission-site zone. Each wave has a UFO count and a `spawnTimer` in minutes (RuleAlienMission.h 40-52).
- The clock is the geoscape half hour. `GeoscapeState::time30Minutes` (1231) calls `think` on every mission (1234-1236), then removes missions for which `isOver` is true (1238-1250). Same step, same order.
- Order inside `think` (162-262): (a) return if no waves remain (166); (b) if the countdown is above 30 minutes, subtract 30 and return (168-171); (c) spawn a UFO, or a mission site when the wave has none (173-201); (d) increment the wave's UFO counter, and when it reaches the wave's UFO count advance to the next wave (203-208); (e) infiltration: when the last wave is out, establish an alien pact base once, then loop back to wave 0 (209-237); base objective: when the last wave is out, build the alien base (238-256); (f) if waves remain, roll the spacing to the next UFO from the new wave's `spawnTimer` (258-262).
- Spacing formula: `T = spawnTimer / 30` (integer half hours); the next countdown is `(T/2 + RNG::generate(0, T)) * 30` minutes (260-261). `start` uses the same roll for the first countdown (390-391). The countdown then counts down in 30-minute steps and a spawn happens at the step where it is at or below 30 (168). So the actual gap equals the rolled value.
- Finish test: `isOver` is true only when the mission has no waves left and no UFO is alive (143). Infiltration never ends (138-141). `_liveUfos` rises when a UFO joins the mission (`Ufo.cpp` 662) and falls when the UFO is destroyed (`Ufo.cpp` 67).
- Shot-down delay: `DogfightState` calls `ufoShotDown` when the UFO is crashed (1052-1055). `ufoShotDown` adds `30 * (RNG::generate(0, 400) + 48)` minutes to the countdown (551), that is 24 to 224 hours, unless this is the last wave (548). The add is additive; it does not reset.
- Reach-base reset: when a mission UFO reaches a base destination, `GeoscapeState` sets the countdown to the same kind of random 24-224 hour value with `setWaveCountdown` (737). `setWaveCountdown` requires whole 30-minute steps (600) and does nothing once the mission is over (601-603). This is an assignment, not an add.
- Pay rules (the reward ledger), by objective:
  - A wave with the objective flag whose UFO lands in the spawn zone is replaced by a mission site and pays at landing (466; `ufoReachedWaypoint` condition read at 463).
  - Other objectives with points: pay on lifting after landing (574-576).
  - Base objective: pays when the alien base is built on the last wave (705). Lifting does not pay (574).
  - Infiltration: `addScore` returns at once (655-656).
  - The infiltration pact base spawn (209-234) calls `spawnAlienBase`, which calls `addScore` (705), so it pays nothing for infiltration either.
  - `addScore` adds the rule's points to the activity of the first region containing the point (657-664) and to the first country containing it (665-672). Activity is the ledger the donor uses.
- Ongoing pressure: each half hour, each UFO that is flying or landed adds its `missionScore` to the activity of the region it is in (1281-1292; the other statuses are not read past the switch). A landed UFO doubles that (1284-1285, a fall-through into the flying case; the country half of this tally was not read).

## 2. Key functions

- `AlienMission::isOver`: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Savegame/AlienMission.cpp` 136-148.
- `AlienMission::think`: same file, 162-262. Countdown (166-171), spawn (173-201), wave advance (203-208), infiltration and base (209-256), spacing (258-262).
- `AlienMission::start`: same file, 383-397.
- `AlienMission::ufoShotDown`: same file, 538-555 (delay on crashed or destroyed, skipped on the last wave).
- `AlienMission::ufoLifting`: same file, 564-591 (lifting pays unless base; expiry path 582-586 does not call `ufoShotDown`).
- `AlienMission::addScore`: same file, 653-673.
- Caller loop: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Geoscape/GeoscapeState.cpp` 1229-1250 (`time30Minutes`); points tally 1278-1292; UFO hooks 706-766.
- Shot-down caller: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Geoscape/DogfightState.cpp` 1052-1055.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Countdown in fixed steps; spawn when at or below one step | Step 30 minutes (AlienMission.cpp 168-170); step rate is one call per geoscape half hour (GeoscapeState.cpp 1234) |
| Spacing rolled as half to one-and-a-half of the wave timer | Formula `(T/2 + RNG(0,T)) * 30`, `T = spawnTimer/30` (260-261); `spawnTimer` per wave is ruleset data (RuleAlienMission.h 52) |
| Finish test: no waves left and no live enemies | Infiltration exempt (138) |
| Enemy delayed when one is shot down | `30*(RNG(0,400)+48)` minutes = 24 h to 224 h (551); skipped on last wave (548) |
| Enemy reset when it reaches a base | Same range (737) |
| Pay on the event that ends the objective | Landing for site (466), lifting for others (574), base spawn for base (705) |
| Points per objective | `points` from ruleset (RuleAlienMission.cpp 78); no default beyond 0 |
| Pressure per half hour | `missionScore` per flying UFO; landed doubles (GeoscapeState.cpp 1281, 1285) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for one half-hour tick: countdown, spawn, wave advance, infiltration loop and base completion, then the spacing reset. It also keeps the finish test, the shot-down add, and the pay-by-objective rule. It omits: the UFO and mission-site spawn content, the region and country lookup (the sketch pays the zone once, as the donor's first match does), the geoscape pressure tally, the reach-base reset, the pact base and the landing-to-site branch, the asserts, and the integer-truncation fix (the sketch keeps the donor's `T = spawnTimer/30` so the defect in section 6 is visible in the code). The RNG bounds are taken as inclusive (not read in the donor).

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type Objective = 'site' | 'base' | 'infiltration' | 'score';

export interface Wave {
  ufoCount: number;     // UFOs in this wave
  spacingMin: number;   // the donor's spawnTimer, in minutes
}

export interface Mission {
  objective: Objective;
  waves: Wave[];
  points: number;       // activity paid to the zone when the objective pays
  nextWave: number;
  nextUfoCounter: number;
  countdownMin: number; // minutes until the next spawn, a multiple of 30
  liveUfos: number;
}

type Rng = (lo: number, hi: number) => number; // inclusive bounds assumed (not read)

// Spacing to the next UFO: half to one-and-a-half of the wave spacing, in 30-minute steps.
export function rollSpacing(spacingMin: number, rng: Rng): number {
  const halfHours = Math.floor(spacingMin / 30);
  return (Math.floor(halfHours / 2) + rng(0, halfHours)) * 30;
}

// One half-hour tick, in the donor's order: count down, spawn, advance the wave,
// loop or end, pay a built base, then reset the spacing.
export function tick(m: Mission, spawn: () => boolean, rng: Rng, payZone: (pts: number) => void): void {
  if (m.nextWave >= m.waves.length) return;
  if (m.countdownMin > 30) {
    m.countdownMin -= 30;
    return;
  }
  if (spawn()) m.liveUfos += 1; // a spawn may be a site with no UFO
  m.nextUfoCounter += 1;
  if (m.nextUfoCounter >= m.waves[m.nextWave].ufoCount) {
    m.nextUfoCounter = 0;
    m.nextWave += 1;
  }
  if (m.objective === 'infiltration' && m.nextWave === m.waves.length) m.nextWave = 0; // loops forever
  if (m.objective === 'base' && m.nextWave === m.waves.length && m.points > 0) payZone(m.points);
  if (m.nextWave !== m.waves.length) m.countdownMin = rollSpacing(m.waves[m.nextWave].spacingMin, rng);
}

// Over when no waves remain and no UFO is alive. Infiltration never ends.
export function isOver(m: Mission): boolean {
  return m.objective !== 'infiltration' && m.nextWave === m.waves.length && m.liveUfos === 0;
}

// A UFO that crashed or was destroyed delays the next wave by 24 to 224 hours, unless the last wave is out.
export function onUfoDown(m: Mission, rng: Rng): void {
  if (m.nextWave !== m.waves.length) m.countdownMin += 30 * (rng(0, 400) + 48);
}

// A landed UFO pays on lifting for every objective except base (base pays on completion) and infiltration.
export function onUfoLifted(m: Mission, payZone: (pts: number) => void): void {
  if (m.points > 0 && m.objective !== 'base' && m.objective !== 'infiltration') payZone(m.points);
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (copy at /tmp/openxcom-mission-state.ts).

## 5. Lands in

- TARGET `origins/server/quests.ts` (proposed module for quest and event objective state; the Frankendom repo was not read, so the current layout is unknown). Server-held state: waves, the finish test (`isOver`), and the pay event per objective. Pay goes into one ledger record per zone, and the server writes it once per event.
- Parity-checklist row 18 (loot roll and XP award): the objective pay is the reward step. The wave spacing and the shot-down delay are zone spawn rules and belong to row 23 (zone population: spawn caps, respawn, despawn, with the grace timer), so they are not claimed under row 18. Server tick: the half-hour step is a calendar tick in the donor; for Frankendom it would be the server tick (row 18 / post-K item 3, sub-line "server tick: fixed step, input intake, per-tick NPC budget").
- today: not checked (repo not read).
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: one ledger (the pay goes to one zone record, once per objective event); zones as data (waves, timers, points are ruleset fields); server-verified (the finish test and the shot-down delay run on the server, from server-verified kills)

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism.
- Defect 1, the spacing comment does not match the code. RuleAlienMission.h 48-50 says the spacing is `spawnTimer/4` or `3*spawnTimer/4`. The code (AlienMission.cpp 261) gives about `spawnTimer/2` to `3*spawnTimer/2`. Which one is meant is not known. Fix: state the range in the data schema, make the comment match the code, and test the bounds.
- Defect 2, truncation loses the spacing for common timers. `T = spawnTimer/30` (260, 390) is integer division. For a timer of 45 minutes, `T` is 1, `T/2` is 0, and the roll is 0 or 30 minutes, not about 45. For a timer under 30 the spacing is 0, so the UFO spawns on the next step. Fix: round once in minutes, and clamp to a minimum step.
- Defect 3, the shot-down delay stacks without a cap. Each crashed UFO adds 24 to 224 hours (551), and the countdown only falls by 30 minutes per step. Several kills in a row can push the next wave out for many days. This may be intended; it is a design decision. Fix: a cap as a zone data field, or a stated rule that it stacks.
- Defect 4, the expiry path does not delay. `ufoLifting` on a crashed UFO that times out sets it destroyed (582-586) and does not call `ufoShotDown`, so an expired UFO does not delay the next wave but a shot-down one does. Fix: decide the rule and make both paths call the same hook.
- Defect 5, live count depends on destructor hooks. `_liveUfos` rises in `setMissionInfo` (Ufo.cpp 662) and falls in the destructor (Ufo.cpp 67). A UFO removed without its destructor leaves the count high, and `isOver` then never becomes true, so the mission never ends. Fix: count live UFOs from the server's UFO list each step, not by hooks.
- Defect 6, the pressure doubling uses a fall-through. The landed case multiplies by two and falls through into the flying case with no `break` (GeoscapeState.cpp 1284-1286). It works as written; it is fragile. Fix: an explicit multiplier table.
- Infiltration: on the last wave, the first country in the region without a pact gets one and an alien base is spawned (209-234); the wave index then loops to 0 (236) and the mission never ends (138). Not a Frankendom objective shape; it is a loop with no finish.
- Ownership of the reward: the donor's pay goes to the alien activity ledger (`addActivityAlien`, 661, 669). The player is not paid here. Frankendom must decide the sign. Taken as is, the mechanism is the enemy's win condition. Adapt it as a zone threat meter: rises when an enemy objective pays and falls when the enemy is killed (the falling side is not in this donor).
- No dialogue, no parked script, and no quest-log UI in this donor's mission file. Only the objective state and its pay rules transfer.

Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
Brief rule served: one ledger (pay recorded once per zone per objective event); zones as data (waves, spacing, points as ruleset fields); server-verified (the finish test and shot-down delay on the server)

Best transferable idea: Make a mission's finish a pure state test (no waves left and no live enemies), pay each objective on its own event (site on landing, base on completion, other objectives on lifting), and let a kill push the next wave back by a rolled delay.

Decision (proposed): adapt — the finish test and the pay-by-objective rule fit quest and event objectives on the server; the spacing needs the rounding and documentation fixes, and the reward sign is inverted (the donor pays the enemy), so Frankendom takes it as a zone threat meter instead.
Acceptance: Server test: a two-wave site event is over only after the last wave is out and every UFO is gone; a landed UFO pays the zone meter once on lifting; a base objective pays only when the base is placed; a shot-down UFO delays the next wave by a rolled amount within the documented range; a 45-minute spacing rolls between about 23 and 68 minutes (half to one-and-a-half of 45), not 0 or 30.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN.
- Verified: isOver, think order, start, ufoShotDown spacing add, ufoLifting pay, CRASHED path, setWaveCountdown, addScore, region/country match, GeoscapeState tally, reach-base reset, live-UFO counter, header comment vs code, GPL-3+. Sketch isOver/tick order matches. No error found.
- Missed: landing-to-site pay (AlienMission.cpp ~466) also requires _missionSiteZone != -1 and the trajectory zone equal to the spawn zone; think() also spawns a mission site when the wave's ufoType is a deployment (not only OBJECTIVE_SITE with wave.objective); the note condenses both.
