// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface GuardCandidate { name: string; aiValue: number; avgStack: number; }

// Zone tier and map tier are -1..1 and 2..4 in the donor. Index 0..4 selects the row.
const VALUE1 = [2500, 1500, 1000, 500, 0];
const VALUE2 = [7500, 7500, 7500, 5000, 5000];
const MULT1 = [0.5, 0.75, 1.0, 1.5, 1.5];
const MULT2 = [0.5, 0.75, 1.0, 1.0, 1.5];
const MIN_GUARDED_VALUE = [6500, 4167, 3000, 1833, 1333];
const MIN_GUARD_STRENGTH = 2000;   // config: minGuardStrength

// Index row for a zone tier and a map tier (zone NONE is handled by the caller).
function tierIndex(zoneTier: number, mapTier: number): number {
  return zoneTier + mapTier - 1;
}

// Guard strength for a treasure pile of this value. Two hinge terms are added, so the slope steepens above value2.
function guardStrength(value: number, idx: number): number {
  const s1 = Math.max(0, (value - VALUE1[idx]) * MULT1[idx]);
  const s2 = Math.max(0, (value - VALUE2[idx]) * MULT2[idx]);
  return Math.trunc(s1) + Math.trunc(s2);
}

// A pile needs a guard only if its zone has guards at all and the pile is above the tier threshold.
function needsGuard(value: number, idx: number, zoneHasGuards: boolean): boolean {
  return zoneHasGuards && value > MIN_GUARDED_VALUE[idx];
}

// Pick one creature type whose average stack is weaker than the strength and whose full stack is stronger than it.
// rng returns a float in [0, 1). Returns null when the strength is below the cutoff.
function pickGuard(strength: number, candidates: GuardCandidate[], rng: () => number,
                   fallback: GuardCandidate): { name: string; amount: number } | null {
  if (strength < MIN_GUARD_STRENGTH) return null;
  const fits = candidates.filter(c => c.avgStack * c.aiValue < strength && strength < c.aiValue * 100);
  if (fits.length === 0) {
    return { name: fallback.name, amount: Math.floor(strength / fallback.aiValue) };   // no jitter on the fallback
  }
  const pick = fits[Math.floor(rng() * fits.length)];
  let amount = Math.floor(strength / pick.aiValue);
  if (amount >= 4) amount = Math.floor(amount * (0.75 + 0.5 * rng()));   // +-25 percent jitter
  return { name: pick.name, amount };
}

// Piles per zone: area in tiles times density, divided by 400.
function pileCount(areaTiles: number, density: number): number {
  return Math.floor((areaTiles * density) / 400);
}

// Minimum distance between piles for the tier. totalDensity includes this tier and the richer ones before it.
function minPileDistance(minValue: number, totalDensity: number): number {
  return Math.max(Math.sqrt(Math.min(minValue, 30000) / 10 / totalDensity), 1);
}

export {};
