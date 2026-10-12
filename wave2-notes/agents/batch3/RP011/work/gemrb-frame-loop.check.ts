// Donor licence: GPL-2.0-or-later (SPDX header of Video/Video.cpp). Clean-room sketch of the shape only.

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

export {};
