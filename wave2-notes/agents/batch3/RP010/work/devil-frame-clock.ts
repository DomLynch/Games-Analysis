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
