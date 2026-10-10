// Licence: GPL-3.0-or-later (donor engine) and CC-BY-SA 3.0 (donor game data). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Entry = {
  item: string;
  qty: number;          // quantity per drop
  chance: number;       // a band edge, 0-100; 0 = fixed (always added once)
  isItem: boolean;      // item entries are scaled by item find; currency is not
  levelMin: number;     // 0 = no level gate
  levelMax: number;
  maxDrops: number;     // per visit; -1 = unlimited, 0 = spent
};

// One roll: draw a number 0-100, then take the entry set whose edges beat it, keep the tightest edge, and pick one of those.
// Result is at most one entry per roll.
function pickOne(table: Entry[], itemFind: number, level: number, rng: () => number): Entry | null {
  const roll = rng() * 100;
  let best = Infinity;
  let hits: Entry[] = [];
  for (const e of table) {
    if (e.chance === 0 || e.maxDrops === 0) continue; // fixed entries are handled separately
    if (e.levelMin > 0 && e.levelMax > 0 && (level < e.levelMin || level > e.levelMax)) continue;
    const real = e.isItem ? e.chance * (itemFind + 100) / 100 : e.chance;
    if (real < roll) continue; // only edges that beat the roll
    if (real < best) {
      best = real;
      hits = [];
    }
    if (real === best) hits.push(e);
  }
  if (hits.length === 0) return null;
  const pick = hits[Math.floor(rng() * hits.length)];
  if (pick.maxDrops > 0) pick.maxDrops -= 1;
  return pick;
}

// Restock on a visit: the fixed entries are added once, then a count of rolls is drawn between min and max.
// The table is a fresh copy for this visit, so maxDrops resets on every visit.
function restock(table: Entry[], countMin: number, countMax: number, itemFind: number, level: number, rng: () => number): Map<string, number> {
  const visit = table.map((e) => ({ ...e }));
  const out = new Map<string, number>();
  const add = (item: string, qty: number) => out.set(item, (out.get(item) ?? 0) + qty);
  for (const e of visit) if (e.chance === 0) add(e.item, e.qty);
  const rolls = countMin + Math.floor(rng() * (countMax - countMin + 1));
  for (let i = 0; i < rolls; i++) {
    const got = pickOne(visit, itemFind, level, rng);
    if (got) add(got.item, got.qty);
  }
  return out;
}

export {};
