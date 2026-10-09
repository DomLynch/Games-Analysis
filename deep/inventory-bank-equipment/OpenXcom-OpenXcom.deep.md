# OpenXcom-OpenXcom (inventory-bank-equipment, cell 9)

Donor: /mnt/frankendom-donors/OpenXcom-OpenXcom/src/Battlescape/Inventory.cpp | Licence: GPL-3 | C++ | symbol Inventory::moveItem / fitItem
Symbol check: (verified: `moveItem` at 300, `fitItem` at 951). The fit-test helpers `overlapItems` (355) and `canBeStacked` (990) and the grid test `RuleInventory::fitItemInSlot` (`src/Mod/RuleInventory.cpp` 187-224) and `RuleInventory::getCost` (231-236) were read as well.

## 1. Mechanism

- Slots are typed. Each `RuleInventory` is a hand, the ground, or a grid of cells (`RuleSlot` x and y). An item has a width and height in cells.
- `fitItemInSlot` (RuleInventory.cpp 187-224): a hand always fits; the ground fits when every cell of the item block is inside the visible ground page (width and height derived from a 320 by 200 screen minus the slot origin, with a page offset for x); a grid slot fits when every cell of the item's width-by-height block is a defined slot cell.
- `fitItem` (951-982) scans candidate anchors row by row over the slot grid's bounding box. At each anchor it checks `overlapItems` (355-378, no occupied cell in the slot), then `fitItemInSlot`. If it fits and either time units are switched off (`!_tu`) or the unit can pay (`spendTimeUnits` of the slot-to-slot cost from `getCost`, 231-236: zero within the same slot, otherwise a table lookup with no missing-key check), the item moves there, the sound plays and the scan stops. If the unit cannot pay, the warning STR_NOT_ENOUGH_TIME_UNITS is set and the scan continues to the next anchor.
- `moveItem` (300-343) applies the move: a null target removes the item (ammo spent, or removed from the ground tile); a move from the ground or from nothing picks the item onto the unit; a move to the ground drops it on the tile. A moved unconscious unit is repositioned (to the unit's tile on drop to the ground, off the map on pickup). Pickup also clears the item's turn flag. The slot, anchor x and anchor y are always set for a non-null target.
- `canBeStacked` (990-1013) is the equality test for merging two items: same rules, either both without ammo or both with the same ammo type and quantity, neither set to explode, neither a unit (corpse or unconscious body), same medkit charges (painkiller, heal, stimulant).
- Inputs: item, target slot, anchor, time units. Outputs: a placed item, time units spent, or a warning.
- Tick: the move paths read here are per player action (drag or click); other `spendTimeUnits` sites in the file (L587-833) were not opened.

## 2. Key functions

- `Inventory::moveItem`: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Battlescape/Inventory.cpp` lines 300-343. Applies a slot move; drops, picks up, vanishes ammo.
- `Inventory::fitItem`: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Battlescape/Inventory.cpp` lines 951-982. First-fit scan over anchors; time-unit cost; move on success.
- `Inventory::overlapItems`: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Battlescape/Inventory.cpp` lines 355-378. Occupancy test in a slot or on the ground tile.
- `RuleInventory::fitItemInSlot`: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Mod/RuleInventory.cpp` lines 187-224. Shape test against the slot grid.
- `Inventory::canBeStacked`: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Battlescape/Inventory.cpp` lines 990-1013. Stack equality key.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| First-fit scan over anchors for a block shape in a slot grid | slot geometry per inventory (theirs, data) |
| Per-move time cost from slot to slot; zero within one slot | cost table per slot pair (theirs, data) |
| Move = remove from old place, set new slot and anchor; side effects by slot type | slot types: hand, ground, grid (theirs) |
| Stack only when every identity field matches | ammo, fuse, corpse and charge fields (theirs) |
| Ground placement bounded by the screen area | 320 by 200 screen area and cell size (theirs) |

## 4. TypeScript sketch

simplified: the sketch has no hand or ground special cases (a hand always fits; the ground uses a paged screen area), takes the slot's maximum anchors as arguments, returns null instead of a warning when time units are short, and does not spend them or move the item; stacking omits the ruleset, ammo-quantity and medkit-charge checks and treats any unit as a corpse flag.
```ts
// Licence: GPL-3 (donor). CLEAN-ROOM sketch: written from the mechanism description, not a translation of donor lines.
interface Cell { x: number; y: number; }
interface Slot { id: string; cells: Set<string>; costTo: Map<string, number>; }   // cells as "x,y" keys
interface Placed { slot: string; x: number; y: number; w: number; h: number; }

// Shape test: every cell of the w by h block must be a defined cell of the slot.
function shapeFits(slot: Slot, x: number, y: number, w: number, h: number): boolean {
  for (let dx = 0; dx < w; dx++) for (let dy = 0; dy < h; dy++) {
    if (!slot.cells.has(`${x + dx},${y + dy}`)) return false;
  }
  return true;
}

// Occupancy test: no placed item in this slot may share a cell with the block.
function occupied(placed: Placed[], slot: string, x: number, y: number, w: number, h: number): boolean {
  return placed.some(p => p.slot === slot &&
    p.x < x + w && x < p.x + p.w && p.y < y + h && y < p.y + p.h);
}

// First fit: scan anchors row by row; take the first anchor that fits and that the time budget can pay for.
function fit(slot: Slot, from: string, placed: Placed[], w: number, h: number, tu: number, maxX: number, maxY: number): { x: number; y: number; cost: number } | null {
  const cost = from === slot.id ? 0 : (slot.costTo.get(from) ?? 0);
  for (let y = 0; y <= maxY; y++) for (let x = 0; x <= maxX; x++) {
    if (occupied(placed, slot.id, x, y, w, h) || !shapeFits(slot, x, y, w, h)) continue;
    if (tu < cost) return null;   // fits, but cannot be paid for
    return { x, y, cost };
  }
  return null;
}

// Stack equality: same identity fields, nothing that would make them behave differently.
function canStack(a: { kind: string; ammo: string | null; fuse: number; corpse: boolean }, b: typeof a): boolean {
  return a.kind === b.kind && a.ammo === b.ammo && a.fuse === -1 && b.fuse === -1 && !a.corpse && !b.corpse;
}
```

## 5. Lands in

- Target: src/fight/gear-room.ts (today: src/gear-room.ts, moving) for the slot and shape rules, and src/loot-claims.ts for what a player holds (both named from sibling notes, not opened here). Feature-map: inventory and bank (the one-ledger rule applies). Checklist: row 15 (gear dressing: slot-match rule and the ten-slot map, not a grid) and row 21 (catalogue fields: item width and height would be new fields).
- Reuse tag: rewrite-from-idea
- Brief rule served: one-character, one-ledger rule (server inventory is the authority); rules 7-9 n/a

## 6. Gaps and risks

- The donor is a battle UI and sim with direct mutation. There is no server check; the move is applied where it is called. Under one-character/one-ledger, a move must be a server request that the server validates.
- Time units are a battle action economy. Frankendom has no equivalent for moving gear (stamina is a fight-only resource, row 3); the cost table should be dropped, not mapped onto stamina.
- The grid shape test is per item rectangle. Equipment with odd shapes is covered; stackable goods are handled by the stack key, not by the grid.
- `fitItem` spends time units immediately before `moveItem`, and `moveItem` has no failure path (it returns void), so there is no refund case in this function. A server version must still make the spend and the slot write one atomic ledger step.
