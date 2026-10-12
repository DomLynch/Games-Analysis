// Licence: repo LICENSE is GPL-3.0; project header template gplheader.txt says GPL-2.0-or-later. Donor file itself has no header. clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Interval = "hourly" | "daily" | "weekly" | "monthly";
const INTERVALS: Interval[] = ["hourly", "daily", "weekly", "monthly"];

// Next boundary strictly after `last`, in UTC (Frankendom choice; donor uses local DateTime.Now).
function nextBoundary(kind: Interval, last: Date): Date {
  const y = last.getUTCFullYear();
  const m = last.getUTCMonth();
  const d = last.getUTCDate();
  switch (kind) {
    case "hourly":
      return new Date(Date.UTC(y, m, d, last.getUTCHours() + 1));
    case "daily":
      return new Date(Date.UTC(y, m, d + 1));
    case "weekly": {
      const monBased = (last.getUTCDay() + 6) % 7; // Monday = 0
      return new Date(Date.UTC(y, m, d + (7 - monBased))); // 7 when already Monday
    }
    case "monthly":
      return new Date(Date.UTC(y, m + 1, 1));
  }
}

interface Tracker {
  kind: Interval;
  last: Date;
  next: Date;
  callbacks: Array<() => void>;
}

class RolloverScheduler {
  private trackers: Tracker[];

  // stored: last rollover per interval from the database (undefined on first run).
  constructor(
    stored: Partial<Record<Interval, Date>>,
    now: Date,
    private save: (kind: Interval, at: Date) => void,
  ) {
    this.trackers = INTERVALS.map((kind) => {
      const last = stored[kind] ?? now; // first run stamps now
      return { kind, last, next: nextBoundary(kind, last), callbacks: [] };
    });
    this.sortTrackers();
  }

  subscribe(kind: Interval, cb: () => void): void {
    const t = this.trackers.find((x) => x.kind === kind);
    if (t) t.callbacks.push(cb);
  }

  // Called once per game tick. Trackers are sorted, so stop at the first one not yet due.
  tick(now: Date): void {
    let fired = false;
    for (const t of this.trackers) {
      if (now.getTime() < t.next.getTime()) break;
      this.fire(t, now);
      fired = true;
    }
    if (fired) this.sortTrackers();
  }

  private fire(t: Tracker, now: Date): void {
    // Fix for donor defect: advance the timer before the save, and contain a failing save,
    // so one bad database write cannot stall this tracker or the ones after it.
    t.last = now;
    t.next = nextBoundary(t.kind, now);
    try {
      this.save(t.kind, now);
    } catch {
      // log and continue
    }
    for (const cb of t.callbacks) {
      try {
        cb();
      } catch {
        // log and continue; one bad callback does not stop the others
      }
    }
  }

  lastRollover(kind: Interval): Date | undefined {
    return this.trackers.find((x) => x.kind === kind)?.last;
  }

  private sortTrackers(): void {
    this.trackers.sort((a, b) => a.next.getTime() - b.next.getTime());
  }
}

// Lazy reset for a player who was offline: any interval rolled over after their previous login.
function intervalsToResetOnLogin(previousLogin: Date, sched: RolloverScheduler): Interval[] {
  return INTERVALS.filter((k) => {
    const last = sched.lastRollover(k);
    return last !== undefined && previousLogin.getTime() < last.getTime();
  });
}

export {};
