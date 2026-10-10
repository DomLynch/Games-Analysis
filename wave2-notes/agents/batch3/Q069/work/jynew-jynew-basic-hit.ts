// Licence: restricted (donor header says MIT; top-level LICENSE does not permit use). Clean-room sketch of the described shape, not a translation.
// clean-room
export interface Fighter {
  attack: number;   // total attack after weapon, armour, skill and team terms
  defence: number;  // total defence after armour and team terms
  stamina: number;  // used in the positive-hit bonus
  injury: number;   // accumulated injury (0..max)
  energy: number;   // inner energy now
}

export interface BasicHit { damage: number; injuryGain: number; }

// Integer floor division, like Lua's // operator.
const fdiv = (a: number, b: number): number => Math.floor(a / b);

// Uniform integer in [lo, hi], inclusive.
const randInt = (lo: number, hi: number): number => lo + Math.floor(Math.random() * (hi - lo + 1));

export function resolveBasicHit(a: Fighter, d: Fighter, gridDistance: number, energyCost: number): BasicHit {
  // Out of energy: a weak hit with no injury.
  if (a.energy <= energyCost) return { damage: 1 + randInt(0, 9), injuryGain: 0 };

  // Main formula, then the chip rule when it is not positive.
  let v = fdiv((a.attack - d.defence * 3) * 2, 3) + randInt(0, 19) - randInt(0, 19);
  if (v <= 0) v = fdiv(a.attack, 10) + randInt(0, 3) - randInt(0, 3);

  // Only a positive hit gets the stamina and injury bonuses.
  if (v <= 0) v = 0;
  else v = v + fdiv(a.stamina, 15) + fdiv(d.injury, 20);

  // Distance falloff: 100% at 1 step, -3 points per step up to 10 steps; beyond 10 steps, 2/3.
  v = gridDistance <= 10 ? fdiv(v * (100 - (gridDistance - 1) * 3), 100) : fdiv(v * 2, 3);

  // Minimum damage of one.
  if (v < 1) v = 1;

  return { damage: v, injuryGain: fdiv(v, 10) };
}

export {};
