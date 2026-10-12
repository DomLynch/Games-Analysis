# miki151-keeperrl (inventory-bank-equipment, cell 9)

Donor: /mnt/frankendom-donors/miki151-keeperrl/equipment.cpp (+ equipment.h, creature.cpp, body.cpp, item.cpp, inventory.cpp, minion_equipment.cpp) | Licence: GNU GPL v2 or later (read in equipment.h lines 5-7; header text: "GNU General Public License as published by the Free Software Foundation; either version 2") | C++ | symbol Equipment::getMaxItems
Checked: opened equipment.h and equipment.cpp in full; creature.cpp equip, unequip, canEquipIfEmptySlot, dropUnsupportedEquipment, attack, visitMaxSimultaneousWeapons and getMaxSimultaneousWeapons; body.cpp injureBodyPart (both overloads), looseBodyPart, numGood/numBodyParts; item.cpp isConflictingEquipment; inventory.cpp tick; minion_equipment.cpp tryToOwn and the item-limit predicate (lines 107-125). Callers of getMaxItems: creature.cpp:783, 811, 1589 and minion_equipment.cpp:113, 231, 294 read; player_control.cpp:651, 662 seen by grep only (not read). Not read: the slot picker UI, item attribute loading, the body-part item drop, isCritical (body.cpp:245). Camera: not applicable (no camera in this topic). Confidence: high on slot capacity, equip order and the drop path; medium on the minion side. Literal constant 3 (equipment.cpp:93) has no receipt because the only quote is 8 characters, under the 15-character minimum.

## 1. Mechanism
Equipment has 11 typed slots (weapon, ranged, shield, helmet, gloves, body, boots, amulet, rings, prayer book, devotional items). Capacity is not stored: Equipment::getMaxItems computes it from the creature each time it is asked. Weapon capacity is min(healthy arms, simultaneous-weapon count). Rings are capped by healthy arms, amulet and helmet by healthy heads, the prayer book by a preaching buff, devotional items are 3 slots when the DIVINITY attribute is above 0, and every other slot holds 1.

"Healthy" means numGood = bodyParts minus injured. A lost limb leaves bodyParts; an injured limb stays in bodyParts but counts as not good. Both reduce capacity.

Equipping (Creature::equip) runs in this order: check can-equip (humanoid, arms, two-handed needs two healthy arms, slot capacity not zero); if the slot is full, unequip index 0 of that slot (the oldest equipped item, not the worst); unequip any conflicting item (two-handed weapon vs shield, either order); then the equip action runs last. NPCs spend a turn after equipping as a loop guard (creature.cpp:806-808).

Injury path: Body::injureBodyPart (body.cpp:374) handles a loss (drop=true: the limb item falls to the floor, then looseBodyPart moves one part from bodyParts to lostBodyParts) or an injury (drop=false: injuredBodyParts rises up to bodyParts). If the result is critical (death), it returns early. Otherwise it applies the blind, collapsed and flying effects and calls Creature::dropUnsupportedEquipment (body.cpp:409). That function walks every slot and drops every item above the new capacity onto the creature's tile, starting from the last item in the slot list (creature.cpp:1586-1597). So a wounded hand drops the second weapon, and it lands on the floor as an item, not a deletion.

Multi-weapon ladder (visitMaxSimultaneousWeapons, creature.cpp:2457-2475): skill s = min(1, MULTI_WEAPON x 0.02). The visitor emits 1 first. If s is below 0.01 it stops. If s is above 0.95 it emits ten more 1s and stops. Otherwise it emits s, then s squared, s cubed and so on while the value is at least 0.5. The count of emitted values is the number of simultaneous weapons (getMaxSimultaneousWeapons), and the values are the damage multipliers used by attack() (creature.cpp:1637-1646, damage = max(1, int(multiplier x (attr + special + modifier)))).

## 2. Key functions
- Equipment::getMaxItems, equipment.cpp:79-97: the per-slot capacity rule (weapon, rings, amulet/helmet, prayer book, devotional, default 1).
- Equipment::canEquip, equipment.cpp:99-104: false if already equipped or slot count is at capacity.
- Creature::equip, creature.cpp:794-823: can-equip check, oldest-first eviction (lines 811-812), conflict eviction (814), then the equip action.
- Creature::dropUnsupportedEquipment, creature.cpp:1586-1599: overflow drop, last item first.
- Body::injureBodyPart, body.cpp:374-411: loss or injury, early return on critical, then the drop call at line 409.
- Body::numGood, body.cpp:270-272; looseBodyPart body.cpp:465-473; injureBodyPart (overload) body.cpp:475-479.
- Item::isConflictingEquipment, item.cpp:667-672: two-handed vs shield, symmetric, skips self.
- visitMaxSimultaneousWeapons and Creature::getMaxSimultaneousWeapons, creature.cpp:2457-2481.
- MinionEquipment::tryToOwn, minion_equipment.cpp:227-255: NPC gear, contested items sorted by value (line 242); the item-limit predicate at lines 111-120 keeps a candidate only when fewer than the limit of owned items are at least as valuable or locked.

## 3. Numbers vs mechanism
- Slot capacities (equipment.cpp:83-95): weapon = min(arms, ladder count); rings = arms; amulet and helmet = heads; prayer book = 1 when buffed; devotional = 3 when DIVINITY > 0; default = 1.
- Skill scale: 0.02 per attribute point, capped at 1.0 (creature.cpp:2460). Ladder floor: 0.5 (creature.cpp:2459). Ladder skip below 0.01 (creature.cpp:2462). Mastery threshold: above 0.95 (creature.cpp:2464), with 10 extra full-strength slots (creature.cpp:2465).
- Ladder counts, ported line for line to JavaScript and run on the VPS (not the C++ itself): attribute 0 gives 1 slot, 1 gives 2, 36 gives 3, 40 gives 4, 46 gives 9, 47 gives 12, 48 gives 11, 50 and above give 11.
- Defect: the count falls from 12 to 11 when the attribute rises from 47 to 48, because the mastery branch emits one fewer slot than the ladder at 0.94. Because the weapon slots are also capped by arms, this shows up as fewer attacks per action only when the creature has at least 11 attack sources (held weapons plus intrinsic attacks, body.cpp:134-151). Intrinsic attack data was not read.
- Equip order is oldest-first (index 0) and drop order is newest-first (items.back()). Both are the donor's choice, not a rule of value.

## 4. TypeScript sketch
simplified: clean-room shape only. Omitted: equip and unequip actions, the turn spend, body-part loss effects (blind, collapsed, flying), item upgrades on dropped limbs, the minion value-replacement, the UI and serialisation. Reordered: the donor evicts oldest-first and drops newest-first; the sketch evicts and drops the lowest-value item (the fix below). The sketch also ignores locks when dropping, which the donor also does for the drop path. The mastery branch is changed: 11 full-strength extra slots (12 total) instead of 10 (11 total), so the count no longer falls at 0.95 and above.

```ts
// Clean-room shape of KeeperRL equipment slots (GPL v2 donor; no lines copied).
// Slot capacity is a pure function of the body and skills; over-capacity gear falls to the ground.
type Slot =
  | 'weapon' | 'ranged' | 'shield' | 'helmet' | 'gloves' | 'body' | 'boots'
  | 'amulet' | 'rings' | 'prayer' | 'devotional';

const ALL_SLOTS: Slot[] = [
  'weapon', 'ranged', 'shield', 'helmet', 'gloves', 'body', 'boots',
  'amulet', 'rings', 'prayer', 'devotional',
];

interface Hero {
  armsHealthy: number;      // body parts that are neither lost nor injured
  headsHealthy: number;
  multiWeaponAttr: number;  // integer skill attribute
  divinity: number;
  preachingBuff: boolean;
}

interface Item {
  id: number;
  slot: Slot;
  twoHanded: boolean;
  value: number;            // how much the hero values it (used for evictions and drops)
  locked: boolean;
}

// Damage multiplier for each simultaneous attack: 1, then skill, then skill^2, skill^3, ... while >= 0.5.
// Fix: the donor's mastery branch (skill > 0.95) gave 1 + 10 = 11 slots, one fewer than skill 0.94 (12).
// Here mastery gives 1 + 11 = 12 full-strength slots, so the count never falls as skill rises.
export function attackLadder(attr: number): number[] {
  const skill = Math.min(1.0, attr * 0.02);
  const out: number[] = [1];
  if (skill < 0.01) return out;
  if (skill > 0.95) {
    for (let i = 0; i < 11; i++) out.push(1);
    return out;
  }
  out.push(skill);
  let cur = skill * skill;
  while (cur >= 0.5) {
    out.push(cur);
    cur *= skill;
  }
  return out;
}

// Capacity per slot, derived from the body and skills. Stored nowhere: recompute after every injury.
export function slotCapacity(slot: Slot, h: Hero): number {
  switch (slot) {
    case 'weapon':
      return Math.min(h.armsHealthy, attackLadder(h.multiWeaponAttr).length);
    case 'rings':
      return h.armsHealthy;
    case 'amulet':
    case 'helmet':
      return h.headsHealthy;
    case 'prayer':
      return h.preachingBuff ? 1 : 0;
    case 'devotional':
      return h.divinity > 0 ? 3 : 0;
    default:
      return 1;
  }
}

// Two-handed weapon and shield exclude each other, in either order.
export function conflicts(a: Item, b: Item): boolean {
  if (a.id === b.id) return false;
  return (a.twoHanded && b.slot === 'shield') || (b.twoHanded && a.slot === 'shield');
}

// What must come off before `item` can go on. null means the slot is full of locked items.
// Donor evicts the oldest item in the slot; fix: evict the lowest-value unlocked item instead.
export function planEquip(equipped: Item[], item: Item, h: Hero): Item[] | null {
  const evict: Item[] = [];
  const sameSlot = equipped.filter(i => i.slot === item.slot);
  if (sameSlot.length >= slotCapacity(item.slot, h)) {
    const unlocked = sameSlot.filter(i => !i.locked);
    if (unlocked.length === 0) return null;
    evict.push(unlocked.reduce((worst, i) => (i.value < worst.value ? i : worst)));
  }
  for (const other of equipped) {
    if (conflicts(item, other) && !evict.includes(other)) evict.push(other);
  }
  return evict;
}

// Run after every injury or loss. Returns the items that fall to the floor.
// Donor drops the most recently equipped excess item; fix: drop the lowest-value excess item.
export function dropOverCapacity(equipped: Item[], h: Hero): Item[] {
  const dropped: Item[] = [];
  for (const slot of ALL_SLOTS) {
    const cap = slotCapacity(slot, h);
    let inSlot = equipped.filter(i => i.slot === slot);
    while (inSlot.length > cap) {
      const worst = inSlot.reduce((w, i) => (i.value < w.value ? i : w));
      inSlot = inSlot.filter(i => i !== worst);
      equipped.splice(equipped.indexOf(worst), 1);
      dropped.push(worst);
    }
  }
  return dropped;
}

export {};
```

Typecheck: scp to the VPS and `npx -p typescript tsc --noEmit --strict --target es2020` passed (exit 0). Run on the VPS: attackLadder gives 12 at attribute 47 and 48; planEquip evicts the lower-value weapon; dropOverCapacity with one arm drops the lower-value weapon and keeps the shield.

## 5. Lands in
Target: src/fight/equip-slots.ts (new module, proposed). Parity row 18 (loot roll and XP award, item ownership): the capacity rule and the overflow drop change who owns an item, so they land on the ledger row. The visual unequip belongs to row 15 (gear dressing), not cited here.

## 6. Gaps and risks
- Wound model: a healthy-part count per limb does not exist in Frankendom's rulings yet. Capacity from arms needs the wound model to expose healthy counts per part, which is a dependency on the row 8 (wounds) work.
- One ledger: the donor drops the item onto the tile. In Frankendom the dropped gear must be a floor entry in the same ledger, never removed. The donor's floor-item path was not read.
- Server-verified: this rule must run inside the server's wound resolution, not in the client. The donor's equip is a client-side action closure; the drop runs inside injury resolution, which is where the server must run it too.
- MAX_ATTACKERS = 3 is about enemies attacking one hero. The donor's weapon ladder is attacks per action and is not adopted here; it belongs to the combat-sim topic.
- Phone: the donor's slot picker UI (player_control.cpp around lines 640-665) was not read. Nothing here covers the phone inspect flow.
- Defects, each with a fix: (1) ladder count falls from 12 to 11 between attribute 47 and 48. Fix: mastery emits 11 extra slots (sketch). (2) Oldest-first eviction. Fix: lowest-value unlocked item (the minion side already sorts by value at minion_equipment.cpp:242). (3) Newest-first drop. Fix: lowest-value excess item. (4) NPC loop guard is a spent turn (creature.cpp:806-808). Fix: a per-item re-equip cooldown; not implemented in the sketch.

Reuse tag: adapt-shape (GPL v2: clean-room, no code copied)
Brief rule served: STRONG needs real code opened, numbers explained and a self-contained mechanism; met (capacity rule, injury drop and ladder were read end to end).

Best transferable idea: Derive each gear slot's capacity from the hero's healthy body parts and skills, and when a wound cuts the capacity, drop the excess gear to the floor as loot instead of deleting it.
Decision (proposed): adapt — keep the derived capacity and overflow-to-floor rule; take the value-based eviction and drop, not the donor's oldest-first order; leave the attack ladder to the combat topic.
Acceptance: A server test: a hero with two weapons takes an arm wound, the lower-value weapon leaves the hands and appears as a floor item in the same ledger (item count unchanged), and equipping a two-handed weapon with a shield on auto-unequips the shield.
