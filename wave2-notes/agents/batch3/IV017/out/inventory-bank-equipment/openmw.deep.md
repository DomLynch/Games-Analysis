# openmw (inventory-bank-equipment, cell 9)

Donor: /mnt/frankendom-donors/openmw/apps/openmw/mwworld/inventorystore.cpp (+ inventorystore.hpp, mwclass/armor.cpp, mwmechanics/actors.cpp) | Licence: GNU GPL v3 (LICENSE file at the donor root, read: "GNU GENERAL PUBLIC LICENSE / Version 3, 29 June 2007") | C++ | symbol InventoryStore::autoEquip
Checked: opened inventorystore.hpp in full; inventorystore.cpp add, equip, autoEquip, autoEquipWeapon (lines 233-388), autoEquipArmor (390-504), getPreferredShield, stacks, remove, unequipSlot, unequipItem, unequipItemQuantity, isFirstEquip; mwclass/armor.cpp getEquipmentSlots (lines 84-111); mwmechanics/actors.cpp updateEquippedLight (1050-1110) and its two shield call sites. Callers of autoEquip found by grep: mwmechanics/spelleffects.cpp:165, 256, 1012; mechanicsmanagerimp.cpp:235; mwclass/npc.cpp:389; mwclass/creature.cpp:174 (not read beyond the grep line). Callers of unequipItemQuantity: mwgui/inventorywindow.cpp:389, 684 and mwscript/miscextensions.cpp:786 (grep only). The caller of updateEquippedLight passes showTorches (actors.cpp:1667); how showTorches is set was not read. Not read: ContainerStore::add/restack/unstack internals (containerstore.cpp), the ESM weapon and armour records (chop, slash, thrust, rating, value), the GMST records behind fUnarmoredBase1 and fUnarmoredBase2, the stack flag for weapons (getEquipmentSlots in weapon.cpp), the window UI. Camera: not applicable. Confidence: high on the planner order and the commit; high on the side effect in the armour planner (read in full, one caller path each); medium on the weapon planner's tie rules (read, but the ESM field meanings were not read).

## 1. Mechanism
The NPC inventory has 19 fixed equipment slots (Slot_Helmet = 0 to Slot_Ammunition = 18, inventorystore.hpp:33-53). Each slot holds at most one item (a stack is one item). Equipping an item into an occupied slot first unequips the occupant, which restacks it into the bag (inventorystore.cpp:180-181). An equipped stack is split when the item cannot stay stacked (inventorystore.cpp:187), and armour never stays stacked (armor.cpp:111 returns false for the stack flag).

Auto-equip (InventoryStore::autoEquip, inventorystore.cpp:506-537) is a planner, not a sequence of direct equips. It copies the slot table into a scratch vector (initSlots), runs the weapon planner on the copy, then the armour planner on the copy, with model updates disabled. Only if any slot differs from the live table does it swap the scratch table in, fire one event, and flag the store modified. So a planning pass that changes nothing leaves the live table alone.

Weapon planner (autoEquipWeapon, lines 233-388). It skips weapons for creatures that sell weapons. It picks the ammo with the highest chop max value (arrows and bolts separately, ties to the later item, the ammo loop starts at line 270). Then it loops: pick the highest unvisited weapon skill whose value is above 0 (line 297); among the bag's weapons of that skill, pick the one with the highest chop, slash or thrust max value (running max, ties to the later item, line 319); if that weapon can be equipped, and if it is ranged the matching ammo exists, assign it to its first slot and stop. Otherwise mark the skill visited (line 386) and try the next skill.

Armour planner (autoEquipArmor, lines 390-504). For an NPC the candidate pool is armour and clothing. Armour must beat the unarmoured rating, which is (fUnarmoredBase1 x Unarmored skill) x (fUnarmoredBase2 x Unarmored skill), clamped at zero (lines 404-408). Creatures take shields only, and compare shield condition rather than rating. For each candidate, each allowed slot is tried in order. An occupied slot is replaced only on a strict improvement: clothing only replaces clothing and only with a dearer item (line 465); same-type armour needs a higher skill-adjusted rating for NPCs (line 479) or better condition for creatures (line 484); armour of a different type replaces the occupant unless the occupant's type number is lower (line 488; the type order was not read). The left ring has its own rule (lines 455-461). A candidate that passes these checks is split out of its stack first if it cannot stay stacked (lines 494-496), whether or not it keeps the slot, and is then written into the scratch table (line 500).

Off-hand swap in combat (actors.cpp:1050-1110): when the actor is in combat and the left hand is empty or holds a light, the code calls getPreferredShield and equips the result. Out of combat, a held light is removed in favour of a torch or a shield, depending on the caller's flag.

## 2. Key functions
- InventoryStore::autoEquip, inventorystore.cpp:506-537: plan into a scratch table, commit once.
- InventoryStore::autoEquipWeapon, inventorystore.cpp:233-388: skill-first weapon pick with an ammo gate and a fall-through to the next skill.
- InventoryStore::autoEquipArmor, inventorystore.cpp:390-504: per-slot strict-improvement rules and the unarmoured floor.
- InventoryStore::getPreferredShield, inventorystore.cpp:539-545: the armour planner on a scratch table, returns the left-hand result, commits nothing.
- InventoryStore::equip and unequipSlot, inventorystore.cpp:162-195 and 607-648 (restack is inside unequipSlot).
- InventoryStore::unequipItemQuantity, inventorystore.cpp:662-687: partial unequip, merge into an unequipped stack that stacks, else split.
- InventoryStore::stacks, inventorystore.cpp:547-565: equipped items do not stack unless the slot says they may.
- InventoryStore::remove, inventorystore.cpp:567-605: removes the equipped item from its slot, then re-runs autoEquip for NPC armour and clothing (not for the player or werewolves).

## 3. Numbers vs mechanism
- 19 slots (inventorystore.hpp:53). Left-hand shield slot 17 (Slot_CarriedLeft). Ammunition slot 18.
- Weapon skill list: six skills (inventorystore.cpp:247-253).
- Unarmoured rating: (fUnarmoredBase1 x skill) x (fUnarmoredBase2 x skill), clamped at zero. The two GMST values were not read.
- Ties: every "best item" comparison uses >= with a running max, so the later item in container order wins a tie. The donor's bag order decides ties, not an id.
- A candidate needs a strict > to replace a same-type occupant (rating or condition), and a strict > for a dearer clothing item.
- The planner splits a stack for any candidate that passes its checks. It does not know whether that candidate will win the slot.

## 4. TypeScript sketch
simplified: clean-room shape only. Omitted: the ring rule (left ring only with a dearer right ring), the weapon-skill table as data, weapon stack flags, creature handling beyond the shield rule, the arrow-versus-bolt split (ammo is one list here), the unequipped-quantity merge, the event firing, and the UI. Reordered: the donor splits stacks inside the planner; the sketch returns the stacks to split and splits them only in commitAutoEquip, and only when the table changed. The donor splits even when the candidate later loses its slot (that is the defect in section 6). preferredShield runs the armour planner only and splits nothing, as the donor's getPreferredShield intends.

```ts
// Clean-room shape of an NPC auto-equip planner (GPL v3 donor; no lines copied).
// Plan into a scratch table first, commit once. The planner never splits stacks itself.
type Kind = 'weapon' | 'ammo' | 'armor' | 'clothing' | 'light' | 'other';

interface Item {
  id: number;
  kind: Kind;
  slots: number[];        // slot indices this item may occupy, in preference order
  count: number;          // stack size in the bag
  canStack: boolean;      // true only if the item may stay stacked while equipped
  value: number;          // gold value (clothing replacement)
  rating: number;         // skill-adjusted armour rating (armour)
  armorType: number;      // armour type index (armour)
  health: number;         // condition (creature shields compare this instead of rating)
  isShield: boolean;
  damage: number;         // best attack value across chop, slash, thrust (weapons)
  skill: string;          // weapon skill (weapons)
  ammoKind: string;       // ammo this ranged weapon needs (weapons) or the ammo type it is (ammo), '' for melee
  canEquip: boolean;
}

const SLOTS = 19;
const SLOT_AMMO = 18;
const SLOT_LEFT_HAND = 17;

interface Skills { [skill: string]: number }

// Weapon: the highest skill that has an equippable weapon wins. Ranged weapons need ammo, else try the next skill.
function planWeapon(bag: Item[], table: (Item | null)[], skills: Skills): void {
  const order = Object.keys(skills)
    .filter(s => skills[s] > 0)                      // a zero-skill weapon class is never chosen
    .sort((a, b) => skills[b] - skills[a]);
  for (const skill of order) {
    let best: Item | null = null;
    for (const it of bag) {
      if (it.kind !== 'weapon' || it.skill !== skill) continue;
      if (best === null || it.damage >= best.damage) best = it;   // ties go to the later item
    }
    if (best === null || !best.canEquip) continue;
    if (best.ammoKind !== '') {
      let ammo: Item | null = null;
      for (const it of bag) {
        if (it.kind === 'ammo' && it.ammoKind === best.ammoKind) {
          if (ammo === null || it.damage >= ammo.damage) ammo = it;
        }
      }
      if (ammo === null) continue;                   // no ammo: skip this skill
      table[SLOT_AMMO] = ammo;
    } else {
      table[SLOT_AMMO] = null;
    }
    table[best.slots[0]] = best;
    return;                                          // first skill that succeeds wins
  }
}

// Armour and clothing: a candidate replaces an occupant only on a strict improvement.
function planArmor(bag: Item[], table: (Item | null)[], unarmoredRating: number, isNpc: boolean): void {
  for (const it of bag) {
    if (it.kind !== 'armor' && it.kind !== 'clothing') continue;
    if (it.kind === 'armor') {
      if (isNpc && it.rating <= unarmoredRating) continue;    // worse than bare skin
      if (!isNpc && !it.isShield) continue;                   // creatures take shields only
    }
    if (!it.canEquip) continue;
    for (const slot of it.slots) {
      const old = table[slot];
      if (old !== null) {
        if (it.kind === 'clothing') {
          if (old.kind !== 'clothing') continue;              // clothing only replaces clothing
          if (it.value <= old.value) continue;                // ...and only a dearer one
        } else if (old.kind === 'armor') {
          if (old.armorType === it.armorType) {
            const better = isNpc ? it.rating > old.rating : it.health > old.health;
            if (!better) continue;
          } else if (old.armorType < it.armorType) {
            continue;                                         // donor's type-order tiebreak, rationale not read
          }
        }
      }
      table[slot] = it;
      break;
    }
  }
}

export interface Plan {
  table: (Item | null)[];
  stacksToSplit: Item[];   // only items that end up equipped and are stacked in the bag
}

// Pure: never touches the bag. Safe for a read-only query such as "which shield would I wear?".
export function planAutoEquip(bag: Item[], skills: Skills, unarmoredRating: number, isNpc: boolean): Plan {
  const table: (Item | null)[] = new Array<Item | null>(SLOTS).fill(null);
  planWeapon(bag, table, skills);
  planArmor(bag, table, unarmoredRating, isNpc);
  const stacksToSplit = table.filter((it): it is Item => it !== null && !it.canStack && it.count > 1);
  return { table, stacksToSplit };
}

// Commit: split stacks and swap the table in, once, and only if something changed.
// Returns true when the equipment changed (the caller fires one "equipment changed" event).
export function commitAutoEquip(plan: Plan, current: (Item | null)[], splitStack: (it: Item) => void): boolean {
  let changed = false;
  for (let i = 0; i < SLOTS; i++) {
    if (plan.table[i] !== current[i]) { changed = true; break; }
  }
  if (!changed) return false;
  for (const it of plan.stacksToSplit) splitStack(it);
  for (let i = 0; i < SLOTS; i++) current[i] = plan.table[i];
  return true;
}

// Dry run used by a combat check: returns the left-hand pick without splitting anything.
export function preferredShield(bag: Item[], unarmoredRating: number, isNpc: boolean): Item | null {
  const table: (Item | null)[] = new Array<Item | null>(SLOTS).fill(null);
  planArmor(bag, table, unarmoredRating, isNpc);   // armour pass only, as the donor's getPreferredShield
  return table[SLOT_LEFT_HAND];
}

export {};
```

Typecheck: scp to the VPS and `npx -p typescript tsc --noEmit --strict --target es2020` passed (exit 0). Run on the VPS: a bag with a count-2 helmet (rating 10), a single helmet (rating 12) and a third (rating 11) picks the rating-12 helmet and splits nothing; commitAutoEquip reports a change; preferredShield returns a shield and leaves the bag counts unchanged (2, 1, 1).

## 5. Lands in
Target: src/fight/equip-planner.ts (new module, proposed). Parity row 18 (loot roll and XP award; item ownership and what an NPC carries). The combat off-hand swap belongs to row 5 (controls) only if we later drive it from player input; not cited here.

## 6. Gaps and risks
- Planner side effect (donor defect): the armour planner splits a non-stackable stack (armour always reports can-stack false, armor.cpp:111) at inventorystore.cpp:494-496 before the candidate is known to win its slot, and getPreferredShield runs the same planner. So a read-only combat query can split a stack in the NPC bag, and the split is not undone if a later candidate takes the slot or the commit is skipped. Fix: the sketch plans without splitting and splits only the stacks that end up equipped, only on commit. This is a defect in the implementation, not a reason to drop the planner.
- Weapon stacks are split the same way inside autoEquipWeapon (inventorystore.cpp:367-372) before commit. Fix: the same plan-then-split (sketch treats weapons and armour alike, since the weapon stack flag was not read).
- Player is excluded (inventorystore.cpp:147 and 592). Frankendom's hero is the player, so the auto-equip rule should be for NPC and minion loadouts only. Do not auto-equip the hero: that rule is a player-choice decision.
- Tie-break by container order (later wins) makes the chosen item depend on bag order. Frankendom should break ties by a stable id, which the donor does not do.
- Strict-improvement replacement means a dearer item with the same rating is not swapped in. That is the intended conservatism; the donor gives no reason beyond the code.
- Engage is a state change: the off-hand swap is driven from a combat check every interval (actors.cpp:1667 calls updateEquippedLight with showTorches). In Frankendom, the swap must happen on the server's engage state change, not on a client timer. The caller's showTorches source was not read.
- Server-verified: loadouts for NPCs must be decided on the server, so the dry run and the commit both run server-side. Nothing here covers the phone inspect flow or loot presentation.

Reuse tag: adapt-shape (GPL v3: clean-room, no code copied)
Brief rule served: STRONG needs real code opened, numbers explained and a self-contained mechanism; met (planner, weapon ladder and armour rules read end to end; the defect was confirmed by reading the call path).

Best transferable idea: Plan an NPC's loadout into a scratch table with strict-improvement rules per slot, make the planner side-effect free, and commit the swap once only when something changed.
Decision (proposed): adapt — keep plan-then-commit and the dry-run query for NPC and minion loadouts, fix the stack split so it happens only on commit, and never auto-equip the hero.
Acceptance: A server test: an NPC with a count-2 helmet and a better single helmet ends with one helmet equipped and the bag counts unchanged except for the equipped swap; a combat-engage dry run returns the shield it would wear and changes no bag count.
