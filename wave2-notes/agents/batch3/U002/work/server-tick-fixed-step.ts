// Licence: GPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
const TICK_MS = 8;          // wheel turn length (donor: 8 ms)
const IDLE_WAIT_MS = 2;     // longest idle sleep (donor default: 2 ms)

// Dirty-flag queue: flags are OR-ed per entity and the entity is queued once.
// A drain processes only the entries that were queued before the pass started.
class DirtyQueue<T> {
  private queue: T[] = [];
  private flags = new Map<T, number>();

  mark(entity: T, flag: number): void {
    const had = this.flags.get(entity);
    this.flags.set(entity, (had ?? 0) | flag);
    if (had === undefined) this.queue.push(entity);
  }

  get pending(): number { return this.queue.length; }

  drain(apply: (entity: T, flags: number) => void): void {
    let limit = this.queue.length; // bound fixed on entry; re-marks during the pass wait for the next pass
    while (limit-- > 0 && this.queue.length > 0) {
      const entity = this.queue.shift() as T;
      const flags = this.flags.get(entity) ?? 0;
      this.flags.delete(entity);
      apply(entity, flags);
    }
  }
}

interface Job { due: number; cancelled: boolean; run: () => void; }

// Fixed-step wheel: time advances in TICK_MS turns; the loop catches up every turn it owes.
class FixedStepWheel {
  private lastTurn: number;
  private jobs: Job[] = [];

  constructor(now: number) { this.lastTurn = now; }

  schedule(now: number, delayMs: number, run: () => void): Job {
    const job: Job = { due: now + Math.max(delayMs, TICK_MS), cancelled: false, run };
    this.jobs.push(job);
    return job;
  }

  // Accumulator: one turn per TICK_MS owed, no matter how often the loop calls this.
  advance(now: number): void {
    while (now - this.lastTurn >= TICK_MS) {
      this.lastTurn += TICK_MS;
      const due = this.jobs.filter(j => j.due <= this.lastTurn);
      this.jobs = this.jobs.filter(j => j.due > this.lastTurn);
      for (const j of due) if (!j.cancelled) j.run();
    }
  }

  // How long the loop may sleep before the next turn is owed, capped by the idle backstop.
  idleSleepMs(now: number): number {
    const untilTurn = Math.max(0, TICK_MS - (now - this.lastTurn));
    return Math.min(untilTurn, IDLE_WAIT_MS);
  }
}

// One loop iteration: dirty drain first, then the wheel, in the donor's phase order.
function iteration(now: number, wheel: FixedStepWheel, mobiles: DirtyQueue<string>,
                   applyDelta: (m: string, flags: number) => void): number {
  mobiles.drain(applyDelta);
  wheel.advance(now);
  return wheel.idleSleepMs(now);
}

export {};
