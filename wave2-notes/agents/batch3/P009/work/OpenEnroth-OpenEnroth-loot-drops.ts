// Licence: LGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Tier = 1 | 2 | 3 | 4 | 5 | 6;

interface Candidate { id: string; weightByTier: Record<Tier, number>; }

// Cumulative-weight pick: one roll in [1, sum], the first entry whose running total reaches it wins.
function weightedPick<T>(items: T[], weight: (t: T) => number, rnd: (n: number) => number): T | undefined {
  let sum = 0;
  for (const it of items) sum += weight(it);
  if (sum === 0) return undefined;
  const roll = rnd(sum) + 1;
  let run = 0;
  for (const it of items) {
    run += weight(it);
    if (run >= roll) return it;
  }
  return undefined;
}

// Item roll at a tier: pick by per-tier weight from the table (data, not code).
function rollItem(tier: Tier, table: Candidate[], rnd: (n: number) => number): string | undefined {
  return weightedPick(table, (c) => c.weightByTier[tier], rnd)?.id;
}

// Gold by tier. Ranges are data: [base, spread] meaning base + rnd(spread).
const GOLD_BY_TIER: Record<Tier, [number, number]> = {
  1: [50, 51], 2: [100, 101], 3: [200, 301], 4: [500, 501], 5: [1000, 1001], 6: [2000, 3001],
};
function rollGold(tier: Tier, rnd: (n: number) => number): number {
  const [base, spread] = GOLD_BY_TIER[tier];
  return base + rnd(spread);
}

// Monster loot gate: roll 0..99 under the drop percentage, then generate at the monster's tier.
function monsterLootRoll(dropPct: number, tier: Tier | null, table: Candidate[], rnd: (n: number) => number): string | undefined {
  if (tier === null) return undefined;
  if (rnd(100) >= dropPct) return undefined;
  return rollItem(tier, table, rnd);
}

// Equipment enchantment: one roll splits into standard, special, or none.
// Donor order: roll < standard -> standard; roll >= standard + special -> none; otherwise special.
function enchantmentRoute(standardPct: number, specialPct: number, rnd: (n: number) => number): 'standard' | 'special' | 'none' {
  const roll = rnd(100);
  if (roll < standardPct) return 'standard';
  if (roll >= standardPct + specialPct) return 'none';
  return 'special';
}

// Zone difficulty remaps an item tier into a band of real tiers (donor RemapTreasureLevel).
// The band table is data. Inside the band the tier is drawn uniformly here; the donor sampling method was not read.
function remapTier(band: [Tier, Tier], rnd: (n: number) => number): Tier {
  const [lo, hi] = band;
  return (lo + rnd(hi - lo + 1)) as Tier;
}

export {};
