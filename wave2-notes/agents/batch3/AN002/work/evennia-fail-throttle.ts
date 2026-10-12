// clean-room: written from the mechanism in evennia-evennia server/throttle.py (BSD-3-Clause), not a translation.
export interface FailThrottleOpts {
  name: string;
  limit: number; // failures that lock a key; also the size of the bounded window
  timeoutMs: number; // lock length, measured from the newest recorded failure
  log: (line: string) => void; // one line when a lock turns on
  now?: () => number;
}

// Failed actions per key (player id or IP). Keeps only the last `limit` failure times.
export class FailThrottle {
  private readonly rec = new Map<string, number[]>();
  readonly stats = { fails: 0, locks: 0 }; // telemetry counters for the metrics store

  constructor(private readonly o: FailThrottleOpts) {}

  private t(): number {
    return this.o.now ? this.o.now() : Date.now();
  }

  // Locked = the window is full and the newest failure is still inside the timeout.
  // An expired record is cleared here (donor check(): remove when the timeout has passed).
  isLocked(key: string): boolean {
    const r = this.rec.get(key);
    if (r === undefined || r.length < this.o.limit) return false;
    if (this.t() - r[r.length - 1] < this.o.timeoutMs) return true;
    this.rec.delete(key);
    return false;
  }

  // Record one failed action. Returns true only on the call that turns the lock on (logged once).
  // Callers must check isLocked() first and return early while locked, so blocked attempts are not recorded.
  fail(key: string, reason: string): boolean {
    const wasLocked = this.isLocked(key);
    const r = this.rec.get(key) ?? [];
    r.push(this.t());
    if (r.length > this.o.limit) r.splice(0, r.length - this.o.limit); // bounded, like the donor deque maxlen
    this.rec.set(key, r);
    this.stats.fails += 1;
    const nowLocked = this.isLocked(key);
    if (!wasLocked && nowLocked) {
      this.stats.locks += 1;
      this.o.log(`${this.o.name} lock: ${reason} (key ${key}; ${this.o.limit} hits in ${this.o.timeoutMs} ms)`);
      return true;
    }
    return false;
  }
}

export {};
