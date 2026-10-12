// Licence of donor: Apache-2.0 (LICENSE line 3 "Version 2.0, January 2004"). Clean-room sketch of the mechanism, not a translation.
// Frankendom target (proposed): origins/server/fight-tick.ts. Donor points fixed here: join deadline kept in ms (donor floors it to whole seconds); join markers can be swept every tick (donor sweeps every 30 s of ticks); overflow is counted per policy (donor only logs).

export interface Msg { sessionId: string; opCode: number; data: Uint8Array; reliable: boolean; recvMs: number }

// Bounded per-match input queue. offer() never blocks the tick; overflow is dropped by policy and counted.
export class BoundedQueue<T> {
  private items: T[] = [];
  dropped = 0;

  constructor(private readonly cap: number, private readonly policy: 'drop-newest' | 'drop-oldest') {}

  offer(item: T): boolean {
    if (this.items.length < this.cap) {
      this.items.push(item);
      return true;
    }
    this.dropped += 1;
    if (this.policy === 'drop-oldest') {
      this.items.shift();
      this.items.push(item);
    }
    return false;
  }

  // Takes everything queued now. Anything offered after this call waits for the next tick.
  drain(): T[] {
    const out = this.items;
    this.items = [];
    return out;
  }
}

// Join reservations: a session counts only after the room acknowledges the join; otherwise it expires.
export class JoinMarkers {
  private expiry = new Map<string, number>();

  constructor(private readonly tickRate: number, private readonly deadlineMs: number) {}

  // Expiry tick = now + deadline in ticks, rounded up (deadline kept in ms, not whole seconds).
  add(sessionId: string, nowTick: number): void {
    this.expiry.set(sessionId, nowTick + Math.ceil((this.deadlineMs * this.tickRate) / 1000));
  }

  ack(sessionId: string): void {
    this.expiry.delete(sessionId);
  }

  // Sessions whose join was not acknowledged by nowTick. Removed from the table when returned.
  expired(nowTick: number): string[] {
    const out: string[] = [];
    for (const [id, t] of this.expiry) {
      if (t <= nowTick) out.push(id);
    }
    for (const id of out) this.expiry.delete(id);
    return out;
  }
}

export interface TickState { tick: number }

// One fixed tick: drain what is queued, run the step on it once, then advance. Input that arrives during the step waits.
export function runTick(state: TickState, inputs: BoundedQueue<Msg>, step: (tick: number, msgs: Msg[]) => void): void {
  const msgs = inputs.drain();
  step(state.tick, msgs);
  state.tick += 1;
}

export {};
