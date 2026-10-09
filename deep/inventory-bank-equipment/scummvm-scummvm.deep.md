# scummvm-scummvm (inventory-bank-equipment, cell 9)

Donor: /mnt/frankendom-donors/scummvm-scummvm/engines/hpl1/penumbra-overture/Inventory.cpp | Licence: GPL-3.0-or-later per Inventory.cpp header | C++ | symbol cInventoryItem.Init / cInventorySlot / cInventoryContext

## 1. Mechanism
- Donor: ScummVM's HPL1 "Penumbra Overture" engine, one slot-based inventory (cInventory) holding cInventoryItem objects in a map keyed by name, with a list of cInventorySlot widgets for the grid.
- Input: a cGameItem (name, item type, sub-type, count flag, count, image, description, can-drop flag).
- Pickup (cInventory::AddItem, 1079-1131): it first queues a pickup sub-title with the item's game name for 2.0 s (1080-1081). A counted item then stacks onto an existing item with the same type and sub-type (count added via AddCount, the pickup callback runs, then return; no slot used, and the OnPickUp hook is not consulted on this path).
- Otherwise a new cInventoryItem is built by Init (430), offered to the item type's OnPickUp hook (1111; on refusal the pickup callback still runs and the new object is deleted), added to the map, and placed in the first empty slot.
- The item is added to the map (keyed by name, 1117) before the slot search (1119-1127), so if no slot is empty the code reaches a TODO (1130) and the item stays in the map unslotted: it is not dropped, and no error is returned to the caller.
- Removal (RemoveItem, 1195-1218) clears any slot holding the item, erases it from the map, clears the current selection and frees the object.
- Init (430-457) copies name, image gfx objects (when an image file is set), description, game name, type, sub-type, hud model file and name, drop flag, count flag and count, and the mesh entity source file.
- Context menu (cInventoryContext::Setup, 802-812): action list comes from the item type's GetActions(canBeDropped), so the menu is data-driven per type.
- Runs client-side in the game UI; the caller (update loop or script hooks) was not read (not read); no server or authority check appears in the opened functions.

## 2. Key functions
- cInventoryItem::Init | /mnt/frankendom-donors/scummvm-scummvm/engines/hpl1/penumbra-overture/Inventory.cpp | 430-457 | copies the game-item fields (name, type, sub-type, count, drop flag, mesh) into the inventory item.
- cInventory::AddItem | /mnt/frankendom-donors/scummvm-scummvm/engines/hpl1/penumbra-overture/Inventory.cpp | 1079-1131 | stacks counted items by type and sub-type, else creates an item, runs the type hook, and fills the first empty slot.
- cInventory::RemoveItem | /mnt/frankendom-donors/scummvm-scummvm/engines/hpl1/penumbra-overture/Inventory.cpp | 1195-1218 | clears slots, erases from the map, resets the selection, frees the item.
- cInventoryContext::Setup | /mnt/frankendom-donors/scummvm-scummvm/engines/hpl1/penumbra-overture/Inventory.cpp | 802-812 | builds the per-item action menu from the item type and sizes it by action count.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Stack counted items by (type, sub-type) before using a new slot | Slot pitch 77 x 69 px (Inventory.cpp 82-85) and equip row at pitch 77 (94-96) (theirs, layout) |
| Per-type pickup hook can veto an item | Item type classes and their GetActions lists (theirs) |
| First empty slot placement; with no room the item stays in the map with no slot | Context row size 15, column length 100 (theirs, UI, 674-675) |
| Remove clears every slot that points at the item, then frees it | Font "verdana.fnt" (67, 192, 671) and sub-title time 2.0 s (1081) (theirs) |

## 4. TypeScript sketch
simplified: the donor adds the item to the map BEFORE the slot search, so a full grid leaves it mapped but unslotted; the sketch inserts only after a slot is found and returns false instead. The pickup sub-title, pickup callback and AddItemFromFile variant are omitted; removal is by id, the donor's by pointer.
```ts
// Licence: GPL-3.0-or-later | clean-room: written from the mechanism, no donor lines.
// Slot inventory: stack counted items by (type, sub-type); otherwise a per-type hook may refuse,
// then the first empty slot takes the item. No room returns false so the caller can act (the donor leaves the item in its map with no slot, unreported).
interface Item { id: string; type: string; sub: string; count: number; counted: boolean; }
interface Slot { item: Item | null; }

function addItem(slots: Slot[], items: Map<string, Item>, incoming: Item,
                 canPickUp: (i: Item) => boolean): boolean {
  if (incoming.counted) {
    for (const it of items.values()) {
      if (it.type === incoming.type && it.sub === incoming.sub) {
        it.count += incoming.count;
        return true;                       // stacked: no slot used
      }
    }
  }
  if (!canPickUp(incoming)) return false;  // per-type veto
  const slot = slots.find(s => s.item === null);
  if (!slot) return false;                 // no room: reported, never silent
  items.set(incoming.id, incoming);
  slot.item = incoming;
  return true;
}

function removeItem(slots: Slot[], items: Map<string, Item>, id: string): void {
  for (const s of slots) {
    if (s.item !== null && s.item.id === id) s.item = null;
  }
  items.delete(id);
}
```

## 5. Lands in
- Frankendom file: TARGET origins/inventory/inventory.ts (trunk 9f4937e38 has this module; not under src/, so no "today" move line).
- Parity-checklist row: nearest row 18 (loot roll and XP/career award: pickup is where awarded loot enters the bag) and row 15 (equip row slots feed gear dressing). Not a fight-engine row.
- Usable rule: one-character/one-ledger rule (the server inventory is the authority; the client grid is a view).
- Reuse tag: rewrite-from-idea (GPL-3; mechanism only).
- Brief rule served: one-character, one-ledger rule (server inventory is the authority); rules 7-9 n/a

## 6. Gaps and risks
- The donor has no server. Stacking, slot placement and removal all happen in the client UI, so it conflicts with "server inventory is the authority" if copied as-is.
- No room leaves the item in the map with no slot and no message (the donor TODO). Frankendom needs an explicit refusal path that the player sees.
- The per-type OnPickUp hook and GetActions list are not read here (in the item-type classes, not in Inventory.cpp). The hook contract is therefore described only from its call site.
- Equipment slots, weight and bank storage are not in this code.
- Symbol note: cInventoryItem.Init at 430 is correct. cInventorySlot is a widget class (constructor at 183), not the logic. The logic is AddItem at 1079.
- GPL-3: mechanism only, no lines copied.
