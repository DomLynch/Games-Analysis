# keldaanCommunity-pokemonAutoChess (server-tick-netcode, cell 2)

Donor: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/rooms/game-room.ts` (with `app/rooms/commands/game-commands.ts`, `app/core/simulation.ts`, `app/core/pokemon-state.ts`, `app/core/simulation-command.ts`, `app/config/server/network.ts`) | Licence: GPL-3.0 (`LICENSE` line 1: "GNU GENERAL PUBLIC LICENSE", Version 3, 29 June 2007) | TypeScript (Colyseus room) | symbol `OnUpdateCommand`, `Simulation.update`

Checked: Read in full: `GameRoom.startGame` tick callback (game-room.ts 716-727), `OnUpdateCommand.execute` (game-commands.ts 1150-1188), `initializeFightingPhase` clock set (2090-2094), `Simulation.update` (simulation.ts 1310-1410 with the storm and tidal timers), `PokemonState.updateCommands` and `PokemonState.update` (pokemon-state.ts 850-940; the state-specific attack logic after 940 not read), `SimulationCommand.update` (simulation-command.ts 1-20), `min` helper (utils/number.ts 1-5), `network.ts` line 12, `stages.ts` line 16. Confidence high on the order of steps and the numbers. Not read: the Colyseus `setTimestep` interval (the library is not in the donor, so the real tick rate is unknown here), `OnUpdatePhaseCommand.stopFightingPhase` (what happens to unfinished fights at time-out), the attack and move states in `pokemon-state.ts` after line 940, and the one-second cadence's initial value. camera_scope: not a camera cell.

Best transferable idea: Clamp each server tick's elapsed time to 50 ms so a lag spike slows the fight rather than skipping it, and when the fight clock runs out do not step the units on that tick.
Decision (proposed): adapt — The clamp and the clock-first timeout rule fit Frankendom's one-engine tick, but the donor's fixed blue-then-red step order would give one side an edge in duels, so only the clock rules are taken.
Acceptance: Server test: a 200 ms stall advances the fight clock and the units by at most 50 ms, and a fight with no kill ends at time zero with no unit step on that tick. Duel test: simultaneous hits resolve in one tested order that does not depend on which side is listed first.

## 1. Mechanism

This is a server tick loop with variable step and a clamped delta. Order of operations for one tick:

- (a) Tick callback (game-room.ts 716-727). The callback receives `deltaTime` (the Colyseus `setTimestep` that calls it was not read; the meaning here is taken from the parameter name). The callback clamps it to `MAX_SIMULATION_DELTA_TIME` (719) and, unless the game is finished or paused (720), dispatches `OnUpdateCommand` with that clamped `deltaTime` (722). Errors are caught and logged, so one bad tick does not stop the loop (721-725).
- (b) Phase clock (game-commands.ts 1156-1161). `if (deltaTime)` guards the whole step. The phase clock counts down by `deltaTime` (1157). If it is below zero (1161), the code sets `updatePhaseNeeded` and does NOT step any fight on that tick. The phase change happens later.
- (c) Fight step (1163-1179). In the FIGHT phase, every simulation that is started and not finished gets `update(deltaTime)` (1168). If every simulation has finished and no phase change is pending, the phase clock is set to 3000 ms as a victory wait and the phase change is requested (1176-1179). Fights start with the clock at `FIGHTING_PHASE_DURATION` = 45000 ms (2093; stages.ts 16). When the clock runs out the fight phase is ended; what `stopFightingPhase` does with fights still unfinished was not read.
- (d) Town step (1181-1182). In the TOWN phase the mini game is stepped instead.
- (e) One simulation tick (`Simulation.update`, simulation.ts 1310-1410), in this order: (1) if one team has no units, `onFinish()` runs (1311-1312); else the pending simulation commands run (1314) and executed ones are dropped. Note that the team loops below run on the same tick even when `onFinish()` was called, because only the command step sits in the else branch. (2) Blue team, in map order: the DPS meter is updated (1319-1330), then `pkm.update(dt, board, bluePlayer)` (1332). (3) Red team, same shape (1335-1349). (4) Storm lightning timer counts down by dt (1353), and on expiry is reset to a random 2000-6000 ms (1355). (5) Tidal wave timer counts down (1398) and on expiry is reset to 7000 ms (1408) while the wave counter is below 2 or Surge Surfer is active.
- (f) One unit tick (`PokemonState.update`, pokemon-state.ts 865-940): pending unit commands count down and run (851), with a log warning above 100 pending commands (855; a log only, no cap); the status effects update (872); periodic effects update; a frozen, asleep or resurrecting unit goes to idle (886); grass heal fires every 2000 ms (899); sandstorm damage fires every 1000 ms with base 5 (909-910); the one-second cadence runs at 932-936: when due it fires and resets to 1000; otherwise it counts down floored at 0.
- (g) Delayed command (simulation-command.ts 13-19): `delay -= dt`, and it runs when `delay < 0` (strictly below zero), then marks itself executed.

Derived, not run: because the cadence check runs before the countdown, a fire is followed by 1000 ms of decrements and one more tick before the next fire. At a 50 ms tick that is 21 ticks (1050 ms). The donor does not carry the overshoot.

## 2. Key functions

- Tick callback: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/rooms/game-room.ts` 716-727 (`startGame`, `setTimestep`).
- `OnUpdateCommand.execute`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/rooms/commands/game-commands.ts` 1150-1188. Clock, fight step, victory wait, town step.
- `Simulation.update`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/core/simulation.ts` 1310-1410. Team order and weather timers.
- `PokemonState.update` and `PokemonState.updateCommands`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/core/pokemon-state.ts` 850-940.
- `SimulationCommand.update`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/core/simulation-command.ts` 13-19.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Clamp the elapsed time each tick so a lag spike slows the fight instead of skipping it | 50 ms (theirs, network.ts 12) |
| Phase clock below zero: stop stepping units on that tick and let the phase end | Fight clock 45000 ms (theirs, stages.ts 16; set at game-commands.ts 2093) |
| Victory wait before the next phase | 3000 ms (theirs, game-commands.ts 1178) |
| Recurring hazard with a random reset | Storm lightning 2000-6000 ms random (theirs, simulation.ts 1355) |
| Fixed-period hazard | Tidal wave 7000 ms (theirs, simulation.ts 1408) |
| Per-unit periodic effect | Grass heal 2000 ms (theirs, pokemon-state.ts 899); sandstorm 1000 ms, base damage 5 (theirs, 909-910) |
| One-second cadence, countdown floored at 0 | 1000 ms (theirs, pokemon-state.ts 934) |
| Warn when a unit's queue grows too large | 100 pending commands (theirs, pokemon-state.ts 855; log only) |
| Delayed action fires when its delay goes below zero | The delay value depends on the command (not read in general) |

## 4. TypeScript sketch

simplified: the sketch keeps the clamp, the clock-first check (no unit step on the tick the clock runs out), the fixed order of delayed commands then blue then red, and the one-second cadence with its reset. It omits: the per-simulation command lists (the sketch takes one list), the DPS meters, the finish check and its 3000 ms victory wait, the town mini game, the weather timers, the status and effect updates, the idle transition, the grass and sandstorm timers, the 100-command warning, the `if (deltaTime)` guard, and the game-finished and paused guard. The cadence's initial value was not read, so the sketch defaults it to 0.

```ts
// Licence: GPL-3.0 (donor LICENSE). Clean-room: written from the described mechanism, not a translation of the donor.
export const MAX_DT_MS = 50;      // per-tick clamp on elapsed time, so a lag spike slows the fight instead of skipping it
export const FIGHT_MS = 45000;    // fight-phase countdown

export interface Unit {
  update(dt: number): void;
}

export interface TimedCommand {
  delay: number;
  executed: boolean;
  run(): void;
}

export type TickResult = "fight" | "timeout" | "over";

export class FightTick {
  private timeLeft = FIGHT_MS;
  private finished = false;

  constructor(private blue: Unit[], private red: Unit[]) {}

  // Called once per server tick with the real elapsed milliseconds.
  tick(rawDt: number, pending: TimedCommand[]): TickResult {
    const dt = Math.min(MAX_DT_MS, rawDt);
    this.timeLeft -= dt;
    if (this.timeLeft < 0) return "timeout"; // the units are not stepped on the tick the clock runs out
    if (this.finished) return "over";

    // Fixed order inside one tick: delayed commands, then blue units, then red units.
    for (const c of pending) {
      if (c.executed) continue;
      c.delay -= dt;
      if (c.delay < 0) {
        c.run();
        c.executed = true;
      }
    }
    for (const u of this.blue) u.update(dt);
    for (const u of this.red) u.update(dt);
    return "fight";
  }

  markFinished(): void {
    this.finished = true;
  }
}

// One-second cadence: if due, fire and reset to 1000 (the overshoot is not carried); otherwise count down, floored at 0.
export class Cadence {
  private cool: number;
  constructor(initialMs = 0) {
    this.cool = initialMs; // initial value in the donor was not read
  }
  step(dt: number, fire: () => void): void {
    if (this.cool <= 0) {
      fire();
      this.cool = 1000;
    } else {
      this.cool = Math.max(0, this.cool - dt);
    }
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/tick.ts` (engine tick: clamp, clock-first check, fixed step order, one-second cadence). Parity-checklist row 18 (loot roll and XP award), sub-line "server tick: fixed step, input intake, per-tick NPC budget" (addendum: the server tick has no row of its own, so it sits under row 18). Input intake is row 5 and is not covered here.
- Reuse tag: clean-room shape only (GPL-3.0 copyleft; the sketch is written from the mechanism, no lines copied)
- Brief rule served: 1 (one engine: the tick is one engine loop, not a client loop); server-verified kills (the tick decides the fight clock, the server applies every step)

## 6. Gaps and risks

- The tick rate is not in the donor. The `setTimestep` interval is in the Colyseus library, which is not in the repo, so this note cannot state the real tick rate. Frankendom must pick its own and test it.
- Fixed order (delayed commands, then blue, then red) may give one side an edge on ticks where both act (not tested here; the attack resolution that would show it was not read). Frankendom's duel must not do this: simultaneous hits and guard must resolve in one order that does not favour a side, or use a tie rule that is tested. Do not copy the blue-first order.
- No per-tick budget exists in the donor. The 100-command warning only logs. Frankendom needs a real per-tick NPC budget (checklist row 18 sub-line) and must not treat this donor as proof of one.
- MAX_ATTACKERS = 3 is a Frankendom ruling. The donor's tick steps every unit in both teams on every tick; the attack logic (not read) is where any attacker limit would sit. Frankendom's cap belongs in the engine's target logic, not in the tick, so the tick cannot enforce it.
- The fight time-out rule (the unit step is skipped on the tick the clock runs out) is the part to keep. What the donor does with unfinished fights at time-out is in `stopFightingPhase`, not read. Do not assume it resolves a winner.
- Only the clock and the team loops are the server tick. The per-unit state machine (attack and move, after line 940) was not read, so this note does not describe how an attack is scheduled.
- Wrong-tick risk: the donor's delayed commands use `< 0` while the status cooldowns use `<= 0`. Frankendom must choose one and test it at the boundary.
- Derived, not run: the one-second cadence period at a 50 ms tick is 1050 ms (see section 1).
