# veloren-veloren (asset audit, AU055)

Donor: Veloren, an open-source voxel MMO (Rust). Halves: the DATA PACK (assets/) read in part; the CLIENT (voxygen/) and COMMON code read only for the music and creature-idle mechanisms. The SERVER half (server/, server-cli/) is in the same repo and was not read beyond its folder list (server/manifests has 3 files).

## Licences (as the files say)
- Code: GPL-3.0. LICENSE line 1 "GNU GENERAL PUBLIC LICENSE", line 2 "Version 3, 29 June 2007". README.md line 100: "Since it is a community project, we decided to license it under the".
- Assets: per entry in assets/credits.ron. The file says (line 22) a licence "can be omitted, but assumed to be GPL3 if not provided".
- Music (credits.ron 36-180, 8 entries): all CC-BY-NC-SA 4.0. All 8 carry an "Added restrictions" note, e.g. "Should not be used in other games than Veloren unless it is parody." (line 51). Class C: the CC licence and the note are both on the file and are not resolved by the file.
- Sounds (181-515, 18 entries): 2 CC BY 4.0 (lines 234, 438); 16 with no licence field, so GPL3 by the file's rule.
- Fonts (516-607, 12 entries): OFL 3, CC BY-SA 3.0 4, CC BY 4.0 2, Apache 2.0 1, MIT 1, GPL2 1 (lines 522-603 and others).
- Models (608-635, 3 entries): CC-BY-NC-SA 4.0 (vroom.vox at line 612, ingots, wood log recolouring).
- Uncredited assets: most of ~4,750 .vox models, PNGs, RON data and .ftl localisation: no licence stated in the files read.

## Rights-holder status
Community project (README line 100). No company named. Authors per asset in credits.ron; a TODO (line 16) notes the file does not separate original from derivative authors.

## Asset inventory
- Music: assets/voxygen/audio/soundtrack/ (cave, combat, dungeon, overworld, town), 83 files. Class C.
- SFX: assets/voxygen/audio/sfx/ and sfx.ron; about 639 .ogg repo-wide. Class C (GPL3-default entries); A for the 2 CC BY 4.0 entries with attribution.
- Ambience: assets/voxygen/audio/ambience/ (cave, leaves, rain, river_loud, river_quiet, thunder, wind). Class C.
- Fonts: assets/voxygen/font/, 13 .ttf files. Class B (OFL, CC BY-SA 3.0), A (CC BY 4.0, Apache, MIT with notice), C (GPL2).
- Voxel models: assets/voxygen/voxel/ and armour, figure, glider folders; about 4,752 .vox repo-wide. Class C.
- Body-plan manifests: 50 *_manifest.ron in assets/voxygen/voxel. Class C.
- Item, loot, entity, ability and skill data: assets/common/ (items 1,312; loot_tables 245; entity 302; abilities 612; loadout 90; skill_trees 3; crafting 2; economy 1). Class C.
- Localisation: assets/voxygen/i18n/, 43 language folders plus README; en has 12 .ftl files. Class C.
- World: assets/world/ (map, module, structure, tree, shrub, wildlife, style, manifests) and .bin world maps. Class D (binary, not opened).
- Shaders: assets/voxygen/shaders, 48 files. Class C.
- Attribution register: assets/credits.ron (678 lines). Class A as a process template.

## Best class: C overall. B for OFL and CC BY-SA fonts; A for CC BY 4.0 and MIT or Apache items with notice.

## Inspiration
- Large winged idle: a head glance on a half-second clock, a slow breath bob, and a pitched chest in the wyvern branch (voxygen/anim/src/bird_large/idle.rs lines 27, 38, 66).
- Creatures as parts with central and lateral manifests; a wing as three segments (bird_large_lateral_manifest.ron line 425).
- Combat music from a crowd-weighted sum: hostiles in a radius add ceil(max HP / factor); a dead player forces explore (voxygen/src/audio/music.rs lines 264-285). Maps to our many-on-one threat budget.
- Asymmetric crossfades and an interrupt delay (music_transition_manifest.ron lines 13 and 16). Good for stingers and biome beds.
- Talent prerequisites as Any-of and All-of rows in one file (skill_prerequisites.ron lines 2 and 4).
- Material bundles as All-of min and max counts per creature (frostwyvern loot table line 7).
- A credits register with a stated default rule; a template for our asset provenance.
- Fluent plural selectors for HUD text with numbers.

## Briefs (4)
1. Pitched-chest winged wyrm: keep forward chest, stepped head glance, three-segment wing; change wing count and shape, palette, head ornament.
2. Crowd-weighted combat bed: keep radius gate, weight by max HP, interrupt delay, fast-in slow-out fades; change weight to our hate list and MAX_ATTACKERS, thresholds per zone, boss stinger on top.
3. Branching blade talent line: keep Any-of forks and All-of capstones in data; change node names, depth, costs, and fork placement.
4. Material bundle drop: keep one bundle per creature with count ranges; change materials, add a rare tier roll.

Dom's rule: all four are recreated as clearly distinct originals. Kept: the mechanisms. Changed: names, shapes, palettes, weights. The GPL code is shape only; no code is copied.

## Cross-links
- sound-music: music_transition_manifest.ron, voxygen/src/audio/music.rs, ambience folder.
- spawns and encounters: the threat sum is an encounter-density signal.
- progression: skill_prerequisites.ron.
- loot: frostwyvern loot table.
- hud-ui: voxygen/element folders (animation, de_buffs, items, skills, ui, weapons), not opened.

## Not read
See veloren-veloren.assets.json, not_read array (binary models, PNG, OGG content, world .bin, shaders, most data and i18n files, server half, fonts).
