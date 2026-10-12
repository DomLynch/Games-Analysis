// Clean-room shape of exclusive equip groups (one armour per type, shield vs two-hand, one weapon) and weight-to-speed encumbrance.
type Kind = "armor" | "shield" | "weapon" | "trinket" | "accessory" | "consumable";
interface Def { kind: Kind; armorType?: number; handCount?: number; weightKg?: number; }
interface Inst { id: string; def: Def; equipped: boolean; }

// donor CharacterEquipmentUiState.cpp: armour unequips same armor typeID; a shield unequips shields and two-handed weapons;
// a weapon unequips all weapons, and shields only when the new weapon is two-handed; then the toggle flips.
function toggleEquip(items: Inst[], target: Inst): void {
  if (target.def.kind === "consumable" || target.def.kind === "accessory" || target.def.kind === "trinket") {
    target.equipped = !target.equipped; // donor: no exclusivity for these kinds
    return;
  }
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
