# evennia-evennia (inventory-bank-equipment, cell 9)

Donor: `/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/equipment.py` | Licence: BSD-3-Clause (LICENSE.txt line 1: "BSD 3-Clause License") | Python | symbol `EquipmentHandler`

Checked: `EquipmentHandler` read in full (equipment.py 1-423), with objects.py (size, use-slot and armour fields), enums.py (WieldLocation, CON), characters.py (pre-receive and receive hooks), commands.py (wield, stash, give), shops.py (buy overflow), chargen.py, combat_base.py (wield action), tests/test_equipment.py (whole file, read, not run) and Evennia core objects/objects.py `move_to` (1173-1330). Every non-test caller of `move()` was read: chargen.py 188-201, combat_base.py 239, commands.py 119. Callers of `add()`/`remove()` were listed by grep (commands.py 163-164, 218; shops.py 310, 421; characters.py 227, 250). Confidence: high on the code paths, which I read in full. The defects below are traced from the code, not executed. The test suite was not run. The sketch was compiled and run on the VPS (its own file, not the donor). Searched for a bank or vault container: none in this module.

Best transferable idea: Measure bag capacity in fractional slot sizes (a potion 0.25, a sword 1), let each wield slot push its displaced item into the pack, and make every move one validated, all-or-nothing change.
Decision (proposed): adapt - keep the size-capacity bag and the wield-eviction table, but change the move to validate first and commit once, and fix the displaced-item loss (the donor does not do this).
Acceptance: A player with a full pack who wields a second sword sees the first sword in the pack, or gets "pack full" and nothing changes; a server test asserts the total slot size is equal before and after every move, and that a refused move leaves the ledger byte-identical.

## 1. Mechanism

- Capacity: `max_slots` is the constitution attribute + 10 (equipment.py 87). Every held item costs `size` slots: the base default is 1 (objects.py 41), and the consumable class sets 0.25 (objects.py 141), so four consumables fit in one slot. There is no stack object; "stacking" is only fractional size. Usage is the sum of sizes over the five wield slots and the backpack (`count_slots`, 63-79).
- Fit check (`validate_slot_usage`, 89-111): raises `EquipmentError` when usage + size > capacity, with the slots left in the message (104-107).
- Wield slots: weapon hand, shield hand, two hands, body, head, plus a backpack list. Each item class declares its `inventory_use_slot` (weapon WEAPON_HAND; armour BODY, objects.py 319; shield SHIELD_HAND, 332; helmet HEAD, 342; default BACKPACK, 39).
- `move(obj)` (233-285): first `self.remove(obj)` (253), then the fit check (255), then places the item by its use slot:
  - two-handed: the weapon-hand and shield-hand occupants go to the pack (262-263); the old two-hander is overwritten (264).
  - one-handed weapon or shield: the two-hander goes to the pack (267); the old occupant of the slot is overwritten (269).
  - body or head: the old occupant goes to the pack (276-277).
  - backpack: the item goes into the pack (the `to_backpack = [obj]` branch).
  Then one save (285).
- Armour value (`armor`, 130-153): body bonus (default 1 when empty, line 148), shield bonus (default 0, 150), helmet bonus (default 0, 151); summed.
- Weapon (`weapon`, 156-172): two-hander if present, else weapon hand, else bare hands (170-171).
- `remove(obj_or_slot)` (304-345): empties a slot or removes one object; saves only when something was removed (343-344).

## 2. Key functions

- `EquipmentHandler.move`: `/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/equipment.py` 233-285 (remove, fit check, eviction by use slot, save).
- `EquipmentHandler.validate_slot_usage`: same file, 89-111 (fit check that raises).
- `EquipmentHandler.count_slots` and `max_slots`: same file, 63-87.
- `EquipmentHandler.remove`: same file, 304-345.
- Wield command (the only player-facing caller): `/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/commands.py` 119 (`move`) and 123 (the "Returning ... to the backpack" message).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Capacity = stat + 10 | +10 (equipment.py 87); the stat is constitution (enums.py 32) |
| Item cost in slots, fractions allowed | default 1 (objects.py 41); consumable 0.25 (objects.py 141) |
| Armour as summed bonuses with an unarmoured base | body default 1 (equipment.py 148; objects.py 321); shield and helmet default 0 (150-151) |
| Wield eviction table | two-hander evicts weapon and shield (262-263); one-hander or shield evicts the two-hander (267); body and head evict the occupant (276) |
| Capacity loss | random_tables.py 623 annotates a "sickly" entry as -1d4 CON; the runtime path that lowers CON was not traced |

## 4. TypeScript sketch

simplified: the sketch checks the fit on the state WITHOUT the item and BEFORE any occupant moves, then returns the new state for one commit (the donor runs `remove()` with a save, then the fit check). It sends the occupant of every hand slot, body and head to the pack (the donor overwrites some occupants: 264 and 269). It omits the save call, the backpack's order, the armour sum, the bare-hands fallback, the "already wielded" check, and the stash, give and buy paths. It was compiled with tsc strict and run on the VPS with two cases: a sword swap (old sword lands in the pack) and a refused fit (state unchanged).

```ts
type Wield = "weapon" | "shield" | "twoHand" | "body" | "head";
type Use = Wield | "pack";

interface Item {
  id: string;
  size: number;   // slots used; 1 by default, 0.25 for a consumable
  use: Use;       // where it goes when wielded or worn
  armour: number; // bonus for body, shield and head items
}

interface Loadout {
  wield: Partial<Record<Wield, Item>>;
  pack: Item[];
}

// Slots used: every held item counts once, wielded or packed.
function slotsUsed(l: Loadout): number {
  let n = 0;
  for (const it of Object.values(l.wield)) if (it) n += it.size;
  for (const it of l.pack) n += it.size;
  return n;
}

// Capacity is a stat plus 10 (donor rule: constitution + 10).
function capacity(con: number): number {
  return con + 10;
}

// Returns a NEW loadout or throws. The caller replaces the stored state only on success.
function move(l: Loadout, item: Item, cap: number): Loadout {
  const wield: Partial<Record<Wield, Item>> = { ...l.wield };
  const pack = l.pack.filter((p) => p.id !== item.id);
  for (const k of Object.keys(wield) as Wield[]) {
    if (wield[k]?.id === item.id) delete wield[k];
  }

  // Fit check on the state WITHOUT the item and BEFORE any occupant is displaced.
  const after: Loadout = { wield: { ...wield }, pack: [...pack] };
  if (slotsUsed(after) + item.size > cap) throw new Error("equipment full");

  const displaced: Item[] = [];
  const evict = (w: Wield): void => {
    const old = wield[w];
    if (old) {
      displaced.push(old);
      delete wield[w];
    }
  };

  switch (item.use) {
    case "twoHand":
      evict("weapon");
      evict("shield");
      evict("twoHand");
      wield.twoHand = item;
      break;
    case "weapon":
    case "shield":
      evict("twoHand");
      evict(item.use);
      wield[item.use] = item;
      break;
    case "body":
    case "head":
      evict(item.use);
      wield[item.use] = item;
      break;
    case "pack":
      pack.push(item);
      break;
  }
  return { wield, pack: [...pack, ...displaced] };
}
```

## 5. Lands in

- TARGET `origins/inventory/equipment.ts` (proposed path; not checked against the Frankendom repo): the carried-item ledger that the fight reads `weapon` and `armor` from. Parity-checklist row 18 (loot roll and XP award), the nearest row to the hint. Gear dressing is row 15; the item size and use-slot fields belong to row 21 (catalogue fields), which I did not cite as the one row.
- today: none checked.
- Reuse tag: adapt-allowed (BSD-3-Clause, so code may be adapted); the sketch is written from the mechanism and the defect fixes, not copied.
- Brief rule served: one ledger (validate, then one write); zones as data (size and use slot as catalogue fields).

## 6. Gaps and risks

- D1, displaced items are lost (equipment.py 262-269, with the message at commands.py 123). The two-hander branch overwrites the old two-hander (264), and the one-hander or shield branch overwrites the old occupant (269). The wield command still says "Returning X to the backpack". The tests do not cover it: `test_two_handed_exclusive` (tests/test_equipment.py 127) evicts occupants, but no test moves a second item into a slot that already holds one; `test_move` (111-112) starts from empty slots. Fix: add the occupant to the displaced list in all three branches, as the body and head branch already does (276).
- D2, a refused fit leaves the item removed and saved (equipment.py 253-255; `remove` saves at 343-344). It is reachable only when usage already exceeds capacity (for example after a constitution loss, which I did not trace). Fix: check the fit before any change, then one save. The stash command has the same shape: remove (commands.py 163) then add (164), with no rollback.
- D3, a gift to a full pack loses the item from the giver's ledger (commands.py 218 removes it first). The receiver's check raises inside `at_pre_object_receive` (characters.py 212-213). Evennia's `move_to` (objects/objects.py 1279-1285, default `move_hooks=True` at 1180) catches any exception there and returns False; so the `except EquipmentError` branch at commands.py 223 never runs, and the else branch prints "and they accepted the offer." (236). From the code, nothing puts the item back on the giver's ledger, so it stays with the giver's location but in no slot. This is inferred from the code and was not run. Fix: check the receiver's fit before removing from the giver, and check `move_to`'s return value.
- D4, the loadout text reads the helmet from the BODY slot (equipment.py 204, text at 206): it names body armour as the helmet and never names a helmet. Fix: read HEAD.
- D5, `remove(slot)` returns [None] for an empty slot (328). Fix: return [] when the slot is empty.
- D6, stale comment (146-147) says armour is listed by defense minus 10; the code and npcs.py 48 use a bonus with default 1. Documentation only.
- No bank: this module has no vault or storage container; the nearest is the shop overflow path (shops.py 310-313), which drops an item that does not fit on the floor. That floor-drop is worth copying for loot overflow.
- Frankendom gap: the donor saves per change to an attribute, with no server verification. In Frankendom the same validate-then-commit must run on the server (one ledger), and the Pit must not own the slots.
- The defects are traced from the code. The test suite was not run.
