# diasurgical-DevilutionX (rendering-performance, cell 1)

Donor: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/diablo.cpp` (with `Source/nthread.cpp`, `Source/engine/dx.cpp`, `Source/engine/render/scrollrt.cpp`) | Licence: Sustainable Use License 1.0 (`LICENSE.md`, read in full; non-commercial and free-of-charge distribution only; clean-room, shape only) | C++ | symbol `RunGameLoop`

Checked: Read in full: `RunGameLoop` (diablo.cpp 867-950), `game_loop` (3490-3507), `nthread.cpp` 105-260 (tick gate, fraction, turn receive), `dx.cpp` 99-111 and 287-350, `backbuffer_state.cpp`. Read in part: `scrollrt.cpp` DrawGame (1229-1270), DrawAndBlit (1834-1870, 1900-1930), `DrawTileContent` header only (992-996). Not read: `DrawFloor`, `DrawOOB`, `Lightmap::build` body (light_render.cpp 513-523 only), `AnimationInfo` use of the fraction, multiplayer lockstep detail beyond the tick gate. The lead's hint file `Source/lighting.cpp` is light and vision state, not the frame path (read 1-40 only). Singleplayer uses the loopback turn provider (`dvlnet/loopback.cpp:45-52`); where singleplayer selects it was not checked. Confidence: high on the loop order; medium on the singleplayer path. Camera: not a camera cell. Typecheck of the sketch: passed on the VPS (`tsc --noEmit --strict --target es2020`).

## 1. Mechanism

Logic and drawing are separate. Logic runs in fixed 50 ms steps on a deadline clock. Drawing runs on every pass of the loop, but is skipped when logic has fallen more than one step behind.

- Each pass of `RunGameLoop` drains events, then asks the gate `nthread_has_500ms_passed(&drawGame)` (diablo.cpp 925). The gate returns true when `now >= last_tick` (nthread.cpp 243). `last_tick` is the time the next step is due. `drawGame` is `(now - last_tick) <= gnTickDelay` (nthread.cpp 241), measured before the step runs.
- Long stall: if more than 10 steps are missed (nthread.cpp 219), singleplayer sets `last_tick = now` (232), so no burst of catch-up steps. Multiplayer does not reset (221-228), because the lag is needed for lockstep sync.
- Step due: `game_loop` (diablo.cpp 944). Singleplayer runs one GameLogic per call and breaks (3503). Multiplayer may run up to 3 (3492). Each step calls `multi_handle_delta`, which calls `nthread_recv_turns`, which moves `last_tick` forward by one step (nthread.cpp 136). The clock moves from its old deadline, not from "now", so it does not drift. If the turn receive fails (122-127), the clock does not move.
- Draw: `if (drawGame) DrawAndBlit();` (diablo.cpp 947). So a late step still runs its logic, but its frame is dropped. The donor comment says why: "try to speed-up the game by skipping the rendering" (nthread.cpp 239).
- Not due: the loop still processes input and network packets, then `RedrawViewport(); DrawAndBlit();` (diablo.cpp 937-938). The screen is never frozen while waiting for a step.
- Interpolation fraction: `DrawAndBlit` calls `nthread_UpdateProgressToNextGameTick()` (scrollrt.cpp 1868). It computes `ticksMissing = last_tick - now`. If the step is due, the fraction is full (253). Otherwise `fraction = ticksAdvanced * 128 / gnTickDelay`, clamped to 0..128 (251-258). The scale 128 is `baseValueFraction` (animationinfo.h 114). While paused, in a menu, or in demo mode, the function returns early (248) and the old fraction stays.
- Frame cap (separate from the clock): `LimitFrameRate` (dx.cpp 99-111) runs only in CPU-sleep mode (101). The default is VerticalSync on desktop (options.cpp 783-786, not SDL1 or NXDK). On Android the option is hidden (options.cpp 777-778). The build wiring for Android was not checked.
- Culling in the same pass: `DrawGame` starts from `tileColumns` and `tileRows` (scrollrt.cpp 1718-1719). Panels cover columns (1241). While the player walks, a margin is added in the direction of travel (1248-1267): N and S add 2 rows; NE adds 1 column and 2 rows; E and W add 1 column; SE, SW and NW add 1 column and 1 row. `DrawTileContent` adds `MicroTileLen` rows (995).
- Partial redraw: dirty state is None, ViewportOnly, or All (backbuffer_state.cpp 56-80), plus one flag per panel component. `DrawAndBlit` redraws only the viewport height when only the viewport is dirty (scrollrt.cpp 1859).

## 2. Key functions

- `RunGameLoop`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/diablo.cpp` 867-950. The whole loop: gate, input, step, draw, dirty flags.
- `game_loop`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/diablo.cpp` 3490-3507. Steps per call: 1 singleplayer, up to 3 multiplayer.
- `nthread_has_500ms_passed`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/nthread.cpp` 214-244. The tick gate, catch-up clamp, and skip-draw flag. (The name says 500 ms; the period is `gnTickDelay`.)
- `nthread_recv_turns`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/nthread.cpp` 105-138. Advances the clock at 111, 119, and 136.
- `nthread_UpdateProgressToNextGameTick`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/nthread.cpp` 246-260. The 0..128 interpolation fraction.
- `LimitFrameRate` and `RenderPresent`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/engine/dx.cpp` 99-111 and 287-350.
- `DrawGame` and `DrawAndBlit`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/engine/render/scrollrt.cpp` 1229-1270 and 1834-1870.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant |
|---|---|
| Fixed logic step, deadline advanced by the step | 50 ms (`gnTickDelay = 50`, diablo.cpp 146); set from `1000 / nTickRate` in multi.cpp 879 and gamemenu.cpp 277 (the nTickRate value was not read) |
| Stall rule: forget the backlog if more than 10 steps late | 10 steps (nthread.cpp 219); singleplayer only |
| Steps per call | 1 singleplayer (diablo.cpp 3503); 3 multiplayer (3492) |
| Skip the draw, not the logic, when more than one step is pending | threshold 1 step (nthread.cpp 241) |
| Interpolation fraction for animation between steps | 0..128, scale 128 (animationinfo.h 114) |
| Frame limiter sleep | `v / 1000 + 1` ms (dx.cpp 108); only in CPU-sleep mode |
| Refresh period | `1000000 / refreshRate` (display.cpp 685), refresh default 60 (display.cpp 667) |
| Visible window, minus panels | panel columns removed: 4, or 2 when zoomed (scrollrt.cpp 1241) |
| Walk margin | N, S: +2 rows; NE: +1 column, +2 rows; E, W: +1 column; SE, SW, NW: +1 column, +1 row (scrollrt.cpp 1251-1267) |

Defects. Keep the idea; each fix is listed.

1. The limiter sleep uses `v = tc % refreshDelay` (dx.cpp 107), which is time since the period started, not time left until the deadline. Hand trace, not run: from an idle start, the sleeps come out 2, 4, 8, 16, 15 ms, not one steady period. Fix: sleep `max(0, deadline - now)` and advance the deadline by one period from the old deadline.
2. The deadline is built from `tc` read before the sleep (dx.cpp 104 and 110). Fix: read the clock again after the sleep, or advance from the old deadline (as in fix 1).
3. `SDL_GetTicks() * 1000` is stored in `uint32_t` (dx.cpp 104). It wraps after about 71.6 minutes (2^32 / 1000 ms). Fix: use a float ms clock or a 64-bit monotonic clock, with no multiply.
4. The header comment says the refresh is in nanoseconds (display.h 27), but the value is microseconds per frame (display.cpp 685). Fix: correct the comment.
5. The gate name `nthread_has_500ms_passed` does not match its period (nthread.cpp 214 vs diablo.cpp 146). Fix: rename it `logic_step_due`.
6. The walk margin is uneven: N and S get two extra rows, E and W get one column, NE gets a column and two rows, and SE, SW and NW get a column and one row (scrollrt.cpp 1251-1267). The donor gives no reason, and it was not checked against the isometric layout. Fix: derive the margin from the view box and the speed, then test each direction.
7. The interpolation fraction is not refreshed while paused or in a menu (nthread.cpp 248). Probably intended to freeze animation, not checked. Fix: state it in code.

## 4. TypeScript sketch

simplified: this sketch keeps the deadline clock, the stall forgiveness, the one-or-many steps per call, the skip-draw rule (decided before the steps), and the 0..1 fraction. It drops the multiplayer turn exchange and its failure path, the pause and menu early return, the frame limiter (browsers pace frames with the display callback), the walk margin, and the dirty flags. It does not sleep, and it reads time as a float passed in by the caller, so defects 1-3 do not arise.

```ts
// Licence: Sustainable Use License 1.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface StepClock {
  nextStepAt: number; // ms timestamp when the next logic step is due; advanced by stepMs, not reset to "now"
}

export interface StepConfig {
  stepMs: number;            // 50 ms = 20 logic steps per second
  forgiveAfterSteps: number; // a backlog longer than this many steps is dropped (single-player rule)
  maxStepsPerCall: number;   // 1 in single-player, 3 in multiplayer
}

export interface FramePlan {
  steps: number;          // logic steps to run before drawing this frame
  drawThisFrame: boolean; // false when more than one step was pending: skip the draw to catch up
  fraction: number;       // 0..1 progress from the last step to the next, for animation interpolation
}

// Called once per display frame with the current time in ms. It never sleeps: the frame callback sets the pace.
export function planFrame(now: number, clock: StepClock, cfg: StepConfig): FramePlan {
  let late = now - clock.nextStepAt; // >= 0 means a step is due
  if (late > cfg.stepMs * cfg.forgiveAfterSteps) {
    clock.nextStepAt = now; // long stall: forget the backlog
    late = 0;
  }
  const drawThisFrame = late <= cfg.stepMs;
  let steps = 0;
  while (steps < cfg.maxStepsPerCall && clock.nextStepAt <= now) {
    clock.nextStepAt += cfg.stepMs; // advance from the deadline, so the clock does not drift
    steps++;
  }
  const untilNext = clock.nextStepAt - now;
  const fraction = Math.min(1, Math.max(0, (cfg.stepMs - untilNext) / cfg.stepMs));
  return { steps, drawThisFrame, fraction };
}

export {};
```

Sketch file: `/private/tmp/p2/wave2-haiku/batch3/RP010/work/devil-frame-clock.ts` (typecheck on the VPS: passed).

## 5. Lands in

- TARGET `src/fight/frame-clock.ts` (new module). The engine step clock and the interpolation fraction for the client render loop and the fight tick. Parity-checklist row 16 (colour grade/quality: frame pacing on phones). The lead hint said row 12, but row 12 in the addendum is combat sound cues, so row 16 is the closest fit. Lead to confirm.
- Server side, the same clock shape is the server tick sub-line: "server tick: fixed step, input intake, per-tick NPC budget" (row 18 / post-K item 3).
- Reuse tag: rewrite-from-idea (Sustainable Use License 1.0; clean-room, shape only)
- Brief rule served: addendum rule 4 (best idea line), the keep-the-idea-fix-the-defect rule, rule 6 (tick loop found and described), section 6 rulings check

## 6. Gaps and risks

- The donor limiter and its defects matter only for the desktop "Limit FPS" option. Phones default to vsync and hide that option. A browser build uses the display callback, so the limiter is not a candidate. Only the clock and the fraction transfer.
- One engine: the server must run this clock. The donor's singleplayer reset of the clock after a stall (nthread.cpp 232) must not exist on the server, or the server silently moves its own step deadline. Kills stay server-verified; a skipped draw must never skip a server step.
- The fraction is client-only. It is for animation between steps and must not feed hit timing (kills are server-verified; guard and parry timing stay on server steps).
- The donor's multiplayer lockstep (turn exchange, sync countdown, nthread.cpp 105-138) is server-authoritative in Frankendom already, so it does not transfer.
- Skipping draws while catching up can show a visible jump on a phone. Frankendom needs a rule for this (for example, do not skip the frame on the first missed step).
- The walk margin (scrollrt.cpp 1248-1267) is tile math for a 2D iso map. In a 3D third-person world the transferable part is only the idea of loading chunks ahead of the player's direction of travel. That is not part of this cell.
- Licence is Sustainable Use License 1.0 (non-commercial, free-of-charge distribution only). Clean-room, shape only. No line-by-line translation.
- Not read: `AnimationInfo` use of the fraction, DrawFloor and DrawOOB, the Lightmap build body, the Android build wiring.

Best transferable idea: Advance the logic deadline by the step length (not from now), skip only the draw, never a logic step, when more than one step is pending, and hand the renderer a 0..1 fraction to interpolate animation between steps.
Decision (proposed): adapt — keep the deadline clock, the one-step-per-call rule, the skip-draw threshold, and the 0..1 fraction; drop the sleep limiter and the lockstep turn code, which the browser and our server already cover.
Acceptance: Client: with a 50 ms step and 16 ms frames, the fraction runs 0 to 1 across each step and never exceeds 1; after a 600 ms stall, one step runs per call and draws are skipped until caught up. Server test: kill events happen only on server steps and a skipped client draw changes no server state.
