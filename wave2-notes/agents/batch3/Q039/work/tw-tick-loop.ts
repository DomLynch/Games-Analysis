// Licence: zlib-style (donor license.txt). Clean-room: written from the described loop, not a translation of the donor.
export const TICK_HZ = 50;                 // server ticks per second
export const PERIOD_MS = 1000 / TICK_HZ;   // 20 ms per tick
export const MAX_CATCHUP = 5;              // OUR cap per loop pass; the donor has no cap
export const INPUT_SLOTS = 200;            // per-client input ring size in the donor

export interface Input {
  tick: number;
  data: number[];
}

export class ServerLoop {
  private tick = 0;
  private inputs = new Map<number, Input[]>();

  constructor(
    private startMs: number,
    private onTick: (tick: number, inputs: Input[]) => void
  ) {}

  // Start time of a tick, anchored to server start, so tick numbers do not drift with frame timing.
  tickStartMs(n: number): number {
    return this.startMs + n * PERIOD_MS;
  }

  // Input intake: keyed by the tick the client intends. A tick already past is moved to the next tick.
  intake(intendedTick: number, data: number[]): void {
    const t = intendedTick <= this.tick ? this.tick + 1 : intendedTick;
    const list = this.inputs.get(t) ?? [];
    list.push({ tick: t, data });
    this.inputs.set(t, list);
  }

  // One pass of the loop at wall time `now`. Runs every tick that is due (capped), then returns the wait in ms.
  step(now: number): number {
    let ran = 0;
    while (now > this.tickStartMs(this.tick + 1) && ran < MAX_CATCHUP) {
      this.tick++;
      ran++;
      const due = this.inputs.get(this.tick) ?? [];
      this.inputs.delete(this.tick);
      this.onTick(this.tick, due); // inputs for this tick are applied before the game tick
    }
    const wait = Math.round(this.tickStartMs(this.tick + 1) - now);
    return Math.min(Math.max(wait, 1), PERIOD_MS / 2); // donor waits between 1 and 10 ms
  }

  currentTick(): number {
    return this.tick;
  }
}

export {};
