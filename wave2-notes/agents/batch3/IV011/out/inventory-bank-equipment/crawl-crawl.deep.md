# crawl-crawl (inventory-bank-equipment, cell 9)

Donor: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/items.cc` | Licence: GPL-2.0-or-later (read: `/mnt/frankendom-donors/crawl-crawl/LICENSE` line 7 "either version 2 of the License, or", and line 8 "(at your option) any later version") | C++ | symbol `move_item_to_inv` (pickup pipeline: `_put_item_in_inv`, `_merge_items_into_inv`, `_merge_stackable_item_into_inv`, `_place_item_in_free_slot`, `find_free_slot`, `items_similar`, `items_stack`)

Checked: Verified by reading the code, not by running it. The whole pickup path was read end to end: `move_item_to_inv` (items.cc 1803-1830), `_put_item_in_inv` (1749-1781), `_merge_items_into_inv` (2444-2514), `_merge_stackable_item_into_inv` (2034-2084), `is_stackable_item` / `items_similar` / `items_stack` (1551-1618), `_place_item_in_free_slot` (2390-2430), `find_free_slot` (1633-1712), the quantity helpers (406-428), and `room_in_inventory` (3492-3515). Constants from `defines.h` 40-41. Not read: `_assign_inventory_letter` (2299), `_merge_wand_charges`, `_merge_evokers`, the book/rune/gem helpers, `pickup_menu` and partial-pickup UI, and `auto_assign_item_slot`. Confidence high on the stack rule, the order of the pickup steps and the source decrement; medium on the slot letter detail (not read). Depth full for the stack-merge-place-decrement path. Hint file `tilereg-cmd.h` is a tile command list, not inventory logic (receipt on line 10). camera_scope: n/a (not a camera cell).

## 1. Mechanism

- One pickup is one call: `move_item_to_inv(obj, quant_got, quiet)` (1803). It calls `_put_item_in_inv` (1809). Only if the pack accepted (`actually_went_in`, 1812) does it fire the pickup event and then decrement the floor stack by `quant_got` (1824). The floor item is destroyed when the decrement reaches zero (`dec_mitm_item_quantity`, 412 and 426).
- Order of steps inside the pack side, as the code runs:
  (a) Clamp the quantity: if the request is <= 0 or larger than the floor stack, take the whole floor stack (1762-1763, repeated 2450-2451).
  (b) Special cases that never enter a slot: gold (2454), the shop voucher (2464), the Orb (2481), and also books, runes and gems (returns early in the same function). Gold has no mass.
  (c) Stack merge (2488-2489): if the item is stackable, scan the pack from slot 0 and take the first stack that `items_stack` accepts. Then: copy the floor inscription only if the pack copy has none (2048), add the picked quantity to the pack stack (2051), record it in `last_pickup` (2052), and on a consumable that became identified, reassign its letter (2063). The message is `old -> new (gained N)` when the slot changed (2071-2073).
  (d) Wand-charge and evoker merges come next in the donor (not read).
  (e) Capacity (2511-2512): if the item is gear and 52 gear slots are already in use, return false. This check happens only after the merge attempts, so a full gear pack still takes a stack that merges.
  (f) Placement (2514, then 2390-2430): `find_free_slot`, copy the item into the slot, set its quantity to `quant_got` (2401), mark it as in the pack (2403), assign a letter (2402, not read), record `last_pickup`.
  (g) Back in `move_item_to_inv`, the floor stack shrinks only after (f) succeeded (1812, 1824).
- Failure path: `_put_item_in_inv` returns false, the floor item is not changed, and the pickup loop sets the warning `Your pack is full.` (3439).
- `items_stack` (1604-1617): both items must be stackable; their combined quantity must fit the type; `items_similar` must be true; the identified state must match (1617). The overflow test uses the whole floor stack (`item2.quantity`, 1608), not only the picked part.
- `items_similar` (1576-1601): the base type and sub type must be equal (1579). Gold and collectible items return true at this point. Artefact flag must match (1585) and so must the artefact name (not counted in receipts). Missiles with different brands never merge (1594). Differing mimic/summoned flags block a merge (1597-1598). Two items with the same masked flags can merge.
- Stackable base types (`is_stackable_item`, 1551-1569): missiles, scrolls, potions, gold, baubles (1558-1567); miscellany only for the ziggurat and shop voucher (1568-1569).
- Slot choice (`find_free_slot`, 1633-1712): consumables go to the first empty index in [52, 127) (1635-1641). Gear first tries the slot the item remembers, if that slot is free (1659-1660). Otherwise it scans from slot 51 down for the last free slot that leaves no gap (1673). Potions avoid letter `y` (index 24, 1667). If the only free gear slot is that disliked one, it is used as a last resort (1708-1709).
- `room_in_inventory` (3492-3515) is a can-it-fit predicate: consumables are always true (3494-3499, the comment says ENDOFPACK must grow before that stops being true); gear is true below 52 (3501); a full gear pack accepts only a stackable item that `items_stack` with something already carried (3506 onward).
- Atomicity: there is no transaction and no rollback. The guarantee is ordering only: the destination is written first, and the source is reduced only if the destination accepted. A comment at 1819-1821 says the late decrement is there because an early one "may give Windows tiles players the opportunity to close the window and duplicate the item". That is the comment's claim; it was not checked.
- Tick: none. These are synchronous calls from the player's pickup command, one item at a time.

## 2. Key functions

- `move_item_to_inv` (int obj, int quant_got, bool quiet): `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/items.cc` 1803-1830. Floor-to-pack entry point; decrements the floor stack after acceptance (1824).
- `_put_item_in_inv`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/items.cc` 1749-1781. Clamp, stationary check (1752), then the merge-or-place dispatch (1767).
- `_merge_items_into_inv`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/items.cc` 2444-2514. Special cases (2454, 2464, 2481), stack merge (2488-2489), capacity (2511-2512), placement (2514).
- `_merge_stackable_item_into_inv`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/items.cc` 2034-2084. The stack merge and its message.
- `items_similar` / `items_stack` / `is_stackable_item`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/items.cc` 1551-1618.
- `_place_item_in_free_slot`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/items.cc` 2390-2430. Copy, quantity, letter, last-pickup.
- `find_free_slot`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/items.cc` 1633-1712. Consumable range, remembered slot, no-gap reverse scan, disliked slot.
- `dec_mitm_item_quantity`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/items.cc` 406-428. Destroys at equality (412), otherwise subtracts (426).
- `room_in_inventory`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/items.cc` 3492-3515.
- Constants: `MAX_GEAR = 52` (`/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/defines.h` 41); `ENDOFPACK 127` (defines.h 40).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Merge into the first stack that accepts, before any capacity check | None (the order) |
| Stack only when kind, no-merge flags and identified state match | Stackable list: missiles, scrolls, potions, gold, baubles (theirs, 1558-1567) |
| Reject a merge that would overflow the quantity type; check the whole floor stack | Type limit (donor quantity type not read) |
| Gear is capped; consumables are not | 52 gear slots (theirs, defines.h 41); pack array 127 (defines.h 40) |
| Consumables take the first empty slot in their own range | Range [52, 127) (theirs, 1637) |
| Gear returns to its remembered slot if free | None (the rule) |
| Preference, not block: avoid one slot | Potions avoid letter `y`, index 24 (theirs, 1667) |
| Source shrinks only after destination accepts | None (the rule; 1812, 1824) |
| Gained message: old slot prefix and count | `"%s%s (gained %d)"` (theirs, 2073) |

## 4. TypeScript sketch

simplified: keeps the donor order (clamp, merge into the first accepting stack, gear cap check after the merge, place, then shrink the floor stack only after the pack accepted). It omits: gold, books, runes, gems, the Orb and the voucher special cases; the wand-charge and evoker merges; the artefact name check and the collectible short-cut; the inscription copy; the identify-on-merge letter reassignment; the messages and the pickup event; the letter assignment (letters become grid slots here); the donor's no-gap reverse scan (replaced by first free gear slot); the disliked-slot last resort. The quantity limit is a stand-in constant. The donor's overflow check uses the floor stack's quantity; the sketch keeps that.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Pickup pipeline: stack merge first, then gear capacity, then placement, then the source is decremented only after the pack accepted.

export {};

type Category = "gear" | "consumable";

interface Item {
  kind: string;            // base type plus sub type folded into one key
  quantity: number;
  stackable: boolean;      // donor: is_stackable_item
  noMergeFlags: number;    // donor: masked mimic/summoned flags; must be equal to merge
  identified: boolean;
  category: Category;
  remembered?: number;     // slot the item last held (gear keeps it if still free)
}

interface Ground { item: Item; quantity: number; }   // world stack on the floor

type Pack = (Item | undefined)[];

interface PickupResult { ok: boolean; slot: number; gained: number; }

const MAX_GEAR = 52;      // donor defines.h:41
const PACK_END = 127;     // donor defines.h:40 (gear plus consumables)
const MAX_QTY = 2147483647; // stand-in for the donor's quantity type limit (donor type not read)
const DISLIKED_SLOT = 24;   // donor: potions avoid letter 'y' (index 24); a preference, not a block

// Donor items_stack: both stackable, sum must fit, and similar in kind, no-merge flags and identified state.
// Note: the overflow test uses the whole ground stack, as the donor does (item2.quantity).
function itemsStack(a: Item | undefined, b: Item): boolean {
  if (!a || !a.stackable || !b.stackable) return false;
  if (a.quantity + b.quantity > MAX_QTY) return false;
  return a.kind === b.kind
    && a.noMergeFlags === b.noMergeFlags
    && a.identified === b.identified;
}

// Simplified placement: gear keeps its remembered slot if free, else the first free gear slot
// (donor: last free slot with no gap, then a disliked fallback). Consumables use [MAX_GEAR, PACK_END).
function freeSlotFor(pack: Pack, item: Item): number {
  if (item.category === "consumable") {
    for (let i = MAX_GEAR; i < PACK_END; i++) if (!pack[i]) return i;
    return -1;
  }
  if (item.remembered !== undefined && item.remembered < MAX_GEAR && !pack[item.remembered]) {
    return item.remembered;
  }
  for (let i = 0; i < MAX_GEAR; i++) {
    if (!pack[i] && i !== DISLIKED_SLOT) return i;
  }
  return -1;
}

function gearCount(pack: Pack): number {
  let n = 0;
  for (let i = 0; i < MAX_GEAR; i++) if (pack[i]) n++;
  return n;
}

// Donor order: clamp quantity, merge into an accepting stack, gear cap check, place, then decrement the ground.
function pickUp(pack: Pack, ground: Ground, want: number): PickupResult {
  const qty = want > ground.quantity || want <= 0 ? ground.quantity : want;
  const incoming: Item = { ...ground.item, quantity: qty };

  // 1. merge into the first existing stack that accepts it
  if (ground.item.stackable) {
    for (let i = 0; i < pack.length; i++) {
      const existing = pack[i];
      if (existing && itemsStack(existing, ground.item)) {
        existing.quantity += qty;
        return commit(ground, qty, i);
      }
    }
  }

  // 2. capacity: only gear is capped; a full gear pack still takes a stack that merged above
  if (ground.item.category === "gear" && gearCount(pack) >= MAX_GEAR) {
    return { ok: false, slot: -1, gained: 0 };   // ground stack untouched
  }

  // 3. place into a free slot
  const slot = freeSlotFor(pack, incoming);
  if (slot < 0) return { ok: false, slot: -1, gained: 0 };
  pack[slot] = incoming;

  // 4. only now shrink the ground stack
  return commit(ground, qty, slot);
}

function commit(ground: Ground, qty: number, slot: number): PickupResult {
  ground.quantity -= qty;   // the donor removes the world item when this reaches zero
  return { ok: true, slot, gained: qty };
}

// Quick check used before a pickup: consumables always fit in this sketch; gear fits if a slot is free
// or if the item merges with something already carried.
function roomFor(pack: Pack, item: Item): boolean {
  if (item.category === "consumable") return true;
  if (gearCount(pack) < MAX_GEAR) return true;
  if (!item.stackable) return false;
  return pack.some((p) => itemsStack(p, item));
}

// Smoke values (not a test): a stack of 5 potions meets 3 in the pack.
const pack: Pack = new Array(PACK_END).fill(undefined);
const potion: Item = { kind: "potion:healing", quantity: 3, stackable: true, noMergeFlags: 0, identified: true, category: "consumable" };
pack[MAX_GEAR] = { ...potion, quantity: 3 };
const ground: Ground = { item: { ...potion, quantity: 5 }, quantity: 5 };
const r = pickUp(pack, ground, 2);
const ok: boolean = r.ok && r.gained === 2 && ground.quantity === 3;
void ok;
void roomFor;
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 /tmp/crawl-pickup-stack.ts` on the VPS, exit 0 (run in this session).

## 5. Lands in

- TARGET `src/fight/inventory.ts` (proposed new module; the current Frankendom inventory code was not read, so this is a proposal, not a checked location). The one move function: floor to bag, bag to bank, bag to equipment. Stack rule and capacity live here; the source decrement happens after the destination accepts.
- Parity-checklist row 18 (loot roll and XP award: the pickup that puts a drop into the bag). Row 18 is the closest row; there is no inventory row in 1-22.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: one ledger (the destination accepts before the source shrinks); rules 7-9 n/a

Best transferable idea: a pickup or move is one function that tries to merge into an existing stack first, checks capacity only for the pool that is capped, writes the destination, and shrinks the source only after the destination accepted.
Decision (proposed): adapt — keep the stack rule (kind, no-merge flags and identified state must match; overflow checked against the whole floor stack), the merge-before-capacity order and the source decrement after acceptance; drop the keyboard letter scheme, because a phone grid assigns slots by position, not by letter.
Acceptance: a player picks up 2 of 5 potions while carrying 3 of the same potion: the bag shows 5 in one cell, the floor pile shows 3, and the toast reads "gained 2". With a full gear bag and a new sword on the floor, the sword stays on the floor and the bag is unchanged; a server test asserts that a rejected pickup leaves both the bag quantity and the floor quantity exactly as they were.

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the described order, not a translation; the donor lines are cited only for the rules and numbers.
- "Atomic" here means ordering, not a transaction: the donor has no rollback because it is one single-threaded game loop. Frankendom's server must do the destination write and the floor decrement in one ledger step, and reject both if either fails. The donor cannot show that.
- Consumables are never checked for room. `room_in_inventory` assumes they always fit (3494-3499), and `_place_item_in_free_slot` asserts the slot is in range (2394) after `find_free_slot` returns -1 when the consumable range is full. Frankendom must cap bag size explicitly as data; do not copy the assumption.
- Bag size is a constant here (52 gear, 127 array). For Frankendom bag upgrades it is data (progression), not an engine constant. The sketch keeps MAX_GEAR as a constant only for brevity.
- Letters are a keyboard UI. The remembered-slot rule (gear goes back to its old slot if free) is worth keeping for equipment; the letter itself is not.
- The donor's gained message ("old -> new (gained N)") is useful loot presentation text on a phone (short, shows the slot change), but it is text and not a mechanism; the phone copy must be written for touch.
- Not verified: the rest of `find_free_slot` tail semantics for every category, `_assign_inventory_letter`, the wand/evoker merges, and the book/rune/gem helpers. The XXX duplication comment (1819) is the donor's own claim.
