// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Part = 'head' | 'torso' | 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg';

interface Fighter {
  health: number;
  maxHealth: number;
  energy: number;
  wounds: Record<Part, number>;   // fatal wounds per body part
  woundable: boolean;             // only some unit types can be wounded
  morale: number;
}

interface RollSource {
  int(min: number, max: number): number;   // inclusive on both ends, as the donor's RNG
}

// A hit that has already had armour subtracted. Returns the health lost.
function takeHit(f: Fighter, part: Part, power: number, rng: RollSource): number {
  if (power <= 0) return 0;
  f.health -= power;
  if (f.health < 0) f.health = 0;
  // chance to wound: a roll of 0..10 below the power (power 11 or more always wounds)
  if (f.woundable && rng.int(0, 10) < power) {
    f.wounds[part] += rng.int(1, 3);
  }
  // morale drops by the wounds the part carries
  if (f.wounds[part] > 0) f.morale -= f.wounds[part];
  return power;
}

// Each round: health falls by the total wound count.
function bleedRound(f: Fighter): void {
  const total = Object.values(f.wounds).reduce((a, b) => a + b, 0);
  f.health = Math.max(0, f.health - total);
}

// Firing accuracy: base from health, minus 10 per wound on the head and the weapon arm(s).
function accuracy(f: Fighter, weaponArm: 'leftArm' | 'rightArm', twoHanded: boolean): number {
  let wounds = f.wounds.head;
  wounds += twoHanded ? f.wounds.rightArm + f.wounds.leftArm : f.wounds[weaponArm];
  return Math.max(10, Math.trunc((25 * f.health) / f.maxHealth) + 75 - 10 * wounds);
}

// Time units recovered per turn: each leg wound removes 10 percent of the recovery.
function tuRecovery(base: number, f: Fighter): number {
  const legs = f.wounds.leftLeg + f.wounds.rightLeg;
  return base - Math.trunc((base * (legs * 10)) / 100);
}

// Energy recovered per turn: each torso wound removes 10 percent of current energy from the recovery.
function energyRecovery(f: Fighter, base: number, cap: number): number {
  const loss = Math.trunc((f.energy * (f.wounds.torso * 10)) / 100);
  return Math.max(0, Math.min(cap, f.energy + (base - loss)));
}

// A medical item heals one part's wounds and adds health (capped at max).
function heal(f: Fighter, part: Part, woundAmount: number, healthAmount: number): void {
  if (f.wounds[part] === 0) return;
  f.wounds[part] = Math.max(0, f.wounds[part] - woundAmount);
  f.health = Math.min(f.maxHealth, f.health + healthAmount);
}

export {};
