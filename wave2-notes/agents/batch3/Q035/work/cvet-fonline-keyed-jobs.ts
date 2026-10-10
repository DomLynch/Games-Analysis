// Licence: MIT (donor cvet-fonline, LICENSE). Clean-room sketch of the scheduling shape, written from the donor's order of operations.
type JobBody = () => number | undefined; // returns the delay in ms before the next run, or undefined to stop

interface Scheduled {
  fireAt: number;
  key: string;
  body: JobBody;
}

const MAX_MESSAGES_PER_PASS = 256; // donor default, Settings.inc:128
const POLL_MS = 100; // donor default, Settings.inc:421

class KeyedJobQueue {
  private queue: Scheduled[] = []; // sorted ascending by fireAt
  private queued = new Set<string>();
  private running = new Set<string>();
  private pendingRerun = new Map<string, Scheduled>();
  private wakeRequests = new Set<string>();

  constructor(private now: () => number) {}

  submit(key: string, delayMs: number, body: JobBody): void {
    if (this.running.has(key)) {
      this.pendingRerun.set(key, { fireAt: this.now() + delayMs, key, body });
    } else if (!this.queued.has(key)) {
      this.enqueue({ fireAt: this.now() + delayMs, key, body });
      this.queued.add(key);
    } // already queued: the earlier submit stands
  }

  wake(key: string): boolean {
    if (this.queued.has(key)) {
      const i = this.queue.findIndex((e) => e.key === key);
      const [entry] = this.queue.splice(i, 1);
      entry.fireAt = this.now();
      this.enqueue(entry);
      return true;
    }
    if (this.running.has(key)) {
      this.wakeRequests.add(key);
      return true;
    }
    return false;
  }

  // Single-threaded stand-in for the donor's worker threads: runs every job due at now().
  runDue(): void {
    while (this.queue.length > 0 && this.queue[0].fireAt <= this.now()) {
      const job = this.queue.shift()!;
      this.queued.delete(job.key);
      this.running.add(job.key);
      const next = job.body();
      this.running.delete(job.key);

      const wake = this.wakeRequests.delete(job.key);
      const rerun = this.pendingRerun.get(job.key);
      if (rerun !== undefined) {
        this.pendingRerun.delete(job.key);
        if (wake) rerun.fireAt = this.now();
        this.enqueue(rerun);
        this.queued.add(job.key);
      } else if (next !== undefined) {
        this.enqueue({ fireAt: this.now() + (wake ? 0 : next), key: job.key, body: job.body });
        this.queued.add(job.key);
      }
    }
  }

  private enqueue(entry: Scheduled): void {
    let i = this.queue.length;
    while (i > 0 && this.queue[i - 1].fireAt > entry.fireAt) i--;
    this.queue.splice(i, 0, entry);
  }
}

// Player job body: drain up to MAX_MESSAGES_PER_PASS, then always re-arm at POLL_MS.
function makePlayerJob(pending: () => number, processOne: () => void): JobBody {
  return () => {
    let done = 0;
    while (done < MAX_MESSAGES_PER_PASS && pending() > 0) {
      processOne();
      done++;
    }
    return POLL_MS;
  };
}

export {};
