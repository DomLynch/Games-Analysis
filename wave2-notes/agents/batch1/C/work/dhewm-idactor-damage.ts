// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Actor {
  health: number;
  takeDamage: boolean;
  floor: number | null;      // optional health floor (null = off)
  zoneScale: number[];       // one multiplier per hit zone, default 1
}

type Outcome =
  | { kind: "none" }
  | { kind: "knockbackReset" }
  | { kind: "pain"; damage: number }
  | { kind: "killed"; damage: number; gib: boolean };

// One hit. zone < 0 or out of range means "no zone": the damage is left unscaled.
function resolveHit(a: Actor, baseDamage: number, callerScale: number, zone: number, gibAllowed: boolean): Outcome {
  if (!a.takeDamage) return { kind: "none" };

  let damage = Math.trunc(baseDamage * callerScale);      // caller scale, truncated to int
  if (zone >= 0 && zone < a.zoneScale.length) {
    damage = Math.ceil(damage * a.zoneScale[zone]);       // zone scale, rounded up
  }

  if (damage <= 0) return { kind: "knockbackReset" };

  a.health -= damage;
  if (a.floor !== null && a.health < a.floor) a.health = a.floor;   // floor applies before the death test

  if (a.health <= 0) {
    if (a.health < -999) a.health = -999;
    const gib = a.health < -20 && gibAllowed;
    return { kind: "killed", damage, gib };
  }
  return { kind: "pain", damage };
}
