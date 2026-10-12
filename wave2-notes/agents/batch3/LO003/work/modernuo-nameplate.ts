// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

// C# integer division truncates toward zero; match it.
const idiv = (a: number, b: number): number => Math.trunc(a / b);

export const MIN_FAME = 0;
export const MAX_FAME = 15000;
export const MIN_KARMA = -15000;
export const MAX_KARMA = 15000;

// Reputation change for fame or karma. A gain is reduced by 1% of the current value (never below 0);
// a loss is increased by 1% of the current value. For karma the signed 1% pulls the value toward zero
// from both sides. Gains are blocked at the top of the range, losses at the bottom. The result is clamped.
export function applyRep(current: number, offset: number, min: number, max: number): number {
  let o = offset;
  if (o > 0) {
    if (current >= max) return current;
    o = Math.max(o - idiv(current, 100), 0);
  } else if (o < 0) {
    if (current <= min) return current;
    o = Math.min(o - idiv(current, 100), 0);
  }
  return Math.min(Math.max(current + o, min), max);
}

// Band index: the first band whose upper bound is >= value. The last band takes every value above it.
export function bandIndex(value: number, upperBounds: number[]): number {
  for (let i = 0; i < upperBounds.length; i++) {
    if (value <= upperBounds[i] || i === upperBounds.length - 1) return i;
  }
  throw new Error("upperBounds must not be empty");
}

export interface NameplateTable {
  fameUpperBounds: number[];  // ascending; last entry is the catch-all band
  karmaUpperBounds: number[]; // ascending; last entry is the catch-all band
  epithets: string[][];       // epithets[fameBand][karmaBand]; empty string = no prefix
}

// Prefix shown before the name: the two-axis band lookup (rank band x honour band).
export function nameplatePrefix(fame: number, karma: number, t: NameplateTable): string {
  return t.epithets[bandIndex(fame, t.fameUpperBounds)][bandIndex(karma, t.karmaUpperBounds)];
}

// Skill title is shown to others only from a fame threshold; the owner always sees it.
export function showSkillTo(viewerIsOwner: boolean, showFameTitle: boolean, fame: number, fameGate = 5000): boolean {
  return showFameTitle && (viewerIsOwner || fame >= fameGate);
}

// Skill level index from a fixed-point skill value (300 = 30.0, capped at 1200 = 120.0). Index 0..9.
export function skillLevelIndex(fixedPoint: number): number {
  if (fixedPoint < 300) throw new Error("skill below 30.0 has no level");
  return idiv(Math.min(fixedPoint, 1200) - 300, 100);
}

export {};
