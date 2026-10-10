// Licence: GPL-2.0 (donor). Clean-room sketch written from the described mechanism; not a translation of the donor lines.
export interface Defender {
  evasion: number;      // scaled to whole points before the roll
  armour: number;       // armour points
  gdrPercent: number;   // general damage reduction, 0..100
}

export const AUTOMATIC_HIT = 1500;      // a margin this large is a sure hit
export const FORCED_BAND_PERCENT = 5;   // share of rolls forced to hit or miss (coin flip)

// rng(n) returns an integer in [0, n).
export function resolveHit(
  toLand: number, ev: number, randomiseEv: boolean, rng: (n: number) => number,
): { hit: boolean; margin: number } {
  if (toLand >= AUTOMATIC_HIT) return { hit: true, margin: AUTOMATIC_HIT };
  if (randomiseEv) {
    const span = Math.max(1, 2 * ev);
    ev = Math.floor((rng(span) + rng(span)) / 2); // stands in for the donor's two-roll average
  }
  let margin: number;
  if (rng(100) < FORCED_BAND_PERCENT) margin = (rng(2) ? 1 : -1) * AUTOMATIC_HIT;
  else margin = toLand - ev;
  return { hit: margin >= 0, margin };
}

// Monster weapon damage: one roll of the weapon range plus one roll of the attack's flat damage.
export function monsterDamage(weaponMax: number, attkDamage: number, rng: (n: number) => number): { dealt: number; max: number } {
  return { dealt: rng(weaponMax) + 1 + rng(attkDamage), max: weaponMax + attkDamage };
}

// Normal armour rule: a uniform soak from 0..ac, floored by general damage reduction, then subtracted.
export function applyArmour(damage: number, d: Defender, maxDamage: number, rng: (n: number) => number): number {
  const ac = Math.max(d.armour, 0);
  const gdrFloor = Math.min(Math.floor((d.gdrPercent * maxDamage) / 100), Math.round(ac / 2));
  const saved = Math.max(rng(1 + ac), gdrFloor);
  return Math.max(damage - saved, 0);
}

// One monster melee attack: to-hit margin first; damage and armour only on a hit.
export function monsterMelee(
  toLand: number, weaponMax: number, attkDamage: number, d: Defender, rng: (n: number) => number,
): { hit: boolean; margin: number; dealt: number } {
  const { hit, margin } = resolveHit(toLand, d.evasion, true, rng);
  if (!hit) return { hit, margin, dealt: 0 };
  const raw = monsterDamage(weaponMax, attkDamage, rng);
  return { hit, margin, dealt: applyArmour(raw.dealt, d, raw.max, rng) };
}

export {};
