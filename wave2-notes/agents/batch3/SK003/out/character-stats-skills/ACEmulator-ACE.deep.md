# ACEmulator-ACE (character-stats-skills, cell 2)

Donor: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/SkillCheck.cs` | Licence: AGPL-3.0 (as read: `LICENSE`, GNU Affero General Public License Version 3, 19 November 2007; no per-file licence header read) | C# | symbol `SkillCheck.GetSkillChance`

Checked: Read in full: `SkillCheck.cs` (24 lines), `SkillFormula.cs` (WorldObjects, 39 lines), `AttributeFormula.cs` (Entity, 73 lines), `DatLoader/Entity/SkillFormula.cs` (36 lines), `SkillFormulaTests.cs` (17 lines). Read in part: `DamageEvent.cs` (199-240, 290-370, 384-412), `Creature_BodyPart.cs` (25-125), `Monster_Melee.cs` (425-520), `Creature_Combat.cs` (380-425, 700-725), `WorldObject_Weapon.cs` (744-790), `WorldObject_Magic.cs` (98-118), `Player_Magic.cs` (530-540), `Player_Skills.cs` (114-200, 405-460). Callers of `GetSkillChance`: nine call sites found by grep; read three (DamageEvent.cs 396, WorldObject_Magic.cs 107, Player_Magic.cs 536, which calls `GetMagicSkillChance`). Not read: `Overpower` (where it is set), `GetBaseSkillImbued`, `GetEffectiveAttackSkill` and `GetEffectiveDefenseSkill` bodies, the player-attacker `GetArmorMod` branch, `SpecializeSkill` body (199-230), luck, spell power and resistances. Vitals numbers live in portal.dat, which is not in this repo, so the vitals rows are formulas only. Confidence: high for the skill-check curve and the evade order (formula, unit test, and call sites read); medium for the armour pipeline (player-defender branch read only through the monster-attacker override). The donor's CLAUDE.md and AGENTS.md were not opened and not followed.

## 1. Mechanism

- One logistic roll resolves a skill against a difficulty. `GetSkillChance(skill, difficulty, factor)` returns `1 - 1/(1 + e^(factor * (skill - difficulty)))`, clamped to 0..1 (SkillCheck.cs 7-11). Default factor 0.03 (line 7); magic casting uses 0.07 (line 21). At equal skill the chance is 0.5, which the one unit test asserts (SkillFormulaTests.cs 11-14).
- Evade is built on the same roll, before any damage. `GetEvadeChance` returns `1 - GetSkillChance(attack, defence)` (DamageEvent.cs 396). The hit path rolls it (line 202) when not Overpower (line 199): if the roll wins, `Evaded` is set and damage is 0 (204-205). Only after that does base damage run (211-213).
- Damage is a product of multipliers (line 365): base damage x ArmorMod x ShieldMod x ResistanceMod x DamageResistanceRatingMod. Attribute damage (228) and the rating mods are read; the base damage body is not read.
- Armour per piece: `effectiveAL = base AL + enchantments` and `effectiveRL = resistance + bane`, RL clamped to -2..2 (Creature_BodyPart.cs 80, 85, 88); the piece contributes `AL x RL` (98). A body part sums all layers (52), applies rending only when the total is positive (55-56), then passes the total through the armour curve (33).
- Armour curve: `CalcArmorMod(AL) = K / (AL + K)` for AL > 0 and `1 - AL/K` for AL < 0, with K = 200/3 (SkillFormula.cs 16, 32, 34). It is hyperbolic: AL 66.7 halves a hit, AL 200 quarters it, and negative AL amplifies it.
- Ignore-armour: `ignoreArmorMod = min(rending, cleaving)` (DamageEvent.cs 298); an item with IgnoreAllArmor sets ArmorMod to 1.0 (328-329).
- Tick: none. Per-attack, synchronous.

## 2. Key functions

- `SkillCheck.GetSkillChance(int, int, float)`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/SkillCheck.cs` 7-12; `GetMagicSkillChance` 19-22.
- `DamageEvent.GetEvadeChance` and the evade roll: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/Entity/DamageEvent.cs` 386-398 and 199-207.
- Armour curve `CalcArmorMod`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/SkillFormula.cs` 29-37. Attribute mod `GetAttributeMod`: same file, 18-23.
- Armour per body part: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Creature_BodyPart.cs` 29-99. Monster-attacker variant: `Monster_Melee.cs` 425-459.
- Rending: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/WorldObject_Weapon.cs` 744-766.
- Shield: `Creature_Combat.cs` 700-718.
- Magic resist: `WorldObject_Magic.cs` 104-113. Cast precheck: `Player_Magic.cs` 534-540.
- Vitals: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/Entity/AttributeFormula.cs` 34-70.
- Skill training and XP: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Player_Skills.cs` 114-197 (train), 410-454 (XP table and rank).

## 3. Numbers vs mechanism

Values are the donor's own. Chance numbers are computed from the formula (not measured).

| Name | What it does | Formula | Number ranges (min/max/typical) | Caps (soft/hard) | file:line |
|---|---|---|---|---|---|
| Skill check (combat) | land or succeed against a difficulty | chance = 1 - 1/(1 + e^(0.03 * (skill - difficulty))) | 0.5 at equal skill; +10 points gives 0.574, +50 gives 0.818, -50 gives 0.182 | clamp 0..1 | SkillCheck.cs 7-11 |
| Evade | the defender avoids the hit | evade = 1 - land chance; rolled before base damage | same curve, so a 10-point gap moves evade by about 7 points near even | none stated | DamageEvent.cs 199-207, 396 |
| Magic cast | cast succeeds at all | precheck skill >= power - 50; chance = 1 - 1/(1 + e^(0.07 * (skill - power))) | 10 points gives 0.668 (steeper than combat) | precheck margin 50 | Player_Magic.cs 534-536; SkillCheck.cs 19-21; Player_Skills.cs 456 |
| Magic resist | a target resists a spell | chance = skill check (caster vs target magic defence, slope 0.03); resisted when chance <= random | slope 0.03 (not 0.07), explicitly so in the comment | none | WorldObject_Magic.cs 104-113 |
| Armour curve | damage multiplier from armour level | AL > 0: K/(AL+K); AL < 0: 1 - AL/K; K = 66.67 | AL 0 gives 1.0; AL 66.7 gives 0.5; AL 200 gives 0.25; AL -66.7 gives 2.0 | none (negative AL amplifies) | SkillFormula.cs 16, 29-37 |
| Armour per piece | one layer's armour | AL = base + enchant; RL = resistance + bane, clamp -2..2; piece = AL x RL | RL -2..2 | RL clamp | Creature_BodyPart.cs 80, 85, 88, 98 |
| Armour total (body part) | all layers on a part | sum of piece values + body armour; rending x total if positive; then curve | per part | none | Creature_BodyPart.cs 36-59; Monster_Melee.cs 425-459 |
| Rending (melee) | share of armour ignored | 1 - max(0, skill - 160) / 400 | 1.0 at 160 or under; 0.4 at 400 | comment says "max 60%" but no clamp in code | WorldObject_Weapon.cs 746, 755, 765 |
| Rending (missile) | share of armour ignored | 1 - max(0, skill - 144) / 360 | 1.0 at 144 or under | as melee | WorldObject_Weapon.cs 759 |
| Cleaving | caps ignored armour per weapon | min(creature mod, weapon mod) | not read | not read | WorldObject_Weapon.cs 777-784 |
| Shield | blocks a fraction of damage | effective level = min(SL, shield cap); cap = shield skill, halved unless specialised; then the armour curve | cap halved for untrained | (not read) | Creature_Combat.cs 703-718 |
| Attribute damage (melee) | damage bonus from Strength; finesse weapons use Coordination | max(1 + (attr - 55) * 0.011, 1) | 1.0 at 55 or under | floor 1 | SkillFormula.cs 11, 18-23; Creature_Combat.cs 412-419 |
| Attribute damage (bow) | damage bonus from Coordination | max(1 + (attr - 55) * 0.008, 1) | 1.0 at 55 or under | floor 1 | SkillFormula.cs 14; Creature_Combat.cs 417 |
| Health / stamina / mana max | vitals from two attributes | (attr1 + attr2) / Z, rounded, when Z is not 1; formula X is only tested for 0 and is not added | from portal.dat (not in repo) | from portal.dat | AttributeFormula.cs 57-68; DatLoader SkillFormula.cs 8-18 |
| Skill training (cost) | trains a skill with credits | cost must equal the DAT TrainedCost; train clears ranks and sets Trained | cost from portal.dat | (not read) | Player_Skills.cs 114-134, 171-190 |
| Creation bonus | starting XP and ranks for a trained skill | ExperienceSpent = 526; Ranks = 5 | 526 XP, 5 ranks | fixed in code | Player_Skills.cs 182-186 |
| Skill rank from XP | rank from XP spent | largest index i whose table entry is <= XP spent; table from portal.dat (Trained or Specialised list) | table not in repo | (not read) | Player_Skills.cs 410-454 |
| Magic skill check margin | a cast is attempted only near the power | skill >= power - 50 | 50 | none | Player_Magic.cs 534; Player_Skills.cs 456 |
| Luck, spell power, schools, social skills | (not read in this pass) | (not read) | (not read) | (not read) | (not read) |

Fast-fight read: the combat slope (0.03) is gentle, so a 10-point gap moves the chance only 7 points near even, which makes a duel readable. The magic slope (0.07) is steeper. The armour curve halves a hit at AL 66.7 and is the part to test: most of the effect comes in the first 60 or so AL. Rending is the one place a single stat reshapes the armour curve, so it needs the clamp.

Defects found:
- Rending has no clamp (WorldObject_Weapon.cs 765). The comment says max 60%, but the melee formula goes to 0.4 at skill 400 and to 0 at skill 560. If a weapon's base skill can pass 560 (not read: `GetBaseSkillImbued`), the multiplier turns negative, and because rending is applied only when AL is positive (Creature_BodyPart.cs 55-56, Monster_Melee.cs 450-451), the AL flips sign and the curve amplifies damage. Fix: clamp the multiplier to the stated range (min 0.4) before use; the sketch does this.
- `GetAttributeMod` names its first parameter `currentSkill` (SkillFormula.cs 18), but the caller passes an attribute value (Creature_Combat.cs 419). Behaviour is right; the name is wrong. Fix: rename the parameter to `attr`.
- Vitals: the formula's `X` is read (DatLoader SkillFormula.cs 18) and tested for zero (AttributeFormula.cs 57) but not added to the sum. If X is meant as a base, the vitals are short by X. Fix: check the DAT meaning and either add it or document it as unused.

simplified: the sketch keeps the donor order of the hit path: a logistic land chance, the evade complement, then the armour curve with the rending clamp. It omits the Overpower bypass, the base damage body, the power, sneak, crit, and rating mods, the per-piece AL x RL sum (the sketch takes the total AL as an input), the cleaving min, the IgnoreAllArmor rule, the shield cap, and the magic variant (the slope is a parameter here). Units are the donor's (skill points and armour level).

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: the logistic land chance, then the evade complement, then the armour curve with the rending clamp applied before the multiply. It omits the Overpower bypass, base damage, power, sneak, crit and rating mods, the per-piece AL x RL sum (total AL is an input), cleaving, IgnoreAllArmor, the shield cap, and resistances. Magic uses the same function with its own slope as a parameter.

```ts
// Licence: AGPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// One logistic skill-vs-difficulty chance, the evade roll built on it, the armour curve, the attribute damage bonus and rending.
// Every number here is a tuning field, not a fixed rule.

export interface AttackTuning {
  combatSlope: number;   // logistic slope for attack/defence (donor default 0.03)
  magicSlope: number;    // logistic slope for casting (donor default 0.07)
  armourK: number;       // armour curve constant (donor 200 / 3)
  attrPivot: number;     // attribute at which the damage bonus is zero (donor 55)
  attrPerPoint: number;  // damage bonus per point above the pivot (donor 0.011 melee, 0.008 bow)
  rendMin: number;       // fix: lowest armour multiplier rending may reach (donor has no clamp; comment says 60% max)
}

// Chance that a skill beats a difficulty: 0.5 when equal, rising with the gap (donor SkillCheck.GetSkillChance).
export function skillChance(skill: number, difficulty: number, slope: number): number {
  const chance = 1 - 1 / (1 + Math.exp(slope * (skill - difficulty)));
  return Math.min(1, Math.max(0, chance));
}

// Evade is the complement of the attack's chance to land (donor GetEvadeChance).
export function evadeChance(attackSkill: number, defenseSkill: number, t: AttackTuning): number {
  return 1 - skillChance(attackSkill, defenseSkill, t.combatSlope);
}

// Damage multiplier from one armour level. Positive: hyperbolic falloff. Negative: linear rise (donor CalcArmorMod).
export function armourMod(al: number, t: AttackTuning): number {
  if (al > 0) return t.armourK / (al + t.armourK);
  if (al < 0) return 1 - al / t.armourK;
  return 1;
}

// Attribute damage bonus: linear above the pivot, never below 1 (donor SkillFormula.GetAttributeMod).
export function attributeMod(attr: number, t: AttackTuning): number {
  return Math.max(1 + (attr - t.attrPivot) * t.attrPerPoint, 1);
}

// Rending: the share of armour a skill ignores, grown above a threshold. Fix: clamp at rendMin (donor has no clamp).
export function rendingMod(baseSkill: number, threshold: number, perPoint: number, t: AttackTuning): number {
  return Math.max(t.rendMin, 1 - Math.max(0, baseSkill - threshold) / perPoint);
}

export {};
```

## 5. Lands in

- TARGET `src/fight/hit-roll.ts` (new engine step: the duel's land and evade roll, then the armour curve in the same module). Parity-checklist row 1 (duel step / sim). The shield and rending rules, if taken, belong in the same module.
- Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
- Brief rule served: 1 (one combat core, two clients); SK focus item 4 (block/evade), item 5 (armour vs damage), item 12 (magic resist and cast chance, rows only)

## 6. Gaps and risks

- AGPL-3.0: clean-room only. The sketch is written from the mechanism. AGPL adds a network-use clause, so the server-side use must never copy the donor's code.
- Server-verified kills: the land and evade rolls must run on the server, after the client's input is intake-checked (row 5). A client that reports its own evade would bypass the rule.
- One ledger: the damage product is computed once in DamageEvent (line 365). Whether any other path re-applies these multipliers was not read, so Frankendom must test that a hit is applied through one function only.
- MAX_ATTACKERS = 3: the roll is per attacker, so a many-on-one fight calls it once per attacker. Whether the donor caps attackers was not read; Frankendom's cap of 3 is an engine rule either way.
- Zones as data: the slope, armour K and rending thresholds are numbers a designer would set per monster class or zone; they go in the sidecar as data fields.
- Replay (row 19): the rolls are random per attack (`ThreadSafeRandom`); a fight record needs a seeded roll so the replay reproduces the same land and evade results.
- Fast-fight tuning: the curve is set for AC's skill range (hundreds of points); a Frankendom skill scale of 0-100 needs the slope rescaled (for example 0.3 on a 0-10 scale), and the sidecar records the rescale as a data field.

Best transferable idea: resolve each hit and cast as one logistic roll on skill minus difficulty, so equal skills are always a coin flip and every 10-point gap moves the chance by the same known amount.
Decision (proposed): adapt - the one logistic land-or-evade roll and the hyperbolic armour curve suit a fast duel, and the slope and K become data; the rending needs its clamp, and the AC skill scale is rescaled for Frankendom's 0-100 skills.
Acceptance: a server test asserts that equal skills land at 0.5, that a 10-point skill gap moves the land chance from 0.50 to about 0.57, and that AL 66.7 halves a hit with rending never below 0.4.

Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
Brief rule served: 1 (one combat core, two clients); SK focus item 4 (block and evade) and item 5 (armour versus damage); item 12 (magic resist and cast chance, rows only)

## Checker findings (Sonnet 5.5 medium, 2026-10-12)

Verdict: CLEAN
- Errors: none found.
- Missed: WorldObject_Weapon.cs:742 declares `public static float MaxArmorRendingMod = 0.6f`, never referenced anywhere, so the 'max 60 percent' intent exists only as an unused constant; the note mentions only the comment.
- Missed: Player-defender GetArmorMod branch unread (already declared in the note).
- Verified OK: SkillCheck.cs, SkillFormula, attribute mods, DamageEvent lines, Creature_BodyPart, rending, shield, MagicDefenseCheck, chance values recomputed, AGPL-3.0.
