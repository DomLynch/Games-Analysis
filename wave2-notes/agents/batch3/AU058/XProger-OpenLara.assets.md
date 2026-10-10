# XProger-OpenLara (asset audit, AU058)

Donor: /mnt/frankendom-donors/XProger-OpenLara (VPS, read-only). Half read: ENGINE code (src/enemy.h, src/gameflow.h, src/lang, src/platform file list). Data half: the platform data folders in the same repo (listed by name and size only, binaries not opened). The original-format game data the PC build expects is NOT in the box; it reads the user's own DATA folder.

Class C donor for art and data: inspiration below stays at category level (creature types and behaviour), with no coordinates or constants.

## 1. Licences (as the files say)
- Code: BSD 2-Clause. LICENSE line 1 "BSD 2-Clause License"; line 3 "Copyright (c) 2018, Timur" followed by the name; README line 10 badge "BSD 2-Clause".
- No licence file covers the data, the art, the language glyphs or the icons. The only licence text in the tree is LICENSE. The README does not describe the data.
- bin/openvr_api.dll: no licence file in the tree; not read beyond size.

## 2. Asset inventory (real paths, sizes from ls)
- src/platform/gba/data/: TITLE.PKD (313,700 B), LEVEL1.PKD (2,356,992 B), LEVEL2.PKD (2,616,756 B), GYM.PKD (1,465,004 B), TRACKS.AD4 (3,006,108 B). Level and music packs in a console packing. Names match the level table in gameflow.h (level stems).
- src/platform/32x/data/: LEVEL1.PKD (1,235,880 B), LEVEL2.PKD (1,398,736 B), GYM.PKD (895,656 B).
- src/platform/3do/CD/: System/Drivers/cport*.rom (4 files), System/Drivers/languages/*.language (8 files, da, de, es, fr, it, ja, nl, pt), a Kanji16.4 font (925,312 B), a signatures file (335,872 B). src/platform/3do/banner.bmp (230,456 B).
- src/lang/: 16 language string headers (cn, cz, de, en, es, fi, fr, gr, hu, it, ja, ko, pl, pt, ru, sv) and 5 glyph headers (glyph_cn, gr, ja, ko, ru), glyph bitmaps glyph_cn.bmp (26,686 B), glyph_ja.bmp (14,910 B), glyph_ko.bmp (16,446 B), glyph_gr.bmp (2,110 B), glyph_ru.png (2,035 B). en.h line 4 holds a credit comment "Thanks: Nancy Charlton, Vague Rant" (receipt).
- src/platform/gba/IMGS/O/P/OPLA.bmp (19,256 B) and gba/labels.png (667,679 B).
- Icons and banners in platform folders: about 27 PNG and 6 BMP files in the whole src/ tree (xb1 Assets, osx AppIcon set, psv sce_sys, psp ICON0 and PIC1, android drawables, gcw0, 3ds, ios launch image, others).
- Shaders (code under BSD): 7 glsl, 20 hlsl, 14 pica, plus asm and dsp files per platform.
- Binaries: bin/OpenLara (985,664 B, ELF magic only checked), bin/openvr_api.dll (486,176 B), src/platform/gba/packer/tracks/cygwin1.dll (2,992,181 B). None read.
- Level table (data first): src/gameflow.h LEVEL_INFO begins at line 260. Rows hold a file stem, a string id, a music track id and a small integer (the integer's meaning was not read). Rows start at line 261 (not counted). Level file names are built as DATA/<stem>.PHD (line 1078) and existence is checked for GYM.PHD (line 1049).
- Enemy and creature data is code (src/enemy.h): structs Wolf (line 556), Lion (697), Rat (1024), Crocodile (1203), Gorilla (813), Bear (1413), Bat (1555). Their visual data is in the level files, not read.

## 3. Rights-holder status
unknown. The README says "Classic Tomb Raider open-source engine" (line 2). The repo does not say who owns the level, music and art data in the platform folders, and does not say where they came from. The PC build reads DATA/*.PHD and similar files from the user's own install (gameflow.h lines 1049-1085), so the PC path does not need repo data.

## 4. Classes per group
- A: src/shaders and code under BSD 2-Clause (keep the notice).
- C: all PKD and AD4 packs, 3DO CD files, language and glyph headers and bitmaps, platform icons and banners (no licence in tree, provenance not stated).
- C: the three binaries (no licence in tree; not read).
- D: original game files the PC build expects from the user (not in box).
- best_class: C.

## 5. Inspiration (category level; no coordinates, constants or exact looks)
- Predator mood machine (src/enemy.h lines 41-54, 299-330). Four moods: sleep, stalk, attack, escape. A wound pushes a hunter to escape unless a bravery roll passes. The roll is likely while hunting and unlikely while already fleeing, and needs the target in the same zone. Fixed-AI and random-AI variants share one set of states. Recreate: a four-mood state per enemy, driven by zone membership and a wound flag.
- Patrol inside the shared footprint of two navigation boxes (enemy.h lines 29-41): each leg is a random point inside the overlap of two consecutive boxes, inset from the edges, so animals never walk along a wall. Our version: a random point in a shared walkable cell pair, inset from walls, with the leash from row 23.
- Fixed-rate think, separate from frame rate (enemy.h lines 333-336). AI decides on a fixed step using an accumulator. Defect: the code runs one think per call and subtracts one step, so after a long frame it lags instead of catching up. Fix: loop while the accumulator holds a full step, with a cap. Idea kept; defect fixed in our version.
- Flier that circles, dives and returns (enemy.h lines 1555-1600): states for awake, fly, attack, circling and death. An attack that loses reach drops back to sleep (line 1591). Keep the wheel-and-dive rhythm.
- Level table as flat rows (gameflow.h lines 260-266): one row per level with its file stem, string id and music track. Data-first. Our zone rows can take the same flat shape.
- Bitmap glyph packs for non-Latin scripts (src/lang/glyph_*.bmp, 21 headers). Relevant if the fight HUD gains more languages.
- Per-platform repacking of the same level data (32x and gba folders). A lesson on size budgets, not art to copy.

## 6. Inspiration briefs (category level only)
1. Wheeling night flier (Bat, src/enemy.h lines 1555-1600). Why: a fast, small hover that circles the player, dives, then returns; readable at distance as a moving silhouette. Keep: wheel then dive; return to idle when the target leaves reach; wide wings on a small body. Change: an ember moth with a figure-eight flight path and a short light trail; different wing and body proportions; recreate from scratch. Signature sound: none read.
2. Four-mood stalker (Enemy base, src/enemy.h lines 41-54 and 299-330). Why: one creature moves from idle to stalking to striking, and bolts when hurt; a bravery roll lets some hurt ones fight on, which gives drama. Keep: sleep, stalk, attack, escape; a wound leads to escape with a chance of resolve; the mood is re-chosen on the fixed think step. Change: a quadruped with a visible mood cue (head or tail posture); resolve comes from a per-enemy stat in zone data, not a random roll.
3. Patrol through a shared corridor (src/enemy.h lines 29-41). Why: wandering looks purposeful when each leg is a random point in the overlap of two areas. Keep: random leg target inside the shared area, inset from edges. Change: grid cells with a leash radius and a pause at each point; no level boxes.

## 7. Cross-link to our cell topics
- camera: camera.h has a Camera struct at line 40; not read.
- zones and spawns: navigation boxes and patrol (above); spawn code not read.
- hud-ui: ui.h and lang strings (above); ui.h not read.
- vfx: the enemy base class adds a blood entity on hits (near enemy.h line 296, seen in passing, not receipted).
- sound: hit sound field on the enemy base (enemy.h line 55, seen in passing).
- animation: the states and animation fields are referenced (animation.h not read).
- loot and death/respawn presentation: not read.

## Not read
- Every PKD, AD4, bmp, png, rom and language binary (binary, not opened).
- bin/OpenLara, bin/openvr_api.dll, src/platform/gba/packer/tracks/cygwin1.dll (no content read).
- camera.h, level.h, lara.h, sound.h, ui.h, animation.h, objects.h bodies (names only).
- Shader bodies; per-platform build files.
- Half: engine read; data half is listed by name and size only; the original game files are not in the box.
