# flareteam-flare-game (design catalogue, DC026)

Donor: /mnt/frankendom-donors/flareteam-flare-game (read-only, VPS). Half read: the DATA PACK (mods/*: enemy, item, map, power, animation and quest text files). The runtime half is flareteam-flare-engine, the paired donor; its engine source and default mod are in flareteam-flare-engine.catalogue.md. Neither box has a server half.

Licence (what the files say): README says art and data for Flare: Empyrean Campaign are CC-BY-SA 3.0, later versions permitted. Fonts are SIL OFL 1.1. Engine is GPL v3 or later. Audio is not named in the README and per-file attribution points to an online wiki, so audio is unclear (class C). Not legal advice.

Rule for every idea below: recreate as a clearly distinct original, never a copy. Each item names the trait KEPT and the trait CHANGED. Donor character names are not reused.

## Counts (what each number is)
- creatures: 124 enemy definition files in mods/empyrean_campaign/enemies (top level). Base templates (21 in mods/fantasycore/enemies/base, 13 in mods/empyrean_campaign/enemies/base) are not counted.
- classes: 3 in mods/empyrean_campaign/engine/classes.txt. mods/alpha_demo/engine/classes.txt lists 5.
- weapons: 73 weapon item blocks in mods/empyrean_campaign/items/categories (27 melee, 24 ranged, 22 magic), built on 23 base files in mods/fantasycore/items/base/weapons.
- gear_sets: 4 in mods/empyrean_campaign/items/sets.txt.
- zones: 56 top-level map files in mods/empyrean_campaign/maps. Also 33 files in maps/iron_labyrinth, 11 in maps/halls_of_infinity, 4 in maps/parallax, 4 in maps/procgen_rules (not counted in zones).

## 1. Creatures and beasts

Family counts use the first keyword found in the file name, so a hobgoblin counts as a goblin and a spawn variant counts under its creature. These are filename counts, not exact role counts.

- Skeletons: 25 files (undead: archer, mage in fire, ice, frost, blaze and shock forms, knight, guardian, protector, basher, assassin, sharpshooter, shadowstep). The 25 includes 1 player-summon and 1 spawn variant. HP from 60 (level 1, cracked skeleton) to 410 (level 15, guardian). Ref: mods/empyrean_campaign/enemies/lvl*_skeleton*.txt.
- Zombies: 13 files (raised, rotting, brute, bloodthirsty, iceclaw, leecher, vomit, miner, frozen, vampiric, labyrinth variants). Includes 1 player-summon. HP from 30 (level 1) to 360 (level 13, miner). Ref: mods/empyrean_campaign/enemies/lvl*_zombie*.txt.
- Goblins and hobgoblins: 22 files (runner, charger, spearman, hurler, vanguard, hunter, shaman, thief, sprinter, sonic, archer). Chief elite 260 HP (level 2). Hobgoblin 400 HP (level 15). A 1 HP cart goblin exists (enemies/goblin_minecart.txt). Ref: mods/empyrean_campaign/enemies/lvl*_goblin*.txt.
- Antlions: 19 files (fire, ice, venom, burster, sprayer, spitter, slasher, freezer, firethorn, shivering, larva, hatchling, fossilized). Labyrinth hatchling 20 HP; queen 840 HP (level 7). Ref: mods/empyrean_campaign/enemies/lvl*_antlion*.txt and il_antlion*.txt.
- Wyverns (flying): 9 files (base, fire, ice, air, tundra, ancient, labyrinth variants). 60 HP labyrinth; 210 to 220 HP at level 7; 260 tundra at level 9; 410 ancient at level 15. Ref: mods/fantasycore/enemies/base/wyvern*.txt; mods/empyrean_campaign/enemies/lvl*_wyvern*.txt.
- Minotaurs (heavy humanoids): 2 files (minotaur 305 HP, necromancer 385 HP, both level 10). Ref: mods/empyrean_campaign/enemies/lvl10_minotaur*.txt.
- Sentries (stationary turrets): 2 files, fire and ice, 600 HP at level 11. Ref: mods/empyrean_campaign/enemies/lvl11_sentry_fire.txt, lvl11_sentry_ice.txt.
- Graves and tombstones (stationary): cursed grave 200 HP (level 3); forgotten grave 1700 HP (level 16). Ref: mods/empyrean_campaign/enemies/lvl3_cursed_grave.txt, lvl16_forgotten_grave.txt.
- Boulders (catacomb set piece): 2 files, 700 HP, quest-tagged. Ref: mods/empyrean_campaign/enemies/catacomb_boulder_1.txt.
- Named elites and bosses: 28 files whose names do not match a family keyword. 25 files across the whole set carry a defeat or quest tag (this includes the two boulders). Boss HP steps: labyrinth boss 830 HP (level 1), elite 2160 HP (level 4), elite 5040 HP (level 12), final warden 13280 HP (level 16). Ref: mods/empyrean_campaign/enemies/il_boss_razu.txt, lvl4_seagate.txt, lvl12_metzger.txt, lvl16_lezaith.txt.

Tier shape: HP runs about 20-60 at level 1, 150-300 at levels 5-10, and 390-410 at level 15. Rarity is set per file: 35 common, 40 uncommon, 15 rare; 34 files have no rarity key.

Attacks: 266 power= lines across the 124 enemy files. Each line is a power type, a power id and a chance weight. Elemental variants reuse one base template and swap the element and animation sheet. Boss files use the same power= lines; I saw no phase logic in the files I read.

Ranged behaviour (design rule written by the donor, mods/empyrean_campaign/enemies/docs/ranged_behavior.txt): numeric chance knobs set how careful a creature is. The file says higher level should mean smarter. Goblins and antlions are deliberately dumber because many appear together. Ice is a little less careful than fire to balance its freeze effect.

### Top 8 striking creatures (criteria: readable silhouette at 375 wide, one signature behaviour, one signature sound or effect, could be ours at 20-30 percent resemblance)

1. Label: Ember-winged skyrider (wyvern family).
   Why: a flying body that reads as one family in several element colours; flying plus melee, ranged and cast gives several attack shapes from one template.
   Keep: one base body with element passes; flying with a threat radius of 8; a shared hit sound.
   Change: our own body plan (not a winged lizard); armour plates in place of wings; our own palette.
   Ref: mods/fantasycore/enemies/base/wyvern.txt (line 1 includes the beacon template, line 6 hit sound, line 14 threat range); mods/empyrean_campaign/enemies/lvl15_wyvern_ancient.txt (line 39, ranged power).

2. Label: Ward-bearer beast (minotaur force field).
   Why: a two-second window where it reflects projectiles, then a ring burst. Players can learn the tell.
   Keep: buff then burst; 100 percent reflect for 2 seconds; return damage for 2 seconds.
   Change: our own shield visual (not an orange ring); a half-second wind-up tell; a ring that does not push.
   Ref: mods/empyrean_campaign/powers/categories/enemy.txt lines 518-546 (ids 197 and 198); line 524 (reflect); line 534 (ring sprite).

3. Label: Radial turret (sentry).
   Why: a ring of twelve missiles is a clear shape at 375 wide. Ice volleys slow the target.
   Keep: radial volley; slow on hit (50 percent for 2 seconds on the ice variant).
   Change: eight shots with one gap that rotates each volley, so the player can step through.
   Ref: mods/empyrean_campaign/powers/categories/enemy.txt lines 633-657 (count 12, missile angle 30).

4. Label: Three-aspect warden (final boss).
   Why: it cycles elemental three-missile volleys and is immune to bleed and to slow or stun. That forces ability variety.
   Keep: element cycle of three-missile volleys; passive status immunities.
   Change: our own three aspects; immunity to one status family only; a visible telegraph before each volley.
   Ref: mods/empyrean_campaign/enemies/lvl16_lezaith.txt lines 9 (defeat tag), 16-17 (immunities); mods/empyrean_campaign/powers/categories/enemy.txt line 1011 (volley block).

5. Label: Brood-mound (spawner).
   Why: the parent births small children through spawn powers, with fire and ice versions. Good for a swarm the player must thin out.
   Keep: spawn-on-threshold with small children (20-60 HP); two spawn power steps.
   Change: our own brood sprites; a cap on live children (Frankendom MAX_ATTACKERS is 3); a spawn cooldown.
   Ref: mods/empyrean_campaign/powers/categories/enemy.txt lines 789 and 802 (larva spawn 1 and 2); mods/empyrean_campaign/enemies/lvl13_antlion_larva.txt.

6. Label: Leech walker (zombie).
   Why: a basic melee strike that heals the attacker makes a slow zombie a clear threat with a clear response.
   Keep: hit-point steal on a basic melee strike (hp_steal=50 on the strike power).
   Change: a heal cap per fight; a visible drain link between the two actors.
   Ref: mods/empyrean_campaign/powers/categories/enemy.txt line 344 (strike); mods/empyrean_campaign/enemies/lvl7_vampiric_zombie.txt.

7. Label: Alarm-caller goblin (beacon).
   Why: first contact pulls the pack in. The engine emits the beacon on join-combat, so the pull is a data power, not a special case.
   Keep: join-combat emits a radius-4 pull power.
   Change: pull only the two nearest; show a horn ring; add a cooldown.
   Ref: mods/fantasycore/enemies/base/beacon.txt line 2 (power id 132, see the correction below); mods/empyrean_campaign/enemies/base/beacon.txt line 2 (id 161); mods/empyrean_campaign/powers/categories/beacon.txt line 4 (description) and line 12 (beacon flag).

8. Label: Pocket thief (goblin steal).
   Why: a timed theft gives a distinct threat that is not damage. The steal is a melee hit with a 20-second cooldown plus an on-hit script.
   Keep: 20-second cooldown melee hit; on-hit script hook.
   Change: steal a consumable, not gear; return it on kill.
   Ref: mods/empyrean_campaign/powers/categories/enemy.txt lines 774-788 (id 243), 1108-1119 (id 273, script scripts/powers/goblin_steal.txt, not read).

## 2. Classes, races and factions

Races: none found. Factions: named NPC factions not read.

- Melee brawler (donor label: Brute). Primary attribute physical, starting with 4 points and 1 defense point. Tree tab 0 has 13 nodes including swing, cleave, shield bash, war cry, quake, vampirism, rupture. Ref: mods/empyrean_campaign/engine/classes.txt line 7 (description); mods/empyrean_campaign/powers/trees/default.txt.
- Precision ranged (donor label: Scout). Primary attribute offense, starting with 4 points. Tree tab 1 has 13 nodes including haste, piercing shot, multi-shot, rapid fire, caltrops, bear trap, poison shot, scavenger. Ref: classes.txt; trees/default.txt.
- Caster (donor label: Adept). Primary attribute mental. Tree tab 2 has 13 nodes including fireball, ice bolt, shock, burn, freeze, thunderstrike, energy flow, summon skeleton, barrier. Ref: trees/default.txt.
- alpha_demo adds Keeper (defense primary) and Wanderer (no primary, custom). Ref: mods/alpha_demo/engine/classes.txt.

Progression shape: a tree node is gated by how many primary points the hero has (requires_primary lines at lines 19, 27 and 33 of the tree file, plus requires_point). 39 tree nodes in total, 13 per class. About 36 nodes have a name comment; the other 3 were not read. Each class starts with a preset action bar.

## 3. Weapons

- Melee: 14 base files (battle axe, club, dagger, greatsword, hand axe, infantry axe, longsword, mace, maul, reinforced club, shortsword, smith hammer, war hammer, zweihander). 27 item blocks. Ref: mods/fantasycore/items/base/weapons/melee/.
- Ranged: 5 base files (greatbow, longbow, shortbow, slingshot, ammo). 24 item blocks. Ref: mods/fantasycore/items/base/weapons/ranged/.
- Magic (staff family): 4 base files (greatstaff, rod, staff, wand). 22 item blocks. Equip flag is mental. Ref: mods/fantasycore/items/base/weapons/magic/.
- Special properties: 9 bonus_power_level lines give extra levels to named powers. The unique bow gives +1 to powers 100 and 105. Unique items carry resist and damage bonuses. Ref: mods/empyrean_campaign/items/categories/level_8_unique.txt lines 30-31.
- Tiers, items per level across all categories: level 1 has 8; levels 2, 3, 4 have 26, 26, 32; level 5 has 14; levels 6 and 7 have 29; level 8 has 35; level 16 has 40. Tiers show by name colour, overlay icon and sort order (see sections 4 and 6).

### Top striking weapons (3 only: the rest were not opened closely enough to judge)
1. Amir Blade: a unique built on the zweihander base, with a lightning-resist bonus and melee bonuses (requires physical 14). Ref: mods/empyrean_campaign/items/categories/level_8_unique.txt (item 197). Keep the big-blade base and the unique-with-resist pattern; change the blade shape and name.
2. Huntsman Bow: a unique bow that adds levels to two powers, so the weapon itself boosts its skills. Ref: level_8_unique.txt (item 198, lines 30-31). Keep the built-in power bonus; change the bow.
3. Greatstaff: a mental-only staff with a wood pickup cue. Ref: mods/fantasycore/items/base/weapons/magic/greatstaff.txt (equip_flags=mental, soundfx inventory_wood). Keep the mental-only restriction and the cue; change the shape and element palette.

## 4. Armour and gear

- Material tiers by slot: cloth (chest, feet, hands, legs); leather (adds head); chain (adds head); plate (adds head). Mage variants: mage, mage_alt1, mage_alt2, each with five slots. Accessories: belt and magic boots. Ref: mods/fantasycore/items/base/armor/.
- Mythic tier: the top tier is named after a mythic metal (donor term). Its category file has 63 item blocks (mods/empyrean_campaign/items/categories/mastite.txt). The random mastite tables (mods/empyrean_campaign/items/random/mastite_*.txt) have no item blocks in the format I counted.
- Quality ladder: normal, high, rare, epic, unique, mastite. Empyrean item blocks: 113 rare, 113 epic, 113 high, 77 unique, 131 with no quality key, 4 crafting, 1 crafting tool (552 blocks across all categories, including potions, scrolls and quest items).
- Sets: 4. Underworld Armament has 9 pieces, with bonuses at 3, 4, 5, 6 and 7 pieces (currency find, speed, xp, absorb, and four elemental resists at 7). Temple guard set: 3 pieces with ice resist and poise. Wizard apparatus: 3 pieces with mana regen at 3. St. Maria garb: 3 pieces with return damage at 3. Ref: mods/empyrean_campaign/items/sets.txt (line 36 for Underworld Armament, line 44 for its 7-piece bonus).
- Look and sound per material: plate chest uses a maille pickup cue and a steel loot animation; cloth uses a cloth cue; magic boots use a leather step cue. Ref: mods/fantasycore/items/base/armor/plate/chest.txt line 4; armor/cloth/chest.txt line 4; armor/magic_boots.txt.
- Tiers show by: colour and overlay icon per quality; sort order (currency, unique, mastite, rare, epic, high, normal, low); the material's sound and loot animation. Ref: mods/empyrean_campaign/items/qualities.txt line 22.

### Top striking gear (5)
1. Underworld Armament (9-piece set, four elemental resists at 7 pieces). Keep the large piece count and a late-tier resist; change the set's theme. Ref: sets.txt line 36.
2. Temple guard set (ice resist and poise). Keep the defensive theme; change the palette. Ref: sets.txt.
3. Wizard apparatus (mana regen at 3 pieces). Keep the regen bonus; change the item shapes. Ref: sets.txt.
4. Plate cuirass (maille pickup cue). Keep the metal cue on pickup; change the armour art. Ref: mods/fantasycore/items/base/armor/plate/chest.txt line 5 (gfx=plate_cuirass).
5. Magic boots (leather step cue). Keep the step cue per material; change the shape. Ref: mods/fantasycore/items/base/armor/magic_boots.txt.

## 5. Zones and dungeons

Biomes and tilesets (from map header tileset lines): dungeon 20 maps, grassland 14, cave 11, snow plains 4, ruins 4, cave and dungeon mix 2. One map file has no tileset header line. Ref: mods/fantasycore/tilesetdefs/ and mods/empyrean_campaign/tilesetdefs/tileset_ruins.txt.

Music: 11 tracks in map headers. Dungeon theme on 16 maps, cave on 12, forest on 6, overworld on 5, boss on 4, wind ambient on 3, unrest on 3, magical on 3, battle on 2, safe room on 1.

Ambient beds (looping environment sounds placed as map events, counted as line uses across maps): river loop 195, cave droplets 112, open fire 94, bird twitter 53, forest owl 52, raven 47, cave wind 39, wind loop 16, rain 3. Example: mods/empyrean_campaign/maps/abandoned_mines.txt line 387.

Weather layers: parallax files for fog, rain, snow and space. Fog has a fixed drift speed (mods/empyrean_campaign/maps/parallax/fog.txt line 4). The other three were not read.

Dungeon archetypes from map names and headers (I read headers and a few event blocks only):
- mines and caves: abandoned mines, blackmire mines, nazia mines, perdition mines, underworld mines.
- sewers, catacombs and crypts: dilapidated sewers, underworld catacombs, family crypt, lochport cemetery.
- strongholds and forts: underworld strongholds, fort amir, fort nasu, wizards tower.
- procedural labyrinth: iron labyrinth (three floors and a chasm).
- endless halls: 10 numbered floors listed in maps/halls_of_infinity/maplist.txt.
- a map named the pit (header read only).
- marsh, lagoon and oasis maps: merrimead swamp, grot lagoon, oasis.

Procedural labyrinth (mods/empyrean_campaign/maps/procgen_rules/iron_labyrinth.txt): at most 2 doors, door spacing at least 2, main path 10 to 20 chunks (line 5), up to 1000 attempts, branch length 5 to 10, at most 2 branches per door level (line 9). Chunk pool: 4 link chunks, 1 key chunk, 2 north-south door chunks, 2 east-west door chunks, 18 room chunks, a treasure room and a vendor room (29 chunk files).

Hazards (mods/empyrean_campaign/powers/categories/environment.txt): spike traps (manual id 178, automatic id 255), fireball turret trap (id 377), minecart explosion (id 200), destroy tombstone (id 177), mastite pillar mana regen (id 378). Map-power spikes and shock turrets are in mods/empyrean_campaign/enemies/map_powers/ (3 files).

Walk density (counts, not timed): 745 enemy placement blocks over 56 maps (about 13 per map). Each block gives a rectangle, a category, a level, a count range (for example 2 to 3) and an optional wander radius. 13 spawn= lines place pre-set packs. 3 spawn_level lines scale placed enemies by hero level (one is 1.25 on the labyrinth chasm map, mods/empyrean_campaign/maps/iron_labyrinth_chasm.txt line 707). 18 NPC placements. 1570 event blocks in total. Not measured: what appears every 20 seconds of walking.

### Top striking zones (5)
1. Iron labyrinth: a chunk-stitched maze with a main path, branches and keyed doors. Ref: procgen_rules/iron_labyrinth.txt lines 5 and 9; maps/iron_labyrinth/. Keep the chunk-and-rule generator; change the chunk art.
2. Endless halls: a ten-floor ladder of fixed floors. Ref: maps/halls_of_infinity/maplist.txt. Keep the numbered floor list as data; change the floor design.
3. Abandoned mines: cave tileset, river loop, cave droplets. Ref: maps/abandoned_mines.txt line 387. Keep the layered ambience per zone; change the palette.
4. Goblin camp: pack placements with wander radius 1. Ref: maps/goblin_camp.txt line 458. Keep the small wandering pack; change the camp layout.
5. The pit: cave tileset with a wind ambient track. Ref: maps/the_pit.txt (header read only). Keep one track per zone; change the arena layout. Not read further.

## 6. Item and effect looks worth recreating

- Wyvern element variants: one base body with per-element animation sheets (fire, water and air animation files; the ice template points at a water animation). Technique: swap the sheet per element on the same body. Ref: mods/fantasycore/animations/enemies/wyvern_fire.txt line 13; mods/fantasycore/enemies/base/wyvern_ice.txt line 3.
- Idle loop: an eight-frame stance at 800 ms, looped, for the fire wyvern. This is the idle vocabulary when nothing happens. Ref: wyvern_fire.txt (stance section: frames=8, duration=800ms, type=looped).
- Ring shield: an orange shield sprite on a radius-2 hazard that lasts two seconds. Ref: mods/empyrean_campaign/powers/categories/enemy.txt line 534.
- Sparkle sprite: a looped 20-frame sparkle at 1 second. Use sites not checked. Ref: mods/fantasycore/animations/powers/sparkle.txt.
- Loot drop: a six-frame sheet played once over 600 ms, with one sheet per gear base (39 loot animation files). Ref: mods/fantasycore/animations/loot/steel_armor.txt line 11.
- Quality badge: a colour and an overlay icon per quality, with a sort order. Ref: mods/empyrean_campaign/items/qualities.txt line 22.
- Status effect animations: 38 effect blocks. Bleeding uses a red spark loop; mage shield uses a shield animation. Ref: mods/empyrean_campaign/powers/effects.txt.
- Split death sounds: normal death and critical death have separate cues (for example the minotaur critical-death file). Ref: mods/fantasycore/enemies/base/minotaur.txt; wyvern.txt line 6 (hit cue).
- Per-material step and pickup cues. Ref: armor/plate/chest.txt line 4; armor/cloth/chest.txt line 4.

Readability at 375 wide: frame cells differ by creature (the fire wyvern stance cell is 129 by 209 pixels, from its frame line). I did not check silhouettes by eye; no PNG was viewed.

## 7. Inspiration for Frankendom (originals, not copies)

1. Ember-winged skyrider: a flying elemental beast in one base body. Keep: one body with element passes; flying with a close threat radius. Change: body plan, wing shape, palette. Rows: 4 (fight loop), 7 (creature actor).
2. Ward-bearer: a buff-then-burst beast. Keep: a two-second reflect window then a ring burst. Change: a half-second wind-up tell and a ring that does not push. Rows: 3 (guard and parry), 10 (hit impact).
3. Radial turret: a stationary ring volley. Keep: radial volley with a slow on hit. Change: eight shots with a rotating gap. Rows: 13 (specials), 23 (zone population).
4. Three-aspect warden boss: element cycle with status immunities. Keep: the cycle and the immunities. Change: our aspects, one immunity family, a telegraph. Rows: 2 (AI brain), 13 (specials).
5. Brood-mound: a spawner that births small children. Keep: spawn at a threshold, small children. Change: a cap of 3 live children, our sprites, a cooldown. Rows: 23 (zone population), 4.
6. Leech walker: a heal-on-hit zombie. Keep: hit-point steal on a basic strike. Change: heal cap and drain link. Rows: 18 (loot and XP), 13.
7. Alarm-caller: first contact pulls the pack. Keep: a join-combat pull as a data power. Change: only the two nearest, a horn ring, a cooldown. Rows: 4 (aggro), 23.
8. Pocket thief: a timed steal with an on-hit script. Keep: 20-second cooldown and the script hook. Change: steal a consumable and return it on kill. Rows: 13, 18.
9. Chunked labyrinth: a generated maze from chunks with a main path, branches and keyed doors. Keep: the main-path and branch length windows and the branches-per-door cap. Change: our chunks and seed rules. Rows: 20 (catalogue as runtime source), 23.

## Not read
- PNG and sprite contents (sizes from headers only; nothing viewed).
- Audio content (names and counts only).
- The scripts folder, including scripts/powers/goblin_steal.txt.
- Quest, book and cutscene text: 13 quest files and 26 book files counted, not opened.
- Locale files: 34 .po files in empyrean_campaign and 34 in fantasycore. One sample (data.be.po) has about 1,349 msgid entries. Grammar is gettext msgid and msgstr pairs. No strings quoted.
- alpha_demo enemy files (45 counted, not opened).
- Minicore and minicore_alpha animation sets (names only). Three statue-guardian npc files exist (fire, wind, ice) in minicore_alpha/animations/npcs.
- Boss phase logic (none seen in the files I read).
- Hero layer and avatar dressing files (fantasycore/engine/hero_layers.txt and avatar folder: named only).
- The newer HD art source named in art_src/README.md (not in this tree).

## Verification
Receipts: /private/tmp/p2/wave2-haiku/batch3/DC026/flareteam-flare-game.receipts.tsv, 40 rows, checked with gate/verify_receipts.py (40 ok, 0 failed). The verifier checks that each quote is on the cited line, not the claim. I checked claims against the surrounding lines.

Correction found in this pass: the beacon template at mods/fantasycore/enemies/base/beacon.txt names power id 132. In the empyrean set, id 132 is a magician shock variant (mods/empyrean_campaign/powers/categories/magician.txt line 147, which includes shock.txt and has no beacon flag). The empyrean campaign overrides the template with id 161 (mods/empyrean_campaign/enemies/base/beacon.txt line 2), which is the flagged beacon. Data defect class: a numeric id that changes meaning across mods. Fix: refer to powers by key or check ids per mod. Decision: adapt the idea (a join-combat pull as a power), with the id resolved per mod.

Data defect: mods/empyrean_campaign/enemies/xp_scaling/il.txt line 17 reads level=16,31768. Levels 1 to 15 double each step (level 15 is 16384 on line 16), so the pattern points to 32768. This may be a typo. Not verified in play.
