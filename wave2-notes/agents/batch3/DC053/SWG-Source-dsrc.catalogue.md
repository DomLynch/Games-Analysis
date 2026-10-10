# SWG-Source-dsrc (catalogue, cell DC053)

Donor: `/mnt/frankendom-donors/SWG-Source-dsrc/` (VPS, read-only). **RESTRICTED** per `_RESTRICTED-NOTE.txt` (leaked official SWG source, proprietary). Class **C**. Inspiration is category-level only: no constants, no stat blocks, no copied text, no instance-level looks. Every idea below is to be recreated as a clearly distinct original, never a copy. Trait KEPT and trait CHANGED are named for each item.

Half read: **data half** (`sku.0/sys.server/compiled/game/datatables`, `sku.0/sys.shared/compiled/game/datatables`, `creation`, `misc`, and top-level `LICENSE.md`, `README.md`, `_RESTRICTED-NOTE.txt`). The matching server-code half is not in this donor; the audit (AU051) names `swgemu-Core3` as the server-code donor in the box. I did not read that donor. The client half is `SWG-Source-client-tools` (catalogued in its own file).

## Counts (from the data tables)
- creatures: **6,711** rows in `mob/creatures.tab`: 5,486 NORMAL, 964 ELITE, 261 BOSS.
- tamable beast types: **197** rows in `beast/beasts.tab`.
- classes: **12** profession families (`class_*` in `sys.shared/.../skill/skills.tab`), 28 phase rows each across phases 1 to 4; plus trader (its own tree). Species: **10** (`creation/racial_mods.tab`).
- weapons: **691** weapon templates (melee 376, ranged 305, mine 4, trap 1, creature 1).
- gear_sets: **97** item sets (`item/item_sets.tab`); **34** armour set folders with **554** armour files.
- zones: **21** planets (`region/planets.tab`); **23** region tables with **2,523** region rows; **1,829** `npc_lair` camp/herd tables; **846** POI tables; **64** dungeon loot tables.

## 1. Creatures / beasts: families and tiers
- Tiers on every enemy row: NORMAL, ELITE, BOSS (`mob/creatures.tab`, header type row). Named tiers exist for the level table `mob/stat_balance.tab` (levels 1 to 500, separate Elite_ and Boss_ column groups for HP, damage per second, to-hit, defence, armour, XP, regen).
- Boss/elite escalation, read from the level table (ratios only, no values reproduced):
  - Boss HP starts about 10 times normal at level 1, about 7.5 times at level 10, about 8 times at level 50, then reaches a fixed ceiling from level 100 on.
  - Elite HP is 2 times normal at levels 1, 10 and 50, then equals normal from level 100.
  - Damage per second (sampled levels 1, 10, 50, 100, 200, 500): elite runs about 1.7 times normal at level 1 and about 2.4 to 3 times from level 50 on. Boss runs about 1.7 times at level 1, about 4 times at level 50, a peak near 12 times at level 100, then about 2.4 times from level 200 on. Elite damage does not converge to normal the way elite HP does.
- Tamable beasts (`beast/beasts.tab`): **28 named families** plus one test family (`qa`). Largest: raptor 14, predatory cat 14, bull 14, lizard 11, spider 10, monkey 10, elephant 10. The 197 rows carry no blank family value.
- Each beast also has one **attribute bonus class**: DAMAGE 46, DODGE 42, DEFENSE 40, NINJA 35, ARMOR_BREAK 24, BLOCK 10 (sums to 197).
- Beast abilities (`beast/beast_specials.tab`, 110 rows): 98 combat (default when blank), 10 noncombat, 2 innate. 35 ability skill lines, for example charge, stomp, bite, claw, spit, hamstring, enfeeble, frenzy, provoke, wing buffet, plus support lines for helper monkeys.
- Wild creature ability lists (`pet/wild_ability.tab`): 81 named lists with a per-list chance column. Lists are named by strength words (for example a weak low-damage list).
- Enemy families by social group: 715 distinct groups. Largest: townsperson 870, rebel 602, imperial 554, bounty target 160, thug 115, Jabba's household 87. Boss rows lean on event families (heroic 62, mission 37, SOM 31, outbreak 14, EP3 14).
- Lairs and herds (`npc_lair/`, 1,829 files): file-name tags boss 150, pack 181, herd 93, lair 467, camp 29 (tags overlap; counted from names only).

Top 8 most striking (labels are mine; each is a category, not an instance):

1. **Plated charger beast** (bull family, DEFENSE class). Why: a wide, low silhouette reads at 375 wide; the defence-class bonus makes it feel like a tank. Keep: defence bonus, charge as the signature move. Change: our own silhouette, colour and name. Ref: `sku.0/sys.server/compiled/game/datatables/beast/beasts.tab` (bull rows); `beast/beast_specials.tab` (charge lines).
2. **Stalking cat** (predatory cat family, 14 types). Why: a crouch-then-pounce loop is one readable behaviour. Keep: the stalk-then-pounce cadence. Change: our animation timing and our own sound. Ref: `beast/beasts.tab` (predatory_cat rows).
3. **Web spinner** (spider family, DODGE class, 10 types). Why: dodge-class beasts are fast and hard to pin, which suits a duel. Keep: dodge bonus, slowing ability. Change: our web visual and our own name. Ref: `beast/beasts.tab` (spider rows).
4. **Pack raptor** (raptor family, 14 types). Why: many small fast units read well against one player (many-vs-one). Keep: group charge pattern. Change: our pack size, spacing and silhouette. Ref: `beast/beasts.tab` (raptor rows); `beast/beast_specials.tab`.
5. **Capped late boss** (BOSS rows). Why: a boss whose HP stops rising at a fixed ceiling keeps late fights finishable. Keep: the HP ceiling and the boss-only curve. Change: our curve and our numbers (zone data, row 21). Ref: `mob/stat_balance.tab` (Boss_ columns); `mob/creatures.tab` (BOSS rows).
6. **Elite that fades to normal HP** (ELITE rows). Why: an HP multiplier of 2 times at low levels that disappears by level 100 makes elite HP a phase, not a permanent class. Keep: the HP fade-out. Change: our fade curve and tier names; elite damage in the data does not fade the same way, so do not copy that part. Ref: `mob/stat_balance.tab` (Elite_ columns).
7. **Lair with boss and pack** (npc_lair boss plus pack tables). Why: one landmark with a roster and a boss is a clear destination on a map. Keep: one table per lair, boss plus pack. Change: our layouts and rosters. Ref: `npc_lair/` (boss-tagged and pack-tagged files; names not opened).
8. **Theatre formation of many mobs** (imperial uber lair). Why: a formation of many mobs over an overload region is a mass-encounter pattern. Keep: formation list plus region difficulty range. Change: our formation rules and our numbers. Ref: `uberlair/imperial_uber_lair_01.tab` (header read; 39 rows not opened).

## 2. Classes / races / factions
- Professions (12 families, each with four phases; skill rows in `sys.shared/compiled/game/datatables/skill/skills.tab`). Only the family names and the phase count were read; the role of each family is inferred from its name and is not verified against its skill rows:
  - bounty hunter, commando, domestics, engineering, entertainer, force sensitive, medic, munitions, officer, smuggler, spy, structures.
  - Force sensitive is the one with separate light and dark rank graphs (`force_rank_light*`, `force_rank_dark*`), which was read.
- Progression shape: a base template (phase 1) branches into two specialisations (2a and 2b) in `skill_template/skill_template.tab` (38 rows). Trader has its own eight-row tier (0a to 1d). Space pilots have three faction templates.
- Species (10): bothan, human, moncalamari, rodian, trandoshan, twilek, wookiee, zabrak, sullustan, ithorian. Each row sets nine stat modifiers (`creation/racial_mods.tab`).
- Force sensitivity uses light and dark rank graphs (`force_rank_light*`, `force_rank_dark*`) in `skills.tab`.

## 3. Weapons: families, tiers, special properties
- Families (`sku.0/sys.shared/compiled/game/object/weapon/`): melee 376 (2h sword, axe, baton, knife, polearm, sword, unarmed, special, base); ranged 305 (carbine, pistol, rifle, heavy, grenade, droid, turret, vehicle, base); creature 1; mine 4; trap 1.
- Special properties: magic item tables in `sku.0/sys.server/compiled/game/datatables/magic_item/weapon/` (7 files). Each weapon class takes 3 to 4 modifiers: accuracy, speed, damage, ranged defence, and a shared slope-movement modifier. Shown in data only; I did not read the code that applies them.
- Visual tiers: material variants exist as names only (naktra crystal, metal). Not read: binary `.tpf` files.

Top 5 striking (criteria: readable silhouette at 375 wide, one signature behaviour, one sound or effect, could be ours at 20 to 30 percent resemblance):
1. **Crystal blade** (naktra crystal knife, `sku.0/sys.shared/compiled/game/object/draft_schematic/weapon/shared_knife_naktra_crystal.tpf`): material-tier silhouette. Keep: crystal material as a tier. Change: our glow and our blade shape. Visuals not read.
2. **Crystal rifle** (`shared_rifle_naktra_crystal.tpf`): same tier idea on a ranged frame. Visuals not read.
3. **Accuracy or speed weapon mod set** (`magic_item/weapon/*.tab`): one modifier per weapon class that trades accuracy against speed. Keep: a trade-off pair per class. Change: our own mod names and values.
4. **Unarmed mod set** (`magic_item/weapon/unarmed_melee.tab`, 4 entries): unarmed fights get their own damage and speed modifiers, which fits a bare-hands style.
5. **Mine and trap family** (`weapon/mine`, `weapon/trap`): a placed, triggered weapon family, separate from melee and ranged. Keep: placed-weapon category. Change: our trigger and our visuals.

## 4. Armour / gear: sets, material tiers, how tiers show
- Armour sets (`sku.0/sys.shared/compiled/game/object/tangible/wearables/armor/`, 34 folders, 554 files). Largest: rebel assault 40 files, stormtrooper 35, scout trooper 30, marauder 30, clone trooper 30. Material-named sets: bone 10, chitin 18, composite 9, padded 10. Species-named sets: ithorian (defender, guardian, sentinel), kashyyykian (black mountain, ceremonial, hunting), ubese, tantel, zam, ris, nightsister, singing mountain clan.
- Set bonuses (`item/item_sets.tab`, 97 rows): piece counts run from 2 to 11, most often 3 to 5. 29 sets carry a third tier effect (threshold names end in 1, 2, 3). Effects are per role (commando, smuggler, spy, medic, officer, jedi, bounty hunter, trader) with a dps or utility split.
- Armour modifiers (`magic_item/armor/armor.tab`, 12 entries): melee and ranged defence, four resistances (bleeding, poison, disease, fire), and per-weapon-class defence.
- Modifier cost caps (`magic_item/mod_cost.tab`, 32 rows): each modifier has a cost and a maximum.
- How tiers show: material and set names only in this half. Visual tier cues not read.

Top 5 striking:
1. **Bone and chitin armour** (`armor/bone/`, `armor/chitin/`): natural materials as a tier between cloth and plate. Keep: natural-material set family. Change: our materials and palette.
2. **Kashyyykian ceremonial set** (`armor/kashyyykian_ceremonial/`, 7 files): ceremonial pieces as a distinct gear style. Keep: ceremonial look as its own set. Change: our motifs and colours.
3. **Role set bonus with three steps** (`item/item_sets.tab`, 29 sets with a third tier effect): a 3-step bonus that grows with pieces worn. Keep: three thresholds. Change: our role names and effect values.
4. **Mandalorian set trio** (`armor/mandalorian/`, `mandalorian_imperial/`, `mandalorian_rebel/`): one base family split by faction. Keep: one base with faction variants. Change: our factions and marks.
5. **Infiltrator armour** (`armor/infiltrator/`, 20 files): name-based idea only (files not opened): a stealth-style gear set. Keep: a separate low-profile gear family. Change: our silhouette and colour.

## 5. Zones / dungeons
- Planets: 21 rows in `region/planets.tab` (bounding box per planet).
- Regions: 23 tables with 2,523 rows. Each region is a rectangle or circle with: a biome enum (28 types from desert to overload, including plateau, oasis, canyon, swamp, volcano, mountains, city, theatre, pathfind), a PvP type (normal, truce, PvP battlefield, PvE battlefield, PvP advanced), a min and max difficulty, a spawn type (off, on, mission, default, difficulty), and flags for building, municipal and visibility. Example file: `region/region_kashyyyk_dead_forest.tab` (header read).
- Environment flags (`region/region_environment_flags.tab`): forced daytime, forced nighttime, spooky zone.
- POI: 846 tables, most on Tatooine (171), Corellia (131), Naboo (122), Lok (84).
- Dungeon archetypes (`dungeon/`): space dungeon; fort (Tusken); a platform boss; a timed wave dungeon (`death_watch/`, 11 wave tables); a five-event trial set (`mustafar_trials/`); a power-cell puzzle (`myyydril/`); a camp command bunker (`trando_slave_camp/`).
- Loot per dungeon: `loot/dungeon/` (64 tables, one per dungeon). `loot/dungeon/tables.txt` says each dungeon has five loot levels: level 1 for early content, levels 2 to 4 for middle difficulty (`tables.txt` line 4).
- Spawn types: `spawning/ground_spawning/types/` (716 files in 14 region folders). Each file is one spawn group with a size value.
- Hazards: timed water-pressure waves (`death_watch/water_pressure*.tab`, names only), volcano battlefield (`mustafar_trials/volcano_battlefield/`, names only), spooky-zone flag.

Top 5 striking:
1. **Timed water-pressure waves** (`dungeon/death_watch/water_pressure.tab`, `water_pressure_light.tab`): a hazard that escalates in waves on a timer. Keep: timed wave escalation. Change: our hazard, our timing, our sound.
2. **Volcano battlefield** (`dungeon/mustafar_trials/volcano_battlefield/volcano_event_data.tab`): a staged event on a hazard map. Keep: staged event data. Change: our map and our phase rules.
3. **Five-level dungeon loot ladder** (`loot/dungeon/tables.txt`, line 4): five loot tiers per dungeon. Keep: five levels. Change: our tier names and rarity colours.
4. **Theatre overload region** (`uberlair/imperial_uber_lair_01.tab`): a theatre with mob formations and overload regions. Keep: formation list plus region difficulty range. Change: our formations.
5. **Spooky-zone flag** (`region/region_environment_flags.tab`): a named zone flag (the flag's effect is not read; name only). Keep: a single flag per region that a zone can carry. Change: our mood effects and sound.

## 6. Item and effect looks worth recreating
- Three-slot palette recolour per beast template: `beast/beast_master_color_chances.tab` (184 rows; each row gives three colour slots against a 52-entry palette, per the `beasts.tab` header). Technique: one model, many skins. Keep: three slots. Change: our palette.
- Named colour table: `color/rgb.tab` (138 named entries). Values not reproduced.
- Feature palette swatches: `sku.0/sys.shared/built/game/palette/` (32 images: skin 15, eye 9, hair 4, lips 2, horns 1, tattoo 1). Technique: palette swatches keyed by feature. Images not opened.
- Crystal material: `draft_schematic/weapon/shared_knife_naktra_crystal.tpf` and `shared_rifle_naktra_crystal.tpf` (names only). Technique: crystal material tier. Not read.
- Gold-plated droid: `sku.0/sys.shared/compiled/game/object/static/creature/shared_droids_protocol_droid_gold.tpf` (name only). Technique: gold-plated variant of a shared model. Not read.
- Glow props and particles: `object/static/particle/shared_particle_volcano_glow_1.tpf`, `shared_pt_frn_all_glowing_light_s3.tpf`, `shared_pt_light_streetlamp_gold.tpf`, and `object/draft_schematic/dance_prop/shared_prop_glowstick_*.tpf`. Technique: particle glow and gold-tinted light. Not read.
- Bone and chitin armour materials (`armor/bone/`, `armor/chitin/`). Technique: natural-material textures. Not read.

## 7. Inspiration for Frankendom
1. **Tamed beast roster with attribute classes** (original name: "Bond beast roster"). Idea: each tamed beast has one family and one attribute class (defence, damage, dodge, block, ninja, armour break). Keep: family plus attribute class per beast; the 6-class split. Change: our own families, names, silhouettes and sounds.
2. **Elite that fades to normal HP** (original name: "Fading elite"). Idea: elites start at a clear multiple of normal HP, then converge to normal HP by a set level, while keeping a sharper damage edge. Keep: the HP multiplier that fades out. Change: our curve, our tier names, and our numbers (zone data, row 23).
3. **Boss HP ceiling** (original name: "Capped warden"). Idea: boss HP climbs, then stops at a fixed ceiling so late fights end. Keep: the ceiling. Change: our curve and our boss designs.
4. **Five-step dungeon chest** (original name: "Five-rung cache"). Idea: each dungeon has five loot tiers: tier 1 early, tiers 2 to 4 middle. Keep: five tiers per dungeon. Change: our tier names, rarity colour and drop rules.
5. **Lair with boss and pack** (original name: "Camp with a warlord"). Idea: a camp is one landmark with a small roster and a boss. Keep: one table per camp. Change: our layouts and rosters.
6. **Three-step role set** (original name: "Role kit"). Idea: a gear set with three bonus steps that grow with pieces worn, one set per role. Keep: three thresholds. Change: our roles, our effects and our set names.
7. **Timed water-wave hazard** (original name: "Rising tide hall"). Idea: a timed hazard that escalates in waves through a room. Keep: timed wave escalation. Change: our hazard, our timing and our visuals.

## Licence
- `LICENSE.md` line 1 is the GNU Lesser General Public License v3 text.
- `_RESTRICTED-NOTE.txt` line 1 says leaked official SWG (Sony Online/Disney) source, proprietary, no licence.
- These conflict. Class C for every data group. Clean-room: study the shape only. No code, constants, or text copied. This is not a legal opinion.

## Not read
- All `.java` scripts (counted by audit, not opened by me), including `sku.0/sys.server/compiled/game/script/`.
- Binary files: `.tpf` (63,454 by audit), `.mif`, `.me`, `.tdf`, `.xls`, `.cfg`, `.pl`, `.yml`, `.xml`, `.tga` palettes, and armour/weapon `.tpf` visuals.
- Table contents beyond headers and aggregates for: `npc_lair/` (contents), `poi/`, `spawning/ground_spawning/types/` (only one header read), `uberlair/imperial_uber_lair_01.tab` (header only), `dungeon/` event files (names only), `loot/` other than `tables.txt` lines 1 to 8, `magic_item/wearable/*` (counts and one table, `ring.tab`, read).
- `sku.0/sys.shared/compiled/game/misc/planet_crc_string_table.txt`: this session counted 47 single-column entries and did not quote them.
- `build.xml`, `build.properties`, `include/`, `README.md` beyond line 3 (audit read).
