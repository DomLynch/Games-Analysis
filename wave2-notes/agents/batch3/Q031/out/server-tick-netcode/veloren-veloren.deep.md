# veloren-veloren (server-tick-netcode, cell 5)

Donor: `/mnt/frankendom-donors/veloren-veloren/common/src/clock.rs` (`Clock::tick`) with the dedicated server loop `/mnt/frankendom-donors/veloren-veloren/server-cli/src/main.rs` (298-440) and `Server::tick` in `/mnt/frankendom-donors/veloren-veloren/server/src/lib.rs` | Licence: GPL-3.0-or-later (Cargo.toml line 34 `license = "GPL-3.0-or-later"`; LICENSE is the GPL version 3 text; clock.rs and server-cli/src/main.rs carry no per-file licence header) | Rust | symbol `Clock::tick`

Checked: The hint file `client/src/lib.rs` is the client; the clock is `common/src/clock.rs`, read in full (1-180). The dedicated server loop (server-cli/src/main.rs 298-440) is read in full. `Server::tick` (server/src/lib.rs 792-930) read in part: the state tick call, the sync-systems call and the world tick. Not read: the body of `state.tick`, `sys::run_sync_systems`, the body of `Client::tick` (only its signature and order comment, 2348-2362), and the ping handler body. Grep for `rollback`, `reconcil` and `predict` across client, common and server found no netcode rollback or prediction (the hits are database transaction rollback and server commands), so lag compensation is not covered by this donor. Callers of `Clock`, by grep: server-cli, the voxygen singleplayer server loop (voxygen/src/singleplayer/mod.rs 199-220, read only as the loop lines), the voxygen frame loop, client examples and the bot. Confidence high on the clock and the loop order; low on the sync and lag parts, which were not read. Depth thin because the sync and lag parts of the cell are not read. camera_scope: n/a (not a camera cell).

## 1. Mechanism

- `Clock::new(target)` starts the running averages at the target dt and both game and real time at zero (common/src/clock.rs 56-72).
- `Clock::tick()` (97) is called once per loop, after the work for that loop. It measures the busy time since the last work (137), updates three running averages (busy time, tick interval, variance) with weight 0.05 (48, 138-144), then sleeps for the rest of the target dt (149-151). `checked_sub` returns nothing when the work overran the target, so no sleep happens. After the sleep it records `last_tick` and `last_work` (155-156).
- Clock arithmetic (158-176): real time advances by the last measured interval (159); game time advances by the last game dt (160) and is clamped never to pass real time (163). The next game dt is `min(average_dt + (real_time - game_time) * 0.05, 0.2)` (173-176; 0.05 at 51, 0.2 = 1/5 at 53). So the step the sim gets is the average loop time plus a 5% share of how far game time trails real time, capped at 0.2 s.
- The comment (165-172) gives the reason: a lag spike on one tick would otherwise be a dt jump on the next tick, which breaks dt-dependent systems. The nudge spreads the catch-up over several ticks.
- Dedicated server (server-cli/src/main.rs): `Clock::new(1 / TPS)` with `TPS = 30` (49, 299). Each loop calls `server.tick(Input::default(), clock.game_dt())` once (323-325), handles the results, and then calls `clock.tick()`, which waits for the next tick (436-437). One sim tick per loop; there is no loop that runs several ticks to catch up. The dt used is the one computed on the previous loop.
- `Server::tick(_input, dt)` (server/src/lib.rs 792) uses that one dt for `state.tick(dt, ...)` (877), then handles events, applies terrain changes, runs the sync systems (910-911; the comment labels this step 6), then `world.tick(dt)` (916).
- Voxygen's singleplayer server loop uses the same `Clock` and `TPS = 30` (voxygen/src/singleplayer/mod.rs 25, 199, 220); its surrounding code was not read.
- Client: `Client::tick(inputs, dt)` (client/src/lib.rs 2348) has an ordered comment that calls it the centre of client-side work (2350-2362). The client sends a ping once a second (2475-2476) and reports a rolling average ping (3316). That is display only; no state is rolled back.

## 2. Key functions

- `Clock::tick`: `/mnt/frankendom-donors/veloren-veloren/common/src/clock.rs` 97-179. Averages, sleep to target, real and game clock, nudge.
- `Clock::new`: `/mnt/frankendom-donors/veloren-veloren/common/src/clock.rs` 56-72.
- Dedicated server loop: `/mnt/frankendom-donors/veloren-veloren/server-cli/src/main.rs` 298-440. One `server.tick` per loop with the game dt, then `clock.tick()`.
- `Server::tick`: `/mnt/frankendom-donors/veloren-veloren/server/src/lib.rs` 792-930 (read in part). Uses one dt for the state, the sync step and the world tick.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Running averages of loop busy time, interval and variance | Weight 0.05 (theirs, common/src/clock.rs 48) |
| Nudge a game clock toward real time over several loops | Nudge 0.05 of the gap per loop (theirs, clock.rs 51) |
| Cap on the game step | 1/5 s = 0.2 s (theirs, clock.rs 53) |
| Fixed target loop rate | 30 per second (theirs, server-cli/src/main.rs 49; voxygen singleplayer 25) |
| Ping cadence for lag display | 1 s (theirs, client/src/lib.rs 2476) |

## 4. TypeScript sketch

simplified: The sketch keeps the donor's clock arithmetic (averages, sleep to target, real and game time, the 0.05 nudge, the 0.2 s cap, one sim step per loop). It assumes the sleep lasts exactly the returned time, where the donor reads the clock after sleeping. It omits the thread priority call, the spin sleep choice, the variance average and the stats struct, the `set_target_dt` reset, and the sync and world steps inside `Server::tick`. The `runOneLoop` helper shows the one-step-per-loop shape only; it is not the donor's loop body.

```ts
// Licence: GPL-3.0-or-later (donor). Clean-room sketch of the mechanism; not a translation of the donor lines.
const SMOOTH_WEIGHT = 0.05; // weight of each new sample in the running averages
const NUDGE_RATE = 0.05; // share of (real - game) time applied to the game step each loop
const MAX_GAME_DT = 1 / 5; // seconds; cap on the game step handed to the sim

export interface ClockState {
  targetDt: number; // seconds per loop the clock aims for
  averageDt: number;
  averageBusy: number;
  realTime: number;
  gameTime: number;
  lastRealDt: number;
  lastGameDt: number;
  lastTick: number; // seconds, monotonic
  lastWork: number; // seconds, monotonic
}

export function newClock(targetDt: number, now: number): ClockState {
  return {
    targetDt,
    averageDt: targetDt,
    averageBusy: targetDt,
    realTime: 0,
    gameTime: 0,
    lastRealDt: targetDt,
    lastGameDt: targetDt,
    lastTick: now,
    lastWork: now,
  };
}

// Called once per loop after the work is done. Returns the seconds to sleep before the next loop.
// Simplified: assumes the sleep lasts exactly the returned time (the donor reads the clock after it).
export function clockTick(c: ClockState, now: number): number {
  const busy = now - c.lastWork;
  c.averageBusy += (busy - c.averageBusy) * SMOOTH_WEIGHT;

  const tickTime = now - c.lastTick;
  c.averageDt += (tickTime - c.averageDt) * SMOOTH_WEIGHT;

  const sleep = Math.max(0, c.targetDt - busy); // no sleep when the work overran the target

  c.lastTick = now;
  c.lastWork = now + sleep;

  c.realTime += c.lastRealDt;
  c.gameTime += c.lastGameDt;
  c.gameTime = Math.min(c.gameTime, c.realTime); // game time never passes real time

  c.lastRealDt = tickTime;
  c.lastGameDt = Math.min(c.averageDt + (c.realTime - c.gameTime) * NUDGE_RATE, MAX_GAME_DT);
  return sleep;
}

// The dedicated server loop: exactly one sim step per loop, using the game dt
// the clock computed on the previous loop. There is no catch-up loop.
export function runOneLoop(c: ClockState, simStep: (dtS: number) => void): void {
  simStep(c.lastGameDt);
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `origins/server/tick-loop.ts` (proposed). This note is a reject for the server sim. If a client display clock is ever built, it would sit in the client, not in `src/fight`.
- Parity-checklist row 18, sub-line "server tick: fixed step, input intake, per-tick NPC budget". The donor's step is variable, so it is the opposite of the sub-line's "fixed step".
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: 1 (one engine; one sim clock on the server)

Best transferable idea: keep a presentation or game clock within a capped step of real time by nudging it a fraction of the gap each loop, so one lag spike becomes a small step spread over several frames rather than a single jump.
Decision (proposed): reject - the server sim must stay on a fixed step, because a variable game dt makes fight outcomes depend on machine timing and breaks server-verified kills and fight replay (checklist rows 1, 18 and 19); the nudge idea only fits a client display clock, which the camera and HUD can use later without touching the server.
Acceptance: Not built for the server. If a client-only display clock takes the nudge, a server test is not needed; a client test asserts that after a 1 s stall, displayed time never passes real time and no single frame advances it by more than 0.2 s.

## 6. Gaps and risks

- The server sim takes a variable dt. The same inputs at different loads give different results, so a duel replay (checklist row 19) would not reproduce. Frankendom's one-engine rule needs a fixed step here.
- One sim step per loop with no catch-up. Under load the loop runs fewer steps per second, each with a bigger dt, up to 0.2 s. For fast duels, that is a large jump per step; the donor does not discuss the effect on combat.
- No netcode rollback or prediction was found. Lag is shown as a ping average only (client/src/lib.rs 2476, 3316). Veloren gives no model for lag compensation, so Frankendom's server-verified kills need a rule this donor does not supply.
- Sync (`run_sync_systems`, server/src/lib.rs 911) is not read, so nothing is claimed about how entity state is sent to clients per loop.
- The fixed-step loop with catch-up in Levy Street's server (its own note, cell 5) is the better fit for Frankendom's server tick.
- GPL-3.0-or-later: clean-room only. The sketch was written from the mechanism; numbers are donor facts with receipts.
- Not read: the body of `state.tick`, `run_sync_systems`, the body of `Client::tick`, the ping handler body, `PING_ROLLING_AVERAGE_SECS`.
