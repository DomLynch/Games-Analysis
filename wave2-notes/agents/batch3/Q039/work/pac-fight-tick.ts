// Licence: GPL-3.0 (donor LICENSE). Clean-room: written from the described mechanism, not a translation of the donor.
export const MAX_DT_MS = 50;      // per-tick clamp on elapsed time, so a lag spike slows the fight instead of skipping it
export const FIGHT_MS = 45000;    // fight-phase countdown

export interface Unit {
  update(dt: number): void;
}

export interface TimedCommand {
  delay: number;
  executed: boolean;
  run(): void;
}

export type TickResult = "fight" | "timeout" | "over";

export class FightTick {
  private timeLeft = FIGHT_MS;
  private finished = false;

  constructor(private blue: Unit[], private red: Unit[]) {}

  // Called once per server tick with the real elapsed milliseconds.
  tick(rawDt: number, pending: TimedCommand[]): TickResult {
    const dt = Math.min(MAX_DT_MS, rawDt);
    this.timeLeft -= dt;
    if (this.timeLeft < 0) return "timeout"; // the units are not stepped on the tick the clock runs out
    if (this.finished) return "over";

    // Fixed order inside one tick: delayed commands, then blue units, then red units.
    for (const c of pending) {
      if (c.executed) continue;
      c.delay -= dt;
      if (c.delay < 0) {
        c.run();
        c.executed = true;
      }
    }
    for (const u of this.blue) u.update(dt);
    for (const u of this.red) u.update(dt);
    return "fight";
  }

  markFinished(): void {
    this.finished = true;
  }
}

// One-second cadence: if due, fire and reset to 1000 (the overshoot is not carried); otherwise count down, floored at 0.
export class Cadence {
  private cool: number;
  constructor(initialMs = 0) {
    this.cool = initialMs; // initial value in the donor was not read
  }
  step(dt: number, fire: () => void): void {
    if (this.cool <= 0) {
      fire();
      this.cool = 1000;
    } else {
      this.cool = Math.max(0, this.cool - dt);
    }
  }
}

export {};
