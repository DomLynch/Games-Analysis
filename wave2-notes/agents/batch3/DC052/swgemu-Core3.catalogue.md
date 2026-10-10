# swgemu-Core3 (design catalogue, cell DC052)

Donor: `/mnt/frankendom-donors/swgemu-Core3/` (VPS only, read-only).
Half read: **server data pack** (`MMOCoreORB/bin/scripts`: mobile, lair, spawn, object, managers, screenplays, licence files), plus three server C++ files for the lair despawn logic (`MMOCoreORB/src/server/zone/objects/tangible/`). The rest of `MMOCoreORB/src` was not read. The **client half** (`.tre` art, audio, models, client string tables) is not in the box. Paired donor in the box: `swgemu-engine3` (engine half, read in part; see its own catalogue).

Dom's rule for every item below: recreate as a clearly distinct original, never a copy. Each brief names the trait KEPT and the trait CHANGED. Labels are our own.

## Licence (as the files say, not a legal view)
- `README.md` and `COPYING`: GNU AGPL v3.
- Many Lua data files carry a GNU LGPL header. The audit (AU051) counted 18,274 of 30,521 `.lua` files in `bin/scripts` with "GNU Lesser" text and none with "GNU Affero". `managers/dna_manager.lua` (header lines 6 to 10) and `credits.lua` say LGPL. The two statements conflict; treat anything touched by it as shape only.
- No asset licence file. The origin of the game-data names and stats is not stated in the repo.
- Class: **C** for the data pack; **D** for art, audio and models (absent from the repo).

## Counts (grep counts on the VPS; not every file opened)
- Creature templates: **3,624** `Creature:new` definitions under `mobile/` (3,625 files contain the string; one is the schema file).
- Playable professions: **7** (`managers/player_creation_manager.lua` lines 12 to 20). Playable species keys: **10** (from `playerRaces` in the armour template, see section 4).
- Weapon `.lua` files under `object/weapon`: **457** (includes index files).
- Armour material families (folders under `object/tangible/wearables/armor`): **23**. Wearable `.lua` files: **909**.
- Planet region files: **10** planets, **2,309** region rows in total (`managers/planet/*_regions.lua`).
- Lair templates: **1,852** (`addLairTemplate` calls in `mobile/lair/creature_lair`).
- Screenplays: 4 dungeons, 38 caves, 56 POI, 36 city and outpost, 11 event, 1 battlefield.

## 1. Creatures and beasts

### Families and tiers (level ranges from the level lines read; template counts from socialGroup grep)
- **Dantooine pack and herd beasts** (folder `mobile/dantooine`, about 105 files; per-family counts not taken):
  - Pack beast ladder: graul 30, mauler 35, mangler 39, ancient 50, marauder 173. Marauder has HAM 120000 and scale 1.35 (R21 to R23).
  - Herd grazer: bol 29, pack runner 26, swift charging bol 34 (boss).
  - Quenker 23, ravager 38, relic reaper 45. Voritor 22 to 30. Huurton 2 (pup) to 84 (reaper). Thune 26 to 48 (herd leader), mammoth thune 129 (boss). Piket 30 to 37.
- **Dragons** (socialGroup `krayt`, **6** templates): juvenile canyon 122, canyon 275, giant canyon 300, adolescent 336, ancient 336, grand 336. Size varies by scale, not by stats (see top creature 1).
- **Rancor** (`rancor`, 14 templates): youth 45, rancor 50, gnarled 46, bull 65, enraged bull 89, mutant 75, monstrous brute 87, ancient bull 98.
- **Spider** (`spider`, 19): broodling 8, hunter 44, recluse 44, recluse queen 68, giant recluse 115.
- **Nightsister spider** (`spider_nightsister`, 18): broodling 8, cavern spider 27, hunter 46, queen 46, giant cavern recluse 116, kiin dray 126 (boss), spiderclan elder 277 (humanoid caster).
- **Mite nests** (`mite`, **49**): hatchling 2 to 9, worker 12 to 15, guard/soldier 13 to 24, queen 15 to 60 (talus queen 26, hatchling 7; endor burrower queen 60).
- **Kliknik** (`kliknik`, 18): swarming 10 up to dark queen 40 and shredder guardian 30.
- **Borgle** (14, 6 to 37), **torton** (13, 12 to 37), **squill** (11, 10 to 50), **rasp** (13, 4 to 40), **panther** (13, 10 to 56), **boar** (12, 10 to 50), **veermok** (11, 20 to 26), **endor marauder** (13, 22 to 56, excluding level-100 quest names), **aakuan** (12, 11 to 31), **drall** (12, 8 to 22).

### Escalation patterns (read from the level and HAM lines)
- Graul ladder: 30, 35, 39, 50, then a marauder at 173 with HAM 120000 (R21, R22). The jump is sharp.
- Nest ladder: hatchling 7 to queen 26 in talus (R19, R20). Queens are also the top of the mite nest.
- Spider ladder: broodling 8, to recluse 44, to giant recluse 115 (scale 1.75, R13), to kiin dray 126 (scale 4.0, R15).
- Dragon ladder: same level and HAM for the three top sizes, differing only in scale and loot amounts.

### Bosses and lair pattern
- Lairs are data: `mobiles` (weighted), `bossMobiles` (count), `spawnLimit`, and building sets for five difficulty bands (`lair.lua`, lines 1 to 16).
- Bol lair boss file: `spawnLimit = 15` (R31), boss `swift_charging_bol` (R32).
- Graul mauler lair: boss pair of graul manglers (R30).

### Signature abilities (one line each, from the primary attack lists)
- Graul: intimidation plus stun. Bol: knockdown plus intimidation. Quenker ravager: dizzy plus area poison.
- Krayt: area combo plus area knockdown; the two larger sizes add a +100 accuracy bonus (R11, R12).
- Giant recluse: area poison plus strong poison, as both primary and secondary lists (attack lines near 33 to 34; not receipted).
- Ancient bull rancor: area bleeding plus area combo.
- Spiderclan elder: attack list merged from five master trees (R17).

### Resist profiles (nine slots; slot order not read)
- Rancor family: three slots at 200 (R28). Mammoth thune: all slots 25 to 35 (R27). Graul: first slot 150, several slots at 20, the rest at -1 (R01).

### Pets
- Graul: taming chance 0.25 and a control device item (R65, R66). Bol: taming chance 0.

### Top 8 (own labels)
1. **Dune wyrm in three sizes.** Why: one stat block, and size alone reads as the tier at 375 wide. Keep: identical level 336, HAM 410000, damage and resists across adolescent, ancient and grand (R06, R09, R10, and the same resist line in each file). Change: scale ramp of our own (0.85, 2.05, 2.35 are the donor's numbers, not ours), a distinct roar per size, and the accuracy bonus moved to the top size only. Ref: `mobile/tatooine/krayt_dragon_adolescent.lua` lines 6, 11, 28, 54; `krayt_dragon_grand.lua` line 28.
2. **Venom brood matron.** Why: a 1.75 scale spider whose two attacks are area poison and strong poison. Keep: the paired area-plus-single poison set. Change: our own poison telegraph (a green pool that appears before the bite). Ref: `mobile/dathomir/giant_gaping_spider_recluse.lua` lines 11, 14, 31 (R13, R14).
3. **Brood tyrant.** Why: scale 4.0, HAM 41000, level 126, the largest creature in the spider family. Keep: a 4x silhouette jump for the boss step. Change: our own egg-sac look and an attack set that is not poison-only. Ref: `mobile/dathomir/kiin_dray.lua` lines 6, 11, 30 (R15, R16).
4. **Nest ladder (hatchling to queen).** Why: a named stage ladder that the player can read by size and name. Keep: hatchling 7 to queen 26 as separate templates. Change: the queen as a nest-clearing objective with egg-sac loot. Ref: `mobile/talus/giant_decay_mite_hatchling.lua` line 6; `mobile/talus/giant_decay_mite_queen.lua` line 6 (R19, R20).
5. **Pack beast with a late marauder tier.** Why: a pack beast whose top tier has HAM 120000 and scale 1.35. Keep: the pack-plus-killer flag and the HAM jump. Change: gate the tier by a zone difficulty band, not by a level number. Ref: `mobile/dantooine/graul_marauder.lua` lines 6, 11, 31 (R21 to R23).
6. **Armoured herd leader.** Why: a herd boss at level 129 with HAM 81000 and low resists (25 to 35), so it reads as a fight that is easy to hit. Keep: herd plus killer flags and the low resist profile. Change: a plated back and a crest look of our own. Ref: `mobile/dantooine/mammoth_thune.lua` lines 6, 11, 14 (R25 to R27).
7. **Resist-wall beast.** Why: three resist slots at 200 force a weapon swap. Keep: a nine-slot resist vector with a few near-immune slots. Change: our own damage type names, and the immunity shown as a sheen on the hide (no art read here). Ref: `mobile/dathomir/ancient_bull_rancor.lua` lines 6, 14 (R28, R29).
8. **Union-of-masters elite caster.** Why: a level 277 caster whose attacks are merged from five master trees, which reads as a skilled foe. Keep: merging several master ability lists into one elite. Change: our own ability set and a silhouette that reads at 375 wide. Ref: `mobile/dathomir/spiderclan_elder.lua` lines 8, 13, 48 (R17, R18).

## 2. Classes, races and factions
- **Professions (7)**, `managers/player_creation_manager.lua` lines 12 to 20 (R44): combat brawler (melee), combat marksman (ranged), crafting artisan (tools), jedi (force), outdoors scout (tracking tool), science medic (medical), social entertainer (instrument).
- **Starting kit by profession** (lines 50 to 57): brawler gets three melee choices, marksman three ranged, artisan three tools, scout one tool, medic one food tool, entertainer one instrument, jedi none.
- **Start and progression**: 250 skill points at creation (R45). Ability tiers are novice, mid and master per branch (R49, R50 in `mobile/creatureskills.lua`; novice 3 to 4 entries, mid 10 to 12, master 15 to 20 for brawler and marksman). These lists are the NPC attack lists, grouped by the same tier names.
- **Jedi** (R46, R47): unlocked after mastering **6** holo-grind professions (`managers/jedi/hologrind_jedi_manager.lua`). The default progression is village type (R48). A custom type is also listed (`jedi_manager.lua` lines 4 to 7). Mechanic: a count-of-masteries gate.
- **Playable species (10)**: from the `playerRaces` list (R63): bothan, human, ithorian, moncal, rodian, sullustan, trandoshan, twilek, wookiee, zabrak.
- **Factions**: imperial (371 socialGroup lines), rebel (291), neutral and tribal groups. `managers/faction_manager.lua` (82 lines) not read.
- **Tribal clans** (dantooine, from file names): one clan carries about 12 role archetypes, for example leader, harvester, herbalist, hunter, loreweaver, primalist, rockshaper, scout, shaman, soothsayer, tribesman and warrior.

## 3. Weapons
- **Families (file counts under `object/weapon`)**: sword 121, two-handed sword 91, polearm 44, creature weapons 20, carbine 18, pistol 29, rifle 25, grenade 15, heavy 10, knife 13, baton 9, turret 9, axe 7, droid 5, unarmed 4, special 4, vehicle 3. Total 457.
- **Damage types across weapon templates**: lightsaber 195, kinetic 55, energy 47, blast 14, acid 11, heat 8, electricity 6, stun 5, cold 2.
- **Attack types**: melee 227, ranged 80, force 21, grenade 8.
- **Tier gate**: a certificate per weapon family and level, for example `cert_onehandlightsaber_gen1` (R56). One weapon is gated by a skill name, not a certificate (R60).
- **Crafted blade ladder (gen1 to gen5, 88 files)**: min to max damage 70 to 160 (gen1, R51), 80 to 170 (gen2, R53), 130 to 220 (gen3, R54). Wounds ratio 15, 19, 25, 37, 45 across gen1 to gen5 (R52, R55, R57). Gen4 and gen5 share the gen4 certificate; gen4 min and max damage are not in its own file (not read in the shared base).
- **Rifles**: E11 60 to 120, wounds 10 (R61). Bowcaster 110 to 180, wounds 13 (R62). T21 135 to 400, speed 7, wounds 28 (R58, R59). Berserker HEAT 160 to 452, speed 8, gated by skill `flurryshot2` (R60).
- **Top 5 striking** (no art in donor, so silhouette and sound are ideas only):
  1. Crafted blade ladder: five tiers with one visible step per tier and the wounds ratio as the hidden power step.
  2. T21: a wide damage roll among the rifles read (135 to 400), so one hit can be a visible event.
  3. Berserker heat rifle: a heat damage type on a rifle, gated by a skill, so the weapon unlocks as a reward.
  4. Bowcaster: a lower-damage energy weapon with a slower attack speed (6.3), which reads as a different rhythm.
  5. Lightsaber family with a certificate-gated two-handed branch (cert_twohandlightsaber_gen1 to gen4): 195 templates share one damage type, so the family is large and uniform.

## 4. Armour and gear
- **Material families (23 folders)**: bone, bounty hunter, chitin, composite, ithorian defender, guardian and sentinel, kashyyykian black mountain, ceremonial and hunting, mandalorian, marauder (27 files), marine, nightsister, padded, ris, singing mountain clan, stormtrooper (13), tantel (6), ubese (12), zam.
- **Set pattern**: a piece per slot, for example helmet, chest plate, bicep left and right, bracer left and right, gloves, leggings, boots, plus belt, bandolier, jacket, pants or shirt in some sets. Some sets add `_quest` variants (ubese, stormtrooper, tantel). Template example: `armor_ubese_bandolier.lua` line 44 (R64).
- **Species**: each piece lists the ten playable species (R63).
- **Robes**: light and dark Jedi robes in five steps (`robe_jedi_light_s01` to `s05`, `robe_jedi_dark_s01` to `s05`), plus a padawan robe and a test robe.
- **Set bonuses**: none found. I searched `object/` and the scripts for set-bonus and armour-set terms; the only hit in C++ was an unrelated mission field.
- **Material tiers**: the armour files name materials but carry no rating numbers in this data. Tiers are by family name only.
- **DNA sample quality (gear-like)**: seven quality bands, very high (1) to very low (7) (R40, R41), each mapped to a sample item. Beside them sits a level-indexed stat table of 200 rows (R36 to R39). How the two connect was not traced.
- **Top 5 striking** (idea only, no art):
  1. Bone set (name only in this data): a trophy-armour idea.
  2. Chitin set: insect-shell look, a natural fit for the spider and mite families.
  3. Singing-mountain clan set: clan-marked armour, a tribe-identity look.
  4. Gold-trimmed dressed NPC variants (section 6): a finish that reads as premium at distance.
  5. Light and dark robe pair in five steps: a clear two-axis tier (light, dark) with a step ladder.

## 5. Zones and dungeons
- **Planets (region rows)**: naboo 495, talus 372, tatooine 292, dantooine 276, lok 180, rori 167, corellia 151, yavin4 123, dathomir 141, endor 112. Plus tutorial, creature test and dungeon-one regions (4 rows each).
- **Region data**: each row has a name, x and y, a shape (circle, rectangle or ring), flags, spawn groups and a max spawn count (R69). Shape keywords across the planet files: circle 1,972 occurrences, rectangle 395, ring 36 (grep count, not all read).
- **Flags (bit values)**: spawn area, no-spawn area, world spawn, no world spawn, no-build, camping, city, nav, named region, locked, no-combat, no-duel, PVP, overt, rebel, imperial, no-pet (`managers/planet/regions.lua`, R71). No-build edges are also no-spawn (R70).
- **Dungeon archetypes (4 folders)**: corellian corvette (10 files), death-watch bunker (5), geonosian bio lab (4), warren (3).
- **Caves (38)**, **POI (56)**, **outposts and cities (36)**.
- **Hazards**: poison gas cloud object (`object/tangible/dungeon/poison_gas_cloud.lua`), mines in the death-watch bunker (`death_watch_overlord_mines`), and walker and droid guards in the warren.
- **Warren rules**: all rooms locked at start (R43). Named NPCs (kitchen officer, doctor, cell guard) respawn 1800 s after a kill (R42; the same timer on line 136 for the officer).
- **Top 5 striking**:
  1. Warren: locked rooms, guard and boss respawn on a timer. Readable as a progression dungeon.
  2. Nest caves (dathomir spider-clan cave, talus giant decay mite cave): the nest ladder in a cave.
  3. Corvette hulk: 10 screenplay files, a ship-as-dungeon.
  4. Bio lab: four screenplay files and a geonosian-style lab setting.
  5. No-build edges with named landmarks as no-spawn rows (R70): quiet ground around a landmark.

## 6. Item and effect looks worth recreating (names only; the visual is in `.iff` files that are absent)
- **Hue-index skins**: four blocks of eight indices (0 to 7, 8 to 15, 16 to 23, 24 to 31) feed colour variants of one model. Refs: `mobile/dantooine/graul.lua` line 30 (R03), `mobile/dantooine/bol.lua` line 30 (R05). Technique: one model, an index list, a palette ramp of our own.
- **Scale tiers**: the most common scales in the data are 1.05 (150 lines), 1.1 (112), 1.15 (102), 1.2 (80) and 1.25 (72). Dragon sizes run from 0.85 to 2.35 (R07, R08). Technique: scale multiplier per variant, same stat block.
- **Glowing swarm**: `object/static/particle/pt_flocking_glowzees.lua` line 44 (R67). An ambient flock with a glow. Technique: a particle emitter by name.
- **Glowing light and volcano glow**: `object/static/particle/pt_frn_all_glowing_light_s3.lua` and `particle_volcano_glow_1.lua` (names only).
- **Gold-trim NPC variants**: `object/mobile/dressed_death_watch_gold.lua` line 44 (R68). About 24 template files have "gold" in the name. Technique: an outfit variant with a gold finish.
- **Poison gas cloud**: `object/tangible/dungeon/poison_gas_cloud.lua` (hazard, name only).

## 7. Inspiration for Frankendom (originals, mood only at 20 to 30 percent; never a copy)
1. **Scale-tier wyrm** (from the dragon ladder). Keep: one stat block across sizes, size as the tier signal. Change: our own scales, a distinct roar per size, the accuracy bonus only on the top size.
2. **Brood matron with a poison pool** (from the giant recluse). Keep: a paired area and single poison attack set, and a 1.75 scale step. Change: a visible pool telegraph and our own damage type.
3. **Nest ladder with a queen objective** (from the mite family). Keep: named stages from hatchling to queen. Change: the queen is a clear-the-nest objective with egg-sac loot.
4. **Herd leader with a pack-link** (from bol, thune and mammoth thune). Keep: PACK and HERD flags, so a herd member pulls its neighbours in. Change: a plated look and our own call.
5. **Nine-slot resist vector** (from the rancor family). Keep: several near-immune slots that force a weapon swap. Change: our damage names, shown as a sheen on the hide.
6. **Elite built from masters** (from the spiderclan elder). Keep: one elite built by merging several master ability lists. Change: our ability set and silhouette.
7. **Forged blade ladder with certificates** (from the crafted blade gen1 to gen5). Keep: five tiers, a certificate gate, and the wounds ratio as the hidden power step. Change: our own element and a visible glow per tier.
8. **Mastery-count unlock** (from the Jedi gate, six professions). Keep: a count-of-masteries gate for a class. Change: our own tracks (for example, six of twelve stances).
9. **Level-banded stat table with a quality band** (from the DNA sample table, levels 1 to 200 with banded steps). Keep: one table, banded increments, a quality band that scales it. Change: our own numbers and a comment that matches the table.
10. **Empty-zone despawn with a grace timer** (see section 8). Keep: despawn after a grace period with a re-check at fire time. Change: fix the visibility desync noted in section 8.

## 8. Engine-level note (server C++, lair despawn; row 23 of the parity checklist)
- On the last player leaving a lair, the lair schedules a despawn event for 300000 (R72, R76, R77; read as milliseconds, not traced). The event is cancelled when a player enters (R74). When the event fires, it checks the player count again before destroying the lair (R75).
- Possible defect (not tested): visibility is checked on enter (R79) and exit (R80). A player who turns invisible while inside may leave the count out of step. Fix: track the set of counted players, not a number. Keep the grace timer.

## Not read
- `MMOCoreORB/src` beyond the three despawn files and the set-bonus search (most of the server C++ is unread).
- Most of the 3,624 creature files, 17,485 object files and 2,857 loot files: counted, not opened.
- `ai/` trees beyond `herd.lua` and `villageRaider.lua` (audit only); `faction_manager.lua`, `loot_manager.lua` (854 lines), `creature_manager.lua` (237 lines).
- `sql/` data dumps (`datatables.sql`, `swgemu.sql`, `mantis.sql`) beyond the audit's headers.
- `doc/` spreadsheets and images, `bin/terrain` and `bin/navmeshes` binaries.
- Armour rating numbers and the crafted-blade shared base (gen4 and gen5 min and max damage).
- The 12,247 Lua files with no matched licence string (audit AU051).
- Herd dwell times (8 to 15 s) and the herd patrol shape are from the audit (AU051), not re-read here.
