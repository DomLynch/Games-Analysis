// Licence: BSD-3-Clause (donor). Sketch written from the mechanism, not a copy of the donor lines.
export interface Transport {
  bufferedBytes(): number; // bytes queued but not yet on the wire
  send(payload: string): void;
}

export interface Clock {
  now(): number; // ms
  after(ms: number, fn: () => void): void; // one-shot timer
}

const RELIABLE_INTERVAL_MS = 150;
const RELIABLE_RUNS = 10;
const DEDUPE_WINDOW_MS = 15_000;

// Sender: the same envelope (same id) goes out `runs` times, `intervalMs` apart.
// The first copy goes out at once; the receiver drops the copies it has already seen.
export function sendReliable(
  t: Transport,
  clock: Clock,
  eventName: string,
  message: unknown,
  newId: () => string,
  intervalMs: number = RELIABLE_INTERVAL_MS,
  runs: number = RELIABLE_RUNS
): void {
  const payload = JSON.stringify({ eventName, reliable: 1, id: newId(), message });
  t.send(payload);
  for (let k = 1; k < runs; k++) clock.after(k * intervalMs, () => t.send(payload));
}

// Receiver: the first copy of an id is delivered; copies are ignored until the id is 15 s old.
export class ReliableInbox {
  private seen = new Map<string, number>(); // id -> time (ms) after which it may be forgotten

  constructor(private clock: Clock) {}

  accept(id: string, deliver: () => void): boolean {
    const t = this.clock.now();
    for (const [k, expiresAt] of this.seen) {
      if (expiresAt <= t) this.seen.delete(k);
    }
    if (this.seen.has(id)) return false;
    this.seen.set(id, t + DEDUPE_WINDOW_MS);
    deliver();
    return true;
  }
}

// Unreliable send: skipped while the transport still has queued bytes (the caller counts a drop).
// Reliable sends do not go through this gate.
export function sendUnreliable(t: Transport, payload: string): boolean {
  if (t.bufferedBytes() > 0) return false;
  t.send(payload);
  return true;
}
