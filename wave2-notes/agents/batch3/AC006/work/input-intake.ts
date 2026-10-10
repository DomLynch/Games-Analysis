// Licence: MIT (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
export type Range = readonly [number, number];
export type InputFrame = Record<string, number>;

export interface Slot {
  frame: InputFrame;
  seq: number;
}

// Clamp each ranged field in place. A missing field is left alone; NaN fails both
// comparisons and lands on the floor. Sanitizers modify values, they never reject a frame.
export function clampFrame(frame: InputFrame, ranges: Record<string, Range>): void {
  for (const name of Object.keys(ranges)) {
    const v = frame[name];
    if (v === undefined) continue;
    const [lo, hi] = ranges[name];
    frame[name] = v >= lo ? (v <= hi ? v : hi) : lo;
  }
}

export class IntakeRing {
  private lastSeq = -Infinity;
  private slots: Slot[] = [];
  private lastAckedSeq = 0;

  constructor(
    private readonly maxSize: number,
    private readonly ranges: Record<string, Range>,
  ) {}

  // One decoded packet slot. Order: clamp first, then dedupe by seq, then bounded push.
  offer(frame: InputFrame, seq: number): boolean {
    clampFrame(frame, this.ranges);
    if (seq <= this.lastSeq) return false; // duplicate or older: drop
    this.lastSeq = seq;
    this.slots.push({ frame: { ...frame }, seq });
    if (this.slots.length > this.maxSize) {
      const dropped = this.slots.shift()!; // overflow drops the oldest unconsumed input
      this.lastAckedSeq = dropped.seq;     // and counts it as acked
    }
    return true;
  }

  // Consume the oldest input for this tick. Empty returns undefined and does not move the ack.
  next(): Slot | undefined {
    const s = this.slots.shift();
    if (s !== undefined) this.lastAckedSeq = s.seq;
    return s;
  }

  get ackSeq(): number {
    return this.lastAckedSeq;
  }
}

export {};
