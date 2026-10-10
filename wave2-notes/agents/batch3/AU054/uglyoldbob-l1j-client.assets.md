# uglyoldbob-l1j-client (asset audit, cell AU054)

Donor/Licence: `/mnt/frankendom-donors/uglyoldbob-l1j-client/`. Code: GPL-3.0 (COPYING:2). Assets: none stated; the game data is not in the repo.

Checked: root listing (depth 3), COPYING, README, src/README.txt, src/README-SDL.txt, src/resources/known.h (data-table index), src/resources/music.cpp, tile.cpp, table.cpp, global_files.h, src/sdl_user.cpp (sprite_table reader, around line 380-400), rust/src/sprites.rs (struct and loader), rust/src/resources/stringtable.rs, src/config.cpp (install path lookup), src/LineageWindows.ini, src/encryption (copyright line only), file-type counts over the tree.

Which half: CLIENT half read. Data half: the table names and their meaning from src/resources/known.h (no table files are in the box). Server half: not read; no server directory was seen in the root listing. Paired donor in the box: none.

## Licence and rights (from the files only)
- Code: GPL-3.0 (COPYING:2). No per-file SPDX headers found (grep for the GPL header in src and rust/src returned 0).
- Assets: no asset licence in the repo. The client reads the game files from a separate Lineage install (src/config.cpp:158 "Lineage is located at"; src/README.txt:4 says the client files should not be placed in the Lineage folder).
- Rights holder: the repo does not name an owner of the game data. The Windows config only points at an NCsoft install folder (src/LineageWindows.ini:1). Status: uses original game data (proprietary, not in repo).
- Bundled third-party: SDL readme says LGPL (src/README-SDL.txt:11); encryption helpers credited to Christophe Devine (src/encryption/aes.c:4).

## Asset inventory (what is actually in the box)
- sprite_table.txt: two copies with the same byte size, 2,171,928 bytes each (src/ and rust/src/resources/; contents not compared). A numeric index of sprites, not decoded. The C++ reader walks it as a stream of numbers with an equals sign for aliases (src/sdl_user.cpp:391). Class C.
- known.h: a list of the text-pack tables the client expects (level-up lines, stat descriptions, spell names with costs, zone rectangles, village names, help and tip text). The list is code-repo text, but it names proprietary tables. Class C.
- Third-party mirror under powerpc/: about 120 GIF and 112 HTML files from an unrelated course site, plus a few text and zip files. Licence not seen. Not read beyond file types. Class C (unclear).
- No models, no sound files, no fonts, no maps in the box (sound and tile files are loaded by number from the game install: src/resources/music.cpp:72, tile.cpp:197).

## Class per group
- sprite_table index: C (unclear origin, game-derived index).
- known.h table names: C (describes proprietary tables).
- powerpc mirror: C (unclear licence, unrelated content).
- Client code, loaders, UI logic: GPL-3.0 code, not assets.
Overall best_class: C. No usable non-code content for Frankendom.

## Inspiration (own words, category level)
- Animation as an action table: a sprite record holds a fixed list of action slots, and each slot is a list of frames with a timing value and an audio cue. The sound lands on the frame, not in code. Recreate the shape with our own action names and seconds.
- Layered dress on one body: a sprite record carries a count and a list of clothing sprite ids, so gear swaps without new bodies. The silhouette stays the same, which helps reading at 375 wide.
- Zones as rectangle rows: a zone is a text id, a map id and a start and end box. The box is data. Ours can keep rectangles in zone data, with spawn fields added.
- Per-class celebration lines: one level-up message table per class. A cheap way to make progression feel personal.
- Spell list with costs in one text table: the HUD reads name and cost from one row.
- Per-language table files: each table is loaded with a language letter in its name. Good pattern for our locale files.

## Inspiration briefs
1. Frame-cued swing. Why it works: the impact sound lands on the frame where the blade meets the target. Keep: a sound cue on a specific frame; a per-action slot. Change: our own action names (not numbered slots); timing in seconds, not ticks. Ref: rust/src/sprites.rs:8 and :17 (struct and action table; read as declarations only).
2. Layered gear on one body. Why it works: a count plus a list of clothing ids means one silhouette reads as many outfits. Keep: base body plus a clothing list. Change: our armour as rig plates, not sprite swaps. Ref: rust/src/sprites.rs:22-23.
3. Zone as a rectangle row. Why it works: name, map and bounds in one row keeps zones as data. Keep: rectangle rows. Change: ours carry spawn caps and biome fields. Ref: src/resources/known.h:75.
4. Class-keyed level-up line. Why it works: a short line per class at each level makes the moment personal. Keep: keyed by class. Change: our own voice and wording. Ref: src/resources/known.h:12.

## Cross-link
- Camera, zones, spawns, loot, HUD, VFX, animation, sound: the animation (frame cue) and sound (numbered files) points above are the only asset-side notes. Zones have a rectangle-row idea. Loot, spawns, camera and VFX assets are not in this box (not read).

## Not read
- Server half (not in this review).
- The 3 zip files, the powerpc mirror beyond file types, update/ (patch tool; names only), the body of sprite_table.txt, the encryption code bodies.
