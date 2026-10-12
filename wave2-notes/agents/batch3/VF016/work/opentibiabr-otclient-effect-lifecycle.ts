// Licence: MIT (donor, OTClient LICENSE). Shape adapted; written from the described mechanism, not a translation of the donor lines.
export interface Bounce { minHeight: number; height: number; msPerUnit: number }

export interface FxConfig {
  durationMs: number;      // 0 = no timed end
  loop: number;            // -1 = no loop limit; N = end after N full cycles
  cycleMs: number;         // length of one animation cycle
  bounce?: Bounce;
  hidesOwner: boolean;
  onDetach?: () => void;   // e.g. spawn an end burst
}

// Triangle wave from minHeight up to minHeight + height and back. Period = 2 * height * msPerUnit.
export function bounceOffset(b: Bounce, elapsedMs: number): number {
  const period = 2 * b.height;
  if (period <= 0 || b.msPerUnit <= 0) return b.minHeight; // guard: the donor takes a modulus with no guard
  const units = Math.floor(elapsedMs / b.msPerUnit) % period;
  return b.minHeight + (b.height - Math.abs(b.height - units));
}

export class Fx {
  private readonly startMs: number;
  private readonly endAt: number;
  private lastCycle = 0;
  private loopsLeft: number;
  private detached = false;

  constructor(private readonly cfg: FxConfig, private readonly owner: { hideCount: number }, nowMs: number) {
    this.startMs = nowMs;
    this.endAt = cfg.durationMs > 0 ? nowMs + cfg.durationMs : Infinity;
    this.loopsLeft = cfg.loop;
    if (cfg.hidesOwner) owner.hideCount += 1;   // counted, so two hiding effects do not un-hide early
  }

  // Called once per frame. Returns false once the effect has ended.
  tick(nowMs: number): boolean {
    if (this.detached) return false;
    const cycle = Math.floor((nowMs - this.startMs) / this.cfg.cycleMs);
    if (cycle > this.lastCycle) {
      this.lastCycle = cycle;
      if (this.loopsLeft > 0 && --this.loopsLeft === 0) { this.detach(); return false; }
    }
    if (nowMs >= this.endAt) { this.detach(); return false; }
    return true;
  }

  private detach(): void {
    if (this.detached) return;   // detach exactly once, however many frames ask
    this.detached = true;
    if (this.cfg.hidesOwner) this.owner.hideCount -= 1;
    if (this.cfg.onDetach) this.cfg.onDetach();
  }
}

// Example: a hiding effect of 1500 ms with a burst on detach, then a bounce sample.
const owner = { hideCount: 0 };
let bursts = 0;
const fx = new Fx({ durationMs: 1500, loop: -1, cycleMs: 1000, hidesOwner: true, onDetach: () => { bursts += 1; } }, owner, 0);
fx.tick(1600);
fx.tick(1700);
export const hiddenAfter = owner.hideCount;   // 0
export const burstCount = bursts;             // 1
export const bounceSample = bounceOffset({ minHeight: 20, height: 20, msPerUnit: 20 }, 400); // peak 40
