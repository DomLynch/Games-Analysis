# flareteam-flare-engine (inventory-bank-equipment, cell 9)

Donor: `/mnt/frankendom-donors/flareteam-flare-engine/src/ItemStorage.cpp` (with `MenuVendor.cpp`, `MenuStash.cpp`, `MenuInventory.cpp`, `ItemManager.cpp`) | Licence: GPL-3.0-or-later (ItemStorage.h header: "either version 3 of the License, or (at your option) any later version"; COPYING is GPL v3) | C++ | symbol `ItemStorage::add`

Checked: Read in full: `ItemStorage` header (ItemStorage.h 1-90) and `ItemStorage.cpp` 34-242 (init, add, subtract, remove) and 426-486 (full, count, contain, clean). Also `MenuVendor.cpp` 284-300 and 329-336 (sell into buyback, compaction), `MenuStash.cpp` 159-160, 185-196, 366-409 (stash policy and add), `MenuInventory.cpp` 780-796 (activation), 890-948 (add with leftover and quest overflow), 994-1035 (remove), `ItemManager.cpp` 344, 456-457, 691-693, 711-730, 1773-1792 (item fields and `ItemStack::empty`), `CampaignManager.cpp` 139-180 (callers of remove and contain). Callers of `full()`: MenuVendor.cpp 294 only. Callers of `add()`: MenuInventory.cpp 914, MenuStash.cpp 395, MenuVendor.cpp 299, 334. Callers of `remove()`: MenuInventory.cpp 1007-1020 and CampaignManager.cpp 171. Not read: the sort functions (ItemStorage.cpp 245-424), the equip-slot search (`getEquipSlotFromItem`), the stash UI, the save format beyond setItems and getItems. Confidence: high on the storage core (read line by line). The C++ was not compiled or run. The `full()` defect and the other defects are hand traces of the code; the fixed sketch was run on the VPS. Searched for a bank: the stash (MenuStash) is the bank. camera_scope: n/a (not a camera cell).

Best transferable idea: A fixed slot grid where each item has its own stack size, a stack fills the requested slot first, then partial stacks, then empty slots, and what does not fit is returned to be dropped or reported; the stash is a second grid with a per-item policy, and the vendor's buyback is a fixed-size list where the oldest entry is dropped when a sale does not fit.
Decision (proposed): adapt - take the slot grid with per-item stacks, the returned-leftover rule, the per-item stash policy and the buyback list; fix the room test in `full()`, the quest-item overflow count and the removal order; keep shared stashes out (they conflict with the one-character, one-ledger ruling).
Acceptance: Sell 10 units of one item to a vendor whose two buyback stacks hold 5 each: the sale fits, no entry is evicted, and a server test asserts the buyback list is unchanged and all 10 units are recorded; a 1-unit sale to a full buyback drops only the oldest entry.

## 1. Mechanism

- Storage: a fixed array of stacks; each slot holds an item id, a quantity and a `can_buyback` flag (ItemStorage.h 31-87; ItemStorage.cpp 41-55). Saved as two CSV lists, ids and quantities (64-121).
- Stack size is per item: `max_quantity` from the item data (ItemManager.cpp 344, 691-693). Items with no value get 1 (456-457), so they do not stack.
- `add(stack, slot)` (136-188), in order:
  1. A requested slot is used only if it is empty or holds the same item (144-147).
  2. Otherwise, for a stackable item (max above 1), the first partial stack of the same item with the same `can_buyback` flag (152-157).
  3. Otherwise, the first empty slot (159-165).
  4. The quantity added is the smaller of the stack and the room left in the slot (169). Any rest is added again with no slot requested (174-177).
  5. What does not fit is returned (184). The comment says it will likely be dropped on the ground (183).
- `subtract(slot, qty)` clears the slot at zero (195-203).
- `remove(item, qty)` (208-242) loops over slots holding the item and subtracts from them (defect D3).
- `full(stack)` (426-443) is meant to answer: can the whole stack be placed? It returns false as soon as it finds room, and true when no room is left (defect D1).
- `count` (448-456) and `contain` (461-470) are plain sums over the slots.
- Carried add with leftover (MenuInventory.cpp 914-948): a quest item that does not fit clears non-quest slots from the end (916-933) to drop them, then re-adds the leftover if it now fits (939-941). Other leftovers go to the ground (944). "Inventory is full." is logged (946).
- Auto-equip (893-911): an item goes to an empty equipment slot only if none of its disabled slot types holds an equipped item (898-906).
- Stash (MenuStash.cpp 366-409): an item with no_stash ALL is refused (379-383). In a private tab, no_stash PRIVATE is refused (384-388); in a shared tab, no_stash SHARED is refused (389-393). The rest goes to `stock.add` (395). A leftover gives "Stash is full." (400) and goes to the ground (401). A partial add still marks the tab as updated (397-399). Each tab's `is_private` is data (159-160). At least one private tab is always ensured (185-196).
- Vendor buyback (MenuVendor.cpp 290-300): a sold stack is marked `can_buyback` (291). If `full()` says the stack does not fit (294), the oldest entry, slot 0, is cleared (295), and the list is compacted by re-adding each stack to the first free slot (329-336). Then the stack is added (299).

## 2. Key functions

- `ItemStorage::add`: `/mnt/frankendom-donors/flareteam-flare-engine/src/ItemStorage.cpp` 136-188.
- `ItemStorage::subtract` and `remove`: same file, 195-203 and 208-242.
- `ItemStorage::full`: same file, 426-443.
- `ItemStorage::count` and `contain`: same file, 448-470.
- Vendor sell and compaction: `/mnt/frankendom-donors/flareteam-flare-engine/src/MenuVendor.cpp` 290-300 and 329-336.
- Stash policy and add: `/mnt/frankendom-donors/flareteam-flare-engine/src/MenuStash.cpp` 366-409.
- Carried add, quest overflow and remove: `/mnt/frankendom-donors/flareteam-flare-engine/src/MenuInventory.cpp` 890-948 and 994-1035.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Stack size per item; unset means 1 | `max_quantity` default 1 when unset (ItemManager.cpp 456-457) |
| Slot order: requested, partial, empty | Rule only (ItemStorage.cpp 144-165) |
| Leftover returned to the caller | Rule only (184) |
| Stash policy per item | ALL, PRIVATE, SHARED, IGNORE (ItemManager.cpp 718-730; MenuStash.cpp 379-393) |
| Buyback list drops its oldest entry | Size of the list is `VENDOR_SLOTS` (MenuVendor.cpp 330); the value was not read |
| Private stash always available | At least one private tab (MenuStash.cpp 185-196) |

Defects, with the numbers from the hand traces and the fixed version run on the VPS:
- D1, `full()` reports an exact fit as full. The loop subtracts the slot's quantity from the stack (433), not its free room, and never returns false once the stack reaches zero. Hand trace: one slot with 9 units, stack of 1 (max 10): the code gives true (no room), but the stack fits. Two slots with 5 units each, stack of 10: the code gives true, but the stack fits exactly. The fixed `fullFor` gives false for both (VPS run).
- D1 effect: the vendor evicts its oldest buyback entry (294-295) when the sale would have fitted. Hand trace; the caller order is at MenuVendor.cpp 291-295.
- D2, quest overflow count. `slots_to_clear = leftover.quantity + (leftover.quantity % max_q) / max_q` (921) counts units, not slots. With max 10 and a leftover of 5 quest units, it clears 5 non-quest slots (one is needed). With a leftover of 12, it clears 12. Hand arithmetic from the formula.
- D3, `remove()` does not pick the smallest stack. `lowest_quantity` is INT_MAX (212) and the test is `storage[i].quantity < lowest_quantity` (221), which is always true, so the last matching slot is taken first. Totals are still correct. Hand trace.
- D4, `remove()` is not atomic. It subtracts slot by slot, then returns false when no matching slot is left (217-228), so a short count leaves the earlier stacks already reduced. The callers check counts first (MenuInventory.cpp 1006-1027; CampaignManager.cpp 168-171), so this is latent. Hand trace.
- D5, `full()` ignores `can_buyback`, but `add()` only merges stacks with the same flag (153 against 431). Latent: the vendor marks every sold stack as buyback (291), so the two agree today. Hand trace.
- D6, the leftover from the vendor add is ignored (299). It is not reachable while a stack is no larger than its item's max, because one cleared slot is always enough. Hand trace. Silent discard if that invariant ever breaks.
- D7, activation: while an item is activated for a power, `remove()` subtracts exactly 1, whatever quantity was asked (995-998). The power path removes one at a time (GameStatePlay.cpp 651, not read here), so the live path is fine. A quest removal of more than one of an activated item would remove one. Hand trace; no live caller found that asks for more while activated.
- D8, `ItemStack::empty()` can clear a stack as a side effect of a query (ItemManager.cpp 1773-1787). Minor.

## 4. TypeScript sketch

simplified: the sketch keeps the slot order (requested, partial, empty), the returned leftover, the buyback eviction of the oldest entry, and an exact room test (`fullFor`) in place of the donor's `full()`. It marks the sold stack as buyback before the test, as the donor does. It omits the sort functions, the CSV save format, the equip rules, the stash policy and tabs, the `clean` step, and the `subtract` path. The donor's `full()` is not reproduced here; its defect is described in section 3 (D1) and was traced by hand. The code was typechecked with tsc strict and run on the VPS for the exact-fit, overflow and vendor cases.

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Stack {
  item: number;     // 0 = empty
  qty: number;
  buyback: boolean; // sold-to-vendor flag; only same-flag stacks merge
}

const EMPTY: Stack = { item: 0, qty: 0, buyback: false };

function isEmpty(s: Stack): boolean {
  return s.item === 0 || s.qty === 0;
}

// Room for this stack in one slot: an empty slot takes up to max; a same-item, same-flag slot takes max minus its quantity.
function roomIn(slot: Stack, s: Stack, max: number): number {
  if (isEmpty(slot)) return max;
  if (slot.item === s.item && slot.buyback === s.buyback) return Math.max(0, max - slot.qty);
  return 0;
}

// Order of slots to try: the preferred slot (if free or same item), then partial stacks (stackable only), then empty slots.
function slotOrder(slots: Stack[], s: Stack, max: number, preferred: number): number[] {
  const idx: number[] = [];
  if (preferred >= 0 && preferred < slots.length && (isEmpty(slots[preferred]) || slots[preferred].item === s.item)) {
    idx.push(preferred);
  }
  if (max > 1) {
    slots.forEach((c, i) => {
      if (i !== preferred && c.item === s.item && c.buyback === s.buyback) idx.push(i);
    });
  }
  slots.forEach((c, i) => {
    if (i !== preferred && isEmpty(c)) idx.push(i);
  });
  return idx;
}

// Places as much of the stack as fits and returns the rest (the caller drops it or reports "full").
function addStack(slots: Stack[], s: Stack, max: number, preferred = -1): Stack {
  let rest = s.qty;
  for (const i of slotOrder(slots, s, max, preferred)) {
    if (rest <= 0) break;
    const put = Math.min(rest, roomIn(slots[i], s, max));
    if (put <= 0) continue;
    const had = slots[i].item === s.item ? slots[i].qty : 0;
    slots[i] = { item: s.item, qty: had + put, buyback: s.buyback };
    rest -= put;
  }
  return rest > 0 ? { item: s.item, qty: rest, buyback: s.buyback } : { ...EMPTY };
}

// Exact fit test: true only when the whole stack cannot be placed (total room is less than the quantity).
function fullFor(slots: Stack[], s: Stack, max: number): boolean {
  let room = 0;
  for (const c of slots) room += roomIn(c, s, max);
  return room < s.qty;
}

// Vendor buyback: if the sale does not fit, drop the oldest entry (slot 0), compact, then add. Returns what is left.
function sellToVendor(slots: Stack[], s: Stack, max: number): Stack {
  const sold: Stack = { ...s, buyback: true };
  if (fullFor(slots, sold, max)) {
    slots.shift();
    slots.push({ ...EMPTY });
  }
  return addStack(slots, sold, max);
}
```

## 5. Lands in

- TARGET `origins/inventory/storage.ts` (proposed path; not checked against the Frankendom repo): the slot grid behind the carried list, the stash and the vendor buyback. Parity-checklist row 18 (loot roll and XP award), the hint row. The buyback list and the stash policy sit under the same row.
- today: none checked.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: one ledger (every add and sale is one write, the leftover is returned, not lost); zones as data (stack size, stash policy and list size are item and vendor data).

## 6. Gaps and risks

- The shared stash conflicts with the one-character, one-ledger ruling. The donor's shared tabs are kept in files shared across saves (MenuStash.cpp 159-160 comment). Keep private tabs only, or make a shared bank an account ledger that the server verifies.
- The leftover is dropped on the ground by the donor (ItemStorage.cpp 183-184; MenuInventory.cpp 944; MenuStash.cpp 401). In Frankendom an overflow must be a ledger event, not a silent drop on the client.
- Fix D1 first: a sale that fits must not evict a buyback entry. Acceptance is in the header line above.
- Fix D2 (quest overflow counts units as slots) and D3 (remove order). D4 (non-atomic remove) matters once a caller skips the count check; make the server remove all-or-nothing.
- D5 and D6 are latent; they become live if buyback flags or stack sizes change.
- D7: an activation should not make `remove()` ignore quantity; the power path should pass its own count.
- The donor's `empty()` side effect (D8) must not exist in the ledger.
- Not checked on a phone: the grid and drag UI (MenuInventory) and the stash tabs; only the logic was read.
- The VENDOR_SLOTS and slot_number values were not read, so no sizes are claimed for the donor.
