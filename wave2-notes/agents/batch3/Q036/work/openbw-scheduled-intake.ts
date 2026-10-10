// Licence: unclear (donor has no licence file or header). clean-room sketch written from the described mechanism; shape only, not a translation of the donor lines.
// clean-room
export interface Scheduled {
  tick: number;                  // tick the input is due on
  playerId: string;
  input: Uint8Array;
}

export class ScheduledIntake {
  private queue: Scheduled[] = [];

  constructor(private readonly latencyTicks: number, private readonly maxQueued: number) {}

  // ackedTick is the last tick this client reported. The input is due latencyTicks later.
  accept(playerId: string, ackedTick: number, input: Uint8Array): boolean {
    if (this.queue.length >= this.maxQueued) return false;   // bounded buffer
    this.queue.push({ tick: ackedTick + this.latencyTicks, playerId, input });
    return true;
  }

  // Run once per server tick, before the world step. Applies only the inputs due now.
  applyDue(tick: number, apply: (playerId: string, input: Uint8Array) => boolean): { applied: number; late: number } {
    let applied = 0;
    let late = 0;
    const keep: Scheduled[] = [];
    for (const s of this.queue) {
      if (s.tick === tick) {
        if (apply(s.playerId, s.input)) applied++;
      } else if (s.tick < tick) {
        late++;                  // missed its tick: dropped, not replayed
      } else {
        keep.push(s);
      }
    }
    this.queue = keep;
    return { applied, late };
  }
}

const FNV_OFFSET = 2166136261;
const FNV_PRIME = 16777619;

// Every `interval` ticks, hash the fields that must agree and keep the last 4 hashes.
export class CheckpointRing {
  private slots: number[] = [0, 0, 0, 0];
  private index = 0;

  constructor(private readonly interval: number) {}

  maybeRecord(tick: number, fields: number[]): boolean {
    if (tick % this.interval !== 0) return false;
    let h = FNV_OFFSET;
    for (const v of fields) {
      h ^= v >>> 0;
      h = Math.imul(h, FNV_PRIME) >>> 0;
    }
    this.index = (this.index + 1) % this.slots.length;
    this.slots[this.index] = h;
    return true;
  }

  at(i: number): number {
    return this.slots[i];
  }
}

export {};
