# luanti-org-luanti (server-tick-netcode, cell 5)

Donor: `/mnt/frankendom-donors/luanti-org-luanti/src/server.cpp` (`ServerThread::run` 111-173, `Server::AsyncRunStep` 661-1124, `Server::Receive` 1126-1181, `Server::yieldToOtherThreads` 1183-1227) with `src/serverenvironment.cpp` (`ServerEnvironment::step` 854-1147) and `src/util/numeric.h` (`IntervalLimiter` 418-440) | Licence: LGPL-2.1-or-later (`LICENSE.txt` 114-124: "either version 2.1 of the License, or (at your option) any later version"; `COPYING.LESSER` is the LGPL v2.1 text) | C++ | symbol `ServerThread::run`

Checked: Opened the full server cycle: src/server.cpp 111-173 (thread loop), 647-657 (`Server::step`), 661-752 (`AsyncRunStep`; 753-1124 not read), 1126-1181 (`Receive`), 1183-1227 (yield), 4245-4297 (dedicated loop); src/serverenvironment.cpp 854-1010 and 1060-1100 (step body; the ABM per-block body at 1010-1060 and 1100-1147 were not read); src/util/numeric.h 418-440; builtin/settingtypes.txt 2306; LICENSE.txt 114-124. Hint file `builtin/game/item.lua` (776 lines) opened and searched for step, tick, dtime, timer, on_step: no tick code, so it is ruled out. Candidates checked: server.cpp, serverenvironment.cpp, numeric.h, activeobjectmgr.h (declaration only), settingtypes.txt. Not read: `ServerActiveObject::step` body, `MapBlock::step` (node timers), `SendBlocks` body (server.cpp 2572), the cached `m_cache_*` interval values. Confidence: high on the cycle order, the dtime handling and the Receive loop; medium on the full environment step. camera_scope: n/a (not a camera cell).

Best transferable idea: One server cycle that hands the world the measured previous cycle as dtime, fills the rest of the step window with packet intake, and runs every periodic job through an interval limiter that carries its remainder.
Decision (proposed): adapt - keep the interval-limiter-with-debt pattern for zone timers (row 23 respawn and despawn timers) and the decaying lag estimate as a server health readout; reject the measured variable dtime for the duel step (damage and kill order must use a fixed server step, row 18), and do not let packet intake run past the step window.
Acceptance: A server test injects a 300 ms stall and asserts the duel step still runs the fixed number of steps, a 2.92 s-style zone timer fires once per interval with its remainder carried into the next pass, and 1,000 queued packets cannot extend one step past its budget; a player sees no change in hit or kill order during a stall, and the lag readout rises then decays.

## 1. Mechanism

- Cycle loop (`ServerThread::run`, 111-170). Runs on its own thread. Each pass: read the step settings (142), yield to other threads if the last cycle ran longer than `steplen + 1 ms` (147-148), call `AsyncRunStep` with the measured previous cycle as dtime (150; 0 when paused), compute the remaining window `steplen - elapsed` (152-153), then `Receive(remaining)` (154). The next dtime is the measured length of the whole pass (166). So dtime is the real cycle time, not a fixed constant: a slow cycle means a longer dtime for every object.
- Target step length. The dedicated server sets it from `dedicated_server_step` (`dedicated_server_loop` 4254-4257). The default is 0.09 s (builtin/settingtypes.txt 2306). The dedicated main thread itself sleeps 50 ms (4251, 4267) and calls `server.step()` (4268), which only re-throws a fatal async error (647-657). The game work is on the ServerThread, not in the dedicated loop.
- `AsyncRunStep` order (661-752). Early return on a fatal error; `SendBlocks(dtime)` runs first (673), before the paused check (677, returns if dtime is 0 and not the initial step); uptime; time of day sent every 5 s (696-698); lag estimate (713-730): `m_max_lag_decrease` fires every 0.5 s and multiplies the max by 0.99425 (713-716), then the max is raised to the newest dtime (730); `m_env->step(dtime)` (735); map timers and unload every 2.92 s through an interval limiter (738-739); map step (752).
- Environment step (`ServerEnvironment::step`, 854-1147). Time of day (not read in detail); the step length is published to clients (865-867); game time is whole seconds with a fraction counter that carries the remainder (873-876). Active block management runs on an interval divided by `m_fast_active_block_divider` (882); that divider is set to 10 when a player joins (434) and drops by one per management pass until 1 (964-965). Node timers run on their own interval (971). ABMs run on their interval with the list shuffled first (1005-1010). Global on_step callbacks run with dtime (1063). Active objects are stepped with dtime and a `send_recommended` flag that is raised when a timer passes the send interval (1075-1076, 1089, 1093). Object management runs every 0.5 s (1101).
- `IntervalLimiter::step` (numeric.h 429-437). Adds dtime to an accumulator (431). Returns false below the interval (432). Otherwise subtracts one interval (434) and returns true. It fires at most once per call, and any excess stays in the accumulator for later calls: debt carry, not catch-up.
- Packet intake (`Server::Receive`, 1126-1181). Computes the remaining window (1132-1135) and a wait timeout from it (1146). It calls `ReceiveTimeoutMs` (1148). The window is checked only on the path where that call returns no packet (1150). A received packet is processed (1158) and the loop goes round again without checking the window.
- Yield (`yieldToOtherThreads`, 1183-1227). Only when the emerge queue holds at least 32 items (1203). It sleeps in 1 ms steps, up to `dtime / 28 ms` clamped to 1-10 (1210-1214), and stops early when the emerge queue stops shrinking (1222). This is a workaround for lock contention with the emerge thread.

## 2. Key functions

- `ServerThread::run`: `/mnt/frankendom-donors/luanti-org-luanti/src/server.cpp` 111-173 (the cycle, the measured dtime, the receive window).
- `Server::AsyncRunStep`: `/mnt/frankendom-donors/luanti-org-luanti/src/server.cpp` 661-752 read (lag estimate, environment step, map timer); the body continues to 1124 and was not read past 752.
- `Server::Receive`: `/mnt/frankendom-donors/luanti-org-luanti/src/server.cpp` 1126-1181 (intake inside the window).
- `ServerEnvironment::step`: `/mnt/frankendom-donors/luanti-org-luanti/src/serverenvironment.cpp` 854-1147 (game time, interval-gated jobs, active object step).
- `IntervalLimiter`: `/mnt/frankendom-donors/luanti-org-luanti/src/util/numeric.h` 418-440.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Target cycle length; receive for the rest of the window | 0.09 s default (theirs, builtin/settingtypes.txt 2306); dedicated main thread sleeps 50 ms (theirs, server.cpp 4251) |
| Measured previous cycle is the next dtime | No constant (mechanism, server.cpp 150, 166) |
| Periodic job with debt carry | Map timer every 2.92 s (theirs, server.cpp 738) |
| Object management pass | Every 0.5 s (theirs, serverenvironment.cpp 1101) |
| Decaying lag estimate | Decay factor 0.99425 every 0.5 s, about halved per minute (theirs, server.cpp 713-716; the 60 s figure is their comment) |
| Warm-up after a join | Divider 10, then down by one per pass (theirs, serverenvironment.cpp 434, 964) |
| Game time from a fractional accumulator | Whole seconds, remainder carried (theirs, serverenvironment.cpp 873-876) |
| Yield to a waiting thread | Queue threshold 32, quantum 28 ms, at most 10 sleeps (theirs, server.cpp 1203, 1210, 1212) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: the world step is fed the previous measured cycle, then the rest of the window goes to intake, then the cycle length is measured and returned as the next dtime. It adds an explicit budget argument to intake, which the donor does not have (the donor's receive loop is not bounded by the window once packets arrive; see section 6). It omits the paused path, the send-blocks step, the lag report to the environment, the map timer, the active object and node timer passes, the emerge yield, and the send-recommended flag. `LagEstimate` reproduces the donor's decay and max rule; the 0.5 s gate uses the same debt-carry limiter.

```ts
// Licence: LGPL-2.1-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export const STEP_LEN_S = 0.09; // target cycle length in seconds (donor default 0.09)

// Periodic gate with debt carry: accumulate elapsed time, fire at most once per call
// when the interval is reached, and keep the remainder for later calls.
export class IntervalLimiter {
  private acc = 0;
  constructor(private readonly interval: number) {}

  step(dtime: number): boolean {
    this.acc += dtime;
    if (this.acc < this.interval) return false;
    this.acc -= this.interval;
    return true;
  }
}

// Lag estimate: the worst recent cycle, decayed by a fixed factor every half second
// (about halved every 60 s), and always raised by the newest cycle.
export class LagEstimate {
  private max = 0;
  private decay = new IntervalLimiter(0.5);

  record(dtime: number): number {
    if (this.decay.step(dtime)) this.max *= 0.99425;
    this.max = Math.max(this.max, dtime);
    return this.max;
  }
}

export interface CycleIO {
  step(dtime: number): void;       // world step, fed the measured previous cycle
  receive(budgetMs: number): void; // packet intake for the rest of the window
  nowMs(): number;
}

// One server cycle. Returns the measured cycle length, which is the next step's dtime.
export function runCycle(io: CycleIO, lastDtimeS: number, stepLenS: number): number {
  const t0 = io.nowMs();
  io.step(lastDtimeS);
  const remainingMs = stepLenS * 1000 - (io.nowMs() - t0);
  io.receive(Math.max(0, remainingMs)); // simplified: the donor does not bound this loop by the window (see gaps)
  return (io.nowMs() - t0) / 1000;
}
export {};
```

## 5. Lands in

- TARGET `src/fight/tick.ts` (new module): the one server cycle for the fight. The fixed-step duel clock and the packet intake budget live here; zone timers call the limiter from `origins/server/world-spawns.ts` (row 23).
- Parity-checklist row 18 (loot roll and XP award), sub-line "server tick: fixed step, input intake, per-tick NPC budget" (post-K item 3). The intake budget is the "input intake" part of that sub-line.
- Reuse tag: rewrite-from-idea (LGPL-2.1-or-later; clean-room only, shape not code)
- Brief rule served: 1 (one engine, one tick for every zone); rules 7-9 n/a

## 6. Gaps and risks

- LGPL-2.1-or-later: clean-room, shape only. The sketch is written from the mechanism, not the donor lines.
- Variable dtime (server.cpp 150, 166): a slow cycle changes every object's step length. That is right for a server that prefers not to fall behind, but wrong for the duel step, where damage and kill order must not depend on load. Reject it for the fight; keep it, if at all, for cosmetic timers.
- Intake is not bounded by the window. The window is checked only when a receive times out (server.cpp 1148-1150); a packet that arrives is processed (1158) and the loop does not check the window. A steady packet stream can keep one cycle running past its step. Frankendom must cap packets per step and count the overflow (MAX_ATTACKERS does not cover this).
- Debt-carry limiter (numeric.h 431-434): one firing per call. A long stall delivers one job per call, so a backlog empties over several cycles. Good for zone timers (row 23); for respawn, make sure a backlog cannot double-spawn.
- The yield to the emerge thread (server.cpp 1203-1222) is a lock-contention workaround. Frankendom has no emerge thread today; do not add one just to copy this.
- The dedicated main-thread loop says "always 50 ms" (4251) but the step runs on the ServerThread at the configured length. The comment is about the sleep, not the cadence.
- Game time in whole seconds with a remainder carry (serverenvironment.cpp 873-876) is fine for day and night. The fight clock should count server ticks, not seconds.
- Not read: `Server::AsyncRunStep` past line 752 (admin chat and later passes), `ServerActiveObject::step` body, `MapBlock::step` (node timers), the ABM per-block body (serverenvironment.cpp 1010-1060), the object and particle management bodies (1100-1147), `SendBlocks` (server.cpp 2572), the cached `m_cache_*` interval values.
