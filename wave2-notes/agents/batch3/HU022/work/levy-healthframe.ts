// Licence: MIT (donor LICENSE: "MIT License", Copyright (c) 2026 Levy Street). Shape adapted; written clean here.
// clean-room
export interface ShieldInput { hp: number; maxHp: number; absorbs: number[]; }

export interface ShieldSegment {
  startFrac: number;   // 0..1 left edge of the shield segment
  sizeFrac: number;    // 0..1 width of the shield segment (0 = no shield)
  overshield: boolean; // hp + shield reaches max: segment is right-aligned
}

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

// One pure function: the frame paints a segment, never a second copy of the shield.
export function shieldSegment(input: ShieldInput): ShieldSegment {
  const max = Math.max(1, input.maxHp);
  const hp = Math.max(0, input.hp);
  let total = 0;
  for (const a of input.absorbs) total += Math.max(0, a);
  const hpFrac = clamp01(hp / max);
  const sizeFrac = total > 0 ? clamp01(total / max) : 0;
  const overshield = total > 0 && hp + total >= max;
  const startFrac = overshield ? clamp01(1 - sizeFrac) : hpFrac;
  return { startFrac, sizeFrac, overshield };
}

// CSS transform: the translate is rounded to 3 decimals so the same frame gives the
// same string (write-elision key). Two-function shape even when empty, so no transform flip.
export function shieldTransform(seg: ShieldSegment, scaleX: (f: number) => string = (f) => `scaleX(${f})`): string {
  const size = seg.sizeFrac > 0 ? seg.sizeFrac : 0;
  const pct = Number((seg.startFrac * 100).toFixed(3));
  return `translateX(${pct}%) ${scaleX(size)}`;
}

// Low-health edge vignette: active below 35% hp; opacity eases up as hp falls; pulse speeds up.
export const LOW_HEALTH_THRESHOLD = 0.35;
const MAX_OPACITY = 0.92;
const PULSE_HZ_MIN = 0.6;
const PULSE_HZ_MAX = 2.0;

export interface Vignette { active: boolean; opacity: number; pulseSeconds: number; }

export function lowHealthVignette(hp: number, maxHp: number): Vignette {
  const off: Vignette = { active: false, opacity: 0, pulseSeconds: 0 };
  if (maxHp <= 0 || hp <= 0) return off;
  const frac = hp / maxHp;
  if (frac >= LOW_HEALTH_THRESHOLD) return off;
  const t = clamp01((LOW_HEALTH_THRESHOLD - frac) / LOW_HEALTH_THRESHOLD); // 0 at threshold, 1 at 0 hp
  const pulseHz = PULSE_HZ_MIN + (PULSE_HZ_MAX - PULSE_HZ_MIN) * t;
  return { active: true, opacity: t ** 0.8 * MAX_OPACITY, pulseSeconds: 1 / pulseHz };
}

export {};
