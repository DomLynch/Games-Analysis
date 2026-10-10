// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type ItemId = string;

interface Item {
  id: ItemId;
  isSpell: boolean;   // spells are never lootable
  takeable: boolean;  // may another actor take it from the corpse or ground
}

interface Corpse {
  id: string;
  items: Item[];
}

interface DeathOutcome {
  corpse: Corpse | null;  // null when the victim has no body shape
  ground: Item[];         // items placed on the floor, takeable
  held: Item[];           // spells and items with no room: they stay with the victim, not deleted
}

const GROUND_SCATTER_RADIUS = 5; // the donor passes 5 to its spot search (unit not read)

// One pass over the victim's inventory at death. Nothing is deleted.
function settleDeath(
  inventory: Item[],
  hasCorpse: boolean,
  findGroundSpot: (radius: number) => boolean, // true when a free tile was found
): DeathOutcome {
  const corpse: Corpse | null = hasCorpse ? { id: "corpse", items: [] } : null;
  const ground: Item[] = [];
  const held: Item[] = [];
  for (const it of inventory.splice(0)) {
    if (it.isSpell) { held.push(it); continue; }      // spells never go to a corpse or the floor
    if (corpse) { corpse.items.push(it); continue; }  // everything else goes into the corpse
    it.takeable = true;
    if (findGroundSpot(GROUND_SCATTER_RADIUS)) { ground.push(it); } else { held.push(it); }
  }
  if (corpse) {
    for (const it of corpse.items) { it.takeable = true; }
  }
  return { corpse, ground, held };
}

export {};
