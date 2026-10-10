// Donor licence: GPL-2.0-or-later (SPDX header in Interface.cpp). Clean-room sketch of the mechanism, not a translation.
// clean-room
export type Rng = (min: number, max: number) => number; // inclusive integers, like RAND(min, max)

export interface Table { name: string; rows: string[]; weightOdds: boolean; }

export interface Drop { item: string; count: number; }

const TIERS = "lmrvvvvv"; // tier letters: L -> M -> R -> V, V stays V

// donor Roll(dice, size, add): add plus the sum of `dice` draws of rng(1, size)
function roll(rng: Rng, dice: number, size: number, add: number): number {
  let total = add;
  for (let i = 0; i < dice; i++) total += rng(1, size);
  return total;
}

// weightOdds rows: 2d((n+1)/2) - 2 (a peaked index); otherwise uniform 0..n-1
function pickIndex(t: Table, rng: Rng): number {
  const n = t.rows.length;
  return t.weightOdds ? roll(rng, 2, Math.floor((n + 1) / 2), -2) : roll(rng, 1, n, -1);
}

// "table_X" with a tier letter X advances one tier; returns null when the name has no tier suffix
function upgradeName(name: string): string | null {
  if (name.length < 3 || name[name.length - 2] !== "_") return null;
  const i = TIERS.indexOf(name[name.length - 1]);
  if (i < 0) return null;
  return name.slice(0, -1) + TIERS[Math.min(i + 1, TIERS.length - 1)];
}

// Resolves one entry. A ref is a table name, an item id, "N" (gold), "item*N" (stack), "no_drop" or "UP".
export function resolveEntry(start: string, tables: Map<string, Table>, items: Set<string>,
                             rng: Rng): Drop | null {
  const MAX_PASSES = 10;
  let ref = start;
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const t = tables.get(ref);
    if (t === undefined) {
      return items.has(ref) ? { item: ref, count: 1 } : null;
    }
    let picked = t.rows[pickIndex(t, rng)];
    const up = upgradeName(ref);
    if (picked === "UP" && up !== null) {
      const next = tables.get(up);
      if (next === undefined) return null; // donor: RtRows.at() would throw here
      ref = up;
      picked = next.rows[pickIndex(next, rng)];
    }
    const star = picked.indexOf("*");
    if (star >= 0) {
      const sides = Number(picked.slice(star + 1));
      ref = picked.slice(0, star);
      const count = rng(1, sides); // stack count, inclusive
      const t2 = tables.get(ref);
      if (t2 === undefined && items.has(ref)) return { item: ref, count };
      continue;
    }
    if (/^[0-9]+$/.test(picked)) return { item: "gold", count: Number(picked) };
    if (picked === "no_drop") return null;
    ref = picked;
  }
  return null; // donor logs "Loop detected" and gives up
}
export {};
