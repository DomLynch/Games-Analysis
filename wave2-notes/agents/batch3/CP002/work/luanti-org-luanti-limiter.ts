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

export {};
