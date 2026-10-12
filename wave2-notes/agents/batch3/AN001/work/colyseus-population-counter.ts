// Licence: MIT (donor, colyseus-colyseus; LICENSE "MIT License", (c) 2015-2026 Endel Dreyer). Shape adapted; written fresh, not a line translation.
// simplified: the donor keeps the counters in a shared presence hash keyed by process id and reads it with hgetall. This sketch takes a HashStore interface in place of presence. It fixes two donor defects: the immediate-write branch leaves a pending trailing timer alive (cleared here), and fetchAll has an open TODO to cache the global sum (cached here for cacheMs). It also guards the probe against a synchronous throw so the in-flight entry is always removed. It omits the PM2 metric export, the room-to-process removal that follows a failed probe, the swept receipt written after that removal, and the non-overlapping sweep interval.

export interface PopulationRow { roomCount: number; ccu: number }

// Stands in for the shared presence hash (donor: presence.hset / presence.hgetall).
export interface HashStore {
  hset(key: string, field: string, value: string): Promise<void>;
  hgetall(key: string): Promise<Record<string, string>>;
}

export class PopulationCounter {
  roomCount = 0;
  ccu = 0;
  private lastWrite = Number.NEGATIVE_INFINITY;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly store: HashStore,
    private readonly processId: string,
    private readonly intervalMs = 1000,   // ms: donor persistInterval = 1000
    private readonly now: () => number = () => Date.now(),
  ) {}

  // Call after every change to roomCount or ccu. Writes at most once per intervalMs.
  // A change inside the window schedules a trailing write, so the last value is always stored.
  publish(force = false): void {
    const t = this.now();
    clearTimeout(this.timer); // fix: donor's immediate branch does not clear the pending timer
    this.timer = undefined;
    if (force || t - this.lastWrite > this.intervalMs) {
      this.lastWrite = t;
      this.store.hset("roomcount", this.processId, `${this.roomCount},${this.ccu}`).catch(() => undefined);
      return;
    }
    this.timer = setTimeout(() => this.publish(), this.intervalMs);
  }
}

// Sum over all processes. Donor reads the hash on every call (TODO: cache). Here the sum is cached for cacheMs.
export class GlobalPopulation {
  private cached: { at: number; total: PopulationRow } | undefined;

  constructor(
    private readonly store: HashStore,
    private readonly cacheMs: number,     // ms: proposed 1000 (donor: none)
    private readonly now: () => number = () => Date.now(),
  ) {}

  async total(): Promise<PopulationRow> {
    const t = this.now();
    if (this.cached !== undefined && t - this.cached.at < this.cacheMs) {
      return this.cached.total;
    }
    const all = await this.store.hgetall("roomcount");
    const total: PopulationRow = { roomCount: 0, ccu: 0 };
    for (const value of Object.values(all)) {
      const [rooms, ccu] = value.split(",").map(Number);
      if (!Number.isFinite(rooms) || !Number.isFinite(ccu)) continue;
      total.roomCount += rooms;
      total.ccu += ccu;
    }
    this.cached = { at: t, total };
    return total;
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    p.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

// One liveness probe per peer at a time. A probe that fails or times out returns false.
export class ProbeGate {
  private inFlight = new Map<string, Promise<boolean>>();

  constructor(
    private readonly ping: (peerId: string) => Promise<void>,
    private readonly timeoutMs: number,   // ms: donor REMOTE_ROOM_SHORT_TIMEOUT, default 2000
  ) {}

  probe(peerId: string): Promise<boolean> {
    const existing = this.inFlight.get(peerId);
    if (existing !== undefined) return existing;

    const attempt = async (): Promise<boolean> => {
      await Promise.resolve(); // yield first, so the map entry below is set before the finally runs
      try {
        await withTimeout(this.ping(peerId), this.timeoutMs);
        return true;
      } catch {
        return false;
      } finally {
        this.inFlight.delete(peerId);
      }
    };

    const p = attempt();
    this.inFlight.set(peerId, p);
    return p;
  }
}

export {};
