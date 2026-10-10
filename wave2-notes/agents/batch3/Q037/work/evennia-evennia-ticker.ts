// Licence: BSD-3-Clause (donor, permissive). Shape only: written from the described mechanism, not a copy of the donor lines.
type Hook = (...args: unknown[]) => Promise<void> | void;

interface Subscription { key: string; hook: Hook; args: unknown[]; }

interface SavedGroup { intervalSec: number; nextInMs: number; keys: string[]; }

// One timer per interval value, shared by every subscriber on that interval.
class IntervalGroup {
  private subs = new Map<string, Subscription>();
  private pendingAdd: Subscription[] = [];
  private pendingRemove: string[] = [];
  private ticking = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private nextAt = 0;

  constructor(readonly intervalMs: number, private readonly onEmpty: () => void) {}

  add(sub: Subscription, firstInMs?: number): void {
    if (this.ticking) { this.pendingAdd.push(sub); return; }   // defer changes made during a tick
    this.subs.set(sub.key, sub);
    if (this.timer === null) this.schedule(firstInMs ?? this.intervalMs);
  }

  remove(key: string): void {
    if (this.ticking) { this.pendingRemove.push(key); return; }
    this.subs.delete(key);
    if (this.subs.size === 0) this.unschedule();
  }

  remainingMs(): number {
    return this.timer === null ? 0 : Math.max(0, this.nextAt - Date.now());
  }

  keys(): string[] { return [...this.subs.keys()]; }

  private schedule(delayMs: number): void {
    this.nextAt = Date.now() + delayMs;
    this.timer = setTimeout(() => { this.timer = null; void this.fire(); }, delayMs);
  }

  private unschedule(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.onEmpty();
  }

  // Hooks run one after another. A throwing hook is logged and the rest still run.
  private async fire(): Promise<void> {
    this.ticking = true;
    for (const sub of [...this.subs.values()]) {
      try { await sub.hook(...sub.args); }
      catch (err) { console.error('ticker hook failed', sub.key, err); }
    }
    this.ticking = false;
    for (const key of this.pendingRemove) this.subs.delete(key);
    this.pendingRemove = [];
    for (const sub of this.pendingAdd) this.subs.set(sub.key, sub);
    this.pendingAdd = [];
    if (this.subs.size === 0) { this.unschedule(); return; }
    this.schedule(this.intervalMs);   // next pass is scheduled only after this pass finished
  }
}

class TickerHub {
  private groups = new Map<number, IntervalGroup>();

  add(intervalSec: number, key: string, hook: Hook, firstInMs?: number): void {
    const seconds = Math.trunc(intervalSec);   // donor: int(interval), so whole seconds only
    if (seconds < 1) throw new RangeError('ticker interval must be at least 1 second');
    let group = this.groups.get(seconds);
    if (!group) {
      group = new IntervalGroup(seconds * 1000, () => { this.groups.delete(seconds); });
      this.groups.set(seconds, group);
    }
    group.add({ key, hook, args: [] }, firstInMs);
  }

  remove(intervalSec: number, key: string): void {
    this.groups.get(Math.trunc(intervalSec))?.remove(key);
  }

  // Save each interval's time-to-next-pass so a restart resumes the same phase.
  snapshot(): SavedGroup[] {
    return [...this.groups.entries()].map(([intervalSec, g]) => ({
      intervalSec, nextInMs: g.remainingMs(), keys: g.keys(),
    }));
  }

  restore(saved: SavedGroup[], resolve: (key: string) => Hook | undefined): void {
    for (const g of saved) {
      for (const key of g.keys) {
        const hook = resolve(key);
        if (hook) this.add(g.intervalSec, key, hook, g.nextInMs);
      }
    }
  }
}

export {};
