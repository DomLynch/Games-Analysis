// Licence: AGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Piece { maxCond: number; dmg: number; }

// Condition damage one hit adds to the piece at the hit location: 0.2 of the damage that got past the armour.
export function hitWear(damageAfterArmour: number): number {
  return damageAfterArmour * 0.2;
}

// Adds wear. A non-destroying hit stops at max - 1 (the piece is not disabled by a normal hit).
export function applyWear(p: Piece, wear: number, destroy: boolean): void {
  let nd = p.dmg + wear;
  if (!destroy && nd >= p.maxCond) nd = p.maxCond - 1;
  p.dmg = nd;
}

export function isBroken(p: Piece): boolean {
  return p.maxCond < 2 || p.dmg >= p.maxCond;
}

// Armour value left after wear: nothing lost below 75% damage, then a linear ramp to half
// the value at full damage. A broken piece keeps half the value.
export function armourAfterWear(value: number, p: Piece): number {
  if (isBroken(p)) return value - 0.5 * value;
  const ratio = (p.dmg / p.maxCond) * 100;
  if (ratio < 75) return value;
  const reduction = (ratio - 75) / 50; // 0 .. 0.5
  return value - reduction * value;
}

export interface RepairInput {
  roll: number;          // 0..100 luck roll
  hasProfession: boolean;
  skillMods: number;     // summed repair skill modifiers
  toolQuality: number;   // 0..100
  nearStation: boolean;
  shockWounds: number;
  complexity: number;
}

// Repair chance (0..100). Order as in the donor: roll, bonuses, quality multiply (truncated to whole
// points), station, fatigue and complexity penalties, then the hard gates.
export function repairChance(i: RepairInput, maxCond: number): number {
  let c = i.roll;
  if (i.hasProfession) c += 35;
  c += i.skillMods;
  const quality = 1 - ((100 - i.toolQuality) / 2) / 100;
  c = Math.trunc(c * quality);
  if (i.nearStation) c += 15;
  c -= Math.trunc(i.shockWounds / 2);
  c -= Math.trunc(i.complexity / 3);
  if (maxCond < 20 || i.roll < 5) c = 0;
  if (i.roll > 95) c = 100;
  return c;
}

// Outcome: damage is always cleared; the cap (max condition) is what the repair costs.
export function repairOutcome(p: Piece, chance: number): void {
  if (chance < 25) p.maxCond = 1;
  else if (chance < 50) p.maxCond = Math.trunc(p.maxCond * 0.65);
  else if (chance < 75) p.maxCond = Math.trunc(p.maxCond * 0.8);
  else p.maxCond = Math.trunc(p.maxCond * 0.95);
  p.dmg = 0;
}

// Weapon use decay: one condition point with a small chance per action (more with a powerup).
export function weaponDecayTick(roll: number, powerup: boolean): boolean {
  const chance = powerup ? 15 : 5;
  return roll < chance;
}

export {};
