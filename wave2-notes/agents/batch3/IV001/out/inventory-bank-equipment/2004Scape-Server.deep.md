# 2004Scape-Server (inventory-bank-equipment, cell 9)

Donor: `/mnt/frankendom-donors/2004Scape-Server/src/engine/Inventory.ts` | Licence: MIT (LICENSE line 1 "MIT License", line 3 "Copyright (c) 2023-2025 Lost City"; full text not read past line 3) | TypeScript | symbol `Inventory.add` with `Inventory.remove` and `InventoryTransaction`

Checked: Read in full: `Inventory.ts` (1-390: the transaction class, add, remove, delete, swap, transfer). `Player.ts` 1495-1656 (invAdd, invSet, invDel, invDelSlot, invSize, invTotal, invFreeSpace, invItemSpace, invMoveToSlot, invMoveFromSlot; 1657-1700 not read). `script/handlers/InvOps.ts`: 58-84 (INV_ADD), 324-352 (INV_MOVEFROMSLOT), 374-470 (BOTH_MOVEINV; 446-470 only in part), 503-535 (INV_MOVEITEM), 550-601 (the cert and uncert bodies; the cert header at 539 seen by grep only). Candidates opened: Inventory.ts, Player.ts, InvOps.ts, WealthEvent.ts (type file), ObjType.ts (grep), `World.ts`/`Zone.ts` (grep for `revert`, not a match). The hint file `ServerProt244.ts` was NOT opened (not read; by its name it is a protocol file), and the inventory logic is in Inventory.ts. Not read: the client update messages (UpdateInvFull/Partial), the InvType and ObjType config, `World.addObj`. Callers checked by grep: `invAdd`, `invDel`, `invMoveFromSlot`, `invMoveToSlot`, `invItemSpace` (all in InvOps.ts); `transfer` has no caller in src; `InventoryTransaction.revert` has no caller in src; `dryRun` has no caller outside Inventory.ts; `shift` is marked unused in its own comment (336). Confidence: high on add, remove and the move order; high on the defects, which come from reading the code and were NOT executed. camera_scope: not applicable.

## 1. Mechanism

- An inventory is a fixed array of slots, each `null` or `{id, count}` (Inventory.ts 84, 92). Stack behaviour comes from the inventory type: `stackall` gives always-stack (59-62); the object's `stackable` flag decides in normal mode (161).
- Add (`Inventory.add`, 158-241). Order: (a) decide `stack` (161); (b) `previousCount` is the total of that id held (164-166); at the stack limit, fail (168-170); (c) if there are no free slots and the add cannot merge into a stack, fail (173-175); (d) all-or-nothing mode (`assureFullInsertion`, default true from `Player.invAdd`) refuses a stack that would pass the limit (178-180) or a non-stackable count above the free slots (182-184); partial mode skips these and places what fits (185-190); (e) stackable: use the existing stack, or the first free slot from `beginSlot`; no slot, return completed 0 (224-226); total = min(limit, old + count) (230); completed = total minus old (237); (f) non-stackable: place one unit in each free slot from `beginSlot` until `count` is placed (199-213). Returns requested, completed and the slots written (240).
- Remove (`Inventory.remove`, 243-323). Count what is held (244); all-or-nothing refuses a short stock (247-251); walk from `beginSlot` to the end, then the skipped slots (256-263, 293-316); take min(stack, left) (276); a stack reaching zero is cleared unless it is a stock object (280-286). The result records only emptied stacks, and the record holds the same object, now at count 0 (281-284). A partly used stack is not recorded at all.
- Transactions: `InventoryTransaction` (7-36) holds requested, completed and the items. `getLeftOver` and `hasSucceeded` (18-24) read it. `revert` (30-35) removes what was recorded; it is correct for an add and wrong for a remove (see section 6). Nothing in src calls `revert`.
- Player wrappers (`Player.ts`): `invAdd` (1495-1503) returns completed. `invDel` (1518-1531) returns completed. `invItemSpace` (1573-1594) pre-checks how many of `count` would not fit: stackable uses the stack limit (1586-1591), non-stackable uses free slots (1593).
- Moves in the script ops (`InvOps.ts`):
  - INV_ADD (58-84): add with partial placement; the rest is spawned on the floor at the player's position (74-82), one object per unit if not stackable, one object for the total if stackable and more than one.
  - INV_MOVEFROMSLOT (324-350): `Player.invMoveFromSlot` (1630-1656) deletes the source slot first (1650), then adds with partial placement and returns overflow = whole slot count minus placed (1653). The handler spills the overflow (339-348).
  - INV_MOVETOSLOT (354-372): `Player.invMoveToSlot` (1596-1628) reads both slots first (1615-1616), then writes each side from the other: a true swap.
  - INV_MOVEITEM (503-535): `invDel` removes `count` and returns `completed` (520); `invAdd(completed, partial)` places (525); overflow = `count` minus placed, spilled to the floor (526-534). Cert and uncert variants at 539-601 (overflow at 565 for cert; no spill at all for uncert, see section 6).
  - BOTH_MOVEINV (374-470): every slot of one player's inventory moves into another's. Each source slot is deleted (420), then added with partial placement (424), spilling the overflow to the receiving player (425-433). Stake inventories log a wealth event (450-460).

## 2. Key functions

- `Inventory.add`: `.../src/engine/Inventory.ts` 158-241.
- `Inventory.remove`: `.../src/engine/Inventory.ts` 243-323.
- `InventoryTransaction`: `.../src/engine/Inventory.ts` 7-36.
- `Inventory.transfer` (note/unnote, add then remove): `.../src/engine/Inventory.ts` 363-389; no caller in src.
- `Player.invAdd`, `invDel`, `invItemSpace`, `invMoveToSlot`, `invMoveFromSlot`: `.../src/engine/entity/Player.ts` 1495-1656.
- Script ops: `.../src/engine/script/handlers/InvOps.ts` 58-84 (INV_ADD), 324-350 (INV_MOVEFROMSLOT), 374-470 (BOTH_MOVEINV), 503-535 (INV_MOVEITEM), 574-601 (INV_MOVEITEM_UNCERT).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Stack total capped at a limit; partial versus all-or-nothing add | STACK_LIMIT 0x7fffffff (Inventory.ts 46) |
| Stackable merges into one stack; other items take one slot per unit | Stack type normal / always / never (Inventory.ts 48-50); stackall gives always (61) |
| Result carries requested and completed, so the caller can spill the rest | Spill object despawn argument 200 (InvOps.ts 78); unit of that argument not read |
| Remove from a start slot, then wrap | beginSlot -1 means start at 0 (Player.ts 1518-1527; the check at 1525) |
| Free-space pre-check before a move | Non-stackable pre-check has an extra term: `invSize - size` (Player.ts 1593) |
| Inventory size | Per type (`type.size`, Inventory.ts 64); values not read |

## 4. TypeScript sketch

simplified: `addItems` and `removeItems` follow the donor's order: stack total and limit, the all-or-nothing checks, first-free-slot placement, wrap-around removal, and the emptied-stack record with count 0, as the donor records it. They omit the stock-object exceptions, `dryRun`, note and unnote conversion, the protected-access checks, the floor spill, and the wealth logs. `moveAtomic` is NOT the donor's order: it is the proposed fix. It checks that the target fits (on a copy) before it removes from the source, where the donor removes first. Its `throw` is for a case that should not happen after the check.

```ts
// Licence: MIT (donor, Lost City 2023-2025; adaptation allowed). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Item = { id: number; count: number };
type Slot = Item | null;
type Changed = { slot: number; item: Item };
type Txn = { requested: number; completed: number; changed: Changed[] };

const STACK_LIMIT = 0x7fffffff;

function countOf(inv: Slot[], id: number): number {
  return inv.reduce((n, s) => n + (s !== null && s.id === id ? s.count : 0), 0);
}

// Add. Stackable items merge into one stack (capped at STACK_LIMIT). Other items take one slot per unit.
// allOrNothing = true refuses unless every unit fits; false places what fits.
function addItems(inv: Slot[], id: number, count: number, stackable: boolean, allOrNothing: boolean, beginSlot = 0): Txn {
  const fail: Txn = { requested: count, completed: 0, changed: [] };
  const previous = countOf(inv, id);
  const free = inv.filter(s => s === null).length;

  if (stackable) {
    if (previous === STACK_LIMIT) return fail;
    if (free === 0 && previous === 0) return fail;
    if (allOrNothing && previous > STACK_LIMIT - count) return fail;
    let idx = inv.findIndex(s => s !== null && s.id === id);
    if (idx === -1) {
      idx = inv.indexOf(null, beginSlot);
      if (idx === -1) return fail;
    }
    const before = inv[idx]?.count ?? 0;
    const total = Math.min(STACK_LIMIT, before + count);
    inv[idx] = { id, count: total };
    return { requested: count, completed: total - before, changed: [{ slot: idx, item: { id, count: total } }] };
  }

  if (allOrNothing && count > free) return fail;
  const changed: Changed[] = [];
  for (let i = Math.max(0, beginSlot); i < inv.length && changed.length < count; i++) {
    if (inv[i] !== null) continue;
    inv[i] = { id, count: 1 };
    changed.push({ slot: i, item: { id, count: 1 } });
  }
  return { requested: count, completed: changed.length, changed };
}

// Remove. Walks from beginSlot to the end, then wraps to the start. As in the donor, an emptied stack is
// recorded with count 0 and a partly used stack is not recorded at all.
function removeItems(inv: Slot[], id: number, count: number, allOrNothing: boolean, beginSlot = 0): Txn {
  const have = countOf(inv, id);
  if (allOrNothing ? have < count : have < 1) return { requested: count, completed: 0, changed: [] };

  let done = 0;
  const changed: Changed[] = [];
  for (let k = 0; k < inv.length && done < count; k++) {
    const i = (beginSlot + k) % inv.length;
    const s = inv[i];
    if (s === null || s.id !== id) continue;
    const take = Math.min(s.count, count - done);
    done += take;
    s.count -= take;
    if (s.count === 0) {
      inv[i] = null;
      changed.push({ slot: i, item: { id, count: 0 } });
    }
  }
  return { requested: count, completed: done, changed };
}

// Proposed server move (not the donor's order). Check that the target fits first, on a copy;
// only then remove from the source and add to the target. Nothing is removed unless the add will succeed.
function moveAtomic(from: Slot[], to: Slot[], id: number, count: number, stackable: boolean): Txn {
  const probe = to.map(s => (s === null ? null : { ...s }));
  if (addItems(probe, id, count, stackable, true).completed !== count) {
    return { requested: count, completed: 0, changed: [] };
  }
  const taken = removeItems(from, id, count, true);
  if (taken.completed !== count) throw new Error("source changed between check and remove");
  return addItems(to, id, count, stackable, true);
}

export {};
```

## 5. Lands in

- TARGET `origins/inventory/transaction.ts` (proposed name; the Frankendom tree was not read, per the batch rule). Holds the add, remove and move functions, and the one server call that applies a move to both inventories.
- Parity row: no row in 1-23 covers slot-level inventory transactions. The nearest is row 18 (loot roll and XP award), because the move result decides what is placed, spilled as loot, or refused. Say plainly: that is a partial fit.
- Reuse tag: rewrite-from-idea (MIT; adaptation allowed, written clean-room here)
- Brief rule served: 1 (one ledger: every item move is one server transaction with requested and completed counts); rules 7-9 n/a

Best transferable idea: Make every item move one server transaction that checks the target fits before it removes from the source, and returns requested and completed counts, so the caller places, spills or refuses the rest with no silent loss.
Decision (proposed): adapt. Take the result shape (requested, completed, the slots written) and the all-or-nothing versus partial flag. Do not take the donor's order (remove first, then add, spill the rest) or its uncert path, which can lose items; do not copy `revert` or `transfer`, which are unused and wrong for removes.
Acceptance: A server test: an all-or-nothing move of 10 units into room for 4 changes neither inventory (both byte-equal before and after); a partial move of 10 units into room for 4 moves 4 and leaves 6 in the source (no floor spill); a move of 10 units when the source holds 4 moves 4 and spills 0 (the donor's INV_MOVEITEM would spill 6, which the test forbids); a stake move between two players moves all or nothing.

## 6. Gaps and risks

- Overflow over-count in INV_MOVEITEM. The overflow is `count` minus the amount placed (InvOps.ts 525). `invDel` removes only what the source holds (520), so when the source holds less than `count`, `completed` is less than `count`, the placed amount equals `completed`, and the overflow is `count - completed`: units the source never had are spawned on the floor. Read from code, not executed. The cert variant has the same formula (565).
- INV_MOVEITEM_UNCERT can lose items. It removes `completed` from the source (591), then adds with the default all-or-nothing flag (599). If the target cannot take all of them, the add places nothing, nothing spills, and the removed units are gone. Read from code, not executed. The engine does not check space first; the donor's caller is expected to (see the comment at InvOps.ts 413 for the both-move op).
- Move order is non-atomic. The source is cleared before the target add (Player.ts 1650; InvOps.ts 420, 424). Nothing is undone if the add fails; the only protection is the spill. Frankendom needs check, then remove, then add in one transaction.
- Removal records cannot undo a removal. An emptied stack is recorded with count 0 (Inventory.ts 281-284) and a partly used stack is not recorded. `revert` (30-35) would call `remove` with those counts, so it would not restore the removed units. No caller uses it.
- `transfer` (363-389) has no caller in src. If its remove places 0 after the add succeeded, it returns null and does not revert the add (384-386).
- `dryRun` (flag at 158, honored at 205 and 233) has no caller. `shift` (337) is marked unused in its own comment (336).
- Spilled items on the floor are outside the inventory ledger. The despawn argument is 200 (InvOps.ts 78), and its unit was not read. Frankendom must decide whether a floor item is ledger state (it probably should be).
- Stock objects are not cleared at zero (Inventory.ts 280, 304), and the stock exception in add (173) is undone by the empty-slot return (224-225) when the inventory is full. Frankendom needs one rule for shop stock.
- Bank storage: none in the server source. A grep for "bank" finds only one description string (`cache/config/ObjType.ts` 316: "Swap this note at any bank for ..."). Note and un-note conversion exists (certlink, InvOps.ts 562-564 and 596-600), but no bank inventory was found.
- Weight: none. Capacity is a slot count per inventory type (Inventory.ts 64, 88-92).
- Licence MIT: adaptation is allowed. The sketch is still written from the mechanism, not copied.
