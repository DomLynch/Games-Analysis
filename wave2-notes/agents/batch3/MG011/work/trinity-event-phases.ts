// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Ev { id: number; group: number; phase: number } // group 0 = none; phase 0 = any phase; 1..8 otherwise

interface Entry { due: number; seq: number; ev: Ev }

const bit = (p: number): number => (p >= 1 && p <= 8 ? 1 << (p - 1) : 0);
const key = (e: Ev): string => `${e.id}/${e.group}/${e.phase}`;

export class EventQueue {
  private now = 0;
  private seq = 0;
  private queue: Entry[] = [];
  private phaseMask = 0;
  private last: Ev | null = null;
  private series = new Map<string, number[]>();

  constructor(private onDrop: (ev: Ev) => void = () => {}) {}

  update(ms: number): void { this.now += ms; }

  // Absolute: 0 clears the phase, 1..8 selects exactly one phase.
  setPhase(p: number): void { this.phaseMask = p === 0 ? 0 : bit(p); }

  addPhase(p: number): void { this.phaseMask |= bit(p); }

  schedule(ev: Ev, ms: number): void { this.insert(this.now + ms, ev); }

  // Re-arms the most recently executed event.
  repeat(ms: number): void { if (this.last) this.insert(this.now + ms, this.last); }

  // Gaps are appended to the series; the first gap is armed now.
  scheduleSeries(ev: Ev, gapsMs: number[]): void {
    const k = key(ev);
    const s = this.series.get(k) ?? [];
    s.push(...gapsMs);
    this.series.set(k, s);
    this.requeueSeries(ev);
  }

  private live(ev: Ev): boolean {
    return this.phaseMask === 0 || ev.phase === 0 || (bit(ev.phase) & this.phaseMask) !== 0;
  }

  // Returns 0 when nothing is due. A due event whose phase is not active is dropped.
  execute(): number {
    while (this.queue.length > 0) {
      const head = this.queue[0];
      if (head.due > this.now) return 0;
      this.queue.shift();
      if (!this.live(head.ev)) { this.onDrop(head.ev); continue; } // fix: donor drops silently
      this.last = head.ev;
      this.requeueSeries(head.ev);
      return head.ev.id;
    }
    return 0;
  }

  // Fix: phase-aware. The donor's HasEventScheduled does not check phase.
  hasScheduled(id: number): boolean {
    return this.queue.some((q) => q.ev.id === id && this.live(q.ev));
  }

  private requeueSeries(ev: Ev): void {
    const k = key(ev);
    const s = this.series.get(k);
    if (!s || s.length === 0) return;
    this.insert(this.now + (s.shift() as number), ev);
    if (s.length === 0) this.series.delete(k);
  }

  private insert(due: number, ev: Ev): void {
    this.queue.push({ due, seq: this.seq++, ev });
    this.queue.sort((a, b) => a.due - b.due || a.seq - b.seq);
  }
}

// One AI tick. Due events wait while casting; they are not dropped.
export function aiTick(q: EventQueue, diffMs: number, isCasting: () => boolean, dispatch: (id: number) => void): void {
  q.update(diffMs);
  if (isCasting()) return;
  let id = q.execute();
  while (id !== 0) {
    dispatch(id);
    if (isCasting()) return;
    id = q.execute();
  }
}
export {};
