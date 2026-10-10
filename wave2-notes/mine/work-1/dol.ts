// Licence: GPL-2.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Timer { due: number; laps: number; fire: () => void; }

export class Wheel {
  private slots: Timer[][];
  private now = 0;
  constructor(private size = 1024) {
    this.slots = Array.from({ length: size }, () => []);
  }

  add(delayTicks: number, fire: () => void): void {
    if (delayTicks < 1) throw new RangeError("delay must be >= 1");
    const due = this.now + delayTicks;
    const laps = Math.floor((delayTicks - 1) / this.size);
    this.slots[due % this.size].push({ due, laps, fire });
  }

  step(): void {
    this.now++;
    const slot = this.slots[this.now % this.size];
    const keep: Timer[] = [];
    for (const t of slot) {
      if (t.due === this.now) {
        try { t.fire(); } catch { /* donor disables the timer; we drop it */ }
      } else {
        keep.push(t);
      }
    }
    this.slots[this.now % this.size] = keep;
  }
}

// Pacing: balance += stepMs - workMs; sleep while positive; forgive past -1000.
export function nextBalance(balance: number, stepMs: number, workMs: number): number {
  let b = balance + stepMs - workMs;
  if (b < -1000) b += 1000;
  return b;
}

export {}
