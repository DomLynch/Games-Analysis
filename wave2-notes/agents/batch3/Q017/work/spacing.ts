// Licence: MIT (donor: CombatPathingRevolution, max-su-2019). Shape adapted; rewritten, not a line copy.

// Per-enemy spacing data. All numbers are data fields (see sidecar), not constants.
export interface SpacingData {
  optimalRange: number;      // units: weapon optimal range (from the equipped kit)
  maxRange: number;          // units: weapon maximum range
  circleMin: number;         // units: band start; if > 0, optimalRange is added to it
  circleMax: number;         // units: band end; maxRange is always added to it
  circleFloor: number;       // ratio: lowest chance returned out of band
}

export interface FallbackData {
  distMin: number;           // units: retreat distance at fallbackMult 0
  distMax: number;           // units: retreat distance at fallbackMult 1
  waitMin: number;           // s: wait after retreat at fallbackMult 0
  waitMax: number;           // s: wait after retreat at fallbackMult 1
}

// Min + mult x (max - min). The donor does not clamp mult; the range of mult was not read.
function rescale(mult: number, lo: number, hi: number): number {
  return lo + mult * (hi - lo);
}

// Centre distance minus the target's bound radius, tested against the band.
export function inCircleBand(centreDistance: number, targetRadius: number, d: SpacingData): boolean {
  const gap = centreDistance - targetRadius;
  const lo = d.circleMin > 0 ? d.circleMin + d.optimalRange : d.circleMin;
  const hi = d.circleMax + d.maxRange;
  return gap >= lo && gap <= hi;
}

// Chance handed to the engine's circle decision. Out of band it never drops below the floor.
export function circleChance(inBand: boolean, engineChance: number, minChance: number, d: SpacingData): number {
  return inBand ? engineChance : Math.max(d.circleFloor, minChance);
}

// Circle only when in band, then a single roll against the chance.
export function shouldCircle(inBand: boolean, chance: number, roll: number): boolean {
  return inBand && roll <= chance;
}

// Retreat distance: rescaled, never closer than a diameter of the actor.
export function fallbackDistance(fallbackMult: number, f: FallbackData, boundRadius: number): number {
  return Math.max(rescale(fallbackMult, f.distMin, f.distMax), boundRadius * 2);
}

export function fallbackWait(fallbackMult: number, f: FallbackData): number {
  return rescale(fallbackMult, f.waitMin, f.waitMax);
}

// Advance radius from a signed delta: delta <= 0 maps min..mid, delta > 0 maps mid..max. Unclamped.
export function advanceRadius(delta: number, min: number, mid: number, max: number): number {
  return delta <= 0 ? min + (mid - min) * (delta + 1) : mid + (max - mid) * delta;
}

export {};
