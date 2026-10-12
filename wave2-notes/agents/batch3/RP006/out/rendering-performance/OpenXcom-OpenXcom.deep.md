# OpenXcom-OpenXcom (rendering-performance, cell 17)

Donor: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Engine/Timer.cpp` | Licence: GPL-3.0-or-later (per Timer.cpp header 7-8: GNU GPL, version 3 or any later version; repo LICENSE.txt is GPL v3) | C++ | symbol `Timer::think`

Checked: `Timer::think` (Timer.cpp 109-138, read in full), `slowTick` (30-38, read), `Game::run` loop (Game.cpp 143; the think and draw part, 291-339, read in full), `State::blit` and `State::isScreen` (State.cpp 217-219, 303-306, read), `Surface::blit`, `draw`, `invalidate`, `resize` (Surface.cpp 630-662, 1012-1014, 1044-1100, read), `Screen::flip` and `Screen::clear` (Screen.cpp 188-225, read), `BattlescapeState::think` and `setStateInterval` (BattlescapeState.cpp 561-572, 1509-1511, read), options defaults (Options.cpp 76, 291-292, read), explosion interval caller (ExplosionBState.cpp:130, the only caller read). Confidence: high on the step, catch-up and cull order (read end to end). Not read: `Zoom::flipWithZoom` and the OpenGL path (Screen.cpp flip branch taken when scaled or OpenGL), the body of `BattlescapeState::handleState` (the battle state machine the tick calls), Battlescape map drawing. The rendering topic has no draw-call batching, atlas or LOD code in this donor; what it does have is frame pacing and layer culling, and that is what this note covers. `camera_scope` not applicable (not a camera cell).

## 1. Mechanism

- Two cadences in one loop. Logic runs on every pass of the loop: `Game::run` calls the top state's `think()` once per pass (Game.cpp:295). Drawing is separate and rate-limited: when a frame cap is set, `_timeUntilNextFrame` is recomputed each pass from the time of the last draw (Game.cpp:297-306), and a frame is drawn only when that wait has run out (Game.cpp:309). Nothing is drawn or thought while `runningState == PAUSED` (Game.cpp:292).
- Fixed-interval timers with catch-up (the `Timer` class) are how the battle runs its clock. `BattlescapeState` holds two frame-skipping timers at 100 ms (`DEFAULT_ANIM_SPEED`, BattlescapeState.h:103; BattlescapeState.cpp:467-470): `_animTimer` (callback `animate`, line 468) and `_gameTimer` (callback `handleState`, line 471). Both are driven from `BattlescapeState::think` once per loop pass, and only when no popup is open (BattlescapeState.cpp:565-572).
- Order of steps inside `Timer::think` (Timer.cpp 109-138), as the code runs:
  (a) take `now` from `slowTick()` at the top of the function; (b) if `now - schedule >= interval`, loop: call the callback, then advance the schedule by one interval (119-125); (c) a timer without frame skipping stops after one callback (127); a frame-skipping timer may run up to `maxFrameSkip + 1` callbacks in one call (119, see section 6); (d) call the surface callback once if set (130-133); (e) take `_start = slowTick()` (134); (f) if `_start` is later than the schedule, pull the schedule up to `_start` (135). So a stall drops the backlog instead of replaying it ("don't play animations in ffwd to catch up", comment on line 135).
- Game speed: `slowTick()` turns `SDL_GetTicks()` into a scaled clock: milliseconds kept as 1/16 units (`accurate = 4`), the delta since the last call is divided by `gameSlowSpeed` (Timer.cpp 33-37). With the debug option on, F8 steps the divisor 1, 5, 15, back to 1 (Screen.cpp 150-154; the debug gate is at 146 and the F8 check at 148 in `Screen::handle`).
- Culling, two levels. (i) Layers: the draw pass walks down the state stack to the topmost full-screen state (`isScreen`, State.cpp:217-219) and draws only that state and the ones above it (Game.cpp:316-324). States covered by a full-screen state are not drawn at all. (ii) Surfaces: `Surface::blit` draws only if the surface is visible and not hidden (Surface.cpp:645), and re-runs `draw()` only when its dirty flag is set (647-648; `draw` clears it, 632; `invalidate` sets it, 1014). Inside a visible state every visible child is blitted, in list order (State.cpp:303-306). There is no occlusion test between siblings.
- Presentation: the whole screen buffer is cleared every drawn frame (Game.cpp:314; Screen.cpp:221-225), every visible surface is blitted with one `SDL_BlitSurface` call each (Surface.cpp:662), and the buffer is flipped to the screen (Game.cpp:328; Screen.cpp:188-212). No dirty rectangles.
- Idle pacing: a 1 ms sleep per running pass (Game.cpp:336), and a 100 ms sleep while slowed or paused (Game.cpp:339).

## 2. Key functions

- `Timer::think`: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Engine/Timer.cpp` 109-138. Catch-up loop 119-127, schedule advance 125, stall resync 134-135.
- `slowTick` (scaled clock): `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Engine/Timer.cpp` 30-38.
- Main loop (think, frame gate, layer cull, flip, sleep): `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Engine/Game.cpp` 143 (`Game::run`), 291-339 (read).
- Battle timers and their drive: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Battlescape/BattlescapeState.cpp` 467-471 (construct, callbacks), 561-572 (think), 1509-1511 (`setStateInterval`).
- Per-state tick change: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Battlescape/ExplosionBState.cpp` 130 (sets the battle tick to half the default).
- Layer and surface culling: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Engine/State.cpp` 217-219, 303-306; `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Engine/Surface.cpp` 643-662.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Fixed-interval step with a schedule that advances by one interval per step | Battle tick interval 100 ms (theirs, BattlescapeState.h:103); explosion tick 50 ms = half (theirs, ExplosionBState.cpp:130) |
| Catch-up cap per update | Code default 8 (theirs, Timer.cpp:43); the value copied from Options at each Timer construction (Timer.cpp:53); the option's registered default is 0 (theirs, Options.cpp:76), so a stock install runs one step per update with no catch-up unless the options file overrides it (options file not read) |
| Stall resync: drop the backlog, do not replay it | Resync threshold: any lag at all in the donor (Timer.cpp:135); the sketch uses a full missed interval (fix, section 6) |
| Scaled game clock, dividing the delta | Divisor 1, 5, 15 (theirs, Screen.cpp:152-153); time in 1/16 ms units (Timer.cpp:34) |
| Frame cap from the last draw | 60 fps active, 30 inactive (theirs, Options.cpp:291-292); MorphOS branch 15 (Options.cpp:288-289) |
| Layer cull: draw from the topmost full-screen layer up | None (mechanism; full-screen flag set per state) |
| Idle sleep | 1 ms running, 100 ms paused or slowed (theirs, Game.cpp:336, 339) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: step while due, advance the schedule by one interval per step, cap the catch-up, and resync only after a stall. It fixes three donor faults: the cap allows `cap + 1` steps in the donor (Timer.cpp:119), so the sketch runs `max(1, cap)`; the donor resyncs whenever the update is late by any amount (Timer.cpp:134-135), so the sketch resyncs only when a full interval is still missed; the donor's scaled clock truncates each delta to whole 1/16 ms units, so the sketch keeps floats. The sketch omits: the surface callback, the `game->isState(state)` guard that stops a callback that popped its own state, the pause and slow sleeps, and the frame limiter (Frankendom draws on requestAnimationFrame, which already paces frames). `drawVisibleLayers` reorders nothing; it skips covered layers, as Game.cpp:316-324 does.

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface StepTimer {
  interval: number;      // ms per logic step (donor battle tick: 100)
  frameSkipCap: number;  // extra catch-up steps allowed in one update (0 = one step)
  scheduledAt: number;   // ms time of the next scheduled step
  onStep: () => void;
}

// Runs the due logic steps for time `now` (ms). Steps advance the schedule by one interval each,
// so the phase does not move with the time of the update. A stall (a full interval still missed
// after the catch-up) drops the backlog and resyncs to `now`; a small lag does not.
export function pumpStepTimer(t: StepTimer, now: number): number {
  const maxSteps = Math.max(1, t.frameSkipCap); // at least one step; never cap + 1
  let steps = 0;
  while (now - t.scheduledAt >= t.interval && steps < maxSteps) {
    t.onStep();
    t.scheduledAt += t.interval;
    steps++;
  }
  if (now - t.scheduledAt >= t.interval) t.scheduledAt = now; // stall: do not replay the backlog
  return steps;
}

// Game-speed clock: keeps fractional ms so that a slow factor does not lose time on every call.
export function makeScaledClock(start: number, slow: number): (now: number) => number {
  let last = start;
  let scaled = start;
  return (now: number): number => {
    scaled += (now - last) / slow;
    last = now;
    return scaled;
  };
}

export interface Layer {
  fullScreen: boolean;
  draw: () => void;
}

// Draws only the topmost full-screen layer and the layers above it. Layers below it are covered, so they are skipped.
export function drawVisibleLayers(stack: Layer[]): void {
  if (stack.length === 0) return;
  let i = stack.length - 1;
  while (i > 0 && !stack[i].fullScreen) i--;
  for (; i < stack.length; i++) stack[i].draw();
}

export {};
```

## 5. Lands in

- TARGET `src/fight/frame-clock.ts` (new; client-only presentation clock, the engine never reads it). Parity-checklist row 6 (hero actor/animation): the clock steps hero and creature animation and hit-stop timing on the client. The hint row 12 (combat sound cues) does not fit this mechanism, so row 6 is used.
- Server side, if the same timer shape drives the server's fixed tick: that lands under row 18 (loot roll and XP award), sub-line "server tick: fixed step, input intake, per-tick NPC budget" (post-K item 3). Not decided here; the donor's catch-up is a client-presentation idea, and a server must not replay missed NPC steps in a burst.
- Reuse tag: adapt-idea (GPL-3.0; clean-room only, shape only; no lines copied)
- Brief rule served: the licence rule (GPL-3.0: clean-room, shape only); presentation-only clock, the engine untouched (addendum: camera, HUD and sound are client-only).

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the order of steps described in section 1, not from the donor lines.
- Defect 1, catch-up count: `i <= maxFrameSkip` runs `maxFrameSkip + 1` steps (Timer.cpp:119). Fix: the sketch runs `max(1, cap)` steps.
- Defect 2, resync on any lag: Timer.cpp:134-135 pulls the schedule up to `now` after any late update, so the cadence drifts by the late amount each time. Fix: resync only after a full missed interval (sketch).
- Defect 3, scaled clock truncation: `(new_time - old_time) / Timer::gameSlowSpeed` on integers (Timer.cpp:35). Arithmetic, not measured: a 1 ms step at divisor 15 gives 16 / 15 = 1 unit where 1.067 is meant, so the slow clock runs about 6% slow. Fix: float accumulator (sketch).
- Defect 4, default mismatch: the code default is 8 (Timer.cpp:43) but the option default is 0 (Options.cpp:76) and the Timer copies the option (Timer.cpp:53). A stock install therefore has no catch-up. Fix: one named constant with a test that asserts the value used.
- Defect 5, frame limiter drift (Game.cpp:302, 312): the next draw is measured from the actual time of the last draw, not from a scheduled slot, so the cadence drifts. Not needed on requestAnimationFrame; if a manual cap is ever used, schedule slots and resync as in the sketch.
- Not a defect, but do not copy: a full-buffer clear, blit and flip every frame with no dirty rectangles (Game.cpp:314, 326-328; Screen.cpp:196, 225). Fine for the desktop SDL donor. On a phone canvas, keep the per-surface dirty flag (Surface.cpp:647) and redraw only changed layers.
- Frankendom gap, layer cull: a full-screen Pit overlay should let the zone scene under it skip draw calls (the idea in Game.cpp:316-324). The Pit stays a client; this is client-only. Acceptance is in the Decision block above.
- Frankendom gap, server: the battle tick here runs up to `cap + 1` steps per update (Timer.cpp:119). If the server copied this shape, a late server pass would run a burst of NPC steps in one tick, which breaks the per-tick NPC budget (row 18 sub-line). The server must cap steps per tick and drop the rest.
- No donor coverage for draw-call batching, texture atlases or LOD: this cell is about frame pacing and culling only. Those topics need another donor.
- Not read: the OpenGL and `Zoom::flipWithZoom` path, `handleState` (the battle state machine behind the tick), Battlescape map drawing, and the options file that can override the catch-up default.

Best transferable idea: a fixed-step client timer that advances its schedule by one interval per step, caps the catch-up, and resyncs only after a full stall, plus a layer cull that skips everything under the topmost full-screen layer.
Decision (proposed): adapt — the capped catch-up and the stall resync suit client animation on phones (a backgrounded tab must not replay an attack in one burst); the donor's off-by-one, resync-on-any-lag and integer clock are fixed in the sketch, and the frame limiter is dropped because requestAnimationFrame already paces frames.
Acceptance: in a client unit test, after a 2 s stall a hero animation with cap 0 advances exactly one 100 ms step and its schedule resyncs to `now`; and with the Pit full-screen layer up, the zone layer's `draw` is not called (a counter reads 0 for that frame).

Reuse tag: adapt-idea (GPL-3.0; clean-room, shape only)
Brief rule served: licence rule (GPL-3.0, clean-room); presentation-only clock, engine untouched
