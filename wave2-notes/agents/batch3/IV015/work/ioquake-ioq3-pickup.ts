// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type Kind = "weapon" | "ammo" | "armor" | "health" | "holdable" | "powerup";

export interface PickupDef {
  kind: Kind;
  tag: string;            // weapon or ammo id, holdable id, or powerup id
  quantity: number;       // units given (weapon: ammo given on a first grab)
  overcharge: boolean;    // health pickups of 5 and 100 may go past max, up to 2x
  respawnS: number;       // seconds; per-class value (armor 25, health 35, ammo 40, holdable 60, powerup 120 in the donor)
  waitOverrideS?: number; // per-entity override, used when set
  jitterS: number;        // +/- seconds, float, applied before the clamp
  neverRespawn: boolean;  // explicit flag (donor used a 0 or -1 value; see the note)
  dropped: boolean;       // dropped items never respawn
}

export interface Player {
  hp: number;
  maxHp: number;
  armor: number;
  ammo: Record<string, number>;   // missing key = 0
  holdable: string | null;
  powerups: Record<string, number>; // absolute time in ms, as the donor stores it
}

const AMMO_CAP = 200;

// The same predicate runs on the client (prediction) and the server, so a refused pickup stays on the ground.
export function canGrab(def: PickupDef, p: Player): boolean {
  switch (def.kind) {
    case "weapon":
    case "powerup":
      return true;
    case "ammo":
      return (p.ammo[def.tag] ?? 0) < AMMO_CAP;
    case "armor":
      return p.armor < p.maxHp * 2;
    case "health":
      return def.overcharge ? p.hp < p.maxHp * 2 : p.hp < p.maxHp;
    case "holdable":
      return p.holdable === null; // one holdable at a time: a second one is refused, not swapped
  }
}

// Returns the amount actually added. fullWeaponAmmo is true for dropped weapons and team games.
export function applyPickup(def: PickupDef, p: Player, fullWeaponAmmo: boolean): number {
  switch (def.kind) {
    case "health": {
      p.hp = Math.min(p.hp + def.quantity, def.overcharge ? p.maxHp * 2 : p.maxHp);
      return def.quantity;
    }
    case "armor": {
      p.armor = Math.min(p.armor + def.quantity, p.maxHp * 2);
      return def.quantity;
    }
    case "ammo": {
      const before = p.ammo[def.tag] ?? 0;
      p.ammo[def.tag] = Math.min(AMMO_CAP, before + def.quantity);
      return p.ammo[def.tag] - before;
    }
    case "weapon": {
      // Already owned: top up to the pickup quantity if below it, otherwise one shot.
      const owned = p.ammo[def.tag] ?? 0;
      const gain = fullWeaponAmmo ? def.quantity : owned < def.quantity ? def.quantity - owned : 1;
      p.ammo[def.tag] = Math.min(AMMO_CAP, owned + gain);
      return p.ammo[def.tag] - owned;
    }
    case "holdable": {
      p.holdable = def.tag;
      return 1;
    }
    case "powerup":
      return 0; // timers are handled by grantPowerup
  }
}

// Seconds until the item is back. -1 means never. Dropped items and neverRespawn items do not come back.
// 0 is a valid delay: the caller has already consumed the item before scheduling.
export function respawnDelayS(def: PickupDef, rand: () => number): number {
  if (def.dropped || def.neverRespawn) return -1;
  let s = def.waitOverrideS !== undefined ? def.waitOverrideS : def.respawnS;
  if (def.jitterS > 0) {
    s = Math.max(1, s + rand() * def.jitterS); // rand() in [-1, 1); the fraction is kept
  }
  return s;
}

// Powerups add time to the stored value. A new timer starts on a whole second, so timers stay in step.
export function grantPowerup(p: Player, tag: string, nowMs: number, seconds: number): void {
  if (!p.powerups[tag]) {
    p.powerups[tag] = nowMs - (nowMs % 1000);
  }
  p.powerups[tag] += seconds * 1000;
}
export {};
