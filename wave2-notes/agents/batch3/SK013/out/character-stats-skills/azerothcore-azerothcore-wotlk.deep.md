# azerothcore-azerothcore-wotlk (character-stats-skills, cell 21)

Donor: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Entities/Player/PlayerUpdates.cpp` | Licence: GPL-2.0 (LICENSE file: "GNU GENERAL PUBLIC LICENSE Version 2, June 1991"; copyleft, shape only) | C++ | symbol `Player::UpdateSkillPro`

Checked: Symbol `Player::UpdateSkillPro` is at PlayerUpdates.cpp 937-1010 (read in full). Also read in full: the gather and craft chance functions (755-788, 806-886), fishing (889-928), combat skill-up (1054-1090), skills-on-level-up (1108-1155); `GetSkillRangeType` (ObjectMgr.cpp 9712-9738); stat and armour code (StatSystem.cpp 97-135, 269-310; Unit.cpp 2229-2299, 11353-11469, 11787-11801); crit, dodge and talent code (Player.cpp 5270-5356, 13964-13986); XP (Formulas.cpp 27-90). Confidence: high on the skill-up order and the armour formula (read end to end, all callers of the armour function not checked). Medium on the crowd-control ladder: the caller that increments it (Spell.cpp near 3266) was not read, and the ladder's `stack` field was not read. Not read: weapon damage, block and parry values, armour per slot, durability, hit location, luck (not present in what was read), the per-class base stat table (not located), `Player::GiveXP` caller, `UpdateCombatSkills` callers. camera_scope: not applicable.

Best transferable idea: One roll per use against a chance band chosen by how far the skill sits below the thing being used, plus a hard cap of 5 x level on every skill, is a small data-driven progression rule that a fast MMO can run per action.
Decision (proposed): adapt - keep the band-and-cap shape for skill rows (gather, craft, combat) and the one-roll-per-use rule; change the roll to the engine's seeded stream so the server and a replay agree; express chances as plain percent rows instead of tenths.
Acceptance: A server test: at level 10 with skill 50 (cap 50) a use gives no gain; a gather node at required level 100 with a skill of 160 uses the green band (25%) from its row; at 130 it uses the yellow band (75%); the same seed over 1000 uses gives the same skill values on two runs.

## 1. Mechanism

Skill-up is use-based. Every use calls one chance function, which hands a chance to `UpdateSkillPro(skill, chance, step)`. That function makes exactly one roll.

Order inside `UpdateSkillPro` (937-1010), as the code runs:
(a) return false if the skill id is 0 or a script refuses; (b) return false if chance <= 0; (c) find the skill row; return false if missing or being deleted; (d) read value and max from one packed field; (e) return false if max or value is 0, or value >= max (a skill at 0 never rises; it must be learned first); (f) trial accounts stop at a trade-skill cap when that config is set (969-971); (g) roll `irand(1, 1000)`; success when roll <= chance, where chance is in tenths of a percent (973-975); (h) new value = min(value + step, max) (977-981); (i) if the step crosses 75, 150, 225, 300, 375 or 450, learn the rewarded spells for the first band crossed, then stop looking (985-992); (j) enchantment update and achievement hook (994-995); (k) return true. A miss returns false with no change.

Chance functions (what feeds the roll):
- Gather skills (herbalism, lockpicking, jewelcrafting, inscription, skinning, mining): `SkillGainChance(skill, red+100, red+50, red+25)` with red = the node's required level. Skill >= red+100 gives the grey setting; >= red+50 the green setting; >= red+25 the yellow setting; otherwise the orange setting. Defaults in percent: orange 100, yellow 75, green 25, grey 0 (config 2380-2383). Values are multiplied by 10 for the roll, then multiplied again by the `Multiplicator` argument (default 1; 2 when skinning an elite creature, SpellEffects.cpp 5145), so chance = SkillGainChance x Multiplicator. For skinning and mining the shift by (skill / steps) is applied after that multiplication.
- Skinning and mining can decay with skill: chance is shifted right by (skill / steps) when the steps config is non-zero. Default steps = 0, so the decay is off.
- Crafting (per craft spell): linear interpolation. Orange at the yellow threshold, grey at the grey threshold, green is the midpoint (50% at defaults). Thresholds come from the spell's skill-line row.
- Fishing: no per-node data. Chance = 100 / d percent, d taken from fixed bands on the fishing skill; stops at the max.
- Combat weapon and defence (`UpdateCombatSkills`): cap = 5 x level; the mob level is capped at level+5; lvldif = max(3, mob - grey(level)); chance = 3 x lvldif x (cap - skill) / level; the weapon version adds 2% of chance per point of intellect; minimum 1%; then one roll. The defence version has no intellect term. Patch comment says immune mobs do not train weapons (1072), but the code read does not test immunity.

Level-up: `UpdateSkillsForLevel` (1108-1155) touches only level-range skills (not tiered rank rows, not armour, not languages). Their max becomes 5 x level, but skills whose current max is 1 are skipped (the level-dependent test is `max != 1`), and unless always-max applies the max is only rewritten when it differs from the config maximum (value kept, max replaced). If the config `AlwaysMaxSkillForLevel` or the row flag `SKILL_FLAG_ALWAYS_MAX_VALUE` is set, the value jumps to the max.

Stats, in short (full table in section 3): stamina gives health, intellect gives mana, agility gives armour and crit and dodge, armour turns into a damage reduction fraction capped at 75%, talent points are level minus 9, XP per kill follows a band table with a level-difference term.

## 2. Key functions

- `Player::UpdateSkillPro`: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Entities/Player/PlayerUpdates.cpp` 937-1010. The whole skill-up pipeline (steps a-k above).
- `SkillGainChance` (band function, from 755) and `CraftSkillGainChance` (linear, from 767; interpolation at 785).
- `Player::UpdateGatherSkill` switch: same file (returns at 808 for herbalism, lockpicking, jewelcrafting, inscription; 815 and 822 skinning; 832 and 839 mining).
- `Player::UpdateCraftSkill`: same file, return at 878 (uses `CraftSkillGainChance`).
- `getProbabilityOfLevelUp` and `Player::UpdateFishingSkill`: same file, 889-926 (bounds 901, density divisor 907, max check 916, call 924-926).
- `Player::UpdateCombatSkills`: same file, 1054-1090 (cap 1058, skill-diff check 1063, mob cap 1074, chance 1085, intellect term 1088).
- `Player::UpdateSkillsForLevel`: same file, 1108-1155 (range check 1128, always-max flag 1141).
- `GetSkillRangeType`: `.../src/server/game/Globals/ObjectMgr.cpp` 9712-9738 (tiered -> RANK at 9720; default LEVEL at 9738).
- `Unit::CalcArmorReducedDamage`: `.../src/server/game/Entities/Unit/Unit.cpp` 2229-2299.
- `Unit::GetDiminishing` and `Unit::IncrDiminishing` and `Unit::ApplyDiminishingToDuration`: same file, 11353-11469 (IncrDiminishing starts at 11379). The 15 s clock `hitTime` is refreshed on the apply/remove path (about 11481-11487, when the last aura of the group is removed and stack reaches 0), not inside IncrDiminishing.
- `Player::UpdateStats`, `Player::UpdateArmor`, `GetHealthBonusFromStamina`, `GetManaBonusFromIntellect`: `.../src/server/game/Entities/Unit/StatSystem.cpp` 97-135, 269-283, 293-310.
- `Unit::GetTotalStatValue`: Unit.cpp 11787-11801.
- `Player::GetMeleeCritFromAgility`, dodge table (5287-5330, partly read), `Player::GetSpellCritFromIntellect`, `Player::CalculateTalentsPoints`: `.../src/server/game/Entities/Player/Player.cpp` 5270-5356, 13964-13986.
- `Acore::XP::BaseGain` and `Acore::XP::Gain`: `.../src/server/game/Miscellaneous/Formulas.cpp` 27-90.

## 3. Numbers vs mechanism

Skills are TABLE-DRIVEN for identity and eligibility, and CODE-DRIVEN for the gain rule (see the as-data block below). Stat and skill rows (name | what it does | formula | number ranges | caps | file:line):

| name | what it does | formula | number ranges | caps | file:line |
|---|---|---|---|---|---|
| Health from stamina | adds max health | first 20 stamina 1:1, then 10 health per point above 20 | stamina 0 up; e.g. 30 stamina gives 120 | none in this function (base health table not read) | StatSystem.cpp 293-300; used at 319 |
| Mana from intellect | adds max mana | first 20 intellect 1:1, then 15 mana per point above 20 | intellect 0 up | none in this function | StatSystem.cpp 303-310; used by Player::UpdateMaxPower in the same file (mana only) |
| Armour from agility | armour value | +2 armour per agility point, plus item and aura armour | agility 0 up | none in this function | StatSystem.cpp 269-283 (line 275) |
| Stat total | every stat, base and modified | ((base + flat base) x base pct + flat total + extra) x total pct; 0 if total pct <= 0 | not read per class | total pct > 0 | Unit.cpp 11787-11801 |
| Armour damage reduction | fraction of a physical hit removed | A = victim armour; x = 0.1 x A / (8.5 x L + 40); r = x / (1 + x); damage out = ceil(damage x (1 - r)); L = attacker level, plus 4.5 x (L - 59) above 59 | L 1 to 80 (level cap, config 2125) | r <= 0.75 (hard) | Unit.cpp 2229-2299 (lines 2288, 2291, 2292, 2296, 2299) |
| Armour penetration (player attackers) | removes part of the victim's armour before the formula | maxPen = 400 + 85 x Lv (Lv < 60) or 400 + 85 x Lv + 4.5 x 85 x (Lv - 59); pen = maxPen x (bonus % + rating); armour -= min(pen, maxPen), with maxPen first capped at min((A + maxPen) / 3, A) | Lv = victim level | maxPen <= (A + maxPen) / 3 and <= A | Unit.cpp 2276-2280 |
| Melee crit from agility | crit chance | (class base + agility x class-level ratio) x 100 percent; ratios from GT tables | GT tables per class and level (values not read) | level clamped to GT_MAX_LEVEL | Player.cpp 5270-5284 (line 5283) |
| Spell crit from intellect | spell crit chance (magic) | (class base + intellect x class-level ratio) x 100 percent | GT tables (values not read) | same clamp | Player.cpp 5340-5356 (line 5353) |
| Dodge from agility | dodge chance | class base from an 11-entry table (warrior 0.036640 ... druid 0.056097) plus a crit-to-dodge multiplier per class, each written as a value / 1.15 (comment: 3.2.0 raised the agility requirement 15%) | class table | not read beyond 5330 | Player.cpp 5287-5330 (partly read; 5304 comment) |
| Max skill for a unit | cap on every skill | 5 x level (level of the target for combat) | 5 to 400 at the level 80 cap | hard | Unit.h 1212 |
| Skill range type | which rules a skill follows | tiered (SkillTierID row) -> RANK; runeforging and armour category -> MONO; languages; otherwise LEVEL | enum | not a number | ObjectMgr.cpp 9712-9738 |
| Use-based skill-up | the chance to gain 1 skill point per use | one roll 1..1000 <= chance (tenths of percent); value += step, capped at max | step config 1 per weapon/crafting/gather; chance 0 to 1000 | max (row) | PlayerUpdates.cpp 937-995 (973, 975, 977) |
| Gather band chance | chance per gather use | skill >= red+100: grey; >= red+50: green; >= red+25: yellow; else orange; x10 for roll | defaults orange 100, yellow 75, green 25, grey 0 (percent) | red = node level (per node) | PlayerUpdates.cpp 755-765, 809; worldserver.conf.dist 2380-2383 |
| Craft chance | chance per craft | greyC + trunc((grey - skill) x (orange - greyC) / (grey - yellow)); orange at yellow, grey at grey | greys/yellows per recipe row; default green 50% midpoint | malformed rows fall back to step | PlayerUpdates.cpp 767-785 (line 785) |
| Skinning / mining decay | chance halves per step of skill | chance >> (skill / steps) when steps > 0 | steps default 0 (off) | none | PlayerUpdates.cpp 814-839 (lines 814, 815, 832, 839); worldserver.conf.dist |
| Fishing chance | chance per click | 100 / d percent, d = 1 (<=115), 2 (116-135), 3 (136-160), 4 (161-190), 5 (191-215), 6 (216-295), 9 (296-315), 10 (316-355), 11 (356-425), 12 (426-450), 1 (>450, unreachable at cap 400) | fixed bands | fishing stops at max (5 x level) | PlayerUpdates.cpp 889-926 (901, 907, 916, 926) |
| Combat skill-up chance | chance per qualifying exchange (trigger not read) | c = 3 x lvldif x (5L - skill) / L; lvldif = max(3, min(mob, L+5) - grey(L)); weapon: c += c x 0.02 x INT; min 1% | mob level up to L+5 | skill >= 5L gives nothing | PlayerUpdates.cpp 1054-1090 (1058, 1063, 1074, 1085, 1088) |
| Rewarded spells on band | learn spells when a skill passes a band | bands 75, 150, 225, 300, 375, 450; first band crossed only | 6 bands | none | PlayerUpdates.cpp 933, 985-992 |
| Trial trade-skill cap | caps trial accounts | value >= cap blocks the roll; cap 0 disables | config | the cap | PlayerUpdates.cpp 969-971 |
| Level-up skill refresh | max set to 5 x level | range LEVEL only; skills with max == 1 skipped; always-max flag or config sets value = max, else max rewritten only when != config max | config AlwaysMaxSkillForLevel 0 (off) | 5 x level | PlayerUpdates.cpp 1108-1155 (1128, 1141); worldserver.conf.dist 1664 |
| XP per kill, mob below player level | XP per kill | (5 x L + B) x (ZD + M - L) / ZD when M > grey(L); 0 otherwise; B = 45 (1-60), 235 (61-70), 580 (71-80) | ZD = zero-difference (not read) | level cap 80 (config 2125) | Formulas.cpp 57-66 (line 63), 27-41 (band lines 34, 38, 41) |
| XP per kill, mob at or above player level | XP per kill | ((5 x L + B) x (20 + min(M-L, 4)) / 10 + 1) / 2 | level difference capped at 4 | cap via the same bands | Formulas.cpp 49-55 (line 55) |
| Elite multiplier | XP | x 2 for elites | 2.0 | none | Formulas.cpp 89-90 (line 89) |
| XP curve | XP needed per level | row per level: Level (tinyint unsigned), Experience (int unsigned); level 1 = 400, level 2 = 900 | rows 1 to 80 | cap MaxPlayerLevel 80 | data/sql/base/db_world/player_xp_for_level.sql 23-25, 37-38 |
| Talent points | talent points per level | max(0, L - 9) x RATE_TALENT, plus `m_extraBonusTalentCount` before the rate; a Death Knight on the Ebon Hold map instead gets (L-55 if L>=56, plus quest-reward talent count), capped by the base | L 10 gives 1 point; L 80 gives 71 x rate | rate config | Player.cpp 13964-13986 (13966, 13986) |
| Crowd-control ladder | duration multiplier per repeat application, per target and group | state 0: x1; 1: x0.5; 2: x0.25; 3: immune (x0). Player-type groups only. Taunt (creature flag): x1, x0.65, x0.4225, x0.274625, immune | 4 states | reset after 15000 ms since last hit (only when `stack == 0`) | Unit.cpp 11353-11376, 11393-11468 (11367, 11427, 11433, 11455, 11458, 11468) |
| PvP crowd-control duration limit | caps CC length vs players | if caller passes a limit and the target is a player (or flagged creature) and the source is a player: duration = limit | limit passed by caller (the 10 s is in a comment, 2.2.0) | limit | Unit.cpp 11403-11412 (11412) |
| Ladder enum values | immune and level 4 share value 3 | IMMUNE = 3 and LEVEL_4 = 3; TAUNT_IMMUNE = 4 | enum | not a number | Unit.h 270-277 (275, 276) |

Not read, so not in the table: block and parry values and their strength or agility links, weapon damage ranges, armour per slot and durability, hit location, carry weight or encumbrance, luck (absent from what was read), stamina as an action cost (WoW combat has no stamina bar; energy, rage and runic power are class powers, not read), poise and stagger, persuasion and other social skills (absent from what was read).

As-data shape:
- Skill identity rows (DBC). SkillLine: id (uint32), categoryId (int32), name[16] (localized), spellIcon (uint32), canLink (uint32) (DBCStructure.h 1618-1631). SkillRaceClassInfo: SkillID (uint32), RaceMask (uint32), ClassMask (uint32), Flags (uint32; SKILL_FLAG_ALWAYS_MAX_VALUE), SkillTierID (uint32) (1604-1614; MinLevel and SkillCostIndex commented out).
- Craft bands come from the spell's SkillLineAbility row: SkillLine, TrivialSkillLineRankHigh (grey threshold), TrivialSkillLineRankLow (yellow threshold), as used in UpdateCraftSkill. The struct itself was not read (fields as used in code).
- Level curve: player_xp_for_level (Level tinyint unsigned, Experience int unsigned).
- Server knobs: SkillChance.Orange/Yellow/Green/Grey, SkillGain.Crafting/Defense/Gathering/Weapon, SkillChance.MiningSteps/SkinningSteps, AlwaysMaxSkillForLevel, MaxPlayerLevel (worldserver.conf.dist).
- Per-character state: each skill is one packed uint32 (value and max in one field; `SKILL_VALUE(data)`, `SKILL_MAX(data)`).
- A new skill is one row: YES for a plain level-range skill (one SkillLine row plus one SkillRaceClassInfo row). A new gain RULE is one row: NO. The gain rule is picked by a code switch on the skill id (UpdateGatherSkill 806-846) or hard-coded (fishing 889-928, combat 1054-1090), so a new rule is code.
- The ladder percentages (1.0, 0.5, 0.25, 0), the 15000 ms window, the 3 x lvldif formula, the 0.75 armour cap, the 0.02 per intellect and the 5 x level cap are constants in code. Not data in this donor.

Provenance: all of the above is from `azerothcore-azerothcore-wotlk` (GPL-2.0 LICENSE in the repo root; no commit hash recorded; the VPS copy has no .git directory). Shape only.

What they patched later (no git history on the VPS copy; these are the in-code history markers, all read):
- "Patch 3.0.8 (2009-01-20): You can no longer skill up weapons on mobs that are immune to damage." (PlayerUpdates.cpp 1072). The immunity test itself is not in the lines read.
- "3.2.0 increased required agility by 15%" (Player.cpp 5304): the dodge table was rescaled.
- "Duration of crowd control abilities on pvp target is limited by 10 sec. (2.2.0)" (Unit.cpp 11403).
- "xinef: dont apply diminish to self casts" (Unit.cpp 11395), directly above a test that does not check for self-casts (11396).

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order for one attempt: no roll when chance <= 0, skill 0, cap 0 or skill at cap; one roll; then step with the cap; the first rewarded band crossed (the donor stops at the first). It omits the script hooks, the trial-account cap, the enchantment update, the achievement hook, the packed skill field, the skinning and mining step decay, the donor's early exit on a missing row, and the caller order for the ladder (the ladder increment site was not read). The combat sketch gives percent (the donor's roll-to-tenths conversion is left to the caller). The ladder sketch omits the taunt table, the creature flags and the caster-owner checks, and takes the PvP limit as an argument that the caller sets.

```ts
// Licence: GPL-2.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
// Chances are in tenths of a percent (0..1000), as in the donor: a roll of 1..1000 succeeds when roll <= chance.
type Roll = () => number; // returns an integer 1..1000; the engine supplies a seeded stream (not Math.random)

interface Chances { orange: number; yellow: number; green: number; grey: number; } // percent, per data row
interface SkillRow { value: number; max: number; step: number; }

// Gather band: thresholds are relative to the node's required level (red).
// mult is the donor Multiplicator (1 normally, 2 for elite skinning); the result is chance x mult.
function gatherChance(skill: number, red: number, c: Chances, mult = 1): number {
  if (skill >= red + 100) return c.grey * 10 * mult;
  if (skill >= red + 50) return c.green * 10 * mult;
  if (skill >= red + 25) return c.yellow * 10 * mult;
  return c.orange * 10 * mult;
}

// Craft band: linear from orange at the yellow threshold to grey at the grey threshold.
function craftChance(skill: number, grey: number, yellow: number, c: Chances): number {
  const orange = c.orange * 10;
  const greyC = c.grey * 10;
  if (grey <= yellow) return skill < grey ? orange : greyC; // malformed row: no interpolation
  if (skill <= yellow) return orange;
  if (skill >= grey) return greyC;
  return greyC + Math.trunc(((grey - skill) * (orange - greyC)) / (grey - yellow));
}

// Fishing: probability 100 / d percent per click, d from fixed bands (donor truncates to whole percent, then x10).
const FISH_BOUNDS = [115, 135, 160, 190, 215, 295, 315, 355, 425, 450];
const FISH_DENS = [1, 2, 3, 4, 5, 6, 9, 10, 11, 12, 1];
function fishingChance(skill: number): number {
  if (skill === 0) return 0;
  let i = FISH_BOUNDS.findIndex((b) => skill <= b);
  if (i < 0) i = FISH_BOUNDS.length;
  return Math.trunc(100 / FISH_DENS[i]) * 10;
}

// Combat skill-up (weapon or defence) chance in percent, from the donor's UpdateCombatSkills arithmetic.
function combatSkillChance(playerLevel: number, skill: number, mobLevel: number, greyLevel: number, intellect: number, defence: boolean): number {
  const max = 5 * playerLevel;
  const diff = max - skill;
  if (diff <= 0) return 0;
  const mob = Math.min(mobLevel, playerLevel + 5);
  const lvldif = Math.max(mob - greyLevel, 3);
  let chance = (3 * lvldif * diff) / playerLevel;
  if (!defence) chance += chance * 0.02 * intellect;
  return Math.max(chance, 1);
}

const BONUS_LEVELS = [75, 150, 225, 300, 375, 450];

// One use-based attempt. Returns the new row and the first rewarded band crossed (donor learns only the first).
function trySkillUp(s: SkillRow, chanceTenths: number, roll: Roll): { row: SkillRow; raised: boolean; crossedBand: number | null } {
  if (chanceTenths <= 0 || s.value === 0 || s.max === 0 || s.value >= s.max) {
    return { row: s, raised: false, crossedBand: null };
  }
  if (roll() > chanceTenths) return { row: s, raised: false, crossedBand: null };
  const next = Math.min(s.value + s.step, s.max);
  const crossedBand = BONUS_LEVELS.find((b) => s.value < b && next >= b) ?? null;
  return { row: { ...s, value: next }, raised: true, crossedBand };
}

// Crowd control ladder, one per target and group, any source. States 0..3 = full, half, quarter, immune.
const CC_MULT = [1, 0.5, 0.25, 0];
const CC_RESET_MS = 15000;
interface CcLadder { hits: number; lastMs: number; }
function applyCc(ladder: CcLadder | undefined, baseMs: number, pvpLimitMs: number | null, nowMs: number): { durationMs: number; next: CcLadder } {
  const stale = ladder !== undefined && nowMs - ladder.lastMs > CC_RESET_MS;
  const state = ladder === undefined || stale ? 0 : Math.min(ladder.hits, 3);
  let dur = pvpLimitMs !== null && baseMs > pvpLimitMs ? pvpLimitMs : baseMs;
  dur = Math.trunc(dur * CC_MULT[state]);
  return { durationMs: dur, next: { hits: Math.min(state + 1, 3), lastMs: nowMs } };
}

export {};
```

## 5. Lands in

- TARGET `origins/catalogue/skills.ts` (new; proposed path, not checked against the Frankendom repo): the skill rows (identity, eligibility, band thresholds, percent chances, cap rule, step) as catalogue fields. Parity-checklist row 21 (catalogue fields).
- Donor-to-Frankendom mapping: the DBC SkillLine and SkillRaceClassInfo rows map to the catalogue row; the gather band anchor (node level) is a field on the node row; the craft thresholds are fields on the recipe row.
- Reuse tag: rewrite-from-idea (GPL-2.0: clean-room only; the sketch is written from the mechanism).
- Brief rule served: one engine, numbers as zone and catalogue data (row 21); the roll is server-side and seeded.

## 6. Gaps and risks

- Gain rule in code: the donor switches on skill id for the gain rule. Frankendom must keep one gain rule in the engine and put only numbers in rows; a per-skill special case is a code change, not a row.
- Anchor for bands: the donor's gather band uses the node's required level. Frankendom needs that anchor as a field on every node row, or the thresholds drift when nodes are retuned.
- Server-verified: the roll must run on the server with a seeded stream, and the client must only show the result. The donor's roll is server-side (irand), which fits, but the donor has no replay story.
- One ledger: the donor packs value and max into one uint32 per skill. Frankendom should keep value and max as two fields on the one character record.
- Many-on-one: combat skill-up rolls on every qualifying exchange, so three attackers (MAX_ATTACKERS = 3) can train a skill three times as fast in one fight. Frankendom should cap rolls per skill per fight, or the numbers from this donor over-train in mass fights.
- Pace: the 5 x level cap and the band chances were tuned for a slow MMO grind (80-level cap, skill up to 400). A fast fight needs its own numbers, carried as data.
- The armour formula is one line per hit and fits a fast fight. Its 0.75 cap is a hard limit of the donor; Frankendom should keep it as a data field with the same default.
- The ladder is per target and group, which is the right shape for many-on-one. The donor's 15 s reset is only applied when `stack == 0` (field not read), so do not copy that condition.
- Donor defects, with the fix in the sketch (keep the idea): (1) the fishing table has 11 densities for 10 bounds and the last one (1, for values above 450) is unreachable at the level cap (fishing max 400) - fix: clamp to 1..max and keep the table as data; (2) IMMUNE and LEVEL_4 share value 3 (Unit.h 275-276) - fix: separate immune from level 4; (3) the self-cast comment at 11395 has no self-cast check below it - fix: test caster == target in the engine, or drop the claim; (4) the immunity comment at 1072 has no immunity check in the read lines - fix: an explicit immune flag on the mob row; (5) multi-band crossing learns only the first band (985-992) - fix: learn every crossed band; (6) ladder reset skipped while `stack != 0` - fix: reset by time only.
- Not verified: the ladder increment site (Spell.cpp near 3266) and whether it runs once per applied hit. The sketch assumes once per applied hit.

Rulings for Dom:
1. Skill-ups use one roll per use (the donor's model, seeded), or fixed-count training? Recommend: a seeded roll per use with the chance from the row, so replays match.
2. Crowd-control ladder per target across all sources with a 15 s reset: keep? Recommend yes, with the 100/50/25/immune steps as data.
3. Skill cap: 5 x level as an engine rule, or a cap on each row? Recommend: the engine rule, with a per-row override for special skills.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
- Verdict: MINOR.
- Error: UpdateSkillsForLevel described as "max becomes 5 x level" for all level-range skills; real code skips max == 1 and rewrites max only when it differs from the config max (confirmed).
- Error: gather chance omitted the Multiplicator argument (confirmed; elite skinning passes 2; shift for skinning/mining applies after it).
- Missed: Death Knight Ebon Hold talent branch and m_extraBonusTalentCount (confirmed, Player.cpp 13964-13986).
- Missed: where the diminishing hitTime clock is set (apply/remove path, Unit.cpp ~11487) (confirmed).
Fixed 2026-10-12: level-up refresh text and table row, gather chance text and sketch gatherChance (mult param; work/azerothcore-skills.ts updated), talent row, diminishing clock location.
