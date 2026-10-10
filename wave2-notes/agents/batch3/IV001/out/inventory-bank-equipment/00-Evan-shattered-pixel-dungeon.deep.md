# 00-Evan-shattered-pixel-dungeon (inventory-bank-equipment, cell 9)

Donor: `/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/items/Item.java` | Licence: GPL-3.0 (LICENSE.txt, "GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007"; only the first lines of the licence were read) | Java | symbol `Item.collect`

Checked: Read in full: `Item.collect` (Item.java 206-280), `Item.merge` (197-204), `Item.detach` and `detachAll` (319-365), `Bag.canHold` (193, body read to 206), `Bag.grabItems` (120-127), `Backpack.capacity` (Belongings.java 58-68), `EquipableItem.doUnequip` (124-153), `Armor.doEquip` (232-299), `KindOfWeapon.doEquip` (106-159), `MagicalHolster` and `ScrollHolder` canHold and capacity. Excerpt only: `Hero.resurrect` (2640-2670). Candidates opened (14 files): Item.java, bags/Bag.java, bags/MagicalHolster.java, bags/ScrollHolder.java, actors/hero/Belongings.java, actors/hero/Hero.java, items/EquipableItem.java, items/armor/Armor.java, items/KindOfWeapon.java, items/weapon/missiles/MissileWeapon.java, items/keys/Key.java, items/bombs/Bomb.java, items/scrolls/Scroll.java, items/TengusMask.java (grep only). Confidence: high on the admission order, capacity counts and the cursed refusal; medium-high on the equip swap (the Holy Intuition branch and the seal-transfer dialog were skipped). Not read: how curses are generated (Armor.java 671-676 seen by grep only), the interlevel drop code, the LostInventory buff, Heap. camera_scope: not applicable (not a camera topic).

## 1. Mechanism

- One admission rule decides whether an item can go into a container (the backpack or a bag): `Item.collect(container)` (Item.java 206). Input: the item (it may be a stack) and the container. Output: true (the item is now inside, merged into a stack, or was already inside) or false (nothing changed).
- Order of steps inside `collect`, as the code runs: (a) quantity 0 or less returns true at once (208-210); (b) an item already in the container returns true (214-216); (c) each bag inside the container that can hold the item gets the first try, recursively (218-224); (d) if the container's own `canHold` refuses, return false and change nothing (226-228); (e) if the item is stackable, merge it into the first similar stack, adding its quantity with no cap, and zero the incoming item (230-233, 200-201), then return true; (f) otherwise add it as a new slot (274) and sort by category (276).
- `Bag.canHold` (193): (i) during the lost-inventory buff, refuse an item not kept through it (194-196); (ii) accept if the item is already inside, is a bag, or the container holds fewer items than `capacity()` (199). A bag is accepted even when the container is full; (iii) otherwise accept a stackable item that matches a stack already inside, even when full (201-204); (iv) else refuse.
- Capacity: base 20 (Bag.java 54-55). The backpack adds one slot per bag it holds (Belongings.java 58-64) and loses one slot when a second weapon is held (65-67). Holster and scroll holder: capacity 19 and an item-type filter (MagicalHolster.java 40-42, 49; ScrollHolder.java 40-43, 50).
- Moves: `Item.detach` takes one unit off a stack (split at 337) or the whole item when quantity is 1 (326-332, via `detachAll`). `detachAll` removes the item from its container (350) and asks that container to pull items in from the backpack (352). `Bag.grabItems` (120-127) tries each backpack item: if the bag can hold it, detach it, collect it into the bag, and if the bag refuses, collect it back into the old container (125-126). The return value of that second collect is not checked.
- Equip swap: `Armor.doEquip` (232) first detaches the new armour from the backpack (243), then unequips the old one into the backpack or drops it on the floor (246; `EquipableItem.doUnequip` 144-148). If the old one refuses, the new one is collected back into the backpack and the function returns false (295-296). `KindOfWeapon.doEquip` (106) has the same shape (125, 127, 156).
- Binding: `EquipableItem.doUnequip` (124) refuses a cursed item (126-131) unless the hero has the MagicImmune buff, or the hero's inventory is lost and this item is not kept through it (127-128). The refusal returns before any time is spent; the time spend starts at line 133.
- Death: `resurrect` sets the LostInventory buff (Hero.java 2647). The comment says lost items are dropped later in the interlevel scene (2649; the drop code is not read).

## 2. Key functions

- `Item.collect`: `/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/items/Item.java` 206-280. Admission order (a) to (f) above.
- `Item.merge`: Item.java 197-204. Adds quantity, zeroes the other item.
- `Item.detach` / `detachAll`: Item.java 319-343 and 345-365. Remove from the container; `detachAll` triggers a refill from the backpack.
- `Bag.canHold`: `.../items/bags/Bag.java` 193-206. Admission check used by `collect` and by `grabItems`.
- `Bag.grabItems`: Bag.java 120-127. Pulls items into a bag that has just freed space, with a put-back on refusal.
- `Backpack.capacity`: `.../actors/hero/Belongings.java` 58-68.
- `EquipableItem.doUnequip`: `.../items/EquipableItem.java` 124-153. Cursed refusal, time spend, put-back or drop.
- `Armor.doEquip`: `.../items/armor/Armor.java` 232-299. `KindOfWeapon.doEquip`: `.../items/KindOfWeapon.java` 106-159.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Admission order: nested bags first, then the container, then merge into a matching stack, then a free slot. A matching stack merges even when the container is full | Base capacity 20 (Bag.java 55). Full means `items.size()` (bags included) reaches capacity (Bag.java 199) |
| A bag held inside the pack adds one slot | +1 per bag (Belongings.java 61-62) |
| A held second weapon costs one pack slot | -1 (Belongings.java 66-67) |
| Filter bags: only listed item types enter, with a fixed capacity | Holster accepts wand, missile, bomb; capacity 19 (MagicalHolster.java 41, 49). Scroll holder accepts scroll, spell, and two more classes; capacity 19 (ScrollHolder.java 41, 50) |
| Stacks have no cap | None (Item.java 200) |
| A cursed equipped item cannot leave its slot | Refusal unless MagicImmune (EquipableItem.java 126-128) |
| Death flags the pack for loss | LostInventory buff (Hero.java 2647) |

## 4. TypeScript sketch

simplified: keeps the donor's admission order (nested bags, then the container, then stack-merge, then a new slot) and the detach-then-put-back move. It omits: the lost-inventory refusal; the recursion into nested bags on removal (the sketch removes only top-level items, so an item inside a bag cannot be moved); the quantity split (move takes the whole stack, not one unit); the category sort; the quickslot and badge side effects; and the ignored put-back result (the sketch throws instead, which is stricter than the donor). Cursed binding, time cost and the equip swap are not modelled; they are in section 1 only.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described rule, not a translation of the donor lines.
// clean-room
interface Stack {
  kind: string;            // item class; similarity is per class unless the class adds a key
  similarKey?: string;     // extra similarity field (e.g. tier, depth); absent = equal
  quantity: number;
  stackable: boolean;
  bag?: Container;         // set when this item is a bag that holds items
}

interface Container {
  items: Stack[];
  capacity: number;        // slot count, not counting nested bags' own slots
}

function similar(a: Stack, b: Stack): boolean {
  return a.kind === b.kind && (a.similarKey ?? "") === (b.similarKey ?? "");
}

// Container admission check. A bag always fits; a stackable item fits if a matching stack already sits inside, even when full.
function canHold(c: Container, item: Stack): boolean {
  if (c.items.includes(item) || item.bag !== undefined || c.items.length < c.capacity) return true;
  return item.stackable && c.items.some(i => similar(i, item));
}

// Admit one item. Order: already inside -> nested bags first -> this container -> merge into a matching stack -> new slot.
function collect(c: Container, item: Stack): boolean {
  if (item.quantity <= 0) return true;
  if (c.items.includes(item)) return true;
  for (const slot of c.items) {
    if (slot.bag && canHold(slot.bag, item) && collect(slot.bag, item)) return true;
  }
  if (!canHold(c, item)) return false;
  if (item.stackable) {
    const target = c.items.find(i => similar(i, item));
    if (target) {
      target.quantity += item.quantity; // no cap on the stack in the donor
      item.quantity = 0;
      return true;
    }
  }
  c.items.push(item);
  return true;
}

// Move = take out of the source, then admit into the target; if the target refuses, put it back where it was.
function move(from: Container, to: Container, item: Stack): boolean {
  const idx = from.items.indexOf(item);
  if (idx < 0) return false;
  from.items.splice(idx, 1);
  if (collect(to, item)) return true;
  if (!collect(from, item)) throw new Error("rollback failed: item would be lost");
  return false;
}

export {};
```

## 5. Lands in

- TARGET `origins/inventory/admit.ts` (proposed name; the Frankendom tree was not read, per the batch rule). Holds one admission function and one move function, called by the server transaction that moves items, so there is one ledger.
- Parity row: no row in 1-23 covers bag capacity or slot admission. The nearest is row 21 (catalogue fields), because the stack and similarity rule reads catalogue fields (`stackable`, the similarity key). Loot pickup into the pack is row 18 (loot roll and XP award) and calls this admission; that is a consequence, not the mechanism.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 1 (one ledger: one admission rule for every container); rules 7-9 n/a

Best transferable idea: Admit a stackable into an existing matching stack before asking for a free slot, so a full pack still takes a matching pickup, and refuse with no change to either container.
Decision (proposed): adapt. Take the order of checks (stack first, then a slot, refuse with no change), not the code: the donor is single-player with no max stack, no weight and no bank, so Frankendom must make the rule one server transaction with a catalogue max stack.
Acceptance: A server test: a 20-slot bag full of non-matching items accepts a pickup that matches an existing stack (slot count stays 20, quantities add up); it refuses a new kind with both containers unchanged (no duplicate, no loss); and a failed move leaves the source as it was, in the same transaction.

## 6. Gaps and risks

- Not atomic. The donor's move is detach, try, then put back on failure, all on one thread, and it ignores the put-back result (Bag.java 126). The same pattern ignores the put-back in `Armor.doEquip` (295) and `KindOfWeapon.doEquip` (156). Frankendom needs one server transaction: validate both containers, then write both. Do not copy the put-back pattern.
- No max stack. Stacks grow without a cap (Item.java 200). Frankendom needs a per-catalogue maximum; the donor gives no value to copy.
- No weight and no bank. A grep of the donor for "bank" found nothing, and a grep for "weight" found only spawn weights (grep, not exhaustive). Those parts have no donor source to borrow from.
- Hardcoded capacities. 20, +1 per bag, -1 for a second weapon and 19 for holders are constants in code. Frankendom's rule (catalogue data for each bag type, engine constant for the admission rule) must be set by us.
- Global hero read. The backpack capacity reads the static `Dungeon.hero` (Belongings.java 65), not its own owner. Frankendom must pass the owner explicitly.
- Bags accept any bag even when full (Bag.java 199, `item instanceof Bag`). If bag-in-bag must be bounded in Frankendom, it needs an explicit rule.
- Curse binding is a hidden refusal inside unequip, with a hero buff (MagicImmune) as the exception. Frankendom should make it an explicit bound flag that the server checks before the move.
- The lost-inventory drop path (Hero.java 2649 onward) was not read.
