// Licence: MIT (donor LICENSE line 1). Clean-room shape of the donor mechanism, not a line translation.
type Pos = { x: number; y: number };
const samePos = (a: Pos, b: Pos): boolean => a.x === b.x && a.y === b.y;

// Step time for one tile: 1000 * ground speed / creature speed (integer ms), rounded UP to whole server beats.
export function stepDurationMs(groundSpeed: number, speed: number, beatMs: number): number {
  const ground = groundSpeed === 0 ? 150 : groundSpeed; // fallback when a tile carries no ground speed
  const raw = Math.floor((1000 * ground) / speed);
  return Math.floor((raw + beatMs - 1) / beatMs) * beatMs;
}

// Client-side prediction of the local player's steps, reconciled by the server.
export class PredictedWalk {
  private queue: Pos[] = [];   // predicted steps not yet confirmed by the server
  private lockUntil = 0;       // no prediction and no new step while locked
  private stepEndsAt = 0;      // when the current predicted step is due to finish
  private confirmed: Pos;      // last server-confirmed position

  constructor(start: Pos) {
    this.confirmed = start;
  }

  // Where the player is drawn: the end of the queue, or the confirmed position when nothing is predicted.
  shown(): Pos {
    return this.queue.length > 0 ? this.queue[this.queue.length - 1] : this.confirmed;
  }

  lock(now: number, ms: number): void {
    this.lockUntil = Math.max(this.lockUntil, now + ms); // a lock can only be extended
  }

  // Order of checks: lock, then queue cap, then the mid-step branch, then step timer.
  // walking: 'none' = no step in progress; 'auto' = auto-walk step (allowed); 'pre' = a predicted step (blocked).
  canPredict(now: number, walkMaxSteps: number, walking: 'none' | 'auto' | 'pre' = 'none'): boolean {
    if (now < this.lockUntil) return false;
    if (this.queue.length > walkMaxSteps) return false;
    if (walking === 'auto') return true;
    if (walking === 'pre') return false;
    return now >= this.stepEndsAt;
  }

  predict(now: number, next: Pos, stepMs: number): void {
    this.queue.push(next);
    this.stepEndsAt = now + stepMs;
  }

  // A server step arrives. If it matches the front of the queue it confirms that prediction;
  // any other server step drops the whole queue.
  onServerStep(to: Pos): void {
    if (this.queue.length > 0 && samePos(this.queue[0], to)) {
      this.queue.shift();
    } else {
      this.queue = [];
    }
    this.confirmed = to;
  }

  // Server refused the move: drop predictions and lock for a short time (donor default 250 ms).
  onServerCancel(now: number, lockMs = 250): void {
    this.queue = [];
    this.lock(now, lockMs);
  }

  // If the server never confirms, the queue is dropped after max(step, ping) + 100 ms, capped at 1000 ms.
  adjustTimeoutMs(stepMs: number, pingMs: number): number {
    return Math.min(Math.max(stepMs, pingMs) + 100, 1000);
  }

  onAdjustTimeout(): void {
    this.queue = [];
  }
}

export {};
