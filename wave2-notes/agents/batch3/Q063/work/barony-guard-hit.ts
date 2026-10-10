// Clean-room sketch: guarded and unguarded armour, skill damage band, full-charge multiplier.
// Shape only, written from the described mechanism; donor licence BSD-2-Clause (Turning Wheel LLC). Not a line-by-line translation.

export type Rng = () => number; // uniform in [0, 1)

// Share of the attack that armour may remove: 1.0 while guarding, else 0.75 + 0.025 per net blessing, clamped to 0..1.
export function armourEffectiveness(guarding: boolean, blessings: number): number {
  if (guarding) return 1.0;
  return Math.max(0, Math.min(1, 0.75 + 0.025 * blessings));
}

// Damage after armour: max(attack - armour, (1 - e) * attack), truncated.
// Same result as max(0, attack*e - armour) + (1 - e)*attack.
export function afterArmour(attack: number, armour: number, e: number): number {
  return Math.trunc(Math.max(attack - armour, (1 - e) * attack));
}

// A hit that is not fully blocked does at least 1 damage; a fully blocked hit can do 0.
export function floorDamage(dmg: number, e: number): number {
  return e < 0.99 ? Math.max(1, dmg) : Math.max(0, dmg);
}

// Skill band: base - variance/2 + skill/2 + a roll in 0..variance, as a percent, capped at 100.
export function skillScale(skill: number, base: number, variance: number, rnd: Rng): number {
  const roll = base - variance / 2 + skill / 2 + Math.floor(rnd() * (variance + 1));
  return Math.min(roll / 100, 1.0);
}

// Full charge (at or above max) doubles the swing; charge is capped at 2x.
export function chargeMultiplier(charge: number, maxCharge: number): number {
  const half = Math.trunc(maxCharge / 2);
  return Math.min(2, Math.trunc(Math.max(charge, half) / half));
}

export interface HitInput {
  attack: number;          // attack value before armour
  armour: number;          // defender's armour value
  guarding: boolean;
  blessings: number;       // net blessing count from worn gear
  flatBonus: number;       // added after the armour floor (e.g. a backstab bonus); 0 if none
  skill: number;           // attacker's skill with this weapon class, 0..100
  skillBase: number;       // 50 for weapons, 45 for unarmed
  skillVariance: number;   // 20 for weapons, 30 for unarmed
  charge: number;
  maxCharge: number;
}

export function resolveHit(h: HitInput, rnd: Rng): number {
  const e = armourEffectiveness(h.guarding, h.blessings);
  let dmg = afterArmour(h.attack, h.armour, e);   // armour first
  dmg = floorDamage(dmg, e);                       // minimum for unguarded hits
  dmg += h.flatBonus;                              // flat bonuses after the floor
  const s = skillScale(h.skill, h.skillBase, h.skillVariance, rnd);
  dmg = dmg - Math.trunc((1 - s) * dmg);           // skill band scales the whole hit
  dmg = Math.trunc(dmg * chargeMultiplier(h.charge, h.maxCharge)); // charge last
  return Math.max(0, dmg);
}
export {};
