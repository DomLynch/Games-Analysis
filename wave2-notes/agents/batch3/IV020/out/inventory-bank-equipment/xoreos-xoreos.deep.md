# xoreos-xoreos (inventory-bank-equipment, cell 9)

Donor: /mnt/frankendom-donors/xoreos-xoreos/src/engines/nwn2/inventory.cpp | Licence: GPL-3.0-or-later (COPYING is GPL version 3; the file header says "version 3 ... or (at your option) any later version") | C++ | symbol Inventory::load, Inventory::insertItem, Inventory::getNextRetrieved

Checked: opened inventory.cpp (all 272 lines), inventory.h (all), item.cpp 184-205 and 255-258 (stack size, max stack, instance load), item.cpp 193-199 (charges TODO), types.h 234-254 (slot enum), script/functions_inventory.cpp 241-245 (getItemInSlot caller), placeable.cpp:50 (placeable Inventory construction), script/function_tables.h:725 (CopyItem). Grepped the nwn2 tree for swap, move, transfer and CopyItem: no item move, swap or merge exists. Not read: creature.cpp equip and unequip paths; the baseitems 2DA data (not in the donor box), so stack maxima are unknown numbers here. Confidence: high on load order, placement, cursor order and the stack clamp (every line of inventory.cpp read); high that no move or merge exists; medium on bag capacity (no cap in the code read; the engine may cap elsewhere, not read). camera_scope: n/a (not a camera topic).

## 1. Mechanism
The inventory keeps two zones. The equip zone is a fixed array of pointers indexed by the InventorySlot enum; the enum runs Head = 0 through CArmour and ends at kInventorySlotMax (types.h:234-253), so there are 18 equip slots. The bag zone is a vector of pointers whose index is the saved Repos_Index (inventory.cpp:240); it grows to fit the highest index used (inventory.cpp:149).

Load order (inventory.cpp:234-268): the general bag list ("ItemList") is loaded first, each item at its saved index. The equip list ("Equip_ItemList") is loaded only if the field exists; that is when the equip array is resized to 18 (inventory.cpp:246-250). Each equip item's slot comes from its struct id, read as one bit flag and mapped to an enum value (inventory.cpp:257; mapping at 171-230). If that equip slot is already filled, the item goes to the bag (inventory.cpp:260-264), so a second item for the same slot is kept, not dropped.

Placement rule (inventory.cpp:135-153): if the requested bag index is occupied, the item goes to the first empty bag index; if none is empty, it is appended at the end. Load of a colliding bag item therefore never loses the item.

Cursor walk (inventory.cpp:53-118): getFirstItemInInventory resets the cursor to 0 and returns the first non-null item. The walk goes through the 18 equip slots in enum order, then through the bag by index, skipping nulls. When the walk runs out, the cursor is set to SIZE_MAX and nullptr is returned (inventory.cpp:61, 116).

Stacks: an Item holds _stackSize. createItem refuses a zero stack (inventory.cpp:126). setItemStackSize ignores zero and otherwise clamps the request to the item's maximum (item.cpp:184-191). The maximum is read from the "Stacking" column of the baseitems table (item.cpp:203-206). The instance StackSize loaded from a save is not clamped (item.cpp:258).

Not in this donor: atomic move, swap, merge, split, and drop ceremony or loot presentation. The bag is a passive store; there is no transaction.

## 2. Key functions
- Inventory::getItemInSlot (inventory.cpp:121-123): returns equippedItems[slot] if slot < kInventorySlotMax, else nullptr. Only the upper bound is checked.
- Inventory::insertItem (inventory.cpp:135-153): the placement rule above.
- Inventory::getNextRetrieved (inventory.cpp:69-118): the equip-then-bag walk. It uses std::find_if on the non-null pointers from the current cursor.
- Inventory::load (inventory.cpp:234-268): the save loader described above; Repos_Index at 240, Equip_ItemList gate at 246, slot from flag at 257, collision to bag at 263.
- Inventory::getSlotFromBitFlag (inventory.cpp:171-231): an exact match of one bit to one slot; an unknown flag throws (inventory.cpp:231), which aborts the load.
- Item::setItemStackSize (item.cpp:184-191) and Item::getMaxStackSize (item.cpp:203-206).

Callers checked: the NWScript GetItemInSlot wrapper passes its slot straight to Creature::getItemInSlot (functions_inventory.cpp:241-245). Placeables build an Inventory from their GFF struct (placeable.cpp:50), so an object that has no Equip_ItemList gets an empty equip vector.

## 3. Numbers vs mechanism
- Equip slots: 18 (types.h:253 kInventorySlotMax; enum entries Head through CArmour, types.h:235-252).
- Bag size: no cap in the code read. The vector grows to slot+1 (inventory.cpp:149).
- End-of-walk sentinel: SIZE_MAX (inventory.cpp:61, 116).
- Stack maximum: the baseitems "Stacking" column (item.cpp:205). Values not read (table not in donor box).
- Charges: setItemCharges clamps to ChargesStarting (item.cpp:193-199 area) and has a TODO to destroy an item at zero charges (item.cpp:199).
- Placement tie-break: lowest free index, else end of vector (inventory.cpp:141-149). The default slot argument is 0 (inventory.h declaration), so a load collision starts the search at index 0.

## 4. TypeScript sketch
simplified: the donor holds Item instances and uses SIZE_MAX as the end sentinel; the sketch uses a flat index and -1. It omits GFF loading, the bit-flag-to-slot table (a numeric slot is passed in), charges, and the NWScript layer. Donor defects are fixed in the sketch: the equip array is always 18 entries (donor only allocates it when the save has an equip list); getItemInSlot checks both bounds (donor checks only the upper bound); an unknown equip slot goes to the bag with a warning instead of a throw (donor throws at inventory.cpp:231); the stack setter returns the overflow instead of clamping silently (donor clamps at item.cpp:190). Kept from the donor: first-free-else-append placement, equip-then-bag walk order, and zero stack refused.

```ts
// Clean-room shape of a two-zone inventory (equip array + sparse bag),
// written from the shape of the donor's placement and cursor logic.
// Fixes marked "fix:" are changes to the donor's defects.

export const EQUIP_SLOT_COUNT = 18; // engine constant: fixed number of equip slots

export interface Stack {
  readonly baseType: string;
  count: number;
  readonly maxStack: number; // from the item table (data, not zone data)
}

export class Inventory {
  // Equip zone is always allocated at full length (fix: donor only sizes it when the save has an equip list).
  private readonly equipped: (Stack | null)[] = new Array<Stack | null>(EQUIP_SLOT_COUNT).fill(null);
  // Bag zone is sparse by index; holes are null.
  private readonly bag: (Stack | null)[] = [];
  // Flat cursor: 0..17 equip, 18.. bag. -1 means "at end".
  private cursor = -1;

  // fix: bounds check instead of indexing past the end.
  getItemInSlot(slot: number): Stack | null {
    if (!Number.isInteger(slot) || slot < 0 || slot >= EQUIP_SLOT_COUNT) return null;
    return this.equipped[slot];
  }

  // Bag placement: preferred index if free; otherwise lowest free index; otherwise append.
  placeInBag(item: Stack, preferred = 0): number {
    let slot = preferred;
    if (slot < this.bag.length && this.bag[slot] !== null) {
      const free = this.bag.indexOf(null);
      slot = free !== -1 ? free : this.bag.length;
    }
    while (this.bag.length <= slot) this.bag.push(null);
    this.bag[slot] = item;
    return slot;
  }

  // Load an equipped item. Taken or invalid slot: the item goes to the bag, it is never dropped.
  // fix: donor throws on an unknown slot flag; here the item is kept in the bag and a warning is returned.
  loadEquipped(slot: number, item: Stack): { zone: 'equip' | 'bag'; index: number; warning?: string } {
    if (Number.isInteger(slot) && slot >= 0 && slot < EQUIP_SLOT_COUNT && this.equipped[slot] === null) {
      this.equipped[slot] = item;
      return { zone: 'equip', index: slot };
    }
    const index = this.placeInBag(item);
    return { zone: 'bag', index, warning: 'equip slot taken or unknown' };
  }

  // Stack setter: clamps to the item max and REPORTS the overflow.
  // fix: donor clamps silently, so a caller cannot tell a count was lost.
  // Zero is refused and leaves the count unchanged (as in the donor).
  setStackSize(stack: Stack, requested: number): { overflow: number } {
    if (requested <= 0) return { overflow: 0 };
    const count = Math.min(requested, stack.maxStack);
    stack.count = count;
    return { overflow: requested - count };
  }

  // Flat cursor over equip then bag, skipping empty slots.
  private flatLength(): number {
    return EQUIP_SLOT_COUNT + this.bag.length;
  }

  private at(flat: number): Stack | null {
    return flat < EQUIP_SLOT_COUNT ? this.equipped[flat] : this.bag[flat - EQUIP_SLOT_COUNT];
  }

  private scanFrom(start: number): Stack | null {
    for (let i = start; i < this.flatLength(); i++) {
      const s = this.at(i);
      if (s !== null) {
        this.cursor = i;
        return s;
      }
    }
    this.cursor = -1;
    return null;
  }

  first(): Stack | null {
    return this.scanFrom(0);
  }

  next(): Stack | null {
    return this.cursor < 0 ? null : this.scanFrom(this.cursor + 1);
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in
Target file (proposed, not checked against the Frankendom repo): origins/inventory/slots.ts. Parity row 18 (loot roll and XP award): a loot pickup lands in a bag index or an equip slot, and the placement rule decides where it lands. The stack setter also belongs with the loot award path.

## 6. Gaps and risks
- One ledger: the donor has no transaction. Frankendom needs an atomic move (remove from one slot and add to another in a single server write, or nothing happens). That is not in this donor and must be written new.
- Server-verified: the donor loads counts from the save and clamps only through the setter. The server must re-validate every stack count and every equip slot on load instead of trusting the save.
- Zones as data: the stack maximum comes from a per-item table that is not in the donor box. Frankendom's item data must supply it; the sketch takes maxStack as a field.
- Donor defects to fix before any reuse (keep the idea): (1) getItemInSlot indexes an equip vector that is empty when the save has no Equip_ItemList (inventory.cpp:121-123, 246-250); fix: allocate 18 at construction. (2) Silent stack clamp (item.cpp:190); fix: return the overflow. (3) Unknown equip flag throws and aborts the whole load (inventory.cpp:231); fix: bag it with a warning. (4) Zero charges do not destroy the item (item.cpp:199 TODO); fix: destroy or mark spent in the ledger. (5) Instance StackSize is not clamped on load (item.cpp:258); fix: clamp on load and report.
- No bag cap in the donor. Frankendom needs a bag size as a data field, and the placement rule must refuse, not append past it.
- Not applicable: MAX_ATTACKERS = 3 and the Pit are not touched by this mechanism. The inventory UI is client-only; this placement logic is engine-side.

Reuse tag: adapt (two-zone slot model with never-drop placement; the donor has no move or merge, so atomic move is new work).

Brief rule served: rule 1 (grep found the real implementation in inventory.cpp, not the hint's render path), rule 4 (no invented numbers; stack maxima marked as not read), rule 7 (GPL-3: clean-room shape only, the sketch is written from the shape, not translated), data tables cited but not opened (baseitems).

Best transferable idea: Keep the equip zone as a fixed 18-entry array and the bag as a sparse list indexed by saved position, and never drop an item on load: a taken slot goes to the first free bag index, else to the end.

Decision (proposed): adapt - keep the two-zone shape and the never-drop placement; change the silent stack clamp to a returned overflow and bounds-check the equip lookup; reject the trust in save counts, since the server re-validates them.
Acceptance: a server test loads a save where two items claim the same equip slot and asserts both survive (one equipped, one at the first free bag index), and a stack setter called with 40 on a max-20 item returns overflow 20 instead of clamping silently.
