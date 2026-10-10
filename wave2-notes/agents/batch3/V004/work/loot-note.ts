// Licence: AGPL-3.0 (donor). Clean-room sketch of the mechanism shape, not a translation of the donor lines.
type Rng = () => number; // returns a number in [0, 1)
const SCALE = 10000000;  // the donor writes every chance out of 10,000,000

interface Option { name: string; weight: number; }
interface CollectionEntry { chance: number; groups: Option[]; }  // groups sorted by weight, descending (donor)

// A script chance of 0 means "use the default": 20% plus 0.2% per creature level.
function defaultChance(level: number): number { return 2000000 + level * 20000; }

// First option whose running total reaches the roll; "" when the weights do not reach it (donor).
// requirePositive: the nested pick skips zero weights (donor LootGroupTemplate.h 55); the collection pass does not (729-743).
function pickByWeight(options: Option[], roll: number, requirePositive: boolean): string {
  let total = 0;
  for (const o of options) {
    total += o.weight;
    if (total >= roll && (!requirePositive || o.weight > 0)) return o.name;
  }
  return "";
}

// One pass over a creature's collection: each entry rolls its own chance, then one weighted group.
function rollCollection(entries: CollectionEntry[], rng: Rng): string[] {
  const won: string[] = [];
  for (const e of entries) {
    if (e.chance <= 0) continue;
    if (Math.floor(rng() * SCALE) > e.chance) continue;     // the entry's own roll
    const name = pickByWeight(e.groups, Math.floor(rng() * SCALE), false);
    if (name !== "") won.push(name);
  }
  return won;
}

// Nested groups: keep choosing an entry while the name is a group (depth cap 32), then it must be an item.
interface Table { groups: Map<string, Option[]>; items: Set<string>; }
function resolveItem(t: Table, name: string, rng: Rng): string | null {
  let entry = name;
  for (let depth = 0; depth < 32 && t.groups.has(entry); depth++) {
    entry = pickByWeight(t.groups.get(entry) ?? [], Math.floor(rng() * SCALE), true);
  }
  return t.items.has(entry) ? entry : null;
}

// Credits paid with the drop (donor formula; the random range semantics were not read).
function lootCredits(level: number, rng: Rng): number {
  const max = Math.round(0.03 * level * level + 3 * level + 50);
  const min = Math.round(max * 0.5 + 2 * level);
  return min + Math.floor(rng() * (max - min));
}

// Ownership: the group (or solo player) with the most loot-eligible damage; DOT is excluded by the caller.
interface Hit { attackerId: string; groupId: string | null; lootDamage: number; }
function lootOwner(hits: Hit[]): string | null {
  const sums = new Map<string, number>();
  let best = 0;
  let owner: string | null = null;
  for (const h of hits) {
    const key = h.groupId ?? h.attackerId;
    const sum = (sums.get(key) ?? 0) + h.lootDamage;
    sums.set(key, sum);
    if (sum > best) { best = sum; owner = key; }
  }
  return owner;
}
export {};
