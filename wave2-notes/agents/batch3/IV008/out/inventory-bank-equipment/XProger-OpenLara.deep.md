# XProger-OpenLara (inventory-bank-equipment, cell 2)

Donor: /mnt/frankendom-donors/XProger-OpenLara/src | Licence: BSD 2-Clause License (LICENSE, "Copyright (c) 2018, Timur "XProger" Gagiev"); permissive, code may be adapted | C++ | symbol Inventory::add, Inventory::addAmmo, Inventory::remove

Checked: cell 2 = row 3 of cells-IV008.tsv. The hint file src/inventory.h is the right file but mostly UI (2108 lines of option pages and rendering); the item logic is at lines 212-262 (struct), 568 (items array), 689-860 (add, addAmmo, remove). Also opened: src/fixed/object.h 550-600 (pickup callers), src/controller.h line 14 (UNLIMITED_AMMO). Grepped only: src/level.h, src/fixed/lara.h. Confidence high for add/remove/fold; medium for the pickup flow (checkLimit, the pickup animation and the ASSERT macro were not read). No camera content.

## 1. Mechanism

Order of operations on a pickup:
1. Pickup gate (fixed/object.h:553): checkLimit(lara, LIMIT_PICKUP) (not read). The pickup then waits for the animation to end (animIsEnd(23), not read further).
2. inventory.add((ItemType)type) (fixed/object.h:561), then the save counter and room removal (same block; the counter gSaveGame.pickups is not read in detail).
3. Inventory::add(type, count, smart=true) (inventory.h:763). If smart, the four weapon/ammo pairs (pistols, shotgun, magnums, uzis) go through addAmmo with a per-weapon clip ratio (770-783):
   a. Ammo box while its weapon is held: the type becomes the weapon and count is multiplied by the ratio (756-758). The rounds go into the weapon's own entry; no separate ammo entry is made.
   b. Weapon pickup: count is multiplied by the ratio, and any loose ammo entry of that type is merged as (count + ammo entry count) x ratio, then the ammo entry is removed (749-753).
   c. Ammo box with no weapon held: stored as its own entry, count in boxes.
   d. Pistols: count is set to UNLIMITED_AMMO first (770), so pistol ammo is always unlimited.
4. If an entry for the type exists: count is added and clamped to UNLIMITED_AMMO (790-792). Otherwise: a cap check ASSERT(itemsCount < INV_MAX_ITEMS) (796), count clamped (798), new Item built (800); an item whose desc.model is -1 is deleted silently (801-802); the new entry is inserted before the first entry with a greater type (807-816), so the list stays sorted by the type id.
5. remove(type, count) decrements the entry and deletes it at zero or below (826-832). remove(index) shifts the array left (835-837).

## 2. Key functions

- Inventory::add, src/inventory.h:763. Single entry point, with the smart flag doing the fold and merge.
- Inventory::addAmmo, src/inventory.h:747. The weapon-pickup merge and the held-weapon fold.
- Inventory::contains, src/inventory.h:739. Linear search by type.
- Inventory::remove, src/inventory.h:826, and remove(int index), src/inventory.h:835.
- Pickup callers, src/fixed/object.h:561 (and the underwater variant at 595). Only these two call sites were read.

## 3. Numbers vs mechanism

- INV_MAX_ITEMS = 32 (inventory.h:9): cap on entries, not on rounds. Items are one entry per type.
- UNLIMITED_AMMO = 10000 (controller.h:14): the clamp for every count. A real count of 10000 and the unlimited sentinel look the same.
- Clip ratios (rounds per box as used in the code): pistols 10 (771), shotgun 2 (775), magnums 25 (779), uzis 50 (783).
- Starting TR1 kit in addWeapons (inventory.h:706-707): pistols unlimited, shotgun passed as 250, magnums as 20. Because the weapon count is multiplied by its ratio (749), 250 becomes 500 shells as read. The code does not say whether 250 is meant as boxes; the unit is ambiguous.
- No timers. Everything happens at the moment of pickup, in the same frame as the animation end.

## 4. TypeScript sketch

simplified: keeps the fold (ammo into a held gun at the gun's ratio), the weapon-pickup merge, the clamp to a cap, the sorted insert and the zero-removal. It omits the pistol unlimited special case, the model check (no model concept here), the Item payload (animation, description, page) and the save counters. It changes one donor point: a full bag refuses the new entry and reports it, where the donor only has an ASSERT (inventory.h:796) and then still writes an entry past the fixed array (items[INV_MAX_ITEMS], declared at inventory.h:568). Whether the ASSERT halts in shipped builds was not read (macro not read). Typechecked on the VPS: npx tsc --noEmit --strict --target es2020, exit 0.

```ts
// Shape of a capped, type-sorted item list where ammo folds into an owned weapon at a clip ratio (BSD-2 donor; re-expressed, not copied).
const INV_MAX_ITEMS = 32; // donor inventory.h:9
const UNLIMITED_AMMO = 10000; // donor controller.h:14

interface Item { type: number; count: number; } // type is a sortable id; count is in rounds

class Inventory {
  private items: Item[] = [];

  // ratio: rounds per ammo box for each weapon (donor: pistols 10, shotgun 2, magnums 25, uzis 50)
  constructor(private ratio: Map<number, number>, private ammoOf: Map<number, number>) {}

  private find(type: number): number {
    return this.items.findIndex((it) => it.type === type);
  }

  // Add a pickup. Folds ammo into a held weapon (donor addAmmo, inventory.h:756-758).
  add(type: number, count = 1): void {
    const weapon = this.ammoOf.get(type);
    if (weapon !== undefined) {
      // type is an ammo box: if the weapon is held, convert boxes to rounds in the weapon item
      if (this.find(weapon) >= 0) {
        type = weapon;
        count *= this.ratio.get(weapon) ?? 1;
      }
    } else {
      // weapon pickup: count in boxes, and absorb any loose ammo of its type (donor inventory.h:749-753)
      const ammoType = [...this.ammoOf.entries()].find(([, w]) => w === type)?.[0];
      if (ammoType !== undefined) {
        const ai = this.find(ammoType);
        if (ai >= 0) {
          count = count * (this.ratio.get(type) ?? 1) + this.items[ai].count * (this.ratio.get(type) ?? 1);
          this.items.splice(ai, 1);
        } else {
          count *= this.ratio.get(type) ?? 1;
        }
      }
    }

    const i = this.find(type);
    if (i >= 0) {
      this.items[i].count = Math.min(UNLIMITED_AMMO, this.items[i].count + count);
      return;
    }
    if (this.items.length >= INV_MAX_ITEMS) return; // donor: ASSERT(itemsCount < INV_MAX_ITEMS)
    let pos = 0;
    while (pos < this.items.length && this.items[pos].type < type) pos++; // sorted insert by type
    this.items.splice(pos, 0, { type, count: Math.min(UNLIMITED_AMMO, count) });
  }

  // donor remove(type, count): decrement, drop the entry at zero or below
  remove(type: number, count = 1): void {
    const i = this.find(type);
    if (i < 0) return;
    this.items[i].count -= count;
    if (this.items[i].count <= 0) this.items.splice(i, 1);
  }

  list(): readonly Item[] { return this.items; }
}

export {};
```

## 5. Lands in

Target: origins/server/inventory-pickup.ts (proposed new file; name not checked against the Frankendom repo). Parity row 18 (loot roll and XP award: the pickup adds to the server ledger, and the fold keeps one entry per gun).

## 6. Gaps and risks

- Frankendom rule (one ledger, server-verified pickups): the fold keeps one entry per gun, which suits one ledger. The cap and the fold must run on the server; the client only shows the result.
- Donor defects found, with fixes:
  (a) Cap enforced only by ASSERT (inventory.h:796); the code then writes past items[INV_MAX_ITEMS] (inventory.h:568) if the assert does not halt. Fix: refuse the entry and report "bag full" (sketch step 4).
  (b) Weapon count is multiplied by its ratio (749), so the starting kit's 250 becomes 500 shells (706). Fix: name the unit (boxes or rounds) in the catalogue and add a test for it.
  (c) The 10000 clamp is also the unlimited sentinel (controller.h:14; 770), so exactly 10000 rounds looks unlimited. Fix: an explicit unlimited flag.
  (d) Ratios are hard-coded per weapon in code (771-783). Fix: move them to catalogue data (rounds per box per gun).
- Sorted by enum type id (808): the list order is a code artifact, not a player choice. On a 375-wide phone, the order must be designed (weapons first, then ammo, then keys), not left to the enum.
- Not read: checkLimit and LIMIT_PICKUP, the pickup animation details, the ASSERT macro, the Item constructor and desc table, the save counters, the UI (rendering) code, and the fixed/ variant differences beyond the two pickup call sites.

Reuse tag: adapt (BSD-2; code may be adapted; sketch re-expressed, no lines copied).
Brief rule served: anti-strictness rules 1-4 (opened the real add/remove code, listed candidates, judged the idea); 2026-10-10 keep-the-idea rule (defects listed with fixes, decision adapt).

Best transferable idea: Ammo picked up while its gun is held folds straight into that gun's round count at a per-gun ratio, so the bag keeps one entry per gun and never a loose ammo entry beside it.
Decision (proposed): adapt — the one-entry-per-gun fold fits a single server ledger, but the ratios and the bag cap must move from code constants to catalogue data, and a full bag must refuse instead of asserting.
Acceptance: Server test: a player holding a shotgun (2 rounds per box) picks up 3 boxes; the shotgun entry gains 6 rounds, no ammo entry is created, and a 33rd distinct item is refused with a "bag full" report to the client.
