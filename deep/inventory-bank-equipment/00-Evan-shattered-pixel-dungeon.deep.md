# 00-Evan-shattered-pixel-dungeon (inventory-bank-equipment, cell 9)

Donor: /mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/items/Item.java | Licence: GPL-3.0 per LICENSE.txt | Java | symbol Item.collect / doPickUp / doDrop / split
Licence note: GPL-3. CLEAN-ROOM sketch only.

## 1. Mechanism

- Every item lives in exactly one container: the hero's backpack or a nested bag. `Item.collect(Bag container)` (Item.java line 206) is the one place that puts an item into a container.
- Inputs: the item (with its quantity), the target container. Output: true if the item (or all of it, after merging) ended up in a container, false if the container refused it.
- Order of the collect: a zero-quantity item is "collected" trivially. An item already in the container is a no-op. Then it tries each nested bag that can hold it, and returns on the first success. If the container cannot hold it, it fails. If the item is stackable, it merges into the first same-class stack (Item.merge, L198: adds quantity, zeroes the source) and also fires badge, talent, catalog and quickslot updates (side effects, not modelled). Otherwise it appends, replaces any quickslot placeholder and re-sorts the list.
- `Bag.canHold` (bags/Bag.java line 193): a bag accepts a new item when it has a free slot (default capacity 20 from `Bag.capacity()`, line 54, which subclasses can override), or the item is a bag, or the item is stackable and a same-class stack already exists. While the owner has the lost-inventory debuff (and the bag is not loading), only items marked to survive are accepted. That check comes first.
- `doPickUp` (line 125) collects into the backpack and then spends the pickup delay as a turn cost. `doDrop` (line 138) spends TIME_TO_DROP (1.0, L68), then detaches the whole stack from the backpack and drops it on the hero's tile.
- `split(amount)` (line 287) makes a copy through the save bundle, sets its quantity to `amount`, and subtracts it from the original. It returns null if the amount is zero or negative or at least the whole stack (or if the new instance cannot be created).
- Runs on the player's action (pick up, drop, merge). In the opened code, slot limits are enforced in Bag.canHold and stack merging in collect; no per-stack size cap appears in either.

## 2. Key functions

| Name | Path | Lines | What it does |
|---|---|---|---|
| Item.collect(Bag) | /mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/items/Item.java | 206-280 | Places an item: nested bag first, then stack merge, then append |
| Item.doPickUp | /mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/items/Item.java | 121-136 | Pickup into backpack with a turn cost |
| Item.doDrop | /mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/items/Item.java | 138-142 | Detaches from backpack and drops on the hero's tile |
| Item.split | /mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/items/Item.java | 287-306 | Splits a stack by copying through the save bundle |
| Bag.canHold | /mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/items/bags/Bag.java | 193-209 | Slot-or-stack fit test, with the lost-inventory block |
| Item.isSimilar | /mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/items/Item.java | 367-369 | Same class means stackable together |

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Single container of slots with a per-slot capacity; stackables merge into an existing stack before taking a slot | Default capacity 20 slots (theirs) |
| Nested containers tried first, in order, first success wins | Bags can hold bags (theirs) |
| Split by quantity; the split can never take the whole stack | Split bounds: greater than zero, less than whole (theirs) |
| Action costs a turn (pickup and drop) | Drop time 1.0 (TIME_TO_DROP, L68, theirs); pickup delay 1.0 (TIME_TO_PICK_UP, L67, returned by pickupDelay(), L704, theirs) |
| A debuff that blocks new items unless flagged to survive | Lost-inventory buff (theirs) |

## 4. TypeScript sketch

Licence: GPL-3. CLEAN-ROOM sketch: written from the mechanism above, not translated from the donor.

simplified: omits the re-sort after append, the quickslot/badge/talent/catalog side effects, the `loading` and `owner` guard on the lost-inventory check, and the dart-recovery branch; stack identity is a `kind` string instead of class equality (isSimilar, L367).
```ts
// clean-room sketch of a slot-limited container with stack merge and nested containers.
// Licence line: GPL-3 donor; this sketch is clean-room, written from mechanism only.
interface Item { kind: string; qty: number; stackable: boolean; isBag: boolean; survivesLoss?: boolean; }
interface Container { slots: Item[]; capacity: number; children: Container[]; lostBlock?: boolean; }
const DEFAULT_CAPACITY = 20; // theirs
function canHold(c: Container, item: Item): boolean {
  if (c.lostBlock && !item.survivesLoss) return false;
  if (c.slots.includes(item) || item.isBag || c.slots.length < c.capacity) return true;
  return item.stackable && c.slots.some((s) => s.kind === item.kind);
}
function collect(c: Container, item: Item): boolean {
  if (item.qty <= 0) return true;
  if (c.slots.includes(item)) return true;
  for (const child of c.children) {
    if (canHold(child, item) && collect(child, item)) return true;
  }
  if (!canHold(c, item)) return false;
  if (item.stackable) {
    const stack = c.slots.find((s) => s.kind === item.kind);
    if (stack) {
      stack.qty += item.qty;
      item.qty = 0;
      return true;
    }
  }
  c.slots.push(item);
  return true;
}
// Returns the new stack, or undefined when the split is not allowed.
function split(item: Item, amount: number): Item | undefined {
  if (amount <= 0 || amount >= item.qty) return undefined;
  const copy: Item = { ...item, qty: amount };
  item.qty -= amount;
  return copy;
}
```

## 5. Lands in

- Frankendom: no inventory file exists yet in the shadow tree; the closest owners are src/fight/gear-room.ts (today: src/gear-room.ts, moving) (gear list) and src/loot-claims.ts (what a player is owed). The slot-and-stack rule would sit in one of these, not in the duel loop.
- Parity checklist: row 18 (loot roll and XP award: a claimed item enters the server inventory row) with row 15 (gear dressing, slot to worn gear) and row 21 (catalogue gear-tier fields). The container itself is not a checklist item.
- Beyond checklist: economy (later phase), and the bank lane (later phase).

Reuse tag: rewrite-from-idea
Brief rule served: one-character, one-ledger rule (server inventory is the authority); rules 7-9 n/a

## 6. Gaps and risks

- The donor mutates item and container objects in place on the client. Under the one-ledger and server-verified rulings, collect would have to be a server operation on inventory rows, with the client only rendering the result.
- Pickup and drop cost turns and drops go to a floor tile. Frankendom zones are data and have no floor-item layer; the drop model does not map.
- The "lost inventory" debuff is a roguelike penalty; Frankendom has no death-loss rule of this kind yet. Death and respawn is row 17; if used, the rule must be server-side.
- Stack merging mutates both items in place. Frankendom's inventory must be server rows; in-place mutation on the client would desync.
- Conflict check: the one-engine rule means an inventory list lives in one module; keep it out of the duel step (src/fight/duel.ts (today: src/duel.ts, moving)).
