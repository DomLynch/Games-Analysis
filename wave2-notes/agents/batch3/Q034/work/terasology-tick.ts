// Licence: Apache-2.0 (donor, permissive). Written from the described mechanism (shape adapted, no lines copied).
export const UPDATE_CAP_MS = 1000;      // most game time applied in one frame; a longer stall is clipped
export const MAX_CYCLE_MS = 1000;       // each update cycle is at most this long
export const RESYNC_RATE = 0.1;         // share of the server gap closed each frame
export const NET_TICK_MS = 50;          // state send cadence, on real time
export const NET_TICK_S = 0.05;         // same cadence in seconds, used by the chunk budget

export class FrameClock {
  private last: number;
  private gameTimeMs = 0;
  private desynchMs = 0;               // server time minus local game time
  private dilation = 1;
  private paused = false;

  constructor(nowMs: number) {
    this.last = nowMs;
  }

  // Returns the cycle lengths (seconds) to run this frame. Game time advances per cycle.
  tick(nowMs: number): number[] {
    let delta = Math.trunc((nowMs - this.last) * this.dilation);
    this.last = nowMs;
    if (delta >= UPDATE_CAP_MS) delta = UPDATE_CAP_MS; // clip, do not run the extra time

    // Close part of the server gap before the cycles run.
    if (this.desynchMs !== 0) {
      let diff = Math.ceil(this.desynchMs * RESYNC_RATE);
      if (diff === 0) diff = Math.sign(this.desynchMs);
      this.gameTimeMs += diff;
      this.desynchMs -= diff;
    }

    if (this.paused) return [0];          // one zero-length cycle, as the donor does

    const cycles = Math.trunc((delta - 1) / MAX_CYCLE_MS) + 1; // integer division, as in the donor
    const per = Math.trunc(delta / cycles);
    const out: number[] = [];
    for (let i = 0; i < cycles; i++) {
      this.gameTimeMs += per;
      out.push(per / 1000);
    }
    return out;
  }

  // A net message carries the server's game time: aim the local clock at it.
  updateFromServer(targetMs: number): void {
    this.desynchMs = targetMs - this.gameTimeMs;
  }

  setPaused(p: boolean): void { this.paused = p; }
  setDilation(d: number): void { this.dilation = d; }
  gameTime(): number { return this.gameTimeMs; }
}

// Net tick schedule: due when real time passes the schedule; the schedule moves by one period, not to now.
export class NetTicker {
  private next: number;

  constructor(nowMs: number) {
    this.next = nowMs;
  }

  due(nowMs: number): boolean {
    if (nowMs > this.next) {
      this.next += NET_TICK_MS;
      return true;
    }
    return false;
  }
}

// Chunk budget: accumulate per net tick, send one chunk and pay 1.0 when the budget passes 1.0.
export function chunkBudget(counter: number, rate: number, bandwidthPerClient: number): { counter: number; send: boolean } {
  let c = counter + rate * NET_TICK_S * bandwidthPerClient;
  if (c > 1.0) {
    c -= 1.0;
    return { counter: c, send: true };
  }
  return { counter: c, send: false };
}
export {};
