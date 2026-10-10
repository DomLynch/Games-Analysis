# OpenDiablo2-OpenDiablo2 (inventory-bank-equipment, cell 9)

Donor: `/mnt/frankendom-donors/OpenDiablo2-OpenDiablo2/d2game/d2player/inventory_grid.go` | Licence: GNU GPL version 3 (`LICENSE`, line 2 "Version 3, 29 June 2007"; copyleft) | Go | symbol `ItemGrid.add`

Checked: Read in full: `inventory_grid.go` (283 lines: `NewItemGrid`, `Add`, `add`, `canFit`, `Set`, `set`, `Remove`, `GetSlot`, `ChangeEquippedSlot`, render helpers). Read in full: `move_gold_panel.go` (209 lines) and `equipment_slot.go` (46 lines). Read: `inventory.go` 150-250 (the load path and the gold button; the tooltip and hover code, lines 1-150 and 250-373, not read), `inventory_loader.go` 1-90 (grid and box parsing; the rest of the slot table not read), `inventory_record.go` 1-80, `inventory_item_misc.go` (all). Grep: `Set(`, `Remove(`, `.Columns`, `.Rows`, `stash` across `d2game`, `d2common`, `d2core`. Confidence: high on the grid placement path and the three defects I list; the bank, stacking and move parts are absent, not hidden. Not read: where the item footprints (`InventorySizeX/Y`) are loaded from item records (the struct only holds them), `inventory_item_armor.go` and `inventory_item_weapon.go` beyond the grep line, the item-record loaders. The hint file `d2common/d2enum/inventory_item_type.go` is an enum (item, weapon, armour) and holds no mechanism. camera_scope: n/a.

Best transferable idea: Give each item a w x h cell footprint and place it first-fit in a row-major scan with a half-open overlap test, and make a multi-item add all-or-nothing.

Decision (proposed): adapt - take the footprint grid, the first-fit scan and the overlap test; fix the three defects in the sketch (flush placement refused, bounds in pixels instead of cells, add not all-or-nothing); reject the gold-panel stub as written (its amount is not bounded).
Acceptance: A server test asserts that a 2x1 item fits flush against a 1x1 at its right without a gap; a placement that runs past the last column is refused; a batch of three items into a pack with two free cells places none and leaves the pack list identical to before.

## 1. Mechanism

- Footprint: each item reports a width and height in grid cells (`InventoryGridSize`, `inventory_item_misc.go` 32-33) and a stored slot (`InventoryGridSlot`). The item type fixes the footprint; the grid holds the placed list.
- Grid geometry comes from the layout table, one row per inventory class: the box edges `gridLeft`..`gridBottom` (`inventory_loader.go` 24, 29: width = right - left, in screen pixels), the cell counts `gridY` (rows, line 37) and `gridX` (columns, line 38), and the cell size `gridBoxWidth` (line 39).
- `NewItemGrid` sets the grid's width and height from the box, not from the cell counts (`inventory_grid.go` 49-50), and offsets the origin by `Rows x cellPadding` (52). So the placement bounds are pixel values (see defect 2).
- `Add` (121-138) places each item in order. A failed item sets `errorInventoryFull` and breaks. Items placed before the failure stay placed (130). It then loads sprites regardless. Its only caller (`inventory.go` 189) logs "could not add items to the inventory" (191) and carries on.
- `add` (170-184): for y from 0 to the height, for x from 0 to the width, the first `canFit` wins; `set` writes the slot. The comment (168-169) says this scan is "at most a hundred or so cells" (true only if the bounds are cell counts).
- `canFit` (187-206): refuse if x + w > width or y + h > height (189). Then for each placed item, refuse if `x+w >= slotX && x < slotX+cw && y+h >= slotY && y < slotY+ch` (197-200). The first comparison and the vertical one use `>=`, which is the defect in section 6.
- `set` (219-224): writes the slot, appends to the list, loads the sprite. `Remove` (227-240) is an in-place filter, with no caller in `d2game/d2player`. `GetSlot` (99-110) is the correct half-open point test (104).
- Equipment: `ChangeEquippedSlot` (113-117) sets an item into a slot with no check that the item fits the slot. The equipment slots are fixed boxes (`equipment_slot.go` 9-46, built from the record's slot table).

## 2. Key functions

- `add` and `canFit`: `/mnt/frankendom-donors/OpenDiablo2-OpenDiablo2/d2game/d2player/inventory_grid.go` 170-206. The placement core.
- `Add`: `/mnt/frankendom-donors/OpenDiablo2-OpenDiablo2/d2game/d2player/inventory_grid.go` 121-138. The batch wrapper (not atomic).
- `NewItemGrid`: `/mnt/frankendom-donors/OpenDiablo2-OpenDiablo2/d2game/d2player/inventory_grid.go` 40-63, with the layout parse at `/mnt/frankendom-donors/OpenDiablo2-OpenDiablo2/d2core/d2records/inventory_loader.go` 23-40.
- Load path and the gold button: `/mnt/frankendom-donors/OpenDiablo2-OpenDiablo2/d2game/d2player/inventory.go` 150-197 and 219-228.
- Gold panel: `/mnt/frankendom-donors/OpenDiablo2-OpenDiablo2/d2game/d2player/move_gold_panel.go` 130-177.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Footprint w x h in cells; first fit, row-major | Footprint per item type (not read: the item-record loaders) |
| Overlap test on half-open rectangles | None (a rule) |
| Bounds in cells: refuse if x + w > cols or y + h > rows | Columns and rows from the layout table: `gridX`, `gridY` (theirs: `inventory_loader.go` 37-38) |
| Cell size and origin for drawing | `gridBoxWidth` (line 39), box edges `gridLeft`..`gridBottom` (lines 24-27) |
| All-or-nothing batch add (the sketch's form) | None; the donor's `Add` is not all-or-nothing (121-133) |

## 4. TypeScript sketch

simplified: The sketch keeps the donor's footprint model, its row-major first-fit scan and its point-in-cell lookup. It fixes three defects: the overlap test is half-open (the donor's `>=` in lines 197 and 199 is replaced by strict comparisons), the bounds are cell counts (the donor uses pixel width and height, lines 189 and 49-50), and the batch add is all-or-nothing on a working copy (the donor's `Add` stops at the first failure and keeps the items already placed). It also adds `moveItem`, because the donor has no move path (its `Set` and `Remove` have no callers in `d2game/d2player`). It omits sprites, rendering, the screen-to-slot mapping, the equipment slots, the gold panel, the item-type table and the error text of `Set`. The sketch is written from the mechanism; GPL-3.0 is copyleft, so this is clean-room. Checked on the VPS: `tsc --noEmit --strict --target es2020` exit 0, and a node run of 8 cases (flush placements accepted, overlap and column overflow refused, the batch rollback, a refused move leaves the grid unchanged): all as expected.

```ts
interface Footprint { w: number; h: number; }
interface Placed extends Footprint { id: string; x: number; y: number; }
interface Grid { cols: number; rows: number; items: Placed[]; } // cols and rows are CELL counts

// Half-open cell rectangles: [x, x+w) x [y, y+h). Touching edges do not overlap.
function overlaps(x: number, y: number, fp: Footprint, b: Placed): boolean {
  return x < b.x + b.w && x + fp.w > b.x && y < b.y + b.h && y + fp.h > b.y;
}

function canFit(g: Grid, x: number, y: number, fp: Footprint): boolean {
  if (x < 0 || y < 0) return false;
  if (x + fp.w > g.cols || y + fp.h > g.rows) return false; // bounds in cells
  return !g.items.some((it) => overlaps(x, y, fp, it));
}

// First fit in row-major order (top-left first), as the donor's add() scans.
function firstFit(g: Grid, fp: Footprint): { x: number; y: number } | null {
  for (let y = 0; y < g.rows; y++) {
    for (let x = 0; x < g.cols; x++) {
      if (canFit(g, x, y, fp)) return { x, y };
    }
  }
  return null;
}

// All-or-nothing: place every item on a working copy; return the new grid only if all fit.
function addAll(
  g: Grid,
  batch: { id: string; fp: Footprint }[],
): { ok: true; grid: Grid } | { ok: false; failedId: string } {
  const work: Grid = { cols: g.cols, rows: g.rows, items: [...g.items] };
  for (const b of batch) {
    const at = firstFit(work, b.fp);
    if (!at) return { ok: false, failedId: b.id };
    work.items.push({ id: b.id, x: at.x, y: at.y, w: b.fp.w, h: b.fp.h });
  }
  return { ok: true, grid: work };
}

// The item whose footprint covers cell (x, y), or null.
function cellItem(g: Grid, x: number, y: number): Placed | null {
  return g.items.find((it) => x >= it.x && x < it.x + it.w && y >= it.y && y < it.y + it.h) ?? null;
}

// Move = lift the item, then place it at the target. Works on copies, so a refused move leaves the grid untouched.
// simplified: the donor has no move path (its Set and Remove have no callers in d2game/d2player); this function is added to show the atomic form.
function moveItem(g: Grid, id: string, to: { x: number; y: number }): Grid | null {
  const it = g.items.find((p) => p.id === id);
  if (!it) return null;
  const lifted: Grid = { cols: g.cols, rows: g.rows, items: g.items.filter((p) => p.id !== id) };
  if (!canFit(lifted, to.x, to.y, it)) return null;
  return { ...lifted, items: [...lifted.items, { ...it, x: to.x, y: to.y }] };
}

export {};
```

## 5. Lands in

- TARGET `src/fight/loot.ts` (proposed: the pack grid and placement rules sit with the loot ledger; the Frankendom repo was not read for this cell, so the path is a proposal).
- Parity-checklist row 18 (loot roll and XP award), sub-line for the pack: footprint placement, all-or-nothing add.
- Reuse tag: rewrite-from-idea (GPL-3.0, copyleft: clean-room, shape only)
- Brief rule served: 1 (one ledger: the placed list lives in the engine and a move is one validated commit); rules 7-9 n/a

## 6. Gaps and risks

- Defect 1, overlap test (`inventory_grid.go` 197, 199): `>=` refuses a legal flush placement to the left of or above an existing item. Checked by transcribing `canFit` into node (not the donor build): a 2x1 beside a 1x1 at x=2 is refused by the donor and accepted by the fixed test. Fix: strict half-open comparisons (sketch `overlaps`).
- Defect 2, units (`inventory_grid.go` 49-50, 172, 189): the grid bound is the pixel width and height of the box, not the column and row counts. `Columns` is parsed (`inventory_loader.go` 38) and never read; `Rows` is read only as origin padding (52). A 280-pixel-wide box allows 280 columns, so placement can run past the visible grid. The "hundred or so cells" comment (169) is false for this reason. Fix: take cols and rows from the layout table.
- Defect 3, batch atomicity (`inventory_grid.go` 121-138): a failed batch leaves the earlier items placed, and the caller only logs (`inventory.go` 189-191). Fix: all-or-nothing add (sketch `addAll`).
- Defect 4, gold stub (`move_gold_panel.go` 139): `action()` subtracts the typed amount with no bound check, so an amount above the gold held makes it negative. The increase and decrease keys are bounded (152, 164), the typed value is not. The drop or deposit step is a placeholder (137). Do not adopt this as written; a server-side gold move needs its own bound and one ledger.
- Gap, equipment: `ChangeEquippedSlot` (`inventory_grid.go` 113-115) has no check that an item belongs in the slot. Frankendom's gear dressing (row 15) needs that check in the engine, not in the UI.
- Gap, stacking: none. Each item is one entry, and gold is one integer. Stacking is NONE in this donor.
- Gap, bank and stash: none. Deposit and withdraw strings are commented out (`move_gold_panel.go` 172-173; `inventory.go` 127). The only stash in the donor's code is an object-record description ("Your Private Stash (267)", `object_lookup_record_data.go` 960). Bank is NONE in this donor.
- The load path is hard-coded test items (`inventory.go` 157, 167, 186), not a loot path. Nothing here is a loot roll.
- Client-only: the grid, its drawing and the mouse mapping are the UI. Frankendom's rule (the Pit and zones are clients; kills and item grants are server-verified) means the placement check must run on the server, with the client only sending a requested cell.
