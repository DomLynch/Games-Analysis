// Licence: copyleft (GPL-3.0, donor LICENSE). Clean-room sketch of the described shape, not a translation.
// clean-room
export interface Target {
  health: number;
  shield: number;     // absorbs damage first
  armor: number;      // flat reduction per hit
  maxHealth: number;
  killable: boolean;
}

export interface HitRules {
  minArmorFraction: number;   // armour never removes more than (1 - this) of a hit
  maxDamageFraction: number;  // per-hit cap as a share of max health; <= 0 means no cap
  pierceArmor: boolean;
}

// Armour: a flat reduction with a floor, so armour never zeroes a hit.
export function applyArmor(damage: number, armor: number, minFraction: number): number {
  return Math.max(damage - armor, minFraction * damage);
}

// Splash: full damage at the centre, falling to 40% at the edge of the radius.
export function splashAmount(dist: number, radius: number, damage: number, edgeFloor = 0.4): number {
  if (radius <= 0.00001) return damage;
  const t = 1 - dist / radius;             // 1 at centre, 0 at edge
  const scaled = t + (1 - t) * edgeFloor;  // lerp from t toward 1 by edgeFloor
  return damage * scaled;
}

// One hit on one target: optional cap, then armour (unless pierced), then shield, then health.
// Returns the health lost.
export function applyHit(t: Target, raw: number, rules: HitRules): number {
  let damage = raw;
  if (rules.maxDamageFraction > 0) {
    damage = Math.min(damage, t.maxHealth * rules.maxDamageFraction + t.shield);
  }
  const amount = rules.pierceArmor ? damage : applyArmor(damage, t.armor, rules.minArmorFraction);
  const toShield = Math.min(Math.max(t.shield, 0), amount);
  t.shield -= toShield;
  const toHealth = amount - toShield;
  if (toHealth > 0 && t.killable) t.health -= toHealth;
  return toHealth > 0 ? toHealth : 0;
}

export {};
