// Licence: MIT (donor, Copyright (c) 2025 amilich). Shape adapted from the donor's rules; the constants are the donor's values.
const MAX_LEVEL = 5;
const RANGE_PER_LEVEL = 0.2;   // +20% range for each level above 1
const COST_BASE = 2;           // each upgrade costs twice the one before

interface Station {
  level: number;
  baseCost: number;            // catalogue price of this building type
  baseRange: number;
  underConstruction: boolean;
  abandoned: boolean;
}
interface Ledger { money: number; }

// Donor order: max level, construction, abandoned, price, funds; then +1 level and the debit together.
function tryUpgrade(s: Station, ledger: Ledger): number | null {
  if (s.level >= MAX_LEVEL) return null;
  if (s.underConstruction || s.abandoned) return null;
  const price = s.baseCost * Math.pow(COST_BASE, s.level);
  if (ledger.money < price) return null;
  ledger.money -= price;
  s.level += 1;
  return price;
}

function effectiveRange(s: Station): number {
  return s.baseRange * (1 + (s.level - 1) * RANGE_PER_LEVEL);
}

interface Zoned { level: number; age: number; }

// One eligible tick: age goes up by 1, then the level moves at most one step toward the target.
function growOneTick(b: Zoned, landValue: number, coverage: number, demand: number): void {
  b.age += 1;
  const demandBoost = Math.max(0, (demand - 30) / 70) * 0.7;
  const target = Math.min(MAX_LEVEL, Math.max(1, Math.floor(landValue / 24 + coverage / 28 + b.age / 60 + demandBoost)));
  b.level = Math.max(b.level, Math.min(target, b.level + 1));
}

export {};
