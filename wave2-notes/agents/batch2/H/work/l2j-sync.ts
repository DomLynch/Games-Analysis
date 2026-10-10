interface Vec2 { x: number; z: number }
const dist2d = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.z - b.z);

type Correction = 'none' | 'walk' | 'snap';

// Server-snapshot reconcile: ignore tiny error, walk toward the server point for
// a medium error, teleport for a large one. Bands come from zone/game data.
function classify(local: Vec2, server: Vec2, ignoreBelow: number, snapAbove: number): Correction {
  const d = dist2d(local, server);
  if (d > ignoreBelow && d < snapAbove) return 'walk';
  if (d > snapAbove) return 'snap';
  return 'none';
}

// Periodic count trigger: the count only moves when an interval has elapsed.
class PeriodicCount {
  private last = 0;
  constructor(private readonly interval: number, start: number) { this.last = start; }
  tick(now: number, count: number): number {
    if (now - this.last >= this.interval) { this.last = now; return count + 1; }
    return count;
  }
}

// Position report: send only when the count changed (plus once on arrival).
class PositionReporter {
  private sentCount = 0;
  private readonly timer: PeriodicCount;
  private count = 0;
  constructor(now: number, intervalSec: number, private readonly send: (p: Vec2) => void) {
    this.timer = new PeriodicCount(intervalSec, now);
  }
  step(now: number, pos: Vec2): void {
    this.count = this.timer.tick(now, this.count);
    if (this.count !== this.sentCount) { this.sentCount = this.count; this.send(pos); }
  }
  arrived(pos: Vec2): void { this.send(pos); }
}

// Socket thread -> main thread hand-off: producers enqueue, the frame drains everything.
class MainQueue {
  private q: Array<() => void> = [];
  enqueue(fn: () => void): void { this.q.push(fn); }
  drain(): void { const batch = this.q; this.q = []; for (const fn of batch) fn(); }
}

// Walk starts slow, switches to run after N timer counts.
const gaitSpeed = (count: number, walk: number, run: number, walkMaxCount: number): number =>
  count <= walkMaxCount ? walk : run;
export { classify, PositionReporter, MainQueue, gaitSpeed }
