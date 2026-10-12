# daggerfall-unity (character-stats-skills, cell 2)

Donor: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Formulas/FormulaHelper.cs` (stats, hit, damage, saving throw, advancement helpers), `.../Game/Entities/DaggerfallEntity.cs`, `.../Game/Entities/PlayerEntity.cs`, `.../Game/Entities/DaggerfallSkills.cs`, `.../Game/WeaponManager.cs` | Licence: MIT License (LICENSE line 1), copyright 2009-2023 Daggerfall Workshop | C# (Unity) | symbols: `FormulaHelper.DamageModifier`, `CalculateSuccessfulHit`, `CalculateStatsToHit`, `CalculateSkillsToHit`, `CalculateAdjustmentsToHit`, `CalculateWeaponAttackDamage`, `CalculateHandToHandAttackDamage`, `SavingThrow`, `CalculateSkillUsesForAdvancement`, `PlayerEntity.RaiseSkills`, `DaggerfallEntity.SetFatigue`

Checked: camera_scope n/a (stats topic). Read in full: FormulaHelper.cs 36-232 (stat and recovery formulas), 254-268, 315-357, 391-395 (partial), 434-454, 538-795 (attack damage, monster branch, weapon and hand-to-hand damage), 796-830 (hit roll), 863-933 and 1080-1139 (struck body part, swing and proficiency modifiers, equipment damage; 934-1079 not read, which includes the racial modifiers, backstab and the monster-type bonus used in the damage path), 1140-1251 (to-hit family), 1443-1547 (saving throw), 1575-1591 and 1654-1672 (effect amount, resistance read), 357-391 (pacification). DaggerfallEntity.cs 300-372, 465-510 (pool maxima), PlayerEntity.cs 362-440 (per-minute fatigue), 1196-1258, 1355-1436 (tally, RaiseSkills, mastery), 2378-2442 (exhaustion and forced rest), DaggerfallSkills.cs 135-150, 392-400, 485-547, WeaponManager.cs 405-425 (swing fatigue), CivilianEntity.cs 14, EnemyEntity.cs 48. Callers: RaiseSkills called from DaggerfallRestWindow.cs 731 and DaggerfallTravelPopUp.cs 380 (read by grep). NOT read: the body of `CalculateCastingCost` (2411-2589), `CalculateBackstabChance`, `CalculateRacialModifiers` (933-963), `Dice100` and `DFRandom` definitions, the career tables (SpellPointMultiplierValue, HitPointsPerLevel, AdvancementMultiplier per class), `ToHitModifier` callers (defined at FormulaHelper 102-109, not checked where used), the `SavingThrow(IEntityEffect)` overload body (1559-1572), `PlayerEntity` level-up bonus-pool caller, and the monster `EnemyEntity` stat set. Confidence: high on the to-hit, damage, saving-throw, tally and fatigue formulas (read in full); medium on which callers use `ToHitModifier`. Depth: full for the stat, hit, damage, save and advancement chain.

## 1. Mechanism

- **Attributes as a modifier table.** Each attribute maps to one small modifier by floor-divide: Strength to damage `floor((Str-50)/5)` (FormulaHelper 66-73), to encumbrance `floor(Str x 1.5)` (75-82); Agility to to-hit `floor(Agi/10)-5` (102-109); Endurance to HP and healing `floor(End/10)-5` (111-129); Willpower to magic resist `floor(Will/10)` (93-100); Intelligence to spell points `floor(Int x career multiplier)` (84-91). `MaxStatValue` returns 100 (131-138); where it is applied was not checked.
- **Pools.** Max fatigue = (Str + End) x 64, stored in 1/64 points (DaggerfallEntity 39, 262); the character sheet divides by 64 for display (DaggerfallCharacterSheetWindow 402). Max magicka = SpellPoints(Int, career multiplier) + a modifier, floored at 0 (DaggerfallEntity 475-492). Max health = 25 + career HP per level + one roll per level after the first (FormulaHelper 166-175). A health limiter caps max health at the smaller of the limiter and max (DaggerfallEntity 465-472).
- **Fatigue as a per-minute and per-action ledger.** Per in-game minute: 11 by default, 88 running, 22 climbing, 44 swimming (only on a failed swimming roll, not for Argonians); jumping costs 11 once per jump; athleticism multiplies loss by 0.9 and improved athleticism by 0.8; no loss while resting (PlayerEntity 109-113, 389-427). Each weapon swing costs 11 raw (WeaponManager 72, 420). `SetFatigue` clamps to 0..max and raises the exhausted event when fatigue reaches 0 with health above 0 (DaggerfallEntity 360-364).
- **Exhaustion is a forced rest, or death.** On exhaustion, with no enemies nearby and not swimming, the game advances one hour and adds one hour's health, fatigue and magicka recovery; otherwise health is set to 0 (PlayerEntity 2378-2441). The popup is not re-raised while it is open (2390-2391).
- **Rest recovery per hour.** Health: `max(1, floor(HealingRateModifier(End) + Medical' x maxHealth / 1000))`, Medical' = live Medical + 60 (100 with rapid healing in the right light or dark) (FormulaHelper 178-206). Fatigue: `max(1, floor(maxFatigue/8))` (209-216). Magicka: `max(1, floor(MaxMagicka/8))`, 0 if the career has no spell-point regen (219-229).
- **Hit chance (additive, then one roll).** `CalculateSuccessfulHit` starts from the weapon chance (the attacker's weapon skill, CalculateAttackDamage 592), adds the target armour value for the struck body part (808, 1158), the attacker enchantment modifier (814), the Luck difference /10 and the Agility difference /10 (1194-1197), minus the target's dodging /4 (1213), plus crit-strike /10 when a roll against the crit skill succeeds (1216-1218), plus 40 for a monster target (1242-1244), minus 50 (1248). It is clamped to 3..97 (825) and rolled against Dice100 (827). Weapon hits also add the weapon material modifier x 10 (1146, 679). Swing modifiers for the player: strike up -4 damage / +10 to hit, down-right -2/+5, down-left +2/-5, down +4/-10 (873-906). Expert proficiency: damage `level/3 + 1`, to-hit `+level` (908-931). Adrenaline rush: +5 (+8 improved) for an attacker below 1/8 health, -5 (-8) for a target below 1/8 (1163-1183).
- **Damage.** Weapon: random in [min, max] + DamageModifier(Str) + material modifier, floored at 0 (FormulaHelper 736-761). Hand-to-hand: random in [skill/10 + 1, skill/5 + 1] (440, 452), plus damage modifiers, plus the Str modifier for the player only (771-791). A monster with several attacks rolls each one through a reflex gate (`50 - 10 x (Reflexes - 2)` percent, 654) before the hit check (657).
- **Struck body part.** A 20-entry weighted table: part 0 at 10%, parts 1, 2 and 5 at 15% each, parts 3 and 4 at 20% each, part 6 at 5% (869-870). The hit damages the armour on that part, or the shield if it covers the part (1080-1118). Condition lost = `floor((10 x damage + 50) / 100)`, with a 20% chance of 1 when that is 0 (1123-1132).
- **Saving throw (the magic and mind resistance).** Start at 50 (1458). Race flags: resist +30, immune = 100, low tolerance -25, critical weakness -50 (1465-1475). Tolerance flags for the effect's type: immune +50, critical weakness -50, low tolerance -25, resistant +25 (1512-1519). Add biography and caller modifiers (1521). If the value is 100 or more it returns 0 (1526-1527). Add Will/10 (1530), clamp to 5..95 (1532). Roll d100: if roll > save the effect is 100% (1534-1537); if save - 20 <= roll <= save it is `100 - 5 x (save - roll)` percent (1540-1541); below that it is 0%. The effect amount is scaled by that percent (1580-1583). Elemental and disease resistance: only the first match of disease/poison, fire, frost, shock, magic is read (1654-1672; the comment at 1658 says so).
- **Skill use and advancement (a tally, checked periodically).** Each use adds an amount to a per-skill tally, clamped to 0..20000 (PlayerEntity 1243-1255). Advancement is checked by `RaiseSkills`, at most once per 360 classic minutes, and it is called from the rest window and the travel popup (1359-1370; DaggerfallRestWindow 731, DaggerfallTravelPopUp 380). For each skill: needed = `floor(skill x multiplier x career multiplier x 1.04^level x 2/5 + 1)` (FormulaHelper 319-327). The tally is scaled by reflexes: `1 - (Reflexes - 2)/8` (PlayerEntity 1377-1378). If effective uses reach needed, the tally is reset to 0 and the skill rises by 1 (1380-1386). Skills at 95 and above rise only if no primary skill is at 100 (1384, 1420-1433). The skill multiplier table is per skill (Medical 12, Running 50, Critical Strike 8, Dodging 4, blades, blunt, axe, hand-to-hand 2, archery 1, and so on; DaggerfallSkills 485-547).
- **Level from skill sum.** `floor((sum of level-up skill increases since start + 28) / 15)` (FormulaHelper 330-337). Recomputed on each skill raise (PlayerEntity 1388).
- **Hit points per level.** Roll in [career HP/2, career HP] (FormulaHelper 346-349) plus HitPointsModifier of permanent End (350), at least 1 (351-352). The bonus pool on level-up is a random 4 to 6 (140-153).
- **Pacification and pickpocket (social and thief stats).** Pickpocket = Pickpocket skill + 5 x (player level - target level), clamped 5..95 (FormulaHelper 254-267). Pacification: for Etiquette and Streetwise, skill/10 + Personality/5; for other languages, skill + Personality/10; +10 if the weapon is sheathed, -25 if drawn; add Comprehend Languages; success if a roll in 0..199 is below the chance (357-391). The pacification chance is not clamped.

## 2. Key functions

- Stat modifiers: `FormulaHelper.DamageModifier`, `MaxEncumbrance`, `SpellPoints`, `MagicResist`, `ToHitModifier`, `HitPointsModifier`, `HealingRateModifier`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Formulas/FormulaHelper.cs` 66-129.
- Pool recovery: `CalculateHealthRecoveryRate`, `CalculateFatigueRecoveryRate`, `CalculateSpellPointRecoveryRate`: same file 178-229.
- Hit: `CalculateSuccessfulHit` 796-828; to-hit terms 1140-1251; monster reflex gate in `CalculateAttackDamage` 654-657.
- Damage: `CalculateAttackDamage` 538-723; `CalculateWeaponAttackDamage` 730-769; `CalculateHandToHandAttackDamage` 771-791; `CalculateHandToHandMin/MaxDamage` 434-453.
- Save: `SavingThrow` 1443-1547; effect scaling 1575-1584; resistance read 1654-1672.
- Advancement: `CalculateSkillUsesForAdvancement` 319-327; `CalculatePlayerLevel` 330-337; `PlayerEntity.RaiseSkills` 1359-1388; `AlreadyMasteredASkill` 1420-1434; `TallySkill` 1243-1257.
- Fatigue: `DaggerfallEntity.SetFatigue` / `DecreaseFatigue` 340-367; `PlayerEntity` per-minute loss 362-437; exhaustion and forced rest 2378-2442; swing cost `WeaponManager` 419-420.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Attribute to modifier by floor-divide table | `floor((Str-50)/5)`, `floor(Agi/10)-5`, `floor(End/10)-5`, `floor(Will/10)` (FormulaHelper 72, 108, 117, 99) |
| Additive to-hit with a 3..97 clamp and one roll | Clamp 3, 97 (825); constant -50 (1248); monster +40 (1244) |
| Use-tally advancement, checked on rest or travel | 360-minute gate (1367); uses times 1.04^level x 2/5 + 1 (326); reflex scale (1377) |
| Fixed-point ledger for fractional costs | Multiplier 64 (DaggerfallEntity 39); 11 raw per swing (WeaponManager 72) |
| Prorated saving throw | 50 base (1458); clamp 5..95 (1532); 5 per point below the save (1541) |
| Weighted hit location | 20 entries, 10/15/15/20/20/15/5 percent (869) |

### 3b. Stat table (SK focus: name | what it does | formula | number ranges | caps | file:line)

| name | what it does | formula | number ranges | caps | file:line |
|---|---|---|---|---|---|
| Strength to damage | Adds to weapon damage | floor((Str - 50) / 5) | Str 25: -5; Str 100: +10 | none read | FormulaHelper.cs:66-73, 755 |
| Strength to encumbrance | Carry limit | floor(Str x 1.5), plus weight allowance | Str 100: 150 | none read | FormulaHelper.cs:75-82; DaggerfallEntity.cs:501-508 |
| Agility to to-hit | Modifier | floor(Agi / 10) - 5 (caller not checked) | Agi 0 to 100: -5 to +5 | none | FormulaHelper.cs:102-109 |
| Agility difference | Hit chance term | (attacker Agi - target Agi) / 10 | about -10 to +10 | inside the 3..97 clamp | FormulaHelper.cs:1197 |
| Luck difference | Hit chance term | (attacker Luck - target Luck) / 10 | about -10 to +10 | inside the 3..97 clamp | FormulaHelper.cs:1194 |
| Endurance to HP | HP per level-up | floor(End / 10) - 5, added to a roll | End 50: 0 | HP per level at least 1 | FormulaHelper.cs:111-118, 350-352 |
| Endurance to healing | Health per rest hour | same as HP term | End 50: 0 | rate at least 1 | FormulaHelper.cs:120-129, 205 |
| Willpower to magic resist | Adds to saving throw | floor(Will / 10) | Will 100: +10 | save clamped 5..95 | FormulaHelper.cs:93-100, 1530 |
| Intelligence to spell points | Magicka max | floor(Int x career multiplier) | career multiplier (not read) | modifier can lower it, floored at 0 | FormulaHelper.cs:84-91; DaggerfallEntity.cs:475-492 |
| Max stat | Stat ceiling | 100 | 100 | 100 | FormulaHelper.cs:131-138 |
| Max fatigue | Stamina pool | (Str + End) x 64 raw | Str+End 100: 6400 raw (100 shown) | clamped 0..max | DaggerfallEntity.cs:39, 262, 362 |
| Max health | HP pool | 25 + career HP per level + per-level rolls | career HP not read | limiter takes the smaller | FormulaHelper.cs:160-175; DaggerfallEntity.cs:465-472 |
| HP per level-up | Growth | roll in [career/2, career] + End term, at least 1 | career HP not read | min 1 | FormulaHelper.cs:340-354 |
| Bonus pool | Points to spend on level-up | random 4 to 6 | 4-6 | none | FormulaHelper.cs:140-153 (seeded at 151) |
| Level | Character level | floor((skill sum since start + 28) / 15) | +1 level per 15 level-up skill points | none read | FormulaHelper.cs:330-337; PlayerEntity.cs:1388 |
| Fatigue loss, idle minute | Stamina drain | 11 raw per minute (x 0.9 or 0.8 with athleticism) | 9 to 11 | clamped at 0 | PlayerEntity.cs:109, 389-405 |
| Fatigue loss, running | Stamina drain | 88 raw per minute (x athleticism) | 70 to 88 | clamped at 0 | PlayerEntity.cs:111, 408-409 |
| Fatigue loss, climbing | Stamina drain | 22 raw per minute | 18 to 22 | clamped at 0 | PlayerEntity.cs:110, 406-407 |
| Fatigue loss, swimming | Stamina drain | 44 raw per minute on a failed swim roll (not Argonian); 11 otherwise | 11 or 44 | clamped at 0 | PlayerEntity.cs:112, 410-416 |
| Fatigue loss, jump | Stamina drain | 11 raw per jump (x athleticism) | 9 to 11 | clamped at 0 | PlayerEntity.cs:113, 424-429 |
| Swing fatigue | Stamina per attack | 11 raw per swing | 11 | clamped at 0 | WeaponManager.cs:72, 420 |
| Exhaustion | Out of stamina | fatigue <= 0 and health > 0 raises the event | threshold 0 | n/a | DaggerfallEntity.cs:360-364 |
| Forced rest | Recovery on exhaustion | 1 hour; if no enemies and not swimming, add one hour's rates, else health = 0 | 1 hour | n/a | PlayerEntity.cs:2426-2441 |
| Health per rest hour | Health regen | max(1, floor(End term + (Medical + 60) x max / 1000)) | Medical 0-100 | at least 1 | FormulaHelper.cs:178-206 |
| Fatigue per rest hour | Stamina regen | max(1, floor(max fatigue / 8)) | raw units | at least 1 | FormulaHelper.cs:209-216 |
| Magicka per rest hour | Spell regen | max(1, floor(MaxMagicka / 8)); 0 if no regen | raw units | at least 1 | FormulaHelper.cs:219-229 |
| Hit chance | Whether a swing lands | clamp(skill + armour + enchant + 10 x material + Luck term + Agi term - dodge/4 + crit + monster 40 - 50 + swing + proficiency + ..., 3, 97) | 3 to 97 | clamp 3..97 | FormulaHelper.cs:796-827, 1140-1251 |
| Crit strike | Bonus to hit | if roll vs crit skill succeeds, + crit skill / 10 | 0 to 10 | none | FormulaHelper.cs:1216-1218 |
| Adrenaline rush | Desperation to-hit | +5 (+8 improved) attacker, -5 (-8) target, when HP < max/8 | +/-5 or 8 | none | FormulaHelper.cs:1163-1183 |
| Swing modifiers | Swing direction | up: -4 dmg, +10 hit; down-right: -2, +5; down-left: +2, -5; down: +4, -10 | as listed | player only | FormulaHelper.cs:873-906 |
| Proficiency | Expert weapon | damage level/3 + 1; to-hit + level | depends on level | none read | FormulaHelper.cs:908-931 |
| Weapon damage | Per hit | random[min, max] + DamageModifier(Str) + material mod, floored at 0 | from the weapon record | none read | FormulaHelper.cs:730-769 |
| Hand-to-hand damage | Bare hands | random[skill/10 + 1, skill/5 + 1] + mods (+ Str for player) | 11 to 21 at skill 100 | none read | FormulaHelper.cs:434-453, 771-791 |
| Struck body part | Hit location | 20-entry weighted table | parts 0-6 | none | FormulaHelper.cs:863-870 |
| Condition loss per hit | Armour and weapon wear | floor((10 x damage + 50) / 100); 20% chance of 1 when 0 | ~0 to 10% of damage | none read | FormulaHelper.cs:1123-1132 |
| Saving throw | Resist magic or poison | 50 + race + tolerance + biography + modifier; >= 100 immune; + Will/10; clamp 5..95; prorated | 5 to 95 | immune only when >= 100 before resist | FormulaHelper.cs:1443-1547 |
| Element and disease resistance | Per-element resist | first match of disease/poison, fire, frost, shock, magic | the target's live value | none read | FormulaHelper.cs:1654-1672 |
| Pickpocket | Steal | Pickpocket skill + 5 x (player level - target level) | 5 to 95 | clamp 5..95 | FormulaHelper.cs:254-267 |
| Pacification | Talk down an enemy | etiquette/streetwise: skill/10 + Pers/5; others: skill + Pers/10; +10 sheathed, -25 drawn; success if roll 0..199 < chance | 0 to about 200 | none (see gaps) | FormulaHelper.cs:357-391 |
| Live skill value | Effective skill | permanent + effect modifier, no clamp (TODO) | 0 to about 100 | none | DaggerfallSkills.cs:135-143 |
| Skill use tally | Uses toward advancement | += amount, clamp 0..20000 | 0 to 20000 | 20000 | PlayerEntity.cs:1243-1255 |
| Skill uses needed | Uses per +1 | floor(skill x mult x career x 1.04^level x 2/5 + 1) | depends on skill | none | FormulaHelper.cs:319-327; DaggerfallSkills.cs:485-547 |
| Reflex scale | Speeds up advancement | 1 - (Reflexes - 2) / 8 | 1 - (r-2)/8 | none read | PlayerEntity.cs:1377-1378 |
| Advancement check | When skills rise | once per 360 classic minutes, from rest or travel | 360 minutes | one +1 per check | PlayerEntity.cs:1359-1388; DaggerfallRestWindow.cs:731; DaggerfallTravelPopUp.cs:380 |
| Skill cap and mastery | Top of the ladder | 100; 95 to 100 only if no primary skill is at 100 | 100 | one primary at 100 | PlayerEntity.cs:1384, 1420-1434 |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for the stat table, the to-hit sum and clamp, weapon and hand-to-hand damage, fatigue decrease, skill-uses formula, reflex scale, the saving throw with the band prorate, and the forced-rest recovery. It omits the swing, proficiency, racial, backstab and adrenaline terms of the to-hit sum, the Dice100 roll itself, the exhausted-event health check, the stat-based pacification and pickpocket chances, the mastery gate, the level-up HP bonus pool, and the armour and condition effects. Donor integer division is kept with `Math.trunc`. Fix D3 (the excess uses are carried, where the donor resets the tally to 0) is applied in `checkAdvance`; fix D1/D2 (no frame-count seeding) is applied by taking the random source as a parameter.

```ts
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
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 /tmp/sk001-daggerfall-stats.ts` run on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/stats.ts` (new module, shared with the OpenMW note): stat-to-modifier table, hit chance, weapon and hand-to-hand damage, saving throw, skill advancement, rest recovery. Parity-checklist row 21 (catalogue fields): the 3b table is the catalogue source.
- Server-side: every rule here is deterministic once the RNG is passed in, so the hit roll, save and advancement check can be server-verified. Fixes D1 and D2 are needed for that.
- Reuse tag: adapt (MIT: code may be adapted with the notice kept; this sketch is a fresh re-expression)
- Brief rule served: one engine (one hit and one save function, called by every client); tunable numbers as data; server-verified kills (the roll takes an RNG parameter).

## 6. Gaps and risks

- **D1, bonus pool seeded from frame count.** FormulaHelper.cs 151 calls `UnityEngine.Random.InitState(Time.frameCount)` on each roll, so the 4-6 pool depends on frame timing. Fix: a server RNG stream per level-up event.
- **D2, HP roll seeded from rendered frame count.** FormulaHelper.cs 348 sets `DFRandom.Seed = (uint)Time.renderedFrameCount`. Same fix.
- **D3, advancement drops the excess.** PlayerEntity.cs 1382 sets the tally to 0, so the uses beyond the need are lost. Fix: subtract the need (the sketch does this).
- **D4, one +1 per check.** A long gap (the check runs at most once per 360 minutes) gives one level, even with a large tally (1386 once per skill). This may be a classic rule, not a bug. Decide: keep it, or loop while uses remain.
- **D5, monster reflex gate reads the player.** FormulaHelper.cs 654 uses `player.Reflexes` even when the target is not the player. Fix: use the target's reflexes or a monster reflex value.
- **D6, null cast on a weapon hit.** FormulaHelper.cs 740 reads `(target as EnemyEntity).CareerIndex` when the target is not the player. CivilianEntity derives from DaggerfallEntity, not EnemyEntity (CivilianEntity.cs 14), so a civilian target would make this null. NOT run: read only. Fix: `target is EnemyEntity` guard.
- **D7, null read in the to-hit adjustments.** FormulaHelper.cs 1242 reads `AITarget.EntityType` when the target is not the player, and `AITarget` is null for a civilian target. NOT run: read only. Fix: null-check before the read. For a civilian target D7 throws first (it runs before the weapon damage code), so D6 is a second guard to add rather than an independent crash path; both need a test.
- **D8, dodging comment and code disagree.** The comment at FormulaHelper 1211-1212 says classic used the attacker's dodging and that DF Chronicles says dodging/10; the code reads the target's dodging and divides by 4 (1213). Keep the idea (dodging lowers hit chance); document one rule and test it.
- **D9, pacification has no clamp and logs every call.** FormulaHelper 382-389: no clamp on the chance and a `Debug.LogFormat` in every call. Fix: clamp as the other chances are (5..95) and log behind a debug flag.
- **D10, live skill is unclamped.** DaggerfallSkills.cs 138-140: the TODO says there is no clamp. Fix: clamp 0..100 at the read.
- **D11, integer truncation.** Health recovery (FormulaHelper 205), condition loss (1130) and skeletal halving (744) use integer division. Small. Fix: compute in float and round once.
- **Open: where `ToHitModifier` is used.** The Agility modifier (102-109) is defined, but the hit sum reads the Agility difference /10 (1197). The caller of `ToHitModifier` was not checked. It may be dead code; confirm before adopting it as a catalogue field.
- **Open: exhaustion with enemies near is death.** PlayerEntity.cs 2441 sets health to 0 when a player is exhausted with enemies nearby or swimming. Frankendom's stamina economy can use the same trigger with a knockdown instead of death (zone data for the rule).
- Casting cost, backstab and racial modifiers were not read. Career values (spell multiplier, HP per level, advancement multipliers per class) are in career data, not read.

Best transferable idea: a saving throw that prorates the effect in a band just below the roll (100 minus 5 per point below the save), with immunity checked before the resist term, so partial resistance is a curve rather than all-or-nothing.

Decision (proposed): adapt — take the prorated save curve and the stat-to-modifier table as data; fix D1 and D2 (no frame-count seeding; the RNG is passed in), D3 (carry excess uses), and D6/D7 (null guards); drop the one-level-per-check rule unless playtests want it.

Acceptance: a caster with Will 60 facing a mind effect has a save of 50 + 6 = 56; a roll of 60 gives 100 percent of the effect, a roll of 40 gives 20 percent, and a roll of 30 gives 0 percent; a server test asserts those three values with the RNG injected.

Reuse tag: adapt (MIT: code may be adapted with the notice kept; this sketch is a fresh re-expression)
Brief rule served: one engine (one save and one hit function called by every client); tunable numbers as data; server-verified outcomes (RNG injected, no frame-count seeds).

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
- No false claims found; all numbers and line ranges verified against the donor.
- Missed (confirmed in code): SavingThrow first rolls active magical resistance-effect flags before the 50 base (FormulaHelper.cs 1449-1455: HasResistanceFlag, then GetResistanceChance, a Dice100 success returns 0); the saving-throw bullet above starts at the 50 base (1458) and omits this early-out. Add a resistance-effect check first when porting.
- Missed (confirmed): the exhaustion forced-rest branch also tallies Medical by 1 (PlayerEntity.cs 2438).
