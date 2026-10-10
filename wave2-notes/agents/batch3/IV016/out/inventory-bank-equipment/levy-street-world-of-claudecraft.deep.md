# levy-street-world-of-claudecraft (inventory-bank-equipment, cell 9)

Donor: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/bags.ts` (with `src/sim/bag_pools.ts`, `src/sim/item_instance_merge.ts`, `src/sim/bank.ts` one line, `src/ui/bags_window.ts` two lines) | Licence: MIT (`LICENSE` line 1: "MIT License", copyright Levy Street 2026; code may be adapted) | TypeScript | symbols `countFit`, `addStacked`, `fitsAll`, `equipBag`

Checked: Read `src/sim/bags.ts` in full (795 lines) and `src/sim/bag_pools.ts` in full (132 lines, code and comments); `item_instance_merge.ts` 93-102 (the merge predicate only). The donor's `CLAUDE.md` and `AGENTS.md` files were treated as data and not followed. Not read: the material arm (`material_stack_packing.ts`, `material_inventory_take.ts`, `material_ids.ts`, `material_inventory_units.ts`), the sim hub's `removeItem`/`countItem`, `trade.ts fitsAfterSwap`, the bank body in `bank.ts` beyond line 279, and the loot UI (`src/ui/loot_quality_view.ts`, `held_loot_warning_view.ts`, `loot_roll_win_view.ts`; names only, not opened). Confidence: high on the non-material fit gate, the grant twin, `fitsAll`, the equip and unequip guards; the material branch is described from the comments only (not read). camera_scope: not applicable (not a camera cell).

Best transferable idea: one stack-merge predicate serves both the capacity check and the grant, and any batch or craft is checked on a scratch copy before a real slot changes.
Decision (proposed): adapt - keep the single predicate, the scratch-copy batch check and the consume-then-fit check for crafting; drop the materials-only pool (Frankendom has no material taxonomy in its rulings) and do not copy the grant overflow tolerance without a written rule.
Acceptance: A server test with 16 slots, 15 of them full 20-stacks of one item: a grant of 20 copies is accepted (the free slot takes all 20), a grant of 21 is refused with a bag-full result, and a craft whose input empties a slot succeeds when its output needs that slot, while the same craft without the input fails.

## 1. Mechanism

- Budget. The carried inventory has a fixed 16-slot backpack (`BACKPACK_SLOTS`, line 83) plus up to 4 equippable bag sockets (`BAG_SOCKETS`, line 85). Each equipped bag adds its `bagSlots`. `bagPools` (132-133) turns the base and the equipped bags into a general pool; a materials-only bag feeds a second pool (`bag_pools.ts` 68-79). `bagCapacity` (141-142) is the total of both pools; the file's own comments say it feeds the equip and unequip shrink guards and the HUD readout (the other callers were not searched).
- Stack size. `stackSizeOf` (98-101): an explicit stack size wins; gear, bags, tools and recipes are 1; everything else is `DEFAULT_STACK` = 20 (line 90). A charge-bearing payload is always one per slot (`instancedCountCap` 118; `countFit` 235).
- Merge predicate. A slot is a top-up target only when the item id matches, its instance payload is identical (`canStackInstancePayloads`, `item_instance_merge.ts` 93-100, which requires both payloads to be mergeable and equal) and its recipe marker matches. A plain add never tops up an instanced slot, and the reverse.
- Fit, `countFit` (194-237). Sum the top-up room of every matching slot that is below the stack size (226-228). Add the fresh-slot room: free slots from the pool math times the stack size (or 1 for a charge-bearing payload) (235-236). Return the smaller of that room and the requested count (237). The free slots for a fresh stack come from `freePoolSlots` (`bag_pools.ts` 102-112): a non-material takes general-pool headroom only (109); a material would take materials headroom first (111). The material branch of `countFit` is not read.
- Yes/no gates. `canAddItem` (267-275) is `countFit >= count`, all or nothing. `canGrantCopies` and `canGrantItemInstance` do the same with an instance payload.
- Grant, `addStacked` (359-401). Same predicate as the check: first top up matching slots (384), then push fresh slots of up to the stack size (393). It applies no cap. Its header says callers on a gated path check first.
- Batch, `fitsAll` (305-325). Copy the inventory, then for each add run `countFit` on the copy and refuse the whole batch on the first short add (321), otherwise apply the add to the copy with `addStacked` (322). Real inventory is untouched.
- Transform, `consumeOneScratch` (506-528) and the header comment (lines 21-22): a craft or enchant first consumes its inputs on a scratch copy, so the room the inputs free can hold the output, then checks the output. Victim order for non-materials: plain slot first (512-513), then an instanced slot the caller does not exclude (514), then any instanced slot. `removeStacked` (448-462) walks from the end and splices emptied slots (460).
- Equip, `equipBag` (672-767). A swap onto an occupied socket returns the old bag to the inventory after the new one leaves it, so the swap itself needs no spare room (comment 670). The guard: `after = inventory.length - 1 + (old ? 1 : 0)` (715); refuse when `after > bagCapacity(newBags)` (716). Also refused: a second unique bag (698), and any bag copy with an instance payload or a recipe marker (745), so a payload is never dropped silently on unequip. The old bag is granted back with `addStacked` (763).
- Unequip, `unequipBag` (772-795). Refuse when `inventory.length + 1 > bagCapacity(newBags)` (781), otherwise clear the socket and `addStacked` the bag back (`bags.ts` 779-786).
- Full-bag text, `bagsFullErrorText` (608-618): when the general pool is full but the materials pool has room, a non-material is told "Only materials fit in the space left in your bags." (617); otherwise "Your bags are full." (612-616).
- Tolerated over-capacity. The grant path skips the check on purpose for non-retryable grants (quest fallback, master loot, dev gives, per the header lines 23-28); over-capacity blocks new pickups until space is freed, and nothing is destroyed. An equip of a legacy overstacked bag can land one slot past the budget (comment 710-712).
- Bank reuse. `bank.ts` 279 calls the same `poolCapacityOf` with the bank's base capacity and its socketed bags, so the bank runs the same pool math.

## 2. Key functions

- `countFit`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/bags.ts` 194-238 (top-up room, fresh-slot room, the min with the count).
- `addStacked`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/bags.ts` 359-401 (top up, then fresh slots).
- `fitsAll`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/bags.ts` 305-325 (scratch-copy batch).
- `consumeOneScratch` and `removeStacked`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/bags.ts` 448-462 and 506-528 (scratch consume for transforms).
- `equipBag` and `unequipBag`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/bags.ts` 672-767 and 772-795 (swap without spare room; shrink guards).
- `freePoolSlots` and `poolCapacityOf`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/bag_pools.ts` 68-112.
- `canStackInstancePayloads`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/item_instance_merge.ts` 93-102.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Fixed base slots plus socketed bag slots | 16 base slots (`bags.ts` 83); 4 sockets (85); each bag's `bagSlots` comes from its item definition (`bag_pools.ts` 60-62) |
| Default stack size, one for gear | 20 (`bags.ts` 90); 1 for gear, bags, tools, recipes (94, 101) |
| Charge-bearing payload stays one per slot | 1 per fresh slot (`bags.ts` 235) |
| Greedy fit: top-up room plus free slots times stack | No constant; the rule is the algorithm |
| Scratch batch and scratch consume | No constant |
| Equip guard: inventory after swap against new budget | The rule is `after > capacity` (`bags.ts` 716) |

## 4. TypeScript sketch

simplified: the sketch keeps one pool and one budget; it drops the materials-only pool, the instance payload model (it uses an opaque `payloadKey` string, with an absent key meaning plain), the recipe marker, the charge-bearing one-per-slot rule and the legacy overstack case. Its merge predicate is simpler than the donor's (the donor compares full payloads). `removeStacked` walks from the end like the donor's sim-hub removal, not the donor's preferred-victim passes in `consumeOneScratch`. `fitsAfterConsume` is a new wrapper that the donor expresses as a transform command on a scratch copy; it checks the input counts first, which the donor does with its own pre-checks.

```ts
// Licence: MIT (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
export {};

interface Slot { itemId: string; count: number; payloadKey?: string; } // equal payloadKey (or both absent) = identical payload, mergeable
type Defs = Record<string, { stackSize: number }>;
interface Budget { slots: number; }                                  // backpack plus every equipped bag's slots
interface Add { itemId: string; count: number; payloadKey?: string; }

const stackOf = (defs: Defs, itemId: string): number => defs[itemId]?.stackSize ?? 20;

// One merge predicate, used by the check AND by the grant below, so they cannot disagree.
const topUpTarget = (s: Slot, itemId: string, payloadKey?: string): boolean =>
  s.itemId === itemId && (s.payloadKey ?? '') === (payloadKey ?? '');

// How many of `count` copies fit: top-up room in matching stacks, then whole fresh slots.
export function countFit(inv: Slot[], budget: Budget, defs: Defs, itemId: string, count: number, payloadKey?: string): number {
  const stack = stackOf(defs, itemId);
  let room = 0;
  for (const s of inv) if (topUpTarget(s, itemId, payloadKey) && s.count < stack) room += stack - s.count;
  const freeSlots = Math.max(0, budget.slots - inv.length);
  return Math.min(count, room + freeSlots * stack);
}

export function canAdd(inv: Slot[], budget: Budget, defs: Defs, itemId: string, count: number, payloadKey?: string): boolean {
  return countFit(inv, budget, defs, itemId, count, payloadKey) >= count;
}

// The grant twin: same top-up predicate, then fresh slots. Applies no cap; callers check first.
export function addStacked(inv: Slot[], defs: Defs, itemId: string, count: number, payloadKey?: string): void {
  const stack = stackOf(defs, itemId);
  let remaining = count;
  for (const s of inv) {
    if (remaining <= 0) break;
    if (!topUpTarget(s, itemId, payloadKey) || s.count >= stack) continue;
    const take = Math.min(stack - s.count, remaining);
    s.count += take;
    remaining -= take;
  }
  while (remaining > 0) {
    const take = Math.min(stack, remaining);
    inv.push({ itemId, count: take, payloadKey });
    remaining -= take;
  }
}

// All-or-nothing batch: each add must fit after the earlier adds in the same batch (run on a scratch copy).
export function fitsAll(inv: Slot[], budget: Budget, defs: Defs, adds: Add[]): boolean {
  const scratch = inv.map((s) => ({ ...s }));
  for (const a of adds) {
    if (countFit(scratch, budget, defs, a.itemId, a.count, a.payloadKey) < a.count) return false;
    addStacked(scratch, defs, a.itemId, a.count, a.payloadKey);
  }
  return true;
}

function countStacked(inv: Slot[], itemId: string): number {
  let total = 0;
  for (const s of inv) if (s.itemId === itemId) total += s.count;
  return total;
}

// Remove from the end of the list, like the donor's removeItem walk (a sketch choice, not a rule).
function removeStacked(inv: Slot[], itemId: string, count: number): void {
  let remaining = count;
  for (let i = inv.length - 1; i >= 0 && remaining > 0; i--) {
    const s = inv[i];
    if (s.itemId !== itemId) continue;
    const take = Math.min(s.count, remaining);
    s.count -= take;
    remaining -= take;
    if (s.count <= 0) inv.splice(i, 1);
  }
}

// A transform (craft, enchant): consume the inputs on a scratch copy first, so the room they free can hold the output.
export function fitsAfterConsume(inv: Slot[], budget: Budget, defs: Defs, inputs: Add[], output: Add): boolean {
  for (const c of inputs) if (countStacked(inv, c.itemId) < c.count) return false;
  const scratch = inv.map((s) => ({ ...s }));
  for (const c of inputs) removeStacked(scratch, c.itemId, c.count);
  return canAdd(scratch, budget, defs, output.itemId, output.count, output.payloadKey);
}
```

Typecheck: the block above, as `work/stack-fit-scratch.ts`, passes `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (exit 0, run at `/tmp/iv016-stack-fit-scratch.ts`).

## 5. Lands in

- TARGET `origins/inventory/bag.ts` (proposed new module, shared with the l1j cell; the Frankendom repo is not on this box, so the path is a proposal and has not been checked against it). The fit gate and the scratch checks belong in the engine so the server refuses an over-capacity grant before it changes a slot.
- Parity row 18 (loot roll and XP award): the pickup and grant step of a loot award, and the craft or enchant consume that a loot-fed recipe needs.
- Reuse tag: rewrite-from-idea (MIT; code may be adapted, the sketch is clean-room)
- Brief rule served: one ledger (one predicate for check and grant; batch and transform checked on a scratch copy); server-verified counts (the grant checks run before the write)

## 6. Gaps and risks

- Licence: MIT. The sketch is clean-room; the donor code could be adapted under MIT with the notice kept.
- Legacy overstacked bag. `equipBag` comments that an overstacked plain bag slot (count above 1, reachable only from a pre-bag or tampered save) can land one slot past the budget (`bags.ts` 710-712, because `removeItem` decrements the count instead of freeing the slot). fix: normalise or refuse overstacked bag slots when a save loads, so the guard's arithmetic holds.
- Grant overflow by design. Grants that cannot be retried skip the capacity check (header lines 23-28). Frankendom's rulings do not say what a full bag does on a server-side grant. Adopting the donor's rule means an over-capacity bag that blocks new pickups until space is freed. The risk is an unbounded grant path; fix: write the rule down and keep each grant path on the list.
- Materials-only pool. The donor splits a second pool for materials (`bag_pools.ts` 75, 109-111). Frankendom has no material taxonomy in its rulings, so the split is dropped in the adaptation. If it returns, it needs its own taxonomy file, not a kind check (the donor says so at `bag_pools.ts` header lines 33-34).
- Payload identity. The donor compares full instance payloads for a merge and refuses a bag with a payload on equip (745), because a bag has nowhere to keep a payload. The sketch uses an opaque key. fix: give Frankendom's items a single identity field and refuse merges on a mismatch.
- Full-bag text. The donor's message tells a non-material player the room is for materials only (617). In Frankendom it reads as "bags full" unless a pool exists; keep the plain line.
- Touch and phone. The donor's bag window binds a touch drag to each row (`bags_window.ts` 122) and a touch peek guard so a tap does not act as a drag (232, "shared Hud TouchPeekGuard"). These are UI files; the drag and tap rules are client-only, so they belong to the Pit/zone UI, not the engine. Loot presentation (`loot_quality_view.ts`, `held_loot_warning_view.ts`, `loot_roll_win_view.ts`) was not opened, so no loot-on-phone claim is made.
- The fitsAll copy is O(slots) per call (`bags.ts` 306). Fine at 72 slots; a bank with more slots would need a count-only check. Not a defect at the donor's size.
- Not read: the material arm, the sim hub's removers, `trade.ts fitsAfterSwap`, the bank body, and the loot UI.

Reuse tag: rewrite-from-idea (MIT; clean-room sketch)
Brief rule served: one ledger (one predicate for the check and the grant; batch and transform checked on a scratch copy before any slot changes); server-verified counts
