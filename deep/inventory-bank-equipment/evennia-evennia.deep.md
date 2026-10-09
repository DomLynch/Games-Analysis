# evennia-evennia (inventory-bank-equipment, cell 9)

Donor: /mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/equipment.py | Licence: BSD-3 | Python | symbol EquipmentHandler

Symbol check: `EquipmentHandler` at line 16 is the class, as cited. Its logic is in `validate_slot_usage` (89-111), `count_slots` (63-78), `max_slots` (80-87), `move` (233-285), `add` (287-302) and `remove` (304-345). All opened and checked.

## 1. Mechanism

- A character has a set of wield or wear slots: weapon hand, shield hand, two hands, body, head, and a backpack list (the default dict at `_load`, 40-51, keyed by `WieldLocation`; enum in enums.py, not read). Each slot holds one object or None; the backpack holds a list. Loading also drops dead backpack entries (`obj and obj.id`, 52-54).
- Capacity is a size budget, not a count of items. Each object has a `size` (read with `getattr(..., 'size', 0) or 0`, 71 and 76; the class docstring, 18-21, says torches share a slot and big weapons or armour take more, and `count_slots`' docstring, 66, says sizes can be partial). Max budget = `getattr(obj, Ability.CON.value, 1) + 10` (`max_slots`, 87; the attribute defaults to 1 if missing, `Ability` is in enums.py, not read). `count_slots` (63-78) sums the size of everything in the non-backpack slots plus the backpack list.
- `validate_slot_usage(obj)` (89-111) raises `EquipmentError` if the object does not inherit `EvAdventureObject` (97-98), or if current usage plus `obj.size` exceeds the budget (104-110, the message reports the slots left); otherwise returns True.
- `move(obj)` (233-285) puts an object into the slot its `inventory_use_slot` names:
  - Two-handed: evicts the weapon and shield hands to the backpack, then places the object.
  - One-handed or shield: evicts the two-handed item to the backpack, then writes the object into its slot. (265-269: whatever already sat in that same hand slot is overwritten and is not sent to the backpack; this is a donor omission.)
  - Backpack: returns it to the backpack.
  - Body or head: swaps with whatever is there, and the old item goes to the backpack.
- It calls `self.remove(obj)` first (253; this itself saves, 343-344, when something was removed), so the object is not counted twice, then `validate_slot_usage` (255), then reads `inventory_use_slot` with a backpack default (257), does the swap, appends non-None evictions to the backpack (279-282), then saves (285).
- `add(obj)` (287-302) puts an object in the backpack after the budget check.
- `remove(obj_or_slot)` (304-345) empties a slot, the whole backpack, or one object (found in a slot or the backpack), and returns what was removed. Saves only if the result list is non-empty (343-344); emptying an already-empty named slot still appends None to the result (328), so it saves.
- Output: updated slot state, and a list of evicted objects. Runs on the player's equip, unequip and pick-up commands.

## 2. Key functions

| Name | Path | Lines | What it does |
|---|---|---|---|
| EquipmentHandler.validate_slot_usage | /mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/equipment.py | 89-111 | Size budget check against constitution plus 10 |
| EquipmentHandler.count_slots | /mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/equipment.py | 63-78 | Sums size over wield slots and backpack |
| EquipmentHandler.move | /mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/equipment.py | 233-285 | Places an object in its use slot; evicts colliding items to the backpack |
| EquipmentHandler.add | /mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/equipment.py | 287-302 | Backpack add after the budget check |
| EquipmentHandler.remove | /mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/equipment.py | 304-345 | Empties a slot, the backpack, or one object |

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Size budget: a sum of item sizes must stay within a capacity | Capacity = constitution plus 10, constitution default 1 (theirs, equipment.py:87) |
| Two-hand and hand-slot exclusion: a two-handed item evicts both hands; a one-handed item evicts the two-handed item | Slot names (theirs, `WieldLocation` members used at 44-49) |
| Evict-to-backpack on swap | Backpack as the overflow (theirs) |
| Remove-then-validate so a moved item is not counted twice | Order of calls: remove 253, validate 255 (theirs) |

## 4. TypeScript sketch

Licence: BSD-3. The logic may be lifted from the path above; this sketch restates the structure in its own names.

simplified: the sketch evicts the previous occupant of a weapon or shield hand to the backpack, which the donor does not do (265-269 overwrite it); no persistence call; no `inherits_from` type check; `remove` is inlined and not exposed; `count_slots` treats sizes as plain numbers and has no default for a missing size; the budget is passed in rather than computed from constitution.

```ts
// Licence: BSD-3 (evennia-evennia, evennia/contrib/tutorials/evadventure/equipment.py
// EquipmentHandler: validate_slot_usage, move, add, remove)
type Slot = 'weapon' | 'shield' | 'twoHands' | 'body' | 'head' | 'backpack';
interface Item { id: string; size: number; useSlot: Slot; }
interface Loadout { slots: Partial<Record<Slot, Item | undefined>>; backpack: Item[]; }
function usage(l: Loadout): number {
  let n = 0;
  for (const [s, it] of Object.entries(l.slots)) if (s !== 'backpack' && it) n += it.size;
  for (const it of l.backpack) n += it.size;
  return n;
}
function validate(l: Loadout, item: Item, budget: number): void {
  if (usage(l) + item.size > budget) throw new Error('equipment full');
}
// Move an item into its use slot; evicted items go to the backpack.
function move(l: Loadout, item: Item, budget: number): Item[] {
  // remove first so the item is not counted twice
  for (const s of Object.keys(l.slots) as Slot[]) if (l.slots[s]?.id === item.id) l.slots[s] = undefined;
  l.backpack = l.backpack.filter((b) => b.id !== item.id);
  validate(l, item, budget);
  const evicted: Item[] = [];
  if (item.useSlot === 'twoHands') {
    for (const s of ['weapon', 'shield'] as Slot[]) { if (l.slots[s]) evicted.push(l.slots[s]!); l.slots[s] = undefined; }
    l.slots.twoHands = item;
  } else if (item.useSlot === 'weapon' || item.useSlot === 'shield') {
    if (l.slots.twoHands) { evicted.push(l.slots.twoHands); l.slots.twoHands = undefined; }
    if (l.slots[item.useSlot]) evicted.push(l.slots[item.useSlot]!);
    l.slots[item.useSlot] = item;
  } else if (item.useSlot === 'backpack') {
    evicted.push(item);
  } else {
    if (l.slots[item.useSlot]) evicted.push(l.slots[item.useSlot]!);
    l.slots[item.useSlot] = item;
  }
  for (const e of evicted) l.backpack.push(e);
  return evicted;
}
```

Gap noted in the sketch: `move` evicts to the backpack without checking the budget a second time. The donor does the same (see section 6).

## 5. Lands in

- Frankendom: src/fight/gear-room.ts (today: src/gear-room.ts, moving) (the named slots and the two-hand exclusion) and src/gear-stats.ts (size and budget values as catalogue data). The two-hand and shield exclusion is a gear-dressing rule, so parity row 15 (gear dressing, src/fight) takes it.
- Parity checklist row 15 (gear dressing). Row 20 (catalogue as runtime source) and row 21 (catalogue fields) for the use slot and size.
- Beyond checklist: economy (later phase) for a size budget on a pack.

Reuse tag: adapt
Brief rule served: one-character, one-ledger rule (server inventory is the authority); rules 7-9 n/a

## 6. Gaps and risks

- Eviction in `move` does not re-check the backpack budget (validate runs once, at 255, before evictions). Evicted items can push the total over the budget. Frankendom must not copy this: any eviction must be checked against capacity, or the gear room can hold more than it should.
- `move` overwrites the existing item in a weapon or shield hand without sending it to the backpack (265-269), so the old item vanishes from the handler's state. Frankendom must evict it (as the sketch does) so the one ledger never loses an item.
- The budget is constitution plus 10. Frankendom has no constitution stat in the duel, so the budget must come from the catalogue or a gear-room rule.
- The slot model is an object-per-slot record. It fits the named gear slots of the gear room well; a backpack list fits only if Frankendom has a backpack at all.
- Conflict check: equip moves change server state. They must be applied between fights on the server; a client copy would split the one-engine rule.
