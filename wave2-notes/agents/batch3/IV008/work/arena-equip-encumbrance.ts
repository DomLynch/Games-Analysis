// Clean-room shape of exclusive equip groups (one armour per type, shield vs two-hand, one weapon) and weight-to-speed encumbrance.
type Kind = "armor" | "shield" | "weapon" | "trinket" | "accessory" | "consumable";
interface Def { kind: Kind; armorType?: number; handCount?: number; weightKg?: number; equippable?: boolean; typeId?: number; }
interface Inst { id: string; def: Def; equipped: boolean; }

// donor CharacterEquipmentUiState.cpp: armour unequips same armor typeID; a shield unequips shields and two-handed weapons;
// a weapon unequips all weapons, and shields only when the new weapon is two-handed; then the toggle flips.
// Returns false when the donor would refuse (not equippable, forbidden by class, or a same-typeId accessory or trinket already worn).
function toggleEquip(items: Inst[], target: Inst, classAllows: (d: Def) => boolean): boolean {
  if (target.def.equippable === false) return false; // donor gate 1: item not equippable
  if (!classAllows(target.def)) return false; // donor gate 2: forbidden by class
  if (target.def.kind === "accessory" || target.def.kind === "trinket") {
    // donor gate 3 (CharacterEquipmentUiState.cpp ~60-105): refuse when another equipped item of the same kind has the same typeId
    const clash = items.some((it) => it !== target && it.equipped && it.def.kind === target.def.kind && it.def.typeId === target.def.typeId);
    if (clash) return false;
    target.equipped = !target.equipped;
    return true;
  }
  if (target.def.kind === "consumable") return false;
  const unequip = (pred: (d: Def) => boolean): void => {
    for (const it of items) if (it !== target && it.equipped && pred(it.def)) it.equipped = false;
  };
  const prev = target.equipped;
  switch (target.def.kind) {
    case "armor":
      unequip((d) => d.kind === "armor" && d.armorType === target.def.armorType);
      break;
    case "shield":
      unequip((d) => d.kind === "shield" || (d.kind === "weapon" && d.handCount === 2));
      break;
    case "weapon": {
      const twoHanded = target.def.handCount === 2;
      unequip((d) => d.kind === "weapon" || (twoHanded && d.kind === "shield"));
      break;
    }
    default:
      break;
  }
  target.equipped = !prev;
  return true;
}

// donor Player.cpp:684-688 and ArenaPlayerUtils.cpp:15-18, 78-81: maxKg = strength*2; load 0..256; integer speed math
const UNITS = 256;
function encumberedSpeed(speedAttr: number, strength: number, carriedKg: number): number {
  const maxKg = strength * 2;
  // fix: donor divides by maxKg with no guard; guard the zero-capacity case
  const mod = maxKg <= 0 ? UNITS : Math.min(UNITS, Math.max(0, Math.round((carriedKg / maxKg) * UNITS)));
  return Math.floor((Math.floor((speedAttr * 20) / UNITS) * (UNITS - mod)) / UNITS) + 20;
}

export {};
