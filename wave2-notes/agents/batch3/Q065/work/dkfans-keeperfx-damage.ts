// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Defender {
  health: number;
  armour: number;           // effective armour 0..255, already buffed and modified by the caller
  preventDamage: boolean;   // true = takes no damage at all
  lastDamagedTurn: number;
  killedBy: number | null;  // first player whose hit left the defender below zero
}

// Hit roll for an attack shot. Chance is centred on 128 of 256 and moved by
// (shot dexterity - defence) / 2, clamped to +-96.
function rollHit(shotDexterity: number, defence: number, roll256: number): boolean {
  let hitChance = Math.trunc((shotDexterity - defence) / 2);
  hitChance = Math.min(96, Math.max(-96, hitChance));
  return roll256 < 128 + hitChance;
}

// Melee blow: strength, doubled when a 0..99 roll falls under the luck percentage.
function meleeBlow(strength: number, luckPercent: number, roll100: number): number {
  return roll100 < Math.min(100, luckPercent) ? strength * 2 : strength;
}

// One damage application. Order: no-op checks, prevent flag, armour soak with a
// minimum of 1, health loss, then kill credit on the lethal hit.
function applyDamage(d: Defender, raw: number, attackerPlayer: number | null, gameTurn: number): number {
  if (raw <= 0) return 0;
  if (d.health < 0) return 0;          // already dead
  if (d.preventDamage) return 0;
  const armour = Math.min(255, Math.max(0, d.armour));
  let dealt = Math.floor((raw * (256 - armour)) / 256);
  if (dealt <= 0) dealt = 1;           // a landed hit always does at least 1
  d.health -= dealt;
  d.lastDamagedTurn = gameTurn + 1;
  if (d.health < 0 && d.killedBy === null && attackerPlayer !== null) {
    d.killedBy = attackerPlayer;
  }
  return dealt;
}

export {};
