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
