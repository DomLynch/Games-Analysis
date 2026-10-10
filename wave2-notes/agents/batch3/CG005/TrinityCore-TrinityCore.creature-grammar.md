# TrinityCore-TrinityCore: creature-grammar (CG005)

Depth: thin. Half read: server (code). The data half is only partly in the box: sql/base/dev/world_database.sql is schema only (0 INSERT lines), and the rows in sql/updates/world/master are recent fixes, not the creature census.
Donor tree (VPS, read-only): /mnt/frankendom-donors/TrinityCore-TrinityCore/
Asset audit used first: AU053 (server half; class C, code GPL 2.0, row origin unstated).
Checked: Creature.cpp (GetRandomValidModel, UpdateLevelDependantStats, GetMaxHealthByLevel, GetHealthMod, GetDamageMod), CreatureData.h (CreatureModel, CreatureDifficulty), ObjectMgr.cpp (ChooseDisplayId, difficulty load), StatSystem.cpp (damage range line), world_database.sql schema lines 961, 976, 1042, 1116, 1121. Confidence: high on the code paths named; medium on how often the rules fire at runtime (not run).

## 1. What the player sees and feels (375 wide)
Not read as a visual: the client half (models, display info) is not in this donor. What the server code says a player sees is one creature family whose look is picked from a short weighted list at spawn, sized by a per-look scale, and then made tougher by a difficulty tier. A hard tier is the same silhouette with more health and more damage, not a new creature. The feel from code only: the same shape keeps coming back, and the tier shows in numbers, not in a new design. Not verified on a screen.

## 2. Why it works / is striking
- Readable at 375 wide: the family silhouette is the one thing the roll keeps. A scale change of one step is still the same silhouette, so the player reads "same family, bigger" at a glance.
- One signature: a single weighted roll decides the look for each spawn, so a zone full of one family does not look like copies of one model.
- Could be made ours at 20-30 percent resemblance: a template row plus a weighted list of looks plus a tier multiplier is a generic grammar, and the names, looks and numbers are ours.

## 3. The rule behind it
1. One template per family (creature_template row). The template holds the family, type, classification and a scale.
2. Looks: a list of display models per template. Each model has a display id, a scale and a weight (CreatureModel struct, CreatureData.h lines 431-444: display id, DisplayScale, Probability).
3. Roll: if the list has one entry, its weight is ignored, even when it is 0 (Creature.cpp line 118). If it has more, a weighted random pick chooses one (Creature.cpp line 122; ObjectMgr.cpp line 1608 is the template roll).
4. Override: a spawn row can pin a display; if it does, no roll happens (ObjectMgr.cpp lines 1604-1605).
5. Tier: a difficulty row multiplies health and damage. HealthModifier and DamageModifier (CreatureDifficulty struct, CreatureData.h lines 453 and 456). Health = base by level × HealthModifier × rank health rate (Creature.cpp line 3179 and line 1633). Damage = DamageModifier × rank damage rate (ObjectMgr.cpp line 976; StatSystem.cpp line 1139 reads the folded value).
6. The client query reports the display list and its probabilities (Creature.cpp line 212).

Data fields (designer-tunable; donor values null because GPL code and game-derived rows, not MIT/Apache/BSD):
- display_weight: relative weight, unitless; 0 = never rolled when more than one look exists; donor_value_or_null: null
- display_scale: multiplier on the model, x; donor_value_or_null: null
- display_pin: spawn-level display id that skips the roll; unit: id; donor_value_or_null: null
- tier_health_mod: multiplier on base health, x; donor_value_or_null: null
- tier_damage_mod: multiplier on base damage, x; donor_value_or_null: null
- rank_health_rate: multiplier per rank (elite, rare, boss), x; donor_value_or_null: null (the rate values are in the config file, not read)
- rank_damage_rate: multiplier per rank, x; donor_value_or_null: null

## 4. Frankendom mapping
- 700 zones as data: one template per family is the right shape for "100 Pit characters reused across zones". A zone spawn row pins a look or lets the roll run, which lets a zone theme pick a palette without a new creature.
- Many vs one (max 3 attackers): the tier multiplier is the phone-sized version of a boss tier. Keep it as two numbers (health, damage), not a stat sheet.
- Server verified: the server rolls the look and tier at spawn and sends the display id and tier; the client draws the look, the scale and the tier mark. Kills stay server-side.
- Keep: one template, weighted looks, separate health and damage tier multipliers, a pin override.
- Change: TrinityCore folds the rank damage rate into the tier DamageModifier at load (ObjectMgr.cpp lines 975-976). That hides the designer value after load. Keep the rank rate as its own field and multiply at runtime in one function, the same way the health rate is applied. The donor's own TODO on that line asks whether the fold still applies; treat it as open, not settled.
- Change: a look with weight 0 in a multi-look list is never rolled. The code I read (Creature.cpp lines 118-124) does not warn about it. Our validator must warn on it.

## 5. Five-minute look test (for Dom, on his phone)
One family silhouette at 375 wide, three looks (weights 2, 1, 1; scales 1.0, 1.0, 1.25) and one tier mark (a crown and a glow, same silhouette, health and damage up). Dom answers two things: can he tell it is the same family in all three looks, and can he spot the tier without relying on size alone. Build only the weighted pick, the scale and the tier mark; no new art.

## 6. Licence and IP
- Code: GPL 2.0 (COPYING line 1; README line 82, both as recorded in AU053, not re-read here).
- Assets: none separate. The sql/ rows are game-derived with no stated origin. Class C. The rights-holder is not named in the repo (AU053).
- Inspiration stays at category level: "a same-family look roll with a weighted list and a scale". No row names, no ids, no numbers from the donor are reused.
- Recreate as a clearly distinct original: keep the weighted-look roll and the separate tier multipliers; change the names, the looks, the tier marks and every number.

## 7. Gaps
- Not read: creature rows in full (absent from this box; the sql/old/3.3.5a legacy folder has no creature_template_model inserts; sql/updates/world/master has 55 recent files with 43 matching lines for creature_template, which are small fixes, not the census). Entry count not taken.
- Not read: the rank rate values in the config file; the DB2 display tables; the CreatureGroups and spawn consumers beyond the struct; GetHealthMultiplierForTarget (level scaling) beyond its first line.
- Client half (models, idle animations, death presentation, loot reveal, readability at 375 wide): not in this donor box. Not "absent from the game"; absent from the half I read.
- dep/ (third-party libraries) not read. No AGENTS.md or CLAUDE.md opened at this donor root (none needed for this topic).
- Half read: server code. Data half: schema plus recent updates only.

Best transferable idea: one family template holds a weighted list of looks with a scale each, plus separate health and damage tier multipliers, with a pin override for spawns.
