# NetHack-NetHack (character-stats-skills, cell 21)

Donor: `/mnt/frankendom-donors/NetHack-NetHack/src/weapon.c` (with uhitm.c, attrib.c, exper.c, hack.c, pray.c, u_init.c; constants in include/skills.h, include/weight.h) | Licence: NGPL (NetHack General Public License, `dat/license`: copyright 1989 M. Stephenson, based on the GNU GPL; GPL-style copyleft, not an SPDX standard id; treated as copyleft: clean-room, shape only) | C | symbol `use_skill` (practice), with `can_advance`, `skill_advance`, `weapon_hit_bonus`, `weapon_dam_bonus`, `find_roll_to_hit`

Checked: Read in full: weapon.c `slots_required` (1132-1152), `can_advance` (1156-1171), `skill_advance` (1198-1212), `use_skill` (1424-1435), `weapon_hit_bonus` (1545-1642 incl. the two-weapon and riding blocks; the bare-handed block 1608-1616), `weapon_dam_bonus` (1644-1700 region), `abon` (950-986), `dbon` (993-1017), `skill_init` (1738-1812); uhitm.c 365-425 (`find_roll_to_hit`), 700-712 and 776-790 (hit roll), 930-960 and 1436-1500 (training trigger and damage bonus); hack.c 4295-4312 (`weight_cap`), 4372-4396 (`calc_capacity`); exper.c 14-23 (`newuexp`); include/skills.h 86-120 and include/weight.h. Read in part: `enhance_weapon_skill` (weapon.c 1329-1400, only the call that reaches `skill_advance`). Not read: the role skill caps table (class_skill arrays, role.c), `inv_weight` (the excess-weight function behind `calc_capacity`), `attrib.c` exercise and attribute caps, `newhp` and HP growth, the spell failure formula (spell.c, only the `use_skill` call at 1599), luck timeout, and the hit-damage dice (`dmgval`, not read). Confidence: high on the skill practice, advance, to-hit and damage ladders (read end to end); medium on the abon and dbon bucket values (read in full, quoted by line only). Camera: not applicable.

## 1. Mechanism

A weapon skill is a level (0 to 6) with an advance counter that never resets. The counter goes up by one for every melee hit that does more than minimal damage. The player spends weapon slots to raise the level.

- Training (uhitm.c:946): a hit trains only if its base damage (`dmgval`) is more than 1. A minimal hit does not train. When it trains, `use_skill(type, 1)` runs once per hit (uhitm.c:1494-1498; use_skill at weapon.c:1424-1435). The skill trained is the thrown or fired weapon's own type for a thrown hit (`hmd->thrown ? weapon_type(skillwep) : uwep_skill_type()`, uhitm.c:1496), not only the wielded melee weapon. `use_skill` adds `degree` to `P_ADVANCE` (weapon.c:1430) unless the skill is restricted. Other practice comes from kicks (dokick.c:122), cutting or punching through a web (hack.c:2086) and casting (spell.c:1599, by spell level).
- Eligibility (weapon.c:1156-1171): a skill can advance when it is not restricted, is below its role max, the character has fewer than 60 advances (`P_SKILL_LIMIT`, include/skills.h:120), the counter has reached `level^2 * 20` (include/skills.h:106), and the character has enough slots for that step.
- Slots (weapon.c:1132-1152): a weapon step costs the current level in slots (unskilled to basic 1, basic to skilled 2, skilled to expert 3). Martial and bare-handed steps cost `(level + 1) / 2`. A normal character starts with 0 slots (the only start grant is `u.weapon_slots = 2` in `pauper_reinit`, u_init.c:866-884, for the pauper option, as compensation for lost skills), gets one per experience level gained (attrib.c:1070) and one extra from a prayer gift (pray.c:994). `add_weapon_skill` / `lose_weapon_skill` (weapon.c:1436-1470) add and remove slots, so slots are also lost on level-down, and un-training a skill returns its slots (weapon.c:1500).
- Advancing (weapon.c:1198-1200 and the enhance menu at weapon.c:1394): it is a player action, not automatic. `skill_advance` spends the slots and raises the level by one. The counter is not reset, so later thresholds are cumulative.
- Use in combat: the level feeds two terms. To-hit (weapon_hit_bonus, uhitm.c:421): restricted or unskilled -4, basic 0, skilled +2, expert +3. Damage (weapon_dam_bonus, uhitm.c:1489): unskilled -2, basic 0, skilled +1, expert +2.
- The to-hit roll (uhitm.c:376-378, 421): total = `1 + abon + target AC + intrinsic hit + luck term + XL + weapon hit value + skill term`, with an encumbrance penalty of `2 * level - 1` when encumbered (uhitm.c:408-409). A hit when `total > d20` (uhitm.c:709-710).

Frankendom reading: the practice counter is an XP-free progression ledger: the fight writes one number per hit, and the player chooses when to spend a budget to raise a level. The to-hit and damage ladders are small integers that are easy to show on a phone.

## 2. Key functions

- `use_skill` (counter): `/mnt/frankendom-donors/NetHack-NetHack/src/weapon.c` 1424-1435.
- `can_advance` (eligibility): `/mnt/frankendom-donors/NetHack-NetHack/src/weapon.c` 1156-1171.
- `skill_advance` (spend and raise): `/mnt/frankendom-donors/NetHack-NetHack/src/weapon.c` 1198-1212.
- `weapon_hit_bonus` (to-hit ladder): `/mnt/frankendom-donors/NetHack-NetHack/src/weapon.c` 1545-1642.
- `weapon_dam_bonus` (damage ladder): `/mnt/frankendom-donors/NetHack-NetHack/src/weapon.c` 1644-1700.
- `find_roll_to_hit` (the to-hit total): `/mnt/frankendom-donors/NetHack-NetHack/src/uhitm.c` 365-425.
- Training trigger: `/mnt/frankendom-donors/NetHack-NetHack/src/uhitm.c` 946, 1494-1498.

## 3. Numbers vs mechanism

Reusable algorithm vs game-specific constants:

| Reusable algorithm | Game-specific constants |
|---|---|
| Practice counter per skill, one point per qualifying hit, never reset | Qualifying hit = base damage above 1 (uhitm.c:946) |
| Advance gate = level squared times a constant, cumulative | times 20 (include/skills.h:106) |
| Advance costs a budget (slots), refilled by character level | slot cost = level (weapon), (level+1)/2 (martial); 0 at start (2 only for the pauper option), +1 per XL (weapon.c:1141-1151; u_init.c:884 in pauper_reinit; attrib.c:1070) |
| Level gives a small to-hit and damage bonus ladder | to-hit -4, 0, +2, +3; damage -2, 0, +1, +2 (weapon.c:1559-1575; 1657-1673) |
| Encumbrance costs to-hit in steps | -(2 x level - 1) (uhitm.c:409) |
| Global cap on advances | 60 (include/skills.h:120) |

Stat and skill table (SK-FOCUS format: name | what it does | formula | number ranges | caps | file:line). "computed" means worked out by hand from the code, not run.

| Name | What it does | Formula | Number ranges | Caps | file:line |
|---|---|---|---|---|---|
| Weapon skill level | Skill standing per weapon type | level 0 restricted, 1 unskilled, 2 basic, 3 skilled, 4 expert, 5 master and 6 grand master (martial and bare-handed) | 0 to 6 | role max per skill (skill_init, weapon.c:1738-1812, the table not read) | include/skills.h:91-103; weapon.c:1738-1812 |
| Practice counter | Accumulates training toward the next level | +1 per melee hit with base damage > 1 (use_skill degree 1); counter never reset | 1 per qualifying hit | none | uhitm.c:946, 1494-1498; weapon.c:1430 |
| Advance threshold | Counter needed to leave level L | `L * L * 20` (computed: 20 to leave unskilled, 80 basic, 180 skilled, 320 expert, 500 master) | 20 to 500 | 60 advances in total | include/skills.h:106, 120; weapon.c:1166 |
| Starting counter | Counter at skill_init | `practice_needed(level - 1)` (computed: a starting basic skill begins at 20) | 20 | none | weapon.c:1800-1801 |
| Slot cost, weapon | Slots spent to raise a weapon skill | = current level (computed: 1, 2, 3) | 1 to 3 | slots never below 0 | weapon.c:1141; skill_advance 1200 |
| Slot cost, martial | Slots for martial or bare-handed | `(level + 1) / 2` (computed: 1, 1, 2, 2, 3) | 1 to 3 | as above | weapon.c:1151 |
| Slot income | Slots gained | start 0 (pauper option: 2); +1 per XL gained; +1 per prayer gift; lost on level-down | 0 at start | none | u_init.c:866-884 (pauper only); attrib.c:1070; pray.c:994; weapon.c:1436-1470 |
| Skill to-hit | To-hit term from the level | restricted and unskilled -4; basic 0; skilled +2; expert +3 | -4 to +3 | none | weapon.c:1559-1575 (values at 1566, 1568-1575) |
| Skill damage | Damage term from the level | unskilled -2; basic 0; skilled +1; expert +2 | -2 to +2 | none | weapon.c:1657-1673 |
| Bare-handed to-hit | Unarmed to-hit term | `((max(level,1) - 1 + 2) * (martial ? 2 : 1)) / 2` (computed: basic gives +1, expert gives +2; martial doubles) | +1 to +3 at basic to grand master (the donor's own comment table) | none | weapon.c:1611-1613 |
| Two-weapon | To-hit and damage penalty when fighting with both weapons | to-hit -9, -7, -5, -3 by the lower of the two skills; damage -3, -1, 0, +1 | -9 to -3; -3 to +1 | none | weapon.c:1587-1598; 1682-1694 |
| Riding | To-hit penalty while mounted | -2 unskilled or restricted, -1 basic, 0 skilled or expert; -2 more when two-weapon | 0 to -4 | none | weapon.c:1617-1633 (riding block, read) |
| To-hit total | Roll needed on d20 | `1 + abon + target AC + intrinsic + luck term + XL + weapon hit value + skill term`, minus encumbrance and 3 when trapped; plus 2 each when the target is stunned, fleeing or asleep, +4 when it cannot move, +1 for an elf hitting an orc, and a Monk body-armour penalty (or the Monk unarmed bonus) (uhitm.c:386-411) (computed: a basic-skill, XL 5, AC 5, abon 0, luck 0 fighter has total 11: hits on d20 rolls 1 to 10, a 50% chance) | total can be any integer | none | uhitm.c:376-378, 421 |
| Luck to-hit | Luck term | `sgn(luck) * ((abs(luck) + 2) / 3)` (computed: luck 1 gives 1, 4 gives 2, 7 gives 3, -4 gives -2) | -3 to +3 for luck -7 to +7 | integer division | uhitm.c:377 |
| Monk bonus | Unarmoured, unarmed monk to-hit | `(XL / 3) + 2` | +2 at XL 1 to 2, +3 at XL 3 to 5 (computed) | only with no armour and no weapon or shield | uhitm.c:401 |
| Encumbrance to-hit | To-hit lost when carrying too much | `-(2 * level - 1)` for encumbrance level 1 to 5 | -1 to -9 | level capped at 5 | uhitm.c:408-409; hack.c:4372-4382 |
| Strength to-hit (abon) | Str term of to-hit | Str <6: -2; <8: -1; <17: 0; <18/50: +1; <18/100: +2; else +3; plus 1 under XL 3 | -2 to +4 | none | weapon.c:950-977 |
| Dexterity to-hit (abon) | Dex term of to-hit | Dex <4: sbon-3; <6: sbon-2; <8: sbon-1; <14: sbon; else sbon + dex - 14 | sbon-3 at the low end; sbon + (Dex - 14) at the high end | none | weapon.c:979-988 |
| Strength damage (dbon) | Str term of damage | Str <6: -1; <16: 0; <18: +1; 18: +2; <=18/75: +3; <=18/90: +4; <18/100: +5; else +6 | -1 to +6 | none | weapon.c:993-1017 |
| Carry capacity | Weight before encumbrance | `25 * (Str + Con) + 50` | computed: Str 16, Con 14 gives 800 weight units | none | hack.c:4311-4312; include/weight.h:12-14 |
| Encumbrance level | Load band | `wt * 2 / cap + 1`, with wt = inv_weight plus extra (inv_weight not read); 0 when wt <= 0 | 0 to 5 | 5 (overloaded) | hack.c:4372-4382 |
| XP threshold | Experience needed for a level | `10 * 2^lev` for lev < 10; `10000 * 2^(lev-10)` for 10 to 19; `10000000 * (lev - 19)` from 20 (computed: 20 at lev 1, 5120 at 9, 10000 at 10, 5120000 at 19) | as stated | none | exper.c:14-23 (meaning of lev at the caller not read) |
| Attribute caps and exercise | Str, Dex, Con, Int, Wis, Cha growth | not read | not read | not read | attrib.c not read |
| Magic skill practice | Spells train their school by spell level | `use_skill(skill, spellev)` | by spell level | same counter and ladders | spell.c:1599 (failure formula not read) |
| HP growth, luck timeout, spell failure, role caps | Not read in this pass | n/a | n/a | n/a | not read |

Values quoted from lines are the donor's own; "computed" means I worked the formula out by hand (not run). The numbers in the two bucket tables are read from the donor switch statements, quoted by their case labels in the receipts.

## 4. TypeScript sketch

simplified: the sketch keeps the practice counter (one point per qualifying hit, never reset), the level-squared threshold, the slot budget and the player-driven advance, the to-hit ladder and the damage ladder, the encumbrance term and the luck term. It omits the stun/flee/sleep, can't-move, trap and elf-vs-orc terms of the to-hit total, slot loss on level-down, two-weapon, riding, the bare-handed and martial formulas, role caps, the monk bonus, the starting counter from skill_init (the donor starts a skill's counter at the previous level's threshold), the speedy wizard advance, the other practice sources (kicks, running into things, spells), the attribute terms (`abon` and `dbon` are inputs), the d20 and damage dice (inputs), and the per-experience-level slot gain (the sketch takes slots as input). It omits no step of the order the donor uses for a hit: practice happens only after a hit that did more than one point of base damage, and the advance is never automatic.

```ts
// Licence: NGPL (donor, NetHack General Public License; GPL-style copyleft). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

// Skill levels: 0 restricted, 1 unskilled, 2 basic, 3 skilled, 4 expert (martial skills also reach 5 and 6).
const SKILL_LIMIT = 60;            // total advances per character
const START_SLOTS = 0;             // a normal start has 0 slots; only the pauper option starts with 2

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
```

Best transferable idea: a per-skill practice counter that never resets and is gated by level squared, with the spend of a separate budget (slots) and only a small to-hit and damage ladder per level, so the fight writes one number per hit and the player chooses when to raise it.
Decision (proposed): adapt — keep the counter, the level-squared gate, the player-chosen advance, and the -4..+3 to-hit and -2..+2 damage ladders; replace the slot budget with Frankendom's own XP ledger (one ledger), and fix the bare-handed and to-hit display so every term is visible on the phone.
Acceptance: a server test with a fixed seed: a fighter given 2 slots in the test setup (a normal start has 0; slots come from experience levels) gets 20 qualifying hits (base damage above 1), enhances unskilled to basic and keeps 1 slot; a hit with base damage 1 adds no practice; on the same target the total to-hit rises by 0 at basic and by +3 at expert.

## 5. Lands in

- TARGET `src/fight/weapon-skill.ts` (new module, proposed): the counter, the advance gate, the ladders and the to-hit total used by the duel step (`src/fight/` duel call). The donor's skill numbers become catalogue fields.
- Parity-checklist row 21 (catalogue fields): the thresholds (level squared times 20), cap of 60 advances, ladders and slot costs are data fields for the weapon catalogue. The duel step itself stays on row 1.
- Reuse tag: rewrite-from-idea (NGPL, GPL-style; clean-room only)
- Brief rule served: 1 (one ledger; numbers as data fields); rules 7-9 n/a

## 6. Gaps and risks

- NGPL: a GPL-style licence. Clean-room only. The sketch is written from the mechanism, not a translation.
- Donor defect candidate: the counter is cumulative and never resets, so a skill that is raised early keeps the spare practice for the next level. That is intended in the donor, but the starting counter (skill_init sets it to the previous level's threshold) means a starting basic skill is already at 20 and needs 60 more hits for skilled. Keep the idea; fix: state the start value in the catalogue so the player can see it.
- Training only counts hits with base damage above 1. A weapon with low damage trains slowly or not at all, and a minimal hit never trains. Frankendom should decide the rule per weapon and show it. No defect in the donor's logic, but a design trap.
- The donor's slot budget is tied to character level. Frankendom's ledger is one XP number: a slot-like budget must be a separate counter fed by level-ups, or the cap of 60 advances (include/skills.h:120) becomes the only limit.
- The to-hit total includes encumbrance and luck; both are integer and easy to get wrong across client and server. The server must compute the total and the roll (kills are server-verified), so the client shows the same total.
- The donor's roll is a d20 with the total compared to `>`, so the chance is (total - 1) / 20, capped by the d20 (computed). Frankendom's duel should state its roll in the same units or the numbers in the catalogue will not match the feel.
- Magic and mental stats: the donor gives spells their own skill counters by spell level (spell.c:1599). The formula for failure and power is not read here; Frankendom's magic (dragons, necromancy, witchcraft, mind, persuasion) needs its own pass.
- Luck: the donor uses a luck term in to-hit (uhitm.c:377). Luck timeout and the source of luck were not read.
- Role caps (skill_init) and the attribute tables were not read; the table above lists the caps as not read where they apply.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- Starting weapon slots were wrong: u_init.c:884 is inside `pauper_reinit()` and applies only to the pauper option (compensation for lost skills); normal characters start with 0 slots. The Mechanism, the 'Slot income' row and the Acceptance rested on this. Confirmed.
- Training also fires for thrown or fired weapons (uhitm.c:1496), not only melee. Confirmed.
- To-hit total omits stun/flee/sleep +2, can't-move +4, trap, race terms and the Monk armour penalty (uhitm.c:386-411). Confirmed by the checker's cited range; added as a short clause.
- Missed: slot loss on level-down and the untrain path (`lose_weapon_skill`, weapon.c:1454-1470, 1500); `u.weapon_slots` lifecycle (`add_weapon_skill`, 1436-1450). Confirmed in the grep of `weapon_slots`.
Fixed 2026-10-12: Mechanism (training and slots bullets), the slot-cost and Slot income rows, the To-hit total row, the Acceptance (2 slots now stated as test setup); sketch constant START_SLOTS set to 0 with a comment (work/nethack-weapon-skill.ts updated).
