// Licence: MIT (donor, adaptable). Adapted shape of the donor's melee hit roll and damage terms; constants are placeholders, not copied values.
export interface Rng {
  // uniform integer in [0, exclusiveMax)
  next(exclusiveMax: number): number;
}

export interface Fighter {
  level: number;
  hitBonus: number;       // from agility, to-hit side
  defenceBonus: number;   // from agility, defence side
}

// Donor scale: value * 256 / 100, truncated toward zero.
const toScale256 = (v: number): number => Math.trunc((v * 256) / 100);

// Chance on a 0..256 scale. Base 128 (50 percent), level gap term, bonus difference,
// then the larger of that and a floor that grows with the attacker's level.
export function meleeHitChance(attacker: Fighter, defender: Fighter): number {
  const gap = attacker.level - defender.level;
  const chance = 128 + toScale256(gap * 5) + (attacker.hitBonus - defender.defenceBonus);
  const floor = toScale256(attacker.level) + 51;
  return Math.max(chance, floor); // 256 or more always hits
}

export function meleeHit(attacker: Fighter, defender: Fighter, rng: Rng): boolean {
  return rng.next(256) < meleeHitChance(attacker, defender);
}

// Agility bonus: -1 at 45 or lower, 0 at 46, otherwise (agility - 50) / 5 truncated.
export function agilityBonus(agility: number): number {
  if (agility <= 45) return -1;
  if (agility <= 46) return 0;
  return Math.trunc((agility - 50) / 5);
}

// Strength damage bonus: 0 at 43 or lower, otherwise (strength - 48) / 5 truncated.
export function strengthDamageBonus(strength: number): number {
  return strength <= 43 ? 0 : Math.trunc((strength - 48) / 5);
}

export function meleeDamage(weaponMin: number, weaponMax: number, strength: number, rng: Rng): number {
  return weaponMin + rng.next(weaponMax - weaponMin + 1) + strengthDamageBonus(strength);
}

export {};
