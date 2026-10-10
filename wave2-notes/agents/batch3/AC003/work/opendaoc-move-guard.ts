// Licence: GPL-3.0 (donor repo LICENSE). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Sample { x: number; y: number; t: number; tick: number; maxSpeed: number; }

export interface GuardConfig {
  tolerance: number;          // ratio; donor MaxSpeedToleranceFactor 1.15
  tickMs: number;             // one server tick; donor 1000 / GAME_LOOP_TICK_RATE (30)
  latencyBufferMs: number;    // grace after a speed drop and after a forced move; donor LatencyBuffer 750
  violationThreshold: number; // hits in the window before action; donor 6
  violationWindowMs: number;  // donor ViolationValidityDuration 1500
  teleportThreshold: number;  // rollbacks in one window before kick; donor 5
}

export type GuardAction =
  | { kind: "ok" }
  | { kind: "rollback"; to: Sample }
  | { kind: "kick" };

export class MoveGuard {
  private prev?: Sample;
  private cur?: Sample;
  private rollbackTo?: Sample;      // set on the first hit of a window
  private hits: number[] = [];      // hit timestamps, ms
  private rollbacks = 0;
  private pausedUntil = 0;
  private accumulatedPauseMs = 0;
  private dropAt = Number.NEGATIVE_INFINITY;
  private dropFrom = 0;

  constructor(private readonly cfg: GuardConfig) {}

  // Called for every client position report that changed the position.
  record(s: Sample, nowMs: number): void {
    if (nowMs < this.pausedUntil) return;                    // samples are dropped while paused
    if (this.cur && this.cur.maxSpeed > 0 && s.maxSpeed < this.cur.maxSpeed) {
      this.dropAt = nowMs;                                   // remember the speed allowed before the drop
      this.dropFrom = this.cur.maxSpeed;
    }
    if (this.cur && this.cur.tick === s.tick) this.cur = s;  // two reports in one tick: keep the last
    else { this.prev = this.cur; this.cur = s; }
  }

  // Called once per game tick, only when a position changed since the last tick.
  validate(nowMs: number): GuardAction {
    const prev = this.prev, cur = this.cur;
    if (!prev || !cur) return { kind: "ok" };
    const dt = cur.t - prev.t;
    if (dt <= 0) return { kind: "ok" };
    const allowedSpeed = this.allowedSpeed(cur) * this.cfg.tolerance;
    const allowedDist = allowedSpeed * (dt + this.cfg.tickMs) / 1000;
    const dx = cur.x - prev.x, dy = cur.y - prev.y;
    if (dx * dx + dy * dy <= allowedDist * allowedDist) return { kind: "ok" };

    const live = this.pruneHits(cur.t);
    if (live === 0) { this.rollbacks = 0; this.rollbackTo = undefined; this.accumulatedPauseMs = 0; }
    this.hits.push(cur.t);
    if (!this.rollbackTo) this.rollbackTo = prev;            // rollback target = sample before the first hit
    if (this.hits.length < this.cfg.violationThreshold) return { kind: "ok" };
    if (this.rollbacks >= this.cfg.teleportThreshold) return { kind: "kick" };

    const to = this.rollbackTo;
    this.prev = this.cur; this.cur = to;                     // same order as the donor: set, then move
    this.rollbacks++;
    this.onForcedMove(nowMs);                                // the server move clears both samples
    return { kind: "rollback", to };
  }

  // Called when the server itself moves the player (rollback, teleporter, zone change).
  onForcedMove(nowMs: number): void {
    this.prev = undefined; this.cur = undefined;
    const newUntil = nowMs + this.cfg.latencyBufferMs;
    this.accumulatedPauseMs += newUntil - Math.max(this.pausedUntil, nowMs);
    this.pausedUntil = newUntil;
  }

  private allowedSpeed(cur: Sample): number {
    const recentDrop = cur.t - this.dropAt <= this.cfg.latencyBufferMs;
    return recentDrop ? Math.max(this.dropFrom, cur.maxSpeed) : cur.maxSpeed;
  }

  private pruneHits(nowT: number): number {
    while (this.hits.length > 0 && nowT - this.hits[0] > this.cfg.violationWindowMs + this.accumulatedPauseMs) this.hits.shift();
    return this.hits.length;
  }
}
export {}
