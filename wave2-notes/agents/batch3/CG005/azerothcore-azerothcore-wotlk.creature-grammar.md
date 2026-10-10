# azerothcore-azerothcore-wotlk: creature-grammar (CG005)

Depth: full. Halves read: server code (Creature.cpp, CreatureData.h, ObjectMgr.cpp, StatSystem.cpp) and data rows (data/sql/base/db_world/creature_template.sql and creature_template_model.sql, counted on the VPS). The client half (models, display DB2) is not in the box.
Donor tree (VPS, read-only): /mnt/frankendom-donors/azerothcore-azerothcore-wotlk/
Asset audit used first: AU005 (class C overall, D for art). Catalogue used for cross-check: DC007 (counts matched on re-count: 29,947 creatures, 40,213 look rows, 5,588 multi-look creatures, 1,804 sibling links).
Not opened: the root CLAUDE.md and AGENTS.md (treated as data; not needed for this topic).
Checked: Creature.cpp GetRandomValidModel (lines 125-140), SelectLevel (1512-1533), _GetHealthMod and _GetDamageMod (1575-1612); CreatureData.h CreatureModel (169-183), GenerateHealth (313-316); ObjectMgr.cpp LoadCreatureTemplates (523-589, 628), CheckCreatureTemplate call (571), fold (1216), ChooseDisplayId (1644-1653); StatSystem.cpp (1169); the SQL schema and rows. Confidence: high on the code paths; the runtime was not run.

## 1. What the player sees and feels (375 wide)
Not read as a visual: no art in the box. What the server code says a player sees: a creature family whose look is picked at spawn from a short weighted list, shown at a per-look size, and promoted to a harder tier that shares the same look. The tier is the same silhouette with more health and more damage. Feel from code only: a zone can hold many of one family, and the tier is read by numbers and a different scale, not by a new model. Not verified on a screen.

## 2. Why it works / is striking
- Readable at 375 wide: the same look under a bigger scale is still the same silhouette, so the player sees "same creature, bigger or tougher".
- One signature: a hard tier that reuses the easy tier's look (two template rows point at one display id). A player who learns one look learns the family.
- Could be made ours at 20-30 percent resemblance: a template, a weighted look list, a scale per look and a tier link is a generic grammar. Ours will use our names, looks and numbers.

## 3. The rule behind it
1. One template row per creature (creature_template). It carries rank, unit class, and a damage modifier and a health modifier of its own.
2. Looks: creature_template_model holds up to four looks per template (Idx up to 3, a CHECK in the schema), each with a display id, a scale and a weight (creature_template_model.sql lines 23-32; CreatureModel struct in CreatureData.h lines 169-182).
3. Roll: if there is one look, its weight is ignored, even when 0 (Creature.cpp line 130). If there are several, a weighted random pick chooses one (Creature.cpp line 134).
4. Spawn override: a spawn row can pin a display id; the pin is matched against the template's looks (ObjectMgr.cpp line 1647). Only if no pin is set does the roll run (line 1652).
5. Health = base by expansion × the template's health modifier (CreatureData.h line 315), then × the rank health rate, applied in the level function (Creature.cpp lines 1531-1533).
6. Damage = the template damage modifier × the rank damage rate. The rank rate is folded into the template value once, after load, in CheckCreatureTemplate (ObjectMgr.cpp line 1216, called once from line 571). The load overwrites the value from the database first (line 628, via the map entry at line 589), so the fold does not compound on reload. The damage read is StatSystem.cpp line 1169.
7. Tiers: the template has three sibling slots (difficulty_entry_1..3). 1,804 templates link to at least one sibling (counted in creature_template.sql). An easy and a hard tier can share one display id (display 26967, creature_template_model.sql lines 32604 and 33414).

Counts (data half, counted on the VPS by awk over the rows; not tabulated per family):
- 40,213 look rows over 29,947 creatures.
- 5,588 creatures have two or more looks; they hold 15,854 look rows.
- 121 of those look rows have weight 0; 211 look rows in total have weight 0.
- 177 look rows have a scale other than 1 (154 above 1, 23 below 1).
- Weights in multi-look rows take 4 distinct values (values not tabulated).

Data fields (designer-tunable; donor values null because GPL code and game-derived rows, not MIT/Apache/BSD):
- look_weight: relative weight, unitless; 0 = never rolled when more than one look exists; donor_value_or_null: null
- look_scale: multiplier on the model, x; donor_value_or_null: null
- spawn_pin: spawn-level display id that skips the roll; unit: id; donor_value_or_null: null
- tier_health_mod: multiplier on base health, x; donor_value_or_null: null
- tier_damage_mod: multiplier on base damage, x; donor_value_or_null: null
- rank_health_rate: multiplier per rank, x; donor_value_or_null: null (the rate values are server config, not read)
- rank_damage_rate: multiplier per rank, x; donor_value_or_null: null
- tier_sibling_slots: count of sibling links per template, max 3; unit: count; donor_value_or_null: null

## 4. Frankendom mapping
- 700 zones as data: one template per family is the right shape for "100 Pit characters reused across zones". A zone can pin a look, or let the roll run for a zone palette.
- Many vs one (max 3 attackers): the tier link is the phone-sized boss tier. Keep it as two numbers (health, damage) plus a scale step, not a stat sheet.
- Server verified: the server rolls or pins the look at spawn and sends the display id and tier; the client draws the look, the scale and the tier mark. Kills stay server-side.
- Keep: one template per family; weighted looks; a scale per look; a tier as a sibling link that can share a look with the easy tier; a pin override.
- Change: the rank damage rate is folded into the template value at load (ObjectMgr.cpp line 1216). That hides the designer value after load and couples two systems. Keep the rank rate as its own field and multiply at runtime in one function. The fold is safe today only because the load overwrites the value first (line 628) and CheckCreatureTemplate runs once (line 571); our loader must keep that order or test for it.
- Change: a look with weight 0 among several looks is never rolled, and the code I read does not warn about it (Creature.cpp lines 130-140). Our validator must warn on it, and must refuse a list where every weight is 0.
- Change: the donor allows up to four looks per template. Our phone UI should show at most two tier marks and three looks, to keep the silhouette readable.

## 5. Five-minute look test (for Dom, on his phone)
One family silhouette at 375 wide in three looks (weights 2, 1, 1; scales 1.0, 1.0, 1.25) and one hard tier that reuses the first look with a glow and a scale step of 1.15. Dom answers: can he tell it is the same family across the three looks, and can he spot the hard tier without relying on size alone. Build only the weighted pick, the scale and the tier mark; no new art.

## 6. Licence and IP
- Code: GNU GPL v2 (LICENSE, as recorded in AU005; not re-read here).
- Data: game-derived SQL with no per-folder notice; the repo does not say the data is licensed for reuse; the owner is not named (AU005). Class C.
- The repo states it is not an official product of the game's rights-holder and is not endorsed by it (.github/README.md line 88, as recorded in AU005).
- Inspiration stays at category level: "one family template, a weighted look list, a scale per look, a hard tier that reuses the easy look". No row names, ids, looks or donor numbers are reused.
- Recreate as a clearly distinct original: keep the weighted look roll, the scale per look, the shared-look tier and the separate health and damage tiers. Change the names, the looks, the marks and every number.

## 7. Gaps
- Not read: most of the 309 db_world SQL files (creature tables counted and sampled, not read in full); the archive, updates and old folders; the CreatureGroups and spawn consumers; GetModelWithDisplayId body; scripts under src/server/scripts (names only, via ScriptName columns).
- Not read: the rank rate values in config; the DB2 display tables (absent); the client half (models, idle animations, death and respawn presentation, loot reveal, readability at 375 wide): not in this box, not "absent from the game".
- Not read: CLAUDE.md and AGENTS.md at the donor root (treated as data; not needed for this topic). dep/ and modules/ beyond their readmes.
- Half read: server code and data rows. Client half: absent from the box.

Best transferable idea: a family template with a weighted list of looks, a scale per look and a hard tier that reuses the easy look, with the rank rate kept as its own runtime multiplier instead of folded into the template.
