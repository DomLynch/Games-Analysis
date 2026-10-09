# XProger-OpenLara (inventory-bank-equipment, cell 9)

Donor: /mnt/frankendom-donors/XProger-OpenLara/src/inventory.h | Licence: BSD-2 | C | symbol struct Inventory / Inventory::Item

Symbol check: `struct Inventory` is at line 212 and `struct Item` at line 249, both as cited. The logic is in `Inventory::add` (763-818), `Inventory::remove(type, count)` (826-833, calls the index overload `remove(int)` at 835-840), `Inventory::use` (853-859) and `Inventory::addAmmo` (747-761), not in the struct header lines.

## 1. Mechanism

- The inventory is an array of at most 32 items (`INV_MAX_ITEMS`, `#define` at inventory.h:9; the array is `items[INV_MAX_ITEMS]`, line 568), each `{type, count, desc, ...}`. The array is kept sorted by item type value. There is no grid and no slot position; order is type order.
- `add(type, count, smart)` (763-818):
  - First the type is normalised (`convToInv`, called at 764; its definition is on `TR::Level` and was not read).
  - With `smart` on, ammo and weapons are linked. Adding a weapon converts the count into rounds (count times the clip: 10 for pistols, 2 for shotgun, 25 for magnums, 50 for uzis) and folds any existing ammo of that kind into the weapon's count, then removes the ammo entry. Adding ammo when the weapon is already held converts it to the weapon's type and the same rounds rule.
  - Pistols always get unlimited ammo: `count = UNLIMITED_AMMO` (770) before `addAmmo`; `UNLIMITED_AMMO` is `#define 10000` at controller.h:14 (not inventory.h). The clip multipliers are the literals at 771, 775, 779, 783.
  - If the type is already held (789-794), its count is raised and clamped at 10000. Otherwise (796-817) the code asserts there is room (`ASSERT(itemsCount < INV_MAX_ITEMS)`, no runtime refusal), clamps the count, builds the item and drops it if `desc.model == -1`, inserts before the first item of a greater type and the array grows by one.
- `remove(type, count)` (826-833): reduces the count; at zero or below it calls `remove(index)` (835-840), which deletes the item and shifts the rest down.
- `use(type)` (853-859) removes one unit of a type if held, returns whether it was held. Used for consumables such as keys and medikits.
- Runs on the player's actions (pick up, use, combine) in the game tick. Output: the item list with counts, and a boolean on use.

## 2. Key functions

| Name | Path | Lines | What it does |
|---|---|---|---|
| Inventory::add | /mnt/frankendom-donors/XProger-OpenLara/src/inventory.h | 763-818 | Adds to a held stack or a new sorted entry; ammo and weapon linking; clamp at 10000 |
| Inventory::addAmmo | /mnt/frankendom-donors/XProger-OpenLara/src/inventory.h | 747-761 | Converts a weapon or ammo pickup into rounds; folds the other kind in |
| Inventory::remove | /mnt/frankendom-donors/XProger-OpenLara/src/inventory.h | 826-840 (type overload 826-833, index overload 835-840) | Reduces a count; removes the entry at zero |
| Inventory::use | /mnt/frankendom-donors/XProger-OpenLara/src/inventory.h | 853-859 | Consumes one unit if held |
| Inventory::contains | /mnt/frankendom-donors/XProger-OpenLara/src/inventory.h | 739-745 | Finds the index of a type |
| Inventory::Item | /mnt/frankendom-donors/XProger-OpenLara/src/inventory.h | 249-568 (`struct Item` opens 249, closes at `} *items[INV_MAX_ITEMS]` 568) | Item record with type, count, angle, anim, params and a `Desc` (string, page, model) |

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Typed item list with a stack count, kept sorted by type | Max 32 entries (theirs, INV_MAX_ITEMS, inventory.h:9) |
| Clamp counts at a large cap; "unlimited" is a big number | Unlimited ammo 10000 (theirs, controller.h:14; use at 770, 792, 798) |
| Weapon-to-rounds conversion with a per-weapon clip size | Clip sizes 10, 2, 25, 50 (theirs, literals at 771, 775, 779, 783) |
| Consume one unit; remove the entry at zero | One unit per use (theirs) |

## 4. TypeScript sketch

Licence: BSD-2. The logic may be lifted from the path above; this sketch restates the structure in its own names.

simplified: no `convToInv` normalisation, no pistol-unlimited rule, no no-model refusal; full list returns false where the donor only asserts; the ammo-pickup branch of `addAmmo` is omitted; `addWeaponRounds` is a separate call here, in the donor it runs inside `add` via the `smart` switch (766-787).

```ts
// Licence: BSD-2 (XProger-OpenLara, src/inventory.h add, remove, use, addAmmo)
interface Entry { type: number; count: number; }
const MAX_ENTRIES = 32;     // theirs
const UNLIMITED = 10000;    // theirs
class TypedInventory {
  private items: Entry[] = [];
  add(type: number, count = 1): boolean {
    const i = this.items.findIndex((e) => e.type === type);
    if (i >= 0) {
      this.items[i].count = Math.min(UNLIMITED, this.items[i].count + count);
      return true;
    }
    if (this.items.length >= MAX_ENTRIES) return false;
    const entry: Entry = { type, count: Math.min(UNLIMITED, count) };
    let pos = 0;
    while (pos < this.items.length && this.items[pos].type <= type) pos++;
    this.items.splice(pos, 0, entry);
    return true;
  }
  remove(type: number, count = 1): void {
    const i = this.items.findIndex((e) => e.type === type);
    if (i < 0) return;
    this.items[i].count -= count;
    if (this.items[i].count <= 0) this.items.splice(i, 1);
  }
  use(type: number): boolean {
    if (!this.items.some((e) => e.type === type)) return false;
    this.remove(type, 1);
    return true;
  }
  addWeaponRounds(weaponType: number, ammoType: number, clip: number, count: number): void {
    const ammoIdx = this.items.findIndex((e) => e.type === ammoType);
    let total = count * clip;
    if (ammoIdx >= 0) {
      total += this.items[ammoIdx].count * clip;
      this.items.splice(ammoIdx, 1);
    }
    this.add(weaponType, total);
  }
}
```

Note: the sketch covers only the weapon-pickup branch of `addAmmo` (line 747). The ammo-pickup branch (ammo converts to the weapon's type when the weapon is held) is not sketched.

## 5. Lands in

- Frankendom: src/fight/gear-room.ts (today: src/gear-room.ts, moving) (a typed list of gear and consumables) and src/loot-claims.ts (what a player holds from a fight). The typed list with a clamp and sorted insert is a data-structure idea, not a duel rule.
- Parity checklist row 20 (catalogue) and row 21 (catalogue fields) for the type ids. Row 15 (gear dressing) does not apply.
- Beyond checklist: economy (later phase).

Reuse tag: rewrite-from-idea
Brief rule served: one-character, one-ledger rule (server inventory is the authority); rules 7-9 n/a

## 6. Gaps and risks

- The donor's ammo link is a single-player convenience (a weapon pickup folds in ammo). Frankendom has no ammo; this rule has no use.
- The 32-entry cap and the 10000 "unlimited" are game constants. Frankendom's cap must come from the catalogue, not this donor.
- Consuming an item on use is a client action in the donor. Frankendom consumables must be server-side writes, or a fight could use an item the server does not hold.
- Conflict check: the donor's inventory is a game-state object. Frankendom must keep one authoritative inventory on the server; a client copy would split the one-engine rule.
