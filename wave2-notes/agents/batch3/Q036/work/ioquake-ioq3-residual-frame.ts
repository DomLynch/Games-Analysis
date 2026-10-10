// Licence: GPL-2.0-or-later (donor, per sv_main.c header). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface ServerWorld {
  step(): void;                  // one simulated frame
}

export interface FrameConfig {
  rate: number;                  // steps per second (donor cvar sv_fps, default 20)
  maxElapsedMs: number;          // hitch clamp applied to one pass (donor: 5000 on a dedicated server)
}

export class ResidualFrameLoop {
  private residualMs = 0;        // elapsed time not yet turned into steps
  private readonly frameMs: number;

  constructor(private readonly cfg: FrameConfig, private readonly world: ServerWorld) {
    this.frameMs = 1000 / cfg.rate;
  }

  // Milliseconds until the next step is due. The donor uses this as the sleep target.
  msUntilNextStep(): number {
    return Math.max(0, this.frameMs - this.residualMs);
  }

  // Returns the number of steps run. pauseActive is computed by the caller.
  pass(elapsedMs: number, pauseActive: boolean): number {
    if (pauseActive) return 0;   // paused time is not banked
    const clamped = Math.min(elapsedMs, this.cfg.maxElapsedMs);
    this.residualMs += clamped;
    let steps = 0;
    while (this.residualMs >= this.frameMs) {
      this.residualMs -= this.frameMs;
      this.world.step();
      steps++;
    }
    return steps;
  }
}

export {};
