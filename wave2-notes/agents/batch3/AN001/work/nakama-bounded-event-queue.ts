// Licence: Apache-2.0 (donor, heroiclabs-nakama). Shape adapted; written fresh for a single-threaded Node server, not a line translation.
// simplified: the donor runs N goroutine workers draining a Go channel. Node is single-threaded, so this sketch drains a bounded FIFO once per tick under a budget instead. It keeps the donor's drop-on-full rule, the drop counter, and the cardinality cap. It fixes three donor defects: the warn log on every drop (rate-limited here), the silent overflow of the cardinality cap (counted here), and integer-millisecond truncation in the latency window (kept as float here). It omits the tracker, the per-RPC metric names, the Prometheus export and the Stackdriver log format.

export class BoundedEventQueue<T> {
  private items: T[] = [];
  private head = 0;
  dropped = 0;                 // lifetime drop count (donor: CountDroppedEvents)
  private droppedSinceWarn = 0;
  private lastWarnAt = Number.NEGATIVE_INFINITY;

  constructor(
    private readonly capacity: number,     // count: donor EventQueueSize, default 65536
    private readonly warnEveryMs: number,  // ms: minimum gap between drop warnings (donor warns on every drop)
    private readonly warn: (msg: string) => void,
    private readonly now: () => number = () => Date.now(),
  ) {
    if (capacity < 1) throw new Error("capacity must be >= 1");
  }

  get depth(): number {
    return this.items.length - this.head;
  }

  // Never blocks the producer. A full queue drops the new item and counts it.
  offer(item: T): boolean {
    if (this.depth >= this.capacity) {
      this.dropped++;
      this.droppedSinceWarn++;
      const t = this.now();
      if (t - this.lastWarnAt >= this.warnEveryMs) {
        this.warn(`event queue full: ${this.droppedSinceWarn} dropped since last warning, ${this.dropped} total`);
        this.droppedSinceWarn = 0;
        this.lastWarnAt = t;
      }
      return false;
    }
    this.items.push(item);
    return true;
  }

  // Called once per server tick. Handles at most maxPerTick items, so the event work has a fixed budget.
  drain(maxPerTick: number, handle: (item: T) => void): number {
    let n = 0;
    while (n < maxPerTick && this.depth > 0) {
      const item = this.items[this.head];
      this.head++;
      handle(item);
      n++;
    }
    if (this.head > 1024 && this.head * 2 > this.items.length) {
      this.items = this.items.slice(this.head);
      this.head = 0;
    }
    return n;
  }
}

// Caps how many distinct label sets (tags) a metric may create. Over the cap, the write is dropped and counted.
export class LabelCap {
  private seen = new Set<string>();
  overflow = 0;

  constructor(private readonly limit: number) {} // count: donor CustomScopeLimit, default 10000

  admit(labelKey: string): boolean {
    if (this.seen.has(labelKey)) return true;
    if (this.seen.size >= this.limit) {
      this.overflow++;
      return false;
    }
    this.seen.add(labelKey);
    return true;
  }
}

// Rolling window for health numbers: average latency and request rate over windowS seconds.
export class WindowStats {
  private count = 0;
  private sumMs = 0;

  record(ms: number): void {
    this.count++;
    this.sumMs += ms; // float ms: no truncation of sub-millisecond requests
  }

  // Call every windowS seconds (donor: 5 s). Resets the window.
  snapshot(windowS: number): { avgMs: number; rate: number } {
    const avgMs = this.count > 0 ? this.sumMs / this.count : 0;
    const rate = this.count / windowS;
    this.count = 0;
    this.sumMs = 0;
    return { avgMs, rate };
  }
}

export {};
