// Donor licence: MIT (permissive). This is a clean-room re-expression of the mechanism, not a line translation.
// clean-room
export interface DropEntry {
  itemId: number;
  chance: number; // percent, 0-100
  min: number;
  max: number;    // exclusive upper bound, as the donor's Rnd.get(min, max)
}

export interface DropRules {
  maxLimitedDrops: number; // slots for entries with chance < 100 (zone data)
  levelGapMax: number;     // skip the table when killer.level - victim.level exceeds this (engine constant)
  chanceMult: number;      // global chance rate (engine constant)
  amountMult: number;      // global amount rate (engine constant)
}

export interface Drop { itemId: number; count: number; }

// Walks the table in order. Mirrors the donor's ungrouped path:
// eviction check first, then the level-gap filter, then one independent roll, then slot bookkeeping.
export function rollDrops(entries: DropEntry[], killerLevel: number, victimLevel: number,
                          rules: DropRules, rnd: () => number): Drop[] {
  if (rules.maxLimitedDrops < 1) throw new Error("maxLimitedDrops must be >= 1");
  const out: Drop[] = [];
  const kept: Drop[] = [];         // limited drops that hold a slot, oldest first
  let slots = rules.maxLimitedDrops;
  let cached: Drop | null = null;  // last drop pushed out to make room
  for (const e of entries) {
    if (slots === 0 && e.chance < 100 && kept.length > 0) {
      cached = kept.shift() as Drop;
      out.splice(out.indexOf(cached), 1);
      slots = 1;
    }
    if (killerLevel - victimLevel > rules.levelGapMax) continue;
    if (rnd() * 100 >= e.chance * rules.chanceMult) continue;
    const span = e.max - e.min;
    const raw = span > 0 ? e.min + Math.floor(rnd() * span) : e.min;
    const drop: Drop = { itemId: e.itemId, count: Math.trunc(raw * rules.amountMult) };
    out.push(drop);
    if (e.chance < 100) { slots -= 1; kept.push(drop); }
  }
  if (slots > 0 && cached !== null) out.push(cached);
  return out;
}

export interface Dealer { id: string; damage: number; online: boolean; } // per-player totals

// Donor rule as read: the top single dealer gets the drop if online, otherwise the last attacker.
// Strictly greater total replaces the current top, so a tie keeps the earlier dealer.
export function pickRecipient(dealers: Dealer[], lastAttacker: string): string {
  let top: Dealer | null = null;
  for (const d of dealers) {
    if (top === null || d.damage > top.damage) top = d;
  }
  return top !== null && top.online ? top.id : lastAttacker;
}
export {};
