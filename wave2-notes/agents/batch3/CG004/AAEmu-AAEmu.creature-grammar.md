# AAEmu-AAEmu (creature-grammar, CG004)

Donor root (VPS, read-only): /mnt/frankendom-donors/AAEmu-AAEmu/
Donor licence: conflicting in the repo as the files say. README.md (lines 33-46) names LGPL v3; LICENSE.GPL is the GPL v3 text; LICENSE.MIT is an MIT licence (Copyright 2019 Rain0Ash). The repo does not say which covers which, so code is treated as copyleft: clean-room shape only. Game data (Creatures.xml, Doodads.xml, Worlds/*, SQL) has no licence line. README line 48: unofficial, not affiliated with XLGames; rights in game data not stated. See AU002 and DC003 (read first).
Depth: full for the active creature-AI paths (family binding, idle mode, health-gated skill lists, the wild-boar spurt). Full for the stat formula path (code only; numbers absent). Thin for data.
Half read: server (AAEmu.Game code, plus the 2026-01-23 npc group SQL patch). Data half not in the box: the client pack (compact.sqlite3, per AGENTS.md and DC003). The server reads these tables at run time, so their absence matters: npcs (AiGameData.cs line 51; NpcManager.cs line 204 takes its AiFileId), npc_ai_params (AiGameData.cs line 68), and the unit_formulas, unit_formula_variables and formulas tables (FormulaManager.cs lines 85, 107, 134, 155). Paired donor in the box: EQEmu, whose server-side stat band is the matching mechanism (see the EQEmu note).
Checked: AiParams.cs, AIUtils.cs, AiParamType.cs, the 13 AiCharacters files named below, BaseCombatBehavior.cs (active skill-list selection, 373-486), BigMonsterAttackBehavior.cs (85-100), WildBoarAiParams.cs, WildBoarAttackBehavior.cs (39-118), AiSkillList.cs, Npc.cs (Str getter 140-165), Unit.cs (GetBonuses 687-705), NpcGradeType.cs, NpcKindType.cs, NpcTemplate.cs, NpcManager.cs (202-204), AiGameData.cs (41-70), NpcGroupGameData.cs (67-91), NpcGroupMember.cs, the group SQL patch. Confidence high on the active paths. Medium on what the numbers would be (not in box).
Dead code noted: FollowPathBehavior.cs lines 76-116 and 131-288 are block comments titled "Unused Code". Its RefreshSkillQueue and RequestAvailableSkillList look like the real thing but do not run. Do not copy from that file; the active selection is BaseCombatBehavior.cs.

## 1. What the player sees and feels (375 wide)

Design intent, from the active code (no models, animation or sound in the box): a creature family is one combat style that comes in two idle modes. A ranged creature either roams a small patch around its idle position or stands and holds its ground, then fights the same way once it has a target. A charging boar opens combat with one fixed start skill, then attacks with its basic move, and when its health falls under 70 percent it switches to a spurt move whenever that move is in range. A big monster reads its health in bands: as health drops into a band, the set of moves it may use changes, so the boss changes its attacks in steps rather than gradually. Idle creatures wander to a random point within 6 units of their idle position on each axis.

## 2. Why it works / is striking

- Readable silhouette at 375: unknown (no model data in the box). The design relies on behaviour changes that a player sees as attack changes, not on size.
- One signature behaviour: the wild boar's health-gated spurt (a single move that replaces the basic attack below a percent threshold). The big monster's health bands are the same idea across several moves.
- One signature sound or effect: none read (sound is client-side and absent).
- Could be ours at 20-30 percent resemblance: yes. The idle-mode split, the health gate, and the weighted move list are generic design. No names, skill ids or models are reused.

## 3. The rule behind it

### 3a. Family = attack behaviour x idle mode (active)
- The NPC's AI type (ai_file_id, from the npcs table) is read in NpcManager.cs 202-204 and mapped to a class in AIUtils.cs (switch, lines 30-57, 13 cases).
- AiParamType (AI/Enums/AiParamType.cs) has 16 values. The ones that matter here: Roaming 13, HoldPosition 15, Flytrap 18, BigMonsterHoldPosition 19, BigMonsterRoaming 20, ArcherHoldPosition 21, ArcherRoaming 22, WildBoarHoldPosition 23, WildBoarRoaming 24.
- Three attack families each have two idle modes that share the same combat behaviour and differ only in their default idle: Archer (ArcherRoamingAiCharacter.cs line 13 Roaming default; ArcherHoldPositionAiCharacter.cs line 13 HoldPosition default; both use ArcherAttack from line 29 or 30), BigMonster (lines 13 and 29 or 30), WildBoar (lines 13 and 29 or 30). Same attack class, two stances.
- Params are shared by the pair too: AiParams.cs lines 31-32 map ArcherHoldPosition and ArcherRoaming to one ArcherAiParams; lines 34-35 and 39-40 do the same for BigMonster and WildBoar.
- Roam box: AIUtils.cs line 16 sets maxRoamingDistance = 6; the target point is an offset of up to 6 on each axis from IdlePosition (lines 18-19).

### 3b. Health-gated move lists, the active gate (BaseCombatBehavior.cs)
- Health is an integer percent: `var healthRatio = (int)((float)Ai.Owner.Hp / Ai.Owner.MaxHp * 100);` (line 447).
- A list is eligible when `(s.HealthRangeMin == 0 && s.HealthRangeMax == 0) || (s.HealthRangeMin < healthRatio && healthRatio <= s.HealthRangeMax)` (line 456). A (0, 0) range is always eligible. The minimum is exclusive, the maximum inclusive.
- A time window (lines 461-480) gates the same list by seconds since combat started (_combatStartTime).
- The phase is picked by weight: `aiSkillLists.RandomElementByWeight(s => s.Dice)` (line 380). A second weighted pick chooses the move list inside the phase (line 408).
- Start skills are queued once, guarded by _startingSkillAlreadyUsed (checked at line 391, set at line 401). This file has no reset, so "once per fight" is not confirmed; it may be once per behaviour instance.
- A move is queued only if its cooldown is free (lines 415-418) and the target is inside its range (line 421).
- Health bands and weights come from the Lua table in AiSkillList.ParseLua (AiSkillList.cs lines 11-12 and 27-31): healthRange = {min, max}, dice = weight.

### 3c. The wild-boar spurt (WildBoarAttackBehavior.cs, active)
- Health as a float percent: `_currHealth = Ai.Owner.Hp / (float)Ai.Owner.MaxHp * 100;` (line 54), set every tick (Tick at line 39).
- One start skill from OnCombatStartSkills, used once (lines 68-80).
- Spurt loop, lines 96-117: for each spurt entry, `if (_currHealth < skillData.HealthCondition` (line 99) uses that entry's move if the target is in its range (line 103); otherwise `PickSkillAndUseIt(...)` runs (line 115).
- Sample from the parser's comment, not data: `onSpurtSkill = { { skillType = 14038, healthCondition = 70 } }` (WildBoarAiParams.cs lines 11-13). The unit of healthCondition is the same percent as _currHealth, so the threshold reads as a percent.

### 3d. Big-monster health filter (BigMonsterAttackBehavior.cs, active)
- Health int percent (line 87). The filter `s.HealthRangeMin <= healthRatio && healthRatio <= s.HealthRangeMax` (line 91) is inclusive at both ends. A cooldown filter (92) and a range filter (93-97) run before the pick (line 61: PickSkill(RequestAvailableSkills(...))). This is the cleaner order: filter first, then pick once. The pick is uniform random among the eligible moves (line 105), not weighted by dice. When none is eligible and the base skill is off cooldown, the template's base skill is used (lines 107-113).

### 3e. Stat formula and bonus stack (active)
- Each attribute (for example Str, Npc.cs 140-165) is a formula of four inputs: level, npc_template, npc_kind and npc_grade (lines 147-153). Line 153 calls FormulaManager.GetUnitVariable for the grade input. The formula bodies and the variable values are in the client pack, which is not in the box.
- Bonuses then apply in list order: a Percent bonus adds res * value / 100 (line 159), any other bonus adds value (line 161). The list is GetBonuses (Unit.cs 687-705), which reads from Bonuses.Values (line 694) and does not sort. So a percent bonus and a flat bonus do not have a fixed order.
- Grade enum (NpcGradeType.cs lines 5-12): Normal = 1, Elite = 2, BossA = 3, BossB = 4, BossC = 5, Weak = 6, Strong = 7, BossS = 8. The values are not ordinal: Weak sits after BossC by value, but is treated as a low grade in the catalogue. No comparator on grade exists in the read half; it only feeds formula variables.
- Kind enum (NpcKindType.cs lines 5-17): 13 values, Human = 1 to Unknown = 15, with gaps (Dragon = 8, SiegeWeapon = 9 and so on).

### 3f. Group formation (loaded, not consumed in this half)
- NpcGroupGameData.cs (lines 67-91) loads npc_group_members into NpcGroupMember with IsLeader, IsMoveLeader, FormationOffsetX, FormationOffsetY, FormationOffsetZ and FormationTension (NpcGroupMember.cs lines 10-13).
- A grep over AAEmu.Game and AAEmu.Commons found no reader of FormationOffset* or FormationTension beyond the loader, and none of IsLeader or IsMoveLeader beyond the loader. So formation is data in this half. Any use happens in the client, which is not in the box.
- The patch has 571 rows (INSERT INTO "npc_group_members", SQL/patches/compact/2026-01-23-npc_group_members.sql). Columns: id, group id, npc id, leader flag, move-leader flag, offset x, y, z, tension (schema lines 22-31).

### Data fields (designer-tunable)

| name | unit | donor value |
|---|---|---|
| attack_family | enum: archer, big monster, wild boar, plus other single-mode types | null (code treated as copyleft; no donor value taken) |
| idle_mode | enum: roam or hold | null |
| roam_radius | units per axis | null (donor value 6 is in code; not copied) |
| move_list.health_min, health_max | percent 0-100, min exclusive, max inclusive | null |
| move_list.dice | weight (unit: relative weight) | null |
| move_list.time_start, time_end | seconds since combat start | null |
| spurt.health_threshold | percent | null |
| start_skill | one id, once per fight | null |
| grade | ordered tier (ours to define) | null |
| stat_formula inputs | level, template, kind, grade | null (formulas not in box) |
| bonus_order | fixed: flat first, then percent | our rule |

## 4. For Frankendom

- Map: the 100 Pit creatures reuse a few attack families (ranged, charge, banded boss) each with roam or hold. Zones (700, as data) choose the idle mode and the band table per creature row. Many-vs-one (max 3 attackers) works because each family has one attack class and one pick per tick.
- Rows: row 2 (AI brain) for the family and idle mode; row 4 (fight loop: aggro, chase, leash) for the roam box and the hold return; row 13 (specials) for the spurt and band moves; row 18 (server tick: fixed step, input intake, per-tick NPC budget) for the one pick per tick. Fields for the stat formula: row 21 (catalogue fields).
- Server-verified: health percent, band, cooldown and range are all decided by the engine. The client only shows the move that the server picked.
- Keep: the two-stance split (roam or hold share one attack class), the health-band move list with a weight, the one-shot start skill, the spurt as a replacement for the basic move below a threshold, and the filter-then-pick order (BigMonsterAttackBehavior 91-97).
- Change: the boundary rule (one helper, one rule); the wild-boar fallback and out-of-range dead time (defects below); the grade as an ordered tier table; the formation fields stay out of the fight loop until a consumer exists.

Defects in the donor, with the fix (keep the idea, fix the defect):
1. Boundary mismatch between two gates. BaseCombatBehavior.cs line 456 treats the minimum as exclusive and the maximum as inclusive. BigMonsterAttackBehavior.cs line 91 treats both as inclusive. A threshold at the exact value behaves differently by family. Fix: one helper and one written rule, for example [min, max) or (min, max].
2. Wild boar runs its fallback once per spurt entry. In the loop (WildBoarAttackBehavior.cs 96-117), each entry that is not below its threshold calls PickSkillAndUseIt (line 115). With N entries and health above every threshold, that call runs N times per tick. Fix: pick once, after the loop.
3. Wild boar dead time. When the spurt condition holds but the target is outside that spurt's range (lines 103-111), nothing happens that tick (no else). Fix: fall through to the normal pick when out of spurt range.
4. No latch on the spurt. The old crossing check (line 99, commented as `_prevHealth`) was removed, so the spurt fires whenever its cooldown is free while below the threshold. This may be intended. Fix: decide. Use a fired flag per threshold if the spurt should happen once per crossing.
5. Percent and flat bonuses in list order (Npc.cs 156-162; Unit.cs 694). Fix: sum flats first, then apply percent to the base.
6. Grade values are not ordinal (NpcGradeType.cs 5-12). Fix: an explicit ordered tier table if anything compares grades.

## 5. A 5-minute look test Dom can judge on his phone

Three creatures in one zone, our own art or boxes, at 375 wide:
1. Hold-stance ranged creature at its spawn. It does not move until a target is in range. Does it read as "guarding"?
2. Roaming charge creature. It wanders within a small patch, opens with a charge, and below 70 percent switches to a heavier move. Can you see the switch in the attack, without reading a number?
3. Big boss with three health bands (100 to 70, 70 to 30, 30 to 0), each drawing a different move list by weight. Play it down through the bands. Does the change of attack read at each band edge, and does it read the same at the exact edge value (test both sides of the boundary)?
Dom judges: can he tell the stance from the idle, and can he tell the band change without a health bar.

## 6. Licence and IP

- Code: conflicting licence statements (LGPL v3 in the README, GPL v3 text in LICENSE.GPL, MIT in LICENSE.MIT). Treated as copyleft: clean-room shape only. No code, enum or name copied.
- Names in the donor (Almighty, WildBoar, Flytrap, Archer, BigMonster, the boss phase names in code comments) are donor names. Recreate under our own names. Keep the trait, change the name and the body.
- Game data: no licence line; rights holder not stated; unofficial server. Inspiration stays category-level ("a charging boar that changes its attack below a health threshold"). No numbers or ids taken.
- No legal conclusion is drawn.

## 7. Gaps

- Client pack absent: npcs (ai_file_id, npc_grade_id, npc_kind_id, level, npc_ai_param_id), npc_ai_params (the Lua param strings), unit_formulas, unit_formula_variables and formulas. Family binding, stat values and the Lua parameter values are not known here.
- Not read: ArcherAttackBehavior and BigMonsterAttackBehavior bodies (beyond the health filter), FlytrapAiCharacter body, AlmightyAttackBehavior internals (only its call into BaseCombatBehavior), IdleBehavior, the roam behaviour, MoveInRange, and the spurt skill templates.
- Idle and ambient animation vocabulary: not read (no animation files in the box).
- Death, respawn, loot reveal, walk density and readability at 375: not read in this pass (the creature-grammar cut does not cover them).
- Creatures.xml counts (13,382 rows, names only) come from DC003 and were not recounted here.
- Grade and kind mapping to each creature: not in the box.
- Half read: server. The data half is absent, so no value in any formula or npc row is claimed.
