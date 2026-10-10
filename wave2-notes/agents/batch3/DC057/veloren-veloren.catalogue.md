# veloren-veloren (design catalogue, DC057)

Donor/Licence: Veloren, open-source voxel MMO (Rust). Code GPL-3.0 (LICENSE lines 1-2; README line 100). Assets are licensed per entry in assets/credits.ron: music CC-BY-NC-SA 4.0 with an "Added restrictions" note (no use in other games unless parody); 2 sounds CC BY 4.0; 16 sounds with no licence (GPL-3 by the file's own default); fonts OFL, CC BY-SA, CC BY, Apache, MIT, GPL-2; 3 models CC-BY-NC-SA 4.0. Most .vox models, PNGs, RON data and .ftl files are uncredited. Use: shape and mechanism only. Dom's rule: recreate as clearly distinct originals, never a copy (about 20-30 percent resemblance in mood only). Not legal advice.

Checked: 59 receipts in receipts.tsv (Veloren and vmangos rows together); verify_receipts.py run, 59 ok, 0 failed. Audit AU055 read first and not repeated. One correction to AU055: the bird idle head glance is keyed to the floored value of (global_time/2 + anim_time/8), so it steps when that value changes (about every 2 s of global time), not on a half-second clock (voxygen/anim/src/bird_large/idle.rs line 27).

Halves read: DATA half (assets/common/entity, items, abilities, loot_tables, skill_trees, skillset, world/wildlife/spawn, material_stats_manifest.ron); COMMON half (common/src/comp/body enums, comp/inventory/item/armor.rs and mod.rs, terrain/biome.rs); CLIENT half (voxygen/src/audio/music.rs, hud/loot_scroller.rs, voxygen/anim/src/bird_large/idle.rs, figure and lod glow in assets/voxygen/shaders). SERVER half NOT read: server/ and server-cli/ (the code that turns spawn rules into live packs and runs creature AI), and rtsim/. Paired half is in the same repo; not read.

Counts (what I counted, how):
- Wild creature entity files: 165 in assets/common/entity/wild (86 aggressive, 79 peaceful; by find). Dungeon entity files: 85 across 11 folders. World-boss entity files: 2 (gigas_fire, gigas_frost), plus 2 summon entity files.
- Creature families: my grouping by file name, about 14 groups (section 1). Bodies were not read for most.
- Weapon item files: 43 in assets/common/items/weapons, 10 families plus an empty folder.
- Armour item files: 447 in assets/common/items/armor across 32 set folders; 46 distinct FromSet names.
- Biomes: 12 BiomeKind variants (common/src/terrain/biome.rs line 7 onward, counted by line scan). Site kinds: 24 SiteKind variants (world/src/site/mod.rs line 107 onward, counted by line scan; about 22 names read).
- Wildlife spawn: 50 files in 8 climate folders, 71 Pack rules (spawn_mode Land 62, Water 6, Ice 3; counted by grep).

## 1. Creatures and beasts

Families (my grouping by file name; bodies not read unless stated):
- Winged great beasts: bird_large species enum has 8 species (common/src/comp/body/bird_large.rs lines 37-46): cloud, flame, frost, sea and weald wyverns, plus phoenix, roc, cockatrice. Eight loot tables in loot_tables/creature/bird_large.
- Drakes (ice, lava, moss): 3 files. Ice drake loot via quad_medium (entity line 6).
- Saurok (mighty, occult, sly): 3 files.
- Trolls (cave, mountain, swamp): 3 files. Ogre, cyclops, grolgar, roshwalr also in the aggressive list (named only).
- Legoom family: 5 colour variants (green, ochre, purple, red, umber). Body not read.
- Snappers (reef, rock, root): 3. Beetles (horn, stag): 2, plus weevil.
- Spiders (black widow, cave spider, tarantula): 3. Raptors (sand, snow, wood): 3. Big cats and bears (male lion, snow leopard, tiger, bear, wolf, hyena).
- Goblins (chucker, ruffian, thug): 3. Oni (blue, red): 2.
- Undead and spirit: bonerattler, dullahan, wendigo, werewolf (named only).
- Bosses: world bosses gigas_fire and gigas_frost; dungeon elites (cultist warlord and others in dungeon folders).

Escalation with level: not in the creature entity files, which set body, alignment, loot, loadout and meta only. The escalation dial that is visible in the data is the skillset preset (assets/common/skillset/preset: rank1 to rank5 plus fullskill, per weapon). The boreal summon uses rank5 fullskill (section 1, item 7). Per-body stat tables are in common/src/comp/body/mod.rs (base_health, base_energy functions; values not read).

Boss and summon pattern: the Frost Gigas ability set (assets/common/abilities/ability_set_manifest.ron lines 982-992) has a cleave primary, a wide cleave secondary and at least seven extra moves (lines 983-992 read), one of which is a frost summon. The frost summon is a BasicSummon for 2 NPCs placed 5 to 10 units away with the boreal summon loadout (frost_summons.ron lines 1-7). The link from the boss body to this set is by name (set key "Frost Gigas" against body gigas_frost); I did not read the body-to-set code.

Top 7 most striking (the eighth is not made; the hydra body was not read well enough to name a signature):

1. Label: Pitched-chest winged wyrm (frost wyvern).
   Why: forward-pitched chest (idle.rs line 69); a head that glances to new targets on a stepped clock (idle.rs line 27); a three-hit combo whose third strike has the longest buildup (triplestrike.ron line 68); a 360-degree ice shockwave that applies a Frozen buff and can be jumped over (iceshockwave.ron lines 9, 13, 16, 18). Design claim, not tested: it should read as watchful at 375 wide even at idle.
   Keep: forward chest; stepped head glance; three-hit combo with a heavier finisher; full-circle shockwave with a jump window.
   Change: our own wing count and shape; our palette; our element; our head crest.
   Ref: assets/common/entity/wild/aggressive/frostwyvern.ron lines 4-6; assets/common/abilities/ability_set_manifest.ron lines 938-945; voxygen/anim/src/bird_large/idle.rs lines 27, 69.

2. Label: Wyvern family template (four elements).
   Why: flame, frost, cloud and sea wyverns each have the same set shape: a bomb primary, the same three-hit combo as secondary, and a shockwave plus a spray in the extra list. Only the element and the names change.
   Keep: one set shape per family; the element swap.
   Change: our element names and effects; per-family spawn weight as zone data.
   Ref: assets/common/abilities/ability_set_manifest.ron lines 930-959 (Flame at 930, Frost at 938, Cloud at 946, Sea at 954).

3. Label: Storm wyrm (cloud wyvern).
   Why: lightning bomb, lightning shockwave and lightning spray in the same slot pattern; the element reads on screen from the first move.
   Keep: one readable element per move; a bomb that opens the fight.
   Change: our element and our shockwave shape.
   Ref: assets/common/abilities/ability_set_manifest.ron lines 946-951 (primary at 947).

4. Label: Ink tide wyrm (sea wyvern).
   Why: an ink bomb, an ink shockwave and an ink spray: a water-themed family with its own moves for a sea encounter.
   Keep: family moves tuned to the terrain (water).
   Change: our hazard is our own, not ink.
   Ref: assets/common/abilities/ability_set_manifest.ron lines 954-959 (primary at 955).

5. Label: Frost colossus (gigas frost world boss).
   Why: a world boss with a two-NPC summon ability (frost_summons.ron lines 6-7, 15) and a drop that is a lottery of an armour set or a crafting ingredient, drawn as a 3-to-4 count range (loot_tables/world/world_bosses/gigas_frost/boss.ron lines 2-3).
   Keep: boss that calls escorts; lottery drop with a count range.
   Change: our escort count (we cap attackers at MAX_ATTACKERS = 3); our drop pool; our names.
   Ref: assets/common/entity/world/world_bosses/gigas_frost.ron line 4; assets/common/abilities/custom/gigas_frost/frost_summons.ron lines 1-7; assets/common/loot_tables/world/world_bosses/gigas_frost/boss.ron lines 2-3.

6. Label: Cultist warlord (dungeon elite).
   Why: an elite whose hand weapon is one of two at random (sword or hammer), with its own large loot table (cultist/warlord.ron lines 6, 11-12). One elite per dungeon that plays differently each run.
   Keep: random weapon pick at spawn; dedicated large loot table.
   Change: our weapons and our loot table.
   Ref: assets/common/entity/dungeon/cultist/warlord.ron lines 4-12.

7. Label: Summoned boreal warrior (rank five escort).
   Why: a summoned NPC that gets a random ranged or melee weapon, with the rank-five full-skill preset (summons/boreal_warrior.ron lines 4-17). Escalation by preset, not by a level number. Its ability set has a hammer branch (singlestrike, dash, leap) and a bow branch (doublestrike, shotgun, trap) (ability_set_manifest.ron lines 997-1007).
   Keep: a preset rank as the escalation dial; random weapon pick; a two-branch set.
   Change: our rank names and our escort limit.
   Ref: assets/common/entity/world/world_bosses/summons/boreal_warrior.ron lines 4-17; assets/common/skillset/preset/rank5/.

## 2. Classes, races and factions

- Races (6 playable body species, common/src/comp/body/humanoid.rs line 136 onward): Danari, Dwarf, Elf, Human, Orc, Draugr. Role: body species. Signature mechanic: not read. Progression: none in the enum.
- Weapon skill groups (assets/common/skill_trees/skills_skill-groups_manifest.ron lines 3-8): General plus six weapon groups: Sword, Axe, Hammer, Bow, Staff, Sceptre. General holds Climb (cost, speed) and Swim (speed). Sword lists 26 skill entries in branch groups (heavy, agile, defensive names seen).
- Progression shape (assets/common/skill_trees/skill_prerequisites.ron lines 2 and 4): each node needs Any-of or All-of earlier nodes. A capstone needs one earlier node; a fork needs one of two.
- NPC professions (assets/common/professions.ron): Banker, Cook, Lumberjack, Miner, Fisher, Hunter, Hunter2. These are NPC economy roles, not player classes.
- Factions: the alignment field is seen as Enemy in entity files; the full faction list was not read.

## 3. Weapons

Families (43 item files in assets/common/items/weapons): axe, bow, dagger, hammer, sceptre, shield, staff, sword, sword_1h, tool, plus an empty folder. Each item file has a kind (tool with weapon kind and hand count, one or two), a stats block (equip time, power, effect power, speed, range, energy efficiency, buff strength), a quality rung, and an optional ability_spec.

Tiers: six ingots (bronze, iron, steel, cobalt, bloodsteel, orichalcum; assets/common/material_stats_manifest.ron line 5 onward) and six woods (wood, bamboo, hardwood, ironwood, frostwood, eldwood). Material stats multiply the form stats (comment line 1 of the same file).

Visual tiers: quality rung and name. Legendary items use the gold slot in the loot screen (voxygen/src/hud/loot_scroller.rs line 340).

Top 5 striking:
1. Caladbolg (Legendary two-handed sword, assets/common/items/weapons/sword/caladbolg.ron line 17): very quick equip, slower swing, higher power and buff strength. One signature: a trade of speed for power. Keep the trade; change the name and look.
2. Frost Cleaver (High two-handed sword, assets/common/items/weapons/sword/frost-0.ron line 2): its description says it radiates a freezing aura; no ability set. One signature: a rime aura on the weapon. Keep the aura idea; change the element.
3. Golf Club (assets/common/items/weapons/tool/golf_club.ron line 19): the only weapon file with a custom ability_spec. Keep the idea that a joke weapon can carry its own ability; change it entirely.
4. Shield family (assets/common/items/weapons/shield): a defensive item class in the same list. Not read in detail.
5. Staff and sceptre families (assets/common/items/weapons/staff, sceptre): magic kinds in the same list. Not read in detail.

## 4. Armour and gear

Sets and tiers: 447 armour item files in 32 set folders (for example adventurer, ashen, boreal, golemite, velorite_mage, witch, tarasque, cardinal, twigs-leaves, twigs-flowers). Quality counts over the 447 files (grep): Low 53, Common 79, Moderate 81, High 80, Epic 82, Legendary 70, Debug 2. Eight quality rungs (common/src/comp/inventory/item/mod.rs lines 74-83): Low, Common, Moderate, High, Epic, Legendary (gold, line 80), Artifact, Debug.

Set stats are split across slots (common/src/comp/inventory/item/armor.rs lines 247-268). A piece with FromSet takes the set's total, times a slot weight over the sum of weights: shoulder 2.0 (line 252), chest 3.0 (line 253), belt 0.5, hand 1.0, pants 2.0, foot 1.0, back 0.5; head 0.0 (line 262). Head pieces therefore carry Direct stats (ashen/head.ron line 6). The durability multiplier is then applied. Mechanic to keep: one set total split by slot weights, with a per-slot exception.

How tiers look: the quality colour on the slot and the name (gold at Legendary), plus per-set model variants (voxygen/voxel; folder names only).

Top 5 striking:
1. Golemite set (Legendary; assets/common/items/armor/golemite/chest.ron line 8, FromSet "Golemite"): toughness set. Keep: a set as one stat total split by slot. Change: material and look.
2. Ashen set (assets/common/items/armor/ashen/head.ron line 6): the head is the exception to the set rule, with direct stats. Keep the head exception; change our head rule.
3. Velorite battle-mage set (FromSet "Velorite Battlemage"): a caster set. Not read in detail.
4. Boreal set (drop from the gigas frost lottery, boss.ron line 3): an armour set as a boss reward. Keep: boss drop is armour; change the set.
5. Cultist and tarasque sets (FromSet "Cultist", "Tarasque"): sets tied to a dungeon family and a beast family. Not read in detail.

## 5. Zones and dungeons

Biomes (12, common/src/terrain/biome.rs lines 7-21): Void, Lake, Grassland, Ocean, Mountain, Snowland, Desert, Swamp, Jungle, Forest, Savannah, Taiga.

Site kinds (24, world/src/site/mod.rs line 107 onward): among them town types (cliff, savannah, desert, coastal), a chapel, a dwarven mine, a citadel, a terracotta site, a giant tree, a gnarling site, bridges, adlet, haniwa, a pirate hideout, a jungle ruin, a rock circle, a troll cave, a camp, a cultist site, a sahagin site, a vampire castle.

Dungeon archetypes: 11 entity folders, 85 files (adlet, cultist, dwarven_quarry, fallback, gnarling, haniwa, myrmidon, sahagin, sea_chapel, terracotta, vampire). Each has its own elites and enemies (assets/common/entity/dungeon/<name>/).

Wildlife spawn rules (assets/world/wildlife/spawn, 50 files in 8 climate folders: arctic, calendar, desert, jungle, taiga, temperate, tropical, tundra). Each file holds Pack rules: groups of (weight, min count, max count, entity), a spawn_mode (Land, Water or Ice), and a day_period list (most lists are all four periods; 10 are Night only). Example: arctic/ocean.ron puts one aggressive pack in water (line 9) and a peaceful pack plus one tursus on ice (line 18), with day periods at lines 10 and 19.

Hazards: not read (only the names of hazard-related types seen in common/src/comp/projectile.rs and world/src/site/tile.rs).

Top 5 striking zones:
1. Arctic ocean (assets/world/wildlife/spawn/arctic/ocean.ron): water packs and ice packs as separate rules. Keep: one pack per surface type. Change: zone names.
2. Cultist dungeon (assets/common/entity/dungeon/cultist/): one elite with a random weapon and a large loot table. Keep: one elite per dungeon.
3. Gigas frost zone (assets/common/entity/world/world_bosses/gigas_frost.ron): a boss that calls escorts. Keep: boss with escorts.
4. Sea chapel dungeon (assets/common/entity/dungeon/sea_chapel/): a water-side archetype (folder only; not read).
5. Desert city site (SiteKind DesertCity, world/src/site/mod.rs): a town type; named only.

## 6. Item and effect looks worth recreating

- Emissive baked glow on figures (assets/voxygen/shaders/figure-frag.glsl lines 188-193): a per-model glow value, raised to the third power and scaled, lit by a glow term and by how much the surface faces the glow direction. Idea: a creature's own emitters glow at night without a sprite. Keep the emission-as-data idea.
- Glow flag on LOD objects (assets/voxygen/shaders/lod-object-frag.glsl lines 98-100): a warm tint is added when the flag is set. Idea: distant lit objects get a flag-based glow in the far shader.
- Quality ladder on inventory and loot slots (voxygen/src/hud/loot_scroller.rs lines 336-342; common/src/comp/inventory/item/mod.rs lines 74-83): eight rungs, gold at Legendary, purple at Epic. Keep: rung order and gold at the top. Change: our palette and rung names.
- Particle glow at night: a comment at assets/voxygen/shaders/particle-frag.glsl line 111 (comment seen, code not read).
- Sparks flicker in a fixed rhythm: a comment at assets/voxygen/shaders/particle-vert.glsl line 871 (comment seen, code not read).
- Stepped head glance (bird idle): target changes on a floored clock with pseudo-random offsets (voxygen/anim/src/bird_large/idle.rs lines 26-34). Idea: watchful idle without per-frame noise.
- Wyvern chest pitch: a fixed forward rotation in the wyvern branch (idle.rs line 69).

## 7. Inspiration for Frankendom

1. Name: Wyrm family template. Idea: one ability-set template per family (bomb primary, three-hit combo, shockwave, spray) with element swaps. Keep: the set shape and the element swap. Change: our names, effects, elements, and per-family spawn weight in zone data.
2. Name: Frost colossus with escorts. Idea: a world boss that calls two escorts at 5 to 10 units with a random weapon, capped at MAX_ATTACKERS (3). Keep: escort summon and the distance band. Change: escort count, boss shape, names.
3. Name: Glacier tithe drop. Idea: a boss drop that is a lottery of an armour set or a crafting material, drawn with a count range. Keep: lottery drop and count range. Change: the item pool and the rarity roll.
4. Name: Night-only water pack. Idea: spawn rules as data: group weight, count range, entity, surface type (land, water, ice) and day periods. Keep: the rule shape. Change: zone names and numbers; spawn caps belong to row 23 zone data.
5. Name: Gold rung relic. Idea: eight quality rungs, gold at the top, shown the same way on loot and inventory slots. Keep: rung order and gold top. Change: palette and our quality names.
6. Name: Crowd-weighted combat bed. Idea: combat music from a sum over enemies inside a radius, each adding ceil(max HP / factor), with a dead player forcing explore music (voxygen/src/audio/music.rs lines 259-285). Keep: weighted sum and death override. Change: weight from our hate list and MAX_ATTACKERS; a boss stinger on top.
7. Name: Set-split armour. Idea: one stat total per armour set, split by slot weights, with the head as its own exception. Keep: weighted split. Change: our weights and head rule.
8. Name: Blade talent line. Idea: talent prerequisites as Any-of or All-of rows in one data file (skill_prerequisites.ron lines 2 and 4). Keep: data-only graph. Change: node names, depth, fork placement.

## Licence and cross-links
Code GPL-3.0: shape only. Music CC-BY-NC-SA with a no-other-games note: no audio reuse. CC BY 4.0 items need attribution if used at all. Cross-links: sound-music (music.rs; music_transition_manifest.ron lines 2-16, with the (Combat, Exploration) fade pair at line 13), spawns and encounters (wildlife spawn packs, row 23), progression (skill_prerequisites.ron), loot (gigas frost boss.ron), hud-ui (loot_scroller.rs quality slots).

## Not read
- Server half: server/, server-cli/, rtsim/ (spawn and AI consumers).
- All .vox models (about 4,752) and PNG images; world .bin maps; assets/world beyond the spawn files and folder listing.
- Shaders beyond the figure, lod-object and particle glow lines.
- Most common/entity and common/items files (samples only); skill trees beyond the group manifest and prerequisites.
- Death and respawn presentation; creature escalation numbers; per-body stat tables; hazards; factions; ambient animation beyond the bird idle.
- Other i18n languages (English buff file only). Fonts (binary).
