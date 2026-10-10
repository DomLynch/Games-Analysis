// Licence: GPL-2.0 option of the donor (dual with the Angband licence). Clean-room sketch of the mechanism; no donor lines copied.
interface Rng {
  below(n: number): number;            // 0..n-1
  between(lo: number, hi: number): number; // lo..hi inclusive
}

interface DropFlags { drop20: boolean; drop40: boolean; drop60: boolean; drop4: boolean; drop3: boolean; drop2: boolean; drop1: boolean; }
interface DropEntry { chance: number; min: number; max: number; kind: string; } // chance is a percent
interface Race { level: number; flags: DropFlags; entries: DropEntry[]; onlyGold: boolean; onlyItem: boolean; }
interface Drop { kind: string; count: number; level: number; }

const DROP4_MAX = 6;
const DROP3_MAX = 4;
const DROP2_MAX = 3;

// Level the drops are made at: the mean of monster level and depth, never below the monster level, capped at 100.
function dropLevel(monLevel: number, depth: number, unique: boolean): number {
  const base = unique ? Math.min(monLevel + 15, monLevel * 2) : monLevel;
  return Math.min(Math.max(Math.floor((base + depth) / 2), base), 100);
}

// Random item-count from the flags, plus each specific entry that passes its percent roll.
function rollCounts(race: Race, rng: Rng): number {
  const f = race.flags;
  let n = 0;
  if (f.drop20 && rng.below(100) < 20) n++;
  if (f.drop40 && rng.below(100) < 40) n++;
  if (f.drop60 && rng.below(100) < 60) n++;
  if (f.drop4) n += rng.between(2, DROP4_MAX);
  if (f.drop3) n += rng.between(2, DROP3_MAX);
  if (f.drop2) n += rng.between(1, DROP2_MAX);
  if (f.drop1) n++;
  return n;
}

// Rolled once at spawn and carried by the monster; nothing is rolled at death.
function rollSpawnDrops(race: Race, depth: number, unique: boolean, rng: Rng): Drop[] {
  const level = dropLevel(race.level, depth, unique);
  const out: Drop[] = [];
  const n = rollCounts(race, rng);
  for (const e of race.entries) {
    if (rng.below(100) >= e.chance) continue;
    out.push({ kind: e.kind, count: rng.below(e.max - e.min) + e.min, level });
  }
  for (let j = 0; j < n; j++) {
    // Gold or item: gold only if items are barred, or 50/50 when both are allowed.
    const gold = !race.onlyItem && (race.onlyGold || rng.below(100) < 50);
    out.push({ kind: gold ? "gold" : "item", count: 1, level });
  }
  return out;
}

// On death every carried drop lands on the monster's cell. No owner is recorded.
function onDeath(carried: Drop[]): Drop[] {
  return carried.slice();
}

export {};
