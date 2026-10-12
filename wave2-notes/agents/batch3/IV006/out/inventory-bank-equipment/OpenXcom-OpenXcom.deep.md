# OpenXcom-OpenXcom (inventory-bank-equipment, cell 9)

Donor: /mnt/frankendom-donors/OpenXcom-OpenXcom/src/Battlescape/Inventory.cpp (with src/Mod/RuleInventory.cpp/.h and bin/standard/xcom1/inventories.rul) | Licence: GNU GPL v3 as read (LICENSE.txt: "Version 3, 29 June 2007") | C++ | symbol Inventory::moveItem, Inventory::mouseClick, Inventory::canBeStacked, Inventory::fitItem, Inventory::unload, RuleInventory::getCost

Checked: opened Inventory.cpp 271-300, 300-410, 509-735, 805-875, 893-925, 945-1042; RuleInventory.cpp 187-236; RuleInventory.h 52; bin/standard/xcom1/inventories.rul (all 140 lines, 9 slot entries); LICENSE.txt. Not read: Inventory.cpp 411-508 (selection and hover), 876-892 and 926-944 (the middle of arrangeGround), BattleItem::occupiesSlot, BattleUnit::spendTimeUnits, RuleInventory.cpp 135-186 (mouse hit test), bin/standard/xcom2/inventories.rul. Candidates checked for the topic: Inventory.cpp (move, pick, stack, ammo, fit), RuleInventory.cpp (cost and fit), the ruleset table. Confidence high for the move, stack and quick-move rules; medium for the ground layout. Camera: not a camera topic.

Best transferable idea: Describe every equipment slot and its move cost as data, and commit each item move as check-fit, then spend, then move, so a failed check or spend leaves the item where it was.
Decision (proposed): adapt — keep the slot table as data with per-pair move costs, the check-spend-commit order and the ctrl quick-move fallback list; change the time-unit currency to a server swap cost in ms (Frankendom fights are real-time), move the hard-coded 15 and 8 into data, and make a missing cost pair a load error instead of an unchecked lookup.
Acceptance: a server test sends a quick-move of a dropped potion into a bag with no free cell; the server returns a rejection, the potion stays on the ground, and the swap cost is not charged.

## 1. Mechanism
An inventory is a set of named slots, each a RuleInventory: a hand (any item fits), a fixed grid (belt, legs, shoulders, backpack; the grid is a list of cells that an item's box must cover), and the ground (a grid of anchor cells, not owned by anyone). The data file gives each slot an x and y on screen, its cell list and a cost table: the cost to move an item from this slot to each other slot. Every item move goes through Inventory::moveItem, which sets the item's slot and cell. Dropping with the mouse (Inventory::mouseClick, drop branch): find the slot under the cursor, check the item's box is free (overlapItems) and fits the slot (fitItemInSlot), then spend time units by the cost from the source slot to the target slot, then call moveItem. If the spend fails, the item is not moved and the warning shows. Ground stacks: identical items (canBeStacked) dropped onto the same anchor cell share it, and a per-cell counter (_stackLevel) goes up by one and is drawn as the stack number. The counter is the count of separate BattleItem records on that cell; items are not merged into one record. Ctrl-click (quick move, pick branch): from the ground, the item goes to a preferred slot by battle type (firearm to the right hand, melee and similar to the left hand, large items to the backpack, others to the belt), and if that fails it tries every other non-ground slot in turn (fitItem). The ground counter is lowered before the attempt and raised back if no slot took the item. From a fixed slot, ctrl-click moves the item to the ground at the cost from that slot. Ammo: a weapon takes a compatible ammo item for a fixed 15 time units (drop branch, weapon target); unload takes a fixed 8 time units, needs both hands free, and moves ammo to the left hand and the weapon to the right hand.

## 2. Key functions
- Inventory::moveItem (Inventory.cpp:300-353): the one place an item's slot changes; ground-to-carried and carried-to-ground also change the tile's item list and the unit's ownership.
- Inventory::mouseClick, ctrl pick (Inventory.cpp:530-590): quick-move; preferred slot by battle type (case BT_FIREARM at 540); if the target is not ground, the ground counter is lowered (564) and restored on failure (582); if the target is ground, the item moves to ground at the slot's cost (590).
- Inventory::mouseClick, drop (Inventory.cpp:630-660): canStack at 630; overlap and fit check at 635; cost spend at 637; ground counter raised at 642; stacking onto a matching item at 656.
- Inventory::mouseClick, weapon target (Inventory.cpp:689-692): fixed 15 time units; the ammo item is removed from the list (691) and attached to the weapon (692).
- Inventory::unload (Inventory.cpp:805-850): checks ammo, free hands, then spends 8 time units (833) before the two moveItem calls (835, 837).
- Inventory::fitItem (Inventory.cpp:951-983): scans cells up to the slot's max x and y; for each cell that is free and fits, spends the cost and places the item; the first success wins.
- Inventory::canBeStacked (Inventory.cpp:990-1010): same ruleset (995), not armed (1005), not a unit (1007); plus same ammo type and quantity, and same medkit charges (read, no receipt).
- RuleInventory::getCost (RuleInventory.cpp:231-236): looks up the cost for the target slot id with no check for a missing key.
- RuleInventory::fitItemInSlot (RuleInventory.cpp:187-230): hand returns true (189); fixed slot counts cells covered by the item box (212) and needs all of them.
- Callers: moveItem is called from Inventory.cpp only: mouseClick (590, 639, 656, 691, 723), unload (835, 837) and fitItem (970). I read each of those call sites; I did not grep the rest of the donor for other callers.

## 3. Numbers vs mechanism
- SLOT_W = 16 px per cell (RuleInventory.h:52); used for hit tests and drawing, not for the rule.
- Move costs are per (from, to) pair from the data table: ground to backpack 20 (inventories.rul:7), backpack to belt 12 (inventories.rul:134), belt to backpack 16 (inventories.rul:52). Costs are asymmetric (belt to ground 6, ground to belt 12).
- Fixed time units in code, not data: ammo load 15 (Inventory.cpp:689), ammo unload 8 (Inventory.cpp:833).
- The backpack is a 3x3 cell list (inventories.rul:120 onwards; read in full); the belt is 6 cells in a 4x2 box (a non-rectangular cell list); the hands are one cell each (hand slots accept any item).

## 4. TypeScript sketch
simplified: Replaces time units with an abstract cost (the donor spends time units). Keeps the donor's move order (check fit, spend, move). Omits the ground layout (the donor's arrangeGround), the medkit and fuse fields in canBeStacked, the tile item list, unit ownership and unconscious-unit positions, the sounds and the drawing. Ground fit is unbounded here. The belt is a full 4x2 rectangle in the sketch but a 6-cell list in the data. Quick equip tries 3x3 cells per slot, a bound the donor takes from the slot cell list. Ground counters are derived from the items, not stored as a separate counter; the donor keeps a counter and restores it on failure, which this sketch avoids by committing only on success.

```ts
type SlotId = "ground" | "rightHand" | "leftHand" | "belt" | "backpack";

interface Cell { x: number; y: number; w: number; h: number }

interface Item extends Cell {
  rule: string;            // donor: getRules() identity
  slot: SlotId;
  ammo?: { rule: string; qty: number };
  fuse: number;            // -1 = not armed
  isCorpse: boolean;       // donor: getUnit() != 0
}

interface Unit { tu: number; items: Item[] }

// Data half: per-pair move cost table (mirrors inventories.rul costs). Missing pair = load error, not UB.
const MOVE_COST: Partial<Record<SlotId, Partial<Record<SlotId, number>>>> = {
  ground: { backpack: 20, belt: 12, leftHand: 8, rightHand: 8 },
  rightHand: { backpack: 14, belt: 8, ground: 2, leftHand: 4 },
  leftHand: { backpack: 14, belt: 8, ground: 2, rightHand: 4 },
  belt: { backpack: 16, ground: 6, leftHand: 4, rightHand: 4 },
  backpack: { belt: 12, ground: 10, leftHand: 8, rightHand: 8 },
};

// Fixed-slot cells (donor: RuleInventory slots). Ground is unbounded in this sketch.
const SLOT_CELLS: Record<SlotId, Cell[] | "ground"> = {
  ground: "ground",
  rightHand: [{ x: 0, y: 0, w: 1, h: 1 }],
  leftHand: [{ x: 0, y: 0, w: 1, h: 1 }],
  belt: [{ x: 0, y: 0, w: 4, h: 2 }],
  backpack: [{ x: 0, y: 0, w: 3, h: 3 }],
};

function cost(from: SlotId, to: SlotId): number {
  const c = MOVE_COST[from]?.[to];
  if (c === undefined) throw new Error(`no move cost ${from} -> ${to}`);
  return c;
}

function overlaps(a: Cell, b: Cell): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

// Donor canBeStacked: same rule, same ammo (type and quantity), not armed, not a corpse.
function canBeStacked(a: Item, b: Item): boolean {
  const ammoKey = (i: Item) => (i.ammo ? `${i.ammo.rule}:${i.ammo.qty}` : "");
  return a.rule === b.rule && ammoKey(a) === ammoKey(b) && a.fuse === -1 && b.fuse === -1 && !a.isCorpse && !b.isCorpse;
}

// Fit check: the box must sit inside a fixed slot's cells and not overlap another item there.
function fits(unit: Unit, to: SlotId, item: Item, x: number, y: number): boolean {
  const cells = SLOT_CELLS[to];
  const box: Cell = { x, y, w: item.w, h: item.h };
  if (cells !== "ground") {
    for (let dx = 0; dx < item.w; dx++) {
      for (let dy = 0; dy < item.h; dy++) {
        if (!cells.some((c) => x + dx >= c.x && x + dx < c.x + c.w && y + dy >= c.y && y + dy < c.y + c.h)) return false;
      }
    }
  }
  return !unit.items.some((o) => o !== item && o.slot === to && overlaps(o, box));
}

// Atomic move: check fit, then spend time units, then commit. On any failure nothing changes.
function moveItem(unit: Unit, item: Item, to: SlotId, x: number, y: number): boolean {
  if (!fits(unit, to, item, x, y)) return false;
  const c = to === item.slot ? 0 : cost(item.slot, to);
  if (unit.tu < c) return false;
  unit.tu -= c;
  item.slot = to;
  item.x = x;
  item.y = y;
  return true;
}

// Ground pile: items sharing an anchor cell; the displayed count is derived, not stored.
function pileCount(unit: Unit, x: number, y: number): number {
  return unit.items.filter((i) => i.slot === "ground" && i.x === x && i.y === y).length;
}

// Quick equip (donor: ctrl-click): try the preferred slot first, then every other fixed slot.
function quickEquip(unit: Unit, item: Item, preferred: SlotId): boolean {
  const fixed: SlotId[] = ["rightHand", "leftHand", "belt", "backpack"];
  const order: SlotId[] = [preferred, ...fixed.filter((s) => s !== preferred)];
  for (const to of order) {
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        if (moveItem(unit, item, to, x, y)) return true;
      }
    }
  }
  return false; // nothing changed: the item is still where it was
}

export {};
```

Typecheck: copied to the VPS /tmp and run `npx -p typescript tsc --noEmit --strict --target es2020` there: passed with no errors.

## 5. Lands in
Target: origins/server/inventory-slots.ts (proposed new module; I did not read the Frankendom repo). Parity row 18 (loot roll and XP award): the pickup, quick-move and bag step that hands a dropped item to a player. Not row 15 (gear dressing): this donor is item placement, not appearance.

## 6. Gaps and risks
- Time units are the donor's currency. Frankendom fights are real-time. Map to a server swap cost in ms or a stamina cost; do not port TU.
- Stacks are not merged records in this donor: a ground stack is N separate items sharing a cell, with a count. Frankendom needs one record with a count and a cap (see OpenTTD-OpenTTD: merge with a cap). Do not copy the pile model; it breaks the one-ledger rule for loot.
- Server-verified: in the code I read, every check runs on the client's mouse path; I did not read any network path (none was looked for). In Frankendom the server must run the check, spend and commit as one transaction, and the client only shows the rejection.
- Hard-coded costs (15 and 8) are a defect: they live in code, not data. Fix: move them to item or slot data, with the same table as the slot costs.
- The cost lookup has no missing-key check (RuleInventory.cpp:235). Fix: validate the table at load and fail loudly; never use an unchecked find.
- The ground counter is stored separately and restored by hand on failure (Inventory.cpp:564 and 582). Fix: derive the count from the items, as the sketch does, so there is no counter to restore.
- Bank: no bank slot in this donor. Equipment has hands, belt, legs, shoulders and backpack (inventories.rul); legs and shoulders are not in the sketch.
- MAX_ATTACKERS = 3 does not apply to inventory.
- The ground layout (arrangeGround middle, not read) decides where dropped loot lands on screen; not read, so no claim about it.

Reuse tag: reuse-first: the OpenTTD merge cap (OpenTTD-OpenTTD cell 9) covers stack merging; this note covers the slot-and-move side. No prior Frankendom inventory PR was checked (not searched in our repo).
Brief rule served: rules 1-4 and the anti-strictness rules (judged the idea; read the real code and the data table; receipts verified; sketch typechecked; unread parts marked).
