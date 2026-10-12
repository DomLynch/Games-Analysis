// Licence of donor: BSD-3-Clause (LICENSE). This is a clean-room sketch of the mechanism, written from the described order of steps, not a translation.
// Frankendom target (proposed): origins/server/net-intake.ts. Donor defects fixed here: expiry sweep skips no entries; runs below 1 still terminates.

// 1. Command dedup: the server applies a client command at most once per id inside ttlMs.
export class DedupWindow {
  private expiry = new Map<string, number>();

  constructor(private readonly ttlMs: number = 15_000) {}

  // true = unseen id, apply it; false = seen inside the window, drop it.
  accept(id: string, now: number): boolean {
    this.sweep(now);
    if (this.expiry.has(id)) return false;
    this.expiry.set(id, now + this.ttlMs);
    return true;
  }

  // Collects expired ids first, then deletes them, so no neighbour is skipped.
  private sweep(now: number): void {
    const dead: string[] = [];
    for (const [id, exp] of this.expiry) {
      if (exp <= now) dead.push(id);
    }
    for (const id of dead) this.expiry.delete(id);
  }
}

// 2. Repeat sender: the same payload `runs` times, `interval` ms apart, first copy immediate.
// Returns a cancel function. runs is clamped to at least 1 so the timer always stops.
export function repeatSend(send: () => void, interval: number = 150, runs: number = 10): () => void {
  const total = Math.max(1, Math.floor(runs));
  let sent = 0;
  let timer: ReturnType<typeof setInterval> | undefined;

  const stop = (): void => {
    if (timer !== undefined) clearInterval(timer);
    timer = undefined;
  };

  const tick = (): void => {
    send();
    sent += 1;
    if (sent >= total) stop();
  };

  tick();
  if (sent < total) timer = setInterval(tick, interval);
  return stop;
}

// 3. Unreliable send drops when the channel already has bytes queued; reliable sends always queue.
export interface BufferedChannel {
  bufferedAmount(): number;
  send(data: string): void;
}

export type SendResult = 'sent' | 'dropped-buffer';

export function sendState(
  ch: BufferedChannel,
  data: string,
  opts: { reliable: boolean; autoManageBuffering: boolean }
): SendResult {
  const busy = opts.autoManageBuffering && ch.bufferedAmount() > 0;
  if (opts.reliable || !busy) {
    ch.send(data);
    return 'sent';
  }
  return 'dropped-buffer';
}

export {};
