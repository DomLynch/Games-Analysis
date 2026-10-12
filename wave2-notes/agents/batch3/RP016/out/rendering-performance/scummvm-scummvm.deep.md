# scummvm-scummvm (rendering-performance, cell 3)

Donor: `/mnt/frankendom-donors/scummvm-scummvm/graphics/framelimiter.cpp` (with `graphics/framelimiter.h`; caller `engines/stark/stark.cpp`; related `graphics/dirtyrects.cpp`, `graphics/screen.cpp`) | Licence: GNU GPL v3 or later (file headers: "either version 3 of the License, or (at your option) any later version"; COPYING is GPL v3) | C++ | symbol `Graphics::FrameLimiter::delayBeforeSwap`

Checked: Read in full: `framelimiter.h` (111 lines), `framelimiter.cpp` (72 lines), `dirtyrects.h` (110 lines), `dirtyrects.cpp` (55 lines), `screen.cpp` 36-80 (the dirty-rect update path), `managed_surface.cpp` 1222-1229, `stark.cpp` 155-180 and 228-236 (the caller). Hint `hq.cpp` (5103 lines): only its licence header and first 30 lines were read. It is a pixel-scaler lookup implementation (hqx family), not a frame or draw budget, so it is the wrong file for this topic. Confidence: high on the limiter's order of operations and the constants (all read). The truncation arithmetic in section 3 is by hand, not run. Not read: the backend `getMillis` / `delayMillis` implementations the limiter relies on; the vsync feature check path; other callers (wintermute, bagel, myst3 reference `FrameLimiter` per grep; not read). camera_scope: n/a.

Best transferable idea: Pace a client frame by the time since the last present, not by the loop body, and turn the remaining wait into a draw-skip gate; keep the target as a float so the cap is exact.
Decision (proposed): adapt - a browser cannot sleep, so the wait becomes a skip gate for an optional low-end phone cap; the target stays a float (the donor's uint turns 60 fps into 62.5 fps); the fight engine keeps the server tick and never uses this pacing or measured frame time for its step; reject the donor's frame-time game clock for fights.
Acceptance: With the phone cap at 60 fps the presented interval averages 16.67 ms over 10 s (not 16 ms, which is 62.5 fps); with the cap at 30 fps the presented count is 30 ± 1 per second, and the fight tick count is identical at 30 fps and at 60 fps.

## 1. Mechanism

- Set up. `Graphics::FrameLimiter` is built from a framerate (Stark passes the `engine_speed` setting, stark.cpp 97). The target duration is `1000 / clamp(fps, 1, 120)` milliseconds (framelimiter.cpp 40), so a missing or zero rate means "no limit" (`_frameLimit` 0, so `_enabled` is false, 35).
- Enabled only when a limit is set and the hardware vsync is not already pacing the frame (35; `deferToVsync` defaults to true, framelimiter.h 42).
- Per frame, in the caller's order (stark.cpp 159 then 176):
  1. `startFrame()` records the time. If it is not the first frame, the frame duration is now minus the previous start (47) and the draw duration is now minus the previous swap time (48). It returns the previous frame duration.
  2. The game logic runs (stark.cpp 160-175, not read in detail).
  3. `delayBeforeSwap()` records the loop duration as now minus frame start (56). If enabled, it computes `delay = target - (now - lastSwapTime)` (59) and sleeps only if that is positive (60-61). Then it records the swap time (63) and returns `delay < 0`, which means the frame is late (64).
- The key choice: the delay is measured from the last swap, not from the start of the loop body, so the screen-update time counts against the budget automatically. The donor's own comment (58) says the loop-body version "will tend to undershoot target framerate slightly" because the update time is not counted.
- Pause. `pause(false)` clears the frame start (69), so the first frame after a resume does not report a huge duration.
- Game clock. At normal speed the game step is the measured frame duration (stark.cpp 234). In fast-forward it is a fixed 33 ms per loop (232); the comment above it says the original engine was limited to 30 fps.
- Related: a dirty-rect list (`dirtyrects.cpp`). Drawing calls add their rectangles (`ManagedSurface::addDirtyRect` forwards to the owner, managed_surface.cpp 1222-1229). `Screen::update` merges the list (screen.cpp 43), copies each rectangle to the physical screen (50), presents once (61), and clears the list. `merge()` loops over pairs: if two rectangles intersect, the outer one becomes their union and the inner one is erased; the inner scan then restarts from the outer entry (dirtyrects.cpp 34-42).

## 2. Key functions

- `FrameLimiter::initialize(framerate)` and `initialize()`: `/mnt/frankendom-donors/scummvm-scummvm/graphics/framelimiter.cpp` 34-42. Target and enable flag.
- `FrameLimiter::startFrame`: same file, 44-52. Frame and draw durations.
- `FrameLimiter::delayBeforeSwap`: same file, 54-65. Delay from last swap, sleep only if positive, late flag.
- `FrameLimiter::pause`: same file, 67-70.
- `DirtyRectList::merge`: `/mnt/frankendom-donors/scummvm-scummvm/graphics/dirtyrects.cpp` 26-46. Pairwise union.
- `Screen::update`: `/mnt/frankendom-donors/scummvm-scummvm/graphics/screen.cpp` 41-57. Merge, copy, present, clear.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Target interval = 1000 / fps, fps clamped to a sane range | Clamp 1..120 (theirs, framelimiter.cpp 40) |
| Delay from the last present, sleep only when positive, report late | None (mechanism; comment at 58-59) |
| Game step = measured frame time at normal speed | Fast-forward step 33 ms (theirs, stark.cpp 232) |
| Vsync defers the limiter | `deferToVsync` default true (theirs, framelimiter.h 42) |
| Overlapping dirty rectangles merged into unions | None (mechanism; no size threshold) |

Defects found by reading (keep the idea, fix the defect):

1. Integer truncation of the target. `_frameLimit` is a `uint` (framelimiter.h 100), and framelimiter.cpp 40 assigns `1000.0f / fps` to it, so the fraction is dropped. By hand: at 60 fps the interval is 16 ms, which is 62.5 fps; at 30 fps it is 33 ms, which is 30.3 fps; at 90 fps it is 11 ms, which is 90.9 fps. The limiter runs fast by up to a few percent. Not run. Fix: keep the target as a float (the sketch does this).
2. Unsigned arithmetic in the delay. framelimiter.cpp 59 subtracts `uint` values into an `int` `_delay`. The sign comes from unsigned wrap-around and conversion, which works on the usual compilers but is implementation-defined before C++20. Fix: do the subtraction in signed or floating-point arithmetic (the sketch uses plain numbers).
3. No catch-up after a late frame. Line 64 only reports `_delay < 0`; the next frame is not shortened. This is a policy choice, not a bug. Frankendom should decide the policy; the sketch returns the signed wait so the caller can choose.
4. Dirty-rect merge is not a fixed point. After an outer rectangle grows, entries before it are not checked again (dirtyrects.cpp 26-46), so two overlapping rectangles can survive. The list still covers every changed pixel, so the cost is extra copies, not wrong output. Fix if needed: repeat the merge until nothing changes.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order (time since the last present decides the wait; the loop start only sets the frame duration; a pause restarts the frame clock; a late frame is a negative wait) but changes three things: the target is a float (defect 1), the wait is a number the caller can use as a skip gate instead of a sleep (a browser cannot block), and the fight step is kept out of the pacer. It omits the vsync defer, the draw-duration measurement, the backend time source, and the dirty-rect list. Typechecked on the VPS (`tsc --noEmit --strict --target es2020`, exit 0).

```ts
// Licence: GNU GPL v3 or later (donor). Clean-room: shape only, written fresh from the described mechanism, not a translation.
export const MIN_FPS = 1;
export const MAX_FPS = 120;

// Frame pacer: paces by time since the last present, not by loop time.
// Donor sleeps with delayMillis; a browser cannot block, so the caller uses waitMs as a draw-skip gate.
export class FramePacer {
  // Float target. The donor stores this in a uint and truncates it to whole ms (defect fixed here).
  readonly targetMs: number;
  private lastPresentMs: number | null = null;
  private lastStartMs: number | null = null;
  private frameMs = 0;

  constructor(fps: number) {
    const clamped = Math.min(MAX_FPS, Math.max(MIN_FPS, fps));
    this.targetMs = 1000 / clamped;
  }

  // Call at the top of each loop iteration. Returns the previous whole frame's duration.
  startFrame(nowMs: number): number {
    if (this.lastStartMs !== null) this.frameMs = nowMs - this.lastStartMs;
    this.lastStartMs = nowMs;
    return this.frameMs;
  }

  // Resuming from pause restarts the frame clock, so the first frame is not inflated.
  pause(paused: boolean): void {
    if (!paused) this.lastStartMs = null;
  }

  // Time left before the next present. > 0: wait or skip the draw. < 0: this frame is late.
  // Computed from the last present, so the presented interval (not the loop body) is paced.
  waitMs(nowMs: number): number {
    if (this.lastPresentMs === null) return 0;
    return this.targetMs - (nowMs - this.lastPresentMs);
  }

  // Call right after a present.
  presented(nowMs: number): void {
    this.lastPresentMs = nowMs;
  }
}

// Game step for the simulation: measured frame time at normal speed, a fixed 33 ms when fast-forwarding.
// Donor (stark.cpp 232, 234) uses this for a single-player game clock. Client presentation only, never the fight step.
export function gameStepMs(fastForward: boolean, lastFrameMs: number): number {
  return fastForward ? 33 : lastFrameMs;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/frame-pacer.ts` (new pure helper: `FramePacer`, `gameStepMs`; no DOM, no Three.js). The client render loop calls it only when a frame cap is set; the fight engine never imports it. Parity-checklist row 16 (colour grade/quality: the quality tier, including an optional frame cap for low-end phones).
- today: not read (the Frankendom repo was not opened in this pass).
- Reuse tag: reuse-as-shape (GNU GPL v3 or later: clean-room; no code adapted)
- Brief rule served: 1 (one engine: the fight steps on the server tick, and the pacer only decides when the client presents); the camera/HUD client-only ruling.

## 6. Gaps and risks

- GPL v3 or later: clean-room only. The sketch is written from the described mechanism and uses its own names.
- Do not copy the game clock. The donor's measured frame time as the game step (stark.cpp 234) would let frame rate change fight outcomes. Frankendom's fight is server-verified and steps on fixed server ticks, so `gameStepMs` must never feed the engine.
- A browser cannot sleep. The transfer is a skip gate: when `waitMs > 0`, skip this rAF's draw; input and the server tick still run. Do not claim the donor's exact frame timing in a browser; rAF timestamps are only approximate.
- On phones the display already paces rAF, so a cap is only for battery and heat. Keep the default uncapped and make the cap a quality-tier setting (row 16).
- No measured numbers in the donor. The 16 ms and 62.5 fps figures are arithmetic from the code, not a run.
- Vsync detection in the donor has an ordering rule: the limiter must be initialised after the graphics setup, or the vsync state is wrong (framelimiter.h, the header comment on the constructor and `initialize()`). Frankendom has the same risk: read any display-capability state only after the canvas exists.
- Dirty rects: the donor's list suits a 2D software surface. Frankendom's Three.js pipeline redraws the whole frame, so the list does not transfer directly; it might fit a 2D HUD canvas, not read further. Defect 4 is the merge's extra copies, not wrong pixels.
- The hint file `hq.cpp` is a pixel scaler and is not part of this mechanism. If Strategy wants scaler quality, it is a separate topic.
