// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface BarInput {
  hp: number;        // current health
  shield: number;    // absorb amount stacked on top of hp
  dot: number;       // damage the engine says will still land on this unit
  max: number;       // max HP (HT)
}

export interface BarSegments {
  hpFrac: number;    // green width, fraction of bar width
  totalFrac: number; // white shield segment ends here (hp + shield)
  dotFrac: number;   // darkened segment width
  dotOffset: number; // dot starts here, right-aligned to totalFrac
}

// Each segment is rounded UP to a whole screen pixel (px = barWidth * zoom).
// One denominator, max(hp + shield, max), so an over-full bar is rescaled to fit.
export function barSegments(i: BarInput, barWidth: number, zoom: number): BarSegments {
  const denom = Math.max(i.hp + i.shield, i.max);
  const px = barWidth * zoom;
  const snap = (f: number): number => Math.ceil(f * px) / px;
  const hpFrac = snap(i.hp / denom);
  const totalFrac = snap((i.hp + i.shield) / denom);
  const dotFrac = Math.min(snap(i.dot / denom), totalFrac); // dot cannot leave the bar
  return { hpFrac, totalFrac, dotFrac, dotOffset: totalFrac - dotFrac };
}

// Poison predictor. Uses the same float loop as the tick: each tick deals floor(left / 3) + 1,
// then left drops by 1 while left is above 0. Integer ceil(left) would add one tick for fractional left.
export function poisonIncoming(left: number): number {
  let total = 0;
  for (let t = left; t > 0; t -= 1) total += Math.floor(t / 3) + 1;
  return total;
}

export {};
