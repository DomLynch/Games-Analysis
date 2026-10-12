// Licence: NGPL (donor, NetHack General Public License; GPL-style copyleft). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

// Skill levels: 0 restricted, 1 unskilled, 2 basic, 3 skilled, 4 expert (martial skills also reach 5 and 6).
const SKILL_LIMIT = 60;            // total advances per character
const START_SLOTS = 2;

interface Skill {
  level: number;                   // current level
  maxLevel: number;                // role cap
  practice: number;                // advance counter; accumulates, is not reset on advance
}

interface Hero {
  xl: number;
  slots: number;                   // weapon slots available
  advances: number;                // advances made so far
  luck: number;
  abon: number;                    // strength and dexterity to-hit term (computed elsewhere)
  skills: Map<string, Skill>;
}

const practiceNeeded = (level: number): number => level * level * 20;

// Weapon skills: a step costs the current level in slots (1 to basic, 2 to skilled, 3 to expert).
const slotsFor = (level: number): number => level;

function canAdvance(h: Hero, s: Skill): boolean {
  return s.level >= 1 && s.level < s.maxLevel && h.advances < SKILL_LIMIT
      && s.practice >= practiceNeeded(s.level) && h.slots >= slotsFor(s.level);
}

// The player's enhance action. Practice is not reset.
function enhance(h: Hero, s: Skill): boolean {
  if (!canAdvance(h, s)) return false;
  h.slots -= slotsFor(s.level);
  s.level += 1;
  h.advances += 1;
  return true;
}

// One practice point per melee hit whose base damage is more than 1.
function practiceHit(s: Skill, baseDamage: number): void {
  if (s.level >= 1 && baseDamage > 1) s.practice += 1;
}

// Skill terms. Restricted and unskilled: to-hit -4, damage -2. Basic: 0, 0. Skilled: +2, +1. Expert: +3, +2.
function skillHit(level: number): number {
  if (level <= 1) return -4;
  if (level === 2) return 0;
  if (level === 3) return 2;
  return 3;
}

function skillDamage(level: number): number {
  if (level <= 1) return -2;
  if (level === 2) return 0;
  if (level === 3) return 1;
  return 2;
}

// Luck term: sign of luck times (|luck| + 2) / 3, with integer division.
function luckTerm(luck: number): number {
  return Math.sign(luck) * Math.trunc((Math.abs(luck) + 2) / 3);
}

// To-hit total before the d20 roll. encumbrance: 0 unencumbered, otherwise the donor's level 1 to 5.
function toHit(h: Hero, s: Skill, targetAc: number, hitvalWeapon: number, encumbrance: number): number {
  let tmp = 1 + h.abon + targetAc + luckTerm(h.luck) + h.xl + hitvalWeapon + skillHit(s.level);
  if (encumbrance > 0) tmp -= encumbrance * 2 - 1;   // donor: (level * 2) - 1
  return tmp;
}

// A hit when the total beats a d20 roll.
function hits(tmp: number, d20: number): boolean {
  return tmp > d20;
}

// Damage term added to the base damage of the weapon.
function damageSkillTerm(s: Skill): number {
  return skillDamage(s.level);
}
