# scummvm-scummvm (inventory-bank-equipment, cell 9)

Donor: /mnt/frankendom-donors/scummvm-scummvm/engines/hpl1/penumbra-overture/Inventory.cpp | Licence: GPL v3 or later (Inventory.cpp header: "either version 3 of the License, or (at your option) any later version"; COPYING is the GPLv3 text) | C++ | symbol cInventory::AddItem, cInventorySlot::OnMouseUp, cInventory::CheckCombineCallback

Checked: read Inventory.h lines 1-420 (the class tail after 420 not read); Inventory.cpp lines 1-30, 60-110, 246-262, 293-412, 514-532, 802-830, 1079-1135, 1195-1210, 1263-1300, 1336-1380, 1456-1470, 1514-1560, 1571-1602, 1630-1672. Not read: GameItemType.cpp (OnPickUp, OnAction, GetActions), cInventoryItem::Init body, cInventoryContext::Draw, the bag-slot restore in LoadFromGlobal after line 1672. Confidence high for add, move, combine, drop and the number keys; medium for item-type callbacks, which this note treats as black boxes. Camera: not a camera cell.

## 1. Mechanism

Inventory is a slot grid with pick-and-place moves. There are 24 bag slots (6 columns by 4 rows) and 9 equip slots, all in one slot list in that order, so a pickup fills the bag first and the equip slots after (lines 82-101). Items live in a name-keyed map (m_mapItems) and each slot holds a pointer to one item, so two stores describe one set of items.

Pickup (cInventory::AddItem, 1079-1131). The pickup name shows as a subtitle for 2.0 s (1081). A counted item merges into the first existing item with the same item type and subtype, adds its count, and returns (1085-1102). Otherwise a new item is built, the item-type pickup hook runs (1110-1111, not read), the item is inserted into the map (1117), and the first empty slot in list order takes it (1119-1127). If no slot is empty, the code only has a TODO comment (1130). The item is already in the map at that point, so it is left in the map with no slot.

Move (cInventorySlot::OnMouseDown and OnMouseUp, 293-342). Mouse down on an item sets it as the current item, remembers the source slot, clears the slot, and stores the cursor offset (297-304). Mouse up on a slot: if the target is empty, the item is placed there (324-325). If the target is occupied, the combine check runs (327-328). If the combine check ran and the held item still exists in the map, the held item goes back to the source slot (330-331). If the combine check did not run, the held item also goes back to the source slot (333). The held item never enters an occupied slot, so a drag never swaps two items.

Combine (cInventory::CheckCombineCallback, 1514-1559). A combine callback is a pair of item names, matched in either order (1523-1524). A match runs a named game script with the two names and the target slot index (1536-1538). No match shows one of five random "cannot combine" lines (1542-1544).

Drop outside slots (cInventory::OnMouseUp, 1263-1297). If no slot took the release and the left button was used, an item that is droppable and not counted is spawned into the world at the camera position (1286-1288; Drop at 514-528) and removed from the map (RemoveItem, 1195-1210). Anything else goes back to its source slot (1290).

Number keys (cInventory::OnShortcutDown, 1348-1374). When the inventory is open, the key goes to any widget under the cursor. For a slot, that swaps the slot item with equip slot n in both directions (cInventorySlot::OnShortcutDown, 383-399). When the inventory is closed, the key uses the equip item n (1361-1371).

Save and load. Save writes every map entry (1576-1599) and the equip slots by item name (1604-1609). Load re-inserts every saved entry into the map (1659) and restores the equip slots by name (1664-1668). The bag restore after 1672 was not read.

## 2. Key functions

- cInventory::AddItem, Inventory.cpp:1079-1131 (stack, create, ledger insert, first empty slot)
- cInventorySlot::OnMouseDown and OnMouseUp, Inventory.cpp:293-342 (lift, place, refuse-and-return)
- cInventory::OnMouseUp, Inventory.cpp:1263-1297 (drop outside: droppable and not counted)
- cInventory::CheckCombineCallback, Inventory.cpp:1514-1559 (pair table, script call, fail line)
- cInventorySlot::OnShortcutDown and cInventory::OnShortcutDown, Inventory.cpp:383-399 and 1348-1374
- cInventoryItem::Drop, Inventory.cpp:514-529 (spawn at camera, forward impulse)

## 3. Numbers vs mechanism

- 24 bag slots: 4 rows (line 83) by 6 columns (line 84). Count, engine constant (the layout is fixed in code).
- 9 equip slots (line 95). Count, engine constant. Equip slot n is the target of number key n.
- Slot pitch 77 px across and 69 px down (line 85); bag origin x = 400 - 77 * 2.5 and y = 15 + 69 + 5 (line 82); equip origin x = 400 - 77 * 4.5, y = 15 (line 94). These are UI pixels on the donor's fixed layout, not game numbers.
- Stack key is item type plus subtype (lines 1091-1092). The name is not compared. Stacking only starts when the new item has a count (line 1085).
- Pickup subtitle 2.0 s (line 1081).
- Dropped item: spawned at the camera position (line 519), given impulse 3.2 along the camera forward (line 526).
- Combine failure: one of 5 random lines (line 1542).

The numbers do not feed any formula. They are counts, a pitch, a display time, and one impulse.

## 4. TypeScript sketch

simplified: keeps the donor's order (stack first, then find a free slot) but (a) finds the slot BEFORE the item enters the ledger (donor inserts into m_mapItems first, at line 1117, then searches at 1119-1128), and (b) stacks only counted with counted (donor checks only the new item, line 1085). Omits: game-script combine calls, the 2 s subtitle, the world drop entity and impulse, the widgets and mouse, save and load, equip-name lookups, and the donor's OnPickUp refusal hook. Models one slot array (24 bag then 9 equip) and an all-or-nothing move.

```ts
// simplified: keeps the donor's order (stack first, then find a free slot) but (a) finds the slot BEFORE the
// item enters the ledger (donor inserts into m_mapItems first, then searches) and (b) stacks only counted+counted
// (donor checks only the new item's HasCount). Omits: game-script combine calls, subtitle, world drop entity,
// widgets/mouse, save/load, equip-name lookups, and the donor's OnPickUp refusal hook.
// Models: 24 bag slots + 9 equip slots in one slot array; stacking by kind+sub; move = all-or-nothing.
type ItemId = string;
interface Item { id: ItemId; kind: string; sub: string; counted: boolean; count: number; droppable: boolean; }
interface Ledger { items: Map<ItemId, Item>; slots: (ItemId | null)[]; } // slots[0..23] bag, slots[24..32] equip
const BAG = 24;
const EQUIP = 9;

type AddResult = { ok: true; where: number | "stacked" } | { ok: false; reason: "full" };

function addItem(l: Ledger, it: Item): AddResult {
  if (it.counted) {
    for (const other of l.items.values()) {
      if (other.counted && other.kind === it.kind && other.sub === it.sub) {
        other.count += it.count;
        return { ok: true, where: "stacked" };
      }
    }
  }
  const idx = l.slots.findIndex((s) => s === null);
  if (idx < 0) return { ok: false, reason: "full" }; // nothing was inserted: no ghost item
  l.items.set(it.id, it);
  l.slots[idx] = it.id;
  return { ok: true, where: idx };
}

type MoveResult = "placed" | "combined" | "returned";

// pick-and-place: the item leaves `from` only if the move completes; otherwise it stays put.
function move(l: Ledger, from: number, to: number, combine: (a: ItemId, b: ItemId) => boolean): MoveResult {
  const held = l.slots[from];
  if (held === null || from === to) return "returned";
  const target = l.slots[to];
  if (target === null) {
    l.slots[to] = held;
    l.slots[from] = null;
    return "placed";
  }
  if (combine(held, target)) return "combined"; // script decides; held item stays in `from` unless consumed
  return "returned"; // occupied target: refused, nothing swapped
}

function dropOutside(l: Ledger, from: number): "dropped" | "returned" {
  const id = l.slots[from];
  if (id === null) return "returned";
  const it = l.items.get(id);
  if (it && it.droppable && !it.counted) {
    l.slots[from] = null;
    l.items.delete(id);
    return "dropped";
  }
  return "returned";
}

// number key 1-9 on an item in a bag slot swaps it with equip slot n (both directions, unlike drag)
function equipShortcut(l: Ledger, from: number, equipIdx: number): void {
  if (equipIdx < 0 || equipIdx >= EQUIP) return;
  const a = l.slots[from];
  if (a === null) return;
  const e = BAG + equipIdx;
  const b = l.slots[e];
  l.slots[from] = b;
  l.slots[e] = a;
}

export {};
```

## 5. Lands in

Target: origins/server/inventory-ledger.ts (proposed new file; not in src/fight). Parity row 18 (loot roll and XP award): the move that gives a rolled drop to a character is the ownership step that row 18 covers.

## 6. Gaps and risks

Defects in the donor (idea kept, each fixed in the sketch or noted as a fix):
1. No-room ghost. The item enters m_mapItems at line 1117 before the slot search (1119-1128). A full bag leaves the item in the map with no slot. Save writes it (1576-1599) and load re-inserts it (1659). fix: search for a free slot first, and insert into the ledger only on success (addItem in the sketch returns "full" with nothing written).
2. Cross-type stacking. A counted pickup merges with any existing item of the same type and subtype, including a non-counted one (lines 1085 and 1091-1092). fix: merge only when both items are counted (sketch).
3. Dead cleanup loop. In CheckCombineCallback, the search loop (1519-1528) ends at end() when nothing matches. The cleanup loop at 1548-1556 starts from that iterator, so it never runs. The deferred-removal flag (1462-1463) is set only while the search runs, and that loop makes no script calls, so as read the flag is never set. fix: remove the flag and the dead loop; erase the callback at RemoveCombineCallback time, as the non-checking branch already does (1464-1466).
4. Silent full bag. The no-room case has only a TODO (1130). fix: refuse the pickup, leave the item in the world, and show the same 2 s subtitle (1081) with a "bag full" line.

Gaps against Frankendom's rulings:
- One engine, server-verified: the donor moves items on the client only. Frankendom: the client sends a move intent {itemId, from, to}; the server checks ownership and slot state and commits or refuses; the client keeps the item in its source slot until the server accepts.
- One ledger: the donor keeps a name-keyed map and slot pointers that can drift (defect 1). Frankendom: one items table with a slot index; the slot grid is derived.
- Zones as data: combine recipes are script strings (1536-1538). Frankendom: recipes are catalogue rows applied by the server.
- Two rules for one action: a drag refuses an occupied target (333), but a number key swaps (393-397). Pick one rule for a move.
- Item in limbo: during a drag the item is in no slot (298-300). On a phone, an app switch mid-drag leaves it nowhere on the client. Frankendom: never hold an item outside the ledger across a network call; send the intent only.
- 375 px phone: 6 columns at 77 px pitch need 5 x 77 = 385 px of pitch alone, which is wider than 375 px. Use 4 columns or a horizontal scroll, and a long-press to lift (touch handling was not read; the donor uses mouse down and up).
- Drops: the donor spawns a physics body at the camera with a 3.2 impulse (519, 526). Frankendom: a dropped item is a server-side ground-loot record, not a physics body.
- Hover name (246-262): the item name, the item description and the bound key label (only when a shortcut is set) show while hovering. For a phone, show the description on long-press, and the key label only with a keyboard.

Best transferable idea: a move is all-or-nothing (a refused drop returns the item to its source slot), and stacks come from a key, so no item can be in two slots or in none.
Decision (proposed): adapt — the refuse-and-return rule and the stack key fit server-verified loot, but the donor's two stores caused the ghost item (defect 1), so Frankendom keeps one ledger where a move commits only when the server accepts it.
Acceptance: on a 375-wide phone, drop a bag item on an occupied slot: it snaps back, and a server test asserts the same item ids and slot count before and after; with 24 bag slots full, a chest pickup is refused, the item stays in the chest, and a "bag full" line shows for 2 s.

Reuse tag: adapt (shape only; GPL v3 or later, clean-room, no line-by-line translation).
Brief rule served: addendum rule 2 (judge the mechanism, not the genre) and the 2026-10-10 rule (keep the idea, fix the defect).
