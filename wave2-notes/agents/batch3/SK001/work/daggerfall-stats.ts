// Licence: MIT (donor daggerfall-unity, LICENSE line 1: "MIT License"). Adapted from the described rules; written fresh, not a line-by-line copy.
export {};

// Stat-to-modifier table (FormulaHelper 66-129). Donor uses floor() on floats; kept as Math.floor.
export const damageModifier = (str: number): number => Math.floor((str - 50) / 5);
export const toHitModifier = (agi: number): number => Math.floor(agi / 10) - 5;
export const hpModifier = (end: number): number => Math.floor(end / 10) - 5;
export const magicResist = (will: number): number => Math.floor(will / 10);
export const maxEncumbrance = (str: number): number => Math.floor(str * 1.5);

// Fatigue is stored in 1/64 points (DaggerfallEntity.cs 39, 262). Max = (Str + End) x 64.
export const FATIGUE_SCALE = 64;
export const maxFatigue = (str: number, end: number): number => (str + end) * FATIGUE_SCALE;

// Hit chance on a 0-100 scale (FormulaHelper 805-827, 1140-1248). Donor int division truncates, so Math.trunc.
export interface HitInputs {
  skill: number;          // attacker weapon skill (CalculateAttackDamage 592)
  armour: number;         // armour value of the struck body part (1158)
  enchant: number;        // attacker ChanceToHitModifier (814)
  attLuck: number; defLuck: number;
  attAgi: number; defAgi: number;
  defDodge: number;       // target dodging skill (1213)
  critSkill: number;      // attacker crit-strike skill
  critRoll: boolean;      // true when a roll against critSkill succeeded (1216)
  weaponMaterialMod: number; // weapon material modifier, scaled x10 (1146)
  targetIsMonster: boolean;
}
// simplified: omits swing, proficiency, racial, backstab, adrenaline rush, biography avoid-hit and the Dice100 roll itself.
export function chanceToHit(h: HitInputs): number {
  let c = h.skill + h.armour + h.enchant;
  c += h.weaponMaterialMod * 10;
  c += Math.trunc((h.attLuck - h.defLuck) / 10);
  c += Math.trunc((h.attAgi - h.defAgi) / 10);
  c -= Math.trunc(h.defDodge / 4);
  if (h.critRoll) c += Math.trunc(h.critSkill / 10);
  if (h.targetIsMonster) c += 40;
  c -= 50;
  return Math.min(97, Math.max(3, c));
}

// Weapon damage: random in [min, max] + Str modifier + material modifier, floored at 0 (FormulaHelper 736-761).
export function weaponDamage(min: number, max: number, str: number, materialMod: number, rand01: () => number): number {
  const roll = min + Math.floor(rand01() * (max - min + 1));
  const d = roll + damageModifier(str) + materialMod;
  return d < 1 ? 0 : d;
}

// Hand-to-hand range from skill (FormulaHelper 440, 452). Player adds the Str modifier; monsters do not (785-786).
export function handToHandRange(skill: number): [number, number] {
  return [Math.trunc(skill / 10) + 1, Math.trunc(skill / 5) + 1];
}

// Fatigue decrease with clamp; exhaustion when it reaches 0 (DaggerfallEntity 350-364).
// simplified: the donor raises the exhausted event only while health is above zero; this sketch returns the flag only.
export function decreaseFatigue(current: number, max: number, raw: number): { current: number; exhausted: boolean } {
  const c = Math.min(max, Math.max(0, current - raw));
  return { current: c, exhausted: c <= 0 };
}

// Skill advancement: uses needed = floor(skill x mult x careerMult x 1.04^level x 2/5 + 1) (FormulaHelper 325-326).
export function usesNeeded(skill: number, mult: number, careerMult: number, level: number): number {
  return Math.floor(skill * mult * careerMult * Math.pow(1.04, level) * 2 / 5 + 1);
}
// Reflexes scale uses: 0x10000 - ((r - 2) << 13) over 0x10000 = 1 - (r - 2) / 8 (PlayerEntity 1377-1378).
export function reflexScale(reflexes: number): number { return 1 - (reflexes - 2) / 8; }

export interface SkillLedger { uses: number; skill: number; }
// One +1 per check, as in the donor. simplified: the donor sets uses to 0 (drops the excess); this sketch
// carries the excess uses back (fix D3). Mastery gate (skill 95 to 100 only if no primary skill is at 100) omitted here.
export function checkAdvance(l: SkillLedger, need: number, reflexes: number): SkillLedger {
  const scale = reflexScale(reflexes);
  const effective = l.uses * scale;
  if (effective < need || l.skill >= 100) return l;
  return { uses: Math.max(0, l.uses - need / scale), skill: l.skill + 1 };
}

// Player level from level-up skill increases since start (FormulaHelper 336). Donor integer division, so Math.trunc.
export function playerLevel(startSum: number, currentSum: number): number {
  return Math.trunc((currentSum - startSum + 28) / 15);
}

// HP per level-up: roll in [hpPerLevel/2, hpPerLevel] + End modifier, at least 1 (FormulaHelper 346-352).
export function hpPerLevelUp(hpPerLevel: number, end: number, rand01: () => number): number {
  const min = Math.trunc(hpPerLevel / 2);
  const max = hpPerLevel;
  const add = min + Math.floor(rand01() * (max - min + 1)) + hpModifier(end);
  return Math.max(1, add);
}

// Saving throw (FormulaHelper 1457-1546). save = 50 + tolerance flags + biography + modifier, before MagicResist.
// Immune at 100+ before resist (1526-1527). Then + MagicResist, clamp 5..95 (1530-1532). roll is 1..100.
export function savingThrowPercent(saveBeforeResist: number, will: number, roll: number): number {
  if (saveBeforeResist >= 100) return 0;
  const save = Math.min(95, Math.max(5, saveBeforeResist + magicResist(will)));
  if (roll > save) return 100;
  if (save - 20 <= roll) return 100 - 5 * (save - roll);
  return 0;
}

// Health recovered per hour of rest (FormulaHelper 184-205, minimum 1). medical = live Medical + 60 (or 100 under rapid healing).
export function healthPerRestHour(end: number, medicalWithBonus: number, maxHealth: number): number {
  return Math.max(Math.floor(hpModifier(end) + Math.trunc(medicalWithBonus * maxHealth / 1000)), 1);
}

// Demo values (not donor data).
const rng = (): number => 0.5;
const hit = chanceToHit({ skill: 40, armour: 10, enchant: 0, attLuck: 50, defLuck: 30, attAgi: 60, defAgi: 40,
  defDodge: 20, critSkill: 30, critRoll: false, weaponMaterialMod: 1, targetIsMonster: false });
const wd = weaponDamage(3, 8, 70, 1, rng);
const [hmin, hmax] = handToHandRange(55);
const fat = decreaseFatigue(maxFatigue(50, 50), maxFatigue(50, 50), 11);
const need = usesNeeded(40, 12, 1, 3);
const adv = checkAdvance({ uses: 900, skill: 40 }, need, 3);
const lvl = playerLevel(0, 60);
const hp = hpPerLevelUp(12, 60, rng);
const st = savingThrowPercent(50, 60, 40);
const rec = healthPerRestHour(60, 60 + 60, 120);
void [hit, wd, hmin, hmax, fat.current, fat.exhausted, adv.skill, lvl, hp, st, rec, toHitModifier(60), maxEncumbrance(60)];
