// Licence: LGPL-2.1-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export const STEP_LEN_S = 0.09; // target cycle length in seconds (donor default 0.09)

// Periodic gate with debt carry: accumulate elapsed time, fire at most once per call
// when the interval is reached, and keep the remainder for later calls.
export class IntervalLimiter {
  private acc = 0;
  constructor(private readonly interval: number) {}

  step(dtime: number): boolean {
    this.acc += dtime;
    if (this.acc < this.interval) return false;
    this.acc -= this.interval;
    return true;
  }
}

// Lag estimate: the worst recent cycle, decayed by a fixed factor every half second
// (about halved every 60 s), and always raised by the newest cycle.
export class LagEstimate {
  private max = 0;
  private decay = new IntervalLimiter(0.5);

  record(dtime: number): number {
    if (this.decay.step(dtime)) this.max *= 0.99425;
    this.max = Math.max(this.max, dtime);
    return this.max;
  }
}

export interface CycleIO {
  step(dtime: number): void;      // world step, fed the measured previous cycle
  receive(budgetMs: number): void; // packet intake for the rest of the window
  nowMs(): number;
}

// One server cycle. Returns the measured cycle length, which is the next step's dtime.
export function runCycle(io: CycleIO, lastDtimeS: number, stepLenS: number): number {
  const t0 = io.nowMs();
  io.step(lastDtimeS);
  const remainingMs = stepLenS * 1000 - (io.nowMs() - t0);
  io.receive(Math.max(0, remainingMs)); // simplified: the donor does not bound this loop by the window (see gaps)
  return (io.nowMs() - t0) / 1000;
}
export {};
