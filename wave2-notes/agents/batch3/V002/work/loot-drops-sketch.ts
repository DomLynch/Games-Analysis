// Licence: AGPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Rng = () => number; // uniform in [0, 1)
type Category = "item" | "magic" | "mundane";

interface CategoryRule {
  chancePct: number; // whole percent 0..100: the kill passes this category when a 1..100 roll is <= chancePct
  minCount: number;  // inclusive
  maxCount: number;  // inclusive
}

interface DropProfile {
  tier: number;
  item: CategoryRule;
  magic: CategoryRule;
  mundane: CategoryRule;
  addonChance: number; // extra roll after a mundane hit, 0..1
}

// Inclusive integer roll: both min and max are reachable.
function rollInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

// Weighted table: one uniform roll, first entry whose running total exceeds it; falls back to the last positive entry.
function rollTable<T>(rng: Rng, table: ReadonlyArray<readonly [T, number]>): T | undefined {
  const r = rng();
  let total = 0;
  for (const [value, weight] of table) {
    total += weight;
    if (r < total) return value;
  }
  for (let i = table.length - 1; i >= 0; i--) {
    if (table[i][1] > 0) return table[i][0];
  }
  return undefined;
}

// One kill: an independent chance roll per category, a count, then a per-drop pick. The mundane addon roll sits inside the mundane branch.
function rollKillLoot(
  p: DropProfile,
  rng: Rng,
  pickDrop: (cat: Category, rng: Rng) => string | undefined,
  pickAddon: (tier: number) => string | undefined,
): string[] {
  const drops: string[] = [];
  const order: Array<[Category, CategoryRule]> = [
    ["item", p.item],
    ["magic", p.magic],
    ["mundane", p.mundane],
  ];
  for (const [cat, rule] of order) {
    if (rollInt(rng, 1, 100) > rule.chancePct) continue;
    const n = rollInt(rng, rule.minCount, rule.maxCount);
    for (let i = 0; i < n; i++) {
      const d = pickDrop(cat, rng);
      if (d !== undefined) drops.push(d);
    }
    if (cat === "mundane" && rng() < p.addonChance) {
      const a = pickAddon(p.tier);
      if (a !== undefined) drops.push(a);
    }
  }
  return drops;
}

// Corpse looting permission, monster corpse case only (player corpses, PK and /permit are not modelled).
interface Corpse {
  killerId: string | null;
  rareGenerated: boolean;
  secondsToRot: number;
  looted: boolean;
}
interface Looter {
  id: string;
  sameFellowshipAsKiller: boolean;
  fellowshipShares: boolean;
}

const HALF_LIFE_S = 180; // the donor's constant is named HalfLife; a monster corpse opens to all inside its last 180 s

function canLoot(c: Corpse, l: Looter): boolean {
  if (c.looted) return true;
  if (c.killerId !== null && c.killerId === l.id) return true;
  if (!c.rareGenerated && c.secondsToRot < HALF_LIFE_S) return true;
  if (!c.rareGenerated && l.sameFellowshipAsKiller && l.fellowshipShares) return true;
  return false;
}

export {};
