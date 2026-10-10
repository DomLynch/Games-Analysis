// Licence: AGPL-3.0 (donor). Clean-room sketch written from the described mechanism; not a translation of the donor lines.
// clean-room
const ARMOUR_K = 200 / 3;      // armour curve constant (engine constant)
const SKILL_FACTOR = 0.03;     // logistic steepness for attack-vs-defence checks (engine constant)

// Chance that attack beats defence: a logistic on (attack - defence).
function skillChance(skill: number, difficulty: number): number {
  const c = 1 - 1 / (1 + Math.exp(SKILL_FACTOR * (skill - difficulty)));
  return Math.min(1, Math.max(0, c));
}

// Rating r to multiplier: positive r gives (100+r)/100; negative r gives 100/(100-r).
function ratingMod(r: number): number {
  if (r === 0) return 1;
  return r > 0 ? (100 + r) / 100 : 100 / (100 - r);
}
// Multiplier back to a rating, so several multipliers can be summed as ratings.
function modToRating(m: number): number {
  return m >= 1 ? Math.round(m * 100 - 100) : Math.round(-100 / m + 100);
}
function additiveCombine(...mods: number[]): number {
  return ratingMod(mods.reduce((sum, m) => sum + modToRating(m), 0));
}

// Armour level to damage-taken multiplier: diminishing returns above zero, linear penalty below.
function armourMod(al: number): number {
  if (al > 0) return ARMOUR_K / (al + ARMOUR_K);
  if (al < 0) return 1 - al / ARMOUR_K;
  return 1;
}

interface Hit {
  minDmg: number; maxDmg: number;
  attackSkill: number; defenseSkill: number;
  preMod: number;                 // attribute x power x slayer, as one product
  attackerDamageRating: number;   // rating, converted with ratingMod
  recklessness: number; critDamageRating: number; sneak: number; heritage: number; // multipliers
  critChance: number; critMult: number;
  armourLevel: number; defenderDamageResistRating: number; shieldMod: number; resistMod: number;
}

// One hit, in the donor's order: evade roll, then base roll, crit, rating mods, armour, shield, resist.
function resolveHit(h: Hit, rand: () => number): { evaded: boolean; damage: number } {
  if (1 - skillChance(h.attackSkill, h.defenseSkill) > rand()) return { evaded: true, damage: 0 };

  const crit = h.critChance > rand();
  const base = crit ? h.maxDmg : h.minDmg + (h.maxDmg - h.minDmg) * rand();
  // A crit swaps recklessness for the crit damage rating; the crit multiplier applies to the whole hit.
  const ratingMul = crit
    ? additiveCombine(ratingMod(h.attackerDamageRating), h.critDamageRating, h.sneak, h.heritage)
    : additiveCombine(ratingMod(h.attackerDamageRating), h.recklessness, h.sneak, h.heritage);
  const before = base * h.preMod * (crit ? h.critMult : 1) * ratingMul;

  const taken = ratingMod(-h.defenderDamageResistRating);
  const damage = before * armourMod(h.armourLevel) * h.shieldMod * h.resistMod * taken;
  return { evaded: false, damage };
}

// Health step: round the mitigated damage, subtract it, and report death at zero or below.
function applyToHealth(health: number, damage: number): { health: number; dead: boolean } {
  const next = health - Math.round(damage);
  return { health: next, dead: next <= 0 };
}

export {};
