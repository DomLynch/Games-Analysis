// Licence: GPL-2.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Group = "world" | "pit" | "dungeon";
interface Zone { group: Group; update(fullMs: number, diffMs: number): void; delayed(fullMs: number): void; }

const MIN_DIFF_MS = 1;
const STEP_MS = 50;
const ORDER: Group[] = ["world", "pit", "dungeon"];

export class Tick {
  private prev = Date.now();
  private step = 0;
  private acc = 0;
  constructor(private zones: Zone[], private sessions: (diffMs: number) => void) {}

  pass(now: number): boolean {
    const diff = now - this.prev;
    if (diff < MIN_DIFF_MS) return false;
    this.prev = now;
    this.sessions(diff);
    this.zonesUpdate(diff);
    return true;
  }

  private zonesUpdate(diff: number): void {
    this.acc += diff;
    const g = ORDER[this.step];
    const full = this.step < ORDER.length ? this.acc : 0;
    for (const z of this.zones) z.update(z.group === g ? full : 0, diff);
    if (this.step < ORDER.length) {
      for (const z of this.zones) if (z.group === g) z.delayed(full);
      this.acc = 0;
      this.step++;
    }
    if (this.step === ORDER.length) this.step = 0;
  }
}

export {}
