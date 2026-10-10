// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Unit {
  body: number;   // hit points left
  shield: number; // shield points, drained before body
  armour: number; // flat armour for this damage class
  level: number;  // effective experience level (0 = none)
}

export interface Shot {
  raw: number;          // damage after the weapon and target multipliers
  minDamagePct: number; // floor as a percent of the post-level damage
}

// Experience accuracy: attacker level raises the chance, defender level lowers it, both in steps of bonusPct.
export function hitChance(base: number, attackerLevel: number, targetLevel: number, bonusPct = 5): number {
  return base
    + Math.trunc(bonusPct * attackerLevel * base / 100)
    - Math.trunc(bonusPct * targetLevel * base / 100);
}

// rng() returns an integer in [0, 100). A shot hits when the roll is at or below the chance.
export function isHit(chance: number, rng: () => number): boolean {
  return rng() <= chance;
}

// Damage pipeline in the donor's order. A killing blow is decided before shields are touched.
export function applyDamage(u: Unit, shot: Shot, levelReducePct = 6): { dead: boolean; dealt: number } {
  let dmg = Math.trunc(shot.raw * (100 - levelReducePct * u.level) / 100);
  dmg = Math.max(dmg - u.armour, Math.trunc(dmg * shot.minDamagePct / 100));
  dmg = Math.max(dmg, 1);

  if (dmg >= u.body) {
    return { dead: true, dealt: dmg }; // body is left for the caller's death handler, as in the donor
  }
  if (u.shield > 0) {
    const absorbed = Math.min(u.shield, dmg);
    u.shield -= absorbed;
    dmg -= absorbed;
  }
  u.body -= dmg;
  return { dead: false, dealt: dmg };
}

export {};
