# gemrb-gemrb (rendering-performance, cell 17)

Donor: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Interface.cpp` (`Interface::Main` 995-1079, the loop) and `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Video/Video.cpp` (`Video::SwapBuffers` 121-146, the frame cap) | Licence: GPL-2.0 (`/mnt/frankendom-donors/gemrb-gemrb/COPYING`, "GNU GENERAL PUBLIC LICENSE Version 2, June 1991"); `Video/Video.cpp` header says `SPDX-License-Identifier: GPL-2.0-or-later`; copyleft, clean-room, shape only | C++ | symbols `Interface::Main`, `Video::SwapBuffers`

Checked: Read in full: `core/Video/Video.cpp` 110-150; `core/Interface.cpp` 455-480, 995-1014, 1024-1082 (the loop and the speed lambda); `includes/globals.h` 155-170 (tick type and clock); `core/Video/Video.h` 71, 94, 120, 137-138 (by grep, declarations only). By grep only: `core/InterfaceConfig.h` 85 (CapFPS default 0), `core/Interface.h` 102 (ticksPerSec), `core/GlobalTimer.cpp` 111 (the same integer tick division; the timer's own loop not read). Other rendering candidates opened or grepped to rule them in or out: `core/FogRenderer.cpp` (fog cells drawn as raw geometry or BAM sprites, grep only), `core/TileMap.cpp` (overlays, grep only; no tile culling found in this file). Not read: `GameLoop()` (what a logic step does), the SDL driver's `Wait` and vsync (plugins), `GetVirtualRefreshCap`, the Map draw path, GemRB's sprite or tile batching. The hint file `core/Streams/FileCache.h` was not opened; by its name it is a file cache, not the loop. So this note is about frame pacing and the fixed logic step, not about draw-call batching, which was not found in the read files. Nothing here is terrain, foliage, water or weather. Confidence: high on the loop order and the arithmetic (both read end to end); medium on what the logic step does. camera_scope: not a camera cell (the scroll speed is noted in section 6 because it touches the world camera).

Best transferable idea: Run the game logic on its own fixed step with carried time (an accumulator), separate from the render loop that paces frames, and move the view by real frame time instead of a fixed amount per frame.
Decision (proposed): adapt - the fixed logic step decoupled from render, and a frame cap with a float interval, transfer; the donor drops carried time, uses integer milliseconds and moves the view by an integer per frame, so each of those is fixed in the sketch. The duel sim is row 1 in Frankendom, so the step is the engine's; the loop that calls it is client-only.
Acceptance: A test drives the loop at 50 fps (20 ms frames) for 10 s and counts 150 +/- 1 sim steps (15 per second), not the donor's 125 (12.5 per second); a scroll test at 240 Hz gives 300 px/s +/- 1 percent at speed 10, not 240.

## 1. Mechanism

The loop is `Interface::Main` (995). Each pass of its `do` loop (1024 to 1079) does, in order:
1. Runs the timers (the loop at the top of the do-block; exact line numbers not checked).
2. Handles pending quit and script state, then events when the event flag is set, then the GUI behaviour for the game control (partly read; exact line numbers not checked).
3. Samples the clock: `time = GetMilliseconds();` (1053). The clock is steady, in whole milliseconds (`globals.h` 160-165).
4. Logic step, at most once per pass: `static const tick_t oneTick = 1000 / Time.ticksPerSec;` (1055) is the step length, computed once. `doGameStateUpdate = time - lastGameUpdate >= oneTick` (1056). If true: `GameLoop()` runs, the colour cycle advances to `time` (1061), and `lastGameUpdate = time;` (1062). The logic time is set to now, not advanced by one step, so time beyond the step is discarded (no carry).
5. Render, every pass and not gated by step 4: `winmgr->DrawWindows();` (1065). The HUD FPS readout (1066-1077) is counted once a second.
6. `VideoDriver->SwapBuffers(config.CapFPS)` (1079) ends the pass; the loop repeats until a quit flag.

Rates come from variables. `ieDword maxRefreshRate = vars.Get("Maximum Frame Rate", 30);` (476) and `Time.ticksPerSec = maxRefreshRate / 2;` (478). The comment at 477 says "the originals used double ticks for haste handling". So the logic runs at 15 steps a second by default, and the step is 1000 / 15 = 66 ms in integer arithmetic (66.67 exact).

The frame cap is in `Video::SwapBuffers(fpscap)` (121). It swaps the drawing buffers (123-126), reads the device's refresh cap (128) and, if it is set, uses the smaller of that and the config cap (129-131). If the cap is non-zero (133): `lim = 1000 / fpscap` in integer milliseconds (134); if less than `lim` ms have passed since `lastTime` (136), it waits the remainder (137), re-samples the clock (138) and stores it (140). If the cap is zero (141-142), it stores the time and returns. `PollEvents()` is the last call (145).

Config defaults: `CapFPS` is 0 (InterfaceConfig.h 85), so the display is created with the vsync argument set (463 passes `config.CapFPS == 0` to `CreateDisplay`, whose last parameter is `vsync`, Video.h 120; the driver is not read), and the software cap is off. The mouse scroll speed is set in the speed lambda (996-1014): `int speed = vars.Get("Mouse Scroll Speed", 10);` (997) and a per-frame distance `std::max<int>(1080.0 * (speed / 36.0) / fps, 1)` (1003), where `fps` is the display refresh rate when the cap is 0 (1006-1010) and the config cap when it is 30 or more (1011-1012). The lambda's comment says "We had 36 at 30fps originally, so more fps should not speed this up unless adjusted" (1000).

## 2. Key functions

- `Interface::Main`: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Interface.cpp` 995-1079. The loop: logic step, render, swap.
- Logic step condition: same file, 1055-1062.
- Speed lambda (scroll per frame): same file, 1000-1014.
- `Video::SwapBuffers`: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Video/Video.cpp` 121-146. The frame cap.
- Clock: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/includes/globals.h` 160-165 (`tick_t` is `unsigned long`, milliseconds, from `steady_clock`).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Logic on a fixed step, separate from render | `Maximum Frame Rate` default 30 (Interface.cpp 476), logic ticks = 30 / 2 = 15 a second (478) |
| Step length | 1000 / 15, integer: 66 ms (1055); exact 66.67 ms |
| Carry time between steps | None: `lastGameUpdate = time` (1062). One logic step per loop pass at most |
| Software frame cap | Off by default (`CapFPS` 0, InterfaceConfig.h 85); vsync requested when the cap is 0 (Interface.cpp 463; driver handling not read) |
| Frame interval | `1000 / fpscap` integer ms (Video.cpp 134). Cap 60 gives 16 ms, so 62.5 fps; cap 45 gives 22 ms, so 45.45 fps |
| Scroll speed | `1080 * (speed / 36)` px per second at the given rate, default `speed` 10 (Interface.cpp 997); 300 px/s at 10 |
| Scroll per frame | Integer floor, minimum 1 px (1003): at 90 Hz it is 3 px (270 px/s); at 240 Hz it is 1 px (240 px/s) |

Worked examples, arithmetic from the code, not measured: the logic runs on the first pass where at least 66 ms have passed since its last run, and that run's time is the new base, so the period is the first whole number of frames that reaches 66 ms. At 60 fps (16.7 ms frames) that is 4 frames, 66.7 ms, so 15 steps a second. At 50 fps (20 ms frames) it is 4 frames, 80 ms, so 12.5 steps a second, 17 percent slow. At 40 fps (25 ms) it is 3 frames, 75 ms, so 13.3 a second.

Defects found, with fixes (the idea is kept):
- Logic time is dropped, not carried (1062). The logic rate falls below its target whenever the frame length does not divide the step (the 50 fps example above). Fix: carry the debt and run up to a small number of steps per frame, dropping debt only after a stall (sketch, `stepsThisFrame`).
- Integer step length (1055): 66 instead of 66.67 ms, about 1 percent fast before the frame quantisation. Fix: float step (sketch, `makeStepper`).
- Integer frame interval (134): cap 60 runs at 62.5 fps. Fix: float interval (sketch, `capWaitMs`).
- Scroll per frame is an integer with a floor of 1 (1003): the speed is wrong at many refresh rates (90 Hz gives 270 px/s, 120 Hz gives 240, 165 Hz gives 165, 240 Hz gives 240, against 300 intended), and it assumes the frame rate equals the refresh rate, so if frames slow down the view slows down too. Fix: scroll per second times real frame time (sketch, `scrollPx`).

## 4. TypeScript sketch

simplified: keeps the donor order (logic step decided from carried time, then render, then the frame cap). It omits: the timers, the quit and script states, the event and GUI steps, the colour cycle, the HUD counter, the driver's `Wait` and vsync, the device refresh query, and `GameLoop` itself (its body was not read). It differs in four fixes: the step carries time with a capped catch-up and a stall rule (the donor carries nothing), the step and the frame interval are floats (the donor truncates to whole ms), and scroll is per second times frame time with no integer floor (the donor floors per frame to at least 1 px). The clock is not read here; the caller passes frame times in ms.

```ts
// Donor licence: GPL-2.0-or-later (SPDX in Video/Video.cpp). Clean-room sketch of the shape only.

// Fixed sim step decoupled from the render loop. Time not run is carried in debtMs, so the sim rate holds
// when frames are slow; a stall drops the debt instead of spiralling.
export interface Stepper {
  tickMs: number;      // float, e.g. 1000 / 15 = 66.67 ms
  maxCatchUp: number;  // most sim steps in one frame
  debtMs: number;      // carried time
}

export function makeStepper(simTicksPerSec: number, maxCatchUp = 5): Stepper {
  return { tickMs: 1000 / simTicksPerSec, maxCatchUp, debtMs: 0 };
}

export function stepsThisFrame(s: Stepper, frameMs: number): number {
  s.debtMs += frameMs;
  let steps = 0;
  while (s.debtMs >= s.tickMs && steps < s.maxCatchUp) {
    s.debtMs -= s.tickMs;
    steps++;
  }
  if (steps === s.maxCatchUp && s.debtMs >= s.tickMs) s.debtMs = 0; // stall: drop the debt
  return steps;
}

// Frame cap: frames at least 1000 / capFps ms apart, in float ms (donor: integer division).
// capFps 0 means no cap here; vsync or the browser's frame callback governs.
export function capWaitMs(nowMs: number, lastFrameMs: number, capFps: number): number {
  if (capFps <= 0) return 0;
  return Math.max(0, 1000 / capFps - (nowMs - lastFrameMs));
}

// Scroll by real frame time. The donor base is 1080 * (speed / 36) px per second, applied per frame as an integer.
export function scrollPx(speed: number, dtMs: number): number {
  const pxPerSec = 1080 * (speed / 36);
  return pxPerSec * (dtMs / 1000); // no per-frame integer floor
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, with `export {};` appended: exit 0.

## 5. Lands in

- TARGET `origins/client/frame-loop.ts` (new, client). The loop calls the engine's fixed step; the step itself is the duel sim in `src/fight/` (row 1). The loop is presentation timing, so it stays out of the engine.
- Parity row 1 (duel step / sim): the fixed-step rule is the duel step's timing. The server tick sub-line ("server tick: fixed step, input intake, per-tick NPC budget", row 18 / post-K item 3) applies to the server-side step, not to this client loop; this note does not claim it.
- today: not checked in this pass (no Frankendom loop code was read).
- Reuse tag: adapt from idea (GPL-2.0-or-later; clean-room, shape only).
- Brief rule served: rule 6 (timing: the loop that drives the step and the frame cap is described from the code); client-only presentation timing with the sim step fixed.

## 6. Gaps and risks

- GPL-2.0: clean-room only. The sketch is written from the described mechanism, not from the donor lines.
- Phones. Browsers already pace frames through `requestAnimationFrame` (usually at the display rate), so the donor's software cap is only needed for background tabs or battery. The fixed sim rate is the part to keep. Frankendom's sim rate is not checked in this pass; the donor's 15 is GemRB's choice (the 30 / 2 rule, 476-478).
- Catch-up cap. The sketch lets up to five sim steps run in one frame. A phone that stalls for a second would run five steps at once and then drop the rest; the cap value needs testing on a phone.
- Sim determinism. A carried-time step means the number of steps per frame varies, so the server and client must agree on steps, not frames. The donor does not show a network path (not read).
- Scroll. The donor per-frame value is the mouse-scroll speed (`SetMouseScrollSpeed`, Interface.cpp 1003-1012); what it moves was not read. A world camera with a speed setting has the same frame-rate sensitivity (integer floor, refresh-rate assumption). Use real frame time for any camera speed; this is client-only and has no engine effect.
- Not read: `GameLoop()`, the driver's `Wait` and vsync, `GetVirtualRefreshCap`, GemRB's tile and sprite batching (no draw-call batching was read in this pass).

Reuse tag: adapt from idea (GPL-2.0-or-later; clean-room, shape only)
Brief rule served: rule 6 (timing and loop order read from the code); client-only presentation timing around a fixed sim step
