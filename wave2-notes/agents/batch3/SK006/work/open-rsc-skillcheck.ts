// Licence: AGPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Units: a chance is a number 0..1. Donor rates are integers out of 256.

export interface Band {
  lowRate: number;      // chance at level 1, out of 256 (donor data)
  highRate: number;     // chance at level 99, out of 256 (donor data)
  requiredLevel: number;
}

// Linear chance by level, 1..99 (donor interp).
export function levelChance(low: number, high: number, level: number): number {
  const value = Math.floor((low * (99 - level)) / 98) + Math.floor((high * (level - 1)) / 98) + 1;
  return Math.min(Math.max(value / 256, 0), 1);
}

// Spell survival. levelDiff = caster level minus spell requirement; focusBonus = gear magic bonus.
const GUARANTEE_TIERS: ReadonlyArray<{ bonus: number; gap: number }> = [
  { bonus: 30, gap: 5 },
  { bonus: 25, gap: 6 },
  { bonus: 20, gap: 7 },
  { bonus: 15, gap: 8 },
  { bonus: 10, gap: 9 },
];

export function castChance(levelDiff: number, focusBonus: number): number {
  for (const t of GUARANTEE_TIERS) {
    if (focusBonus >= t.bonus && levelDiff >= t.gap) return 1;
  }
  if (levelDiff < 0) return 0;
  if (levelDiff >= 10) return 1;
  const n = (levelDiff + 2) * 2; // donor: random(0, n) is nonzero in n of n+1 outcomes
  return n / (n + 1);
}

// Skill check (donor failCalculation; the donor returns true on SUCCESS despite its name).
export function skillCheckChance(levelDiff: number): number {
  if (levelDiff < 0) return 0;
  if (levelDiff >= 20) return 1;
  const n = levelDiff + 1;
  return n / (n + 1);
}

// Competing outcomes (e.g. fish species). Chance that outcome `index` is the one produced.
// Higher requiredLevel bands are checked first; each band the player qualifies for must miss before the next.
export function cascadeChance(bands: Band[], level: number, index: number): number {
  const target = bands[index];
  if (level < target.requiredLevel) return 0;
  const ordered = [...bands].sort((a, b) => b.requiredLevel - a.requiredLevel);
  let rate = 1;
  for (const band of ordered) {
    if (band === target) return rate * levelChance(band.lowRate, band.highRate, level);
    if (level >= band.requiredLevel) rate *= 1 - levelChance(band.lowRate, band.highRate, level);
  }
  return 0;
}

// Donor: a failed cast sets lastSpellCast = now + 20000 (a 20 s lock-out).
export const FAIL_LOCK_MS = 20000;

export {};
