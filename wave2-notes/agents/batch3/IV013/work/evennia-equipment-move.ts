type Wield = "weapon" | "shield" | "twoHand" | "body" | "head";
type Use = Wield | "pack";

interface Item {
  id: string;
  size: number;   // slots used; 1 by default, 0.25 for a consumable
  use: Use;       // where it goes when wielded or worn
  armour: number; // bonus for body, shield and head items
}

interface Loadout {
  wield: Partial<Record<Wield, Item>>;
  pack: Item[];
}

// Slots used: every held item counts once, wielded or packed.
function slotsUsed(l: Loadout): number {
  let n = 0;
  for (const it of Object.values(l.wield)) if (it) n += it.size;
  for (const it of l.pack) n += it.size;
  return n;
}

// Capacity is a stat plus 10 (donor rule: constitution + 10).
function capacity(con: number): number {
  return con + 10;
}

// Returns a NEW loadout or throws. The caller replaces the stored state only on success.
function move(l: Loadout, item: Item, cap: number): Loadout {
  const wield: Partial<Record<Wield, Item>> = { ...l.wield };
  const pack = l.pack.filter((p) => p.id !== item.id);
  for (const k of Object.keys(wield) as Wield[]) {
    if (wield[k]?.id === item.id) delete wield[k];
  }

  // Fit check on the state WITHOUT the item and BEFORE any occupant is displaced.
  const after: Loadout = { wield: { ...wield }, pack: [...pack] };
  if (slotsUsed(after) + item.size > cap) throw new Error("equipment full");

  const displaced: Item[] = [];
  const evict = (w: Wield): void => {
    const old = wield[w];
    if (old) {
      displaced.push(old);
      delete wield[w];
    }
  };

  switch (item.use) {
    case "twoHand":
      evict("weapon");
      evict("shield");
      evict("twoHand");
      wield.twoHand = item;
      break;
    case "weapon":
    case "shield":
      evict("twoHand");
      evict(item.use);
      wield[item.use] = item;
      break;
    case "body":
    case "head":
      evict(item.use);
      wield[item.use] = item;
      break;
    case "pack":
      pack.push(item);
      break;
  }
  return { wield, pack: [...pack, ...displaced] };
}

export {};
