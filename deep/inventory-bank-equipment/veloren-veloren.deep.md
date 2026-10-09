# veloren-veloren (inventory-bank-equipment, cell 9)

Donor: /mnt/frankendom-donors/veloren-veloren/common/src/comp/inventory/mod.rs | Licence: GPL-3 | Rust | symbol Inventory
Symbol check: Inventory struct (48-60), push_prefer_slot (275-333), push (341-343), insert_or_stack_at (427-452), take (604-625), take_amount (629-658), pickup_item (951-967), insert_prefer_slot (795-802), insert (806-814) confirmed by opening each.

## 1. Mechanism
- Pure data structure in the shared `common` crate (`common/src/comp`; server-side use was not opened). Inventory (48-60) holds a loadout (equipped items; its internals were not read), a vector of plain slots, a list of overflow items that are remove-only, and a recipe book.
- Add: push (341-343) calls push_prefer_slot (275-333). For a stackable item it first tops up equal stacks (filter on item equality, 290) in slot order up to each stack's max amount; slot order is the inventory's own slots first, then the inventory slots provided by equipped items (slots_mut, 170-172). The remainder then goes through insert_prefer_slot (795-802) into the first empty slot as ONE stack (insert, 806-814), not split across slots. A non-stackable goes straight to insert_prefer_slot. If no slot is free the item comes back as Err with the count that did fit (324).
- insert_or_stack_at (427-452): a stackable into an occupied slot with an equal item adds its amount (if the add fails the item is returned), into an occupied slot with a different item swaps and returns the old one, into an empty slot inserts; a non-stackable replaces via insert_at (389-394) and returns the old item.
- Remove: take (604-625) takes one unit: a stackable with amount above 1 is duplicated for the return value and decremented, anything else is removed whole (remove, 589-591); take_amount (629-658) takes N units from a stackable with more than N and leaves the rest, otherwise (N covers it, or not stackable) removes the whole item.
- pickup_item (951-967): a stackable goes straight to push; a non-stackable first checks free_slots() against its populated contents plus one (956) and refuses with no change if short, then drains the contents into push one by one and pushes the item itself.
- Inputs: an item, a slot id, an amount. Outputs: the slot state and any leftovers. No tick in these functions; callers were not read.

## 2. Key functions
- Inventory (struct) | /mnt/frankendom-donors/veloren-veloren/common/src/comp/inventory/mod.rs | 48-60 | slot model: loadout, slots, overflow, recipe book.
- push_prefer_slot | /mnt/frankendom-donors/veloren-veloren/common/src/comp/inventory/mod.rs | 275-333 | stack top-up, then free-slot placement, leftover returned.
- push | /mnt/frankendom-donors/veloren-veloren/common/src/comp/inventory/mod.rs | 341-343 | wrapper without a preferred slot.
- insert_or_stack_at | /mnt/frankendom-donors/veloren-veloren/common/src/comp/inventory/mod.rs | 427-452 | place or merge at a chosen slot.
- take | /mnt/frankendom-donors/veloren-veloren/common/src/comp/inventory/mod.rs | 604-625 | remove one unit.
- take_amount | /mnt/frankendom-donors/veloren-veloren/common/src/comp/inventory/mod.rs | 629-658 | remove N units; the slot keeps the rest.
- pickup_item | /mnt/frankendom-donors/veloren-veloren/common/src/comp/inventory/mod.rs | 951-967 | free-slot precheck, then drain contents and place.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Top up existing stacks first, then open slots; return leftover | Stack max amount per item definition (theirs, data; item definitions not read) |
| Remove N from a stack, emptying the slot when N covers it | None |
| Non-stackable pickup refused unless free slots cover contents plus one (956) | DEFAULT_INVENTORY_SLOTS = 36 (theirs, line 44) |

## 4. TypeScript sketch
simplified: items match by an explicit key instead of Item equality; the remainder takes the first free slot as one stack like the donor, but loadout-provided slots, overflow items, the partial-count Err and the duplicate() call are omitted.
```ts
// Licence: GPL-3 (veloren-veloren) | clean-room: written from the mechanism, no donor lines.
interface Stack { key: string; amount: number; maxAmount: number; stackable: boolean; }
type Slot = Stack | null;

// Top up equal stacks in slot order, then put the whole remainder in the first free slot. Callers check stackable.
function pushStackable(slots: Slot[], item: Stack): number {
  let left = item.amount;
  for (const s of slots) {
    if (left <= 0) break;
    if (s && s.key === item.key) {
      const add = Math.min(s.maxAmount - s.amount, left);
      s.amount += add;
      left -= add;
    }
  }
  if (left > 0) {
    const i = slots.findIndex(s => s === null);
    if (i >= 0) {
      slots[i] = { ...item, amount: left };
      left = 0;
    }
  }
  return left; // leftover goes back to the caller
}

// Take N: a stackable with more than N keeps the rest; otherwise the whole slot is removed.
function takeAmount(slots: Slot[], index: number, n: number): Stack | null {
  const s = slots[index];
  if (!s || n <= 0) return null;
  if (s.stackable && s.amount > n) {
    s.amount -= n;
    return { ...s, amount: n };
  }
  slots[index] = null;
  return s;
}

```

## 5. Lands in
- Frankendom file(s): TARGET origins/inventory/inventory.ts (stack top-up and take on the server, writes through origins/server/career.ts); the loadout slot model meets src/gear-stats.ts and gear dressing under src/fight.
- Parity-checklist row: row 15 (gear dressing: loadout slots (the loadout type itself was not read)) and row 18 (loot roll and career award: push/pickup is where awarded items land). Row 21 for stack max in the catalogue.
- Reuse tag: rewrite-from-idea (GPL-3; mechanism only).
- Brief rule served: one-character, one-ledger rule (server inventory is the authority); rules 7-9 n/a

## 6. Gaps and risks
- The stack top-up walks slots in index order, so the result depends on slot layout. Frankendom must pin that order if it reuses the idea.
- Overflow slots are remove-only. This is the donor's way to survive a rebalance; no rebalance path was read.
- Stacking filters with `==` on Item at the call site (line 290); the PartialEq impl itself was not read, so "full definitions must match" is inferred from the debug_assert on equal max_amount (292-296). Frankendom needs an explicit item key.
- Server-verified rule: the structure lives in the shared `common` crate, so the server must own the authoritative copy (server-side use was not opened in the donor); no client input is trusted here.
- The max amount comes from item data not read here; the default slot count is the constant at line 44.
