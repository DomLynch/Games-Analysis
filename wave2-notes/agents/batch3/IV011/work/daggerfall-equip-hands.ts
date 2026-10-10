// Licence: MIT (donor, Daggerfall Unity). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Equip: resolve the target slot first, apply hand exclusivity, refuse before any change if the slot is taken and not replaceable, and return the displaced items.

export {};

type Hands = "none" | "either" | "both" | "leftOnly" | "rightOnly";
type Slot = "RightHand" | "LeftHand" | "Head" | "ChestArmor" | "Feet" | "Other";

interface Item {
  name: string;
  slot: Slot | "none";      // fixed slot for armour; "none" for weapons and shields (resolved from hands)
  hands: Hands;             // weapons and shields
  isArrow?: boolean;        // arrows cannot be equipped
  equippedSlot?: Slot;      // set while equipped
}

type Table = Partial<Record<Slot, Item>>;

interface EquipResult { ok: boolean; displaced: Item[]; }

// Donor GetEquipSlot / GetWeaponSlot / GetFirstSlot, simplified.
// A two-handed weapon in the right hand is replaced by any non-shield weapon.
// An either-hand weapon takes an open hand, else the right hand.
function resolveSlot(table: Table, item: Item): Slot | undefined {
  if (item.hands === "none") return item.slot === "none" ? undefined : item.slot;
  const right = table.RightHand;
  if (right !== undefined && right.hands === "both" && item.hands !== "leftOnly") return "RightHand";
  switch (item.hands) {
    case "both":
    case "rightOnly":
      return "RightHand";
    case "leftOnly":
      return "LeftHand";
    case "either":
      if (table.RightHand === undefined) return "RightHand";
      if (table.LeftHand === undefined) return "LeftHand";
      return "RightHand";
    default:
      return undefined;
  }
}

// Fix of donor defect D1: the refusal check runs before any hand is changed.
function equip(table: Table, item: Item, alwaysEquip: boolean = true): EquipResult {
  if (item.isArrow) return { ok: false, displaced: [] };

  const slot = resolveSlot(table, item);
  if (slot === undefined) return { ok: false, displaced: [] };

  if (table[slot] !== undefined && !alwaysEquip) return { ok: false, displaced: [] };

  const displaced: Item[] = [];
  const takeOff = (s: Slot): void => {
    const old = table[s];
    if (old !== undefined) {
      old.equippedSlot = undefined;
      delete table[s];
      displaced.push(old);
    }
  };

  // Hand exclusivity: a two-hander takes both hands; a shield or left-only item removes a two-hander in the right hand.
  if (item.hands === "both") {
    takeOff("LeftHand");
    takeOff("RightHand");
  }
  if (item.hands === "leftOnly" && table.RightHand !== undefined && table.RightHand.hands === "both") {
    takeOff("RightHand");
  }

  takeOff(slot);
  table[slot] = item;
  item.equippedSlot = slot;
  return { ok: true, displaced };
}

// Smoke check (not a test): a kite shield is replaced by a two-handed war axe, and the shield comes back as displaced.
const t: Table = {};
const shield: Item = { name: "kite shield", slot: "none", hands: "leftOnly" };
const axe: Item = { name: "war axe", slot: "none", hands: "both" };
equip(t, shield);
const r = equip(t, axe);
const ok: boolean = r.ok && r.displaced.length === 1 && r.displaced[0] === shield
  && t.LeftHand === undefined && t.RightHand === axe;
void ok;
