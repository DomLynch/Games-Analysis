// simplified: keeps Veloren's order: (1) a partial stack fill is kept and reported as `inserted`, (2) a container
// pickup checks free slots before any change, (3) equip puts the old item back in the slot the new one left,
// (4) unequip is refused when no slot could receive the item, (5) a ring picks an empty slot first, then a
// different item, then an identical one. Overflow is remove-only.
// Omits: the offhand/mainhand promotion rule, durability-aware PartialEq beyond defId+durability, sort orders,
// persistence, recipe book, modular (non-stackable) items, and the bag-slot count formula (free_slots_minus_equipped_item).
interface Item { defId: string; amount: number; stackable: boolean; durability: number; contents: Item[]; }
interface Inv {
  slots: (Item | null)[];
  loadout: Map<string, Item | null>;
  overflow: Item[]; // remove-only: items here are taken out, never put back in
}

const maxOf = (it: Item): number => (it.stackable ? 2 ** 32 - 1 : 1);
const sameDef = (a: Item, b: Item): boolean => a.defId === b.defId && a.durability === b.durability;
const freeSlots = (inv: Inv): number => inv.slots.filter((s) => s === null).length;

// fill equal stacks first, then one empty slot; returns what could not fit
function push(inv: Inv, item: Item): { leftover: Item | null; inserted: number } {
  const total = item.amount;
  let remaining = total;
  if (item.stackable) {
    for (const s of inv.slots) {
      if (remaining === 0) break;
      if (s !== null && s.stackable && sameDef(s, item)) {
        const put = Math.min(maxOf(s) - s.amount, remaining);
        s.amount += put;
        remaining -= put;
      }
    }
  }
  if (remaining > 0) {
    const idx = inv.slots.findIndex((s) => s === null);
    if (idx >= 0) {
      inv.slots[idx] = { ...item, contents: [], amount: remaining };
      remaining = 0;
    }
  }
  return { leftover: remaining > 0 ? { ...item, amount: remaining } : null, inserted: total - remaining };
}

// a container goes in only if every item it holds, plus itself, has a slot; otherwise nothing changes
function pickupContainer(inv: Inv, item: Item): { ok: boolean; leftover: Item[] } {
  if (freeSlots(inv) < item.contents.length + 1) return { ok: false, leftover: [] };
  const leftover: Item[] = [];
  for (const part of [...item.contents, { ...item, contents: [] }]) {
    const r = push(inv, part);
    if (r.leftover !== null) leftover.push(r.leftover);
  }
  return { ok: true, leftover };
}

// equip: the new item leaves its slot; the old one goes into that same slot; its contents are unloaded
function equipFromSlot(inv: Inv, invSlot: number, equipSlot: string): { ok: boolean; leftover: Item[] } {
  const item = inv.slots[invSlot];
  if (item === null || item === undefined) return { ok: false, leftover: [] };
  inv.slots[invSlot] = null;
  const old = inv.loadout.get(equipSlot) ?? null;
  inv.loadout.set(equipSlot, item);
  const leftover: Item[] = [];
  if (old !== null) {
    inv.slots[invSlot] = { ...old, contents: [] }; // slot was just emptied, so this always fits
    for (const c of old.contents) {
      const r = push(inv, c);
      if (r.leftover !== null) leftover.push(r.leftover);
    }
  }
  return { ok: true, leftover };
}

// unequip: refused when no slot could receive the item (donor checks free_slots_minus_equipped_item)
function unequip(inv: Inv, equipSlot: string): boolean {
  const cur = inv.loadout.get(equipSlot) ?? null;
  if (cur === null || freeSlots(inv) === 0) return false;
  const free = inv.slots.findIndex((s) => s === null);
  inv.slots[free] = { ...cur, contents: [] };
  inv.loadout.set(equipSlot, null);
  return true;
}

// ring choice: first empty suitable slot, else first slot holding a different item, else the first suitable slot
function chooseRingSlot(inv: Inv, suitable: string[], item: Item): string | undefined {
  const empty = suitable.find((s) => (inv.loadout.get(s) ?? null) === null);
  if (empty !== undefined) return empty;
  const differs = suitable.find((s) => {
    const e = inv.loadout.get(s);
    return e === null || e === undefined || !sameDef(e, item);
  });
  return differs !== undefined ? differs : suitable[0];
}

// when a slot count shrinks, the items past the new end are kept in overflow (remove-only), not deleted
function shrinkSlots(inv: Inv, newLen: number): void {
  while (inv.slots.length > newLen) {
    const s = inv.slots.pop();
    if (s !== null && s !== undefined) inv.overflow.push(s);
  }
}

export {};
