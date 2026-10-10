interface Job {
  id: string;
  intervalMs: number | null; // null = one-shot
  intendedAt: number;        // ms, the time this run was supposed to start
  version: number;           // bumped when the job row changes; stale queue entries are dropped
  run: (intendedAt: number, lateMs: number) => void;
}

// first tick strictly after `now`, anchored at the last intended time; missed ticks are skipped
function nextTickAfter(lastIntended: number, intervalMs: number, now: number): number {
  if (intervalMs <= 0) return lastIntended + intervalMs;
  const elapsed = now - lastIntended;
  const ticks = elapsed <= 0 ? 1 : Math.floor(elapsed / intervalMs) + 1;
  return lastIntended + ticks * intervalMs;
}

interface QueueEntry { id: string; dueAt: number; version: number; }

class TickScheduler {
  private jobs = new Map<string, Job>();
  private pending = new Map<string, QueueEntry>(); // one pending entry per job id
  private inFlight = new Set<string>();
  readonly lateWarnMs = 30;
  lateLog: { id: string; lateMs: number }[] = [];
  constructor(private readonly clock: () => number) {}

  schedule(job: Job): void {
    this.jobs.set(job.id, job);
    this.pending.set(job.id, { id: job.id, dueAt: job.intendedAt, version: job.version }); // replaces any pending entry
  }

  cancel(id: string): void {
    this.jobs.delete(id);
    this.pending.delete(id);
  }

  // call from the host loop; `now` in ms. Returns how many jobs ran.
  poll(now: number): number {
    let ran = 0;
    for (const [id, entry] of [...this.pending]) {
      if (entry.dueAt > now || this.inFlight.has(id)) continue;
      this.pending.delete(id);
      const job = this.jobs.get(id);
      if (job === undefined || job.version !== entry.version) continue; // cancelled or stale
      const lateMs = Math.max(0, now - entry.dueAt);
      if (lateMs > this.lateWarnMs) this.lateLog.push({ id, lateMs });
      this.inFlight.add(id);
      try {
        job.run(entry.dueAt, lateMs);
      } finally {
        this.inFlight.delete(id);
      }
      ran += 1;
      if (job.intervalMs === null) {
        this.jobs.delete(id);
      } else {
        const next = nextTickAfter(entry.dueAt, job.intervalMs, this.clock());
        job.intendedAt = next;
        this.pending.set(id, { id, dueAt: next, version: job.version });
      }
    }
    return ran;
  }
}

export { TickScheduler, nextTickAfter, Job };
export {}
