// Licence: Business Source License 1.1 (donor, clockworklabs-SpacetimeDB). Clean-room: shape only, written from the described mechanism; no donor line is translated.
// simplified: the donor runs a Tokio worker task fed by an unbounded channel, with a lock-guarded file or memory logger and a broadcast channel for live tail. Node is single-threaded, so this sketch uses a bounded pending queue drained by flush(), which a server tick calls with a budget. It keeps: one serialized writer, JSON lines, an in-memory cap in bytes with oldest-first eviction, daily rotation that only moves forward, a backtrace captured only for panic records, and a snapshot-plus-follow tail. It fixes two donor defects: the unbounded command queue (bounded here, refusals are counted), and a failed file write that panics the caller (the sink error is counted here, not thrown). It omits the backward file scan, the level filter, and the lag counter for slow subscribers (callbacks here are synchronous, so nothing lags).

export type Level = "error" | "warn" | "info" | "debug" | "trace" | "panic";

export class ModuleLog {
  private ring: string[] = [];
  private head = 0;                  // index of the oldest kept line
  private ringBytes = 0;
  private pending: Array<{ ts: number; line: string }> = [];
  private subscribers = new Set<(line: string) => void>();
  dropped = 0;                       // lines refused because the pending queue was full
  sinkErrors = 0;                    // lines the sink failed to write (still kept in memory)

  constructor(
    private readonly maxBytes: number,                          // bytes kept in memory (donor: MemoryLogger max_size)
    private readonly maxPending: number,                        // lines queued before a refusal (donor: unbounded)
    private readonly sink: (ts: number, line: string) => void,  // may throw
    private readonly now: () => number = () => Date.now(),
  ) {}

  // Never blocks the caller. Serializes one record to a JSON line and queues it.
  write(level: Level, fields: Record<string, unknown>): boolean {
    if (this.pending.length >= this.maxPending) {
      this.dropped++;
      return false;
    }
    const ts = this.now();
    const body = level === "panic" ? { ...fields, backtrace: new Error().stack } : fields; // stack captured only for panic
    this.pending.push({ ts, line: JSON.stringify({ ts, level, ...body }) + "\n" });
    return true;
  }

  // Called once per server tick. Writes at most maxLines queued records.
  flush(maxLines: number): number {
    const batch = this.pending.splice(0, maxLines);
    for (const { ts, line } of batch) {
      try {
        this.sink(ts, line);
      } catch {
        this.sinkErrors++;
      }
      this.keep(line);
    }
    return batch.length;
  }

  // Last n lines plus every later line. Snapshot and subscribe happen in one synchronous call, so no line falls between them.
  tail(n: number, onLine: (line: string) => void): string[] {
    const cap = Math.min(n, 2500); // donor caps a snapshot at 2500 lines
    this.subscribers.add(onLine);
    return this.ring.slice(Math.max(this.head, this.ring.length - cap));
  }

  unsubscribe(onLine: (line: string) => void): void {
    this.subscribers.delete(onLine);
  }

  private keep(line: string): void {
    this.ring.push(line);
    this.ringBytes += line.length;
    while (this.ringBytes > this.maxBytes && this.head < this.ring.length) {
      this.ringBytes -= this.ring[this.head].length;
      this.head++;
    }
    if (this.head > 0 && this.head * 2 > this.ring.length) {
      this.ring = this.ring.slice(this.head); // compact so the array does not grow without bound
      this.head = 0;
    }
    for (const s of [...this.subscribers]) {
      try {
        s(line);
      } catch {
        this.subscribers.delete(s); // a subscriber that throws is removed
      }
    }
  }
}

// Daily rotation that only moves forward, as the donor does: a record for a later UTC day opens that day's file.
export function dailyRouter(open: (day: string) => (line: string) => void): (ts: number, line: string) => void {
  let day = "";
  let write: ((line: string) => void) | undefined;
  return (ts, line) => {
    const d = new Date(ts).toISOString().slice(0, 10); // YYYY-MM-DD, UTC; string order matches date order
    if (write === undefined || d > day) {
      day = d;
      write = open(d);
    }
    write(line);
  };
}

export {};
