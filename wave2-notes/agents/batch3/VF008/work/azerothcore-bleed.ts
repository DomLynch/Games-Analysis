// Licence: GPL-2 (donor LICENSE file; Unit.cpp header: GPL v2 or any later version). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

interface Effect {
  periodic: boolean;   // periodic damage aura tick (vs direct hit)
  physical: boolean;   // physical school (armour applies to physical only)
  bleed: boolean;      // effect carries the bleed mechanic
}

// Armour applies to physical damage, except bleed ticks. A direct hit never gets the bleed
// exemption: the donor's direct call passes no effect index (Unit.cpp 1526, 2206-2223).
function armourApplies(e: Effect): boolean {
  if (!e.physical) return false;
  if (e.periodic && e.bleed) return false;
  return true;
}

// Mitigation from armour (Unit.cpp 2287-2299). Armour penetration (2236-2270) is not modelled.
function armourReduce(damage: number, armour: number, attackerLevel: number): number {
  const lvl = attackerLevel > 59 ? attackerLevel + 4.5 * (attackerLevel - 59) : attackerLevel;
  let f = (0.1 * Math.max(armour, 0)) / (8.5 * lvl + 40);
  f = f / (1 + f);
  f = Math.min(Math.max(f, 0), 0.75);
  return Math.ceil(Math.max(damage * (1 - f), 0));
}

// The bleeding state is set on the target when a spell's effects carry the bleed mechanic (SpellInfo.cpp 2038-2039).
function bleedsTarget(mechanics: string[]): boolean {
  return mechanics.includes('bleed');
}

// Crit chance for the finisher-type spell on a bleeding target (Unit.cpp 9089-9092).
// The bonus amount comes from a caster aura, so it is data.
function finisherCrit(baseCrit: number, targetBleeding: boolean, isFinisherSpell: boolean, bonusFromCasterAura: number): number {
  return isFinisherSpell && targetBleeding ? baseCrit + bonusFromCasterAura : baseCrit;
}

// Damage taken multiplier from mechanic auras on the target (Unit.cpp 10144-10155).
// Shred/Maul-style spells count as bleed for this check (10147-10149).
interface MechanicAura { mechanic: string; percent: number; }
function mechanicMultiplier(auras: MechanicAura[], spellMechanics: Set<string>): number {
  let m = 1;
  for (const a of auras) {
    if (spellMechanics.has(a.mechanic)) m *= (100 + a.percent) / 100;
  }
  return m;
}

export {};
