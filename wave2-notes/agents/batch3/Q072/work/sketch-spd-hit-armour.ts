// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const INFINITE = 1_000_000; // a stat at or above this is treated as certain: evasion wins, or accuracy wins

// Armour (donor: NormalIntRange(0, level)): floor((u1 + u2) * (level + 1) / 2), so 0..level, peaked in the middle.
function armourRoll(level: number, rng: () => number): number {
  if (level <= 0) return 0;
  return Math.floor((rng() + rng()) * (level + 1) / 2);
}

// Hit check: an attacker roll uniform in [0, acc) must reach a defender roll uniform in [0, ev).
function hits(acc: number, ev: number, rng: () => number): boolean {
  if (ev >= INFINITE) return false;
  if (acc >= INFINITE) return true;
  return rng() * acc >= rng() * ev;
}

// Damage after the hit: armour is rolled first but subtracted last, flat, after the multipliers, never below 0.
function resolveDamage(baseRoll: number, mult: number, bonus: number, weakened: boolean,
                       armourLevel: number, vulnerable: boolean, rng: () => number): number {
  const dr = armourRoll(armourLevel, rng);
  let dmg = baseRoll * mult + bonus;
  if (weakened) dmg *= 0.67;
  let effective = Math.round(dmg);
  effective = Math.max(effective - dr, 0);
  if (vulnerable) effective = Math.trunc(effective * 1.33); // int compound assignment truncates
  return effective;
}

export {};
