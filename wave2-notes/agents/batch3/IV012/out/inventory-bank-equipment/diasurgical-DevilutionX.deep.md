# diasurgical-DevilutionX (inventory-bank-equipment, cell 9)

Donor: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/inv.cpp` | Licence: Sustainable Use License 1.0 (`LICENSE.md`: use or modify "only for your own internal business purposes or for non-commercial or personal use"; distribute "only if you do so free of charge for non-commercial purposes") | C++ | symbols `CheckOverlappingItems`, `ChangeInvItem`, `FindSlotForItem`, `ReorganizeInventory`, `AddGoldToInventory`

Checked: Read in full: `FindTargetSlotUnderItemCursor` (302-342), `CheckOverlappingItems` (421-449), `GetPrevItemId` (450-462), `ChangeInvItem` (464-522), `CheckInvPaste` (562-624, top part for the gates), `AddItemToInvGrid` (151-166), `CheckItemFitsInInventorySlot` (660-686), `FindSlotForItem` (688-743), `AutoPlaceItemInInventory` (1400-1415), `SortItemsBySize` (1418-1442), `ReorganizeInventory` (1445-1483), `AddGoldToInventory` (1507-1541), `GoldAutoPlace` (1543-1550), `GetInventorySize` (2292-2297). Also read: `MaxGold` cap (items.h:30, items.cpp:2776-2790), `StripTopGold` (player.cpp 2793-2816, the part before the ground drop). Callers checked: `ChangeInvItem` is called only from `CheckInvPaste` (608); `ReorganizeInventory` from diablo.cpp:2139 and 2643 (the calls were seen, not the surrounding handlers); `GoldAutoPlace` from inv.cpp:1681 and 1756 (the pickup callers, not read past the call); `AddGoldToInventory` from stores.cpp:1451 (not read). Not read: `CheckInvCut` (750-963), `CanPut`, `DeadItem`, `MAXITEMS` (value not read), the item size data (sizes come from the cursor art, read only at 2292-2297), the network send functions, the grid's second write at inv.cpp:1605 inside `CheckInvSwap`. Confidence: high on the move order and the fit search; high on the rollback defect (read line by line, not run); medium on the gold excess loss (read, not run). Camera: not applicable.

## 1. Mechanism

Footprint placement with a one-for-one swap. Items are rectangles on a 10 by 4 grid. A move is decided in full before any write, so a refused move leaves the hand and the grid exactly as they were.

Order of steps for one paste of the held item into the list grid (`CheckInvPaste`, 562):
1. Cursor to slot: `FindTargetSlotUnderItemCursor` (302) maps the cursor to a grid cell. For a multi-cell item it moves the top-left cell so the footprint stays on the grid (targetRow and targetColumn clamped at 329).
2. Location gates: a belt-only or wrong-location item returns with no change (573-575). An item the hero cannot use returns with no change (579-582), and so does a hero in a movement mode above walk-sideways (584).
3. Overlap test: `GetPrevItemId` (450) returns the overlap for a non-gold item by calling `CheckOverlappingItems` (421). That function scans every footprint cell. An empty footprint gives 0 (plain drop). Exactly one item id covering the footprint gives that id (swap). Two different ids give -1 (refuse), at 435-438.
4. Commit (`ChangeInvItem`, 464): if the overlap is -1, return false and nothing changes (467). The caller returns without touching the hand (608).
   - Empty footprint (499-502): the held item is appended to the list at `_pNumInv`, the count goes up, and the new id is written to the grid.
   - Swap (507-518): the displaced item is swapped into the hand (507). Every cell that held its id is cleared (511). The held item is then written into the footprint (518).
5. After the commit: `CalcPlrInv` and the cursor are refreshed (CheckInvPaste, after the switch).

Auto-place (`AutoPlaceItemInInventory`, 1400): `FindSlotForItem` (688) returns the first free origin for the item's size. The list gets the item, the count goes up, and the grid is written (1409).

Fit check (`CheckItemFitsInInventorySlot`, 660): for each footprint row, reject if the row runs past the grid (665, `yy >= InventoryGridCells`) or past column 10 (670), or if a cell holds an item other than the one being ignored.

Scan order (`FindSlotForItem`): 1-high items try the bottom row left to right (691), then columns from the right, bottom to top (695). 2-high items have their own loop (704). 1x3 and 2x3 have their own loops (714-734). A size outside those branches reaches `app_fatal` at the end of the function.

Gold (`AddGoldToInventory`, 1507): first top off existing piles in list order, each to `MaxGold` (1516). Then new piles fill the last row right to left (1529), then columns right to left, bottom to top. The value left over is returned. `GoldAutoPlace` (1543) keeps the remainder on the gold stack it was given and recomputes the player's gold total.

Repack (`ReorganizeInventory`, 1445): sort by size (`SortItemsBySize`, 1418-1442: taller first, then wider), empty the list and grid, re-place each item with `AutoPlaceItemInInventory`. If one fails, restore the grid from a copy and the list from a copy (1474-1480). The restore is defective, see section 6.

Cap changes: `MaxGold` is 5000 (items.h:30), and 10000 while the Auric amulet is worn (items.cpp:2787). When the amulet comes off, `StripTopGold` (player.cpp 2793) puts the excess back with `GoldAutoPlace`, and drops it on the ground if that fails and the item count allows.

## 2. Key functions

- `CheckOverlappingItems`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/inv.cpp` 421-449. The one-item-or-refuse test.
- `ChangeInvItem`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/inv.cpp` 464-522. The atomic commit (check, then write).
- `CheckInvPaste`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/inv.cpp` 562-624. The paste entry point and its gates.
- `FindTargetSlotUnderItemCursor`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/inv.cpp` 302-342. Cursor-to-origin with the footprint clamp.
- `FindSlotForItem` and `CheckItemFitsInInventorySlot`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/inv.cpp` 660-743. Fit check and per-size scan orders.
- `ReorganizeInventory`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/inv.cpp` 1445-1483. Sort, repack, and a rollback that is defective.
- `AddGoldToInventory` and `GoldAutoPlace`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/inv.cpp` 1507-1550. Gold stacks.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Overlap test on the whole footprint: 0 = drop, one item = swap, two = refuse | Grid 10 by 4 (inv.h:22, `InventorySizeInSlots { 10, 4 }`); 40 cells (player.h:38). Theirs. |
| Commit only after the check passes; a refusal writes nothing | Refusal value -1 (returned at 438; the gate is at 467). Theirs. |
| Item footprint is art size divided by slot size | `GetInventorySize` (2296). The slot size is in `InventorySlotSizeInPixels` (not read). Theirs. |
| Clamp the top-left so the footprint stays on the grid | Clamp in 329. Theirs. |
| Fill existing stacks to a cap, then new stacks, then return the rest | Pile cap 5000 (items.h:30); 10000 with the Auric amulet (items.cpp:2787). Theirs. |
| Repack by size (taller first, then wider) to reduce gaps | Sort key in 1431. Theirs. |
| Belt holds up to 8 one-cell items | `MaxBeltItems = 8` (player.h:39). Theirs. |

## 4. TypeScript sketch

simplified: the sketch keeps the overlap test, the commit-after-check order, the swap, the fit search, the gold top-off and the repack. It differs in four places. (a) The sketch writes the item id into every footprint cell; the donor writes the positive list index into the anchor cell and the negative index into the others (157-158). (b) The sketch uses the 1-high scan order for every item size; the donor has its own orders for 2-high and taller items (704 onward), and does not use the sketch's order for them. (c) The sketch's `repack` is all-or-nothing by construction (it restores a saved list, replacing it, not appending). This is the donor's rollback with the defect fixed, see section 6. (d) The sketch omits new gold piles, the equipment and belt slots, the cursor rounding in `FindTargetSlotUnderItemCursor`, the network sends, `MAXITEMS` and the item-count check.

```ts
// Licence: Sustainable Use License 1.0 (donor; restricted). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const COLS = 10;
const ROWS = 4;

type Size = { w: number; h: number };
// cells: 0 = empty, otherwise the id of the item covering that cell (the sketch stores the id in every footprint cell).
interface Grid { cells: number[]; }   // length COLS * ROWS
interface Placed { id: number; size: Size; origin: number; }

// Footprint cells for an item whose top-left cell is origin, or null if it would leave the grid.
function footprint(origin: number, size: Size): number[] | null {
  const row = Math.floor(origin / COLS);
  const col = origin % COLS;
  if (col + size.w > COLS || row + size.h > ROWS) return null;
  const cells: number[] = [];
  for (let r = 0; r < size.h; r++) {
    for (let c = 0; c < size.w; c++) cells.push(origin + r * COLS + c);
  }
  return cells;
}

// 0: footprint empty (a plain drop). n > 0: exactly one item n covers the footprint (a swap).
// -1: two or more different items cover it, or it is off the grid (refuse).
function overlapOf(g: Grid, origin: number, size: Size): number {
  const cells = footprint(origin, size);
  if (cells === null) return -1;
  let found = 0;
  for (const cell of cells) {
    const id = g.cells[cell];
    if (id === 0) continue;
    if (found === 0) found = id;
    else if (found !== id) return -1;
  }
  return found;
}

// One atomic move of the held item (id held, footprint heldSize) onto origin.
// Returns the id now in the hand (0 = hand empty), or null when refused.
// Nothing is written until the check has passed.
function placeHeld(g: Grid, held: number, heldSize: Size, origin: number): number | null {
  const over = overlapOf(g, origin, heldSize);
  if (over < 0) return null;                       // refused: hand and grid unchanged
  if (over > 0) {                                  // swap: the displaced item leaves the grid and goes to the hand
    for (let i = 0; i < g.cells.length; i++) if (g.cells[i] === over) g.cells[i] = 0;
  }
  for (const cell of footprint(origin, heldSize)!) g.cells[cell] = held;
  return over;
}

// Scan order for the first free spot for one item size: bottom row left to right,
// then columns from the right, bottom to top (the donor's order for 1-high items).
function findSlot(g: Grid, size: Size): number | null {
  const order: number[] = [];
  for (let c = 0; c < COLS; c++) order.push((ROWS - 1) * COLS + c);
  for (let c = COLS - 1; c >= 0; c--) {
    for (let r = ROWS - 2; r >= 0; r--) order.push(r * COLS + c);
  }
  for (const origin of order) {
    const cells = footprint(origin, size);
    if (cells !== null && cells.every(cell => g.cells[cell] === 0)) return origin;
  }
  return null;
}

// Repack every item by size (taller first, then wider) into the first free spots.
// All or nothing: if one item does not fit, the grid and the item list go back exactly as they were.
function repack(g: Grid, items: Placed[]): boolean {
  const savedCells = g.cells.slice();
  const savedItems = items.map(i => ({ ...i, size: { ...i.size } }));
  const sorted = items.slice().sort((a, b) => (a.size.h === b.size.h ? b.size.w - a.size.w : b.size.h - a.size.h));
  g.cells.fill(0);
  for (const it of sorted) {
    const origin = findSlot(g, it.size);
    if (origin === null) {
      g.cells = savedCells;                          // restore the grid
      items.splice(0, items.length, ...savedItems);  // restore the list (replaced, not appended)
      return false;
    }
    it.origin = origin;
    for (const cell of footprint(origin, it.size)!) g.cells[cell] = it.id;
  }
  return true;
}

// Gold: fill existing piles in list order up to cap, return what is left for new piles.
interface Pile { value: number; }
function topOffGold(piles: Pile[], value: number, cap: number): number {
  let left = value;
  for (const p of piles) {
    if (left <= 0) break;
    if (p.value >= cap) continue;
    const add = Math.min(cap - p.value, left);
    p.value += add;
    left -= add;
  }
  return left;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/IV012-devilution-inv-sketch.ts): exit 0.

## 5. Lands in

- TARGET `origins/inventory/grid.ts` (proposed path; not checked against the Frankendom repo): one grid for bag, bank and equipment footprints, with a single move call that either commits or refuses. Parity-checklist row 18 (loot roll and XP award): what a pickup or a move does to the ledger, and the stack caps.
- Reuse tag: rewrite-from-idea (Sustainable Use License 1.0: restricted; clean-room only)
- Brief rule served: 1 (one ledger: a move is one check and one write, or a refusal); rules 7-9 n/a

## 6. Gaps and risks

- Restricted licence: clean-room only. The sketch is written from the mechanism. The licence limits use to internal business or non-commercial or personal use, and distribution to free non-commercial use. Frankendom's use is not clearly covered, so no code may be adapted.
- Defect, rollback in `ReorganizeInventory` (keep the idea, fix the code): on failure, the restore loop at 1476-1477 appends `tempStorage` with `player.InvList[player._pNumInv++]`. `_pNumInv` is not reset to 0 first, and it still holds the number placed before the failure (the increments in `AutoPlaceItemInInventory`, 1407-1409). So the list gets the items again after the partly placed ones, the count overshoots, and the restored grid (1480) points at the wrong list indices. This is reachable whenever at least one item was placed before a failure. Not run. fix: reset `_pNumInv` to 0 and clear the list before the restore loop, as the sketch's `repack` does by replacing the list.
- Defect, excess gold can be lost (keep the idea, fix the code): in `StripTopGold` (player.cpp 2804-2808), when the excess does not fit (`GoldAutoPlace` returns false) and the hand is full and `ActiveItemCount + 1 >= MAXITEMS` (2806), the `continue` skips the drop (2808). The excess is then never placed and never dropped. Not run. fix: drop the excess on the ground whatever the item count, or refuse the cap change until it can be placed.
- Atomicity is on the paste only. `ReorganizeInventory` is all-or-nothing only through its rollback, which is defective above. The gold top-off in `AddGoldToInventory` is not atomic: it changes piles one by one and returns the remainder.
- Gold cap is a per-player value that changes with equipment (items.cpp 2785-2787). Frankendom has equipment slots, so an equip that changes a stack cap needs the same strip rule as `StripTopGold`. The donor's rule is: place the excess with `GoldAutoPlace`, else drop it on the ground if the item count allows (player.cpp 2804-2808).
- Footprint sizes are read from cursor art (2292-2297). Frankendom's bag sizes should be data fields in the catalogue, not art measurements.
- No bank or stash in this function set: `TransferItemToStash` (inv.cpp 1624) exists and was not read (header line only).
- Phone layout: inventory drawing (`DrawInv`, 1184) and the cursor are the desktop UI. The slot size on a 375 px phone is not in this code.

Reuse tag: rewrite-from-idea (Sustainable Use License 1.0: restricted; clean-room only)
Brief rule served: 1 (one ledger: a move is one check and one write, or a refusal); rules 7-9 n/a

Best transferable idea: a move onto a grid is decided over the whole footprint first (empty = drop, one item = swap, two = refuse) and written only after that check, so a refused move leaves the hand and the grid untouched.

Decision (proposed): adapt - keep the footprint check, the one-for-one swap and the all-or-nothing repack; fix the rollback count; do not copy the donor's per-size scan orders or its cell encoding.
Acceptance: a server test asserts that a move onto two different items returns the held item to the hand unchanged and writes no cell, that a move onto exactly one item swaps the two and leaves the grid with no stale cells, and that a repack that fails leaves the grid and the item list identical to their state before the call; on a 375 px phone, the drag target shows as a footprint outline that turns red when the move would be refused.
