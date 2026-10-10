// Licence: BSD 3-Clause (donor). Written fresh from the mechanism, not a translation of the donor lines.
export type Crit = "success" | "failure" | null;

export interface Fighter {
  abilityBonus: number; // the attack ability's bonus (donor default 1, rules.py 125)
  bodyArmour: number;   // body armour value; 1 when there is no body armour (equipment.py 148)
  shield: number;       // shield bonus; 0 when none (equipment.py 150)
  helmet: number;       // helmet bonus; 0 when none (equipment.py 151)
}

export interface AttackResult {
  hit: boolean;
  crit: Crit;  // natural 20 = success, natural 1 = failure (rules.py 127-130); flags only
  roll: number;
}

// Defence = sum of the armour parts + 10 (rules.py 190; unarmoured = 11).
export function defence(t: Fighter): number {
  return t.bodyArmour + t.shield + t.helmet + 10;
}

// One d20. Advantage keeps the higher of two, disadvantage the lower; both together cancel (rules.py 82-88).
// rnd returns an integer 1..20.
export function d20(adv: boolean, dis: boolean, rnd: () => number): number {
  if ((!adv && !dis) || (adv && dis)) return rnd();
  const a = rnd();
  const b = rnd();
  return adv ? Math.max(a, b) : Math.min(a, b);
}

// Hit when roll + bonus is strictly above the defence (rules.py 155).
// The donor also adds an optional modifier argument, omitted here.
export function attack(att: Fighter, def: Fighter, adv: boolean, dis: boolean, rnd: () => number): AttackResult {
  const roll = d20(adv, dis, rnd);
  const crit: Crit = roll === 20 ? "success" : roll === 1 ? "failure" : null;
  const hit = roll + att.abilityBonus > defence(def);
  return { hit, crit, roll };
}

// Damage on a hit: roll the weapon dice; a critical success rolls them a second time and adds it.
// The ability bonus is not added (objects.py 241-250). A miss does no damage.
export function damageOnHit(res: AttackResult, rollWeaponDice: () => number): number {
  if (!res.hit) return 0;
  let dmg = rollWeaponDice();
  if (res.crit === "success") dmg += rollWeaponDice();
  return dmg;
}

// Weapon quality loss: only a critical failure on a miss costs one point (objects.py 259-262).
export function qualityAfter(res: AttackResult, quality: number): number {
  return !res.hit && res.crit === "failure" ? quality - 1 : quality;
}
export {};
