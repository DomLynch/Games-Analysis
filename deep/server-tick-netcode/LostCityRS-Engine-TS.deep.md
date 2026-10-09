# LostCityRS-Engine-TS (server-tick-netcode, cell 5)

Donor: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/World.ts` | Licence: MIT per repo LICENSE | TypeScript | symbol `World.cycle`

Checked: At 340 (verified: `cycle()` opens at 340 and ends at 527; `TICKRATE` = 600 at line 120; the self-rescheduling `setTimeout` is at line 508). All of 293-336 and 340-527 read; the phase functions themselves (`processWorld` and so on, 529-) were not read.

## 1. Mechanism

- One world tick every `TICKRATE` = 600 ms (the source comment says do not change it; it is exposed only to speed up tests). `cycle()` runs one whole tick and then reschedules itself.
- Fixed phase order inside one cycle: world queue and NPC hunts (`processWorld`), client input (`processClientsIn`: AFK events, packets, pathfinding requests), spawn and despawn triggers (`processNpcEventQueue`), NPC processing, player processing (queues, timers, interactions, movement), logouts, logins, zones (active zone build, loc and obj respawn, shared buffer), info (movement and info masks), client output (flush), then cleanup of per-tick flags (345-415).
- After the phases: shutdown check, periodic autosave (`PLAYER_SAVERATE` = 1500 ticks, comment says 15 minutes, 425-428), a server check-in session log every `PLAYER_COORDLOGRATE` = 50 ticks (430-434), session logs and wealth events posted to a logger thread (437-459), per-phase timing stats copied and pushed to Prometheus in production (461-493), then `currentTick++` and `nextTick += this.tickRate` (503-504). The per-instance `tickRate` starts at `TICKRATE` (163) and is set to 0 during shutdown (1235).
- Scheduling: `setTimeout(cycle, max(0, tickRate - elapsed - drift))`, where drift = how late this cycle started against `nextTick`, computed at the start of the cycle (343, 508). The next tick is therefore kept on a fixed grid, not "600 ms after the last one".
- Error path (509-526): an exception in a cycle logs the error, removes every player, and then calls `process.exit(1)`. The server does NOT carry on.

## 2. Key functions

- `World.cycle`: `World.ts` 340-527. Phase order, stats, reschedule with drift.
- `World` tick constant: `World.ts` 120 (`TICKRATE` = 600). Fixed 600 ms.
- `World.start` (`World.ts` 293-336): sets the first `nextTick` (333) and makes the first `cycle()` call at 334 when `startCycle` is set.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Fixed phase order inside each tick (input, world, entities, output, cleanup) | Phase list (theirs) |
| Schedule the next tick on a fixed grid with drift compensation | Drift formula (the rule, not a constant) |
| Periodic autosave on a tick count | `PLAYER_SAVERATE` = 1500 ticks (theirs, line 124) |
| Error in a tick: remove all players, then exit the process | Error policy (theirs, 509-526) |
| Tick length as one named constant | 600 ms (theirs, "do not change") |

## 4. TypeScript sketch

simplified: the sketch leaves out the phase bodies, the shutdown check, logger posting, stats and the check-in log. The error handler here stops the loop and reports, matching the donor's exit, rather than carrying on.

```ts
// Licence: MIT (donor). Sketch written from the described mechanism; lifting the real lines is permitted (World.ts 340-527).
const TICK_MS = 600; // the donor's tick length; ours is set by the sim, not copied

const phases: Array<(tick: number) => void> = [];

// One tick: run every phase in its fixed order, then do the per-tick housekeeping.
function runTick(tick: number): void {
  for (const phase of phases) phase(tick);
}

// Reschedule on a fixed grid: the next start is one tick after the last planned start, not after the last finish.
function scheduleNext(
  nextTick: number,
  started: number,
  tickMs: number,
  run: () => void,
  setTimer: (fn: () => void, ms: number) => void,
): number {
  const drift = Math.max(0, started - nextTick);
  const next = nextTick + tickMs;
  setTimer(run, Math.max(0, tickMs - (Date.now() - started) - drift));
  return next;
}

// Autosave on a tick count, so it stays in step with the simulation.
function shouldAutosave(tick: number, every: number): boolean {
  return tick > 0 && tick % every === 0;
}

// An error in one tick: report it and stop the loop (the donor drops every player and exits).
function guardTick(tick: number, onError: (e: unknown) => void): boolean {
  try {
    runTick(tick);
    return true;
  } catch (e) {
    onError(e); // caller drops sessions and shuts down
    return false;
  }
}
```

## 5. Lands in

- TARGET `src/fight/net-tick.ts` (new). Parity-checklist row 18 (post-K item 3: the server tick unifies loot roll and XP award) and row 4 (fight loop, 60 Hz). The server tick must wrap the same duel step the clients run (row 1), not a second one; `world-combat.ts` is moving into `src/fight/` per the checklist (K2d).
- today: no server tick module exists. The only tick loop is the page's 60 Hz driver (`src/net/pvp.ts`, `src/net/rollback.ts`); the server side is `src/net/verify-duel.ts`, a headless replay of uploaded records, not a world tick. (read in worktree `frankendom-combat-p3`, commit 6adcab27e). Zone 1 steps headless through `main.ts` -> `world-combat.ts` -> `zone1.ts` -> `open-fight.ts`.
- Reuse tag: adapt
- Brief rule served: 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- The donor's 600 ms tick is far too slow for a duel, which steps at 60 Hz (checklist row 4). Do not adopt the number; adopt the fixed grid and the fixed phase order.
- The donor is a multi-player world server with NPCs, zones and logins. Frankendom ruling: one engine, zones as data, so zone content must be data the same tick reads, not per-zone tick code.
- The donor's error path exits the process after dropping all players. Frankendom needs server-verified kills and one ledger: a crashed tick must not lose a kill award mid-write, so the award write needs to be atomic with the tick or replayable.
- Drift scheduling with `setTimeout` is node-specific. A Frankendom server has to pick its own clock; the rule is the fixed grid, not the timer call.
- Autosave on a tick count is a persistence rule for the ledger phase, not this one.
- Nothing here limits attackers per target (MAX_ATTACKERS = 3); the phase order would need a place for the intake limit.
