# pmbstyle-L2Solo (inventory-bank-equipment, cell 9)

Donor: /mnt/frankendom-donors/pmbstyle-L2Solo (src/GameServer/Actor/Backpack.js; src/GameServer/Model/Backpack.js; src/GameServer/Warehouse/PersonalWarehouse.js; src/Database.js; src/GameServer/Network/Request/WarehouseDeposit.js) | Licence: Apache License 2.0 (LICENSE file: "Apache License Version 2.0, January 2004") — code may be adapted, keep the Apache notice | JavaScript | symbol Backpack.equipGear

Checked: read Backpack.js 1-80, 73-102, 174-196, 1442-1574 (equipGear, unequipGear, updateDatabaseTimer); grep of Backpack.js method list; Model/Backpack.js 1-80 (equipment enum, paperdoll writes); Warehouse/PersonalWarehouse.js whole file; Warehouse/WarehouseItemRules.js whole; Network/Request/WarehouseDeposit.js and WarehouseWithdraw.js whole; Database.js 226-260 (inTransaction, withCharacterFlush), 4569-4602 (transferInventoryToWarehouse, transferWarehouseToInventory). Callers: equipGear is reached from useItem (Backpack.js:196) and BotEquipmentUpgrade.js:381 (not read). deleteItem has eight call sites found by grep, none read in full. Not read: CharacterWriteQueue.js, Item.js, ItemSlot.slotFor, ClanWarehouse.js (grep only), the use-item request handler, the client. The bank path (validate then transfer) is high confidence; the defect in section 6 is medium (reachability depends on memory and database drifting apart, not tested). The loot pickup UI is not in this server file (not read).

Best transferable idea: Resolve equipment conflicts with a fixed table (a two-hand weapon clears both hands, body armour clears the split pieces, a second ear or fin takes the free twin), and validate a whole bank batch before moving any row.
Decision (proposed): adapt — keep the conflict table and twin placement with Frankendom's own slot names; keep validate-then-transfer for the bank but make the whole batch one all-or-nothing transaction; do not copy the write-behind persistence (Backpack.js:88, 1506) because the server must commit before the client sees a change.
Acceptance: a server test equips a two-hand weapon while a shield is worn: the shield comes off, the two-hand item sits in the dual slot, and a bank deposit of [a valid line, an invalid line] changes nothing and returns one refusal.

## 1. Mechanism

Equip (Backpack.equipGear, src/GameServer/Actor/Backpack.js:1457-1516). useItem (196) sends any wearable to equipGear, after it sets the canonical slot (195). The order inside equipGear:
1. A dead actor is refused (1458-1460).
2. Conflicts are cleared by a fixed table: weapon or shield clears the dual slot (1465-1466); dual clears weapon and shield (1469-1472); chest or pants clears the one-piece armour (1474-1476); one-piece armour clears chest and pants (1478-1481).
3. Paired slots: for an ear pair (1483-1488) or a fin pair (1490-1495), if the requested slot is occupied and the twin is free, the item is moved to the twin (1486, 1493).
4. The target slot is cleared (1498), the paperdoll is written (1499), the item is marked equipped (1500).
5. Persist (1506), console message (1508-1510), stat recalc (1513), toggle sync (1514), equip event (1515).

Unequip (unequipGear, 1518-1555): collects every equipped row in the slot (1526-1528), including old saves with more than one (1523-1525), clears the paperdoll slot (1534), marks rows unequipped (1535-1541), persists (1542), moves the removed gear to the front of the list (1544-1549), and recalculates once (1552).

Bank (PersonalWarehouse.js, Network/Request/WarehouseDeposit.js): the request is parsed with at most 100 lines (WarehouseDeposit.js:8). The window must be a deposit window (20), and the warehouse NPC must be in range (PersonalWarehouse.js:21, radius 300 at line 11). Deposit (58-95): flush pending character writes (62), take only items that pass canDeposit (WarehouseItemRules.js:2: not equipped, not pet-locked, not quest kind, not class 3), validate every line (64; duplicate ids, amount above zero, amount not above the stack, lines at most 100 at 47-56), then for each line: one database transfer (74), merge into the first warehouse row with the same selfId for stackables (70-72, 78-79), or push a new row (81-85), then drop the inventory row when nothing is left (88-92). Success sends the list (WarehouseDeposit.js:22); failure sends action failed (25).

Database transfer (Database.js:4569-4586): one immediate transaction (inTransaction, 234-247: BEGIN IMMEDIATE at 237, ROLLBACK at 243) wrapped by a character flush (withCharacterFlush, 249-252). It re-reads the source row and refuses if the amount has changed (4572), adds to the target row (4575), inserts or updates it (4579-4580), and deletes the inventory row at zero (4582-4583). Withdraw mirrors it (PersonalWarehouse.js:97-133; Database.js:4588-4602).

## 2. Key functions

- Backpack.equipGear, src/GameServer/Actor/Backpack.js:1457-1516: conflict table and twin placement.
- Backpack.unequipGear, src/GameServer/Actor/Backpack.js:1518-1555: collect and clear a slot.
- Backpack.deleteItem, src/GameServer/Actor/Backpack.js:73-102: partial and full removal, memory first, then the write queue.
- PersonalWarehouse.deposit and withdraw, src/GameServer/Warehouse/PersonalWarehouse.js:58-133, with validateLines at 47-56.
- Database.transferInventoryToWarehouse and transferWarehouseToInventory, src/Database.js:4569-4602.
- BackpackModel.equipPaperdoll and unequipPaperdoll, src/GameServer/Model/Backpack.js:36-54 (armour also writes the chest slot, line 40).

## 3. Numbers vs mechanism

- Equipment slots: 16 (src/GameServer/Model/Backpack.js:15-32; armor = 15 at line 31). The conflict table is the only place the split-armour and two-hand rules live.
- Bank batch: at most 100 lines (PersonalWarehouse.js:10; WarehouseDeposit.js:8 for the packet). Interaction radius: 300 units, squared distance compared (PersonalWarehouse.js:11, 21).
- Stack merge key: selfId only, for stackables only. Enchant is written on insert (Database.js:4579, 4595) but not compared on merge.
- Worked check (run on the VPS against the sketch): two-hand weapon equipped, then a shield: the paperdoll keeps only slot 8, and the dual item reads equipped false. Two earrings equipped in turn: the second lands in slot 2 (the free twin). Deposit of [30 of stack 900 with a 20-stack in the bank, and 1 non-stackable] with a bad second line (amount 5 of 1) returns null and the input store still shows 50. The good version moves 30 into the existing row (20 to 50), adds a new row for the non-stackable, and removes the emptied inventory row.

## 4. TypeScript sketch

simplified: models the equipGear conflict table and ear/fin twin placement (Backpack.js:1465-1495) with a Map as the paperdoll, and the bank deposit (PersonalWarehouse.js:47-95) as an all-or-nothing batch. Omits the database layer (the transfer is an in-memory copy), persistence, stat recalc, toggle sync, console messages, the pet-gear and dead-actor checks, the armour-writes-chest-slot detail of BackpackModel, the withdraw side, and the enchant check. Reorders the donor: the donor validates all lines, then awaits one database transfer per line, so a failure after line 1 leaves line 1 committed; the sketch applies every line to copies and returns null on any failure, which is the fix.

```ts
// Equipment slots as in BackpackModel.equipment (Model/Backpack.js:15-32)
export const SLOT = {
  underwear: 0, earr: 1, earl: 2, neck: 3, fr: 4, fl: 5, head: 6, weapon: 7, shield: 8,
  hands: 9, chest: 10, pants: 11, feet: 12, cloak: 13, dual: 14, armor: 15,
} as const;
export type Slot = (typeof SLOT)[keyof typeof SLOT];

export interface Gear { id: number; selfId: number; slot: Slot; equipped: boolean }

// Slots that must be cleared before `slot` can take an item (Backpack.js:1465-1481)
function conflicts(slot: Slot): Slot[] {
  if (slot === SLOT.weapon || slot === SLOT.shield) return [SLOT.dual];
  if (slot === SLOT.dual) return [SLOT.weapon, SLOT.shield];
  if (slot === SLOT.chest || slot === SLOT.pants) return [SLOT.armor];
  if (slot === SLOT.armor) return [SLOT.chest, SLOT.pants];
  return [];
}

// Ear and fin pairs: take the free twin when the requested one is occupied (Backpack.js:1482-1495)
const TWIN: Partial<Record<Slot, Slot>> = {
  [SLOT.earr]: SLOT.earl, [SLOT.earl]: SLOT.earr, [SLOT.fr]: SLOT.fl, [SLOT.fl]: SLOT.fr,
};

export function equip(paperdoll: Map<Slot, Gear>, item: Gear): Slot {
  let target = item.slot;
  const twin = TWIN[target];
  if (twin !== undefined && paperdoll.has(target) && !paperdoll.has(twin)) target = twin;
  for (const c of conflicts(target)) unequip(paperdoll, c);
  unequip(paperdoll, target); // replace whatever sits in the chosen slot
  item.slot = target;
  item.equipped = true;
  paperdoll.set(target, item);
  return target;
}

export function unequip(paperdoll: Map<Slot, Gear>, slot: Slot): void {
  const g = paperdoll.get(slot);
  if (!g) return;
  g.equipped = false;
  paperdoll.delete(slot);
}

// Bank: all-or-nothing batch (donor validates all lines, then commits line by line with one DB transaction each)
export interface Row { id: number; selfId: number; amount: number; stackable: boolean }
export interface Line { objectId: number; amount: number }
export interface Store { inventory: Row[]; warehouse: Row[]; nextId: number }

const MAX_LINES = 100;

function validate(lines: Line[], inventory: Row[]): boolean {
  const seen = new Set<number>();
  return lines.length <= MAX_LINES && lines.every((l) => {
    if (!Number.isSafeInteger(l.objectId) || !Number.isSafeInteger(l.amount) || l.amount <= 0) return false;
    if (seen.has(l.objectId)) return false;
    seen.add(l.objectId);
    const row = inventory.find((r) => r.id === l.objectId);
    return row !== undefined && l.amount <= row.amount;
  });
}

// Returns the new store, or null if any line fails; the input store is never half-changed.
export function deposit(store: Store, lines: Line[]): Store | null {
  const inv = store.inventory.map((r) => ({ ...r }));
  const wh = store.warehouse.map((r) => ({ ...r }));
  if (!validate(lines, inv)) return null;
  let nextId = store.nextId;
  for (const l of lines) {
    const src = inv.find((r) => r.id === l.objectId);
    if (src === undefined) return null;
    const target = src.stackable ? wh.find((r) => r.stackable && r.selfId === src.selfId) : undefined;
    if (target !== undefined) {
      target.amount += l.amount;
    } else {
      wh.push({ id: nextId++, selfId: src.selfId, amount: l.amount, stackable: src.stackable });
    }
    src.amount -= l.amount;
    if (src.amount === 0) inv.splice(inv.indexOf(src), 1);
  }
  return { inventory: inv, warehouse: wh, nextId };
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/iv018/pmbstyle-L2Solo-equip-bank.ts): exit 0. Behaviour check (compiled copy on the VPS): shield after two-hand leaves slots [8] with dual unequipped; second earring goes to slot 2; the bad deposit returns null and the input stock stays at 50; the good deposit gives warehouse [50, 1] and inventory [20].

## 5. Lands in

Target: origins/inventory/equip.ts (proposed; the Frankendom repo was not opened for this note) for the conflict table and twin placement, and origins/inventory/bank.ts for the batch. Parity row 15 (gear dressing: equipment slots and what a slot change does to the dressed hero).

## 6. Gaps and risks

- Frankendom rulings: one character and one ledger. The donor's bank batch is the right shape but not all-or-nothing across lines; the fix is the sketch's copy-then-swap, or one transaction for the whole batch.
- Defects (idea kept, fix in the sketch or the note):
  1. Partial bank failure. Validation runs first (PersonalWarehouse.js:64), but each line then awaits its own database transfer (74). If line 2 throws ("inventory item changed", Database.js:4572), line 1 is already committed in the database and in memory (78-91). The handler then sends action failed (WarehouseDeposit.js:25) and no list (line 22 is success only), so the client keeps a stale inventory. Fix: one transaction for the batch and always re-send the list. Reachability depends on memory and database drifting apart; not tested.
  2. deleteItem does not check the amount (Backpack.js:80-81). Any amount at or above the stack removes the whole stack. Callers were not all read, so this is a risk, not a proven bug. Fix: reject amount above fetchAmount() at the top of deleteItem.
  3. deleteItem returns without calling back when the actor is dead (Backpack.js:74-76), so a caller that waits on the callback (consumeSoulshot passes one at 114-116) never resumes. Fix: call back with false.
  4. Write-behind persistence. deleteItem updates memory first and writes through CharacterWriteQueue without awaiting it (Backpack.js:83, 88, 93, 98). equipGear does the same with updateDatabaseTimer, whose promise is not awaited (1506, 1562-1570). A crash between memory and database leaves the database stale. Fix for a server-verified ledger: await the write before the client sees the change.
  5. Stack merge ignores enchant. The insert records enchant (Database.js:4579) but the merge into an existing row does not compare or carry it (4575). Stackables are usually unenchanted, which I did not verify across the data.
- Not modelled: pet gear (useItem returns early for pet gear, Backpack.js:193), the armour-writes-chest detail (Model/Backpack.js:40), console and equip events, the withdraw side of the batch, and the clan warehouse (ClanWarehouse.js, grep only).
- The loot presentation on a phone is not in this server file; the client was not read.

Reuse tag: shape-reuse candidate (Apache-2.0: code may be adapted, keep the notice; no code copied).
Brief rule served: judge the idea, not the genre; keep the idea and fix the defects (addendum rule of 2026-10-10); one ledger and server-verified moves per the ruling.
