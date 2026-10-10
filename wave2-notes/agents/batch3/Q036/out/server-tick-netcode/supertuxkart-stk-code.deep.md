# supertuxkart-stk-code (server-tick-netcode, cell 1)

Donor: `/mnt/frankendom-donors/supertuxkart-stk-code/src/network/child_loop.cpp` | Licence: GPL-3.0-or-later (`COPYING`: "version 3 ... or (at your option) any later version"; child_loop.cpp header says the same) | C++ | symbol `ChildLoop::run`

Checked: Read in full: `ChildLoop::run` tick loop (child_loop.cpp 115-160), `ChildLoop::getLimitedDt` (37-76), `NetworkTimerSynchronizer::addAndSetTime` (network_timer_synchronizer.hpp 58-110). Read the tick block of `MainLoop::run` (main_loop.cpp 302-307, 460-463, 596-680), `RaceEventManager::update` (race_event_manager.cpp 60-71), `ProtocolManager::update` (protocol_manager.cpp 370-420), and the ping send and receive in stk_host.cpp (868-935, 1136-1182). Callers: I read one caller of `ChildLoop::run` (create_server_screen.cpp:440, bound via stk_host.cpp:99). Confidence high on the order of operations and the numbers. Not read: the body of `World::updateWorld`, `RewindManager::playEventsTill` and `rewindTo` internals, `GameProtocol` and the control-event handlers, and the default of `UserConfigParams::m_max_fps`. Not a camera cell (no camera_scope).

## 1. Mechanism

- The server runs its own loop, `ChildLoop::run`, separate from the client's `MainLoop::run`. Each pass it adds the real elapsed time to `left_over_time`, converts whole physics steps with `time2Ticks`, and carries the remainder (child_loop.cpp 133-136). The step length is `ticks2Time(1)`, i.e. 1/120 s, because `fps="120"` is read from the data file (data/stk_config.xml:147).
- Per tick, in this order (child_loop.cpp 139-158): (a) drain the protocol intake and update all protocols with `ProtocolManager::update(1)` (140-141); (b) if a race event manager is running, call `RaceEventManager::update(1, false)` (155), otherwise `World::updateWorld(1)` (157); (c) `World::updateTime(1)` (147 in the setup branch, 158 otherwise).
- Intake inside `ProtocolManager::update` (protocol_manager.cpp 380-417): first it sends every queued synchronous event to its protocol (382, 390), then it calls `update(ticks)` on each protocol type (413-417). So a client message that arrived before the pass is handled before the world step of that tick.
- Setup phase: if the world is in `SETUP_PHASE`, the loop calls `updateTime(1)` once and breaks (child_loop.cpp 144-148), so a long loading time does not turn into a burst of race steps.
- Frame cap, not a clamp: `getLimitedDt` on the server only sleeps when the measured fps is above `UserConfigParams::m_max_fps` (child_loop.cpp 64-69). It never reduces `dt`. After a stall, the loop runs every missed step (catch-up).
- The client loop (`MainLoop::run`) differs in three ways. (i) It clamps `dt` to 3/60 s, i.e. 50 ms, but only when not networked (main_loop.cpp 302-307). (ii) When networked and more than 1 s behind (`num_steps > time2Ticks(1.0f)`, 623-625), it sets `fast_forward`, and `RaceEventManager::update` then replays rewind events without stepping physics (race_event_manager.cpp 66-70). (iii) A `m_ticks_adjustment` hook (main_loop.cpp 596-619, setter main_loop.hpp 81) can add or remove steps from another thread. The setter has no caller in this snapshot (grep found only its definition), so treat (iii) as dead code.
- Clock sync (the server clock the client uses): the server sends its monotonic clock in a ping packet at 10 per second, only when not racing (or when joined players are waiting) (stk_host.cpp 868-874, 931-932). The client reads it (1142) and calls `addAndSetTime(ping, server_time)` (1179). Each sample is stored as (ping, server time, local receive time) (synchronizer 108). Samples closer than 50 ms are discarded (75). When 20 samples exist (83), each is dead-reckoned to now (ping/2 + server time + local elapsed, 89-90), the mean is taken (92), and the timer is set only if the mean is within the tolerance of the newest estimate (93-98). On a miss the 10 oldest samples are dropped (106).

## 2. Key functions

- `ChildLoop::run` tick loop: `/mnt/frankendom-donors/supertuxkart-stk-code/src/network/child_loop.cpp` 115-160. Accumulator, intake, world step, time advance.
- `ChildLoop::getLimitedDt`: `/mnt/frankendom-donors/supertuxkart-stk-code/src/network/child_loop.cpp` 37-76. Frame cap by sleep only; no clamp.
- `ProtocolManager::update`: `/mnt/frankendom-donors/supertuxkart-stk-code/src/network/protocol_manager.cpp` 370-420. Synchronous event drain, then protocol update with the tick count.
- `RaceEventManager::update`: `/mnt/frankendom-donors/supertuxkart-stk-code/src/network/race_event_manager.cpp` 60-71. Rewind replay, then world step unless fast_forward.
- `NetworkTimerSynchronizer::addAndSetTime`: `/mnt/frankendom-donors/supertuxkart-stk-code/src/network/network_timer_synchronizer.hpp` 58-110. Sample window, mean, tolerance, drop-on-miss.
- Client `MainLoop::run` tick block: `/mnt/frankendom-donors/supertuxkart-stk-code/src/main_loop.cpp` 460-463 (accumulator), 596-619 (unused adjustment), 623-680 (fast_forward and step loop).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Fixed-step accumulator: add real time, take `int(t * rate)` whole steps, carry the remainder | Physics rate 120 steps/s, read from data (data/stk_config.xml:147; stk_config.hpp:326 truncates) |
| Server catch-up with no dt clamp, so no simulated time is lost | None on the server (child_loop.cpp 37-76 has no clamp). Client offline clamp 50 ms = 3 frames at 60 Hz (main_loop.cpp 306-307) |
| Drain the input queue before each step, then step, then advance the clock | Ordering only (protocol_manager.cpp 380-417) |
| Client fast-forward threshold | 1.0 s of steps behind (main_loop.cpp 625) |
| Clock sample averaging: 20 samples, drop 10 on a miss | 20, 10 (synchronizer 83, 106) |
| Accept clock only when the mean is close to the newest estimate | 5 ms default tolerance (user_config.hpp 922) |
| Minimum spacing between clock samples | 50 ms (synchronizer 75) |
| Clock send rate | 10 per second (stk_host.cpp 874) |

## 4. TypeScript sketch

simplified: the sketch keeps the server order (drain intake, step the world, advance the clock) and the accumulator with remainder carry, and it reads the 120 rate as a parameter. It omits the frame-cap sleep, the setup-phase skip, the race event manager and rewind branch, the client fast-forward, the ticks adjustment, the clock synchroniser, and the protocol-type split. It also does not reproduce float rounding of the donor's `float` arithmetic. It does not clamp, as in the server loop.

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface TickWorld {
  drainEvents(): void;            // synchronous intake: queued client messages reach their handlers
  stepPhysics(ticks: number): void;
  advanceClock(ticks: number): void;
}

export interface ServerTickConfig {
  physicsFps: number;             // 120 in the donor's data file, read as data
}

export class FixedStepLoop {
  private leftOver = 0;           // seconds not yet simulated, carried to the next pass
  private readonly dt: number;

  constructor(private readonly cfg: ServerTickConfig, private readonly world: TickWorld) {
    this.dt = 1 / cfg.physicsFps;
  }

  // elapsedSeconds is the real time since the last pass. It is NOT clamped:
  // after a stall the loop runs every missed step (catch-up).
  pump(elapsedSeconds: number): number {
    this.leftOver += elapsedSeconds;
    const steps = Math.trunc(this.leftOver * this.cfg.physicsFps);
    this.leftOver -= steps * this.dt;
    for (let i = 0; i < steps; i++) {
      this.world.drainEvents();   // intake first, so this tick's input is seen by the step
      this.world.stepPhysics(1);
      this.world.advanceClock(1);
    }
    return steps;
  }
}
```

Typecheck: the same block with `export {}` appended, run with `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS: exit 0.

## 5. Lands in

- TARGET `src/fight/net-tick.ts` (new module): the server step loop that drives the one engine. Parity-checklist row 18, sub-line "server tick: fixed step, input intake, per-tick NPC budget" (post-K item 3). Intake ordering is the same sub-line; row 5 (controls) is not the owner of the loop.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: 1 (one engine: the server steps the same engine the Pit and zones use, and the step count is decided on the server); server-verified kills follow from the step being server-side.

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism, not translated.
- The server has no catch-up cap. A 2 s stall at 120 Hz is about 240 steps run in one pass. In a fight that is a burst of AI and hit steps. Frankendom needs an explicit per-tick budget and a catch-up cap (post-K item 3 sub-line), set by Lead. The donor does not provide one.
- The client fast-forward (main_loop.cpp 623-625; race_event_manager.cpp 69-70) skips physics and replays rewind events. That is rollback netcode. Under server-verified kills it is not needed unless we add client prediction. Not ported.
- The clock sync only runs before the race, and the server does not send clock pings while racing (stk_host.cpp 868). Frankendom has no clock ruling. If a duel needs a shared clock, decide that separately; do not copy the timing windows as given.
- The `m_ticks_adjustment` hook has no caller in this snapshot (main_loop.hpp 81). Do not port it as a live mechanism.
- Not read: `World::updateWorld` body, `RewindManager` internals, the control-event handlers in `GameProtocol`, `UserConfigParams::m_max_fps`. So the input intake for kart controls, and how each control is timestamped, is not verified here.

Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
Brief rule served: 1 (one engine on the server); post-K item 3 (server tick, per-tick budget) for the catch-up gap.

Best transferable idea: Advance the server by whole fixed steps from an accumulator that carries the remainder, drain client input before each step, and cap catch-up explicitly instead of clamping elapsed time.

Decision (proposed): adapt. Take the accumulator with carry and intake-before-step for the server tick (row 18), but add a catch-up cap set in the engine, because the donor's uncapped catch-up would run a long stall's steps in one pass, and do not port the client fast-forward or the clock averaging until a shared clock is ruled on.
Acceptance: Server test: calling `pump` with 2.5 s of elapsed time at 120 Hz runs at most the capped step count in one call (not about 300), and an input enqueued before tick N is applied in the intake of step N before its physics step.
