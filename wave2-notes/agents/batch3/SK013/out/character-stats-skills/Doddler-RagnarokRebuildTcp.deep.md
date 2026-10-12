# Doddler-RagnarokRebuildTcp (character-stats-skills, cell 21)

Donor: `/mnt/frankendom-donors/Doddler-RagnarokRebuildTcp/RoRebuildServer/RoRebuildServer/EntityComponents/CombatEntity.DamageHandling.cs` | Licence: custom non-commercial ("You can do what you want ... as long as anything based on this code is not used for commercial purposes", `license.txt`; not an OSI licence, so restricted: shape only) | C# | symbol `CalculateCombatResultUsingSetAttackPower`

Checked: Symbol `CalculateCombatResultUsingSetAttackPower` at DamageHandling.cs 284-680 (read end to end for the player-attacks-monster and monster-attacks-player paths). Also read: attack range 21-95; element and defence 119-283; luck chance, hit test and attacker penalty in CombatEntity.cs 1388-1461; MathHelper.cs 16-44 and 140-147 (defence table); Player.cs 219-232, 709-746, 812-840, 885-905, 984-1019, 1200-1262; PacketApplySkillPoint.cs (whole handler); DataManager.cs 96-107; BashHandler.cs (whole file); DataLoader.cs 300-340; Skills.toml (structure, field counts, Bash, Endure, Provoke rows); SkillTree.toml (headers, Swordsman rows); the Db CSV headers and one row each. Not read: the element chart lookup (`ElementChart.GetAttackModifier`), the other 219 skill handlers, StatusEffects.toml, the weapon timing lookup, GameRandom, the Monster branch of attack range (partly), regen, cooldown code (`ApplyCooldownForAttackAction`), the `hack` lines at CombatEntity.cs 699 and 764. Some lines in sections 1 and 3 are read but not individually receipted; they are marked. Confidence: high on the hit, crit, defence and skill-point rules (read in order); high that no server or client `.cs` file reads a skill row's `Params` (grep); not run in a live server. camera_scope: not applicable.

Best transferable idea: The attacker-count penalty (a player with more than two enemies on it loses defence and takes a flat hit bonus) is a small, data-tunable many-on-one rule a fast fight can use directly.
Decision (proposed): adapt - keep the penalty and the defence-band shape; express the 5 percent and the flat bonus as data; count attackers in the one engine ledger, never in the client.
Acceptance: Server test: a player with 4 attackers on it has a +12 hit-roll bonus (2 x (5 + 1)) and DEF and soft DEF each 10 percent lower than with 2 attackers; the same seed reproduces the same hits.

## 1. Mechanism

- Physical or magic attack range comes first (section 3, rows 1-5). The damage roll is a random integer between min and max (DamageHandling.cs 312).
- Evasion (physical, not IgnoreEvasion): accuracy = skill accuracy ratio + AddAccuracyRate (328); evade = not TestHitVsEvasion(target, accuracy, flat attacker penalty) (329). The flat penalty comes from the attacker count on the defender (298), see row 11.
- Hidden targets evade unless the attack can hit hidden or is earth magic (lines not receipted). A physical attacker that is a Boss, Demon or Insect always gets CanAttackHidden (DH 332-337).
- Crit (if the flag allows it): critRate = GetBaseCritRate() (347) plus a race bonus vs the target (players only), doubled for Katar (352). Sleeping target: automatic crit. Otherwise a luck-modified roll out of 1000 (360). A crit takes the top of the range (367), clears evade (not receipted), multiplies by 1 + AddCritDamage/100 (370), and sets IgnoreDefense (not receipted).
- Lucky dodge (physical, not a skill): PerfectDodge as a luck-modified chance out of 100 (377). A hit becomes a LuckyDodge.
- Pneuma (ranged) and Safety Wall (melee in an area) can cancel a physical hit and clear crit (lines not receipted).
- Element: eleMod from GetElementalReductionForReceivedAttack (119-166): defender resist to the attack element plus the attacker's element bonus, times the element chart. The chart lookup itself was not read.
- Race, range, size and special modifiers (lines not receipted): players get resists by race, range, size and boss or normal type; players hitting physically get add-vs-race, tag bonus, DemonBane (skill level x 3 vs demon or undead), BeastBane (skill level x 5 vs beast, insect or flying), WeaponMastery, ignore-defence percent, and a random weapon refine bonus.
- Defence (184-283): physical uses DEF through the defence table plus a soft DEF band from VIT (row 4 and row 8). Magic uses MDEF through the same table with soft DEF = INT + VIT/2 (row 9). DEF of 200 or more sets soft DEF to 999999 (249).
- Final damage (586): `((base + addDamage) x attackMult x defCut - subDef + addFinal) x eleMod x racial x range x size x special`, each multiplier /100, truncated to int, minimum 1. Soft DEF is subtracted before the multipliers.
- Level cut (596-602): monster hits player: x (1 - 0.0025 x (player level - monster level)), floor 0.5; player hits monster: x (1 - 0.015 x (monster level - player level)), floor 0.1. Result minimum 1. Evade or element 0 gives 0 (612). Magic against a player with MagicImmunity gives InvisibleMiss (623-626).
- Order matters: the donor applies the attacker penalty to DEF before the defence cut, and applies the level cut last. The DEF and soft DEF reductions sit inside the player-defender branch and inside `!IgnoreSubDefense` (DamageHandling.cs 202-219), so an IgnoreSubDefense attack skips the DEF penalty too; the hit-roll bonus (329) is separate and still applies.

## 2. Key functions

- `CalculateCombatResultUsingSetAttackPower`: `.../EntityComponents/CombatEntity.DamageHandling.cs` 284-680 (damage at 586, level cut 596-602, result 612-626).
- `CalculateAttackPowerRange`: same file, 21-95 (melee 46-55, magic 62, boxed monster branch not read).
- `GetDefenseReductionForReceivedAttack`: same file, 184-283 (soft DEF 209-212, attacker penalty 217, monster soft DEF 227, hard DEF 247-249, magic 263-265).
- `GetBaseCritRate`: same file, 281.
- `TestHitVsEvasion`: `.../EntityComponents/CombatEntity.cs` 1424-1445. `CheckLuckModifiedRandomChanceVsTarget`: same file, 1388-1418. `GetAttackerPenalty`: same file, 1449-1461.
- `MathHelper` defence table: `.../Simulation/Util/MathHelper.cs` 16-44 (table fill), 140-147 (lookup).
- Stat points and HP/SP: `.../EntityComponents/Player.cs` 219-232 (tables), 709-746 (spend), 885-905 (max HP and SP), 812-840 (attack speed), 984-1019 (skill points).
- Skill learn: `.../Networking/PacketHandlers/Character/PacketApplySkillPoint.cs` (whole handler; checks 32-52, 100).
- SP cost: `.../Data/DataManager.cs` 96-107 and `Player.cs` 1200-1224. `AddSkillToCharacter`: `Player.cs` 1248 and 1254.
- Bash skill (the only handler read): `.../Simulation/Skills/SkillHandlers/Swordsman/BashHandler.cs` 11-30.
- Tree loader: `.../Data/DataLoader.cs` 300-340.

## 3. Numbers vs mechanism

Skills are TABLE-DRIVEN for identity, cost, tier and prerequisites (rows in TOML and CSV), and CODE-DRIVEN for the effect (one C# handler per skill). Stat and skill rows (name | what it does | formula | number ranges | caps | file:line):

| name | what it does | formula | number ranges | caps | file:line |
|---|---|---|---|---|---|
| STR (melee main) | physical attack | min term min(weapon x 0.33, STR); max term weapon x (200 + STR) / 200; stat term + STR + (STR/10)^2 (integer division) | 1 to 99 | 99 (stat cap) | DH 46, 50; PL 725 |
| DEX (bow main; melee secondary) | bow attack, melee stat term, hit | min term + DEX x (0.8 + 0.2 x weapon level); melee stat term + DEX/5; hit = level + DEX + AddHit | 1 to 99 | 99 | DH 42-50; CE 1426 |
| AGI | flee and attack speed | flee = level + AGI + AddFlee; speed score = 1 - (AGI + DEX/4) / 250 (0.4 percent per AGI, comment) | 1 to 99 | 99 | CE 1429; PL 817, 831 |
| VIT (HP) | max HP | max HP = job HP table x (1 + VIT/100) + AddMaxHp, then x hpPercent/100 | job HP level 1 = 40 (most jobs) | none in code shown | PL 886 (line receipted), 885-905 |
| VIT (soft DEF, player) | random soft DEF band | vit30 = 3 x VIT/10; width = VIT^2/150 - vit30 (min 1); soft DEF = vit30 + (random 0..20000 mod width) + VIT/2; scaled by AddSoftDefPercent | VIT 99: 78 to 113 (hand computed from the formula, not run) | width min 1 | DH 209-212 (AddSoftDefPercent scaling line not receipted) |
| VIT (soft DEF, monster) | monster soft DEF band | width = (VIT/20)^2; soft DEF = VIT + (random mod width) | VIT 99: 99 to 114 (hand computed) | width 0 gives VIT only | DH 227 |
| INT (SP) | max SP | max SP = job SP table x (1 + INT/100) + AddMaxSp, then x (100 + AddMaxSpPercent)/100 | | | PL 896-897 |
| INT (magic attack) | magic min and max | min = AddMatk + INT + (INT/7)^2; max = AddMatk + INT + (INT/5)^2; x (100 + AddMagicAttackPercent)/100 | | | DH 62 (min line receipted) |
| INT (magic soft DEF) | magic soft DEF | INT + VIT/2 (no attacker penalty) | | | DH 265 |
| LUK | crit and luck-modified chances | crit rate = (1 + LUK/3 + AddCrit) x 10 + LVL/5, in tenths of a percent (1000 = 100 percent); luck chance: chance x 10 x (luckA + 150) / (luckT + 150), 150 grows above 10 percent | LUK/3 steps: +1 percent per 3 LUK (comment: 0.3 percent per LUK) | target luck 0 for self; monster luck at most player luck + 100 | DH 281; CE 1396-1417 |
| LVL | hit, flee, crit | hit uses level; flee uses level; crit term level/5 (tenths) | 1 to 99 | | CE 1426, 1429; DH 281 |
| DEF (hard) | physical damage cut | index = DEF x 10 + refine x 7. Index below 300: cut = 1 - index/1000. At 300 and above: cut = max(0.1, 0.99^(index/10 - 30) - 0.3). Donor comment: 30 def = 30 percent, 60 = 56.0, 120 = 89.5 percent reduction | 0 to about 150 in the table (1500 entries) | floor 0.1 cut; DEF 200 or more disables soft DEF | MH 39-42, 142-146; DH 247-249 |
| refine | DEF bonus | +7 index per refine point (+0.7 DEF) | | | MH 142 |
| MDEF | magic hard DEF | same table on MDEF | | | DH 263 |
| attacker count | defence and evasion penalty on a player | penalty = attackers - 2 when more than 2 attackers, else 0. DEF and soft DEF lose 5 x penalty percent (only for non-IgnoreSubDefense attacks on a player defender, DH 202-219). Hit roll gains penalty x (5 + penalty/2) | 3 attackers: penalty 1 (5 percent, +6); 4: penalty 2 (10 percent, +12) | none | CE 1451, 1457; DH 217, 298, 329 |
| hit test | hit or miss | rate = (level + DEX + AddHit) + 75 - (level + AGI + AddFlee); floor 5; x accuracy/100; + flat penalty clamped 5..100; hit if rate > roll 0..99 | a rate of 100 or more always hits | the 95 cap for players is commented out | CE 1424-1444 (1434, 1436, 1437, 1439, 1444) |
| skill accuracy | accuracy ratio of a skill hit | Bash: 100 + 5 x level (hard-coded) | 105 to 150 | | BH 22 |
| crit | crit hit | base crit (LUK, LVL, AddCrit rows) plus race bonus; Katar x2; sleep = crit; crit = top of range and x (1 + AddCritDamage/100) | | | DH 347-370 |
| lucky dodge | free miss | PerfectDodge as luck-modified chance out of 100 | | | DH 377 |
| element | element multiplier | eleMod = 100 - defender resist to attack element + attacker bonus, times chart(attack, defender)/100 | chart rows are defender elements (labels such as Neutral1, Earth1); orientation not verified | | DH 119-166; ElementalChart.csv line 1 |
| attack speed | attack delay | recharge = job delay x (1 - (AGI + DEX/4)/250) x 0.99^bonus; bonus >= 0 first grows by 1.0064^bonus; a riding mount multiplies by 1.5 - 0.1 x riding level below level 5 | | no floor; CEILING: recharge above 2 is set to 2 (PL 859-860); dual wield: delay = (main + off) x 0.7 (PL 823-824) | PL 817, 823-824, 826, 831-839, 859-860 |
| level cut | damage scaling by level gap | monster on player: 1 - 0.0025 x gap, floor 0.5; player on monster: 1 - 0.015 x gap, floor 0.1 | | | DH 596-602 |
| damage assembly | final damage | `((base + add) x mult x defCut - subDef + addFinal) x ele x race x range x size x special`, int, min 1 | | | DH 586 |
| skill points | points to spend | earned = prereq points + job level - 1; novice capped at 9; prereq points = sum over parent jobs of (MaxJobLevel - 1); spent = sum of learned levels; overspend clamps to 0 | novice gives 9 | novice cap 9 | PL 991-1004; DL 335-339 |
| tier gate | a higher job's skill needs lower-job points spent | minUsedPoints = 9 + (rank - 1) x 49, only when the job rank is above 0 | rank 1 needs 9; rank 2 needs 58 | | PA 41-52 |
| skill level cap | max level | learned level must be below MaxLevel | row field (148 of 220 skills have MaxLevel) | MaxLevel | PA 32 |
| prerequisites | unlock | each [skill, required level] pair must be learned at that level | Swordsman: ChargeAttack needs Bash 7 and MagnumBreak 3 | | PA 100; STT 19 |
| SP cost | SP per cast | SpCost[level - 1], level clamped to the array length; x (100 + SpConsumption)/100 | Bash: 8 for levels 1-5, 15 for 6-10 | MaxLevel | DM 103-106; PL 1222; ST 27 |
| stat points | cost to raise a stat | cost to reach value v = cumulativeStatPointCost[v - 1]; points earned from statPointsEarnedByLevel (both C# arrays) | stat 1 to 99 | 99 | PL 219-232, 725, 731 |
| Bash effect | ATK percent and accuracy | 1 + 0.3 x level (130 to 400 percent); accuracy 100 + 5 x level | level 1 to 10 | level clamp 1..10 | BH 16, 21, 22; ST 30 (Params row, not read) |
| job HP and SP | base HP and SP per job level | JobHpChart and JobSpChart: level rows (1-99), job columns | HP level 1 = 40; SP level 1 = 11 to 19 (first 25 job columns read) | | CSV headers (lines 1) |
| stat schedule | which stat a job level adds | JobStatBonuses.csv: one cell per job level; a stat name or 0 (Swordsman: level 2 STR, 6 VIT, 10 DEX) | | | CSV line 3 |
| base XP | XP per base level | ExpChart.csv: Level, Experience (1 to 5, 2 to 7, 3 to 9) | | | CSV header line 1 |

Weight exists in this donor: `WeightCapacity = 28000 + STR x 300 + EnlargeWeightLimit level x 2000` (Player.cs 905-906), checked on pickup (481, admins exempt). Not in this donor (or not read): block and parry, armour per slot, durability, luck-as-a-stat beyond crit and lucky dodge, poise and stagger, the 219 other skill effects, regen rates, persuasion and other social skills. Magic resistance is the MDEF table and INT-based soft DEF (rows above).

As-data shape:
- Skills (TOML, `GameConfig/ServerData/Skills/Skills.toml`): one table per skill, 220 tables. Fields used in the file: Name (on 184 skills), Icon (148), Target (208), MaxLevel (148), SpCost (110; int array, one entry per level), AdjustableLevel (24; bool), InterruptMode (14), Params (7; array of int arrays, one per placeholder), DescEn (7; text with `<n>` placeholders). Field counts from grep of `key =` lines.
- SkillData (C# class, `RebuildSharedData/ClientTypes/SkillData.cs`): SkillId, Icon, Name, Target, Type, MaxLevel, SpCost (int[]), AdjustableLevel, DescEn, Params (string[][]), InterruptMode (enum).
- Skill tree (TOML, `Skills/SkillTree.toml`): per job: JobRank (int), Extends (job name), then a `[Job.SkillTree]` table: skill = [[prereq skill, required level], ...] or []. Loaded into PlayerSkillTree (JobRank, JobId, PrereqSkillPoints, Parent, SkillTree).
- Jobs (CSV): Id, Class, ExpChart, MaxJobLevel, SpriteMale, SpriteFemale. Job HP and SP (CSV): Level rows x job columns. Job stat schedule (CSV): Job rows x job-level columns (stat name or 0). Base XP (CSV): Level, Experience. Job XP (CSV): JobLvl x Novice, FirstJob, SecondJob (use not read).
- Element chart (CSV): defender element rows x attack element columns, percent.
- Weapon attack timing (CSV): class rows x weapon columns. No server `.cs` file names it (grep), so the loader is not identified.
- Stat points: two C# arrays in Player.cs (219-232), not data.
- Effects: `GameConfig/ServerData/Db/Effects.csv` and `Skills/StatusEffects.toml` exist; not read.

A new skill is one row: YES for identity, icon, cost, tree position, prerequisites and max level (TOML rows). NO for its effect: each skill is a C# handler class (`[SkillHandler(CharacterSkill.Bash, ...)]`) and a new `CharacterSkill` enum value. The Params row is not read by the server or the client scripts (grep over both), so the numbers in a skill row do not drive the effect. Bash's handler hard-codes its own numbers.

Provenance: all rows and code are from `Doddler-RagnarokRebuildTcp` (custom non-commercial licence in `license.txt`; shape only). No `.git` directory on the VPS copy.

What they patched later (no git history; `GameConfig/ServerData/Config/PatchNotes.txt` is on the box, plus the in-code history markers):
- PatchNotes line 44: "Defense ignoring weapons and attacks no longer deal 0 damage" (the min-1 rule in the damage assembly is the fix to keep). Line 48: "no longer possible to dodge attacks while stunned or frozen". Lines 88-89: element chart fixes (ghost vs neutral too strong; holy/dark weak against water1), so the element chart had real bugs and must be read before copying. Line 108: "Fixed pasana critting for way more than it should" (crit cap lesson).
- "more or less pre-renewal" (DH 42) and "kinda pre-renewal but primary stat makes up 1/3 of min" (DH 44): the attack shapes are an older renewal model with a newer cap.
- "more like post-renewal, primary stat adds 0.5% weapon atk" (DH 46).
- "this formula is weird, but it is official" (DH 206): the soft-DEF band is kept as the official shape.
- "base attack speed is identical to pre-renewal, 0.4% lower delay per point of agi and 0.1% for dex" (PL 817): the ASPD chart was rewritten to match.
- "cap monster luck to only ever exceed player luck by 100. Jokers were having too good of a time." (CE 1404): the monster luck cap was added after an exploit.
- "add damage is applied to base damage, but in the original RO it's actually applied after multipliers... maybe revise if it's too strong." (DH 585): flagged by the author as possibly wrong.
- Hit cap: "if (hitSuccessRate > 95 ...)" is commented out (CE 1437). The code shows it was removed or disabled; the reason is not recorded.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for the parts it covers: attack range, soft DEF band, hard DEF table, attacker penalty, hit test, crit rate, damage assembly and level cut, skill points, SP cost, learn gate, and attack recharge. It omits the element chart lookup, race, range, size and special modifiers, the Pneuma and Safety Wall cancels, the IgnoreDefense and crit flags, the magic branch of the attack range, the refine random bonus, lucky dodge, magic immunity, the trigger hooks after the result, the cooldowns, and the monster branch. It differs from the donor in one place: a negative defence index is clamped to 0 (the donor's fallback returns a value above 1 for a negative index), and the donor's `int` divisions are written with Math.trunc.

```ts
// Licence: custom non-commercial licence (donor license.txt; restricted, shape only). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
// Integer semantics follow the donor's int arithmetic (Math.trunc where the donor divides ints).

// Melee physical attack range (bow path and monster path omitted).
function meleeAttackRange(str: number, dex: number, weaponAttack: number, weaponLevel: number, addAttack: number, attackPct: number): [number, number] {
  let min = Math.trunc(Math.min(weaponAttack * 0.33, str) + dex * (0.8 + 0.2 * weaponLevel));
  const max = Math.trunc(weaponAttack * (200 + str) / 200);
  if (min > max) min = max;
  const statAtk = addAttack + str + Math.trunc(dex / 5) + Math.trunc(str / 10) * Math.trunc(str / 10);
  let lo = Math.trunc((statAtk + min) * attackPct / 100);
  let hi = Math.trunc((statAtk + max) * attackPct / 100);
  if (lo <= 0) lo = 1;
  if (hi < lo) hi = lo;
  return [lo, hi];
}

// Soft defence for a player defender: a band from VIT. rnd(n) returns an integer 0..n-1 from the engine's seeded stream.
function playerSoftDef(vit: number, rnd: (n: number) => number): number {
  const vit30 = Math.trunc(3 * vit / 10);
  let width = Math.trunc(vit * vit / 150) - vit30;
  if (width < 1) width = 1;
  return vit30 + (rnd(20001) % width) + Math.trunc(vit / 2);
}

// Hard defence: index = DEF x 10 + refine x 7. Below index 300, 1 def = 0.1 percent; above, a diminishing curve with a 10 percent floor.
// simplified: a negative index is clamped to 0 here; the donor's fallback returns a value above 1 for negative indexes (see defects).
function hardDefCut(index: number): number {
  if (index < 300) return 1 - Math.max(0, index) / 1000;
  return Math.max(0.1, Math.pow(0.99, index / 10 - 30) - 0.3);
}

// Attacker penalty: a player attacked by more than two enemies loses 5 percent of DEF and soft DEF per extra attacker, and gets a flat hit bonus.
function attackerPenaltyFor(attackers: number): number {
  return attackers > 2 ? attackers - 2 : 0;
}
function penalisedDef(def: number, penalty: number): number {
  return penalty > 0 ? def - Math.trunc(5 * def * penalty / 100) : def;
}
function evasionPenaltyHitBonus(penalty: number): number {
  return penalty * (5 + Math.trunc(penalty / 2));
}

// Hit test: attacker hit = level + DEX + AddHit; defender flee = level + AGI + AddFlee; rate = hit + 75 - flee, floor 5, scaled by the skill accuracy ratio.
// The donor's 95 cap for players is commented out, so a rate above 99 always hits.
function hitTest(attackerLevel: number, dex: number, addHit: number, defenderLevel: number, agi: number, addFlee: number, accuracyRatio: number, flatPenalty: number, roll: number): boolean {
  const attackerHit = attackerLevel + dex + addHit;
  const defenderFlee = defenderLevel + agi + addFlee;
  if (defenderFlee < 0) return true;
  let rate = attackerHit + 75 - defenderFlee;
  if (rate < 5) rate = 5;
  rate = Math.trunc(rate * accuracyRatio / 100);
  if (flatPenalty > 0) rate = Math.min(Math.max(rate + flatPenalty, 5), 100);
  return rate > roll;
}

// Crit rate in tenths of a percent (1000 = 100 percent): (1 + LUK/3 + AddCrit) x 10 + level/5.
function baseCritRate(luk: number, addCrit: number, level: number): number {
  return (1 + Math.trunc(luk / 3) + addCrit) * 10 + Math.trunc(level / 5);
}

// Damage assembly after the hit is decided: soft DEF is subtracted before the element, race, range, size and special multipliers.
function assembleDamage(base: number, addDamage: number, attackMult: number, defCut: number, subDef: number, addFinal: number,
                        eleMod: number, racialMod: number, rangeMod: number, sizeMod: number, specialMod: number, levelCut: number): number {
  let dmg = Math.trunc(((base + addDamage) * attackMult * defCut - subDef + addFinal) * (eleMod / 100) * (racialMod / 100) * (rangeMod / 100) * (sizeMod / 100) * (specialMod / 100));
  if (dmg < 1) dmg = 1;
  dmg = Math.trunc(levelCut * dmg);
  return dmg < 1 ? 1 : dmg;
}

// Level cut when a monster hits a player: 0.25 percent per level the player is above the monster, floor 0.5.
function levelCutMonsterOnPlayer(playerLevel: number, monsterLevel: number): number {
  const c = 1 - 0.0025 * (playerLevel - monsterLevel);
  return Math.min(1, Math.max(0.5, c));
}

// Skill points: earned = prereq points + job level - 1 (novice capped at 9); spent = sum of learned levels. Overspend clamps to 0 here, as the donor does.
function skillPointsLeft(prereqPoints: number, jobLevel: number, isNovice: boolean, learnedLevels: number[]): number {
  let earned = prereqPoints + (jobLevel - 1);
  if (isNovice && earned > 9) earned = 9;
  const used = learnedLevels.reduce((a, b) => a + b, 0);
  return earned < used ? 0 : earned - used;
}

// SP cost per cast: table entry for the level (clamped to the last entry) x (100 + SpConsumption) / 100.
function spCost(table: number[], level: number, spConsumptionPct: number): number {
  if (table.length === 0) return 0;
  const lv = Math.min(level, table.length);
  return Math.trunc(table[lv - 1] * (100 + spConsumptionPct) / 100);
}

// Raise one skill level: points left, below max, tier gate (9 + (rank - 1) x 49 when rank > 0), prerequisites met.
function canRaiseSkill(known: number, maxLevel: number, points: number, tierPointsUsed: number, tierGate: number | null, prereqsMet: boolean): boolean {
  if (points <= 0 || known >= maxLevel) return false;
  if (tierGate !== null && tierPointsUsed < tierGate) return false;
  return prereqsMet;
}

// Attack recharge (delay) from job delay, AGI and DEX: speed score = 1 - (AGI + DEX/4) / 250; bonus decays by 0.99 per point.
// Donor also: dual wield sets jobDelay = (main + off) x 0.7 (Player.cs 823-824), and the result is capped at 2 (ceiling only, no floor; 859-860).
function attackRecharge(jobDelay: number, agi: number, dex: number, aspdBonus: number): number {
  const score = 1 - (agi + dex / 4) / 250;
  const bonus = aspdBonus >= 0 ? aspdBonus * Math.pow(1.0064, aspdBonus) : aspdBonus;
  return Math.min(2, jobDelay * score * Math.pow(0.99, bonus));
}

export {};
```

## 5. Lands in

- TARGET `origins/catalogue/skills.ts` (new; proposed path, not checked against the Frankendom repo): the skill rows (identity, cost per level, max level, prerequisites, tier gate) and the stat rows (stat point cost table, job HP and SP per level, the stat schedule) as catalogue fields. Parity-checklist row 21 (catalogue fields).
- The damage and hit math in this note is the reference for parity row 1 (duel step) in `src/fight/`; it is not a catalogue field, so it is out of this note's single row.
- Reuse tag: rewrite-from-idea (custom non-commercial licence: clean-room only; shape only).
- Brief rule served: one engine, numbers as zone and catalogue data (row 21); attacker penalty is a server-side rule (MAX_ATTACKERS = 3, one ledger).

## 6. Gaps and risks

- MAX_ATTACKERS = 3 versus the donor threshold: the donor's penalty starts at the third attacker (attackers > 2). With Frankendom's cap of three, the penalty can only ever be 1 (5 percent DEF, +6 hit). To make many-on-one matter, the per-attacker numbers must be bigger or the threshold must be a data field.
- One ledger: the donor counts attackers with a recent-attacker register on the defender (RegisterRecentAttacker, CE 1454). Frankendom must keep that register in the engine, not in the client.
- Replay: the donor uses GameRandom for damage range, crit, hit, lucky dodge and soft DEF. Every call draws in a fixed order inside one function, but the donor does not promise the same order across versions. Frankendom needs one seeded stream and a fixed draw order per hit, or replays drift.
- Hit cap: the 95 cap is commented out (CE 1437), so a high-DEX attacker always hits. Fix: a cap as a data row for player-versus-player.
- Attack speed has no floor in the code shown (PL 831-833; there is a ceiling of 2 at 859-860, and dual wield multiplies by 0.7 at 823-824); a high AGI and DEX with the ASPD bonus compounds with 1.0064 per point. Fast fights need a minimum recharge row, which the donor does not have.
- Skill-point overspend is silently clamped to 0 (PL 1003-1004). Fix: refuse the learn on the server; never clamp.
- Stat point costs and earned points are C# arrays (PL 219-229), with a comment asking for a data file. Fix: move to CSV rows with the same numbers.
- Bash's numbers are written twice (the Params row and the handler at BH 21-22). Params is not read by any code. Fix: the handler reads its row; a test checks that the description and the handler agree.
- Integer division in the stat terms (STR/10 squared, INT/7 squared, INT/5 squared) gives steps, not curves (DH 50, 62). Keep the shape but write the steps in the row or use a float.
- The "add damage before multipliers" question is open in the donor's own comment (DH 585). Frankendom must pick one order and test it.
- Element chart orientation (which axis is attacker and which is defender) was not verified, so do not copy the chart values without reading the lookup.
- Donor defects with the fix (keep the idea): (1) a negative DEF index falls through to the formula and returns above 1 (MH 142-146, the fallback at 146 for `intVal` below 0; reachable only if refine can push the index below 0, not verified): fix: clamp the index at 0 (sketch does this); (2) the player hit cap is disabled (CE 1437): fix: a cap row; (3) overspend clamp (PL 1004): fix: refuse; (4) Bash numbers duplicated (BH 21-22): fix: read the row; (5) stat tables in code (PL 219-229): fix: CSV.
- Donor oddities seen in the fix pass: the penalty comment says "2 or more" (DH 298) but the code is `> 2` (CE 1451); `UpdateStats` can leave StatPoints negative without a check (Player.cs 1019); the skill tier gate sums ALL learned points, not only lower-job points (PacketApplySkillPoint.cs 43-45), so points spent in the current job also satisfy the gate. Keep the gate idea, count lower-job points only.
- Not verified: how many attacks count as "recent" in the register, Pneuma and Safety Wall timing, and the cooldown rules.

Rulings for Dom:
1. Keep the attacker penalty (third attacker costs 5 percent DEF and adds a flat hit bonus)? Recommend yes, with the threshold and the per-attacker numbers as data; at a cap of three attackers, a bigger per-attacker value is needed or the rule does almost nothing.
2. Put a 95 percent hit cap on player-versus-player hits (the donor's code had one, disabled)? Recommend yes, as a data row.
3. Stat points and job HP and SP tables: CSV rows like the rest of the catalogue, or fixed in code? Recommend CSV rows, with the donor numbers as the starting values.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR.
- Patched-later section ignored PatchNotes.txt lines 44, 48, 88-89, 108 (confirmed).
- "Weight not in this donor" is wrong: Player.cs 905-906 sets WeightCapacity (confirmed).
- Attacker penalty on DEF and soft DEF applies only inside the player-defender, non-IgnoreSubDefense branch (confirmed, DH 202-219).
- Missed: attack recharge ceiling of 2 (859-860), dual-wield x0.7 (823-824), ">2" vs "2 or more" comment mismatch, Boss/Demon/Insect hit hidden, StatPoints can go negative, tier gate counts all points (all confirmed).

Fixed 2026-10-12: patched-later list, weight claim, penalty scope, speed row and gaps, added oddities; sketch attackRecharge now caps at 2 (work/doddler-ragnarok-stats.ts matched).
