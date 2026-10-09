# TurningWheel-Barony (inventory-bank-equipment, cell 9)

Donor: /mnt/frankendom-donors/TurningWheel-Barony/src/interface/playerinventory.cpp | Licence: BSD-2 | C++ | symbol releaseItem / autosortInventory / getPaperDollSlotFromItemType
Licence note: BSD-2. The logic may be lifted from the path above; this sketch restates the structure in its own names.

Symbol check: `releaseItem` (lines 3255-4283) is the drag-release handler for a held item. Read in full: the cancel path (3273-3340), release into a chest or the alchemy panel (3359-3383), and the inventory-grid drop with swap and stacking (3455-3724). Skimmed by keyword only, not line by line: the chest-slot drop (3725-4017), the doll-slot equip (4018-~4075, where it calls `getPaperDollSlotFromItemType` at 4024) and the hotbar add and drop-to-world tail (4119-4283). The inventory logic the cell is about is `getPaperDollSlotFromItemType` (line 618), `autosortInventory` (line 11939) and `sortInventoryItemsOfType` (line 12286).

## 1. Mechanism

- Each item type has an equip-slot type in the item table. `getPaperDollSlotFromItemType` (618-658) maps that (switch on the item table's `item_slot`) to one of ten paper-doll slots: weapon, off-hand (shield), glasses (mask), helm, gloves, boots, breastplate, cloak, amulet, ring. Anything else maps to "not on the doll" (SLOT_MAX).
- `autosortInventory(player, sortPaperDoll)` (11939-12080) is called from UI code (GameUI.cpp 15590 and 28602, and several sites in this file; the callers are not read), with `sortPaperDoll` false or true:
  1. When `sortPaperDoll` is false, every non-spell item that is not equipped is moved to an unsorted position (x = -1, y = 0); equipped items are also unsorted if category 11 has a nonzero priority and the paper doll is disabled. When `sortPaperDoll` is true this step is skipped entirely (nothing is unsorted; only items already flagged unsorted or return-to-inventory get placed).
  2. Twelve category slots (`NUM_AUTOSORT_CATEGORIES`, main.hpp L418) each hold a signed priority (the comments say 1 to 9 and -9 to -1; the user-setting array in menu.cpp L210 defaults to all zero; where the live array is loaded is not read). Pairs of (priority, index) are sorted ascending. Positive priorities run from highest to lowest (ties: higher index first), each filling the grid from the right edge; then negative priorities run from the most negative up, each filling from the left edge. Zero is skipped. Category 11 (equipped items) has its sort call commented out, so 11 categories are active (0-10). The flag changes which side of the grid is filled first, not the order of item types.
  3. Each category calls `sortInventoryItemsOfType(player, category, direction)` for its item types (for example jewelry sorts rings then amulets; books sorts spellbooks, spell tomes, then books; weapons, armor, tools, thrown, gems, potions, scrolls, magic staves and food are one call each).
  4. A final `sortInventoryItemsOfType(player, -1, true)` places all leftovers.
- `sortInventoryItemsOfType` (12286-12481) collects only items whose x is -1 or the return-to-inventory coordinate, skips spells, filters to the category (rocks count as thrown, focus items count as magic staves and are skipped from tools), skips equipped items that sit in their equip slot, groups the rest by item type in first-seen order, and places each into the first free cell: it walks columns from the right or left edge, and in each column rows from the top down to the default inventory height. Spells and non-spells do not block each other. If the walk runs off the grid and the inventory has extra (backpack) rows, it repeats the same walk over those rows. If the grid is full the first walk never ends (no exit in the code).
- Output: the inventory grid order (item x and y), and the equipped doll slots (unchanged by sort).
- This is client UI logic: it rewrites the local player's inventory positions in the interface code. Whether the server also needs the result was not traced.

## 2. Key functions

| Name | Path | Lines | What it does |
|---|---|---|---|
| getPaperDollSlotFromItemType | /mnt/frankendom-donors/TurningWheel-Barony/src/interface/playerinventory.cpp | 618-658 | Maps an item's equip-slot type to a paper-doll slot |
| autosortInventory | /mnt/frankendom-donors/TurningWheel-Barony/src/interface/playerinventory.cpp | 11939-12080 | Unsorts, then sorts by category priority in two passes, then cleans up |
| sortInventoryItemsOfType | /mnt/frankendom-donors/TurningWheel-Barony/src/interface/playerinventory.cpp | 12286-12481 | Groups one category's loose items by type and writes them into free slots |
| releaseItem | /mnt/frankendom-donors/TurningWheel-Barony/src/interface/playerinventory.cpp | 3255-4283 | Drag release handler: cancel, chest and alchemy release, grid swap and stack, chest transfer, doll equip, hotbar add, drop to world |

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Equip-slot type to a fixed doll slot map | Ten doll slots (theirs) |
| Sort-by-category with priority; positive first high-to-low, negative after low-to-high | Twelve category slots, eleven active (theirs); priorities -9 to 9 as a user setting (theirs) |
| Two-pass priority sort, then cleanup | Pass direction flags (theirs) |
| Group by item type in first-seen order | First-seen order (theirs) |

## 4. TypeScript sketch

Licence: BSD-2. The logic may be lifted from the path above; this sketch restates the structure in its own names.

simplified: omits the spell/non-spell separation of cells, the rock and focus-item category exceptions, the return-to-inventory coordinate, the extra backpack rows, the equipped-but-not-in-slot case (all equipped items are skipped), the category-11 equipped branch and the (priority, index) tie order; a full grid leaves the item unsorted instead of looping forever. Only the doll-slot map is a direct port of the donor's switch.
```ts
// Licence: BSD-2 (TurningWheel-Barony, src/interface/playerinventory.cpp
// getPaperDollSlotFromItemType, autosortInventory, sortInventoryItemsOfType)
type DollSlot = 'weapon' | 'offhand' | 'glasses' | 'helm' | 'gloves' | 'boots' | 'breastplate' | 'cloak' | 'amulet' | 'ring' | null;
interface Item { type: string; category: string; equipSlot: string | null; equipped: boolean; x: number; y: number; }
const DOLL_MAP: Record<string, DollSlot> = {
  WEAPON: 'weapon', SHIELD: 'offhand', MASK: 'glasses', HELM: 'helm', GLOVES: 'gloves',
  BOOTS: 'boots', BREASTPLATE: 'breastplate', CLOAK: 'cloak', AMULET: 'amulet', RING: 'ring',
};
function dollSlotFor(item: Item): DollSlot {
  return item.equipSlot && DOLL_MAP[item.equipSlot] ? DOLL_MAP[item.equipSlot] : null;
}
// Two-pass priority sort, then a cleanup of leftovers.
// priorities: category -> signed number. Positive run high-to-low, negative run low-to-high.
function autosort(items: Item[], priorities: Map<string, number>, gridW: number, gridH: number, sortPaperDoll = false): void {
  if (!sortPaperDoll) {
    for (const it of items) if (!it.equipped && it.category !== 'spell') { it.x = -1; it.y = 0; }
  }
  const ordered = [...priorities.entries()].sort((a, b) => a[1] - b[1]);
  const high = ordered.filter(([, p]) => p > 0).reverse();
  const low = ordered.filter(([, p]) => p < 0);
  for (const [cat] of high) sortCategory(items, cat, true, gridW, gridH);  // fill from the right edge
  for (const [cat] of low) sortCategory(items, cat, false, gridW, gridH);  // fill from the left edge
  sortCategory(items, null, true, gridW, gridH); // leftovers
}
// Group loose items of a category by type, first-seen order, then write to free cells.
function sortCategory(items: Item[], category: string | null, rightToLeft: boolean, gridW: number, gridH: number): void {
  const groups = new Map<string, Item[]>();
  for (const it of items) {
    if (it.x !== -1 || it.category === 'spell') continue;
    if (category !== null && it.category !== category) continue;
    if (it.equipped) continue;
    if (!groups.has(it.type)) groups.set(it.type, []);
    groups.get(it.type)!.push(it);
  }
  const blocked = (self: Item, x: number, y: number) => items.some((o) => o !== self && o.x === x && o.y === y);
  for (const t of groups.keys()) { // type order stays first-seen either way
    for (const it of groups.get(t)!) {
      let placed = false;
      for (let x = rightToLeft ? gridW - 1 : 0; x >= 0 && x < gridW && !placed; x += rightToLeft ? -1 : 1) {
        for (let y = 0; y < gridH; y++) {
          if (blocked(it, x, y)) continue;
          it.x = x; it.y = y; placed = true; break;
        }
      }
    }
  }
}
```

## 5. Lands in

- Frankendom: src/fight/gear-room.ts (today: src/gear-room.ts, moving) (the gear list and its sort) and src/gear-stats.ts (slot map from the catalogue equip type). The doll slot map is a gear-dressing rule, so row 15 (gear dressing, src/fight) takes the slot map.
- Parity checklist row 15 (gear dressing) for the ten-slot map. Row 20 (catalogue) and row 21 (catalogue fields) for the item equip type and category. The sort is UI-only and has no row.
- Beyond checklist: none; autosort is UI-only.

Reuse tag: adapt (the slot map is the part worth taking; the sort is UI only and not needed for the duel)
Brief rule served: (category default, not per-cell) one-character, one-ledger rule; rules 7-9 n/a

## 6. Gaps and risks

- Ten doll slots is a fixed set. Frankendom's gear slots (per the gear room) must be the authority; the donor's list is a reference only.
- Autosort is a client UI action that rewrites positions. Frankendom's gear room must not reorder server-side gear state from a client sort.
- In the donor, equipping happens through UI handlers called from `releaseItem` (for example executeItemMenuOption0ForInventoryItem at 4066); what the server verifies was not traced. Frankendom must check equip rules on the server before a fight starts (server-verified, one ledger).
- The category list and priorities are user settings in the donor. Frankendom must not adopt the twelve slots without a design ruling.
- Conflict check: sorting is a view concern; keep it out of the duel step (src/fight/duel.ts (today: src/duel.ts, moving)). Only the equip map is server data.
