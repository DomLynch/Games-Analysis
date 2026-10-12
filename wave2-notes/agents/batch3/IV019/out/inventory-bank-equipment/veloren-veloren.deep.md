# veloren-veloren (inventory-bank-equipment, cell 9)

Donor: /mnt/frankendom-donors/veloren-veloren/common/src/comp/inventory/mod.rs | Licence: GNU GPL v3 (LICENSE file text, "Version 3, 29 June 2007"; mod.rs has no per-file licence header and no "or later" clause was read) | Rust | symbol Inventory::push_prefer_slot, Inventory::equip, Inventory::pickup_item, Inventory::swap_inventory_loadout

Checked: mod.rs 1-12, 40-70, 120-186, 236-270 (sort), 275-467 (push, push_all, push_all_unique, insert_at, merge_stack_into, insert_or_stack_at, try_equip), 700-812 (has_space_for, can_stack, insert_prefer_slot, insert), 860-1001 (equip, free_after_equip, pickup_item, unequip), 1014-1046 (swap), 1066-1171 (swap_inventory_loadout, can_swap); item/mod.rs 872-890 (stackable kinds, max_amount), 1205-1240 (increase, decrease, set amount), 1360-1380 (inventory item stackable); comp/inventory/slot.rs 79-108 (EquipSlot, ArmorSlot); loadout.rs 228-256 (equip slot choice); server/src/events/inventory_manip.rs (grep lines 257, 709, 823 only); server/Cargo.toml line 22. Not read: remove_item_amount, take, take_amount, move_overflow_item (571-589), free_after_swap, loadout.swap, persistence functions (including the code that fills the overflow list), the recipe book, the test files, and the client side (not checked: client/Cargo.toml was not inspected). Callers of insert_or_stack_at were not checked. Confidence high for push, stack, pickup, equip, unequip and swap; medium on the server side (only three call sites read). Camera: not a camera cell.

## 1. Mechanism

The inventory is a Vec of built-in slots (36 by default, line 44) plus the slots that equipped items provide (the loadout, whose armour slots include Bag1 to Bag4, slot.rs 104-107). The overflow list holds items that do not fit after a rebalance or a database load, and it is remove-only: items can be taken out but never put in (mod.rs 53-56). The code that fills it was not read; the doc comment states its purpose only.

Stacks. An item is stackable when its kind is consumable, quest, ingredient, utility or throwable (item/mod.rs 874-884). A stackable item's max_amount is u32::MAX; any other item's is 1 (item/mod.rs 889). Modular items are never stackable (1368). The stack fill (push_prefer_slot, mod.rs 275-333) walks every slot in order. For each equal stack it computes the room left (301), fills that stack to max (307) when the remainder is larger than the room, or adds the rest and stops (309-315). Any remainder goes to insert_prefer_slot (323): the preferred slot if it is empty, else the first empty slot of the whole chain (795-812). If nothing is free, the error carries the count that did go in (324). The doc comment warns that an error may already have changed the inventory (338-340).

Push. push (341) is push_prefer_slot with no preferred slot. push_all (347-360) collects what does not fit as Error::Full. push_all_unique (371-385) skips items the inventory already contains (374).

Merge. merge_stack_into (398-423) merges a source stack into a destination only when both are equal and stackable (404), and removes the source only when increase_amount succeeds (416-419; increase_amount fails past max_amount, item/mod.rs 1211-1219). A failed merge leaves both alone. insert_or_stack_at (427-452) is the slot-targeted drop: an equal stackable item adds to the target, an empty target takes it, and a different item in the target is replaced and returned (441-444).

Equip (875-909). The item is taken from its inventory slot (882-892). get_slot_to_equip_into picks the loadout slot (loadout.rs 228-256): the first empty suitable slot; else the first suitable slot holding a different item (definition or durability); else the first suitable slot. The old loadout item goes back into the inventory slot the new item left (894-896). Its contents are unloaded (895) and pushed; a failed push puts the item at the front of the list (897-898), and whatever still does not fit is returned to the caller.

Pickup (pickup_item, 951-967). A stackable item is pushed directly (952-954). A container is refused with no change when free slots are fewer than its populated slots plus one (956-958). Otherwise its contents are drained and pushed one by one (963-965), then the container is pushed (966).

Unequip (973-998). Refused with InventoryFull when free_slots_minus_equipped_item is 0 (979-981). Otherwise the loadout slot is cleared, the item is pushed to the inventory, its contents are unloaded, and leftovers are returned (983-997).

Swap (1018-1042). Inventory-to-loadout goes to swap_inventory_loadout. Loadout-to-loadout swaps the two loadout slots. Overflow-to-inventory moves the overflow item (1032-1036). Overflow items cannot be equipped until moved (1037-1038).

swap_inventory_loadout (1070-1140). can_swap (1146-1170) first: the loadout slot must be able to hold the item (1150), the inventory slot must exist (1156), and the item's amount must be at most 1 (1164-1166). Then: the inventory item is removed (1081), the loadout slot is swapped (1084), the old item's contents are unloaded (1089), the old item goes back into the same inventory slot if that slot still exists (1095-1097), a mainhand removal promotes the offhand weapon into mainhand (1103-1116), and the unloaded items are pushed; leftovers are returned to the caller (1136-1138).

Server use. The server's inventory event handler calls pickup_item (inventory_manip.rs:257), unequip (709) and swap (823). At line 823 the returned leftovers are added to dropped_items, so they are placed on the ground. The server depends on the common crate (server/Cargo.toml:22).

## 2. Key functions

- Inventory::push_prefer_slot, mod.rs:275-333 (stack fill, remainder, reported count)
- Inventory::merge_stack_into and insert_or_stack_at, mod.rs:398-452
- Inventory::equip, mod.rs:875-909 (old item into the slot the new one left)
- Inventory::pickup_item, mod.rs:951-967 (container precheck, then drain and push)
- Inventory::unequip, mod.rs:973-998 (refused when no slot can receive)
- Inventory::swap_inventory_loadout and can_swap, mod.rs:1070-1170
- get_slot_to_equip_into, loadout.rs:228-256 (ring and slot choice)

## 3. Numbers vs mechanism

- Built-in inventory slots: 36 (mod.rs:44). Count, engine constant in this donor.
- Stack max: u32::MAX (item/mod.rs:889), effectively unbounded. Non-stackable max: 1. Count of items per stack has no game cap in this donor.
- Loadout armour slots include Ring1, Ring2 (slot.rs:97-98) and Bag1 to Bag4 (slot.rs:104-107). Bags add inventory slots (see free_slots_minus_equipped_item, not read).
- Equipped amount limit: 1 per loadout slot (mod.rs:1164-1166; doc at 871).
- Pickup container check: free slots must be at least populated slots plus 1 (mod.rs:956).
- Pickup stack check: none beyond push (952-954).

The numbers are slot counts and one cap (u32::MAX). The donor has no balance numbers in this file.

## 4. TypeScript sketch

simplified: keeps Veloren's order: (1) a partial stack fill is kept and reported as `inserted`, (2) a container pickup checks free slots before any change, (3) equip puts the old item back in the slot the new one left, (4) unequip is refused when no slot could receive the item, (5) a ring picks an empty slot first, then a different item, then an identical one. Overflow is remove-only. Omits: the offhand/mainhand promotion rule, durability-aware equality beyond defId plus durability (the donor's PartialEq was not read in full), sort orders, persistence, recipe book, modular (non-stackable) items, and the bag-slot count formula (free_slots_minus_equipped_item, not read; the sketch uses plain free slots). `shrinkSlots` models the overflow purpose stated at mod.rs:53-56; the donor's own fill code was not read.

```ts
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
```

## 5. Lands in

Target: origins/server/inventory-ledger.ts (proposed new file; not in src/fight). Parity row 18 (loot roll and XP award): pickup and swap are the server-side ownership step for a rolled drop, and leftovers are the drop that row 18 must not lose.

## 6. Gaps and risks

Defects or risks in the donor (idea kept; fix noted):
1. Partial fill can leave a half-changed inventory. push_prefer_slot fills stacks before it knows a slot is free (mod.rs 338-340 warns of this). fix: plan first (count what fits in stacks and free slots), then commit the plan in one step; the sketch still mutates stacks first, as the donor does, so Frankendom must not copy that order.
2. Unbounded stacks. max_amount is u32::MAX for every stackable kind (item/mod.rs:889). fix: a per-item cap as zone or catalogue data.
3. Two donors disagree on a drop onto an occupied slot. Here insert_or_stack_at replaces and returns the old item (441-444); the ScummVM donor refuses and returns it to its source. fix: Frankendom picks one rule (refuse-and-return keeps the ledger simplest) and writes it in the catalogue spec.
4. Leftovers are dropped on the ground by the caller (server 823). fix: Frankendom turns leftovers into a server-side ground-loot record, so nothing is lost.

Gaps against Frankendom's rulings:
- One engine: the common crate holds the inventory rules and the server depends on it (server/Cargo.toml:22). That is the one-engine shape Frankendom wants; the client side was not checked.
- Server verified: the server handler calls pickup_item, unequip and swap (inventory_manip.rs:257, 709, 823). Frankendom: the client sends an intent and the server runs the same rule; the client never edits the ledger.
- One ledger: the donor keeps the inventory as one structure with the loadout and overflow in it. Frankendom: one items table; the grid, the equip slots and the overflow are views of it.
- Phone: 36 built-in slots would fit a 6 by 6 grid at 375 px (the donor's layout was not read, so this is arithmetic only). The equip slot pick (loadout.rs 252-255) is a tap target choice; Frankendom should show the chosen slot before the item moves.
- Sort: five sort orders (name, quality, category, tag, amount; mod.rs 244-263). A phone sort by rarity then category is a fold-in for the loot presentation topic.

Best transferable idea: check that every item fits before a container pickup or a bag removal, and keep the items past a shrunk slot count in a remove-only overflow list, so no item is ever lost or half-moved.
Decision (proposed): adapt — the precheck-then-commit rule, the remove-only overflow list and the server calling the same inventory code fit Frankendom's one-engine, server-verified and one-ledger rulings; the unbounded stacks and the partial-fill order are not taken (defects 1 and 2 are fixed in the plan).
Acceptance: on a 375-wide phone, walk over a chest holding a three-piece container with two free slots: the pickup is refused whole, the chest keeps the container, and a "Bag full" line shows once; a server test asserts the ledger is unchanged. Unequipping a bag with no free slot is refused and the bag stays equipped.

Reuse tag: adapt (shape only; GPL v3, clean-room, no line-by-line translation).
Brief rule served: addendum rule 2 (judge the mechanism, not the genre) and the 2026-10-10 rule (keep the idea, fix the defect).
