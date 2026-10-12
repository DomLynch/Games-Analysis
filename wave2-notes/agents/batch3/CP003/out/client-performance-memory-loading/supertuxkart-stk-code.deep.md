# supertuxkart-stk-code (client-performance-memory-loading, cell 39)

Donor: `/mnt/frankendom-donors/supertuxkart-stk-code/src/main_loop.cpp` (with `src/main_loop.hpp`, `src/network/child_loop.cpp`, `src/config/stk_config.hpp`, `data/stk_config.xml`, `src/config/user_config.hpp`) | Licence: GPL-3.0-or-later (`COPYING`: "either version 3 of the License, or (at your option) any later version"; the `main_loop.cpp` header says the same) | C++ | symbol `MainLoop::getLimitedDt` and `MainLoop::run`

Checked: `MainLoop::getLimitedDt` (196-312) read in full; `MainLoop::run` read in full for 400-470, 560-660 and 706-740 (not read: 470-559, the shutdown, loading and GUI branches, and 660-705); `updateRace` (320-329), `setTicksAdjustment` (main_loop.hpp 81-85), `convertToTime` (main_loop.hpp 58-64), `ChildLoop::getLimitedDt` (child_loop.cpp 37-76) and the `ChildLoop` step loop (126-150) read. Callers: `getLimitedDt` has one caller (`run`, line 460); `setTicksAdjustment` has no caller under `src/`, `lib/` or `tools/` (grep); `setAllowLargeDt` is called from `src/modes/cutscene_world.cpp` (79, 180). `ChildLoop` is the loop of a child process that runs a `ServerLobby` (its use at child_loop.cpp 126-130 is the only evidence of its role; inferred). Confidence high on the client loop order (read line by line); medium on the server role. Not run: typecheck only. Camera: not a camera cell (no camera_scope).

## 1. Mechanism

- Two loops. The client loop is `MainLoop::run` (400-740). A server-side loop is `ChildLoop` (child_loop.cpp). Both turn wall time into whole fixed physics ticks with a leftover accumulator.
- Clock (client): `getLimitedDt` returns the wall time since its previous call (198, 231, 257), converted from the steady clock to ms (`convertToTime`, main_loop.hpp 58-64) and then to seconds (310). If that time is 0 it sleeps 1 ms and tries again (267-277). This is the only sleep in the function. The doc comment above it (192-194) says the function sleeps to reach the maximum frame rate; that is out of date (see Gaps).
- Clamp (client, offline or no world): unless a cutscene allows large steps (302-303), the frame time is capped at `3 * (1/60) s` = 50 ms (306-307). The comment (299-301) says to slow the shown time when the machine cannot keep up, and that the clamp is not allowed in a network game, because client and server clocks must match. The cap is not in ticks: it is fixed in ms.
- Accumulator (client): each frame, `left_over_time += getLimitedDt()` (460); `num_steps = time2Ticks(left_over_time)` (461), which truncates `t * physics_fps` to an int; `dt = ticks2Time(1)` (462); `left_over_time -= num_steps * dt` (463). The physics rate is 120 Hz (`fps="120"` in data/stk_config.xml, physics node at line 145, value at 147), so one tick is 1/120 s.
- Frame order (client): (a) `frame_duration = num_steps * dt` (564), then the graphics update, input and GUI update with `frame_duration` (565-580); this is before the network correction. (b) Network correction (596-619): a positive debt is added to this frame's steps and cleared (599-603); a negative debt removes steps now and keeps the remainder for later frames (604-616). (c) `fast_forward` is set only for a networked client with more than `time2Ticks(1.0)` = 120 ticks (623-625). (d) The loop runs `num_steps` times, each calling `updateRace(1, fast_forward)` (626, 645). In `updateRace` (320-329) `fast_forward` is used only by the online race event manager (325-326); the offline branch ignores it (328).
- Frame cap (client, end of frame): frame time is measured from `frame_start` (458) to `frame_end` (713-714). If swap interval is 0 (no vsync) or there is no graphics, and the fps is above the cap (724-727), the loop sleeps `1/max_fps - frame_time` (729-733). The cap is the recording fps when recording with a limit, else the user's `max_fps` (717-718); default 120 (user_config.hpp 661). The throttle is on by default (108).
- Server child loop (`ChildLoop::getLimitedDt`, child_loop.cpp 37-76): it has no clamp. It loops: measure dt since the last call (49); if `current_fps` is above `max_fps`, sleep `1000/max - 1000/current` ms (integer division, minimum 1 ms, 69-72) and measure again; it returns when the fps is at or below the cap (64-67). Its step loop is the same accumulator shape (133-136). In the setup phase it skips the backlog: when the world is in `SETUP_PHASE` it runs one `updateTime(1)` and breaks out of the step loop (143-148), with the comment "Skip the large num steps contributed by loading time".

## 2. Key functions

- `MainLoop::getLimitedDt`: `/mnt/frankendom-donors/supertuxkart-stk-code/src/main_loop.cpp` 196-312. Wall-time delta, zero-time wait, clamp, ms to seconds.
- `MainLoop::run` (frame step): `/mnt/frankendom-donors/supertuxkart-stk-code/src/main_loop.cpp` 400-740. Accumulator (460-463), graphics before correction (564-580), network debt (596-619), fast-forward flag (623-625), step loop (626-648), frame cap (713-735).
- `MainLoop::updateRace`: `/mnt/frankendom-donors/supertuxkart-stk-code/src/main_loop.cpp` 320-329.
- `ChildLoop::getLimitedDt`: `/mnt/frankendom-donors/supertuxkart-stk-code/src/network/child_loop.cpp` 37-76. Server cap by sleeping inside the dt function.
- `ChildLoop` step loop with the setup-phase skip: `/mnt/frankendom-donors/supertuxkart-stk-code/src/network/child_loop.cpp` 133-150.
- `time2Ticks` and `ticks2Time`: `/mnt/frankendom-donors/supertuxkart-stk-code/src/config/stk_config.hpp` 323, 326.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Fixed physics step, one tick = 1 / tick rate | 120 Hz (stk_config.xml 145-147) |
| Clamp on one frame's wall time, in steps | Written as 3 steps of 1/60 s = 50 ms (main_loop.cpp 305-306). At 120 Hz that is 6 ticks, not 3 (see Gaps). |
| Fast-forward threshold for a networked client | More than 1 s of ticks (main_loop.cpp 625, `time2Ticks(1.0f)`) |
| Frame cap | `max_fps` default 120 (user_config.hpp 661); throttle on by default (main_loop.cpp 108) |
| Server cap | Same user `max_fps` (child_loop.cpp 65); no clamp |
| Network debt | Synchronised int; positive adds steps now; negative removes steps and carries the rest (main_loop.hpp 51, 81-85; main_loop.cpp 599-616). No caller under `src/`. |
| Loading skip (server) | One tick, then break, while in setup (child_loop.cpp 144-148) |

## 4. TypeScript sketch

simplified: the sketch follows the client `MainLoop` order: wall-time clamp and accumulator, then the graphics update with the pre-correction step count, then the network debt, then the fast-forward flag, then the step loop, then the frame cap. It takes the frame start as the time for both the clock and the cap (the donor stamps `frame_start` at 458, before `getLimitedDt` reads its own clock at 231). It writes the clamp in ticks, `maxStepsPerFrame * tickMs` (the fix for defect 2). It omits: the 1 ms wait when the clock has not moved (267-277), the shutdown and loading branches, the cutscene large-step switch, the replay history, the `ProtocolManager` update, and the recording fps. The `Sim` interface is injected so the sketch runs against a fake clock.

```ts
// Licence: GPL-3.0-or-later (donor, src/main_loop.cpp header). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Pacing {
  tickMs: number;                // one fixed physics tick in ms, 1000 / tick rate
  maxStepsPerFrame: number;      // cap on wall time per frame, counted in ticks
  clampEnabled: boolean;         // false when networked: the local clock must match the server
  networkedClient: boolean;      // only a networked client fast-forwards
  fastForwardTicks: number;      // a networked client skips the full update above this many ticks
  maxFps: number;                // user frame-rate cap
  vsync: boolean;                // when vsync paces the frame, no software throttle
}

interface PacingState {
  prevMs: number;                // wall time at the previous frame
  leftoverMs: number;            // time not yet turned into a whole tick
  debtTicks: number;             // network correction: positive adds ticks now, negative removes them and carries the rest
}

interface Sim {
  now(): number;                 // monotonic milliseconds
  sleep(ms: number): void;
  graphics(frameMs: number): void;       // one frame of visuals, before the physics steps
  step(fastForward: boolean): boolean;   // one physics tick; false = stop now
}

// Stage 1: wall time to whole ticks, before any network correction.
function accumulate(st: PacingState, nowMs: number, p: Pacing): number {
  let dt = nowMs - st.prevMs;
  st.prevMs = nowMs;
  if (p.clampEnabled) {
    const capMs = p.maxStepsPerFrame * p.tickMs;   // fix: the cap is written in ticks, so it follows the tick rate
    if (dt > capMs) dt = capMs;                    // slow the shown time instead of catching up
  }
  st.leftoverMs += dt;
  const ticks = Math.floor(st.leftoverMs / p.tickMs);
  st.leftoverMs -= ticks * p.tickMs;
  return ticks;
}

// Stage 2: apply the network correction. A negative debt removes steps now and carries the rest.
function applyDebt(st: PacingState, ticks: number): number {
  if (st.debtTicks > 0) {
    const t = ticks + st.debtTicks;
    st.debtTicks = 0;
    return t;
  }
  if (st.debtTicks < 0) {
    const next = ticks + st.debtTicks;
    if (next < 0) {
      st.debtTicks = next;
      return 0;
    }
    st.debtTicks = 0;
    return next;
  }
  return ticks;
}

// Software frame cap: sleep only when the frame came in faster than the cap, and never with vsync on.
function throttleWaitMs(frameStartMs: number, nowMs: number, p: Pacing): number {
  if (p.vsync) return 0;
  const frameMs = nowMs - frameStartMs;
  if (frameMs > 0 && 1000 / frameMs <= p.maxFps) return 0;
  return Math.max(0, 1000 / p.maxFps - frameMs);
}

function frame(st: PacingState, p: Pacing, sim: Sim): void {
  const frameStartMs = sim.now();
  const ticksBeforeDebt = accumulate(st, frameStartMs, p);
  sim.graphics(ticksBeforeDebt * p.tickMs);      // visuals advance by the steps taken before the correction
  const ticks = applyDebt(st, ticksBeforeDebt);
  const fastForward = p.networkedClient && ticks > p.fastForwardTicks;
  for (let i = 0; i < ticks; i++) {
    if (!sim.step(fastForward)) break;
  }
  const wait = throttleWaitMs(frameStartMs, sim.now(), p);
  if (wait > 0) sim.sleep(wait);
}
```

## 5. Lands in

- TARGET `src/fight/frame-pacing.ts` (new): the client's fixed-step accumulator, the per-frame cap written in ticks, and the software frame cap. Parity-checklist row 18, sub-line "server tick: fixed step" (the fixed-step half). The Pit and the zone client call it; the server does not run it.
- today: the Frankendom client frame loop (not read in this pass).
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)

Best transferable idea: a fixed physics tick fed by an accumulator, capped per frame in ticks (not ms), so a stalled tab slows the shown time instead of replaying the missed steps.
Decision (proposed): adapt - take the accumulator, the tick-counted cap and the vsync-aware throttle; do not copy the networked exemption from the cap, and do not put any time dilation on the server (Frankendom's kills are server-verified).
Acceptance: a fake-clock test with a 2 s gap runs at most 3 fight steps in the frame after the gap and in the frames after it, and the fight visibly slows rather than skipping; a server test asserts the server's step count is unaffected by the client's frame cap.

Brief rule served: 1 (one engine: the same step function runs in the Pit and zones); the server-verified kill rule (the server runs its own ticks and the client cap never changes server ticks).

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the described order, not translated.
- Defect 1, stale doc: the comment above `getLimitedDt` (main_loop.cpp 192-194) says the function sleeps to reach the maximum frame rate. It does not: its only sleep is the 1 ms wait for a zero delta (267-277). The frame cap is at the end of `run` (724-734). fix: move the comment to the cap, and state in `getLimitedDt` that it only measures time.
- Defect 2, cap in ms, assumes 60 Hz: the comment at 305 says "time 3 internal substeps take" and the constant is `3.0f*1.0f / 60.0f*1000.0f` (306). Physics runs at 120 Hz (stk_config.xml 147), so the cap is 6 ticks (50 ms), not 3. fix: write the cap as `maxStepsPerFrame * tickMs` (the sketch does this), so the cap follows the tick rate.
- Defect 3, server has no cap: the networked game skips the clamp (main_loop.cpp 302-303), and the server child loop has no clamp at all (child_loop.cpp 37-76). Its only skip is the setup-phase backlog drop (144-148). A long server stall in a live game would run every missed tick in one frame. The code does not say whether this is intended. fix: check before copying; if not intended, give the server a tick cap (not a time cap), and keep the server tick count independent of client frames.
- Defect 4, integer division in the child loop: `wait_time = 1000 / max_fps - 1000 / current_fps` (child_loop.cpp 69) rounds each term to whole ms and has a 1 ms minimum (70). At a 120 cap the result is coarse, so the loop sleeps in short steps and measures again (64-72). fix: compute with floating point, sleep once, and re-measure.
- Dead network debt: `setTicksAdjustment` (main_loop.hpp 81-85) has no caller in `src/`, `lib/` or `tools/`. The debt-carry logic (main_loop.cpp 596-619) is therefore unused in this checkout. Treat it as a pattern to check, not as proof it works.
- Fast-forward is online-race only: `fast_forward` reaches the race event manager only when it runs (325-326); offline, a large debt runs all its steps (328). Not a problem for the client cap, but a gap if the Pit ever goes networked.
- Not read: the quality presets (`src/states_screens/options/options_screen_video.cpp`), the level-of-detail node (`src/graphics/lod_node.cpp`), and the texture and asset loading path (not in this topic's scope for this note). Those belong to the other topics in this category.
- Not run: the sketch is typechecked only (`tsc --strict`, ES2020); behaviour claims come from reading the donor.
