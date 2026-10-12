// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface CasterStats {
  intel: number;          // INT
  skillPower: number;     // donor units: average discipline skill x 200, plus SpellCasting x 50
  armourPenalty: number;  // body armour + shield penalty, integer points
}

const DIFFICULTY_BY_LEVEL = [0, 3, 15, 35, 70, 100, 150, 200, 260, 340]; // index = spell level

// Raw failure chance, 0..100, before the roll. Integer maths as in the donor.
export function rawFail(c: CasterStats, spellLevel: number): number {
  let chance = 60;
  chance -= Math.trunc((c.skillPower * 6) / 100);
  chance -= c.intel * 2;
  chance += c.armourPenalty;
  chance += DIFFICULTY_BY_LEVEL[spellLevel];
  chance = Math.min(chance, 400);
  // Smoothing cubic (x^3 + 426x^2 + 82670x + 7245398) / 262144, written in Horner form.
  const poly = Math.trunc((((chance + 426) * chance + 82670) * chance + 7245398) / 262144);
  return Math.min(Math.max(poly, 0), 100);
}

// Spell power: skill x INT / 10, then a log step-down above 50 (donor works in millis here), then the spell cap.
export function castPower(c: CasterStats, cap: number): number {
  const power = Math.trunc((c.skillPower * c.intel) / 10);
  const base = power * 10;
  const STEP = 50000;
  const CEILING = 200000;
  const stepped = base < STEP ? base : Math.min(STEP * Math.log2(1 + base / STEP), CEILING);
  const out = Math.trunc(Math.trunc(stepped) / 1000);
  return cap > 0 ? Math.min(out, cap) : out;
}

// Miscast damage: none below a threshold, else level x (fail + level) / 9, rounded up.
export function miscastDamage(spellLevel: number, fail: number): number {
  if (spellLevel * spellLevel * fail <= 150) return 0;
  return Math.ceil((spellLevel * (fail + spellLevel)) / 9);
}

// The roll: average of three dice (100, 101, 101) with integer division by 3, so it sits near 50.
// The cast fails only when the roll is below the raw failure chance.
export function failValue(fail: number, rand: (max: number) => number): number {
  const roll = Math.trunc((rand(100) + rand(101) + rand(101)) / 3);
  return roll < fail ? fail - roll : 0;
}

// Order of operations: MP is paid before the roll. A failed roll still spends the MP and triggers a miscast.
export function castSpell(
  mp: number,
  cost: number,
  c: CasterStats,
  spellLevel: number,
  rand: (max: number) => number,
): { mp: number; ok: boolean; miscast: number } {
  const after = mp - cost;
  const fail = rawFail(c, spellLevel);
  if (failValue(fail, rand) === 0) return { mp: after, ok: true, miscast: 0 };
  return { mp: after, ok: false, miscast: miscastDamage(spellLevel, fail) };
}

export {};
