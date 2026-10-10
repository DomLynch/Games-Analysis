// Licence: copyleft (AAEmu LICENSE.GPL is GPL-3.0; README "Licensing information" header is LGPL-3.0).
// clean-room: written from the described mechanism, not a translation of the donor lines.
// Weights are in donor units: 10,000,000 = 100 percent.
const FULL = 10_000_000;

interface LootEntry {
  itemId: number;
  weight: number;      // item chance or pick weight (donor drop_rate)
  min: number;         // inclusive amount range
  max: number;
  always: boolean;     // guaranteed when it sits in the independent list
}

interface LootGroup {
  chance: number;      // group chance in donor units (donor loot_groups.drop_rate)
  entries: LootEntry[]; // at most one entry is picked when the group triggers
}

interface LootPack {
  independent: LootEntry[]; // each rolls on its own (donor group 0)
  groups: LootGroup[];      // each group rolls once, then picks one entry
}

interface Drop { itemId: number; count: number; }

// luck: player drop multiplier times server loot rate (1 = no bonus).
function rollPack(pack: LootPack, luck: number, rnd: () => number): Drop[] {
  const drops: Drop[] = [];
  const amount = (e: LootEntry): number => e.min + Math.floor(rnd() * (e.max - e.min + 1));

  for (const e of pack.independent) {
    const chance = Math.min(1, (e.weight / FULL) * luck);
    if (e.always || rnd() < chance) drops.push({ itemId: e.itemId, count: amount(e) });
  }

  for (const g of pack.groups) {
    const groupChance = Math.min(1, (g.chance / FULL) * luck);
    if (rnd() >= groupChance) continue;               // one roll per group
    const total = g.entries.reduce((sum, e) => sum + e.weight, 0);
    if (total <= 0) continue;
    let roll = rnd() * total;                          // pick by weight; luck does not touch the pick
    for (const e of g.entries) {
      if (roll < e.weight) {
        drops.push({ itemId: e.itemId, count: amount(e) });
        break;
      }
      roll -= e.weight;
    }
  }
  return drops;
}

export {};
