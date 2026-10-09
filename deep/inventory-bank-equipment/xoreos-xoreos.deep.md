# xoreos-xoreos (inventory-bank-equipment, cell 9)

Donor: /mnt/frankendom-donors/xoreos-xoreos/src/engines/nwn2/inventory.cpp | Licence: GPL-3.0-or-later per inventory.cpp header | C++ | symbol Inventory::insertItem / getItemInSlot / load

## 1. Mechanism
- Donor: xoreos NWN2 creature/object inventory. Two stores: a general bag (inventoryItems, a vector indexed by slot, nullptr = empty) and equipped items (equippedItems, indexed by equipment slot).
- Input: a GFF3 inventory struct, or a blueprint name plus stack size and tag (createItem).
- insertItem (135-153) takes an item and a requested slot index (default 0, inventory.h line 61). A null item returns. If the index is inside the vector and occupied it takes the first empty index, else the end; then the vector is resized to slot+1 if needed, so a requested index past the end is honoured and leaves nullptr gaps.
- load (234-268) reads the general list by each item's Repos_Index, then reads equipped items by the struct id, which is a bit flag. A bit flag maps to an equipment slot (getSlotFromBitFlag, 171-232: each flag is 1 shifted by the slot enum value, 18 named slots, a switch, throw on anything else). A slot below kInventorySlotMax that is empty takes the item (260-261); otherwise the item goes to insertItem with the default index (264). The equipped list is only read when present (creature only, 245-246).
- Output: the two vectors and their pointers. No events fire and no tick runs; this is load-time and on-demand state.
- getItemInSlot (121-123) is a bounds-checked read of the equipped array (slot < kInventorySlotMax, else nullptr).
- createItem (125-133) returns nullptr for an empty blueprint or zero stack size, else news an Item and inserts it at the default index.

## 2. Key functions
- Inventory::insertItem | /mnt/frankendom-donors/xoreos-xoreos/src/engines/nwn2/inventory.cpp | 135-153 | places the item at the requested index, else the first empty index, else appends.
- Inventory::load | /mnt/frankendom-donors/xoreos-xoreos/src/engines/nwn2/inventory.cpp | 234-268 | restores the bag by Repos_Index and the equipped slots by bit flag, with overflow to the bag.
- Inventory::getSlotFromBitFlag | /mnt/frankendom-donors/xoreos-xoreos/src/engines/nwn2/inventory.cpp | 171-232 | maps the equip-slot bit flag (from the base-item table) to the slot enum, and throws on an unknown flag.
- Inventory::createItem | /mnt/frankendom-donors/xoreos-xoreos/src/engines/nwn2/inventory.cpp | 125-133 | builds an item from a blueprint and stack size (null on empty blueprint or zero stack), then inserts it.
- Inventory::getItemInSlot | /mnt/frankendom-donors/xoreos-xoreos/src/engines/nwn2/inventory.cpp | 121-123 | returns the equipped item for a slot or nullptr.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Requested index honoured if free, else first free, else append | Default slot index 0 (theirs, header default) |
| Equip-slot bit flags map to a fixed slot enum; unknown flag is an error | 18 slots: head, chest, boots, arms, right hand, left hand, cloak, left ring, right ring, neck, belt, arrows, bullets, bolts, creature weapon L/R/B, creature armour (theirs, inventory.cpp 173-190) |
| Overflow of an equipped item into the general bag | Equip capacity kInventorySlotMax (theirs; the last enumerator at types.h:253, one past the 18 named slots at 235-252) |

## 4. TypeScript sketch
simplified: the donor maps flags with an explicit 18-case switch and throws on any other value (the sketch accepts any single bit); the slot-below-max bounds check, the bag list read by Repos_Index and the GFF reads are omitted; equipped slots here are a Map, not a fixed-size vector.
```ts
// Licence: GPL-3.0-or-later | clean-room: written from the mechanism, no donor lines.
// Bag placement: a requested index is used if free; otherwise the first free index; otherwise append.
// Equip load: a bit-flag slot is filled if free, else the item falls back to the bag.
type Bag = (string | null)[];

function insertItem(bag: Bag, item: string, want = 0): number {
  const max = bag.length;
  let at = want;
  if (at < max && bag[at] !== null) {
    const free = bag.indexOf(null);
    at = free !== -1 ? free : max;
  }
  while (bag.length <= at) bag.push(null);   // grow as needed
  bag[at] = item;
  return at;
}

function bitToSlot(flag: number): number {
  if (flag <= 0 || (flag & (flag - 1)) !== 0) throw new Error("bad slot flag");
  return Math.log2(flag);                    // one bit per slot
}

function loadEquipped(equip: Map<number, string>, bag: Bag,
                      entries: { flag: number; item: string }[]): void {
  for (const e of entries) {
    const slot = bitToSlot(e.flag);
    if (!equip.has(slot)) equip.set(slot, e.item);
    else insertItem(bag, e.item);             // occupied: overflow to the bag
  }
}
```

## 5. Lands in
- Frankendom file: TARGET origins/inventory/inventory.ts (equip mapping also feeds gear dressing; today the stat side is src/gear-stats.ts).
- Parity-checklist row: 15 (gear dressing: wear, loadLoot; equip slots), owner Web for the hero and Characters for creatures; row 21 for the gear tier fields in the catalogue.
- Usable rule: one-character/one-ledger rule (server inventory is the authority; the bag is the ledger).
- Reuse tag: rewrite-from-idea (GPL-3; mechanism only).
- Brief rule served: one-character, one-ledger rule (server inventory is the authority); rules 7-9 n/a

## 6. Gaps and risks
- The bag and equip maps are the donor's only state. There is no weight, stacking rule or ownership check here, so Frankendom's rules (stack counts, tiers, gear stats) are not covered.
- Possible defect (not run): load() checks equippedItems.capacity() before resizing, not size(). If capacity is already at least kInventorySlotMax but size is smaller, the index write at 260-261 is out of range (read at lines 248-250). Do not copy that check.
- Load has no validation that a bag index is unique across the two lists.
- The throw in getSlotFromBitFlag is fatal for unknown flags. Frankendom must not crash on bad saved data.
- Equip-slot table is from the NWN2 base-item table, not the Frankendom gear model.
- GPL-3: mechanism only.
