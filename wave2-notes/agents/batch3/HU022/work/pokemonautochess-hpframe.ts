// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export const BAR_WIDTH_PX = 70;
export const INNER_WIDTH_PX = BAR_WIDTH_PX - 2;
export const HP_PER_TICK = 25;   // tunable; donor constant
export const TWEEN_MS = 150;     // tunable; donor constant

export interface FrameInput { maxHp: number; hp: number; shield: number; }

export interface FrameGeometry {
  lifeRatio: number;   // hp fill, 0..1 of the frame
  shieldRatio: number; // shield strip, 0..1 of the frame, drawn after the hp fill
  tickXs: number[];    // px x of each hpPerTick tick inside the inner bar
  totalLife: number;   // frame scale: maxHp, or hp + shield when that overflows it
}

// Pure geometry: recomputed from the engine values on every change, so the frame never holds stale state.
export function frameGeometry(f: FrameInput, hpPerTick: number = HP_PER_TICK): FrameGeometry {
  const hp = Math.max(0, f.hp);
  const shield = Math.max(0, f.shield);
  const totalLife = Math.max(f.maxHp, hp + shield);
  const lifeRatio = hp / totalLife;
  const shieldRatio = shield / totalLife;
  const tickPx = (hpPerTick / totalLife) * INNER_WIDTH_PX;
  // The -0.1 keeps a tick off the far end when totalLife is an exact multiple of hpPerTick.
  const count = Math.floor((totalLife - 0.1) / hpPerTick);
  const tickXs: number[] = [];
  for (let i = 1; i <= count; i++) tickXs.push(i * tickPx);
  return { lifeRatio, shieldRatio, tickXs, totalLife };
}

// Ease-out sine over durationMs. Fraction t is clamped to 0..1.
export function tweenedValue(from: number, to: number, elapsedMs: number, durationMs: number = TWEEN_MS): number {
  const t = Math.min(1, Math.max(0, elapsedMs / durationMs));
  return from + (to - from) * Math.sin((t * Math.PI) / 2);
}

// One live tween per bar field. A new target restarts from the value on screen now,
// so two quick changes never run in parallel and fight each other.
export class AnimatedValue {
  private from: number;
  private to: number;
  private startMs = 0;
  constructor(initial: number) { this.from = initial; this.to = initial; }
  set(target: number, nowMs: number): void {
    this.from = this.valueAt(nowMs);
    this.to = target;
    this.startMs = nowMs;
  }
  valueAt(nowMs: number): number {
    return tweenedValue(this.from, this.to, nowMs - this.startMs);
  }
}

export {};
