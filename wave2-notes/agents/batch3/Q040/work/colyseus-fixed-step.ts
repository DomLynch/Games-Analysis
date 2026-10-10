// Licence: MIT (donor, Copyright (c) 2015-2026 Endel Dreyer). Clean-room sketch of the shape: a fixed-step accumulator, a catch-up cap, and a dropped backlog on a hitch.
export interface StepCtx { dt: number; dtMs: number; tick: number; }

export class FixedLoop {
  private acc = 0;
  private tick = 0;
  private readonly stepMs: number;
  private readonly ctx: StepCtx;

  constructor(
    private readonly step: (ctx: StepCtx) => void,
    tickRate = 60,
    private readonly maxCatchup = 5,
  ) {
    this.stepMs = 1000 / tickRate;
    this.ctx = { dt: 1 / tickRate, dtMs: this.stepMs, tick: 0 }; // the same fixed dt every step
  }

  // deltaMs = measured wall-clock time since the previous call. Only decides how many fixed steps run.
  advance(deltaMs: number): number {
    this.acc += deltaMs;
    let ran = 0;
    while (this.acc >= this.stepMs && ran < this.maxCatchup) {
      this.acc -= this.stepMs;
      this.ctx.tick = this.tick++;
      this.step(this.ctx);
      ran++;
    }
    if (ran === this.maxCatchup) this.acc = 0; // hitch: drop the backlog, do not spiral
    return ran;
  }
}

export {}
