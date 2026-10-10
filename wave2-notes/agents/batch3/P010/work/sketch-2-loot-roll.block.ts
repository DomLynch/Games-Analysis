// Licence: GPL-2.0 (donor, LICENSE file). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface DropEntry {
  id: string;
  chance: number;        // percent, 0-100. 0 = equal-chance pool. >= 100 = always drops.
  equippable: boolean;
  quest: boolean;        // quest entries never chain into a second group roll
}

interface DropGroup { explicit: DropEntry[]; equal: DropEntry[]; }

type Rng = () => number; // returns a value in [0, 100)

// Per-loot cap: an equippable item drops once, any other item up to 3 times.
function underCap(e: DropEntry, have: Map<string, number>): boolean {
  return (have.get(e.id) ?? 0) < (e.equippable ? 1 : 3);
}

// One roll for a group. Explicit chances share one 0-100 roll, cumulative in list order.
// If that roll misses them all, one equal-chance entry is picked uniformly. No equal entries: nothing drops.
function rollGroupOnce(group: DropGroup, have: Map<string, number>, rng: Rng): DropEntry | null {
  let r = rng();
  for (const e of group.explicit.filter((x) => underCap(x, have))) { // filtered entries are removed, the roll is not rescaled
    if (e.chance >= 100) return e;
    r -= e.chance;
    if (r < 0) return e;
  }
  const equal = group.equal.filter((x) => underCap(x, have));
  if (equal.length === 0) return null;
  return equal[Math.floor((rng() / 100) * equal.length)];
}

// Non-group entry: its own roll. The quality rate scales the chance; guaranteed (>= 100) entries skip it.
function rollIndependent(e: DropEntry, qualityRate: number, rng: Rng): boolean {
  if (e.chance >= 100) return true;
  return e.chance * qualityRate > rng();
}

// Top-level group with an amount: roll, and on each hit roll again until `amount` hits.
// A miss ends the chain. The first roll always runs, even when amount is 0.
function processGroup(group: DropGroup, have: Map<string, number>, amount: number, rng: Rng): string[] {
  const drops: string[] = [];
  let left = amount;
  for (;;) {
    const e = rollGroupOnce(group, have, rng);
    if (e === null) break;
    drops.push(e.id);
    have.set(e.id, (have.get(e.id) ?? 0) + 1);
    if (left <= 1 || e.quest) break;
    left -= 1;
  }
  return drops;
}
