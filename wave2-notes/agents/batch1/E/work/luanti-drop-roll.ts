// Licence: LGPL-2.1-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface DropEntry {
  rarity?: number;             // 1 in N chance; undefined or below 1 always passes the chance step
  requiresWeapon?: string[];   // allowed weapon ids; undefined means any digger/weapon passes
  items: string[];             // the list dropped if this entry hits
}

interface DropTable {
  maxLists?: number;           // stop after this many entries have hit
  entries: DropEntry[];        // processed in order; order decides which entries can still hit under the cap
}

// One kill or dig. The chance step is always rolled, even when the weapon check then fails.
function rollDrops(table: DropTable, weaponId: string | null, rng: () => number = Math.random): string[] {
  const out: string[] = [];
  let hits = 0;
  for (const e of table.entries) {
    const chanceOk = e.rarity === undefined || e.rarity < 1 || Math.floor(rng() * e.rarity) === 0;
    let weaponOk = true;
    if (e.requiresWeapon !== undefined) {
      weaponOk = weaponId !== null && e.requiresWeapon.includes(weaponId);
    }
    if (chanceOk && weaponOk) {
      out.push(...e.items);
      hits += 1;
      if (table.maxLists !== undefined && hits === table.maxLists) break;
    }
  }
  return out;
}

export {}
