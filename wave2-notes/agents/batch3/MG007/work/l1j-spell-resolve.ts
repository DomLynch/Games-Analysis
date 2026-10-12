// Licence: GPL-2.0 (donor). clean-room, shape only.
// clean-room

// 1. Status (mind, slow, stun, blind, entangle) land chance, percent 0..90, then one roll 1..100.
interface StatusSpell { probValue: number; probDice: number; }
interface StatusTarget { mr: number; resistStatus: number; }   // resistStatus: the per-status resist for this effect

function statusLandChance(sp: StatusSpell, attackerLevel: number, defenderLevel: number,
                          hitBonus: number, t: StatusTarget): number {
  const gap = attackerLevel - defenderLevel;
  let p = sp.probValue + Math.trunc((sp.probDice / 10) * Math.trunc(gap / 2));  // donor: gap/2 is integer division first
  p += 2 * hitBonus;                                            // player attackers only in the donor
  p -= t.resistStatus;                                          // per-status resist (player targets only in the donor)
  return Math.min(p, 90);                                       // donor cap; note the donor also caps 100-value skills at 90
}

function landed(chance: number, roll1to100: number): boolean {
  return chance >= roll1to100;                                  // donor: probability >= rnd, rnd in 1..100
}

// 2. Damage pipeline for one spell hit, in donor order (before the MR step).
function spellDamage(rolls: number[], value: number, weaponAdd: number, intelligence: number,
                     attrResist: number, weakMul: number, crit: boolean, levelOk: boolean,
                     flat: number, leverageTenths: number): number {
  let d = rolls.reduce((a, b) => a + b, 0) + value + weaponAdd;
  const intAdj = Math.max(intelligence - 12, 1);                // donor floors the INT term at 1 (INT 12 and 13 both give 1)
  const coef = Math.max(1 - attrResist + intAdj * 3 / 32, 0);
  d = Math.trunc(d * coef);
  d = Math.trunc(d * weakMul);                                  // 1.2 on a weak-element NPC (donor, PC to NPC only)
  if (crit && levelOk) d = Math.trunc(d * 1.5);                 // low-level skills only, donor
  d += flat;
  return Math.trunc(d * leverageTenths / 10);
}

// 3. Magic resist: percentage reduction, floored, two bands. Fixed: no integer division on the MR terms.
function mrFactor(mr: number, hit: number): number {
  if (mr <= 100) return 1 - 0.01 * Math.floor((mr - hit) / 2);
  return 0.6 - 0.01 * Math.floor((mr - hit) / 10);
}

// Attribute (element) resist: fixed to r/100 without the 1/32 quantisation of the donor.
function attrFactor(resist: number): number {
  return resist / 100;
}

export {};
