// Licence of donor: MIT (max-su-2019, 2022). Shape adapted from the described mechanism (three-point dial, melee band with chance floor, payload parse); not a line translation.

export interface Dial3 { min: number; mid: number; max: number } // row data: three points, must be ordered min <= mid <= max

export interface MeleeTactics {
  advanceInner: Dial3;
  advanceOuter: Dial3;
  circleDistMin: number;      // row field, game units from target edge
  circleDistMax: number;
  circleAngleMin: number;     // degrees
  circleAngleMax: number;
  backoffMinDistMult: number; // ratio
  backoffChance: number;      // 0..1
  fallbackDistMin: number;
  fallbackDistMax: number;
  fallbackWaitMin: number;    // seconds
  fallbackWaitMax: number;
  melee: boolean;             // derived from the row's weapon class, not an inventory scan
}

// Engine constant: an out-of-band circle chance is never zero (the donor's anti-stuck rule).
export const CIRCLE_CHANCE_FLOOR = 0.1;

// Three-point dial. axis is -1 (offensive, min) .. 0 (mid) .. +1 (defensive, max).
// FIX: the donor does not clamp the axis; out-of-range values extrapolate.
export function dialValue(axis: number, d: Dial3): number {
  const a = Math.max(-1, Math.min(1, axis));
  return a <= 0 ? d.min + (d.mid - d.min) * (a + 1) : d.mid + (d.max - d.mid) * a;
}

// Linear rescale by a combat-style multiplier in 0..1.
export function rescaleLinear(mult: number, min: number, max: number): number {
  return min + mult * (max - min);
}

// Circle band: distance from the target edge, between min and max plus weapon ranges.
// The optimal range is added to the minimum only when the minimum is positive (donor rule).
export function inCircleBand(
  centreDist: number, targetBoundRadius: number, t: MeleeTactics,
  optimalRange: number, maxRange: number,
): boolean {
  if (!t.melee) return false; // Frankendom gate (donor gates only the angle/view-cone hooks, not the band)
  const d = centreDist - targetBoundRadius;
  const lo = t.circleDistMin > 0 ? t.circleDistMin + optimalRange : t.circleDistMin;
  const hi = t.circleDistMax + maxRange;
  return d >= lo && d <= hi;
}

// Circle chance: the game's chance inside the band, otherwise at least the floor (never zero).
export function circleChance(inBand: boolean, gameChance: number, minChance: number): number {
  return inBand ? gameChance : Math.max(CIRCLE_CHANCE_FLOOR, minChance);
}

// Payload parse: "Verb|a|b|..." . FIX: empty fields are dropped as in the donor, but an empty
// payload is rejected before tokens[0] is read, and every argument is parsed before any flag is set.
export function parsePayload(payload: string, argCount: number): { verb: string; args: number[] } | null {
  const tokens = payload.split('|').filter((t) => t.length > 0);
  if (tokens.length === 0) return null;
  const args = tokens.slice(1).map(Number);
  if (args.length !== argCount || args.some((n) => !Number.isFinite(n))) return null;
  return { verb: tokens[0], args };
}

export {};
