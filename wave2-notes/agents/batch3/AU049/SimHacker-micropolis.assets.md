# SimHacker-micropolis (asset audit, cell AU049)

Donor: /mnt/frankendom-donors/SimHacker-micropolis (VPS). Open-source Micropolis (SimCity Classic lineage): a mono-repo of several ports (MicropolisCore C++/WASM, micropolis-java, micropolis-activity (Sugar), micropolis-graphics (Blender kit), laszlo, turbogears, wikimedia, aws).
Read: README.md (top), MicropolisPublicNameLicense.md (head), micropolis-java/COPYING (head), micropolis-activity/COPYING (head), micropolis-java/README (licence and copyright lines), MicropolisCore/documentation/credits.html (licence lines), micropolis-graphics/buildings_3d/standards.txt, a scripts/*.map head, string-table line counts, the file-extension census of the whole tree, sound and font folder listings.
Half read: data and assets across the ports (tile sheets, sounds, fonts, city files, string tables, 3D kit). Server half: not applicable (a single-player sim). Paired code halves are in the same box (MicropolisCore C++ and micropolis-java); code was not read beyond licence headers.
Note: the README's Assets link points to a wiki page (../wiki/Assets.md) that is not in this tree. It was not read.

## Licence (what the files say)
- Code licence: GNU GPL version 3. README.md line 3 says the source is "released under the GPL". micropolis-java/COPYING and micropolis-activity/COPYING both start "Version 3, 29 June 2007". MicropolisCore/documentation/credits.html repeats the GPL-3 grant text.
- Name licence (separate): MicropolisPublicNameLicense.md, "Version 1, October 1st, 2024", says the name "MICROPOLIS" is a registered trademark owned by and exclusively licensed to Micropolis GmbH. Its own text says the trademark is licensed to the authors and publishers of the game and source, and that use of the GPL'ed code under the name makes the user a downstream licensee of the trademark term. Name use is therefore a separate condition from the code licence.
- Copyright lines in the repo: micropolis-java/README line 8 "Copyright (C) 2013 Jason Long"; line 9 "Portions Copyright (C) 1989-2007 Electronic Arts Inc."; MicropolisCore/documentation/credits.html line 43 "Software and Manual Copyright (C) 2002 by Electronic Arts"; credits line 73 "No trademark or publicity rights are granted."
- Asset licence: no separate licence file for art, sounds, fonts or city data was found. The asset folders (micropolis-activity/images, MicropolisCore/res, micropolis-graphics, micropolis-java/resources and graphics, micropolis-activity/res) contain no LICENSE, COPYING, NOTICE or CREDIT file. The GPL and Electronic Arts copyright lines name the software and manual, not the art or sounds by name. The file does not say whether the GPL covers the art. Per the ambiguity rule this is class C.
- Font folder micropolis-activity/res/dejavu-lgc (21 .ttf): no licence file in the folder. The font family name is DejaVu LGC. Licence not stated in the repo.

## Rights-holder status (repo files only)
"original company release with community ports": the credits and README name Maxis, Will Wright (credits line 16 "Will Wright (Maxis Software)"), Electronic Arts copyright lines (1989-2007 and 2002), and community ports (micropolis-java copyright 2013 Jason Long). The trademark is held by Micropolis GmbH per the name licence. The repo does not say which lines of art are EA-owned.

## Asset inventory (paths under the donor root; counts from find/ls)
1. Tile and object sprite sheets: micropolis-activity/images, 341 files (xpm; 158 named "tiles-N", 61 named "obj..."), plus gr, tilessm, tilesbw, stadium, seaport, sctkyo and similar. Pixel size and palette not read. Class C.
2. Numbered resource files in MicropolisCore/res: "hexa.NNN" (11 files), "snro.NNN" (8) and "stri.NNN" (4), plus a sounds/ folder and Tcl UI scripts (buildidx.tcl, menu.tcl and others). Format not read beyond names. Class C.
3. Building 3D kit: micropolis-graphics/buildings_3d, 32 building folders (church, coal, com01, com02, com03, com05, com06, com11, firestation, hospital, house01-house13, ind01, ind02, police, res05, res06, res09, res2, res3, res4) with 94 PNG and 32 .blend files in the kit folder. Several buildings have separate PNG parts (for example bldg, roof, turf, sign, shed, west_bldg, east_bldg). standards.txt is the Blender scene configuration. scripts/ has 6 .map crop-and-grid files, bend.pl, render_all.pl and render.sh. Class C.
4. Micropolis-java graphics: micropolis-java/graphics (for example seaport_3x3.png, seaport.png, stadium2.png) and micropolis-java/resources (seaport.png, stadium.png, airport.png). PNG, not opened. Class C.
5. Sounds: MicropolisCore/res/sounds (49 .wav), micropolis-activity/res/sounds (49 .wav), micropolis-java/resources/sounds (14 files: .wav with names such as monster, siren, explosion-high, explosion-low, zombie-roar-5, honkhonk-low, heavytraffic). Class C.
6. Fonts: micropolis-activity/res/dejavu-lgc (DejaVu LGC .ttf files; 21 .ttf in the whole tree). Class C (no licence file in folder).
7. City files: 72 .cty files across the tree, for example MicropolisCore/src/cities/bruce.cty and kowloon.cty. Binary city saves, not opened. Class C. The six .map files in micropolis-graphics/buildings_3d/scripts are crop maps for the kit (see 3).
8. String tables (text): micropolis-java/strings, 12 .properties files in en, de and sv variants: GuiStrings, StatusMessages, CityMessages, CityStrings. 1172 lines in total across the 12 files. CityMessages.properties has 108 lines containing "=". Class C.
9. Documentation: 311 HTML files including MicropolisCore/src/html (doxygen-style source pages) and the manual credits pages. Class C for re-use of text; code docs are GPL code.
10. Other media not opened: 74 jpg, 17 tiff, 14 gif, 11 mp3, 32 .blend (in buildings_3d), 21 .ttf (see 6), 6 .map (see 7).

## Classes per group
- Code (C++, Java, Python, Tcl): GPL-3 (stated). Not an asset group.
- Art sheets, PNG building parts, Blender kit, xpm sprites: C (no asset licence stated; GPL scope over art not stated).
- Sounds: C (same reason; no licence file).
- Fonts: C (no licence file in the folder).
- City files and string tables: C.
- Trademark on the name MICROPOLIS: a separate name licence (Micropolis GmbH); any use of the name is a separate condition, not an asset class.
- Nothing is class A (public domain or CC0 stated) or class B (share-alike stated for assets). The GPL text may affect the art, but the files do not say so for art, so the ambiguity rule applies.

## Inspiration (own words, category level; no copied text)
- Tile sheets by numbered index with a few families (terrain tiles, object tiles, big stadium and seaport sprites). The sheet is the data: an index picks the cell. Refs: micropolis-activity/images (tiles-N.xpm family, obj3-N.xpm family).
- One fixed render rig for a whole building kit: an orthographic camera at a fixed angle and a two-light setup (a hemisphere fill and a sun), with a set resolution and a stated scale. Every building in the set reads from the same angle. Ref: micropolis-graphics/buildings_3d/standards.txt lines 1-25. Matches our rule that the camera and light are client-only and shared.
- Several buildings are split into separate render parts (main body, roof, turf, sign, shed, east and west faces). A sign or roof can be swapped without a new model. Refs: micropolis-graphics/buildings_3d/com01/bldg.png, roof.png, turf.png, sign.png; buildings_3d/res06/east_bldg.png and west_bldg.png.
- Footprint-size classes (1x1, 3x3, 4x4) each with a 16 and a 32 pixel tile variant, shown in the crop-map file names. The footprint and tile size are part of the name of each render script. Ref: micropolis-graphics/buildings_3d/scripts/1x1_32x32.map, 3x3_16x16.map, 4x4_32x32.map.
- A text map from source crop boxes to atlas cells, so a render pass can be cut into a tile atlas with one script. Ref: micropolis-graphics/buildings_3d/scripts/3x3_32x32.map line 1 onward.
- Sound cues as short verb or event names for build and demolish actions, plus a disaster cue set (monster, explosion high and low, siren, zombie roar). Names only from the folder listing; content not listened to. Refs: MicropolisCore/res/sounds/build.wav, bulldozer.wav; micropolis-java/resources/sounds/monster.wav, zombie-roar-5.wav, siren.wav.
- Advisor messages keyed by need (for example a residential-need key, a commercial-need key) with one line per key: a readable warning table. Ref: micropolis-java/strings/CityMessages.properties line 9 onward.
- Pre-built city scenarios as data files (72 .cty), so a level is a saved file. Ref: MicropolisCore/src/cities/ (names only).

## Inspiration briefs (recreate as clearly distinct originals; never a copy)
Looks of the buildings were NOT read (PNG and blend; not opened).
1. Harbour yard (label: "Quay compound"). why it works: a waterside building with a 3x3 footprint reads as a different zone at a glance. keep: a 3x3 footprint; a waterside siting; a crane-like silhouette. change: a stone quay with a painted gate instead of a plain yard, a lantern line on the quay edge, and a different roof form. Ref: /mnt/frankendom-donors/SimHacker-micropolis/micropolis-java/graphics/seaport_3x3.png (look not read).
2. Stadium bowl (label: "Arena ring"). why: a round bowl is a readable landmark silhouette at 375 wide. keep: a large round landmark; a single entrance. change: a ring of banners and a torch row instead of stands, a different roof profile. Ref: /mnt/frankendom-donors/SimHacker-micropolis/micropolis-java/graphics/stadium2.png (look not read).
3. Monster roar (label: "Hill giant roar"). why: a single signature roar plus an explosion pair makes a disaster readable by ear. keep: one roar cue and two explosion levels for near and far. change: a deep chant instead of a roar, a rumbling ground cue in place of the siren, different pitch. Ref: /mnt/frankendom-donors/SimHacker-micropolis/micropolis-java/resources/sounds/monster.wav (content not listened to).
4. Build-and-clear cue pair (label: "Raise and clear sounds"). why: the build and the clear actions each have a named cue, so a player hears the change. keep: one cue per build action and one per clear action. change: our own foley, a pitch lift on build and a dust hiss on clear. Ref: /mnt/frankendom-donors/SimHacker-micropolis/MicropolisCore/res/sounds/build.wav and bulldozer.wav (content not listened to).
5. Fixed-rig building kit (label: "Locked-camera item set"). why: one camera and one light rig makes every item in a set look like one artist made it. keep: a fixed camera angle, a set output size, a two-light rig. change: our fight camera's three-quarter angle, a rim light from the fight camera, and a different output size. Ref: /mnt/frankendom-donors/SimHacker-micropolis/micropolis-graphics/buildings_3d/standards.txt lines 1-25.

## Cross-link
- hud-ui: advisor messages keyed by need (CityMessages.properties) and the status message file (StatusMessages.properties) show a short-message table with translations.
- sound-music: the disaster set and the build and clear cue names are the sound vocabulary; no music or biome beds read.
- spawns and encounters: the disaster set (monster, explosion, siren) is an event-cue set, not spawn data.
- loot and progression: none in this donor.
- camera: the fixed-rig standards file is the closest match to our fight-camera ruling (camera is client-only).

## Not read
- The wiki Assets page (not in the tree).
- Any PNG, xpm, blend, wav, mp3, ttf, jpg, tiff or gif contents (names and counts only).
- City .cty files (names and counts only).
- The 12 string tables beyond one count and one key line.
- MicropolisCore C++ and micropolis-java code (only licence headers read).
- laszlo notices.xml and the turbogears, aws and wikimedia folders.
- The DejaVu font licence (no file found in the folder).
