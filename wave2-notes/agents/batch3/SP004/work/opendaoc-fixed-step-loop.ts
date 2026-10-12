// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Service {
  readonly name: string;
  tick(gameTimeMs: number): void;
}

export class FixedStepLoop {
  private deadlineMs: number;
  private gameTimeMs = 0;
  droppedTicks = 0; // ticks skipped because the loop fell a whole tick behind

  constructor(
    private readonly services: readonly Service[], // fixed order: input intake first, output last
    private readonly tickMs: number,               // 1000 / tickRate, e.g. 1000 / 30 = 33.33 ms
    startMs: number,
  ) {
    this.deadlineMs = startMs + tickMs;
  }

  // One iteration in donor order: run every service, advance game time by exactly one tick,
  // then settle the next deadline. Returns the delay in ms the caller should wait (0 = run now).
  iterate(clockMs: number): number {
    for (const s of this.services) s.tick(this.gameTimeMs);
    this.gameTimeMs += this.tickMs;

    const now = Math.max(clockMs, this.deadlineMs);
    if (now - this.deadlineMs >= this.tickMs) {
      // Late by a whole tick or more: restart the schedule from now, no catch-up burst.
      this.droppedTicks++;
      this.deadlineMs = now + this.tickMs;
    } else {
      this.deadlineMs += this.tickMs;
    }
    return this.deadlineMs - now;
  }

  get gameTime(): number {
    return this.gameTimeMs;
  }
}

export {};
