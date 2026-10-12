// Licence: GPL-3.0 (donor openmw). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

// Attribute ledger: modified = base - damage + modifier, floored at 0.
interface Attr { base: number; modifier: number; damage: number; }
function attrModified(a: Attr): number { return Math.max(0, a.base - a.damage + a.modifier); }

// Pool (health, magicka, fatigue): max is derived, current is the spendable ledger.
interface Pool { base: number; modifier: number; current: number; }
function poolMax(p: Pool): number { return Math.max(0, p.base + p.modifier); }

// Tired-body multiplier. Defaults: fFatigueBase 1.25, fFatigueMult 0.5 (opencs defaultgmsts).
const FATIGUE_BASE = 1.25;
const FATIGUE_MULT = 0.5;
function fatigueTerm(fatigue: Pool): number {
  const max = poolMax(fatigue);
  const normalised = Math.floor(max) === 0 ? 1 : Math.max(0, fatigue.current / max);
  return FATIGUE_BASE - FATIGUE_MULT * (1 - normalised);
}

// Defence term (donor combat 323-340): evasion counts only when the victim is not knocked down, paralysed or (player attacker) unaware;
// Chameleon and Invisibility add min(100, invisoMult x magnitude) each; everything is zero if the victim's fatigue is below 0.
interface VictimState { evasion: number; fatigueCurrent: number; knockedDown: boolean; paralysed: boolean; unaware: boolean; chameleon: number; invisibility: number; }
function defenceTerm(v: VictimState, invisoMult: number): number {
  if (v.fatigueCurrent < 0) return 0;
  let d = (v.knockedDown || v.paralysed || v.unaware) ? 0 : v.evasion;
  d += Math.min(100, invisoMult * v.chameleon);
  d += Math.min(100, invisoMult * v.invisibility);
  return d;
}

// Hit chance on a 0-100 scale: (skill + Agi/5 + Luck/10) x tired-body term, + fortify - blind, minus defence.
interface AttackInput { skill: number; agi: number; luck: number; fortifyAttack: number; blind: number; }
function hitChance(a: AttackInput, attackerFatigue: number, defenceEvasion: number): number {
  const attack = (a.skill + a.agi / 5 + a.luck / 10) * attackerFatigue + a.fortifyAttack - a.blind;
  return Math.round(attack - defenceEvasion);
}

// Strength scaling of damage: multiplier = 0.5 + Str x 0.1 x 0.1 (defaults fDamageStrengthBase 0.5, fDamageStrengthMult 0.1).
const DMG_STR_BASE = 0.5;
const DMG_STR_MULT = 0.1;
function strengthDamage(raw: number, strength: number): number {
  return raw * (DMG_STR_BASE + strength * DMG_STR_MULT * 0.1);
}

// Fatigue spent per swing: 2.0 + encumbrance x 0 + weight x attackStrength x 0.25 (defaults fFatigueAttackBase, fFatigueAttackMult, fWeaponFatigueMult).
const FATIGUE_ATTACK_BASE = 2.0;
const FATIGUE_ATTACK_MULT = 0.0;
const WEAPON_FATIGUE_MULT = 0.25;
function swingFatigueCost(encumbrance: number, weaponWeight: number, attackStrength: number): number {
  return FATIGUE_ATTACK_BASE + encumbrance * FATIGUE_ATTACK_MULT + weaponWeight * attackStrength * WEAPON_FATIGUE_MULT;
}

// Use-based skill progress. Requirement = (base + 1) x type factor (major 0.75, minor 1.0, misc 1.25), x 0.8 for own specialisation.
interface Skill { base: number; progress: number; }
const TYPE_FACTOR = { major: 0.75, minor: 1.0, misc: 1.25 };
const SPEC_FACTOR = 0.8;
function progressRequirement(skillBase: number, typeFactor: number, sameSpecialisation: boolean): number {
  return (skillBase + 1) * typeFactor * (sameSpecialisation ? SPEC_FACTOR : 1);
}
// simplified: donor sets progress to 0 on level-up (drops the overshoot); this sketch carries the excess (fix D1).
// Omits the donor's level-progress and attribute/specialisation counters, the jail branch and the werewolf exemption.
function useSkill(s: Skill, gain: number, requirement: number): void {
  if ((s.base >= 100 && gain > 0) || (s.base <= 0 && gain < 0)) return;
  s.progress += gain / requirement;
  if (s.progress >= 1) {
    s.base += 1;
    s.progress -= 1;
  }
}

// Cast chance on a 0-100 scale: (2 x school skill - cost + 0.2 Will + 0.1 Luck - Sound) x tired-body term, clamped.
function castChance(schoolSkill: number, cost: number, will: number, luck: number, sound: number, fatigue: number): number {
  const base = 2 * schoolSkill - cost + 0.2 * will + 0.1 * luck;
  return Math.min(100, Math.max(0, (base - sound) * fatigue));
}

// Awake fatigue regen per unit duration: base 2.5 + 0.02 x Endurance (defaults fFatigueReturnBase, fFatigueReturnMult).
function awakeFatigueRegenPerSec(endurance: number): number {
  return 2.5 + 0.02 * endurance;
}

// Demo values (not donor data): a mid-level fighter.
const f: Pool = { base: 80, modifier: 0, current: 40 };
const term = fatigueTerm(f);
const defence = defenceTerm({ evasion: 10, fatigueCurrent: 40, knockedDown: false, paralysed: false, unaware: false, chameleon: 0, invisibility: 0 }, 1);
const hit = hitChance({ skill: 50, agi: 40, luck: 30, fortifyAttack: 0, blind: 0 }, term, defence);
const dmg = strengthDamage(20, 50);
const cost = swingFatigueCost(0, 5, 1);
const sk: Skill = { base: 40, progress: 0.9 };
useSkill(sk, 0.2, progressRequirement(sk.base, TYPE_FACTOR.major, true));
const cc = castChance(40, 10, 50, 30, 0, term);
const regen = awakeFatigueRegenPerSec(50);
const a: Attr = { base: 50, modifier: 0, damage: 0 };
void attrModified(a);
void [term, hit, dmg, cost, sk.base, sk.progress, cc, regen];
