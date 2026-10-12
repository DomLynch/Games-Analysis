// Licence: MIT (donor LICENSE). Code may be adapted; this sketch is written from the described mechanism.
export interface StepContext {
  dt: number;          // seconds, fixed
  dtMs: number;        // milliseconds, fixed
  tick: number;        // steps executed so far
}

// Fixed-timestep accumulator. The donor runs this on a setInterval; here the caller
// hands in the measured delta each real frame, so the loop can be tested without timers.
export class FixedStepLoop {
  private acc = 0;
  private tick = 0;
  private readonly ctx: StepContext;   // reused per step: no allocation in the hot loop

  constructor(
    private readonly stepMs: number,            // 1000 / tickRate
    private readonly maxCatchupSteps = 5,       // donor MAX_CATCHUP_STEPS
  ) {
    this.ctx = { dt: stepMs / 1000, dtMs: stepMs, tick: 0 };
  }

  // Returns how many fixed steps ran this frame.
  advance(measuredDeltaMs: number, step: (ctx: StepContext) => void): number {
    this.acc += measuredDeltaMs;
    let ran = 0;
    while (this.acc >= this.stepMs && ran < this.maxCatchupSteps) {
      this.acc -= this.stepMs;
      this.ctx.tick = this.tick++;
      step(this.ctx);
      ran++;
    }
    if (ran === this.maxCatchupSteps) this.acc = 0; // hitch: drop the backlog, no spiral of death
    return ran;
  }
}

// Send-rate decoupling: the patch runs on its own accumulator over the same measured delta.
// Donor: a separate setInterval at patchRate (50 ms by default) next to a 60 Hz sim.
export class PatchLoop {
  private acc = 0;
  constructor(private readonly patchMs: number) {}

  // Returns how many patches are due this frame (0 or 1 for normal frames).
  advance(measuredDeltaMs: number, send: () => void): number {
    this.acc += measuredDeltaMs;
    let sent = 0;
    while (this.acc >= this.patchMs && sent < 1) { // at most one patch per frame
      this.acc -= this.patchMs;
      send();
      sent++;
    }
    if (sent === 1 && this.acc >= this.patchMs) this.acc = 0; // patch is behind: drop, do not burst
    return sent;
  }
}

export {};
