// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

export interface ResistInput {
  targetLevel: number;
  casterLevel: number;
  resistDifficulty: number; // per-spell data field
  targetResist: number;     // the target's resist for this damage or effect type
  charismaMod: number;      // signed; charm, mesmerise and fear only (computed by the caller)
  minResist: number;        // per-spell cap, 0 = none
  maxResist: number;        // per-spell cap, 0 = none
  partialAllowed: boolean;  // damage spells only in the donor
}

// Signed level term: (difference squared) / 2, negative when the target is below the caster.
export function levelMod(targetLevel: number, casterLevel: number): number {
  const diff = targetLevel - casterLevel;
  const m = Math.trunc((diff * diff) / 2);
  return diff < 0 ? -m : m;
}

// Resist chance on a 0..200 scale, clamped to the spell's min and max when those are set.
export function resistChance(i: ResistInput): number {
  let chance = levelMod(i.targetLevel, i.casterLevel) + i.resistDifficulty + i.charismaMod + i.targetResist;
  if (i.maxResist !== 0 && chance > i.maxResist) chance = i.maxResist;
  if (i.minResist !== 0 && chance < i.minResist) chance = i.minResist;
  return chance;
}

// Effect strength in percent: 100 = full, 0 = fully resisted, in between = partial (damage spells only).
// roll is the caller's uniform integer in 0..200. Above the chance the spell lands in full.
export function effectPercent(chance: number, roll: number, partialAllowed: boolean): number {
  if (roll > chance) return 100;
  if (!partialAllowed) return 0;
  const c = Math.max(chance, 1);
  const partial = Math.trunc((150 * (c - roll)) / c);
  if (partial <= 0) return 100;
  if (partial >= 100) return 0;
  return 100 - partial;
}

export interface ChannelInput {
  isClient: boolean;
  channelingSkill: number;     // client skill, 0..252 in the donor's comment
  meleeHitsWhileCasting: number;
  dxFromCastPoint: number;     // signed: current x minus the x where the cast started
  dyFromCastPoint: number;     // signed: current y minus the y where the cast started
  uninterruptable: boolean;
}

// Checked once, when the cast timer ends. Returns true when the cast keeps going.
// Interrupts when the roll (0..100) is above the chance. Melee hits are capped at 15.
export function keepsConcentration(p: ChannelInput, rollPct: number): boolean {
  if (p.uninterruptable) return true;
  const hits = Math.min(p.meleeHitsWhileCasting, 15);
  let chance = p.isClient ? 30 + (p.channelingSkill / 400) * 100 - hits * 2 : 85 - hits;
  const dx = Math.abs(p.dxFromCastPoint);
  const dy = Math.abs(p.dyFromCastPoint);
  if (dx !== 0 || dy !== 0) {
    if (dx < 5 && dy < 5) chance -= (dx * dx + dy * dy) * 25;
    else chance = 0;
  }
  return !(rollPct > chance);
}

export {};
