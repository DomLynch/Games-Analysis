// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface DropEntry {
  itemId: number;                       // 0 = not an item (chance not scaled by item find)
  chance: number;                       // percent; 0 = fixed drop, once per kill
  qtyMin: number; qtyMax: number;
  qtyPerLevelMin: number; qtyPerLevelMax: number;
  levelMin: number; levelMax: number;   // 0 on either side = no level gate
  flag: string | null;                  // required campaign flag, null = none
  maxDropsLeft: number;                 // -1 = unlimited
}

interface Rng { next(): number; }       // uniform in [0, 1)
interface Drop { itemId: number; qty: number; }

function rollInt(rng: Rng, lo: number, hi: number): number {
  return lo + Math.floor(rng.next() * (hi - lo + 1));
}

function flagOk(e: DropEntry, flags: Set<string>): boolean {
  return e.flag === null || flags.has(e.flag);
}

function levelOk(e: DropEntry, level: number): boolean {
  if (e.levelMin > 0 && e.levelMax > 0) return level >= e.levelMin && level <= e.levelMax;
  return true;
}

function quantity(e: DropEntry, level: number, rng: Rng): number {
  const lo = e.qtyMin + (level - 1) * e.qtyPerLevelMin;
  const hi = e.qtyMax + (level - 1) * e.qtyPerLevelMax;
  return rollInt(rng, lo, hi);
}

// One drop roll over a table. Fixed entries drop and leave the table; then at most one random entry is picked.
// Sketch rule: among entries whose (scaled) chance is at or above the roll, the smallest chance wins, equal chances split uniformly.
function rollTable(table: DropEntry[], rng: Rng, itemFind: number, level: number, flags: Set<string>): Drop[] {
  const out: Drop[] = [];

  for (let i = table.length - 1; i >= 0; i--) {
    const e = table[i];
    if (e.chance !== 0) continue;
    if (flagOk(e, flags)) out.push({ itemId: e.itemId, qty: quantity(e, level, rng) });
    table.splice(i, 1);                 // removed whether or not it dropped
  }

  const roll = rng.next() * 100;
  const scale = (100 + itemFind) / 100;
  let best = Infinity;
  const pool: DropEntry[] = [];
  for (const e of table) {
    if (e.maxDropsLeft === 0) continue; // exhausted entries are excluded before comparison
    const real = e.itemId !== 0 ? e.chance * scale : e.chance;
    if (real < roll) continue;
    if (!flagOk(e, flags) || !levelOk(e, level)) continue;
    if (real < best) { best = real; pool.length = 0; }
    if (real === best) pool.push(e);
  }

  if (pool.length > 0) {
    const pick = pool[Math.floor(rng.next() * pool.length)];
    if (pick.maxDropsLeft > 0) pick.maxDropsLeft -= 1;
    out.push({ itemId: pick.itemId, qty: quantity(pick, level, rng) });
  }
  return out;
}

export {};
