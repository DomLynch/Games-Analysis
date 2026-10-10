// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type Rng = (n: number) => number; // integer in [0, n)

export interface Drop { item: string; amount: number; }
export interface Dice { count: number; sides: number; bonus: number; }
export interface TableRow { item: string; weight: number; }

export interface PackEntry {
  chance: number;            // 0..10000 (percent x 100); the roll is 0..9999, so 10000 always hits
  spawnTime: boolean;        // true = this entry belongs to the spawn-time pass only
  table: TableRow[];         // one weighted pick per hit
  dice?: Dice;               // stackable amount, if any
}

// Luck to percent-of-hundredths: luck^(1/1.8) x 100, uncapped luck clamped at 1200 (SE uncap omitted).
export function luckToChance(luck: number): number {
  if (luck < 0) return 0;
  return Math.floor(Math.pow(Math.min(luck, 1200), 1 / 1.8) * 100);
}

function rollDice(d: Dice, rng: Rng): number {
  let v = d.bonus;
  for (let i = 0; i < d.count; i++) v += 1 + rng(d.sides); // 1..sides per die
  return v;
}

function pick(table: TableRow[], rng: Rng): TableRow | null {
  const total = table.reduce((s, r) => s + r.weight, 0);
  if (total <= 0) return null;
  let r = rng(total);
  for (const row of table) {
    if (r < row.weight) return row;
    r -= row.weight;
  }
  return null;
}

// One pack roll. The chance roll runs for every entry, including spawn-time entries at death (as in the donor).
// A single luck re-roll is spent on the first missed entry, then the flag is cleared.
export function rollPack(entries: PackEntry[], luckChance: number, spawning: boolean, rng: Rng): Drop[] {
  const out: Drop[] = [];
  let rerollLeft = true;
  for (const e of entries) {
    let hit = e.chance > rng(10000);
    if (!hit && rerollLeft) {
      rerollLeft = false;
      if (luckChance > rng(10000)) hit = e.chance > rng(10000);
    }
    if (!hit || e.spawnTime !== spawning) continue;
    const row = pick(e.table, rng);
    if (row === null) continue;
    const amount = e.dice ? rollDice(e.dice, rng) : 1;
    if (amount <= 0) continue;
    out.push({ item: row.item, amount });
  }
  return out;
}

// Bonus properties: weights[k] = weight of k bonus properties, checked highest first (donor order).
export function bonusPick(weights: number[], rng: Rng): number {
  const total = weights.reduce((s, w) => s + w, 0);
  let r = rng(total);
  for (let k = weights.length - 1; k >= 0; k--) {
    if (r < weights[k]) return k;
    r -= weights[k];
  }
  return 0;
}

// Props on an item = 1 + bonus, where bonus may get one luck bump, capped at maxProps.
export function propsFor(maxProps: number, bonusWeights: number[], luckChance: number, rng: Rng): number {
  let bonus = bonusPick(bonusWeights, rng);
  if (bonus < maxProps && luckChance > rng(10000)) bonus++;
  return Math.min(1 + bonus, maxProps);
}

// Looting rights from damage. hits is ordered OLDEST first (donor walks newest first; simplified).
export interface Hit { attacker: string; isPlayer: boolean; damage: number; }

export function lootRights(hits: Hit[], hitsMax: number): Map<string, boolean> {
  const dmg = new Map<string, number>();
  for (const h of hits) {
    if (h.isPlayer) dmg.set(h.attacker, (dmg.get(h.attacker) ?? 0) + h.damage);
  }
  const firstHitter = hits.find((h) => h.isPlayer)?.attacker;
  if (firstHitter !== undefined) {
    dmg.set(firstHitter, Math.floor((dmg.get(firstHitter) ?? 0) * 1.25));
  }
  const ranked = [...dmg.entries()].sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0) return new Map();
  const top = ranked[0][1];
  const divisor = hitsMax >= 3000 ? 16 : hitsMax >= 1000 ? 8 : hitsMax >= 200 ? 4 : 2;
  const min = Math.floor(top / divisor);
  return new Map(ranked.map(([who, d]): [string, boolean] => [who, d >= min]));
}

export {};
