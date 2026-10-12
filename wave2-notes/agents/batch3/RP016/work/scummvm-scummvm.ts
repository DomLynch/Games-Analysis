// Licence: GNU GPL v3 or later (donor header). Clean-room: shape only, written fresh from the described mechanism, not a translation.
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
