# luanti-org-luanti (client-performance-memory-loading, cell 3)

Donor: `/mnt/frankendom-donors/luanti-org-luanti/src/client/renderingengine.cpp` (symbol `FpsControl::limit`, 38-69) | Licence: LGPL-2.1 (COPYING.LESSER: "GNU LESSER GENERAL PUBLIC LICENSE Version 2.1, February 1999"; textures and sounds are under a separate licence in LICENSE.txt) | C++ | symbol `FpsControl::limit`

Checked: Read `FpsControl` (renderingengine.cpp 30-69) and `porting::preciseSleepUs` (porting.h 226-243) in full. Read the caller loop `Game::run` around the limiter call (game.cpp 495-522, 655-672 shutdown loop) and the server-step block (game.cpp 2100-2160). Read the cap defaults in src/defaultsettings.cpp 253-254 and builtin/settingtypes.txt 488-496 (grep and sed). Not read: the body of `Game::run` outside those lines, `client->step(dtime)` (whether it clamps dtime), and `porting::sleep_us` itself. Confidence high on the limiter's order of operations and numbers; medium on the full loop (only the limiter call site and the shutdown loop were read). Camera: not a camera cell.

## 1. Mechanism

- Called once per frame from the `Game::run` loop: `m_rendering_engine->run()` renders the frame, then `draw_times.limit(device, &dtime)` (game.cpp 510, 519). The comment at 516-518 says dtime is the render time plus the sleep to the wanted FPS.
- Order of steps inside `FpsControl::limit`:
  (a) Cap by window focus: `fps_limit = focused ? fps_max : fps_max_unfocused` (renderingengine.cpp 40-42). No single-player condition here.
  (b) Frame period: `frametime_min = 1e6 / max(fps_limit, 1)` microseconds (43). The floor of 1 means there is no uncapped mode.
  (c) Busy time: `time = now` (45); `busy_time = time - last_time` (48), where `last_time` was stored at the end of the previous call (68). So busy time is the frame's work since the last limit call.
  (d) If busy < period: `sleep_time = period - busy` (52-53) and `porting::preciseSleepUs(sleep_time)` (54). Otherwise `sleep_time = 0` (55-56). No catch-up: a long frame gets no sleep, and the next frame's busy time starts from its own start.
  (e) Re-read the clock (61); `*dtime = (time - last_time) / 1e6` (64), so dtime is the full wall time since the last call, sleep included; then `last_time = time` (68).
- `preciseSleepUs` (porting.h 230-243): if the wait is longer than the accuracy margin, call the OS sleep for `wait - margin` (236), then busy-wait the rest against the target clock (241). The margin is 2000 us on Windows (35) and 200 us on POSIX (43).
- Focus rate defaults: `fps_max` 60 (defaultsettings.cpp 253) and `fps_max_unfocused` 10 (254); the settings type gives the unfocused rate a minimum of 1 (settingtypes.txt 496).
- Single-player server (read, shape only): `Game::step` runs the local server at a fixed step `1 / fps_max`, where fps_max is the same focus choice but only when `simple_singleplayer_mode` (game.cpp 2119-2122), clamped to at most 60 (2129) and at least 1 (2122), and passed as `1.0f / fps_max` (2132). So in single-player the server tick follows the client's fps setting.

## 2. Key functions

- `FpsControl::reset` and `FpsControl::limit`: `/mnt/frankendom-donors/luanti-org-luanti/src/client/renderingengine.cpp` 33-36 and 38-69. Order: cap, period, busy, sleep, re-read, dtime, store.
- `preciseSleepUs`: `/mnt/frankendom-donors/luanti-org-luanti/src/porting.h` 230-243, margin at 35 (Windows) and 43 (POSIX).
- Caller: `Game::run`, `/mnt/frankendom-donors/luanti-org-luanti/src/client/game.cpp` 473 (signature), 510-519 (loop and limit call). The shutdown loop at 663-669 uses the same pattern.
- Server step block: `/mnt/frankendom-donors/luanti-org-luanti/src/client/game.cpp` 2119-2132.
- Defaults: `/mnt/frankendom-donors/luanti-org-luanti/src/defaultsettings.cpp` 253-254; `/mnt/frankendom-donors/luanti-org-luanti/builtin/settingtypes.txt` 488-496.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Two frame rates chosen by window focus; background rate is much lower | 60 fps focused (253), 10 fps unfocused (254, 496); both at least 1 (43) |
| Sleep the rest of the period from the measured work time; no catch-up | Period = 1e6 / fps microseconds (43) |
| Wall-clock dtime measured after the sleep, so the game sees real time | No clamp in this function (64); whether `client->step` clamps is not read |
| Sleep by the OS, then spin the margin | Margin 2000 us Windows (35), 200 us POSIX (43) |
| Server step at a fixed period tied to the client cap | Clamp 1 to 60 (2122, 2129); single-player only for the unfocused choice (2119) |

## 4. TypeScript sketch

simplified: keeps the donor order (choose the cap by focus, clamp to at least 1, measure the work since the last frame start, return the wait that fills the period, then measure dtime after the wait). It omits the spin (a browser cannot sleep a thread; the caller waits with a timer or a rAF gate), the OS margin, and the clock overflow guard. It adds no dtime clamp, so the donor's behaviour is kept; the fix for that is in section 6, not in the sketch.

```ts
// Licence: LGPL-2.1 (donor, COPYING.LESSER). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

interface LimiterState {
  lastMs: number;   // time of the last frame start (set after any wait), in ms on a monotonic clock
}

// Frame period for the current focus. The donor clamps the rate to at least 1 fps, so there is no uncapped mode.
function minFrameMs(focused: boolean, fpsFocused: number, fpsUnfocused: number): number {
  const fps = Math.max(focused ? fpsFocused : fpsUnfocused, 1);
  return 1000 / fps;
}

// Step 1, at the end of a frame's work. Returns the ms to wait so the frame fills its period (0 = none).
// The donor sleeps this long, then spins the last SLEEP_ACCURACY_US; in a browser the caller waits with a timer.
function frameDone(s: LimiterState, nowMs: number, focused: boolean, fpsFocused: number, fpsUnfocused: number): number {
  const period = minFrameMs(focused, fpsFocused, fpsUnfocused);
  const busyMs = Math.max(0, nowMs - s.lastMs);   // work time since the last frame start
  return busyMs < period ? period - busyMs : 0;
}

// Step 2, when the next frame starts (after the wait). Returns the wall-clock dtime for this frame, including the wait.
function frameStart(s: LimiterState, nowMs: number): number {
  const dtimeMs = Math.max(0, nowMs - s.lastMs);
  s.lastMs = nowMs;
  return dtimeMs;
}

// Usage sketch (not part of the donor): a background tab with fps_max_unfocused 10 gets a 100 ms period.
const st: LimiterState = { lastMs: 0 };
const wait = frameDone(st, 12, false, 60, 10);
const dt = frameStart(st, 12 + wait);
console.log(wait, dt);
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS with `export {};` appended: exit 0, no output.

Best transferable idea: One frame limiter sleeps the rest of a frame period from the measured work time, measures dtime after that sleep, and uses a lower cap when the window is unfocused.

Decision (proposed): adapt — take the two-rate cap (foreground and background) and the wall-clock dtime; in the browser a rAF gate or setTimeout and a visibility-change handler replace the thread sleep and the spin; the single-player server coupling is rejected (the server tick stays a fixed step of its own, row 18 sub-line).
Acceptance: A Vitest on the limiter: at 30 fps focused and 10 fps unfocused, 10 s of simulated frames gives 300 ± 3 frames focused and 100 ± 2 unfocused; after a 500 ms stall, the next 500 ms run at most 16 frames at 30 fps (no burst).

## 5. Lands in

- TARGET `origins/client/frame-pacer.ts` (new; client only, the same module as the Anuken-Mindustry pacer). The engine `src/fight` owns no frame timing. The fixed server tick is separate: row 18 sub-line "server tick: fixed step, input intake, per-tick NPC budget".
- Parity-checklist row 16 (colour grade / quality): the background rate is a battery and thermal tier. The cell hint said row 12 (combat sound cues), which this mechanism does not touch.
- Reuse tag: rewrite-from-idea (LGPL-2.1; clean-room only)
- Brief rule served: 1 (client only, one engine untouched); rule 8 (target file and row named); camera and Pit rules n/a.

## 6. Gaps and risks

- LGPL-2.1: the code is handled as clean-room (the same rule as GPL), and the sketch is written from the described steps. Media are under a different licence (LICENSE.txt) and are not used.
- Defect (no dtime clamp): `*dtime` is set straight from the wall clock with no maximum (renderingengine.cpp 64). A background tab at 10 fps gives the game a 100 ms step, and a long stall gives a much larger one. fix: clamp dt in the Frankendom caller (for example to 0.1 s) before the duel step, and freeze or sub-step the fight step past that; the donor's `client->step` clamp, if any, is not read.
- Spin cost: `preciseSleepUs` busy-waits the accuracy margin (2 ms on Windows, 0.2 ms on POSIX; porting.h 35, 43). On a phone that is wasted CPU and battery. A browser should not spin; use a timer and accept the jitter.
- Focus is not the same as thermal state. The donor throttles on window focus only. For a phone, the proposed background rate (10 fps, the donor's default) should also cover "page hidden" and battery-saver or thermal pressure when the browser reports it. The browser reports visibility; thermal state is not in the web platform, so the thermal part is a proposal.
- Coupling: in single-player the donor ties the local server's fixed step to the client's fps choice (game.cpp 2119-2132). Frankendom must not do this: the server tick is fixed by server rules (row 18), and a background tab must never slow the server.
- No uncapped mode: the minimum is 1 fps (43). Unlike the Mindustry and Cubyz donors, there is no unlimited option, which suits a phone.
- Not read: the body of `Game::run` between the read lines, `client->step` (dtime handling), and `porting::sleep_us`.


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
Errors: All checked claims hold: FpsControl::limit order and lines 38-69, preciseSleepUs 230-243, SLEEP_ACCURACY_US 2000 (win, porting.h 35) / 200 (posix, 43), defaults fps_max 60 / unfocused 10 (defaultsettings.cpp 253-254), min 1 (settingtypes 488-496), server step clamp 1..60 and simple_singleplayer_mode condition (game.cpp 2119-2132), shutdown loop 663-669, LGPL 2.1 line. Acceptance (300+-3 / 100+-2 frames; <=16 frames in 500 ms at 30 fps) is consistent with the sketch (15 frames) and would not fail a correct build.
Missed: None significant. (Not noted: this limiter also drives the shutdown overlay loop; irrelevant.)
