# diasurgical-DevilutionX (inventory-bank-equipment, cell 9)

Donor: /mnt/frankendom-donors/diasurgical-DevilutionX/Source/inv.cpp | Licence: Sustainable Use License v1.0 (donor LICENSE.md: internal business or non-commercial use only, free non-commercial distribution only); clean-room only, never a line-by-line translation | C++ | symbol FindSlotForItem / AutoEquip / CanEquip

Licence note: Sustainable Use License v1.0 (donor LICENSE.md; internal business or non-commercial use only). CLEAN-ROOM sketch only, never a line-by-line translation.

Symbol check: `FindSlotForItem` (688), `AutoEquip` (283 and 1353) and `CanEquip` (245 and 185) are all present as cited. The auto-equip entry point to use is the no-slot overload at 1353, which loops body locations in order. `CanEquip(Player&, Item&, bodyLocation)` at 245 is the per-slot check it calls.

## 1. Mechanism

- The pack is a 10-column grid of 40 cells (`InventoryGridCells` = 40, `constexpr` at player.h:38; the row pitch 10 is a literal in inv.cpp, e.g. 153, 662, 668). Items have a size in cells (width by height). Each cell of `InvGrid` holds 0 for empty, or the item's `InvList` index plus one; the bottom-left cell of the item holds it positive and the other covered cells hold it negative (`AddItemToInvGrid`, 151-167, lines 157-160).
- `FindSlotForItem(player, size, ignoreIndex)` (688-743) picks the first cell where the item fits, with a search order by height:
  - 1 cell tall (690-702): bottom row (cells 30-39) first, left to right; then columns 9 down to 0, rows 2 down to 0 (rows 0-2 only, the bottom row was already tried).
  - 2 cells tall (704-712): start column from `10 - width` down to 0, rows 0 to 2 (top first; only three start rows, not four).
  - 1x3 (714-720): start cells 0-19 in order. 2x3 (722-733): start cells 0-8, then 10-18.
  - Any other size calls `app_fatal` (735). Returns an optional (empty when nothing fits).
- `CheckItemFitsInInventorySlot` (660-679) tests each covered cell is empty, or occupied only by the ignored item (`abs(cell) - 1 == itemIndexToIgnore`, 670, so a swap can be tested without removing first), the column stays below 10 and the row stays inside the 40 cells.
- `AutoPlaceItemInInventory` (1400-1416) uses that result: it appends the item to `InvList`, marks its cells with `AddItemToInvGrid` (1409), and calls `CalcScrolls` (1410).
- `AutoEquip(player, item, persist, send)` (1353-1366) first rejects anything failing the item-only `CanEquip(item)` (185-189), then walks body locations from `INVLOC_HEAD` up to `NUM_INVLOC` (1359; the enum order is head, left ring, right ring, amulet, left hand, right hand, chest, player.h:72-81) and calls the per-location overload (283-300); the first that succeeds wins. That overload, when `persistItem` is set, writes `InvBody[loc]` (`ChangeEquipment`, 274-281), plays a sound if network-send and option are on, and calls `CalcPlrInv` (296).
- Per location, `CanEquip(player, item, loc)` (245-272) requires: `CanEquip(item)` (is equipment and its stat requirements are met, `_iStatFlag`, 185-189), `player._pmode <= PM_WALK_SIDEWAYS` (247; `PLR_MODE`, player.h:109-122, so stand and the three walk modes pass; attack, block, got-hit, death, spell and the rest refuse), and the slot is empty. Then the item type must match the slot: amulet, armour (chest), hands via `CanWield`, helm, or ring (251-271). `CanWield` (199-235) checks one-hand or two-hand location and the free-hand state, with a dual-wield exception for the class flagged `DualWield` (Bard, per the comment at 217) that allows a second one-handed sword or mace.
- Output: the item in the grid or in a body slot. Runs on the player's pickup and equip actions.

## 2. Key functions

| Name | Path | Lines | What it does |
|---|---|---|---|
| FindSlotForItem | /mnt/frankendom-donors/diasurgical-DevilutionX/Source/inv.cpp | 688-743 | First-fit cell search by item size, with a fixed scan order per size |
| CheckItemFitsInInventorySlot | /mnt/frankendom-donors/diasurgical-DevilutionX/Source/inv.cpp | 660-679 | Tests the covered cells are empty or the ignored item |
| AutoPlaceItemInInventory | /mnt/frankendom-donors/diasurgical-DevilutionX/Source/inv.cpp | 1400-1416 | Places the item in the first fitting slot and updates the grid |
| AutoEquip (no slot) | /mnt/frankendom-donors/diasurgical-DevilutionX/Source/inv.cpp | 1353-1366 | Tries each body location in order |
| AutoEquip (slot) | /mnt/frankendom-donors/diasurgical-DevilutionX/Source/inv.cpp | 283-300 | Checks the slot, then equips and recalculates |
| CanEquip (slot) | /mnt/frankendom-donors/diasurgical-DevilutionX/Source/inv.cpp | 245-272 | Item-type to body-slot match; slot must be empty; not busy |

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| First-fit placement of a multi-cell item on a grid, with a fixed scan order per item size | 10 columns by 4 rows, 40 cells (theirs, InventoryGridCells at player.h:38; pitch 10 literal at inv.cpp:153) |
| Test a placement while ignoring one occupant (a swap test without removing) | Ignore-index test (theirs, inv.cpp:670) |
| Auto-equip tries body slots in a fixed order, first success wins | Body order from `INVLOC_HEAD` to `NUM_INVLOC` (theirs, inv.cpp:1359) |
| Type-to-slot match table | Item location types (theirs) |

## 4. TypeScript sketch

Licence: Sustainable Use License v1.0 (non-commercial / internal use only). CLEAN-ROOM sketch: written from the mechanism above, not translated from the donor.

simplified: grid is a 2D (x, y) scan instead of the donor's flat start-cell scan; the 1x3 and 2x3 scan orders are replaced by the height-2 rule; no fatal on unknown sizes; negative anchor/occupied cell encoding is dropped (all cells hold id+1); `CanEquip` (stat requirement, busy mode, `CanWield` dual-wield rule) is a callback; `AutoEquip` omits the up-front item-only check, `persistItem`, sound and recalculation.

```ts
// clean-room sketch of first-fit grid placement with an ignore-index swap test.
// Licence line: Sustainable Use License v1.0 donor (non-commercial only); this sketch is clean-room, written from mechanism only.
const COLS = 10;   // theirs
const ROWS = 4;    // theirs
const EMPTY = 0;
interface Size { w: number; h: number; }
// grid[cell] = 0 when empty, otherwise item id + 1 covering that cell.
function fitsAt(grid: number[], x: number, y: number, size: Size, ignoreId: number | undefined): boolean {
  if (x < 0 || y < 0 || x + size.w > COLS || y + size.h > ROWS) return false;
  for (let dy = 0; dy < size.h; dy++) {
    for (let dx = 0; dx < size.w; dx++) {
      const v = grid[(y + dy) * COLS + (x + dx)];
      if (v !== EMPTY && (ignoreId === undefined || v - 1 !== ignoreId)) return false;
    }
  }
  return true;
}
// First fit in a scan order chosen for the item's height.
function findSlot(grid: number[], size: Size, ignoreId?: number): { x: number; y: number } | undefined {
  const order: { x: number; y: number }[] = [];
  if (size.h === 1) {
    // bottom row first, left to right; then columns right to left, rows bottom-up (skipping the bottom row)
    for (let x = 0; x < COLS; x++) order.push({ x, y: ROWS - 1 });
    for (let x = COLS - 1; x >= 0; x--) for (let y = ROWS - 2; y >= 0; y--) order.push({ x, y });
  } else {
    // height 2 in the donor: start columns right to left, start rows 0..2 only (the last row cannot start a 2-tall item)
    for (let x = COLS - size.w; x >= 0; x--) for (let y = 0; y + size.h <= ROWS; y++) order.push({ x, y });
  }
  for (const p of order) if (fitsAt(grid, p.x, p.y, size, ignoreId)) return p;
  return undefined;
}
// Body slots tried in a fixed order; first slot that accepts the item wins.
function autoEquip(
  slots: string[],
  canEquipAt: (slot: string) => boolean,
  equipAt: (slot: string) => void,
): string | undefined {
  for (const s of slots) {
    if (canEquipAt(s)) { equipAt(s); return s; }
  }
  return undefined;
}
```

Note: the sketch's scan orders are a simplification. The donor uses a fixed order for height 1, one for height 2, and separate ones for 1x3 and 2x3; the sketch uses one rule for height 1 and one for everything else.

## 5. Lands in

- Frankendom: src/fight/gear-room.ts (today: src/gear-room.ts, moving) (the gear room has named slots; a grid is not needed for a duel, so only the first-fit idea matters for a pack) and src/gear-stats.ts (the type-to-slot match). The auto-equip order is a gear-dressing rule, so row 15 (gear dressing, src/fight) takes the slot match.
- Parity checklist row 15 (gear dressing) for the slot-match rule. Row 20 (catalogue as runtime source) and row 21 (catalogue fields) for the item location type and size.
- Beyond checklist: economy (later phase) for a pack; nearest feature-map entry is the loot/XP path (row 18) for how items arrive in the pack.

Reuse tag: rewrite-from-idea
Brief rule served: one-character, one-ledger rule (server inventory is the authority); rules 7-9 n/a

## 6. Gaps and risks

- The licence is the Sustainable Use License v1.0 (internal business or non-commercial use only), so no lines may be lifted. Only the mechanism is used, written clean-room. Lead must confirm the licence is acceptable for a commercial product before any code is taken.
- A grid pack is a roguelike-style pack. Frankendom's gear room is a set of named slots. The grid is not needed for the duel and would add a surface that no fight uses.
- Auto-equip picks the first slot that fits. Frankendom must decide which slot a gear item belongs to from the catalogue, not from the first free slot.
- The check "not busy" reads the player's movement mode. Frankendom must reject an equip change during a fight on the server, not by a client flag.
- Conflict check: keep equip changes out of the duel step (src/fight/duel.ts (today: src/duel.ts, moving)). Equip is applied between fights; only the server writes it.
