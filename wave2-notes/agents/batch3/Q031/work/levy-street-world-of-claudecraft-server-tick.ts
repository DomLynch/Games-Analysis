// Licence: MIT (donor, Levy Street 2026). Sketch written from the described mechanism; not a line translation.
export const TICK_RATE = 20; // sim ticks per second (fixed rule)
export const DT = 1 / TICK_RATE; // seconds per sim tick
const MAX_FRAME_DT = 0.5; // wall-time clamp per timer callback, seconds
const STALE_INPUT_S = 0.75; // silence after which held movement stops applying

export interface SimHost {
  simTime: number;
  tick(): void; // one fixed sim step; advances simTime by DT
}

export interface LoopHooks {
  clearStaleInputs(simTime: number): void;
  meter(nowS: number, ticks: number): void;
  broadcast(ticksRun: number): void;
}

// Accumulator loop: one call per host timer callback. nowS is wall-clock seconds.
export class FixedStepLoop {
  private last: number | null = null;
  private acc = 0;

  constructor(
    private readonly sim: SimHost,
    private readonly hooks: LoopHooks,
  ) {}

  onTimer(nowS: number): number {
    let dt = this.last === null ? 0 : nowS - this.last;
    this.last = nowS;
    if (dt > MAX_FRAME_DT) dt = MAX_FRAME_DT;
    this.acc += dt;
    let ticksRun = 0;
    while (this.acc >= DT) {
      this.hooks.clearStaleInputs(this.sim.simTime);
      this.sim.tick();
      this.acc -= DT;
      ticksRun++;
    }
    this.hooks.meter(nowS, ticksRun);
    this.hooks.broadcast(ticksRun);
    return ticksRun;
  }
}

export interface MobView {
  x: number;
  z: number;
  idle: boolean;
  inCombat: boolean;
  hasOwner: boolean;
  auraCount: number;
}

export interface Vec2 {
  x: number;
  z: number;
}

// True when this mob's AI step can be skipped this tick (idle, far from every player).
export function skipIdleMobTick(mob: MobView, players: readonly Vec2[], radius: number): boolean {
  if (radius <= 0) return false;
  if (mob.hasOwner || !mob.idle || mob.inCombat || mob.auraCount > 0) return false;
  if (players.length === 0) return true;
  const r2 = radius * radius;
  for (const p of players) {
    const dx = p.x - mob.x;
    const dz = p.z - mob.z;
    if (dx * dx + dz * dz <= r2) return false;
  }
  return true;
}

// Achieved tick rate over a sliding window, anchored to wall time.
export class TickRate {
  private anchor: number | null = null;
  private readonly samples: { t: number; n: number }[] = [];

  constructor(
    private readonly windowS = 3,
    private readonly minElapsedS = 1,
  ) {}

  record(nowS: number, ticks: number): void {
    if (this.anchor === null) {
      this.anchor = nowS; // first call only anchors; earlier ticks are not counted
      return;
    }
    this.samples.push({ t: nowS, n: ticks });
    const cut = nowS - this.windowS;
    while (this.samples.length > 0 && this.samples[0].t < cut) this.samples.shift();
  }

  rate(nowS: number): number | null {
    if (this.anchor === null || nowS - this.anchor < this.minElapsedS) return null;
    const start = Math.max(this.anchor, nowS - this.windowS);
    let sum = 0;
    for (const s of this.samples) if (s.t >= start) sum += s.n;
    const elapsed = nowS - start;
    return elapsed > 0 ? sum / elapsed : null;
  }
}

export {};
