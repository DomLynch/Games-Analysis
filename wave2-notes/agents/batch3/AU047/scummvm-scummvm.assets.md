# scummvm-scummvm (asset audit, cell AU047)

Donor: /mnt/frankendom-donors/scummvm-scummvm (read on VPS, read-only)
Which half: this box holds the code half (engines/, 146 engine folders, plus common/, gui/, backends/) and the data half (dists/engine-data, dists/soundfonts, gui/themes). I read code for the DM engine (engines/dm) and the data-pack READMEs and licence files. The matching game files that the data pack was made from are not in the box.

## Licences (as the files say)
- Code: COPYING is the GNU GPL version 3 text (COPYING line 2 "Version 3, 29 June 2007"). Source headers say "either version 3 of the License, or" (engines/scumm/scumm.cpp:9; devtools/create_ultima/create_ultima.cpp:9). README.md has no licence section (grep for licen, GPL, copyright found nothing).
- Copyright list: COPYRIGHT line 2 "Copyright (C) 2001-2026 by the following:", then a contributor list.
- LICENSES/ holds other licence texts (BSD, MIT, OFL, Apache, GLAD, LGPL, MPL, ISC, Lua, BSL, TinyGL, Catharon, MKV). Which file applies to which asset is named only in the font README below.
- Fonts (dists/engine-data/fonts/fonts/README, lines 3-9): Go Mono under the BSD file (line 3); Liberation, Noto and Source Code Variable under SIL OFL (lines 4, 6, 7); Material Design icons under Apache 2.0 (line 5); Wine fonts under LGPL 2.1 or later (line 9, the README does not name which files are Wine fonts). VL Gothic line 8 ends with "..." and states no licence. ms_sans_serif.ttf, system.ttf and topaz are not named in the README: licence not stated.
- Soundfont: dists/soundfonts/Roland_SC-55.sf2 with dists/soundfonts/COPYRIGHT.Roland_SC-55 line 1: "Copyright (c) 2015 deemster. Licensed under the GPL v3 (or greater)". The file does not say who made the sampled instruments.
- Game data (dists/engine-data/*.dat, *.zip, got.gfx, got.aud, queen.tbl, sky.cpt, monkey4-patch.m4b): the README says these hold game data, strings and tables taken from or "stored in the original executables" (README lines 58, 61, 74, 98, 133). No licence stated for them in the box.
- devtools/create_ultima/files/ultima4 and ultima6: resources extracted from original executables (ultima4_resources.cpp:64 "Extract string tables from avatar.exe"). No licence stated.
- gui/themes (bmp, svg, stx, zip): no licence file in the theme folders. Not stated.

## Rights-holder status (repo files only)
Mixed. The code is a GPL project with many named contributors (COPYRIGHT). The engine data packs are described in the box as taken from original commercial game executables; the repo does not name those rights holders. Font rights holders are named by project in the README. Soundfont credit is "deemster" (file line 1). Status for game-derived data: unknown for licence, described as original-game-derived by the file.

## Asset inventory (counts from find, not opened unless noted)
- Whole tree by extension: 10486 cpp, 10105 h, 643 png, 445 bmp, 177 cur, 171 ini, 140 txt, 115 lua, 102 xml, 93 fragment, 75 vertex, 61 dat, 38 ttf, 34 lingo, 29 svg, 28 caf, 25 ogg, 19 mid, 13 mp3, 12 zip, 12 html, 10 vga, 37 po by extension (po/ itself holds 34 .po files).
- Fonts: 38 ttf in total: 34 in dists/engine-data/fonts/fonts, 1 in fonts-imgui, 1 in fonts-cjk, 2 in devtools/create_ultima. Sizes: fonts.dat 6.4 MB, fonts-cjk.dat 38.3 MB, fonts-imgui.dat 4.0 MB (ls).
- Data packs (dists/engine-data, binary, not opened): ultima.dat 16.0 MB, titanic.dat 3.2 MB, kyra.dat 2.0 MB, lure.dat 0.8 MB, classicmacfonts.dat 0.6 MB, plus about 40 more .dat/.zip/.tbl/.cpt/.m4b/.lab/.gfx/.aud files.
- Ultima IV/VI resources (devtools/create_ultima/files): ultima4 graphics 313 files, sound 56, mid 38, spells 26, conf 32, intro 6, text 10 (481 in those dirs); ultima6 images 244, scripts 114, maps 1 (359 in those dirs, plus top-level bmp files). Also png 284, bmp 253, lua 114, txt 35, caf 28 under create_ultima.
- Text tables (create_ultima/files/ultima4/text, line-based .dat): shrines.dat 23 lines; lb_text.dat 285 lines (blank-line separated, a speaker tag then text). Grammar only; no text quoted.
- Translations: po/ holds 34 .po files (listing); not opened.
- Soundfont: Roland_SC-55.sf2, 3.28 MB (not opened, binary).
- Title art and music in the box: got.gfx and got.aud (README lines 58, 61). Binary, not opened.

## Class per group
- Go Mono fonts (GoMono-*.ttf): A (BSD per README line 3; keep licence file).
- Liberation, Noto, Source Code Variable fonts: B (OFL per README lines 4, 6, 7; conditions in the OFL text, not read).
- Wine fonts (files not named): B (LGPL per README line 9), unassigned.
- Material icons: A/B per file, Apache 2.0 per README line 5; file names not named: unassigned.
- Roland_SC-55.sf2: B (GPL v3 or greater per COPYRIGHT.Roland_SC-55 line 1; copyleft condition if shipped).
- engine-data game data (.dat, .gfx, .aud, .zip, .tbl, .cpt, .m4b, .lab): C (original-game derived; no licence stated).
- ultima4/ultima6 resources (create_ultima/files): C (extracted from original executables; no licence stated).
- gui/themes art and layout: C (no licence stated).
- Overall best_class: A for the BSD font only; the group that matters for us is B (soundfont, OFL fonts). Game data is C. Frankendom should use none of the game data.

## Data first (where names and looks live)
- The engine tables that matter for combat and creatures are C++ tables in engines/dm (action-by-defence table timeline.cpp:43, timeline event types timeline.h:39-52, group flags group.h:93-108).
- The data packs hold names and strings for original games (engine-data/README). Their internal format is binary; not opened.
- Theme layouts are XML-style .stx files keyed by screen resolution with scalable variables (gui/themes/common/lowres_layout.stx:22-25; highres_layout.stx not read).

## Inspiration (own words; GPL code means shape only, not copied)
- One timeline queue of scheduled events keyed by map time, with named types for doors, walls, teleporters, pits, and negative "reaction" events for danger, a projectile hit, or a party member adjacent (timeline.h:39-52, 100-102). Names only from the header; the reaction logic is not read. Fits the spawn and despawn timers (row 23) and fight loop (row 4).
- Creature groups occupy a set of cells, each creature has an ordinal per cell, and flags say whether the group is attacking, side-attacking or can hit any party member (group.h:93-95, 107-108, 111-139, 183). Fits many-vs-one target choice and the attacker cap.
- A small action-by-defence matrix (44 slots) resolves a block or a hit with one lookup (timeline.cpp:43; timeline.h:196). Keep the structure; the values are game-derived and are not recorded here.
- Projectiles and explosions handled in their own module (projexpl.h:41-43), separate from melee. A clean split for ranged enemies and burst effects.
- Resolution-keyed layout files with scalable variables (line height, font height, borders) (lowres_layout.stx:22-25). Fits the HUD at 375 wide.
- Font and icon packs shipped with one README that names the licence per font family (fonts/fonts/README lines 3-9). Copy the habit for our credits file.
- Line-based string tables with blank-line-separated entries and speaker tags (create_ultima/files/ultima4/text). Simple dialogue format to reuse, text written by us.

## Inspiration briefs
1. Timed reaction tile (zone/effect). Why it works: a floor tile that reacts only when a party member is next to it, so the player reads it before stepping on. Keep: a timed event on the map timeline; a reaction event fired by proximity. Change: our own tile look and sound; reaction delay in our tick units; no pit or fake wall copy. Ref: engines/dm/timeline.h:39-52, 100-102 (names only; logic not read).
2. Creature cluster (creature). Why it works: a group occupies four cells and each member has a cell slot, so the group reads as one blob with spacing. Keep: a group that owns cells, one ordinal per cell, one attacking flag. Change: our silhouettes, a tighter or looser cluster, a different slot order and body arrangement. Ref: engines/dm/group.h:111-139, 183.
3. Timed projectile burst (effect). Why it works: a missile flies on the timeline and bursts on arrival with a short-lived shape, readable at 375 wide. Keep: projectile as an event on the same queue as other timed events; a burst that lasts a few frames. Change: our colour, burst shape and sound cue; no direct copy of the module. Ref: engines/dm/projexpl.h:41-43.

Rule (Dom): recreate each as a clearly distinct original, never a copy; the traits kept and changed are listed above. The donor code is GPL: adapt the shape only, clean-room.

## Cross-link to our topics
- spawns/encounters (row 23): timeline and group cells. Loot and camera: none in the box (dungeon data not in box). hud-ui: resolution-keyed layouts with scalable variables and per-font licence notes. sound-music: the GPL soundfont (B), layering not read. animation: none in the box. Title art and music: embedded in executables, C.

## Not read
- Most engines (except engines/dm headers and cpp listed above). engines/dm/*.cpp beyond the lines cited (not read in full).
- All .dat, .zip, .gfx, .aud, .m4b, .lab, .sf2, .ttf, .png, .bmp files (binary, not opened).
- gui/themes/highres_layout.stx, THEMERC of other themes, theme .svg art (not read).
- po/*.po (listed, not read). LICENSES/* texts (listed, not read). devtools/create_ultima/files/ultima6 text (not read). README.md (only a grep, no licence text found).
