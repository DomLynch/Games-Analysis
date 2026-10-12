// Licence: GNU AGPL version 3 (donor, copyleft). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Possession {
  id: string;
  value: number;        // face value of the whole stack
  stackSize: number;
  category: number;     // index into a fixed category order; -1 = not eligible (donor: None)
  wielded: boolean;
  bonded: boolean;
}

const MAX_ITEMS = 14;

// Inclusive integer roll between lo and hi (ACE ThreadSafeRandom.Next semantics).
function randInt(lo: number, hi: number, rand: () => number): number {
  return lo + Math.floor(rand() * (hi - lo + 1));
}

// How many items a death takes. NPK: none up to level 10, then 0-1 up to level 20.
// From level 21 (and for every PK death): level/20 plus 0-2, capped at MAX_ITEMS.
// The Clutch augment (clutch) removes 5 per level, but not for PK deaths.
function itemCount(level: number, isPkDeath: boolean, clutch: number, rand: () => number): number {
  if (!isPkDeath) {
    if (level <= 10) return 0;
    if (level <= 20) return randInt(0, 1, rand);
  }
  const n = Math.min(Math.floor(level / 20) + randInt(0, 2, rand), MAX_ITEMS);
  return isPkDeath ? n : Math.max(0, n - clutch * 5);
}

// Coins: half, above level 5 (integer division).
function coinsDropped(level: number, coins: number): number {
  return level > 5 ? Math.trunc(coins / 2) : 0;
}

// Rank the possessions: sort by value, halve every item after the first of its category
// (not cumulative), add a random -10% .. +10% variance, then re-sort by the adjusted value.
function rankForDeath(items: Possession[], rand: () => number): { id: string; adjusted: number }[] {
  const eligible = items.filter((p) => p.category >= 0 && !p.bonded);
  const rows = eligible.map((p) => ({
    id: p.id,
    category: p.category,
    adjusted: Math.trunc(p.value / Math.max(1, p.stackSize)), // per-unit value of a stack
  }));
  rows.sort((a, b) => b.adjusted - a.adjusted);
  rows.sort((a, b) => a.category - b.category); // stable: keeps value order inside a category
  let prev = -1;
  for (const r of rows) {
    if (r.category !== prev) prev = r.category;
    else r.adjusted = Math.trunc(r.adjusted / 2);
  }
  for (const r of rows) {
    const variance = -0.1 + rand() * 0.2; // half-open [-0.1, 0.1)
    r.adjusted = Math.trunc(r.adjusted + r.adjusted * variance);
  }
  rows.sort((a, b) => b.adjusted - a.adjusted);
  return rows.map((r) => ({ id: r.id, adjusted: r.adjusted }));
}

// Which items drop: count first, then the top of the ranking. Wielded items drop from level 35,
// and for every PK death (the donor's own comment says PK deaths count as over level 35).
// simplified: fixes the donor's unimplemented PK caveat. A PK death skips the low-level branches
// and may drop wielded items, as the donor comment says; the donor code does not do this (its
// wielded test is level >= 35 only, and its count skips the caveat). The sketch omits slippery
// items, loot permissions, the PK respite timer, corpse decay, rare-item rules, and stack splitting
// (it returns ids only). The ranking is the donor's order: category halving, then variance.
function pickDeathItems(
  level: number,
  isPkDeath: boolean,
  clutch: number,
  items: Possession[],
  rand: () => number,
): string[] {
  const canDropWielded = level >= 35 || isPkDeath;
  const eligible = items.filter((p) => canDropWielded || !p.wielded);
  const n = itemCount(level, isPkDeath, clutch, rand);
  return rankForDeath(eligible, rand).slice(0, n).map((r) => r.id);
}

export {};
