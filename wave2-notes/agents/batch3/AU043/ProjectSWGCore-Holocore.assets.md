# ProjectSWGCore-Holocore (asset audit, cell AU043)

Donor: /mnt/frankendom-donors/ProjectSWGCore-Holocore (VPS, read-only). Halves: server code (src/main/java and Kotlin) and data pack (serverdata/). Read: data pack by headers, counts and sample rows; server code only for spawn and loot services and file headers. Client: not present at top level. The pswgcommon submodule is an empty folder on disk.

## 1. Licences (as the files say)
- LICENSE.txt: GNU AGPL v3 text (line 1).
- build.gradle.kts header: AGPL "or any later version" (lines 15-17).
- Kotlin file headers (e.g. LootGenerationService.kt lines 4, 14): ProjectSWG emulation project header, AGPL text.
- README.md line 3: badge says "license-GPLv3". This conflicts with LICENSE.txt (AGPL). The files do not resolve it. Read as AGPL-3.0 (or later) from the text and headers, with the conflict noted.
- serverdata/ (about 5,600 files, 91M): no licence file, no CREDITS or NOTICE found at top level, no per-folder licence. Asset licence: none stated.

## 2. Asset inventory (paths and counts)
- strings.sdb: serverdata/strings/strings.sdb, 189,081 lines, tab-separated file, key, value (about 3,280 distinct file values incl. header).
- Dialogue: serverdata/conversation/ (JSON trees per zone and NPC type; about 3,862 JSON files serverdata-wide; 11 .msdb). Names only read.
- NPC tables: serverdata/npc/ (npc_1 to npc_5: 997, 1003, 308, 997, 1032 lines; npc_stats 101; npc_weapon 575; npc_equipment 20; npc_standard_attack 27; npc_mood, npc_emotes, npc_action .txt).
- Items: serverdata/items/ (8 or more files; items_weapon.sdb 304 lines).
- Loot: serverdata/loot/loot_table.sdb (934 lines, about 311 loot ids), rls_items.sdb.
- Appearance: serverdata/appearance/appearance_table.sdb (1077 lines; male and female variants for 10 species).
- Spawns: serverdata/spawn/ (dynamic/dynamic_spawns.sdb 961 lines; city, dungeon, event, gcw, instance, invasion, outback, poi, mustafar folders), serverdata/patrol/.
- Combat: serverdata/combat/mine_types.sdb (14 lines; first 6 read).
- Terrain: serverdata/terrain/ (20 .tga heightmaps and masks, 21 .trn, serverdata-wide counts). Binary, not opened.
- Name grammar: src/main/resources/namegen/ (10 race lists, resources.txt syllable grammar, filter/). About 1,100 lines total.
- Security and images: src/main/resources/security/Holocore.p12 (keystore, 2.4K, not opened); pswg-banner.png (29K, not opened).

## 3. Rights-holder status (repo files only)
Fan emulator project. The Kotlin header says "ProjectSWG is an emulation project for Star Wars Galaxies"; the README says "Holocore is a Star Wars Galaxies server emulator". The data uses original-game formats (.iff template paths, .trn, .tga, .sdb, string tables). The files do not say whether the data came from the original client or who holds its rights. Status: unknown for the data. No clean-room or original-game-data statement, no leak statement. Treat as restricted.

## 4. Best class
C for every serverdata group and the namegen lists, because no permissive or share-alike asset licence is named and the rights status is unknown. D for the keystore and banner (not usable, not opened). Code: AGPL/GPL per the conflict above, shape only for Frankendom.

## 5. Inspiration notes (own words; category-level only for class C)
- Creature row as data: one line per NPC with scale band, hue, attack and movement speed, aggressive and assist radius, death-blow flag and three loot tables with chances (serverdata/npc/npc_1.sdb line 1 header, line 3 creature row). Recreate the schema, not the numbers.
- Scale band from one body: a min-max scale (0.6 to 0.8 in the sample row) gives size variety cheaply. Keep the band, change the species (npc_1.sdb line 3).
- Trap family table: detonate range below blast radius, damage min and max, damage type and one effect per type (serverdata/combat/mine_types.sdb lines 3-6).
- Spawn pulse: a percent roll on movement, a cap of alive spawns near the player (default 12, maxObservedNpcs, DynamicSpawnService.kt line 59), spawn egg placed within 250 m on each axis (lines 149-152, 198), one elite plus normal slots 1 to 4 (lines 166-170). Maps directly onto walk density.
- Three-tier loot roll: up to three tables per NPC, each with its own chance; a chance of zero or less removes the table (LootGenerationService.kt lines 98, 107-109, 124). Credits and items are switched separately (line 77 onward).
- Difficulty rows in one loot id: normal, elite and boss rows with level bands (serverdata/loot/loot_table.sdb first rows).
- Syllable name grammar: a vowel set, start and end consonant sets, max length and surname chance in one grammar file per species (src/main/resources/namegen/resources.txt).

### Defects to fix when the idea is kept (Dom rule)
- Spawn chance: the check is `randomChance > npcSpawnChance` with `random.nextInt(0, 100)` (DynamicSpawnService.kt lines 98, 100). Values 0 to 5 pass, which is 6 of 100, not the 5 the config comment states. fix: use `<` or `nextInt(1, 101)`.
- Spawn offset: X and Z are each drawn from plus or minus 250, so the spawn area is a square, not a circle (lines 149-152, 198). fix: draw a radius and an angle if a round area is wanted; keep the square if the design means it.

## 6. Inspiration briefs
Rule for all briefs: recreate as a clearly distinct original, never a copy. Each names the trait kept and the trait changed.
1. Plated pack-hunter (category: large melee beast). Keep: wide scale band, slow attack and faster movement, separate aggressive and assist radius. Change: our own limbs, head, palette and ember seams. Ref: serverdata/npc/npc_1.sdb line 3 (numbers only).
2. Proximity trap family. Keep: detonate range below blast radius, damage band per type, one effect per type. Change: spikes, sigils or runes instead of mines; our own effect files. Ref: serverdata/combat/mine_types.sdb lines 3-6.
3. Walk-density spawn pulse. Keep: percent roll per step, alive cap near the player, one elite and normal slots. Change: round offset instead of square; cap per zone, not per player; a visible rising signal before the spawn. Ref: DynamicSpawnService.kt lines 58-59, 98-100, 149-170.
4. Three-tier loot roll. Keep: three tables per creature, zero chance removes the table, credits and items switched separately. Change: our item families, rarity colours and a drop sound per tier. Ref: LootGenerationService.kt lines 98-109.
5. Syllable name grammar per faction. Keep: vowel set, start and end consonant sets, max length, surname chance. Change: our own sounds per faction and our own length cap; no donor lists. Ref: src/main/resources/namegen/resources.txt.

## 7. Cross-link to our cell topics
- spawns and encounters: spawn pulse and cap (sections 5 and 6, item 3); the defects above are the first things to fix.
- loot: three-tier roll and difficulty rows (items 4 and section 5).
- hud-ui: none in this donor (no UI art read).
- sound-music: none read (no audio in the box).
- vfx: none read.

## Not read
See the not_read list in ProjectSWGCore-Holocore.assets.json. Main gaps: most of serverdata (values), 3,862 conversation files, terrain binaries, race name lists, keystore, banner, and most of the 637 Java and Kotlin files.
