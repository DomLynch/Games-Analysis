// Licence: Apache-2.0 (donor, permissive). Shape only: written from the described mechanism, not a copy of the donor lines.

type JobOutcome = { skipped?: boolean } | void;

interface Job {
  name: string;
  intervalMs: number;   // floored to the tick
  offsetMs: number;     // first due time after start
  nextDueAt: number;
  inFlight: boolean;
  started: number;
  deferred: number;     // due passes that arrived while the job was still running
  coalesced: number;    // extra due passes folded into one run after a stall
  run: () => Promise<JobOutcome>;
}

// Fixed-step scheduler: one timer calls tick(); a job never overlaps itself.
class TickScheduler {
  private jobs: Job[] = [];
  constructor(private readonly tickMs: number) {}

  register(name: string, intervalMs: number, offsetMs: number, run: () => Promise<JobOutcome>): void {
    this.jobs.push({
      name,
      intervalMs: Math.max(this.tickMs, Math.floor(intervalMs)),
      offsetMs: Math.max(0, Math.floor(offsetMs)),
      nextDueAt: 0,
      inFlight: false,
      started: 0,
      deferred: 0,
      coalesced: 0,
      run,
    });
  }

  start(now: number): void {
    for (const job of this.jobs) job.nextDueAt = now + job.offsetMs;
    this.tick(now);
  }

  tick(now: number): void {
    for (const job of this.jobs) {
      if (now < job.nextDueAt) continue;
      const dueCount = Math.floor((now - job.nextDueAt) / job.intervalMs) + 1;
      job.nextDueAt += dueCount * job.intervalMs;
      if (job.inFlight) { job.deferred += dueCount; continue; }
      if (dueCount > 1) job.coalesced += dueCount - 1;
      job.inFlight = true;
      job.started += 1;
      Promise.resolve()
        .then(() => job.run())
        .catch(() => undefined)
        .finally(() => { job.inFlight = false; });
    }
  }
}

// Per-window time budget with lag and DB-queue gates. Player-protected mode gets a smaller cap.
interface GovernorConfig {
  windowMs: number;          // 1000
  idleBudgetMs: number;      // 250
  playerBudgetMs: number;    // 50
  lagAbortMs: number;        // 120
  idleDbQueueMax: number;    // 8
  playerDbQueueMax: number;  // 0
}
interface Pressure { lagMs: number; dbPending: number; playerProtected: boolean; }
interface Lease { id: number; generation: number; budgetMs: number; resource: string | null; }
type Admission =
  | { ok: true; budgetMs: number; lease: Lease }
  | { ok: false; reason: 'event_loop_lag' | 'database_queue' | 'resource_busy' | 'budget_exhausted' };

class WorkGovernor {
  private windowStart = 0;
  private generation = 0;
  private usedMs = 0;
  private nextId = 1;
  private busy = new Map<string, number>(); // resource -> lease id

  constructor(private readonly cfg: GovernorConfig) {}

  admit(now: number, p: Pressure, requestedMs: number, minimumMs: number, resource: string | null): Admission {
    if (this.windowStart === 0 || now < this.windowStart || now - this.windowStart >= this.cfg.windowMs) {
      this.windowStart = now;
      this.generation += 1;
      this.usedMs = 0;
    }
    if (p.lagMs >= this.cfg.lagAbortMs) return { ok: false, reason: 'event_loop_lag' };
    const dbMax = p.playerProtected ? this.cfg.playerDbQueueMax : this.cfg.idleDbQueueMax;
    if (p.dbPending > dbMax) return { ok: false, reason: 'database_queue' };
    if (resource !== null && this.busy.has(resource)) return { ok: false, reason: 'resource_busy' };
    const capMs = p.playerProtected ? this.cfg.playerBudgetMs : this.cfg.idleBudgetMs;
    const availableMs = Math.max(0, capMs - this.usedMs);
    const minimum = Math.min(requestedMs, minimumMs);
    if (availableMs < minimum) return { ok: false, reason: 'budget_exhausted' };
    const budgetMs = Math.max(minimum, Math.min(requestedMs, Math.floor(availableMs)));
    const lease: Lease = { id: this.nextId++, generation: this.generation, budgetMs, resource };
    this.usedMs += budgetMs;
    if (resource !== null) this.busy.set(resource, lease.id);
    return { ok: true, budgetMs, lease };
  }

  // Replace the granted budget with the measured time, but only if the window has not rolled over.
  complete(lease: Lease, actualMs: number): void {
    if (lease.resource !== null && this.busy.get(lease.resource) === lease.id) this.busy.delete(lease.resource);
    if (lease.generation === this.generation) {
      this.usedMs = Math.max(0, this.usedMs - lease.budgetMs + actualMs);
    }
  }
}

export {};
