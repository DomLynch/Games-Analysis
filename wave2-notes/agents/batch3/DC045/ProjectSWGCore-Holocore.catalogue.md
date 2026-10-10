# ProjectSWGCore-Holocore (design catalogue, DC045)

Donor/Licence: Holocore, a Star Wars Galaxies server emulator (Java and Kotlin). Code: GNU AGPL v3 per LICENSE.txt and the Kotlin headers; README.md line 3 badge says GPLv3 and the files conflict. Read as AGPL-3.0-or-later. Shape only for Frankendom. Data (serverdata/, about 5,592 files): no licence file, no CREDITS or NOTICE at the top level; rights status unknown. Class C: category-level inspiration only. Recreate as clearly distinct originals, never copies. Not legal advice.

Halves: server code (src/main/java: spawn and loot services, the mission terminal reference) and the data pack (serverdata/: NPC, item, loot, spawn, combat and creation tables). The client is not in this donor (top-level listing shows server folders only). The pswgcommon submodule is an empty folder. No paired client was confirmed in the box; SWG client donors exist (brendenbowers-SWGEmuClient, maddogg221-SWGVulkanClient, t-harper-swg-client-ts) but were not opened and are not confirmed as the matching half.

Counts (rows, not unique creatures): creatures 1,279 (creature niche; humanoid 2,811 and droid 242 excluded). Classes 7 profession rows. Weapons 302 rows. Gear 1,135 armour rows. Zones 190 spawn-set files.

Receipts: 68 checked (shared file DC045/receipts.tsv), 0 failed.

## 1. Creatures and beasts

- NPC rows in serverdata/npc/npc_1.sdb to npc_5.sdb: 4,332 in total. Niche: humanoid 2,811, creature 1,279, droid 242. Creature rows use 309 social-group labels.
- Largest creature groups: a 26-row menagerie group, decay mites 21, lava beetles 20, bark mites 19, lava fleas 11.
- Size and colour come from each row: scale range (0.1 to 6.0 minimum; 0.1 to 6.4 maximum) and hue (15 values). Attack speed is 2.0 on every row, so there is no per-creature attack-speed variety in the data.
- Aggression radius runs 6 to 64. 447 rows set a death-blow flag.
- Three loot slots per row, each with a chance. Zero or less removes the table (LootGenerationService.kt line 125).
- Tier columns: serverdata/npc/npc_stats.sdb has 100 level rows, each with normal, elite and boss columns. Elite HP is about 1.5x normal at every level read (1, 10, 25, 50, 75, 100). Boss HP is about 2.1x to 2.5x normal. Boss damage at level 100 equals elite damage and sits below its own level-75 value (defect 3 below).
- Combat profiles: serverdata/npc/combat_profiles.sdb, 62 rows: creature 38, humanoid 15, droid 7, mine 1, thrown 1. Creature profiles name one attack each; humanoid profiles list long semicolon-separated ability sets.
- Dynamic encounters: serverdata/spawn/dynamic/dynamic_spawns.sdb, 960 rows. Group size L 546, M 362, S 34, XS 10, XL 8. Every row has an elite slot, 950 have a boss slot, and normal slots 1 to 9 are filled on every row.

Top 8 striking (criteria: readable at 375 wide, one signature behaviour, one signature effect; silhouette and sound were NOT read because the donor has no art or audio):

1. **Pack-hunter beast** (creature niche, wide scale range and long pull radius). Keep: scale band from one body; separated aggressive and assist radii. Change: limbs, head, palette, seams, pull distances. Ref: serverdata/npc/npc_1.sdb line 1 (scale_min, scale_max, aggressive_radius, assist_radius).
2. **Mite swarm** (decay mite 21 rows, bark mite 19 rows). Keep: many small bodies per encounter, one family per group. Change: swarm art, sound, per-zone cap. Ref: serverdata/npc/npc_1.sdb to npc_5.sdb, social_group column.
3. **Great dragon, base and ancient**. Keep: a two-variant family, the ancient one as the late tier. Change: name, element, silhouette, the variant gap. Ref: serverdata/npc/combat_profiles.sdb line 16 (creature_krayt_dragon) and line 17 (creature_krayt_dragon_ancient).
4. **Colour-coded elemental beast** (seven profile variants of one family: beam, flame, green, lightning, red, toxic green, yellow). Keep: colour as the element cue. Change: our palette and element set. Ref: serverdata/npc/combat_profiles.sdb line 31 (creature_toxicgreen) and the other colour rows.
5. **Commander droid with guard escort** (battlefield droid profiles). Keep: a commander and an elite guard in one profile family. Change: robot silhouette, weapons, guard rule. Ref: serverdata/npc/combat_profiles.sdb line 43 (droid_som_battlefield_commander); guard and numbered units are other rows in the same file.
6. **Lair escort** (dynamic encounter). Keep: an elite and a normal pack spawned together, a boss slot in lair data. Change: fixed arena with a wave timer; round spawn area instead of square. Ref: serverdata/spawn/dynamic/dynamic_spawns.sdb line 1 (npc_boss, npc_elite, npc_normal_9); DynamicSpawnService.kt lines 166 to 170.
7. **Demolition ladder** (six charge tiers). Keep: detonate range below blast radius (1 under 8 to 18); a tier ladder of one object; damage rising from about 1,400 to 5,000. Change: sigils or runes instead of explosives; our effect files. Ref: serverdata/combat/mine_types.sdb line 15 (demolitionCharge_5) and line 4 (ApMine, detonate 3 under blast 25).
8. **Lava beetle swarm** (lava beetle 20 rows, lava flea 11 rows). Keep: many rows per group as a walk-density filler candidate. Change: forms, sounds, idle moves. Behaviour not read. Ref: serverdata/npc/npc_1.sdb to npc_5.sdb, social_group column.

## 2. Classes, races, factions

- **Professions**: 7 rows in serverdata/creation/profession_mods.sdb (line 6 is the marksman row): brawler, marksman, artisan, entertainer, medic, scout, jedi. Roles are our reading of the names; the file does not state roles.
- **Skill graph**: serverdata/skill/skills.sdb, 1,073 skill rows; 56 flagged as profession nodes; 124 god-only. Graph types 4 (1,040 rows), 5 (26), 1 (7). Points required take 10 distinct values. Progression is a tree of nodes with prerequisite counts.
- **Species**: 10 rows in serverdata/creation/racial_mods.sdb, each a set of attribute modifiers for a male and a female template. Looks in serverdata/appearance/appearance_table.sdb (1,075 rows).
- **Jedi line**: a humanoid_jedi profile in serverdata/npc/combat_profiles.sdb. Force and saber ability sets are long lists in the humanoid profiles; which profile holds which list was not checked.
- **Factions**: serverdata/faction/faction_datatable.sdb, 85 rows: 81 aggressive, 4 not aggressive, 3 PvP-flagged. Enemies and allies listed per faction.
- **Rank ladder**: serverdata/faction/rank.sdb, 22 rows from entry rank to top rank (line 24 is the top), each with a cost and a delegate ratio range.

## 3. Weapons

- **Families** (302 rows in serverdata/items/items_weapon.sdb): ranged 189, melee 113. Types: pistol 63, rifle 48, carbine 41, one-hand melee 34, two-hand melee 31, heavy 26, polearm 26, unarmed 23, thrown 10.
- **Damage types**: energy 152, kinetic 150. Elemental type on 50 rows (heat 18, electricity 17, cold 8, acid 7).
- **Procs and sockets**: proc effect on 10 rows (six share one name). Splash damage set on one row. Sockets and isUnique are 0 on every row (possibly unused fields).
- **Tiers by required level**: most rows at 65 (62), 70 (40), 54 (35). Name families: 209 prefixes; largest a 22-row sword family and an 11-row pistol family.
- **Charges and mines**: serverdata/combat/mine_types.sdb, 13 rows: 7 mine types and a six-tier charge ladder.

Top 5 striking:
1. **Demolition ladder** (section 1, item 7). Keep: detonate under blast; tier ladder. Change: visuals.
2. **Heavy class** (26 heavy rows; the last implant row in cybernetics.sdb has a comment saying it lets the wearer fire heavy weapons from standing). Keep: heavy weapons as their own class with a stance bonus. Change: our heavy silhouette and stance rule.
3. **Thrown family** (10 thrown rows). Keep: a thrown family as a short-range option. Change: our projectile and arc.
4. **Elemental weapon family** (50 elemental rows: heat, electricity, cold, acid). Keep: element as a damage type with a clear colour cue. Change: our element set and cue.
5. **Proc-tagged family** (six rows share one proc name, proc_tow_proc_coyn in items_weapon.sdb; weapon type not read). Keep: a proc on a named family. Change: our proc name and effect file.

## 4. Armour and gear

- **Kits**: 1,135 armour rows in serverdata/items/items_armor.sdb in three kits: battle 387, assault 378, recon 370.
- **Armour levels**: basic 479, standard 294, advanced 362.
- **Stat-level bands in names**: lvl20 (189 rows), then lvl30 to lvl80 (135 rows each). Each kit has about nine pieces: helmet, chest, gloves, leggings, boots, bracers left and right, biceps left and right.
- **Quality multipliers**: 1.00 (309 rows), 0.89 (285), 0.88 (186), 0.73 (135), 0.67 (135), 0.65 (54).
- **Dye**: index_color_0 is -1 (no dye) on 1,029 of 1,135 rows; 95 distinct dye pairs on the rest.
- **Crystal ladder**: serverdata/items/items_crystal.sdb, 72 rows, quality 0 to 6. Counts per quality: 36, 5, 5, 6, 7, 7, 6. Damage band rises from 0 to 5 at quality 0 to 18 to 23 at quality 6. Quality 0 carries the elemental variants (heat, acid).
- **Cybernetic implants**: 12 rows in serverdata/cybernetics/cybernetics.sdb. Three carry a death-penalty trade-off (rows 3 to 5); the rest trade one stat for another (melee defence, range, accuracy, healing).
- **Wearables**: 1,162 rows in serverdata/items/items_wearable.sdb; three client-effect references and two animations; no worn buffs set. Mostly cosmetic in the data.

Top 5 striking:
1. **Shard ladder** (crystal quality 0 to 6). Keep: seven quality tiers, damage band per tier, elemental variant on the lowest tier. Change: our names, colours, elements.
2. **Death-price implant** (three implants with a death penalty). Keep: strong bonus with a death cost, visible on the item. Change: our penalty and bonus numbers and art.
3. **Battle, assault and recon kits** (1,135 rows, three kits by level). Keep: three kits with basic, standard and advanced levels. Change: our kit names, look and stat rules.
4. **Stat-level armour line** (lvl20 to lvl80 in ten-level steps). Keep: a stat-level band per piece. Change: our bands and piece set.
5. **Dye pairs on armour** (95 pairs). Keep: palette index per piece. Change: our palette.

## 5. Zones and dungeons

- **Planet level bands** (serverdata/spawn/dynamic/terrain_levels.sdb, 10 rows): Tatooine 3-10, Corellia 11-20, Naboo 21-30, Lok 31-40, Rori 36-45, Talus 41-50, Dantooine 51-60, Yavin 4 56-65, Endor 61-70, Dathomir 71-80. Some bands overlap.
- **Spawn-set files** (190): city 37, dungeon 25, poi 88, instance 16, outback 13, gcw 9, invasion 2, under serverdata/spawn/. One more event file (event_emperors_day.sdb).
- **Instance trios**: Kashyyyk avatar and Mustafar jedi each have easy, medium and hard files (serverdata/spawn/instance/).
- **Dynamic lairs and scenes**: 590 lair rows and 5,700 scene rows (serverdata/spawn/dynamic/dynamic_lairs.sdb, dynamic_scenes.sdb), each with an npc_spawn_radius.
- **No-spawn zones**: 217 data rows in serverdata/spawn/zones_nobuild_nospawn.sdb, a centre and a radius per entry (the first city row, line 3, has radius 700).
- **Hazards**: 13 trap and charge types in serverdata/combat/mine_types.sdb. Where each trap is placed was not read.

Top 5 striking:
1. **Trial trio** (instance easy, medium, hard files). Keep: one map at three difficulties. Change: our bosses and mechanics.
2. **Planet danger ramp** (ten-level bands per planet). Keep: a band per zone as data. Change: remove the overlaps by design.
3. **Lair scenes** (5,700 scene rows with a spawn radius). Keep: a radius per scene. Change: our scene set.
4. **Safe ring** (217 no-spawn circles). Keep: a radius-based quiet zone around towns. Change: round edges by design.
5. **Invasion** (invasion_droid_army.sdb, invasion_gcw_bestine.sdb). Keep: a scheduled invasion of a town. Change: our waves. Contents not read.

## 6. Item and effect looks worth recreating

| Label | Technique | Ref |
|---|---|---|
| Crystal shader flag and colour slots | Per-item shader flag (set on 1 of 72 crystal rows) plus four index colour slots. | serverdata/items/items_crystal.sdb line 1 (crystal_shader, index_color headers) |
| Worn particle on heal and resist | Wearables reference particle files for heal and heal-resist states. A glow tied to a state, not a constant aura. | serverdata/items/items_wearable.sdb line 827 (appearance/pt_heal.prt) and line 844 |
| Per-charge explosion effect | Each mine and charge row names its own client effect file. | serverdata/combat/mine_types.sdb line 4 (clienteffect/exp_sonic_landmine.cef) and line 15 |
| Creature hue and scale band | Hue (15 values) and scale range per NPC row: many looks from one body. | serverdata/npc/npc_1.sdb line 1 (hue, scale headers) |
| Dye slots on armour | Four index colour slots per row, 95 pairs in use. Palette index, not texture. | serverdata/items/items_armor.sdb line 663; line 1 (index_color headers) |
| Species looks | Male and female template variants for 10 species. | serverdata/appearance/appearance_table.sdb line 1 |

Shader, hue and particle files are referenced here; the client that draws them is not in the donor, so none were seen.

## 7. Inspiration for Frankendom (originals; keep and change named)

1. **Brood Cluster**: a swarm family that spawns as a cluster, with a cap per zone and a rising signal before it appears. Keep: many small bodies; a cap; a per-step roll for density. Change: round spawn area; zone cap; our forms; a rising signal instead of a silent pop. Maps to row 23 (spawn caps and despawn).
2. **Lair Warband**: an elite and a normal pack from one lair line, with a boss slot held for the end. Keep: elite plus pack from one row; boss slot in lair data. Change: fixed arena with a wave timer; our silhouettes; pack size per zone.
3. **Proximity Sigil Ladder**: a six-tier proximity charge; detonate range always below blast radius; damage rising by tier. Keep: detonate under blast; tier ladder. Change: runes or sigils instead of explosives; our effect files. No parity row fits exactly; it would be a zone hazard, not an engine rule.
4. **Shard Ladder**: seven quality tiers; each raises the damage band; quality 0 carries an elemental variant. Keep: seven tiers; damage band per tier; elemental on the lowest tier. Change: our tier names, colours, elements. Maps to row 18 (loot roll) and row 15 (gear dressing).
5. **Commander Escort**: a commander unit that brings its own elite guard in one profile family. Keep: commander and guard in one family; ranged and melee guard roles. Change: our robot silhouette; the guard follows by our own rule. Maps to row 2 (AI brain).
6. **Trial Trio**: one encounter in three difficulty files on the same map. Keep: three files, one map, different counts. Change: our boss and mechanic per difficulty.
7. **Planet Danger Ramp**: each zone has a level band from data; the band sets spawn and loot levels. Keep: band per zone as data; spawn and loot read one band. Change: no overlapping bands by design; our zone names. Maps to row 23 (zone data) and row 18.
8. **Safe Ring**: a round no-spawn zone around each town, set by a radius in data. Keep: radius-based quiet zone. Change: round edges by design (the check must be round, not square); our radius values.
9. **Death-Price Implant**: an implant that gives a strong bonus and a death penalty. Keep: bonus paired with a death cost, visible on the item. Change: our penalty, bonus and a visual that shows the cost. Maps to row 17 (death and respawn).

## Defects to fix (keep the idea, fix the defect)

1. **Spawn chance off by one** (DynamicSpawnService.kt line 98 and line 100). The roll is random.nextInt(0, 100), which gives 0 to 99, and the gate is `randomChance > npcSpawnChance` with a default of 5. Values 0 to 5 pass, so 6 of 100 rolls spawn, not the 5% the config names. Fix: use `>=` on the gate (or nextInt(1, 101)). Idea kept: a percent roll per movement step.
2. **Square spawn area** (DynamicSpawnService.kt lines 149 to 152). The X and Z offsets are each drawn from plus or minus 250, so the spawn area is a square. Fix: draw a radius and an angle if a round area is wanted; keep the square only if the design means it.
3. **Boss damage at level 100** (serverdata/npc/npc_stats.sdb, level 100 row; not receipted because the row is tab-separated). Boss minimum and maximum damage read 160 and 596, the same as the elite columns at level 100, and below the boss values at level 75 (312 and 820). This looks like a copied column. Fix: check the intended trend before shipping; do not assume either value. Idea kept: boss damage column per level.
4. **Unused columns**: the spawn service reads the elite slot and normal slots 1 to 4 (DynamicSpawnService.kt lines 166 to 170). A search for npcNormal, npcBoss and npcElite in the services folder found no read of normal slots 5 to 9 or of the boss slot (DestroyMissionTerminal.kt line 109 reads normal 1 to 4). This was checked only in services/. Fix: wire the extra slots or drop them from the data.
5. **Attack speed constant**: every creature row sets attack speed to 2.0 (serverdata/npc/npc_1.sdb). Fix: decide whether variety is wanted; if so, set per row.
6. **Unset fields**: sockets and isUnique are 0 on every weapon and armour row. Fix: confirm whether any code reads them before relying on them.
7. **Licence conflict**: README.md line 3 says GPLv3; LICENSE.txt is AGPL. Fix: take the text in LICENSE.txt as the licence; clean-room for Frankendom either way.

## Fold-ins (Strategy coverage)

- **Spawns and encounters (walk density)**: the spawn pulse rolls once per player movement (DynamicSpawnService.kt line 62 handler; roll at line 98). Alive cap per player near (12). Elite plus normal pack per pulse. The rest of walk density (chests, corpses, shrines, tracks) was not read.
- **Loot**: three tables per NPC with chances; credits and items switched separately (LootGenerationService.kt line 77). Rarity: serverdata/loot/rls_items.sdb (4 rows; rarity and static item columns; values not read). Drop ceremony, rarity colour and sound: not read.
- **Progression**: profession and skill graph (section 2); death-penalty implants (section 4). Talent-tree shape, achievements, titles and cosmetic collections: not read beyond the skill graph counts.
- **Zone population**: ten planets, bands per planet, no-spawn radius rings (section 5). Row 23 is served by the spawn cap and the no-spawn rings.
- **HUD, sound, accessibility, touch, minimap**: none in the donor (no client).
- **Idle animation, death presentation, boss intro, readability at 375 wide**: none read; no art or audio in the donor.

## Not read

See DC045/ProjectSWGCore-Holocore.catalogue.json, not_read. In short: the 189,081-line strings table (about 3,282 distinct first-column values counted, values not read), the 3,862 conversation JSON files, most of the spawn set files, the Java tree beyond the two services, the name grammar, the terrain binaries, the keystore and the banner.
