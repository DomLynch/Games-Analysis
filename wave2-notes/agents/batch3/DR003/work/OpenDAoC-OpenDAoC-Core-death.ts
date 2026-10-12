// Licence: GPL-3.0 (donor). Clean-room sketch of the mechanism, not a translation of the donor lines.
// Two-stage PvE death penalty: part is taken at death, the same amount again at release and kept in a grave.
export interface PenaltyCfg {
  maxLevel: number;   // donor 50
  flatFrom: number;   // donor 40: levels at or above this use the flat base
}

// Base loss in per-mille of the level's XP span. Donor: maxLevel - level, or maxLevel - flatFrom from flatFrom up.
export function basePermille(level: number, c: PenaltyCfg): number {
  return c.maxLevel - Math.min(level, c.flatFrom);
}

// Share of the base by PvE deaths already counted this level. Donor: integer /3, then *2/3, then full.
export function shareOfBase(base: number, deathsBefore: number): number {
  if (deathsBefore === 0) return Math.trunc(base / 3);
  if (deathsBefore === 1) return Math.trunc((base * 2) / 3);
  return base;
}

export interface PveDeathPenalty {
  stage1Xp: number;   // taken at death
  stage2Xp: number;   // taken at release and put into the grave
  conLoss: number;    // 1 to 3, by death count
}

export function pveDeath(level: number, levelSpanXp: number, deathsBefore: number, c: PenaltyCfg): PveDeathPenalty {
  const amount = Math.trunc((levelSpanXp * shareOfBase(basePermille(level, c), deathsBefore)) / 1000);
  const deathsNow = deathsBefore + 1;
  // Fix: no XP rate or XP item bonus on the loss; the donor scales stage one only.
  return { stage1Xp: amount, stage2Xp: amount, conLoss: Math.min(3, Math.max(1, deathsNow)) };
}

export interface Grave {
  xp: number;         // unclaimed XP held by the grave
  createdAtMs: number;
}

// Donor: one grave per character, and a new death overwrites an unclaimed grave.
// Fix: the XP accumulates, so an unclaimed grave is never silently emptied.
export function placeGrave(prev: Grave | undefined, xp: number, now: number): Grave {
  return { xp: (prev?.xp ?? 0) + xp, createdAtMs: now };
}

// Praying at the grave (donor: 5 s channel, must be near and still) returns the stored XP unscaled.
export function claimGrave(g: Grave): { xpBack: number; cleared: Grave } {
  return { xpBack: g.xp, cleared: { xp: 0, createdAtMs: g.createdAtMs } };
}

export {};
