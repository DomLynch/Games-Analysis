# levy-street-world-of-claudecraft (inventory-bank-equipment, cell 9)

Donor: /mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/bags.ts | Licence: MIT | TypeScript | symbol canAddItem / addStacked / equipBag

Licence note: MIT. The logic may be lifted from the path above; this sketch restates the structure in its own names.

Symbol check: `canAddItem` 267-275, `addStacked` 359-401, `equipBag` 672-767 all land as named (the input line 267 is `canAddItem`). Pool math lives in the sibling file bag_pools.ts, opened for this pass.

## 1. Mechanism

- A character's carry capacity is a slot budget: a fixed backpack (`BACKPACK_SLOTS` = 16, line 83) plus the `bagSlots` of each equipped bag, in `BAG_SOCKETS` = 4 sockets (line 85; `meta.bags`, a bag is itself an item of kind 'bag'). The budget is split into two pools (`PoolCapacity`, bag_pools.ts:44-49): `general` (backpack plus unrestricted bags) and `materials` (bags with `materialsOnly`). `bagPools` (132-134) builds it via `poolCapacityOf` (bag_pools.ts:68-79); `bagCapacity` (141-143) is the summed total, used by the equip and unequip guards, deliberately not a fit answer. Items still sit in one flat list; pools are accounting only (comment lines 3-10).
- Each item def has a stack size (`stackSizeOf`, 98-102): an explicit positive `stackSize` wins, else kinds in `UNSTACKED_KINDS` (line 94: weapon, armor, held_offhand, bag, tool, recipe) hold 1, else `DEFAULT_STACK` = 20 (line 90).
- `countFit` (194-238) answers "how many of this item fit": room in existing stacks that match identity (same item, payload compatible under `canStackInstancePayloads`, same `craftedRecipeId`), plus free slots times the per-slot size, capped at the requested count. The free slots come from `freePoolSlots` (bag_pools.ts:102-112): a non-material may only use general-pool headroom; a material uses materials-pool headroom first, then general. A charge-bearing payload stays one unit per fresh slot (231-236). Material items (when `count > 0` and the id is a material, 159-160) take a separate arm through `materialStackFit` (206-219, packing leaf in material_stack_packing.ts, not read).
- `addStacked` (359-401) does the actual add with no capacity cap (comment 357-358): top up matching stacks first, then push new slots, cloning any instance payload per fresh slot (394-396). Materials go to `addMaterialStacked` (410, packing plan not read).
- `canAddItem` (267-275) and `fitsAll` (305-325) are the all-or-nothing checks; `canGrantItemInstance` (255-264) and `canGrantCopies` (287-299) are payload-aware twins. `fitsAll` simulates a batch on a copy (`scratch = inventory.map(...)`, 310), so several adds that each fit alone can still fail together.
- `equipBag` (672-767): resolves the player; returns if the item is not a bag (683); errors if the player has none (684-687); picks the first empty socket when none is given and errors if all four are full (688-696); refuses an out-of-range socket (697); refuses a second copy of a `unique` bag in another socket (698-701). It then simulates the post-swap length `inventory.length - 1 + (old ? 1 : 0)` against `bagCapacity(newBags)` and refuses on overflow (702-719). It peeks the copy to consume and refuses if it carries an instance payload or recipe marker (737-748), consumes that copy (755-761), adds the old bag back with `addStacked` (763), sets the socket (764), fires the quest-inventory hook (765) and logs (766). `unequipBag` (772-) is the mirror, with the shrink guard `inventory.length + 1 > bagCapacity(newBags)` (781).
- Runs on the player's equip, unequip and pick-up actions, and on exchange transactions that need a capacity pre-check.

## 2. Key functions

| Name | Path | Lines | What it does |
|---|---|---|---|
| bagPools / bagCapacity | /mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/bags.ts | 132-143 | Total slot budget: backpack plus equipped bags |
| countFit | /mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/bags.ts | 194-238 | Room in matching stacks plus pool-aware free slots, capped at the requested count |
| canAddItem / fitsAll | /mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/bags.ts | 267-275, 305-325 | All-or-nothing fit; batch fit on a scratch copy |
| freePoolSlots / poolCapacityOf | /mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/bag_pools.ts | 68-79, 102-112 | Two-pool budget and free-slot answer for fresh stacks |
| addStacked | /mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/bags.ts | 359-401 | Tops up matching stacks, then pushes new slots |
| equipBag | /mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/bags.ts | 672-767 | Swaps a worn bag, guards overflow, refuses special-property bags |
| stackSizeOf | /mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/bags.ts | 98-103 | Stack size from the def; unstacked kinds get 1 |

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Carry capacity as a sum of pools (base plus equipped containers) | Base backpack 16 slots (theirs, bags.ts:83); 4 bag sockets (bags.ts:85) |
| Stack top-up first, then fresh slots; all-or-nothing check | Default stack size 20 (theirs, DEFAULT_STACK, bags.ts:90); unstacked kinds 1 (theirs, bags.ts:94) |
| Batch fit on a scratch copy so several small adds cannot overfill | Scratch copy rule (theirs) |
| Swap guard: refuse if the post-swap inventory exceeds the new total | Guard as written (theirs) |
| Refuse to equip a container that carries a special property | Special-property refusal (theirs) |

## 4. TypeScript sketch

Licence: MIT. The logic may be lifted from the path above; this sketch restates the structure in its own names.

simplified: one flat capacity number instead of the donor's two pools (general and materials, `freePoolSlots`); no material packing arm; `key` stands in for the donor's payload-compatibility test (`canStackInstancePayloads`) and `craftedRecipeId`; charge-bearing payloads are not forced to one unit per fresh slot; no payload cloning; `swapAllowed` is the guard only, none of `equipBag`'s other refusals (unique, missing item, socket range, special property) or its consume-then-add order; no `unequipBag`.

```ts
// Licence: MIT (levy-street-world-of-claudecraft, src/sim/bags.ts
// bagCapacity, countFit, canAddItem, fitsAll, addStacked, equipBag)
interface Slot { itemId: string; count: number; key?: string; } // key = identity (payload + recipe)
const BASE_SLOTS = 16;          // theirs
const DEFAULT_STACK = 20;       // theirs (bags.ts line 90; unstacked kinds use 1)
// stackSizeOf (bags.ts 98-102): an explicit positive def.stackSize wins (floored); else unstacked kinds get 1; else DEFAULT_STACK.
const UNSTACKED = new Set(['weapon', 'armor', 'held_offhand', 'bag', 'tool', 'recipe']);
function stackSizeOf(def?: { kind: string; stackSize?: number }): number {
  if (!def) return DEFAULT_STACK;
  if (def.stackSize && def.stackSize > 0) return Math.floor(def.stackSize);
  return UNSTACKED.has(def.kind) ? 1 : DEFAULT_STACK;
}
function countFit(inv: Slot[], capacityNow: number, itemId: string, count: number, stack: number, key?: string): number {
  let room = 0;
  for (const s of inv) {
    if (s.itemId === itemId && s.key === key && s.count < stack) room += stack - s.count;
  }
  room += Math.max(0, capacityNow - inv.length) * stack;
  return Math.min(count, room);
}
function addStacked(inv: Slot[], itemId: string, count: number, stack: number, key?: string): void {
  let remaining = count;
  for (const s of inv) {
    if (remaining <= 0) break;
    if (s.itemId !== itemId || s.key !== key || s.count >= stack) continue;
    const take = Math.min(stack - s.count, remaining);
    s.count += take;
    remaining -= take;
  }
  while (remaining > 0) {
    const take = Math.min(stack, remaining);
    inv.push({ itemId, count: take, key });
    remaining -= take;
  }
}
function fitsAll(inv: Slot[], capacityNow: number, adds: { itemId: string; count: number; stack: number; key?: string }[]): boolean {
  const scratch = inv.map((s) => ({ ...s }));
  for (const a of adds) {
    if (countFit(scratch, capacityNow, a.itemId, a.count, a.stack, a.key) < a.count) return false;
    addStacked(scratch, a.itemId, a.count, a.stack, a.key);
  }
  return true;
}
// Budget after the swap = backpack + the bagSlots of EVERY worn bag (with the new bag in its socket).
function swapAllowed(inv: Slot[], wornBagSlotsAfterSwap: number[], oldBagWasWorn: boolean): boolean {
  const after = inv.length - 1 + (oldBagWasWorn ? 1 : 0);
  return after <= BASE_SLOTS + wornBagSlotsAfterSwap.reduce((a, b) => a + b, 0);
}
```

## 5. Lands in

- Frankendom: src/fight/gear-room.ts (today: src/gear-room.ts, moving) (the carry capacity and the swap guard for gear) and src/loot-claims.ts (the batch fit check before a claim is granted, which is the fitsAll idea). The capacity count of 16 is a donor number; Frankendom's gear room has its own limits.
- Parity checklist row 15 (gear dressing) for the equip swap guard. Row 18 (loot roll and XP award) for the batch fit before a drop is granted.
- Beyond checklist: economy (later phase) for stacks, materials and the bank; the duel does not need stacks. Feature-map section nearest: loot and ledger (row 18).

Reuse tag: adapt
Brief rule served: one-character, one-ledger rule (server inventory is the authority); rules 7-9 n/a

## 6. Gaps and risks

- The donor tolerates over-capacity on purpose: grants a player cannot retry (need/greed roll win, master loot, delve rewards, quest fallback grant) skip the fit check (comment 23-34). Frankendom's server-verified loot must decide this rule explicitly; the one ledger cannot silently hold more than the cap.
- The donor's bags carry only an item id while worn (`meta.bags` holds ids, line 720); a payload-bearing bag is refused (745-748). Frankendom's gear must carry its state (rarity, stats) in a server row; a worn-item id alone would lose it.
- The stack and material arm is large (a separate packing core for materials, identity keys). Frankendom does not need stacks in the duel; port only the all-or-nothing fit and the swap guard.
- Capacity is a slot count. Frankendom's gear room is named slots, so the slot-count model fits only a pack, which the duel does not have.
- The batch fit must run on the server before any grant. A client pre-check alone would let two grants overfill the pack.
- Conflict check: the capacity and swap guards are server functions in the donor (sim-pure). Keep them on the server; the one-engine rule holds.
