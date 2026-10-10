// Licence: Valve (Half-Life 1 SDK LICENSE: free for modified Valve games; commercial use needs Valve's permission). Restricted: clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface Pack {
  ammo: Record<string, number>;     // reserve per ammo type
  carry: Record<string, number>;    // cap per ammo type (donor: *_MAX_CARRY)
  weapons: { id: string; slot: number; ammo?: string }[]; // owned, newest first in each slot
}

interface WeaponDef {
  id: string;
  slot: number;
  ammo?: string;
  defaultReserve: number;           // ammo the spare copy brings with it
  limitInWorld: boolean;            // donor ITEM_FLAG_LIMITINWORLD
}

const RESPAWN_S = { item: 30, weapon: 20, ammo: 20 }; // donor multiplay defines; zone data in Frankendom
const ENTITY_RESERVE = 100;                           // donor ENTITY_INTOLERANCE

// Reserve gate (donor CanHaveAmmo): room only while below the cap.
function canHaveAmmo(p: Pack, type: string): boolean {
  return (p.ammo[type] ?? 0) < (p.carry[type] ?? 0);
}

// Clamp to the cap (donor GiveAmmo: add = min(count, cap - have)). Returns the amount added.
function giveAmmo(p: Pack, type: string, count: number): number {
  if (!canHaveAmmo(p, type)) return 0;
  const add = Math.min(count, p.carry[type] - (p.ammo[type] ?? 0));
  if (add < 1) return 0;
  p.ammo[type] = (p.ammo[type] ?? 0) + add;
  return add;
}

// Pickup gate (donor CanHavePlayerItem, base rule plus the weaponstay rule).
function canTakeWeapon(p: Pack, def: WeaponDef, alive: boolean, weaponStay: boolean): boolean {
  if (!alive) return false;
  const owned = p.weapons.some(w => w.id === def.id);
  if (weaponStay && !def.limitInWorld && owned) return false;
  if (def.ammo) return canHaveAmmo(p, def.ammo) || !owned;
  return !owned;
}

// Take a weapon. A second copy is not attached: its ammo goes to the owned weapon (donor AddPlayerItem + ExtractAmmo).
function takeWeapon(p: Pack, def: WeaponDef, alive: boolean, weaponStay: boolean): "attached" | "converted" | "refused" {
  if (!canTakeWeapon(p, def, alive, weaponStay)) return "refused";
  if (p.weapons.some(w => w.id === def.id)) {
    if (def.ammo) giveAmmo(p, def.ammo, def.defaultReserve);
    return "converted";
  }
  p.weapons.unshift({ id: def.id, slot: def.slot, ammo: def.ammo });
  return "attached";
}

// Next spawn time after a take (donor Respawn -> FlWeaponRespawnTime / FlItemRespawnTime / FlAmmoRespawnTime).
function nextSpawnAt(now: number, kind: keyof typeof RESPAWN_S): number {
  return now + RESPAWN_S[kind];
}

// Entity-budget check for LIMITINWORLD weapons (donor FlWeaponTryRespawn): spawn now if the world has room, else wait one weapon period.
function tryRespawnAt(now: number, limitInWorld: boolean, liveEntities: number, entityMax: number): number {
  if (!limitInWorld) return now;
  if (liveEntities < entityMax - ENTITY_RESERVE) return now;
  return nextSpawnAt(now, "weapon");
}

export {};
