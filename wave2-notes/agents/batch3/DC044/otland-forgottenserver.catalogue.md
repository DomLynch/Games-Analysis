# otland-forgottenserver (design catalogue, DC044)

Donor tree: /mnt/frankendom-donors/otland-forgottenserver/ (read over ssh only, nothing copied or run).
Asset audit used first: AU042 (`/private/tmp/p2/wave2-haiku/batch3/AU042/otland-forgottenserver.assets.md`). Not repeated here: the Abyssador boss, the animated-sword item and the spawn-block idea are already in that audit and are only referenced.
Receipts: `receipts.tsv` in this folder (31 rows for this donor; 50 rows in the file, all verified with verify_receipts.py).
Rule for every idea below: recreate as a clearly distinct original, never a copy. Inspiration stays category-level because this donor's data licence is unclear (class C).

## Which half was read
- **Read: the server/data half.** `data/monster/monsters/*.xml` (1166 files, index in `data/monster/monsters.xml`), `data/items/items.xml`, `data/XML/*.xml` (vocations, stages, groups, outfits, mounts), `data/world/forgotten-spawn.xml`, `config.lua.dist`. Lua files: names and one count only. `src/` (C++): not opened beyond the licence header.
- **Not read: the client half.** Sprites, sounds and the code that turns the numeric look IDs into pictures are not in this donor. Named client donors that exist in the box (none opened here): mattyx14-TheForgottenTibiaClient (audited in AU033), edubart-otclient, opentibiabr-otclient, OTCv8-otclientv8. The README links an OTClient project that is not one of those names.
- So every "looks" claim below is a server-side hint (an effect name, an aura name, an item attribute). How it appears on screen is not verified.

## Counts (verified by grep or awk on the donor)
- creatures: 1166 monster files. 294 carry `isboss="1"`; 79 carry `isboss="0"` explicitly.
- classes: 8 playable vocations (4 base, 4 promoted) plus one "None" placeholder row (vocations.xml, 9 rows).
- weapons: 524 items with a `weaponType` attribute (includes shields and ammunition). 60 of them are elemental copies (4 elements x 15 bases).
- gear_sets: 3 elemental families (heart, soul, mind: 20 items). 36 armour items in total have armour 14 or more.
- zones: 0 named zones. The map is a 3.4 MB binary OTBM and was not read. The spawn file gives 362 spawn blocks, split into ground and underground floor bands (see section 5).

## 1. Creatures / beasts

**Families by race attribute** (counted with grep over all creature files; the race attribute is the only family tag in the data):
- blood: 633 (largest bucket; the everyday fauna and humanoids; not checked file by file)
- undead: 253
- venom: 135
- fire: 75
- energy: 44
- ink: 16 (book, squid and library themes: flying book, librarian, several squids, animated feather, cursed book, ink blob, guardian of tales, knowledge elemental, and others)
- no race attribute: 10 (counted by subtraction from 1166)

**Escalation with level, by health band** (first `max` health value per file):
- under 100: 143 files
- 100 to 999: 328
- 1,000 to 4,999: 322
- 5,000 to 19,999: 206
- 20,000 to 99,999: 106
- 100,000 and up: 61
- Experience follows the same climb: 186 of the 294 boss-flagged files give 1,000 or more experience. The top is a single file (`gaz'haragoth.xml`, 1,000,000 experience, 350,000 health).

**Boss pattern (read in about 25 files):** the boss flag plus a short list of timed rolls. Each roll is one of: a self-heal defence, a self-haste defence, an invisibility window, an outfit transform, a radius speed-steal, a summon pool with a cap, and a re-target roll (`targetchange`). Bosses have 5 to 12 attack lines. Summons appear as 164 `<summon>` lines across the folder. Creature voice barks (`<voices interval chance>`) appear in 651 files.

**Filename keyword scan (rough, substring match, so overlaps happen):** orc-named 30, dragon-named 24, elemental-named 18, golem-named 15, demon-named 14. Use only as a hint.

### Top 8 striking creatures (own labels; silhouettes not read, so readability is judged from the behaviour only)
1. **Hellfire Summoner** (`data/monster/monsters/infernatil.xml`, fire race). Why: a boss that keeps a capped pool of summons topped up on a one-second roll and hastes itself for a few seconds. A readable "call, then run" tell. Keep: the capped summon pool (cap 4) and the self-haste as the telegraph. Change: silhouette, summon names, element, and add a sound before the haste so the tell is heard as well as seen.
2. **Veil Colossus** (`data/monster/monsters/the_scourge_of_oblivion.xml`, energy race, 800,000 health; one of the 61 files in the 100,000-plus band). Why: a giant that drops out of sight in two short windows; invisibility is the timing puzzle. Keep: short invisible windows as the tell. Change: give the window its own shimmer and sound (see looks), and cut the 12 attack lines to about 5 so a 375 px screen can show the tell.
3. **Elder Wyrm** (`data/monster/monsters/the_first_dragon.xml`, blood race). Why: an area speed-steal that turns the ground around the boss into a slow zone. Keep: the radius slow as a shaped threat. Change: element, silhouette, and a shorter slow (the donor's is about 10 s).
4. **Shifting Beast** (`data/monster/monsters/feroxa_werewolf.xml`; a second form in `feroxa_killable_werewolf.xml`). Why: a mid-fight outfit transform into a beast form plus a self-haste. Keep: the mid-fight form change as a two-phase boss. Change: our own beast form, and a stinger on the change.
5. **Twin Minion Lord** (`data/monster/monsters/gaz'haragoth.xml`, the largest experience value among the 294 boss-flagged files). Why: two minion species, each with its own cap of three (six total), summoned on the same roll. Keep: two separate summon pools with separate caps. Change: our minion species. Note for our side: the engine's MAX_ATTACKERS = 3 ruling means only three can attack at once, so the pools must be capped in the engine, not just in the data.
6. **Gilded Sentinel** (`data/monster/monsters/golden_servant.xml`, energy race, a low-health construct). Why: a gold-tinted construct that barks idle lines on a timer. The idle barks are the signature. Keep: idle barks on an interval with a low chance (every one second, chance 5). Change: silhouette and palette; write our own barks.
7. **Animated Tome Pack** (`data/monster/monsters/flying_book.xml` for the attacker, `data/monster/monsters/librarian.xml` for the healer; both ink race). Why: a cheap pack of animated books with one healer that has a radius-4 heal aura. Keep: one healer among cheap attackers. Change: silhouette, damage types, and names.
8. **Emperor's Revenant** (`data/monster/monsters/spite_of_the_emperor.xml`, undead; two siblings `fury_of_the_emperor.xml` and `scorn_of_the_emperor.xml` not opened). Why: a 20-second area slow with a summon cap of two, in a three-file family. Keep: a long slow as a rhythm of quiet and loud periods. Change: shorten the slow to a few seconds for mobile play, and change the summon.

## 2. Classes / races / factions

| Row | Role | Signature | Progression (one line) |
|---|---|---|---|
| Knight (id 4) | melee, highest carry and health gain | heavy melee | promoted to Elite Knight (id 8) |
| Paladin (id 3) | mixed (role from the name; Lua not read) | no magic shield flag | promoted to Royal Paladin (id 7) |
| Sorcerer (id 1) | magic, magic shield flag on | area spells | promoted to Master Sorcerer (id 5) |
| Druid (id 2) | magic, magic shield flag on | area spells | promoted to Elder Druid (id 6) |

- **Promotion shape:** the promoted rows (ids 5 to 8) double the soul cap (200 against 100), cut the soul regeneration tick (15 against 120), and double the per-tick health and mana gain (10 against 5). The promotion is a stat change at the vocation level, not a new skill tree. Verified: vocations.xml lines 43, 53 and 83 (the Knight, Master Sorcerer and Elite Knight rows).
- **Creature races** are the six race buckets in section 1. They work as factions of the monster world, not of players.
- **Account groups** (player, tutor, senior tutor, gamemaster, community manager, god) are staff tiers, not gameplay factions. Recorded, not used.
- **Cosmetics:** 220 outfit entries (with premium and unlocked flags) and 209 mount entries. These are a cosmetic collection model (see the looks and originals).
- **Progression stages:** `data/XML/stages.xml` holds an experience band table (multiplier 7 for levels 1 to 8, 6 for 9 to 20, 5 for 21 to 50, 4 for 51 to 100, 5 from 101), but the table is switched off in the shipped config (line 3). The shipped `config.lua.dist` uses a flat `rateExp = 5` (line 145), and its own note says that value is ignored when stages are on (line 144).
- Not read: the Lua vocation and skill scripts (names only).

## 3. Weapons

**Families** (by `weaponType` value, item counts): sword 111, club 108, axe 97, shield 87, distance (bows and crossbows) 54, wand 38, ammunition 24, quiver 5.

**Elemental weapon family (the striking one):** 15 base weapons, each made in four element copies (fire, ice, earth, energy), so 60 items. The base names: spike sword, relic sword, mystic blade, blacksteel sword, dragon slayer, barbarian axe, knight axe, heroic axe, headchopper, war axe, clerical mace, crystal mace, cranial basher, orcish maul, war hammer.
- The fire and ice copies of every base have the same attack, defence and weight (checked for all 15). The only change is the element attribute, value 4 to 9 per base. Fire copies: ids 7744 to 7758. Ice copies: ids 7763 to 7777.
- Range across the 15 bases: attack 20 (spike sword) to 39 (war axe); defence 10 to 28; weight 3500 (mystic blade) to 8500 (war hammer). Heavy weapons trade defence for attack (the war hammer has defence 10).
- Elemental arrows: flash (energy), shiver (ice), flaming (fire), earth arrow (earth), all at element value 14.
- **Charges and decay:** the fiery crystal mace (id 7755) carries 1000 charges and decays into the plain crystal mace (id 2445) when spent.
- Set bonuses: not searched in items.xml (no set attribute appears in the top 60 attribute keys). Recorded as not found in the top keys only.

**How visually distinct the tiers are:** the server cannot show this. The element copies have different item IDs, so on the client they probably have different looks, but the sprites are not in this donor (not read).

### Top 5 striking weapons
1. **Four-element dragon slayer** (`data/items/items.xml` ids 7748 fire, 7767 ice, plus earth and energy copies; base line 13763). Why: one blade shape, four elements, identical stats. Keep: one base, four skins, stats unchanged. Change: show the element as a glow and a sound, not a recolour.
2. **Charged mace that decays** (`data/items/items.xml` id 7755, line 13840). Why: a charged elemental weapon that becomes a dull base item when the charges run out. Keep: charges that decay into a base form. Change: our own names and a decay that reads as a visible wear state.
3. **Light blade vs heavy hammer** (`data/items/items.xml` icy mystic blade id 7765, fiery war hammer id 7758). Why: both have attack 36, but the blade weighs 3500 with defence 25 and the hammer weighs 8500 with defence 10, so the pair shows weight and defence trading places. Keep: the same attack with a weight-for-defence trade. Change: our numbers and our weight classes.
4. **Elemental arrows** (`data/items/items.xml` ids 7838 to 7850). Why: ammunition carries the element too, so a ranged build can reuse the same element logic. Keep: element on ammunition. Change: our element set and a per-shot sound.
5. **Glass-cannon rapier** (`data/items/items.xml` ice rapier id 2396, line 3358). Why: attack 42 at weight 1500 and defence 1, above the 39 top of the 15 elemental bases, with element 18. (Not checked against every weapon item for the highest attack.) Keep: one light, fragile, element-heavy weapon as a glass-cannon tier. Change: our numbers, our name, and a visible fragility cue.

## 4. Armour / gear

**Tiers by armour value** (verified across items.xml): 4 to 18. Named items by band:
- 14: golden armor (id 2466, gold-plated, weight 8000), skullcracker armor (id 8889)
- 15: dragon scale mail (id 2492 is 15), elite draken mail, fireborn, earthborn, windborn and oceanborn armour (ids 8881 to 8884), prismatic armor, master archer's armour, mind raiment (4 items)
- 16: demon armor (id 2494), yalahari armor, royal draken mail, ornate chestplate, depth lorica
- 17: magic plate armor (id 2472, weight 8500)
- 18: heart series (12 items: cuirass, hauberk and platemail in four elements, ids 25174 to 25185) and soul tabard (4 items, ids 25186 to 25189)

**Elemental armour: paired resistance.** The heart series (fire version at ids 25174 to 25176) gives +8 absorb to its own element and -8 to the opposite element (fire +8, ice -8). Verified: items.xml lines 35538 and 35541. This is a paired-resistance trade: each piece is strong against one element and weak to its opposite.

**Mind raiment** (4 items, armour 15, ids 25190 to 25193): same paired absorb, plus a magic-level bonus (4) in place of the heart series' skill bonus. The mind line trades armour for magic.

**Materials by name (substring counts, a rough hint only):** "crystal" 250, "dragon" 211, "gold" 179, "golden" 138, "magic" 83, "demon" 83, "glowing" 48, "ancient" 41, "plate" 42, "mystic" 25, "leather" 22, "elven" 17. No mythic-metal tier was found in the armour names read. "Blacksteel" appears in weapon names (blacksteel sword); other metal names were not searched.

**How the game shows tiers:** not in the server data. The data shows tiers by armour number and weight; the client (not read) draws them.

### Top 5 striking gear
1. **Heart cuirass, fire version** (ids 25174 to 25176; items.xml line 35536). Why: top armour band with a paired resistance (+8 fire, -8 ice). Keep: the paired resistance as a visible trade-off. Change: our element names and numbers.
2. **Gilded plate, mid tier** (golden armor id 2466, line 3834). Why: gold as a mid-tier look with a plain armour value of 14. Keep: gold as a cosmetic tier that does not top the list. Change: the palette and specular (for the artist).
3. **Magic plate armor** (id 2472, line 3865). Why: the heaviest body item in the top band (weight 8500) with armour 17. Keep: heavy armour that is a clear step up in weight. Change: our weight numbers and silhouette.
4. **Mind raiment** (id 25190, line 35664). Why: a gear piece that gives armour and a magic bonus, for the mage line. Keep: armour with a mage bonus. Change: our bonus type.
5. **Dragon scale mail** (id 2492, line 3966). Why: a named armour in the 15 band, between the gilded and the top plate. Keep: the scaled look as a tier cue. Change: our own shape and palette.

## 5. Zones / dungeons

- **Spawn blocks:** 362 blocks (`data/world/forgotten-spawn.xml`). Each block is a centre, a radius and a list of members (649 monster lines and 14 NPC lines). Radius 5 on 322 blocks, radius 1 on 35.
- **Floor bands by spawn centre** (the floor number is the game's `z`; the meaning of z=7 as ground and higher z as underground is the usual convention and was not checked against the map):
  - ground band, floors 2 to 7: 228 blocks (floor 7 alone: 138)
  - underground band, floors 8 to 15: 134 blocks
- **Respawn:** 60 seconds on 652 of the 662 spawn-time attributes. Spawn rate is set in config (`rateSpawn = 1`, config.lua.dist line 149).
- **Ground pack monsters** (the most common in the ground band): dragon, wolf, orc spearman, rabbit, orc berserker, elf scout.
- **Underground monsters** (the most common in the underground band): troll, swamp troll, rat, ghoul, rotworm, skeleton.
- **Hazards:** creature-cast field attacks (fire field 39 attack lines, poison field 15, energy field 5) and drown attacks (25 lines, plus 4 "choking fear drown" lines). Hazards are cast by creatures, not set in the terrain, in the data we read.
- **World type:** pvp (config.lua.dist line 3).
- **Houses:** `data/world/forgotten-house.xml` (12 KB) not opened.
- **Biome list:** not readable. The map is binary (`forgotten.otbm`, 3.4 MB, size only).
- **Walk density** (what appears every 20 seconds of walking): not computable from the files read. The donor gives 362 anchor points with radius 5 and a 60 second respawn; the map that would give walking distance is binary.

### Top 5 striking zone ideas
1. **Stacked floors** (underground band, 134 spawn blocks on floors 8 to 15). A single map with many floors, each with its own pack. Keep: floor-band spawns as zone data. Change: our zone names and their hazard tiles.
2. **Radius-5 pack ring** (322 blocks at radius 5). A small ring of spawn points that re-fills on a fixed respawn. Keep: small radius plus fixed respawn (row 23 model). Change: patrol paths in place of stand-still spawns.
3. **Creature-cast fields** (fire, poison, energy field attacks). Hazard that a creature leaves behind, not terrain. Keep: a short-lived field left by a creature. Change: a visible ground tell before it lands.
4. **Ground vs underground packs** (wolf and orc pack on the ground; troll and ghoul pack underground). A clear contrast in pack type by depth. Keep: depth sets the pack. Change: our pack set.
5. **PvP world as a flag** (`worldType = "pvp"`, config line 3). A world-level switch that changes the rules without changing the map. Keep: one switch. Change: our own rule set and its name.

## 6. Item / effect looks worth recreating (server hints only)

Effect names used by monster attacks: 102 distinct names across `areaEffect` and `shootEffect`.

- **Shared aura for two different tells:** `blueshimmer` is the most used area effect (511 lines). In `abyssador.xml` the same blue aura marks a self-heal (line 40), a second heal (line 43) and an invisibility window (line 46). Idea: give each defence its own aura and sound; a shared aura hides which tell is coming.
- **Other top area effects:** redshimmer (417), poff (145), mortarea (141), poison (136), firearea (127), energy (91), greenshimmer (80), smallclouds (69), greenspark (69). Ref: the data is spread across `data/monster/monsters/*.xml`, with `areaEffect` attributes.
- **Top shoot effects:** fire (152), poison (150), energy (96), sudden death (89), snowball (55).
- **Outfit transform:** the `outfit` defence and attack (feroxa_werewolf.xml line 39). Technique: a timed model swap mid-fight.
- **Status wobble:** the `drunk` attack (75 lines; the_scourge_of_oblivion.xml has one at radius 5 for 9 seconds). Technique: a timed screen or control disturbance; a client effect not read.
- **Speed tells:** `speed` attack and defence lines (210 lines), with a signed change. Technique: a slow or haste with a visible aura.
- **Idle barks:** `<voices interval chance>` in 651 files, for example golden_servant.xml line 47. Technique: a bark on a timer with a low chance, so idle creatures are never silent.
- **Glow and gold:** the item names carry "glowing" (48) and "crystal" (250), but there is no glow attribute in items.xml. The glow is a client job (not read).

## 7. Inspiration for Frankendom

Each is an original with a distinct silhouette and names. Shape and mood only.

1. **Ember Tyrant** (boss). A fire boss that calls a capped pool of four summons on a one-second roll and hastes itself for a few seconds before a charge. Keep: capped summon pool, self-haste telegraph. Change: silhouette, element name, and a sound before the haste. Ref: infernatil.xml.
2. **Veil Colossus** (boss). A giant with two short invisibility windows as its timing puzzle. Keep: invisibility windows as the tell. Change: its own shimmer and sound, and about five attacks instead of twelve. Ref: the_scourge_of_oblivion.xml.
3. **Gilded Sentinel** (idle creature). A gold-tinted construct that barks idle lines. Keep: barks on a timer with a low chance. Change: silhouette, palette, and our own barks. Ref: golden_servant.xml.
4. **Stacked Crypt** (zone). A dungeon of stacked floors, with pack sets by depth. Keep: floor-band spawns as zone data. Change: our zone names, hazard tiles, and pack types. Ref: forgotten-spawn.xml floors 8 to 15.
5. **Four-Element Blade** (weapon). One blade shape in four element skins with identical stats. Keep: one base, four elements. Change: element shown by glow and sound, not recolour. Ref: items.xml ids 7744 to 7777.
6. **Charged Mace** (weapon). A charged elemental weapon that decays into a dull base form when spent. Keep: charges and decay. Change: our names and wear states. Ref: items.xml id 7755.
7. **Paired-Resist Plate** (armour). Top-band armour with +8 absorb to one element and -8 to its opposite. Keep: the paired trade-off. Change: our element names and numbers. Ref: items.xml lines 35536 to 35541.
8. **Promoted Vocation** (class). A second rank that doubles the soul cap and the per-tick gains, with a visible change at promotion. Keep: the promotion doubles caps. Change: our names and the promotion visual. Ref: vocations.xml ids 1 to 8.

## Licence note
Code is GPL-2.0 (root LICENSE, the GNU GPL v2 text). The data files (data/ XML, Lua, OTBM) have no separate licence statement; the files do not say whether the root licence covers them, so they are treated as unclear (class C). Rights holder for the data is unknown from the files. Clean-room shape only: no file was copied, and the names above are our own. Not legal advice.

## Not read
- Client half: sprites, sounds, UI, and the client code that maps look IDs to pictures (none in this donor).
- Lua: 601 .lua files under data/ (names and one count only; `data/monster/lua/example.lua` is an example file).
- `data/world/forgotten.otbm` (binary map, size only), `data/world/forgotten-house.xml`, `data/items/items.otb` (binary).
- `data/events/events.xml` (40 event entries counted, not read).
- `src/` (C++ engine), `schema.sql`.
- Monster files beyond the ones named above; `fury_of_the_emperor.xml` and `scorn_of_the_emperor.xml` not opened.
- Set bonuses in items.xml (no set attribute in the top keys; not searched further).
- Silhouettes and sounds (no sprites or audio in this donor).
- Gaz boss receipt not in receipts.tsv: the apostrophe in its filename breaks verify_receipts.py. Checked by grep -n instead: `gaz'haragoth.xml` line 54 holds the Minion of Gaz'haragoth summon.
