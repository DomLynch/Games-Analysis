// Licence: GNU GPL v3 (donor). Clean-room shape only; no donor line copied or translated.
interface Entry<T> {
  data: T | null;
  complete: boolean;
  lastUsed: number;     // ms; set on every read and on completion
  holds: number;        // live holders; a held entry is never evicted
  waiters: Array<(data: T) => void>;
}

interface CacheOptions<T> {
  free: (key: string, data: T) => void;                  // frees GPU handles, revokes blobs
  scheduleIdle: (run: (hasTime: () => boolean) => void) => void;
  clock: () => number;                                   // ms, same clock as lastUsed
}

const REMEMBER_MS = 30000;   // unused for this long => eligible for eviction
const SWEEP_EVERY_MS = 10000;
const CHUNK = 5;             // evictions per idle slice

export class AssetCache<T> {
  private readonly items = new Map<string, Entry<T>>();
  private lastSweepAt = Number.NEGATIVE_INFINITY;
  private queue: string[] = [];
  private sweeping = false;

  constructor(private readonly opts: CacheOptions<T>) {}

  /** Returns the data if complete; otherwise queues onload and returns null. */
  get(key: string, onload?: (data: T) => void): T | null {
    const e = this.entry(key);
    e.lastUsed = this.opts.clock();
    if (e.complete) {
      if (onload && e.data !== null) onload(e.data);
      return e.data;
    }
    if (onload) e.waiters.push(onload);
    return null;
  }

  set(key: string, data: T): void {
    const e = this.entry(key);
    e.data = data;
    e.complete = true;
    e.lastUsed = this.opts.clock();
    const waiters = e.waiters;
    e.waiters = [];
    for (const w of waiters) w(data);
  }

  retain(key: string): void {
    this.entry(key).holds += 1;
  }

  release(key: string): void {
    const e = this.items.get(key);
    if (e && e.holds > 0) e.holds -= 1;
  }

  /** Call once per frame. Starts a sweep at most every SWEEP_EVERY_MS. */
  tick(): void {
    const now = this.opts.clock();
    if (this.sweeping || now - this.lastSweepAt < SWEEP_EVERY_MS) return;
    this.lastSweepAt = now;
    this.queue = [];
    for (const [key, e] of this.items) {
      if (this.evictable(e, now)) this.queue.push(key);
    }
    if (this.queue.length === 0) return;
    this.sweeping = true;
    this.opts.scheduleIdle(hasTime => this.drain(hasTime));
  }

  private drain(hasTime: () => boolean): void {
    let done = 0;
    while (this.queue.length > 0 && done < CHUNK && hasTime()) {
      const key = this.queue.shift() as string;
      const e = this.items.get(key);
      // Re-check at the moment of removal: a read or a hold since the sweep keeps the entry.
      if (e && this.evictable(e, this.opts.clock())) {
        this.opts.free(key, e.data as T);
        this.items.delete(key);
      }
      done += 1;
    }
    if (this.queue.length > 0) {
      this.opts.scheduleIdle(next => this.drain(next));
    } else {
      this.sweeping = false;
    }
  }

  private evictable(e: Entry<T>, now: number): boolean {
    return e.complete && e.data !== null && e.holds === 0 && e.lastUsed < now - REMEMBER_MS;
  }

  private entry(key: string): Entry<T> {
    let e = this.items.get(key);
    if (!e) {
      e = { data: null, complete: false, lastUsed: 0, holds: 0, waiters: [] };
      this.items.set(key, e);
    }
    return e;
  }
}
