// Licence: GPL-3.0-or-later (donor, "GPL3+"). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Integer milliseconds stand in for the donor's FixedPoint<int64_t,16> time.
export type SimTime = number;

export interface SimEvent {
  time: SimTime;
  seq: number;                             // insertion order: the equal-time tie-break the donor lacks
  run: (at: SimTime) => void;              // effects use the event's own time, not the poll time
  next?: (at: SimTime) => SimTime | null;  // repeat: next time, or null to stop (donor: predict_invoke_time)
}

export class EventQueue {
  private heap: SimEvent[] = [];
  private seqCounter = 0;

  get size(): number {
    return this.heap.length;
  }

  push(time: SimTime, run: SimEvent["run"], next?: SimEvent["next"]): void {
    this.heap.push({ time, seq: this.seqCounter++, run, next });
    this.up(this.heap.length - 1);
  }

  peek(): SimEvent | undefined {
    return this.heap[0];
  }

  pop(): SimEvent | undefined {
    const top = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0 && last !== undefined) {
      this.heap[0] = last;
      this.down(0);
    }
    return top;
  }

  private less(a: SimEvent, b: SimEvent): boolean {
    return a.time !== b.time ? a.time < b.time : a.seq < b.seq;
  }

  private up(i: number): void {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(this.heap[i], this.heap[p])) break;
      [this.heap[i], this.heap[p]] = [this.heap[p], this.heap[i]];
      i = p;
    }
  }

  private down(i: number): void {
    const n = this.heap.length;
    for (;;) {
      const l = 2 * i + 1;
      const r = l + 1;
      let m = i;
      if (l < n && this.less(this.heap[l], this.heap[m])) m = l;
      if (r < n && this.less(this.heap[r], this.heap[m])) m = r;
      if (m === i) break;
      [this.heap[i], this.heap[m]] = [this.heap[m], this.heap[i]];
      i = m;
    }
  }
}

// Runs every event with time <= until, in (time, seq) order. Returns how many ran.
export function reachTime(q: EventQueue, until: SimTime): number {
  let ran = 0;
  for (;;) {
    const top = q.peek();
    if (top === undefined || top.time > until) break;
    q.pop();
    top.run(top.time);
    ran++;
    if (top.next !== undefined) {
      const t = top.next(top.time);
      if (t !== null) {
        if (t <= top.time) throw new Error("repeat must move forward");
        q.push(t, top.run, top.next);
      }
    }
  }
  return ran;
}
