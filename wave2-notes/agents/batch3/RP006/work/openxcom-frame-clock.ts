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
