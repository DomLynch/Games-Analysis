# luanti-org-luanti (inventory-bank-equipment, cell 9)

Donor: `/mnt/frankendom-donors/luanti-org-luanti/src/inventory.cpp` (with `src/inventory.h`, `src/inventorymanager.cpp`, `builtin/game/item.lua`) | Licence: LGPL-2.1-or-later for the code (`src/inventory.cpp` and `src/inventorymanager.cpp` line 2: SPDX LGPL-2.1-or-later; README badge "LGPLv2.1+"; `COPYING.LESSER` is the LGPL 2.1 text; `builtin/game/item.lua` has no licence header; `LICENSE.txt` covers textures and sounds only, CC BY-SA 3.0) | C++ and Lua | symbols `ItemStack::addItem`, `InventoryList::moveItem`, `IMoveAction::apply`, `core.handle_node_drops`

Checked: The hint file `builtin/game/item.lua` was opened in the ranges 383-399 (`item_pickup`) and 462-488 (`handle_node_drops`). The mechanism is in C++: `src/inventory.cpp` 401-526 (ItemStack add, fit, stacks-with), 700-774 (list add and room), 826-890 (move and move-somewhere helper); `src/inventory.h` 60-125; `src/inventorymanager.cpp` 187-380 (permission callbacks, count and swap rules, move-somewhere loop) and 380-520 (the move and the infinite-source restore). Not read: `inventorymanager.cpp` 530-617 (undo record), 114-186 (constructors and callback wiring), `builtin/game/item.lua` 41-134 (`get_node_drops`, the drop table, which belongs to the loot-drops cell), 490-614 (`node_dig`), 401-450 (eat), `src/gui` (the client menus) and `android/` (touch). Confidence: high on the stack add and fit, the list add order, the move count and the permission and swap rules; medium on the drop path (only the Lua handler read). camera_scope: not applicable (not a camera cell).

Best transferable idea: a move is decided before it happens: each side states how many units it accepts, the move takes the smallest, a swap happens only when the destination takes nothing and both directions accept whole stacks, and whatever does not fit goes back to the source.
Decision (proposed): adapt - keep the two-sided permit with the minimum count, the swap rule and the leftover-to-source step; replace the Lua callbacks with typed server rules, and enforce the stack max explicitly (the donor lets an empty slot take any count).
Acceptance: A server test: moving 10 units from a 20-stack into a slot of the same item with 5 units of room moves exactly 5, leaves 15 in the source and changes nothing else; a move onto a different item is refused (both slots unchanged) when the reverse side refuses the whole destination stack.

## 1. Mechanism

- Stack add, `ItemStack::addItem` (`inventory.cpp` 401-436). Four cases in order: an empty incoming item does nothing; an empty slot takes the whole incoming stack (409-411), with no stack max check; a different name or metadata is refused (name and meta compared, 412-416); a same kind with count at most the free space takes all (421); otherwise it takes the free space and returns the rest (425-430). `freeSpace` is the stack max minus the count, and 0 at or above the max (`inventory.h` 81-86).
- Fit, `ItemStack::itemFits` (`inventory.cpp` 438-475). The same case order, but it only reports: an empty slot reports that any count fits (449), and the leftover is returned through `restitem`.
- List add, `InventoryList::addItem` (`inventory.cpp` 700-737). Pass one fills existing non-empty slots in index order (708-716); pass two fills empty slots in index order (722-731). It returns the leftover. `roomForItem` (763-774) asks each slot with `itemFits` and returns true at the first slot that takes everything.
- Move, `InventoryList::moveItem` (`inventory.cpp` 849-890). Order: a same-slot move is a no-op; take `count` units from the source (or the whole slot when count is 0) (858-861); add them to the destination slot (863); subtract what did not fit from the moved count (868); put the leftover back into the source slot with `changeItem`, not `addItem`, "to allow oversized stacks" (871-872); if nothing moved and a swap is allowed, exchange the whole source slot with the destination slot (876-886). The swap moves the whole source stack, not the requested count (882-884).
- Permission, `IMoveAction::apply` (`inventorymanager.cpp` 232-520). The apply first decides the swap: `allow_swap` is true only when the destination slot takes none of the source stack (364-366) and the move is not part of a move-somewhere loop. When a swap is allowed, the checked count becomes the whole source stack (376-381). Then the limits: a same-list move asks `allowMove`; a cross-list move asks `allowPut` (the destination) and `allowTake` (the source) (385, 404-405). A swap also asks the reverse pair for the destination stack (388-400, 408-424). If a swap was expected but any limit refuses it, both counts are zeroed (400, 424), so nothing moves.
- Count. The move count is the smallest of the requested count, the source stack and each side's limit that is not -1 (432). Zero ends the apply with no change (from line 441). -1 marks an infinite source or destination: the stack is backed up (463) and restored afterwards (499-507), so the inventory is not changed by a creative or detached source.
- Move somewhere, `apply` with `move_somewhere` (270-323). The shift-click loop tries every non-empty destination slot first (307-310), then every empty one (312-315), applying the move to each slot until the count is used up. A slot that takes nothing is skipped (364-366).
- Drops and pickup, `builtin/game/item.lua`. `core.handle_node_drops` (462-488) gives each drop to the digger's "main" list with `add_item` (468). Any leftover is spawned as an item entity at the node with a random offset of plus or minus a quarter on each axis (479-485). `core.item_pickup` (383-399) runs the registered pickup callbacks first and then adds the item to the picker's "main" list, returning the leftover (396).

## 2. Key functions

- `ItemStack::addItem`: `/mnt/frankendom-donors/luanti-org-luanti/src/inventory.cpp` 401-436.
- `ItemStack::itemFits`: `/mnt/frankendom-donors/luanti-org-luanti/src/inventory.cpp` 438-475.
- `InventoryList::addItem`: `/mnt/frankendom-donors/luanti-org-luanti/src/inventory.cpp` 700-737.
- `InventoryList::moveItem`: `/mnt/frankendom-donors/luanti-org-luanti/src/inventory.cpp` 849-890.
- `IMoveAction::apply`: `/mnt/frankendom-donors/luanti-org-luanti/src/inventorymanager.cpp` 232-520 (permission and count, lines 364-445; move, 473; restore, 499-507).
- `core.handle_node_drops`: `/mnt/frankendom-donors/luanti-org-luanti/builtin/game/item.lua` 462-488.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Stack fit: free space is max minus count, zero at max (`inventory.h` 84-86) | The stack max is per item (set in item definitions, not read) |
| Two-pass list add: partial stacks, then empty slots (`inventory.cpp` 708, 722) | None |
| Move count is the minimum of the request, the source and each side's limit (`inventorymanager.cpp` 432) | -1 means an infinite side (432, 499, 504) |
| Drop jitter: plus or minus a quarter unit per axis (`item.lua` 481-482) | 0.25 units |

## 4. TypeScript sketch

simplified: one fixed stack max, enforced for empty slots too (the donor lets an empty slot take any count). The sketch does not use the donor's -1 infinite marker, the undo record, the client prediction or the move-somewhere loop. It computes the count before any change, so it has no take-then-put-back step (the donor takes, places, then returns the leftover). It keeps the donor's rule that a swap needs a destination that takes nothing, and it checks the whole stack for a swap (the donor's apply does the same by enlarging the checked count to the whole stack before it asks the permissions).

```ts
// Licence: LGPL-2.1-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
export {};

interface Stack { name: string; meta: string; count: number; stackMax: number; }
type Slot = Stack | null; // null = empty slot

// Units each side allows for this move (Infinity = no limit). The donor gets these from permission callbacks.
interface Permit {
  srcTake: number; // how many the source may give up
  dstPut: number;  // how many the destination may accept
  revTake: number; // reverse direction, used only for a swap: the destination item leaving its slot
  revPut: number;  // reverse direction, used only for a swap: the destination item entering the source slot
}

const sameKind = (a: Stack, b: Stack): boolean => a.name === b.name && a.meta === b.meta;

// Room for `count` units of `item` in `slot`. Stack max applies to an empty slot too (a sketch choice; the donor lets an empty slot take any count).
function roomFor(slot: Slot, item: Stack, count: number): number {
  if (slot === null) return Math.min(count, item.stackMax);
  if (!sameKind(slot, item)) return 0;
  return Math.min(count, Math.max(0, slot.stackMax - slot.count));
}

// Moves up to `want` units from src[si] to dst[di]. Returns the number of units moved (0 = nothing changed).
// Every limit is checked before any slot changes, so there is no take-then-put-back step.
export function applyMove(src: Slot[], si: number, dst: Slot[], di: number, want: number, permit: Permit, allowSwap: boolean): number {
  const s = src[si];
  if (s === null || (src === dst && si === di)) return 0;
  const d = dst[di];

  if (d !== null && !sameKind(d, s)) {
    // Swap: only the whole source stack, and only when both directions accept whole stacks.
    // The donor moves the whole source stack on a swap while checking only the requested count; this sketch checks the whole stack.
    const wholeStack = Math.min(want, s.count) === s.count;
    const allowed =
      allowSwap &&
      wholeStack &&
      permit.srcTake >= s.count &&
      permit.dstPut >= s.count &&
      permit.revTake >= d.count &&
      permit.revPut >= d.count;
    if (!allowed) return 0;
    dst[di] = s;
    src[si] = d;
    return s.count;
  }

  const count = Math.min(want, s.count, permit.srcTake, permit.dstPut, roomFor(d, s, want));
  if (count <= 0) return 0;
  if (d === null) dst[di] = { ...s, count };
  else d.count += count;
  s.count -= count;
  if (s.count === 0) src[si] = null;
  return count;
}
```

Typecheck: the block above, as `work/move-permit.ts`, passes `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (exit 0, run at `/tmp/iv016-move-permit.ts`).

## 5. Lands in

- TARGET `origins/inventory/bag.ts` (proposed new module, shared with the other two cells; the Frankendom repo is not on this box, so the path is a proposal and has not been checked against it). The move rule belongs in the engine so the server decides the count, not the client.
- Parity row 18 (loot roll and XP award): the pickup and move step that lands a loot award in a slot, and the overflow of a drop that does not fit.
- Reuse tag: rewrite-from-idea (LGPL-2.1-or-later; clean-room only)
- Brief rule served: one ledger (one move function decides every count before a change); server-verified counts (the permission limits are read on the server)

## 6. Gaps and risks

- Licence: LGPL-2.1-or-later. Clean-room only; the sketch is written from the mechanism and is not a translation.
- Oversized stacks by design. An empty slot accepts any count (`inventory.cpp` 409-411 and 449), and `moveItem` puts the leftover back with `changeItem` "to allow oversized stacks" (872). A stack above its max can therefore exist. This is useful for leftovers and bad for a hard cap. fix: if Frankendom wants a hard cap, check `stackMax` in the same place the fit is checked (the sketch's `roomFor`), and treat an oversized stack on load as an error to repair, not a state to keep.
- Swap is decided by the destination. A swap is considered only when the destination takes none of the source (`inventorymanager.cpp` 364-366). So a partial move onto a different item is not a partial move: it becomes a whole-stack swap if every limit allows it, and otherwise nothing moves. This is a rule to state in the spec, not a fault.
- Overflow to the ground is not a loot rule. `handle_node_drops` spawns any leftover on the node with a quarter-unit jitter (`item.lua` 481-485) and does not say who may pick it up or for how long. Frankendom's loot ownership (the owner window of the other cells) is a separate rule to design.
- Pickup callbacks come first (`item.lua` 386-391). A callback can change the item before it reaches the bag. Frankendom has no callback layer; keep the pickup rule as one server function.
- Phone. The engine has an `android/` folder and a touch build, but none of it was read; no phone inventory or loot presentation claim is made from this donor.
- Not read: the undo record, the client-side prediction, `get_node_drops` (the drop table), `node_dig`, and the client menus.

Reuse tag: rewrite-from-idea (LGPL-2.1-or-later; clean-room sketch)
Brief rule served: one ledger (one move function decides every count before a change); server-verified counts
