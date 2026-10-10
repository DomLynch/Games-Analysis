# esponges-daoc-web (design catalogue, DC023)

Donor: /mnt/frankendom-donors/esponges-daoc-web
Licence: code MIT (repo LICENSE; README "Licensing"). Game assets are named in the README as copyright of the original publishers; no game data is in the repo. Asset class C (see the AU019 audit): inspiration is CATEGORY-LEVEL only. Not legal advice.
Dom's rule for every idea below: recreate as a clearly distinct original, never a copy, about 20-30 percent resemblance in mood only.

## Which half was read
- Client half: READ. web/combat.js (most of it), web/npc.js (spawn and respawn, lines 95-181), web/viewer.js (lines 73-74 and 630-660, plus the target-ring colour at 1086), web/props.js (shader lines 31-78, by grep), web/particles.js (by grep), web/grass.js (line 19), web/spawns/zone100.json (whole file, header comment cut at about 400 bytes). Not read: web/sky.js, web/lighting.js, web/character.js, web/animator.js bodies (names only).
- README.md: read at the intro, pipeline, census, sky, grass, water, scenery, particles, characters, held items, animation, NPCs, combat and licence sections. Not read: the Known limitations section (line 1141 on), most of the file-format and tooling sections, Go sources under cmd/ and internal/ (names only), web/index.html, the test files.
- Server half: none in the repo. README line 1228: "Nothing here touches the live game servers or its network protocol."
- Data pack: NOT IN THE BOX. The install folders (zones/, figures/, anims/, items/, gamedata.mpk and the csv tables) are not on the VPS; the listing of all 82 files was read. The data tables (monsters.csv, monnifs.csv, anims.csv, animnifs.csv, skins.csv, items.csv, pskins.csv) are described in the README only and were not opened.
- Paired donor in the box: none.

## 1. Creatures / beasts
Families in the box: four creature kinds, all from the hand-written spawn file (web/spawns/zone100.json). Nineteen placed individuals in one zone: 3 large pack hunters, 4 small pack hunters, 3 burrowing mammals, 9 village folk (two groups: 6 and 3).
Install totals (census, not in the box, from docs/census/README.md): 633 figure models, 632 read; 4032 animation files, 4027 read. Creature rows in monsters.csv were not counted.
Escalation with level: none. The viewer has no levels. Its header comment says each side has hit points, a damage range, a swing time and a hit chance, and "no levels" (web/combat.js header comment, lines 1-12). Difference between kinds is per spawn group only.
Signature abilities (one line each):
- Pack assist: hitting one hunter pulls packmates of the same spawn group within a set distance (web/combat.js:158, ASSIST at line 38).
- Aggro radius: only large hunters attack unprovoked (spawns line 6, aggro 400; check at web/combat.js:259).
- Leash: a chaser that goes too far from home walks back and heals (web/combat.js:264, LEASH at line 34).
- Corpse then return: corpse lies for a set time, then vanishes, then respawns at home after a second timer (web/combat.js:30-31, 251-254).
- Fight-back-only folk: villagers have no aggro field, so they fight only when struck.
Boss or elite pattern: none in the box.

Top creatures (only four kinds exist in the box, so the top list is four, not eight):
1. Large pack hunter. Why striking: one hit becomes a group fight, and the aggro radius lets a player feel the pull from a distance. Readable at 375 wide if the group moves as one. Keep: group-scoped assist and leash-home with heal. Change: our own silhouette and species, assist radius set as zone data, a pack cue sound of our own. Ref: web/combat.js:158, web/combat.js:264, web/spawns/zone100.json:5-6.
2. Small pack hunter. Why: a lighter pack member that never starts a fight but joins when a packmate is hit. Keep: pack join. Change: make it skittish (flee at low health) rather than a second fighter. Ref: web/spawns/zone100.json:7-8.
3. Burrowing mammal. Why: low profile that stays readable on the ground. The README records that its "back" clip column was its forward walk, so the converter skips such a column. Lesson: check table columns against the clip before using them. Keep: low silhouette and idle range. Change: species, gait and sound. Ref: web/spawns/zone100.json:9-10; README.md "Stepping back and sideways" section (line 1098).
4. Village folk. Why: townsfolk that become fighters only when struck, nine of them in two groups. Keep: fight-back-only rule. Change: our townsfolk and their idle habits. Ref: web/spawns/zone100.json:11-13; web/combat.js:259.

## 2. Classes / races / factions
- Classes: none. The viewer has no class system (the word "class" only appears as JavaScript class names: Animator, Skeleton, Clip). Progression is not a feature.
- Races in the box: two playable models with outfits (README "Characters" table: three outfits, norseman, troll-plate, troll-warrior). Race scale is a table column (README "NPCs" section, line 955; the table is not in the box). The troll draws larger than the norseman, which is a silhouette lever.
- Factions: three faction-coded armour skin prefixes, decided by the realm code in the file name (README line 728). Category-level: "a faction-coded armour family".
- Progression shape: none (no XP or levels). Armour tiers are visual only.

## 3. Weapons
Families in the box: one one-handed hammer, bare hands, and a shield family (README: seven shield models in one faction set). Special properties: none elemental, no set bonus.
Mechanics (web/viewer.js:641-642): a hammer hits harder and swings slower than bare hands; a shield blocks a fraction of blows that come from the front arc (web/combat.js:131). Numbers here are project numbers, not the game's (viewer.js comment, line 637).
Visual tiers: none in the box. Held items carry four attachment markers (HELD, BELT, BACK, GROUND), so one model can be worn in four states (README "Held items").

Top weapon ideas (only three exist in the box):
1. Hammer strike window: the strike lands in the middle tenth of the swing, the hand travels about 72 units from the shoulder to out front, and the swing ends where the stance begins so they blend (README "Combat", line 1048). Keep: strike mid-swing and the blend. Change: our weapon arc and timing.
2. Front-arc shield block with its own block clip, played on the upper body while the legs keep moving (web/combat.js:131-133; README "Layers").
3. One model, four worn states, from attachment markers (README "Held items"). Keep: markers on the item. Change: our attachment names.

## 4. Armour / gear
Sets in the box: three named outfits (README "Characters"). Tier ladders per slot: body 1-5, legs 1-4, boots 1-5, gloves 1-3, ten heads. The README says the tier number gives the silhouette and the material texture gives the look, and they must be picked together (README "Characters", line 711).
Material categories (README line 803): cloth, leather, studded, scale, chain, plate. 162 plate and 111 chain textures across the skin archives.
How the game shows tiers: outline (shape) changes with tier; material changes the texture. No metallic, gold or glow shader was found in web/ (grep for metal, specular, gold, shine, no hits). So metal and gold looks are NOT in this donor.

Top gear ideas (lessons, because only these are real in the box):
1. Tier ladder with changing outline: the heavy tier changes the outline, not only the shade (README line 711-714).
2. Shape and material chosen as a pair. The README's own example is plate boots painted like cloth (README line 711-714).
3. Coverage check: an omitted body slot left a hole through the midriff (README lines 763-764). Keep: a coverage check per slot.
4. Runtime emblem over a base material: the shield's pattern and emblem are composited at runtime over the material (README line 756). Change: our own emblem system.
5. Alpha trap: the face texture's alpha channel is used for something else, so reading it as opacity erases the face (README line 806). Lesson: check what an alpha channel means before using it.

## 5. Zones / dungeons
Counts (census, docs/census/README.md "Zones", line 148-152): zones.dat declares 486 zones. Outdoor 172 (120 present), city 4 (4 present), dungeon 291 (278 present), other 19 (17 present). Only one zone is converted and playable (README intro).
Biomes (from the grass table, README line 418): meadow, brown scrub, tall grass with flowers, waterside plants, reeds, rocks, ferns, pine saplings, snow in parts of the map, lake shore, a village square.
Dungeon archetypes: dungeon piece models (rooms and corridors): 1386 declared, 1381 read (census). None in the converted zone.
Hazards: none that damage. Lake water is avoided by spawning (web/npc.js pickSpot checks isWet). Leash bounds chasing.

Top zone ideas:
1. Waterside plant group that only grows on the shore (README "Grass" section, line 430-432; web/grass.js:19 range).
2. Density map that keeps plants off snow and roads, separate from the plant table (README line 430).
3. Tree clusters: one placement is a small group of trees copied to offsets (README line 621-622; zones/trees/tree_clusters.mpk, not in box).
4. Dusk canopy: a sky gradient from zenith to horizon with flat cloud decks pressed toward the horizon (README "Sky", lines 386-412).
5. Dungeon piece library: a large set of room and corridor pieces (census counts above).

## 6. Item and effect looks worth recreating
- Flame card: crossed flat cards with an additive halo; the flame texture scrolls on the clock and each copy starts at its own phase (web/props.js:78 `vUV = aUV + uScroll * fract(uTime * 0.1 + phase) * 10.0;`; README "Scenery", lines 647-669).
- Breathing glow: a glow billboard's scale keys pulse on a 1-second loop, clamped to loop not play once (web/props.js:69 `pulse(fract(uTime + phase))`).
- Slot particles: a fixed set of slots reborn on a clock with a hash, so the vertex shader places every particle with no simulation (web/particles.js:74-75 `float slots = ceil(uRate * maxLife);`).
- Smoke for the screen: the file's smoke alpha is so faint it is invisible, so the viewer draws blended smoke at eight times its opacity (web/particles.js:151 `const SMOKE_OPACITY = Number(new URLSearchParams`; README line 696).
- Glows drawn after solids, depth-tested but not written (README line 647 onward).
- Grass: plants per cell from a cell-seeded generator, alpha-to-coverage edges, tip sway, fade over the last part of the draw range (web/grass.js:19; README "Grass").
- Threat-coloured target ring: gold when selected, red while in a fight (web/viewer.js:1086). Readable at 375 wide because colour carries the state.

## 7. Inspiration for Frankendom (originals; never copies)
1. Ember camp. Crossed additive flame cards with a clock scroll and a per-copy phase so a row of braziers never flickers in step. Keep: crossed additive cards, clock scroll, phase per copy. Change: ember palette, split-tongue silhouette. (Scenery; no parity row.)
2. Pack pull. A pack hunter group where one hit assists the same group inside a set distance, and a chaser returns home and heals past a leash. Keep: group-scoped assist and leash. Change: assist radius as zone data, our own pack cue. (Parity row 4: aggro, chase, leash; row 23 spawn groups.)
3. Corpse then return. A staged timer: body lies, vanishes, then the spawn returns at home after a second timer. Keep: two timers. Change: the second timer becomes a grace period that ties to the zone despawn rule. (Parity row 17 death and respawn; row 23.)
4. Facing shield. A block that only works against blows from the front arc, on the upper body only, so the legs keep moving. Keep: front-arc gate and upper-body layer. Change: a stamina cost instead of a flat chance. (Parity row 3 guard and stamina; row 6 hero actor.)
5. Tiered silhouette armour. Five body tiers whose outline changes, with a per-slot coverage check. Keep: shape and material chosen together. Change: our tier names, our outlines. (Parity row 15 gear dressing.)
6. Density-steered scatter. A biome table of plant families and a density map that keeps plants off snow and roads, cell-seeded so the same cell always gives the same plants. Keep: density map and seeded cells. Change: our wetness rule. (Zone population and props; no parity row yet.)
7. Authored-for-screen smoke. Write alpha for the screen, not for the data. Keep: the boost idea. Change: our particle set. (Parity row 16 colour grade and quality.)
8. Threat ring. A target ring whose colour says selected or in a fight, readable at 375 wide. Keep: colour carries state. Change: our palette and ring shape. (Parity row 14 HUD.)

licence_note: MIT code; game assets are copyright per README and not in the repo; spawn file is repo MIT with project-authored placements. Class C: category-level inspiration only.
Counts and receipts: see receipts.tsv in this folder.
