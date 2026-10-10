# Warzone2100-warzone2100 (asset audit, AU056)

Donor: /mnt/frankendom-donors/Warzone2100-warzone2100/ (VPS only). Receipts: receipts.tsv in this folder. Machine-readable copy: Warzone2100-warzone2100.assets.json.

## Halves
- Both halves are in one repo. Client and server source (src/, lib/, 3rdparty/) was read only for licence headers.
- Data pack (data/) was read: stats JSON, audio event table, PIE model headers and names, multiplayer maps, licence files, .gitmodules.
- Several data folders are empty submodules in this snapshot: data/base/texpages, data/music, data/fonts, data/terrain_overrides/*, data/mods/campaign/* (.gitmodules lines 19 to 67).

## Licence (as the files say)
- Code and default data: GPL-2.0-or-later. README.md line 300; COPYING.README line 14 says included source and data are GPL version 2 or later, and line 15 says the music and video are not included.
- Exceptions by file: COPYING.NONGPL lists CC0, CC BY-SA 3.0, CC BY 4.0, MIT, BSD, Boost, MPL 2.0, ISC and OFL items. Attribution lines are in that file.
- Name and logos: COPYING.README line 43 grants permission to use the name "Warzone 2100", logos, stories and texts.

## Rights holder
- Released source by Eidos with Pumpkin Studios (README.md lines 34 and 37). Community-maintained (README.md line 38 onward). Individual artists credited per file in COPYING.NONGPL. Remaining art, audio and music rights are not stated beyond the GPL default and the per-file list.

## Asset inventory (data half)
| Group | Where | Count | Class |
|---|---|---|---|
| PIE 3D models (text meshes) | data/base/structs 164; components bodies 35, weapons 141, prop 71; effects 130; features 104; data/mp components and effects | 873 .pie | B |
| PNG images and icons | data/base/images (flags 38; frontend and intfac icons; replay icons; notifications 5; campaign banner) | 791 PNG in data/ | A for MIT and CC BY 4.0 items; B otherwise |
| Texture atlases | data/base/texpages (empty submodule) | 0 | D in box |
| OGG audio | data/base/audio (sfx weapons 29, tutorial 80, extra 56, memressp voice sets, countdown 29, vtoltalk 18, taunts, proxmessages) | 548 OGG | B |
| Music and video | data/music (empty submodule); not included per COPYING.README line 15 | 0 | D |
| Stats JSON | data/base/stats (18 files: weapons 109 entries, body 36, structure 131, templates 168, research 413, weaponmodifier, terraintable, propulsion, audio, etc.) | 428 JSON in data/ | B |
| MP maps | data/mp/multiplay/maps (54 .gam descriptors; DustyMaze folders CC0; 7c-Thales CC BY-SA) | 115 entries | A (CC0) / B |
| Campaign data | data/base/campaigns (alpha, beta, gamma JSON); data/mods/campaign (submodule dirs) | 3 JSON | B |
| Game scripts | data/base/script (78 .js); 243 .js in data/ | 243 | B |
| Fonts | data/fonts (empty submodule; CJK font is OFL 1.1 per COPYING.NONGPL line 58) | 0 | D in box |
| Shaders | data/base/shaders (fsr1 and smaa files MIT per COPYING.NONGPL; present, 8 files checked; rest GPL) | about 30 | A (MIT) / B |

Checks: the eight wheel models in COPYING.NONGPL lines 48 to 55 are six at the listed path and two (prsrwhl1, prslwhl1) only under data/mp/components/prop/. The listed texture atlases (backdrops, sky, rockies, droid weapons) are not in the box.

## Inspiration (category level where it counts)
- Weapon effect against movement class is one table with a percentage per propulsion class; some rows are flat on purpose (data/base/stats/weaponmodifier.json lines 11, 38). Recreate as a damage-type by armour-class grid.
- Surface speed is a table per terrain type with a speed factor per locomotion class (data/base/stats/terraintable.json lines 4, 5). Recreate as a biome-by-locomotion table.
- Sound events are rows with file, loop, range in world units (128 equals one tile) and volume 0 to 100 (data/base/audio/audio.json line 3). Recreate combat cues with distance falloff (row 12).
- Blood, dust, explosion and smoke are small models in the same text format as units (data/base/effects/fxblood.pie and siblings; names only, not opened). Recreate as short-lived 2D particle sprites (row 8).
- Units are assembled from body, locomotion and weapon parts (data/base/components/bodies, prop, weapons). Recreate hero gear as layered parts (row 15).
- Structures share one texture page per model (data/base/structs/miuptrim.pie line 3). Recreate as a shared prop atlas per zone.

## Briefs (recreate as clearly distinct originals, never a copy)
1. **Duel grid of damage types**. Keep: damage type rows, class columns, percentage cells, one flat special row. Change: our armour and creature classes, our names, a colour grid readable at 375 wide. Ref: data/base/stats/weaponmodifier.json lines 11, 38.
2. **Ground speed card**. Keep: surface type with speed per locomotion. Change: our biome tags; swimmers gain on bog and water, not on ice. Ref: data/base/stats/terraintable.json lines 4, 5.
3. **Blood as a small effect**. Keep: short-lived effect in the same pipeline. Change: 2D droplet fan in our palette, coloured by wound level. Ref: data/base/effects/fxblood.pie (name only).
4. **Three-part hero build**. Keep: body, locomotion and weapon parts swapped. Change: armour plates, cape and weapon as layers on one rig. Ref: data/base/components/bodies and weapons (directories).
5. **Range-scaled combat cue**. Keep: event rows with file, loop, range, volume. Change: our three-layer hit cue in arena units with a kill stinger. Ref: data/base/audio/audio.json line 3.

## Cross-link
- vfx: effect models (blood, dust) named; not opened.
- zones: terrain speed table; MP map descriptors.
- sound: audio.json rows, sfx folders, proxmessages folder (not read).
- hud-ui: frontend and intfac icons (MIT and CC BY 4.0).
- spawns, loot: stats tables exist; not read.

## Not verified
- Source code (licence headers only).
- Most PIE bodies, all JS scripts, campaign JSON, map descriptors beyond the list, shader source, music and video (not in box).
- The two wheel models present only under data/mp, and the CC BY-SA texture atlases (absent).
