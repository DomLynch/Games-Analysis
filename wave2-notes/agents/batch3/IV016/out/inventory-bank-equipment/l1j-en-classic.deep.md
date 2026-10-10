# l1j-en-classic (inventory-bank-equipment, cell 9)

Donor: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/L1PcInventory.java` (with `L1Inventory.java`, `L1EquipmentSlot.java`, `L1GroundInventory.java`, `clientpackets/C_PickUpItem.java`, `clientpackets/C_Result.java`) | Licence: GPL-2.0-or-later (the L1PcInventory.java header says version 2 or any later version; `COPYING` is the GPL v2 text) | Java | symbols `L1PcInventory.checkAddItem`, `L1Inventory.tradeItem`

Checked: The hint file `command/executor/L1Invul.java` was opened: it is a GM toggle for invulnerability, not the mechanism. Opened in full or in the ranges named: `L1PcInventory.java` 45-137 (cap, weight gate, gauge) and 403-470 (deleteItem, setEquipped); `L1Inventory.java` 74-110, 187-207 (storeTradeItem), 308-350 (tradeItem), and the lookup helpers 420-520; `Instance/L1ItemInstance.java` 250-258 and 1125-1135; `Instance/L1PcInstance.java` 1670-1697; `L1EquipmentSlot.java` 212-315; `clientpackets/C_PickUpItem.java` 44-194; `clientpackets/C_Result.java` 186-256 (deposit call and withdraw branch; the other clan and elf branches were only grepped); `L1GroundInventory.java` 19-126; `L1ItemOwnerTimer.java` (whole). Grep for callers of the owner timer: only `C_FishClick.java:114` sets it. Not read: the monster death drop path (not located), `L1DwarfInventory.java` persistence (loadItems, insertItem), `L1ArmorSet` set bonuses, the clan and elf warehouse bodies (C_Result 315-375 and 442-495). Confidence: high on the bag cap, the weight gate, the transfer order and the pickup order; medium on the warehouse fee order (read for the personal warehouse withdraw only). camera_scope: not applicable (not a camera cell).

Best transferable idea: a bag move checks the target's slot, weight and amount caps (a full bag still takes a stack it already holds) before it touches the source, then merges into the existing stack, so one checked transfer is the only way items change owner.
Decision (proposed): adapt - keep the stack-exempt slot cap and the check-then-move transfer because they give one ledger and server-verified counts; drop the donor's two weight formulas, the fee-first order and the post-mutation guard.
Acceptance: A server test with 180 slots used: a stackable item the player already holds is accepted (its stack grows by the requested count), a new item is refused with a "bag full" result, and a withdraw whose move is refused leaves the adena count unchanged.

## 1. Mechanism

- Scope. One bag per character: `L1PcInventory` extends `L1Inventory`. Each stack is one `L1ItemInstance` record; stackable items merge by item id. Equipped items stay in the bag list with an equipped flag, and the owner's `L1EquipmentSlot` holds the worn set.
- Add gate, `checkAddItem` (`L1PcInventory.java` 94-120). Run before every move into the bag, with a message flag. Order:
  1. Slot gate: refused when the bag holds more than 180 records (`MAX_SIZE`, line 51); at exactly 180 it is refused unless the item is stackable and the bag already holds that id (line 99). Refusal sends message 263.
  2. Weight gate: candidate = carried weight + (template weight x count / 1000, integer division) + 1 (line 107). Carried weight is the sum over records of max(count x weight / 1000, 1), or 0 when the item has no weight (`L1ItemInstance.java` 252-256; `L1Inventory.getWeight` sums the records). Refused when `calcWeight240(candidate) >= 240` (line 115).
  3. Amount gate: refused when the existing stack plus count goes over 2,000,000,000 (`L1Inventory.java` 44 defines the cap).
- Gauge, `calcWeight240` (`L1PcInventory.java` 70-88). If the candidate is over the max weight, the value is 240; otherwise it is round(candidate x 240 / max weight) (lines 75, 77, 80). Because of the rounding, refusal starts at about 99.8 percent of max weight (round(x) reaches 240 when x is 239.5 or more). Line 79 formats a string and throws the result away (dead line).
- Max carry weight, `getMaxWeight` (`L1PcInstance.java` 1670-1697): base 150 x floor(0.6 x STR + 0.4 x CON + 1) (line 1673); multiplied by 1 + armour reduction + doll reductions + 0.04 x the original STR/CON reduction (around 1686-1692); plus 180 if the DECREASE_WEIGHT effect is on (1686, 1694); then multiplied last by `Config.RATE_WEIGHT_LIMIT` (1696; default 1.0 in `config/rates.properties` line 92).
- Transfer, `tradeItem` (`L1Inventory.java` 308-350, synchronized on the source). Order of steps: (a) null or count <= 0 returns null; (b) an equipped source returns null (316); (c) the source must hold the count (319); (d) if the count is the whole record, the record is deleted from the source (326) and carried as is; otherwise the source count is reduced and a new carry record is created (331) with the same enchant, identify flag, durability, charge, remaining time, last-used and bless; (e) a guard at 344 logs and returns null if the source record still exists with its old count (this runs after the change, see section 6); (f) `inventory.storeTradeItem(carryItem)` (350).
- Store side, `storeTradeItem` (`L1Inventory.java` 187-207, synchronized on the target). A stackable item the target already holds adds its count to that record (191), the carry object is removed from the world (194) and the existing record is returned. Otherwise the item is placed at the owner's position and inserted in sorted order.
- Capacity is not checked inside the transfer. The caller checks first: pickup at `C_PickUpItem.java` 142, deposit at `C_Result.java` 188, withdraw at 233.
- Pickup, `C_PickUpItem` (44-194). In order: (1) the sent count must fit the ground record, else the event is reported and the player is disconnected (line 99); (2) an owner window set by someone else refuses the pickup with message 623 (line 118); (3) reach: tile line distance over 3 refuses silently (line 124); (4) adena total over 2,000,000,000 is refused with message 166 (about lines 136-138); (5) `checkAddItem` (line 142); (6) `groundInventory.tradeItem(item, pickupCount, bag)` (line 156), then a log line and the pickup action broadcast.
- Warehouse, `C_Result` (186-256, NPC `L1Dwarf`, level 5 or more). Deposit: `checkAddItemToWarehouse` (line 188; refusal sends message 75), then `tradeItem` into the warehouse (line 201). Withdraw (branch starting line 216): a request above the stored count bans the player (line 226); `checkAddItem` into the bag (233); take 30 adena (234); then `tradeItem` out of the warehouse (235), whose return value is not used. Refusal messages are 189 (fee short) and 270 (no room).
- Warehouse caps, `checkAddItemToWarehouse` (`L1Inventory.java` 101-120): the personal cap is `Config.MAX_PERSONAL_WAREHOUSE_ITEM` (line 110), the clan cap `Config.MAX_CLAN_WAREHOUSE_ITEM`, and the default is 100 (line 108) for any other type. The config values are not read.
- Equipment. `setEquipped(item, true)` sets the equipped flag and calls the owner's equip slot `set` (`L1PcInventory.java` 432). `L1EquipmentSlot.set` (212-268) adds the item's max HP and MP, the six stats, MR, SP and the haste and brave effects, then places a weapon or armour in the slot (first add at line 218). `remove` (270-315) subtracts the same fields (line 275) and clears the slot. Polymorph forces unequip through `takeoffEquip`, which checks the poly rules slot by slot (`L1PcInventory.java` 521-567).
- Ground presentation, `L1GroundInventory` (25-126). A drop is a world object at a tile. Inserting a record sets its despawn timer and sends `S_DropItem` to every player in range (line 96). A change in count resends `S_DropItem` to the players in range (line 105). Removal sends `S_RemoveObject` and cancels the timer (line 113). The despawn timer is set when the configured deletion type is `std`, after `Config.ALT_ITEM_DELETION_TIME` x 60 x 1000 ms (line 57; the value is not read), and item 40515 is exempt (line 53). When the timer fires it re-checks that the record is still on the ground before removing it.

## 2. Key functions

- `checkAddItem`: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/L1PcInventory.java` 94-120 (slot, weight, amount gates).
- `calcWeight240`: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/L1PcInventory.java` 70-88 (240-step gauge, rounding, dead format line 79).
- `tradeItem`: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/L1Inventory.java` 308-350 (the transfer: checks, split or delete, guard, store).
- `storeTradeItem`: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/L1Inventory.java` 187-207 (stack merge or insert on the target).
- `getMaxWeight`: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/Instance/L1PcInstance.java` 1670-1697 (STR/CON base, reductions, skill bonus, rate).
- `getWeight` (record): `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/Instance/L1ItemInstance.java` 252-258.
- Equipment `set` and `remove`: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/L1EquipmentSlot.java` 212-268 and 270-315.
- Pickup handler: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/clientpackets/C_PickUpItem.java` 44-194.
- Warehouse withdraw: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/clientpackets/C_Result.java` 216-256.
- Ground record: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/L1GroundInventory.java` 25-126.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Slot cap that still lets a full bag take a stack it holds | 180 records (`L1PcInventory.java` 51); warehouse default 100 (`L1Inventory.java` 108) |
| Weight gauge on 240 steps; the add is refused at the top step | 240 steps (line 75, 115); rounding (line 80); about 99.8 percent of max (derived from line 80) |
| Max carry weight from strength and constitution | 150 base; 0.6 STR and 0.4 CON, +1 (`L1PcInstance.java` 1673); reductions (around 1686-1692); +180 skill bonus (1686, 1694); rate 1.0 (`rates.properties` 92, applied at line 1696) |
| Stack amount cap | 2,000,000,000 (`L1Inventory.java` 44) |
| Withdraw fee | 30 adena (`C_Result.java` 234); elf-warehouse fee is 2 of item 40494 (line 483) |
| Pickup reach | 3 tiles (`C_PickUpItem.java` 124) |
| Owner window | 10,000 ms (`L1ItemInstance.java` 1131); set only by fishing (`C_FishClick.java` 114) |
| Ground despawn | `ALT_ITEM_DELETION_TIME` x 60 x 1000 ms (value not read); item 40515 exempt (`L1GroundInventory.java` 53) |

## 4. TypeScript sketch

simplified: one record per stack; non-stackable items are carried one per record, and the donor's per-instance enchant and durability are omitted. The gate compares the exact total with the cap, with no 240-step rounding and no +1 fudge, and one weight function serves both the carried total and the candidate (the donor uses two, see section 6). The sketch checks everything before it mutates, so the donor's post-mutation guard (`L1Inventory.java` 344) is not needed. `withdrawWithFee` takes the fee only after the move succeeds; the donor takes the fee first and ignores the move result (`C_Result.java` 234-235). Stat deltas, the 2,000,000,000 cap and the warehouse caps are reduced to one constant or left out.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
export {};

interface Item { id: number; stackable: boolean; unitWeight: number; } // unitWeight x count / 1000 = carried weight, as in the donor
interface Stack { item: Item; count: number; }
interface Bag { stacks: Stack[]; maxSlots: number; maxWeight: number; }

export type Refusal = 'ok' | 'slots-full' | 'weight-full' | 'amount-full' | 'no-stock' | 'no-fee';

const MAX_AMOUNT = 2000000000;

// Carried weight of one stack: at least 1 unit when the item has any weight.
function stackWeight(item: Item, count: number): number {
  if (item.unitWeight === 0) return 0;
  return Math.max(Math.floor((count * item.unitWeight) / 1000), 1);
}

export function carried(bag: Bag): number {
  let total = 0;
  for (const s of bag.stacks) total += stackWeight(s.item, s.count);
  return total;
}

function findStack(bag: Bag, itemId: number): Stack | undefined {
  return bag.stacks.find((s) => s.item.id === itemId);
}

// Check only, mutates nothing. A full bag still takes a stackable item it already holds.
// The weight test uses the same rule as carried(), applied to the total after the add.
export function canAdd(bag: Bag, item: Item, count: number): Refusal {
  if (count <= 0) return 'no-stock';
  const existing = findStack(bag, item.id);
  const mergeable = item.stackable && existing !== undefined;
  if (!mergeable && bag.stacks.length >= bag.maxSlots) return 'slots-full';

  const heldBefore = mergeable ? existing!.count : 0;
  const totalCount = heldBefore + count;
  if (totalCount > MAX_AMOUNT) return 'amount-full';

  const before = carried(bag);
  const old = mergeable ? stackWeight(item, heldBefore) : 0;
  const after = before - old + stackWeight(item, totalCount);
  if (after >= bag.maxWeight) return 'weight-full';
  return 'ok';
}

// Atomic move: every check runs first; the source and the target change together in one synchronous step.
export function transfer(src: Bag, dst: Bag, itemId: number, count: number): Refusal {
  const from = findStack(src, itemId);
  if (!from || count <= 0 || from.count < count) return 'no-stock';
  if (!from.item.stackable && count !== 1) return 'no-stock'; // non-stackable items move one at a time
  const verdict = canAdd(dst, from.item, count);
  if (verdict !== 'ok') return verdict;

  from.count -= count;
  if (from.count === 0) src.stacks = src.stacks.filter((s) => s !== from);
  const into = from.item.stackable ? findStack(dst, itemId) : undefined;
  if (into) into.count += count;
  else dst.stacks.push({ item: from.item, count });
  return 'ok';
}

// Withdraw that charges a fee: the fee is checked up front and taken only after the move succeeds.
export function withdrawWithFee(bank: Bag, pack: Bag, itemId: number, count: number, fee: number, feeItemId: number): Refusal {
  const adena = findStack(pack, feeItemId);
  if (!adena || adena.count < fee) return 'no-fee';
  const moved = transfer(bank, pack, itemId, count);
  if (moved !== 'ok') return moved;
  adena.count -= fee;
  if (adena.count === 0) pack.stacks = pack.stacks.filter((s) => s !== adena);
  return 'ok';
}
```

Typecheck: the block above, as `work/bag-transfer.ts`, passes `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (exit 0, run at `/tmp/iv016-bag-transfer.ts`).

## 5. Lands in

- TARGET `origins/inventory/bag.ts` (proposed new module; the Frankendom repo is not on this box, so this path is a proposal and has not been checked against it). The gate and the transfer belong in the engine, so the server is the only place a stack changes owner.
- Parity row 18 (loot roll and XP award): the pickup and bag-capacity step of a loot award, and the server checks at pickup and withdraw (`C_PickUpItem.java` 99; `C_Result.java` 226).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: one ledger (every move is one checked transfer); server-verified counts (the donor's pickup and withdraw count checks, lines 99 and 226)

## 6. Gaps and risks

- Licence: GPL-2.0-or-later. Clean-room only; the sketch is written from the mechanism and is not a translation.
- Two weight formulas. The candidate weight adds a floored template weight plus a flat 1 (`L1PcInventory.java` 107-108), while the carried total uses max(floor, 1) per record and 0 for weightless items (`L1ItemInstance.java` 252-256). The two disagree in both directions, so the check and the total can differ by a unit or more. The gauge also rounds (line 80). fix: one weight function for the carried total and the candidate, compared exactly (the sketch's `canAdd`).
- Dead line. `df.format(wpTemp);` (`L1PcInventory.java` 79) has no effect; the formatter is built on line 78. fix: delete both lines.
- Fee before move. The withdraw takes 30 adena (`C_Result.java` 234) before the move (235), and the return value of `tradeItem` is not used. A refused move would still charge the fee. fix: check the fee, move, then take the fee (the sketch's `withdrawWithFee`).
- No null check on the stored record. `C_Result.java` 223-224 reads `item.getCount()` straight after `getItem(objectId)`, so an unknown object id throws. fix: return a refusal when the lookup is null.
- Check and move are not in one critical section. The capacity check (`C_PickUpItem.java` 142) is not synchronized, and the store (156) locks only the target bag, so two pickup packets for the same player could both pass a check at 179 records and both store. (Ground-side duplication is guarded: `tradeItem` checks the ground count under the ground lock.) fix: run the check and the move in one server step under one lock (Frankendom's single tick is enough).
- Guard after mutation. The guard at `L1Inventory.java` 344 runs after the split or the delete, so it cannot undo either. In practice it cannot fire, because both branches have already changed the record, so it gives a false sense of safety and does not roll back anything. fix: validate before mutating and delete the guard (the sketch does).
- Ground despawn cancel is a no-op. `cancelTimer` reads `_reservedTimers` (`L1GroundInventory.java` 62), but nothing puts a timer in that map (declared at line 25; `setTimer` at 49-58 never adds to it). The timer re-checks the record before it removes it, so no double removal, but a picked-up record keeps its TimerTask until it fires. fix: store the timer in `setTimer` and cancel it in `cancelTimer`.
- Owner window only for fishing. In this donor the 10-second owner window (`L1ItemInstance.java` 1131) is set only by `C_FishClick.java` 114, so monster drops are not owner-locked here (grep result; the drop path was not read). The window shape can be reused for loot, but it is not a rule the donor enforces for drops.
- Loot presentation on a phone: not in this donor. The only presentation is the PC client's `S_DropItem` and `S_RemoveObject` packets to nearby players (`L1GroundInventory.java` 96, 105, 113). There is no touch flow, minimap or rarity colour to take from it.
- Equipment set and remove are symmetric (`L1EquipmentSlot.java` 218 and 275), which fits a stat-modifier stack. The donor's slot rules are weapon or armour only, and the set bonuses in `L1ArmorSet` were not read.
- The carry weight is a STR/CON formula in the donor. If Frankendom keeps a weight rule, the base, the stat weights and the rate are data fields (hero data or a rule constant), not literals.
- Not read: the clan and elf warehouse bodies (`C_Result.java` 315-375 and 442-495; grep only), `L1DwarfInventory.java` persistence, and the monster death drop path. The config values for `ALT_ITEM_DELETION_TIME` and the warehouse caps are not read.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: one ledger (every move is one checked transfer); server-verified counts
