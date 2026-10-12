// Licence: GPL-3.0-or-later (donor, per file header). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const TICK_MS = 8;          // one wheel turn = 8 ms of simulated time
const RING_SIZE = 4096;     // slots per ring (2^12)
const LAYERS = 3;

export interface WheelTimer {
  intervalMs: number;       // already rounded to TICK_MS
  count: number;            // 0 = repeat forever
  index: number;            // runs completed so far
  running: boolean;
  version: number;          // bumped by stop() and by the last run; a tick that changes it cancels the re-arm
  remainderMs: number;      // sub-slot part, promoted down a ring when this slot comes due
  dueMs: number;            // informational: when the timer should fire
  onTick(): void;
}

export function roundToTick(ms: number): number {
  return ms <= 0 ? TICK_MS : Math.ceil(ms / TICK_MS) * TICK_MS;
}

export class TimerWheel {
  private readonly rings: WheelTimer[][][] = [];
  private readonly ringIndex: number[] = new Array<number>(LAYERS).fill(0);
  private lastTurnedMs: number;

  constructor(nowMs: number) {
    this.lastTurnedMs = nowMs;
    for (let i = 0; i < LAYERS; i++) {
      const ring: WheelTimer[][] = [];
      for (let s = 0; s < RING_SIZE; s++) ring.push([]);
      this.rings.push(ring);
    }
  }

  start(t: WheelTimer, delayMs: number): void {
    if (t.running) return;
    t.index = 0;
    t.running = true;
    this.addTimer(t, roundToTick(delayMs));
  }

  stop(t: WheelTimer): void {
    if (!t.running) return;
    t.running = false;      // lazy removal: the entry is skipped when its slot comes due
    t.version++;
  }

  // Catch up on whole turns elapsed since the last call. maxTurns caps the work per call;
  // the rest stays as debt and is paid on later calls (donor: no cap).
  slice(nowMs: number, maxTurns = 64): void {
    let turns = 0;
    while (nowMs - this.lastTurnedMs >= TICK_MS && turns < maxTurns) {
      this.lastTurnedMs += TICK_MS;
      this.turn();
      turns++;
    }
  }

  private turn(): void {
    const due: WheelTimer[][] = [];
    let carry = false;
    for (let i = 0; i < LAYERS; i++) {
      if (i === 0 || carry) {
        let idx = ++this.ringIndex[i];
        carry = idx >= RING_SIZE;
        if (carry) { idx = 0; this.ringIndex[i] = 0; }
        due.push(this.rings[i][idx]);
        this.rings[i][idx] = [];   // detach first: timers added during the run land in a fresh slot
      } else {
        due.push([]);
      }
    }
    for (let i = 0; i < LAYERS; i++) {
      for (const t of due[i]) {
        if (!t.running) continue;
        if (i > 0 && t.remainderMs > 0) this.addTimer(t, t.remainderMs); // promote down
        else this.execute(t);
      }
    }
  }

  private execute(t: WheelTimer): void {
    const finished = t.count !== 0 && t.index + 1 >= t.count;
    if (finished) { t.running = false; t.version++; }
    const version = t.version;
    t.onTick();
    if (t.version !== version || (finished && t.running)) return; // stopped or restarted inside onTick
    if (!finished) this.addTimer(t, t.intervalMs);
    t.index++;
  }

  private addTimer(t: WheelTimer, delayMs: number): void {
    let delay = delayMs;
    let resolution = TICK_MS;                 // ms per slot on this layer: 8, 32768, 2^27
    for (let i = 0; i < LAYERS; i++) {
      const span = resolution * RING_SIZE;    // how far this layer reaches
      const last = i === LAYERS - 1;
      if (delay < span || last) {
        const ringIndex = this.ringIndex[i];
        const remainder = delay % resolution;
        let rem = remainder;
        let slot = Math.floor(delay / resolution) + ringIndex + (remainder > 0 ? 1 : 0);
        if (delay === 0) { slot++; rem = 0; } // a zero delay still waits one turn
        if (slot >= RING_SIZE) {
          slot -= RING_SIZE;
          if (last && slot >= RING_SIZE) slot = Math.max(0, ringIndex - 1); // donor fallback, far future
        }
        t.dueMs = this.lastTurnedMs + delayMs;   // fix: donor sets Next from Delay on every add
        t.remainderMs = rem;
        this.rings[i][slot].push(t);
        return;
      }
      // Turns of this layer until it wraps to slot 0; the rest goes to the next layer.
      delay -= resolution * (RING_SIZE - this.ringIndex[i]);
      resolution *= RING_SIZE;
    }
  }
}

export {};
