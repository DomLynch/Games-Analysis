# ModernUO (inventory-bank-equipment, cell 3)

Donor: `/mnt/frankendom-donors/ModernUO/Projects/Server/Items/Container.cs` | Licence: GPL-3.0 (`LICENSE` lines 3-4 "GNU GENERAL PUBLIC LICENSE / Version 3, 29 June 2007"; source headers, e.g. `Items/Layer.cs` lines 7-10, say "any later version") | C# | symbol `ConsumeTotal` (Container.cs 744, 770, 796) with `ConsumeSlice` (1033); stack rule `CanStackWith`/`StackWith` (Items/Item.cs 2469-2513); trade commit `Update` (SecureTrade.cs 186-330)

Checked: Read `Container.cs` 224-300 (CheckHold), 408-530 (OnStackAttempt, TryDropItem, DropItem), 676-1052 (ConsumeTotalGrouped, both ConsumeTotal overloads, ConsumeUpTo, HasAmount, TryFindGroupMeetingAmount, BestGroupTotal, ConsumeSlice). Read `Items/Item.cs` 2465-2530 (CanStackWith, StackWith, OnDragDrop) and 4400-4411 (Consume). Read `Mobiles/Mobile.cs` 7677-7700 and 7800-7822 (CheckEquip, EquipItem). Read `Items/Layer.cs` 1-60 (enum head). Read `SecureTrade.cs` 186-330 (commit). `Items/Containers.cs`: only the BankBox class line (8) and constructor line (16) were read; BankBox behaviour is (not read). Not read: `ListItemsByType` and `FindItems` (snapshot order), `Item.CheckConflictingLayer`, `SecureTrade.cs` 82-185 (cancel and currency edits, which reset acceptance), `AddToBackpack` (7587), the `ContainerData` loader (`Container.cs` 1055-end, MaxItems/MaxWeight per container), and `Container.cs` 530-670 (display). The hint file `UOContent/Items/Armor/BaseArmor.cs` is not the mechanism (armour definitions). Confidence: high on the multi-slot consume and its phases, the stack rules, the drop order and the trade veto-then-apply; medium on grouped consume (snapshot order not read). camera_scope: n/a.

Best transferable idea: a multi-requirement spend (craft, buy, trade) is checked in full before any item is removed, so a failed requirement takes nothing and reports which line failed.
Decision (proposed): adapt — keep the check-then-apply shape for every multi-item spend and the two-sided accept with a veto that resets both sides; fix the donor's overlapping-requirement defect (D1) by planning against a remainder, and do not copy the order-dependent adjacency grouping.
Acceptance: a bag with 15 gold and a trade or craft line needing 10 gold twice shows "line 2 short: 5 more gold" and the bag is unchanged; a server test asserts that a refused spend leaves every stack amount identical.

## 1. Mechanism

Three pieces, all on the server. The donor is GPL-3.0, so this is shape only.

- **Multi-requirement consume** (`Container.cs` 744-768, `Type[][]` overload). Requirements are `types[i]` with `amounts[i]`. Phase 1 (751-758): for each requirement in order, `GetAmount(types[i])` must be at least `amounts[i]`; the first failure returns its index and nothing is changed. Phase 2 (761-765): for each requirement, list the matching items and `ConsumeSlice` them. Return -1 on success. The `Type` overload (770-794) is the same shape.
- **Single-type consume** (796-806). `HasAmount` (961-973) sums matching amounts and stops early once the target is reached. If it is short, it returns false and touches nothing. Otherwise it lists the matching items and calls `ConsumeSlice`.
- **ConsumeSlice** (1033-1052). Walks the list in order while `need > 0`. A stack smaller than `need` is taken whole: callback with the stack amount (1041), then `Consume(theirAmount)` (1042), which deletes it at that size, so `need` drops and the loop goes on (1039-1044). The stack that covers the rest is reduced: callback with `need` (1047), `Consume(need)` (1048), return (1049). `Item.Consume` deletes the item when its `Amount` is at most the amount, otherwise subtracts (`Item.cs` 4402-4411).
- **Grouped consume** (676-742). Same two phases. Phase 1 (686-695) requires one group whose amounts sum to at least the requirement; `TryFindGroupMeetingAmount` (978-1004) builds groups as contiguous runs in list order, where `grouper(leader, next) == 0` extends the run. Phase 2 re-lists the matching items (697-700 comment: live mutation bumps a version, so each phase walks its own snapshot) and consumes only inside the chosen run.
- **Partial consume** (`ConsumeUpTo`, 808-824). Collects the items to delete, then deletes them after the walk, so the list is not changed during the walk.
- **Stack rule** (`Item.cs` 2469-2513). `CanStackWith` needs both items stackable, the same runtime type, the same ItemID, Hue and Name, the combined amount at most 60000, and not the same object (2469-2476). `StackWith` adds the amounts (2492), sets the loot type to Regular if the two loot types differ (2487-2490), clears the constructed-by-player flag if they differ (2493-2496), and deletes the dropped stack (2498).
- **Drop into a container** (`Container.cs` 426-448, `TryDropItem`). Order: (a) stack into each non-container child with a weight-only check (434-436: `CheckHold(..., false, false)`); (b) if nothing stacked, one full check (441: `CheckHold(..., true)`); (c) `DropItem` (443) adds it and places it inside the container's bounds. So a stackable item joins an existing stack before it takes a new slot.
- **Capacity check** (`CheckHold`, 230-281). Non-GM accounts: deco containers refuse (234-242). Item count: `TotalItems + plusItems + item.TotalItems + (1 unless virtual) > MaxItems` refuses (246-255). Weight: `TotalWeight + plusWeight + item.TotalWeight + item.PileWeight > MaxWeight` refuses (257-265). It then recurses up the parent chain (268-278), so a bag inside a bag is checked against every enclosing container.
- **Equip** (`Mobile.cs` 7677-7689, 7800-7822). `CheckEquip` checks every worn item against the new one for conflicting layers in both directions (7681-7682). `EquipItem` requires `CanEquip`, then `CheckEquip && OnEquip && item.OnEquip` (7802-7807), then the spell hook (7809-7812), then `AddItem` (7817). The layer enum (`Layer.cs` 21-60) names the body layers, e.g. `TwoHanded = 0x02` (41).
- **Secure trade commit** (`SecureTrade.cs` 186-330). Runs only when both sides have accepted (193). Validate (199-273): every item on each side is asked `AllowSecureTrade` (199-235, stops at the first refusal via `allowed`), and each account's platinum and gold must cover the offer (244-261). Any refusal resets both acceptances (264-270) and sends the updated window; nothing moves. Apply (275-322): account currency moves first when both sides have accounts (275-278, `HandleAccountGoldTrade`, body not read); then each item's `OnSecureTrade` runs (293) and the item goes to the other side's backpack (297); the second side repeats this (302-322). Then the trade closes (324).

Numbers: stack cap 60000 (`Item.cs` 2475, theirs). Virtual items are not counted (`Container.cs` 247, theirs). `MaxItems` and `MaxWeight` are per container from `containers.cfg` (`Container.cs` 1068 default `ContainerData(0x3C, ...)`; values not read).

## 2. Key functions

- `ConsumeTotal` (Type[][]): `/mnt/frankendom-donors/ModernUO/Projects/Server/Items/Container.cs` 744-768. Two phases, all-or-nothing by design (see defect D1).
- `ConsumeTotal` (single type): `/mnt/frankendom-donors/ModernUO/Projects/Server/Items/Container.cs` 796-806.
- `ConsumeSlice`: `/mnt/frankendom-donors/ModernUO/Projects/Server/Items/Container.cs` 1033-1052.
- `ConsumeTotalGrouped`: `/mnt/frankendom-donors/ModernUO/Projects/Server/Items/Container.cs` 676-711 (and the Type[][] overload 713-742).
- `TryDropItem` and `CheckHold`: `/mnt/frankendom-donors/ModernUO/Projects/Server/Items/Container.cs` 426-448 and 230-281.
- `CanStackWith` and `StackWith`: `/mnt/frankendom-donors/ModernUO/Projects/Server/Items/Item.cs` 2469-2513.
- `EquipItem` and `CheckEquip`: `/mnt/frankendom-donors/ModernUO/Projects/Server/Mobiles/Mobile.cs` 7677-7689 and 7800-7822.
- `SecureTrade.Update`: `/mnt/frankendom-donors/ModernUO/Projects/Server/SecureTrade.cs` 186-330.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Plan every requirement, then apply; a failed requirement changes nothing | None (the rule) |
| Single-stack partial take, last stack takes the remainder | None |
| Stack only when type, id, hue, name match and the total stays within a cap | Cap 60000 (theirs, `Item.cs` 2475) |
| Stack first, then new slot, with a weight-only check for stacking | None (order) |
| Capacity: item count (virtual items free) and weight, checked up the parent chain | `MaxItems`, `MaxWeight` per container (data; not read) |
| Two-sided accept, any veto resets both | None |
| Loot type falls back to Regular when stacks differ | Regular (theirs, `Item.cs` 2489) |

## 4. TypeScript sketch

simplified: the sketch keeps the Type[][]-style requirement list (ids and amount) and the two phases. It reorders the donor: phase 1 records a plan against a remainder per stack, and phase 2 only applies that plan (the donor's phase 2 re-lists and consumes per requirement). That fixes D1 (overlapping requirements). It omits the grouped adjacency variant (D3), the recursive walk into nested containers (here one flat list), the callbacks (`OnItemConsumed`), the trade veto and account currency, and the stack-merge and capacity rules described in section 1. Hand-traced, not run: bag `[{id: gold, amount: 15}]` with requirements `[{gold, 10}, {gold, 10}]` returns 1 and leaves the bag at 15; the donor's code would consume 10 then 5 and return -1. Typechecked on the VPS with `tsc --strict --target es2020` (exit 0).

```ts
// Licence: GPL-3.0 (ModernUO LICENSE, "GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007"). Clean-room: rewritten from the rule
// described in the note (check the whole cost, then apply it), not a translation of the donor's lines.
export interface Stack { id: number; amount: number; }
export interface Requirement { ids: ReadonlySet<number>; amount: number; }

// Returns -1 when every requirement was met and applied, otherwise the index of the first unmet requirement.
// Nothing is changed unless every requirement is met.
export function consumeAll(bag: Stack[], reqs: Requirement[]): number {
  // Phase 1: plan against a remainder per stack, so two requirements that
  // draw on the same stack cannot both count the same units.
  const left = bag.map(s => s.amount);
  const plan: { stack: number; take: number }[] = [];
  for (let r = 0; r < reqs.length; r++) {
    let need = reqs[r].amount;
    for (let i = 0; i < bag.length && need > 0; i++) {
      if (!reqs[r].ids.has(bag[i].id) || left[i] === 0) continue;
      const take = Math.min(left[i], need);
      left[i] -= take;
      need -= take;
      plan.push({ stack: i, take });
    }
    if (need > 0) return r; // unmet: no change has been made
  }

  // Phase 2: apply the plan. Every take was checked against the remainder, so this cannot run short.
  for (const p of plan) bag[p.stack].amount -= p.take;
  for (let i = bag.length - 1; i >= 0; i--) if (bag[i].amount === 0) bag.splice(i, 1);
  return -1;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/ledger.ts` (new module, the one place item counts change for spends: craft, buy, trade, consume). Parity-checklist row **18** (loot roll and XP award) is the nearest row; no checklist row covers multi-item spends, so this is a gap (section 6).
- Trade commit (two-sided accept, veto resets both, then apply) belongs in the same module, as a second function over the same ledger.
- Reuse tag: adapt (GPL-3.0: shape only, clean-room sketch; no code adapted)
- Brief rule served: 1 (one engine, one ledger: a spend or trade is one engine step that is checked in full first); rules 7-9 n/a

## 6. Gaps and risks

- **D1 (defect, keep the idea):** phase 1 checks each requirement against the whole pool (`Container.cs` 754, and 781 for the Type overload) and does not subtract the earlier requirements. Two requirements that draw on the same stack both pass phase 1; phase 2 consumes them in turn, `ConsumeSlice` runs out (1035, 1039-1049 with `need` still above zero) and the method still returns -1 (success). Example: 15 gold and two 10-gold requirements: phase 2 takes 10 then 5, and the second requirement is short by 5 with no error. fix: plan against a per-stack remainder, as the sketch does, and return the failing index.
- **D2 (minor):** `RecurseConsumeUpTo` (`Container.cs` 826-864) returns only from the current level once the target is met, so the walk goes on into siblings with `need` at zero; an item with amount 0 would be queued for deletion (846-849). Zero-amount stacks should not exist (not verified in the data). fix: skip items with `Amount <= 0` at the top of the loop.
- **D3 (risk, do not copy as is):** grouped consume builds groups as contiguous runs in list order (`Container.cs` 978-1004), so a group whose members are not adjacent in the snapshot is split and fails phase 1 (a false refusal). The snapshot order (`ListItemsByType`) was not read. fix: group by key into a map, not by adjacency.
- **D4 (risk, trade):** the trade's apply step (`SecureTrade.cs` 275-322) has no rollback: the first side's items have already moved before the second side's loop starts, so anything that throws midway leaves a half-moved trade. The validate step (199-273) is a real all-or-nothing veto; the apply step is not. Whether `AddToBackpack` (297, 319) refuses or drops an item when the backpack is full was not read. fix: make the apply step a second check-then-apply that confirms every destination can take its items before the first move.
- **Callback during apply (risk):** `ConsumeSlice` fires callbacks inside phase 2 (1041), so a callback that changes the bag would break the plan. The sketch has no callbacks; if Frankendom needs them, run them after the apply loop.
- **Loot type and provenance (out of scope for us):** the donor's loot type (Regular, Blessed...) and constructed-by-player flags fall back to Regular on a mixed stack (`Item.cs` 2487-2496). We have one ledger and no per-item provenance. Keep only if we want player-made tracking.
- **Equip gate order (row 15, not this cell):** `CheckEquip` checks both directions for layer conflicts (`Mobile.cs` 7681-7682) and `EquipItem` short-circuits through the hooks (7807). This is a clean gate order for gear dressing, noted here, not built for row 15.
- **Bank and containers (not read):** `BankBox` is a `Container` subclass (`Containers.cs` 8, 16); its rules and per-container `MaxItems`/`MaxWeight` values (`containers.cfg`) were not read, so no bank behaviour is claimed.
- **Not read:** `ListItemsByType` and `FindItems` ordering, `CheckConflictingLayer`, `SecureTrade` cancel and currency-edit paths (which reset acceptance), `AddToBackpack`, and the client-facing trade and container displays.

Reuse tag: adapt (GPL-3.0: shape only)
Brief rule served: 1 (one engine, one ledger: a spend or trade is checked in full before any change); rules 7-9 n/a
