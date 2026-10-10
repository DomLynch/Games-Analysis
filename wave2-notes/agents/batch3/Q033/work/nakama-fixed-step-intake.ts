// Licence: Apache-2.0 (donor). Sketch written from the described mechanism; shape only, not a translation of the donor lines.
// clean-room
export interface Msg {
  sessionId: string;
  payload: string;
}

export interface LoopConfig {
  rate: number;            // ticks per second, donor accepts 1..60
  inputCap: number;        // donor InputQueueSize default 128
  joinDeadlineMs: number;  // donor JoinMarkerDeadlineMs default 15000
  maxEmptySec: number;     // 0 means never stop for being empty
}

export class FixedStepIntake {
  private queue: Msg[] = [];
  dropped = 0;

  constructor(private readonly cap: number) {}

  // Non-blocking intake: when full, the message is dropped and counted.
  push(m: Msg): boolean {
    if (this.queue.length >= this.cap) {
      this.dropped++;
      return false;
    }
    this.queue.push(m);
    return true;
  }

  // Take only what is queued now; anything pushed after this waits for the next tick.
  drain(): Msg[] {
    return this.queue.splice(0, this.queue.length);
  }
}

// Join marker expires at join tick + rate x whole seconds of the deadline (donor integer division).
export function joinExpiryTick(joinTick: number, rate: number, joinDeadlineMs: number): number {
  return joinTick + rate * Math.floor(joinDeadlineMs / 1000);
}

// Expired markers are only swept every 30 seconds of ticks, as in the donor.
export function sweepJoinMarkers(markers: Map<string, number>, tick: number, rate: number): string[] {
  if (tick % (rate * 30) !== 0) return [];
  const expired: string[] = [];
  for (const [sid, expiryTick] of markers) {
    if (expiryTick <= tick) {
      expired.push(sid);
      markers.delete(sid);
    }
  }
  return expired;
}

export function emptyLimitReached(emptyTicks: number, cfg: LoopConfig): boolean {
  return cfg.maxEmptySec > 0 && emptyTicks >= cfg.rate * cfg.maxEmptySec;
}

export {};
