// Licence: GPL-2.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export class Brain {
  debt = 0;
  private it: Iterator<number>; // each yield reports the work units just spent
  constructor(gen: () => Iterator<number>) { this.it = gen(); }

  // returns false when the brain has finished
  runSlice(budget: number): boolean {
    if (this.debt > 0) {
      this.debt -= budget;
      if (this.debt >= 0) return true; // still paying; no turn this tick
      budget = -this.debt;             // run with what is left
      this.debt = 0;
    }
    let left = budget;
    while (left > 0) {
      const r = this.it.next();
      if (r.done) return false;
      left -= r.value;
    }
    this.debt = -left; // overshoot becomes debt
    return true;
  }
}

export function tick(brains: Brain[], frame: number, speed: number, budget = 10000): void {
  const mask = (1 << (4 - speed)) - 1;
  if ((frame & mask) !== 0) return;
  for (const b of brains) b.runSlice(budget);
}

export {}
