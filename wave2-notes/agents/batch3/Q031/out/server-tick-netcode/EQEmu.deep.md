# EQEmu (server-tick-netcode, cell 5)

Donor: `/mnt/frankendom-donors/EQEmu/zone/main.cpp` (lambda `loop_fn`, 512-634) with `zone/mob_movement_manager.cpp`, `common/timer.cpp`, `zone/entity.cpp` | Licence: GPL-3.0-or-later (zone/main.cpp line 7: "either version 3 of the License, or (at your option) any later version"; LICENSE.md is the GPL text) | C++ | symbol `loop_fn`

Checked: The hint file `eqlaunch/worldserver.cpp` is the process launcher; only its header was read, and the loop is not there. The zone loop is `loop_fn` in `zone/main.cpp` 512-634 (read in full). Movement: `MoveToCommand::Process` (mob_movement_manager.cpp 148-261) read in full; `FlyToCommand` and `SwimToCommand` read only at their distance and heartbeat lines (302-396 and 423-500 not read in full). `common/timer.cpp` Check, SetCurrentTime and the constructors read; `common/event/timer.cpp` Start read. `EntityList::MobProcess` (entity.cpp 457-530) read. `Mob::AI_Process` read only at its entry gate (mob_ai.cpp 965-971). Callers: `MobMovementManager::Process` is called from `Zone::Process` (zone.cpp 1698), which the loop calls at zone/main.cpp 611. The loop has no clamp on `frame_time` (read 512-634; no clamp line). Not read: `EntityList::Process`, `Mob::Process`, the rest of `Mob::AI_Process`, the source of `SecondsBeforeIdle`, the body of `EventLoop`. Confidence: high on loop order, the movement formula and the cadence numbers; medium on how the NPC AI body uses the think timer (only its gate was read). camera_scope: n/a (not a camera cell).

## 1. Mechanism

- The zone loop is a 32 ms repeating libuv timer (`EQ::Timer process_timer(loop_fn); process_timer.Start(32, true);`, main.cpp 635-636; repeat set in common/event/timer.cpp 58). Each firing runs `loop_fn` once. There is no accumulator: each firing does one pass of work, whatever the wall time was.
- Each firing: `Timer::SetCurrentTime()` advances the cached legacy clock by the wall delta (main.cpp 514; common/timer.cpp 177-191). Then `frame_time` is set to the wall seconds since the previous firing (main.cpp 520), with no clamp.
- Order when a zone is loaded (main.cpp 595-621): stream and client setup, then `worldserver.Process()` on a 1000 ms timer (474, 591-592), then `GroupProcess`, `DoorProcess`, `ObjectProcess`, `CorpseProcess`, `TrapProcess`, `RaidProcess`, `entity_list.Process()` (603), `entity_list.MobProcess()` (604), `BeaconProcess`, `EncounterProcess`, the zone event scheduler, `zone->Process()` (611), and the quest timers on a 100 ms timer (504, 617). `zone->Process()` calls `mMovementManager->Process()` (zone.cpp 1698).
- Movement is variable-step. `MobMovementManager::Process` walks each mob's queue from the front: each command that returns true is popped and the next one runs in the same pass; the first command that returns false stops that mob's pass and stays at the front (mob_movement_manager.cpp 699-717). `MoveToCommand::Process` (148-261): (a) speed is run, walk or fear speed by mode; (b) on the first call it sets moving and heading, records total horizontal and vertical distance, and sends the command; (c) on a speed change it resets the ground-correction counter and sends; (d) every 5.0 s without a send it sends again (197); (e) `distance_moved = frame_time * current_speed * 0.4f * 1.45f` (221); if that is more than the remaining distance the mob is set exactly on the target and the command returns true (223-228); otherwise it moves a step along the line, interpolates z by the fraction of horizontal distance covered, and returns false (230-260).
- Ground correction (`FixZ`) runs only when the rule `Map, FixZWhenPathing` is on (250). Then it is counted in distance moved: the correction fires once the distance since the last one is strictly greater than 1 unit while the mob is engaged, 10 units otherwise (251-253; the counter resets to 0 on a correction). `FixZ` is also called, under the same rule, on a speed change (185-187) and on the 5.0 s heartbeat (198-200), where the counter is also reset. `MoveToCommand::Process` also returns true at once for a zero-length move (213-215) and for a mob that is not AI-controlled (150-152).
- Rotation: `td = rotate_to_speed * 19.0 * frame_time` (100); the turn snaps to the target heading when `td >= dist`.
- Heartbeats differ by movement mode: move 5.0 s (197), fly 0.5 s (346), swim 1.5 s (466).
- Per-mob AI cadence: the NPC think timer is built from `AIthink_duration = 50` ms (mob_ai.cpp 434; `common/features.h` 147), the movement timer from `AImovement_duration = 100` ms (438; `common/features.h` 146), and the target-check timer from 500 ms (`common/features.h` 150). `Mob::AI_Process` returns early unless the think timer fired or the attack timer is ready (969); `Check(false)` on the attack timer does not reset it.
- Legacy timer rule (common/timer.cpp 82-94): fire when `current_time - start_time > period`; if `reset` is set, an accurate timer advances `start_time` by one period (86-87), a non-accurate one sets `start_time` to now. The constructor default is non-accurate (common/timer.h 34; default `Check(bool iReset = true)`, 38). So the AI timers restart from the moment they fire.
- Idle zones: `EntityList::MobProcess` (457-525). If the zone is idle-when-empty (471), a mob runs `Process()` only when clients are present, a quest override is set, its spawn is marked path-while-idle, or the settle timer is still running (514-518). Otherwise it only checks for depop (522). So an empty zone stops mob AI after a settle period.

## 2. Key functions

- `loop_fn` (zone main loop): `/mnt/frankendom-donors/EQEmu/zone/main.cpp` 512-634. Clock, `frame_time`, system order, 32 ms repeat.
- `MoveToCommand::Process`: `/mnt/frankendom-donors/EQEmu/zone/mob_movement_manager.cpp` 148-261. The variable-step move with snap, sync and ground correction.
- `MobMovementManager::Process`: `/mnt/frankendom-donors/EQEmu/zone/mob_movement_manager.cpp` 699-717. Command queue per mob; commands run from the front until one returns false.
- `Timer::Check` and `Timer::SetCurrentTime`: `/mnt/frankendom-donors/EQEmu/common/timer.cpp` 82-94 and 177-197. The legacy clock and the accurate or reset timer rule.
- `EntityList::MobProcess`: `/mnt/frankendom-donors/EQEmu/zone/entity.cpp` 457-525. Idle-zone gate.
- `Mob::AI_Process` (gate only): `/mnt/frankendom-donors/EQEmu/zone/mob_ai.cpp` 965-971.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Per-frame move = raw frame time x speed x factor, snap when the step passes the target | Factor 0.4 x 1.45 (theirs, mob_movement_manager.cpp 221); the donor's speed units are not read |
| Rotation rate per frame | 19.0 (theirs, 100) |
| Sync heartbeat per movement mode | Move 5.0 s (197); fly 0.5 s (346); swim 1.5 s (466) |
| Tighter ground correction while engaged (only if `FixZWhenPathing` is on) | strictly more than 1 unit engaged, more than 10 idle (250-252) |
| AI think, move and target cadence | 50 ms, 100 ms, 500 ms (`common/features.h` 147, 146, 150) |
| Loop period | 32 ms (main.cpp 636) |
| Idle-zone settle | Seconds before idle is a zone value (entity.cpp 471; value not read) |

## 4. TypeScript sketch

simplified: The sketch keeps the donor's move formula (raw frame time, speed, factor, snap when the step passes the target), the heartbeat rule and the engaged-versus-idle correction count. It omits: the run, walk and fear speed choice, the heading set on first call, the z interpolation, the `ProcessMove` call for NPCs, the `FixZ` calls themselves (the sketch only says when one is due, `fixZDue`, and the caller does the correction), the other two `FixZ` call sites (speed change and heartbeat) and the counter reset, the fly and swim variants, the rotate command, and the command queue. It also drops the donor's `IsAIControlled` early return and the donor's use of the cached clock (the sketch takes times as arguments). The sketch does not clamp `frameTimeS`, which matches the donor and is the point the note rejects.

```ts
// Licence: GPL-3.0-or-later (donor). Clean-room sketch of the mechanism; not a translation of the donor lines.
export interface Vec2 {
  x: number;
  z: number;
}

// Legacy-style timer: fires once per call when its period has elapsed.
// accurate = true keeps a fixed schedule (start advances by one period);
// accurate = false restarts the period from the moment it fires.
export class CoarseTimer {
  private start: number;

  constructor(
    private readonly period: number,
    private readonly accurate: boolean,
    now: number,
  ) {
    this.start = now;
  }

  check(now: number, reset: boolean = true): boolean {
    if (now - this.start <= this.period) return false;
    if (reset) {
      if (this.accurate) this.start += this.period;
      else this.start = now;
    }
    return true;
  }
}

// One movement step with a raw (unclamped) frame time, as in the donor.
// Returns the new position and whether the target was reached this step.
export function stepToward(
  pos: Vec2,
  target: Vec2,
  speed: number,
  frameTimeS: number,
  factor: number = 0.4 * 1.45,
): { x: number; z: number; arrived: boolean } {
  const dx = target.x - pos.x;
  const dz = target.z - pos.z;
  const len = Math.hypot(dx, dz);
  if (len === 0) return { x: pos.x, z: pos.z, arrived: true };
  const move = frameTimeS * speed * factor;
  if (move > len) return { x: target.x, z: target.z, arrived: true };
  return { x: pos.x + (dx / len) * move, z: pos.z + (dz / len) * move, arrived: false };
}

// Sync cadence: a movement command is re-sent on a speed change, or after a heartbeat.
export function heartbeatDue(nowS: number, lastSentS: number, heartbeatS: number): boolean {
  return nowS - lastSentS >= heartbeatS;
}

// Ground correction: only when the FixZWhenPathing rule is on; due once the distance moved since the last
// correction is strictly greater than 1 unit while engaged, 10 units otherwise (the donor resets the counter on a correction).
export function fixZDue(movedSinceCorrection: number, engaged: boolean, fixZWhenPathing: boolean): boolean {
  if (!fixZWhenPathing) return false;
  return movedSinceCorrection > (engaged ? 1 : 10);
}

export {};
```

## 5. Lands in

- TARGET `origins/server/tick-loop.ts` (proposed; the Frankendom file is not checked against the repo, which was not read). It would hold the sync cadence and the movement sync rule. Fight resolution stays in `src/fight`.
- Parity-checklist row 18, sub-line "server tick: fixed step, input intake, per-tick NPC budget". The idle-zone settle gate is close to row 23 (despawn on empty with a grace timer); this note cites 18 only.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: 1 (one engine; the server clock is the one clock)

Best transferable idea: sync movement with a heartbeat that depends on movement mode, and a tighter ground correction while a mob is engaged than while idle, so a fight target is corrected more often than an idle one.
Decision (proposed): adapt - the engaged-versus-idle sync cadence fits Frankendom's server-verified fights (a target in a duel is sent more often), but the unclamped variable-step move does not fit the server tick, so Frankendom keeps its fixed step and takes only the cadence split.
Acceptance: server test: with the ground-correction rule on, while a duel target is engaged a correction is due once more than 1 unit has been moved since the last one, and a speed change sends within one tick; an idle NPC is corrected after more than 10 units and re-sent on a 5 s heartbeat.

## 6. Gaps and risks

- The frame time is not clamped (main.cpp 520, no clamp in the lambda). After a stall of several seconds, the next step moves each mob by its speed times that time times 0.58, and snaps it to target if that passes it (221-228). Frankendom's server cannot accept that for a fight: the step must be bounded and the stall reported.
- The movement commands are state for presentation and sync. They do not decide hits or kills. Frankendom's kills are server-verified in the duel step (row 1); this donor's movement layer must not be the place a kill is decided.
- Timers default to reset-from-now (common/timer.h 34), so each AI think or move drifts later by the time it fired late. Frankendom's fixed tick avoids this; any per-entity timer it adds should be an accurate or tick-counted timer.
- The NPC AI gate lets the attack timer run AI outside the think cadence (mob_ai.cpp 969; `Check(false)` does not reset). That is an order-of-operations choice, not tested here. Frankendom's MAX_ATTACKERS = 3 rule and the hate list (row 4) must not depend on the attack timer firing early.
- Idle-zone gate: the donor stops mob AI when a zone has been empty for its settle period, unless a spawn or quest says otherwise (entity.cpp 514-522). That overlaps row 23 (zone population and despawn with a grace timer). The settle value is per zone and was not read.
- GPL-3.0-or-later: clean-room only. The sketch was written from the mechanism. Numbers are donor facts with receipts, not a copy of the code.
- Not read: `EntityList::Process`, `Mob::Process`, the NPC AI body after its gate, the FlyTo and SwimTo bodies, the source of the settle value, the `EventLoop` class. Nothing is claimed about them.


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** (1) Note and sketch state ground correction 'every 1 unit engaged, every 10 otherwise' unconditionally; real code (mob_movement_manager.cpp 250-256) only runs it inside `if (RuleB(Map, FixZWhenPathing))` and uses strict `>` not `>=`; sketch fixZEveryUnits drops both. (2) FixZ is also called on speed change (185-187) and on the 5.0 s heartbeat (198-200), not stated. (3) features.h is common/features.h (note gives bare name). Verified OK: 32 ms libuv repeat (main.cpp 635-636), frame_time unclamped (520), loop order and line numbers 595-621, 0.4f*1.45f at 221, 5.0/0.5/1.5 s heartbeats (197/346/466), rotation 19.0 at 100, AI timers 50/100/500 ms, Timer::Check semantics, MobMovementManager::Process pop loop, MobProcess idle gate 471-523, GPL header.

**Missed:** Movement command also returns true immediately on len==0 (213-215) and IsAIControlled false (150-152); sketch notes the second only.
