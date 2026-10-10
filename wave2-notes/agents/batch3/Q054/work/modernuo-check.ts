// Licence: GNU GPL v3 (donor LICENSE). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Hit { playerId: string | null; damage: number; } // oldest first; null = not a player-owned hit
export interface Right { playerId: string; damage: number; hasRight: boolean; }

// Who may loot. Walk newest first, credit player hits, bump the earliest credited player x1.25,
// then a player has rights when damage >= topDamage / divisor (divisor set by the monster's max HP).
export function lootingRights(hits: Hit[], hitsMax: number): Right[] {
  const rights: Right[] = [];
  let first: Right | null = null;
  for (let i = hits.length - 1; i >= 0; i--) {
    const h = hits[i];
    if (h.playerId === null || h.damage <= 0) continue;
    let r = rights.find((x) => x.playerId === h.playerId);
    if (!r) {
      r = { playerId: h.playerId, damage: 0, hasRight: false };
      rights.push(r);
    }
    r.damage += h.damage;
    first = r; // the last record touched in the newest-first walk
  }
  if (rights.length === 0) return rights;
  if (first !== null) first.damage = Math.trunc(first.damage * 1.25);
  rights.sort((a, b) => b.damage - a.damage);
  const top = rights[0].damage;
  const divisor = hitsMax >= 3000 ? 16 : hitsMax >= 1000 ? 8 : hitsMax >= 200 ? 4 : 2;
  const minDamage = Math.trunc(top / divisor);
  for (const r of rights) r.hasRight = r.damage >= minDamage;
  return rights;
}

// Killer luck in tenths of a percent (out of 10000). Donor: luck to the 1/1.8 power, times 100.
export function luckChance10k(luck: number, capOutsideSE: boolean): number {
  if (luck < 0) return 0;
  const l = capOutsideSE && luck > 1200 ? 1200 : luck;
  return Math.trunc(Math.pow(l, 1 / 1.8) * 100);
}

export interface PackItem { type: string; weight: number; }
export interface PackEntry { chance10k: number; atSpawnTime: boolean; items: PackItem[]; }

// One pack. The luck rescue is tried once per pack, on the first entry that misses.
// Donor order: the entry roll and the rescue run before the spawn/death phase check.
export function generatePack(
  entries: PackEntry[],
  spawning: boolean,
  luck10k: number,
  aos: boolean,
  rand: (n: number) => number,
): string[] {
  const out: string[] = [];
  let rescueLeft = aos;
  for (const e of entries) {
    let add = e.chance10k > rand(10000);
    if (!add && rescueLeft) {
      rescueLeft = false;
      if (luck10k > rand(10000)) add = e.chance10k > rand(10000);
    }
    if (!add) continue;
    if (e.atSpawnTime !== spawning) continue;
    const total = e.items.reduce((s, i) => s + i.weight, 0);
    let r = rand(total);
    for (const i of e.items) {
      if (r < i.weight) {
        out.push(i.type);
        break;
      }
      r -= i.weight;
    }
  }
  return out;
}

// Bonus properties by max props. Index k = weight of k bonus properties; checked from the top down.
const BONUS: Record<number, number[]> = {
  1: [3, 1],
  2: [6, 3, 1],
  3: [10, 6, 3, 1],
  4: [16, 12, 6, 5, 1],
  5: [30, 25, 20, 15, 9, 1],
};

export function bonusProperties(maxProps: number, rand: (n: number) => number): number {
  const w = BONUS[maxProps];
  if (w === undefined) return 0; // donor has no case for 0 or above 5; not read further
  const total = w.reduce((s, x) => s + x, 0);
  let r = rand(total);
  for (let k = w.length - 1; k >= 1; k--) {
    if (r < w[k]) return k;
    r -= w[k];
  }
  return 0;
}

// Property count for one AOS item: bonus roll, one luck roll may add one, count is 1 + bonus capped at max.
export function propertyCount(maxProps: number, luck10k: number, rand: (n: number) => number): number {
  let bonus = bonusProperties(maxProps, rand);
  if (bonus < maxProps && luck10k > rand(10000)) bonus++;
  return Math.min(1 + bonus, maxProps);
}

export {}
