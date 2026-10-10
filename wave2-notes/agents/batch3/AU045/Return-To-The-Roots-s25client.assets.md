# Return-To-The-Roots-s25client (asset audit, AU045)

Donor: /mnt/frankendom-donors/Return-To-The-Roots-s25client (VPS, read-only). Receipts: receipts.tsv (verified, 16 rows for this donor).

Code licence: GPL-2.0-or-later. README.md line 4 gives the SPDX line; LICENSE is the GPL v2 text (line 2 "Version 2, June 1991"); LICENSES/ holds the GPL-2.0-or-later and GPL-3.0-or-later texts.
Asset licence (per .reuse/dep5, file statement only):
- data/RTTR/assets/* GPL-2.0-or-later (dep5 line 12)
- data/RTTR/texte/* GPL-2.0-or-later (dep5 line 16)
- data/RTTR/MUSIC/S2_Standard.pll GPL-2.0-or-later (dep5 line 20)
- data/RTTR/MUSIC/SNG/* CC0-1.0 (dep5 line 24)
The original Settlers II Gold graphics and data are not in the repo. README line 14 says the user must supply them.

Rights-holder status: fan project (README line 9, "aims to renew the original The Settlers 2"). Copyright lines name Settlers Freaks. The original game's owner is not named in the files read. README line 13 says the graphics and sounds stay original, which conflicts with dep5 listing data/RTTR/assets/* as GPL. Origin of the S2-named sprite files is unclear.

Best class: A, for the 14 CC0 SNG music tracks only. Everything else is B, C or D as listed below.

## Halves read
- Client and server: one s25client binary. libs/s25client and libs/s25main were listed, not opened. No separate server half in the box.
- Data pack: data/RTTR (gamedata, campaigns, texte, assets, MUSIC) read in part. The paired original S2 DATA and GFX folders are absent from the repo, so the data half cannot be read in full.
- external/libsiedler2 is the reader library for the original S2 format. Listed only.

## Asset groups
- CC0 music: data/RTTR/MUSIC/SNG/ (SNG_0001.OGG to SNG_0014.OGG, about 14 MB total). Class A (dep5 only; OGG files not opened).
- GPL playlist: data/RTTR/MUSIC/S2_Standard.pll. Class B.
- Bitmap and UI art: data/RTTR/assets/base/ (66 .bmp in data/RTTR/assets; logo.bmp, menu.bmp, splash.bmp, credits/ 5 bmp, fireworks/ 32 bmp, io_new/, map_new/). Class C because of the README-vs-dep5 conflict.
- Sprite families: data/RTTR/assets/nations/Babylonians/ (bab_z.lst, wbab_z.lst, bab_icon.lst, charburner.lst, jobs.bob), addons/0x00000006, 0x01000000, 0x01000001, overrides/ (LST files named like original S2 files, for example MAP_0_Z.LST and ROM_ICON.LST). Class C.
- Terrain and biome tables (DATA TABLE): data/RTTR/gamedata/world/ (default.lua 7 lines; greenland.lua 385; wasteland.lua 377; winterworld.lua 367). Class B by the GPL SPDX header. greenland.lua line 5 (texFile = "<RTTR_GAME>/GFX/TEXTURES/TEX5.LBM") and line 11 (mapGfx = "<RTTR_GAME>/DATA/MAP_0_Z.LST") point at original-game files, so the look needs the user's S2 install. Class D for those external files.
- Mission scripts (DATA TABLE): campaigns/roman/ (11 files, MISS200 to MISS209) and campaigns/world/ (10 files incl. campaign.lua). Class B only on the repo GPL reading: no per-folder licence and no SPDX line seen in the MISS200 header. MISS200 line 2 says it is mission 1 of the original Roman campaign.
- In-game text: data/RTTR/texte/ (8 files; root readme.txt 383 lines; de, fr, pl subfolders). Class B (dep5 line 16).
- Sound table: data/RTTR/sound.scs (GPL SPDX on line 3). Class B, technical only.
- Maps: data/RTTR/MAPS/ is empty (0 files). The original map files are needed from the user's install.

## Inspiration (own words)
- Biome as data: each biome names its terrain types (gl_snow, gl_mountain, gl_desert, gl_meadow, gl_water at greenland.lua lines 46-74) and points at one atlas. Recreate a zone as a named terrain set on one atlas, with our own palette.
- Upgrade as a second strip: normal and upgraded road are two rows of one texture (greenland.lua lines 24 and 29). Recreate an upgrade cue as a second strip, no new file.
- Colour-keyed burst: fireworks/ holds 32 bmp files named by player slot (10.player.bmp and up). Recreate a win burst in the winner's colour, drawn with our own particles.
- Missions as data: a Lua mission file with a version gate and a TODO header (MISS200). Recreate a mission as a data file with a version check.
- Faction as a sprite family: a nation folder holds its own map, icon and job sprites. Recreate the faction identity with our own silhouette set.

## Briefs (5b; Dom's rule: recreate as a clearly distinct original, never a copy)
In Return-To-The-Roots-s25client.assets.json under "briefs" (4): colour-keyed victory burst; named biome terrain set; upgrade strip on the road atlas; faction sprite family (class C, category level). Each brief names the trait kept and the trait changed.

## Cross-link
- Camera and zones: biome tables in gamedata/world (above).
- Spawns and loot: not read. The game code (libs/) holds these; not opened.
- HUD and UI: menu.bmp, logo.bmp, splash.bmp and the credits portraits in assets/base; texte/keyboardlayout.txt for the input layout.
- VFX: fireworks/ (above).
- Sound: MUSIC/SNG tracks (class A) are the one free sound source in this donor; sound.scs maps sample indexes to source rates.
- Mission and progression: campaigns/ (above).
- Death and respawn presentation: not located in the files read.

## Not read / unexpected
- Not read: all binary bmp and LST files, OGG files, wasteland and winterworld bodies, MISS201 to MISS209 bodies, world campaign bodies, libs/ code, external/ submodules, de, fr and pl texte bodies.
- Unexpected: the .reuse/dep5 marks data/RTTR/assets/* as GPL, while README says the original graphics are kept. Recorded as a conflict, class C for the S2-named sprite sets.
- Unexpected: the S2 DATA and GFX folders are referenced but not present, so most visual content is absent from the box.
