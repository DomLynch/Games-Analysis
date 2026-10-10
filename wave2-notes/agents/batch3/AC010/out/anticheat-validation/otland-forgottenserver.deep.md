# otland-forgottenserver (anticheat-validation, cell 6)

Donor: `/mnt/frankendom-donors/otland-forgottenserver/src/creature.cpp` (with `src/game.cpp`, `src/player.cpp`, `src/player.h`, `src/game.h`, `src/scheduler.h`) | Licence: GPL-2.0 (LICENSE file: "Version 2, June 1991" GPL text; no "or later" grant read; clean-room only) | C++ | symbols `Creature::onWalk`, `Creature::addEventWalk`, `Creature::getStepDuration`, `Game::playerMove`, `Game::playerMoveCreature`, `Player::onWalk`

Checked: Read in full: `Creature::onWalk` (creature.cpp 177-215), `addEventWalk` and `stopEventWalk` (288-319), the walk-start functions (259-285), `getNextStep` (236-246), `getWalkDelay` (99-120), `getStepDuration` (1279-1340), the step bookkeeping in `onCreatureMove` (370-390), `Game::playerMove` (game.cpp 1868-1884), `Game::checkCreatureWalk` (3818-3824), `Game::playerMoveCreature` (681-716, the early-action branch and the walk-to-target branch), `Player::onWalk` (player.cpp 1367-1372), `Player::setNextActionTask` and `getNextActionTime` (1530-1556), `Player::doAttacking` (3400-3434, the swing gate), `Creature::onAttacking` (155-167), `Player::setNextAction` and `canDoAction` (player.h 1133-1139), the timing constants (game.h 50-51, scheduler.h 10). Partly read: `playerUseItemEx` hotkey gate (game.cpp 2080-2100; the config default not read). Not read: `Player::getAttackSpeed`, `Weapon::useWeapon` (hit validation: the swing gate is read, the hit is not), `internalMoveCreature` tile rules beyond its entry (game.cpp 779-800), `actions.cpp` cooldowns (269, 310 grep-only), the receive-side packet checksum (only the send-side `adlerChecksum` at protocolgame.cpp 482 seen), the ban checks beyond the header (ban.h 18-19). Hint file `src/game.cpp` was the right file for the early-action branch only; the walk clock is in creature.cpp. Candidate files opened for the topic: game.cpp, creature.cpp, player.cpp, player.h, scheduler.h, game.h, login.cpp (138: `"anticheatprotection", false}, // not implemented`), ban.h, protocolgame.cpp, tools.cpp (adler checksum at 706). Finding: TFS has no movement or action anticheat flag pipeline (login.cpp 138 says so). What it does have is a server-owned clock for walking and actions, which makes many speed and spam inputs impossible by construction. camera_scope: not applicable (not a camera topic). Confidence: high on the step timing and queue order (read end to end); medium on the claim that a parked action is replaced rather than queued (read in `setNextActionTask` 1541-1551 and the call sites 684-691, not run). Sketch typechecked on the VPS (exit 0).

Best transferable idea: Let the server own the clock: the client sends a direction or a path, the server takes each step on its own timer with the step time computed from speed and ground, and an item action that comes early is parked on one shared action clock rather than trusted or dropped.

Decision (proposed): adapt — take the shared action clock and the one-slot parked action for the duel's input buffer in src/fight, not the per-tile walk timer; the parked slot replaces the older request silently, so the duel needs an explicit buffer rule.

Acceptance: A player presses attack 100 ms before recovery ends and gets exactly one swing at recovery; a second press during the wait replaces the parked one (no stacking), and a client that sends 2x input rate gets no more swings than the server clock allows (server test asserts swing count per second).

## 1. Mechanism

- Entry: the client sends intent, not position. `Game::playerMove` takes a direction (game.cpp 1868). It clears any pending walk task (1881) and calls `startAutoWalk(direction)` (1883), which replaces the queue with that one direction and schedules it (creature.cpp 267-269). An auto-walk list is stored as the queue (`listWalkDir = listDir`, creature.cpp 284).
- Scheduling: `addEventWalk` (288) does nothing if a step is already scheduled (296). Otherwise it asks `getEventStepTicks(firstStep)` (300) for the wait. If the first step has no pending delay, the wait is 1 and the step runs at once (306-307, "Take first step right away, but still queue the next"). Otherwise the wait is the remaining walk delay (1331), or a full step time (1337).
- Step: the server timer calls `checkCreatureWalk` (game.cpp 3818), which calls `onWalk`. `onWalk` moves only if `getWalkDelay() <= 0` (creature.cpp 179). It takes the next direction from the back of the queue (242-243), then calls `internalMoveCreature` at step time (183). Any refusal sends a cancel message and cancels the walk (184-186). A timer that fires early does nothing, and the next timer is re-queued (208-210).
- Step time: `getStepDuration()` (1288-1323). Speed goes through a log curve (`speedA x log(speed/2 + speedB) + speedC`, constants 857.36, 261.29, -4795.01; creature.cpp 17-19, 1300). The result is floored (a result of 0 becomes 1, the only clamp), then the per-tile ground item speed is used (default 150 if no ground item or zero, 1312-1315). The time is `floor(1000 x ground / curve)`, rounded up to 50 ms (1318-1319). A monster with a target nearby doubles it (1321-1323). A diagonal direction triples it in `getStepDuration(dir)` (1279-1285).
- Cost bookkeeping: on every move of the creature, `lastStep` becomes now and `lastStepCost` becomes 1, 2 for a floor change, or 3 for a diagonal. A teleport stops the walk instead (374-388).
- Walk delay: `getWalkDelay()` is the base step time times `lastStepCost`, minus the time since `lastStep` (110-119).
- Action clock: `Player::onWalk` sets `nextAction = now + getStepDuration(dir)` (player.cpp 1371). This is the shared clock for item moves and uses. `setNextAction` only moves it later (player.h 1133-1137). `canDoAction` compares it with now (1139).
- Early item action: `playerMoveCreature` (game.cpp 684-691) checks `canDoAction()`. If false, it parks a task that runs at `getNextActionTime()` (never less than 50 ms; player.cpp 1556, scheduler.h 10) and returns. `setNextActionTask` stops the previous parked task and stores the new one (player.cpp 1541-1551). So the newest early request replaces the older one. Nothing is rejected; the older one is dropped.
- Attack gate: `Player::doAttacking` swings only when `(now - lastAttack) >= getAttackSpeed()` (player.cpp 3410). The creature checks line of sight first (creature.cpp 164-165). If the weapon interrupts a swing and the player cannot act yet, the next swing waits for `getNextActionTime()` (player.cpp 3421-3422). The swing is scheduled as a task (3433).
- Hotkey gate: a use-with-target from a hotkey (a `fromPos` of 0xFFFF) is dropped unless `AIMBOT_HOTKEY_ENABLED` is set (game.cpp 2093). The default was not read.
- Callers: `checkCreatureWalk` is the timer entry (game.cpp 3818), which calls `onWalk`. `Player::onWalk` overrides and calls the base (player.cpp 1367-1370). I did not enumerate every other caller of `onWalk`.
- Tick: the step is a per-creature scheduler event (`eventWalk`, scheduled through `g_scheduler`), not a fixed frame loop. Each step fires at the time the server computes, so the walk timing follows the server scheduler, not the client.

## 2. Key functions

- `Creature::onWalk`: `/mnt/frankendom-donors/otland-forgottenserver/src/creature.cpp` 177-215. Move when due, validate at step time, re-queue.
- `Creature::addEventWalk`: `/mnt/frankendom-donors/otland-forgottenserver/src/creature.cpp` 288-311. First-step rule, single scheduled event.
- `Creature::getStepDuration`: `/mnt/frankendom-donors/otland-forgottenserver/src/creature.cpp` 1288-1324. Speed curve, ground, 50 ms round, monster x2.
- `Creature::getStepDuration(Direction)`: `/mnt/frankendom-donors/otland-forgottenserver/src/creature.cpp` 1279-1285. Diagonal x3.
- `Creature::getWalkDelay`: `/mnt/frankendom-donors/otland-forgottenserver/src/creature.cpp` 110-119 (with the direction overload at 99-107).
- `Creature::getEventStepTicks`: `/mnt/frankendom-donors/otland-forgottenserver/src/creature.cpp` 1330-1340.
- `Creature::onCreatureMove` (step bookkeeping): `/mnt/frankendom-donors/otland-forgottenserver/src/creature.cpp` 374-386.
- `Game::playerMove`: `/mnt/frankendom-donors/otland-forgottenserver/src/game.cpp` 1868-1884.
- `Game::playerMoveCreature` (early-action branch): `/mnt/frankendom-donors/otland-forgottenserver/src/game.cpp` 681-700.
- `Player::onWalk`: `/mnt/frankendom-donors/otland-forgottenserver/src/player.cpp` 1367-1372.
- `Player::setNextActionTask` and `getNextActionTime`: `/mnt/frankendom-donors/otland-forgottenserver/src/player.cpp` 1541-1556.
- `Player::doAttacking` (swing gate): `/mnt/frankendom-donors/otland-forgottenserver/src/player.cpp` 3400-3434 (swing check at 3410).
- `Creature::onAttacking` (sight gate): `/mnt/frankendom-donors/otland-forgottenserver/src/creature.cpp` 155-167.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Step time from speed, on a log curve | Curve 857.36 x ln(speed/2 + 261.29) - 4795.01, floored (creature.cpp 17-19, 1300) |
| Ground cost per tile, default when none | Ground item speed; 150 when no ground item or zero (1312, 1315) |
| Round step time up to whole 50 ms | 50 (1319); scheduler floor 50 ms (scheduler.h 10) |
| Monster with a target nearby is slower | x2 (1323) |
| Diagonal step is slower | x3 (1283) |
| Floor change costs more for the walk delay | x2 (382); the action clock does not use it (see section 6) |
| Diagonal costs more for the walk delay | x3 (385) |
| Ranged item move waits longer | MOVE_CREATURE_INTERVAL 1000 ms, RANGE_MOVE_CREATURE_INTERVAL 1500 ms (game.h 50-51) |

Worked by hand from the donor formula (example speed 220, ground 150, not the player's base speed, which was not read): the curve gives 278, the step is 550 ms, a diagonal step is 1650 ms, and the walk delay after a floor change is 1100 ms. These were computed with a short script from the donor formula (values only, not measured in a live server).

## 4. TypeScript sketch

simplified: keeps the donor order: a request sets the queue and takes the first step at once if no delay is pending; the timer takes at most one step, only when the walk delay has passed, validates at step time, then sets the action clock to the direction step time (not the floor-doubled walk delay). An early item action is parked on one slot and the newest request replaces it. It omits: the teleport branch, the follow and auto-path re-plan, the summon despawn, the cancel messages, the monster target check (baseMs is passed in, computed by `baseStepMs` from the live speed and ground each time, as the donor does), the ranged move intervals, and the hotkey gate. It also clamps the curve to at least 1 (the donor checks only for zero).

```ts
// Licence: GPL-2.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Dir = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7; // 0-3 straight, 4-7 diagonal (sketch convention)
const isDiagonal = (d: Dir): boolean => d >= 4;
const MIN_TICKS = 50; // ms, floor for any scheduled wait

// Base step time from speed (log curve), rounded up to 50 ms. Monster with a target nearby x2.
function baseStepMs(speed: number, groundMs: number, monsterNearby: boolean): number {
  const half = Math.trunc(speed / 2);
  const curve = speed > -261.29 ? Math.max(1, Math.floor(857.36 * Math.log(half + 261.29) - 4795.01 + 0.5)) : 1;
  const ground = groundMs === 0 ? 150 : groundMs;
  let ms = Math.ceil(Math.floor((1000 * ground) / curve) / 50) * 50;
  if (monsterNearby) ms *= 2;
  return ms;
}

// Step time for one direction: diagonal x3 on top of the base.
function stepMsFor(base: number, d: Dir): number {
  return isDiagonal(d) ? base * 3 : base;
}

interface Walker {
  queue: Dir[];        // directions still to take; the server pops them
  lastStep: number;    // ms, 0 = never stepped
  lastCost: number;    // 1 flat, 2 floor change, 3 diagonal
  baseMs: number;      // last base step time
  nextAction: number;  // shared action clock: walking and item use wait on it
  parked: (() => void) | null; // one slot for an early item action
}

// Delay before the next step is allowed (ms).
function walkDelay(w: Walker, now: number): number {
  if (w.lastStep === 0) return 0;
  return w.baseMs * w.lastCost - (now - w.lastStep);
}

// Client sends intent only (a direction or a list). The server owns when each step happens.
// Returns ms until the first step; 0 means run now.
function requestWalk(w: Walker, dirs: Dir[], now: number): number {
  w.queue = dirs.slice();
  const delay = walkDelay(w, now);
  return delay > 0 ? delay : 0;
}

// Server timer fires. Takes at most one step; a step that fires early does nothing and waits.
// tryMove is the server-side tile check at step time. Returns ms to the next timer, or null when done.
function onStepTimer(
  w: Walker, now: number,
  costOf: (d: Dir) => number,
  tryMove: (d: Dir) => boolean,
): number | null {
  const delay = walkDelay(w, now);
  if (delay > 0) return delay;
  const d = w.queue.shift();
  if (d === undefined) return null;
  if (!tryMove(d)) { w.queue = []; return null; } // refused at step time: cancel the walk
  w.lastStep = now;
  w.lastCost = costOf(d);
  w.nextAction = Math.max(w.nextAction, now + stepMsFor(w.baseMs, d)); // the action clock uses the direction time only
  return w.queue.length > 0 ? w.baseMs * w.lastCost : null;
}

// An item action waits for the shared clock. If early, it is parked; the newest request replaces the parked one.
function requestAction(w: Walker, now: number, run: () => void): number {
  if (w.nextAction <= now) { run(); return 0; }
  w.parked = run;
  return Math.max(MIN_TICKS, w.nextAction - now);
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS with `export {}` appended (work/otland-tfs-walk-clock.ts), exit 0.

## 5. Lands in

- TARGET `src/fight/clock.ts` (new, proposed; not checked against the Frankendom repo): one shared action clock per fighter for attack cadence, guard and dodge recovery, and a one-slot input buffer for early presses. The zone walk timer (the step scheduler) would use the same clock in `origins/server`, but that is a second step.
- Parity row 5 (controls/input). This is the closest fit, not a perfect one: the donor's walk timer is server tick work (row 18 sub-line "server tick: fixed step, input intake, per-tick NPC budget"), and the parked action is input intake. No row describes an action clock directly.
- Reuse tag: rewrite-from-idea (GPL-2.0: clean-room shape only)
- Brief rule served: server-verified kills (the swing cadence is decided by the server clock, not the client); one engine (the same clock runs for zones and the Pit, so there is no second timing rule)

## 6. Gaps and risks

- The donor has no anticheat flag, no ban on movement or action, and no reject counter. `login.cpp` 138 lists `anticheatprotection` as `false`, "not implemented". Frankendom's one ledger needs an explicit reject count if the clock refuses anything.
- Server-owned timing prevents speed hacks by construction, but not hit cheats. This clock decides when a swing happens, not whether it hits. Hit validation (`Weapon::useWeapon`, range and line of sight) was not read.
- The floor-change cost is inconsistent in the donor. The walk delay doubles for a floor change (creature.cpp 382, 118), but the action clock after the same step uses only the direction time (player.cpp 1371 with getStepDuration(dir), creature.cpp 1279). Frankendom must pick one rule and test it.
- The parked slot is last-wins: a newer early request replaces the older one without telling the player (player.cpp 1543-1551). For a duel this drops a buffered attack. Decide the buffer rule (keep latest, or keep first) and test it.
- A monster with a target nearby is slower by a flat x2 (creature.cpp 1323). For Frankendom, creature speed is data, so this should be a zone or creature field, not an engine constant.
- The donor uses one scheduler event per creature for its walk (`eventWalk`, creature.cpp 296-310). That is cheap for a few fighters. For zones with many NPCs, the per-tick NPC budget must be measured (row 18 sub-line) before the same pattern is used.
- Phone latency: a request that arrives late is applied at the next server step. The parked slot hides a short late press but also delays it; the acceptance test should use a realistic jitter.
- The receive-side packet checksum was not read. Only the send side (`adlerChecksum`, protocolgame.cpp 482) was seen, so do not claim packet integrity from this donor.
- Clean-room only (GPL-2.0). The sketch is written from the described mechanism.

Reuse tag: rewrite-from-idea (GPL-2.0; clean-room shape only)
Brief rule served: server-verified kills (the server clock decides swing timing); one engine (one clock for zones and the Pit)
