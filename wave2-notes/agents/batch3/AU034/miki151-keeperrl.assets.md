# miki151-keeperrl (asset audit, AU034)

Donor: miki151-keeperrl (VPS: /mnt/frankendom-donors/miki151-keeperrl/, flat C++ tree plus data_free/, data_contrib/, server/)
Code licence: GPL-2.0 (LICENSE and COPYING.txt both carry the GNU GPL v2 text).
Asset licence: split by folder, per COPYING-MEDIA.txt (top level of the donor):
- data/ (official): "granted to use only with the official binary distribution" (line 1). The data/ folder is NOT in the box (checked: no such directory).
- data_free/: "granted under the Creative Commons BY-SA licence" (line 3; the file links CC BY-SA 2.0).
- Lato-Bol.ttf (data_contrib): "distributed under the SIL Open Font License" (line 5); SIL_Open_Font_License.txt is in data_contrib.
- icons.png: "a derivative of work by Lorc (http://game-icons.net)" (line 7). No licence named in the file.
- Symbola.ttf: "is public domain" (line 9).
- credits.txt line 10 names "16-bit fantasy set by oryxdesignlab.com". credits.txt line 35 says "See license.txt for licence of particular data." No license.txt is in data_free. So the status of that art set is unclear.

Halves read:
- CLIENT and shared code: top-level C++ (game_config.cpp, tileset.cpp, fx_texture_factory.cpp), read by grep and by short line ranges.
- DATA half: data_free/ read (creatures.txt, tiles.txt, body_materials.txt, translations/english.txt, FX and map-layout folder listings). The official data/ half is absent from the box, so creature sprites, tile sheets, FX sheets, music and sounds are not present.
- SERVER half: server/ holds PHP helper scripts (highscores.php, db.php, get_messages.php, get_sites.php, game_event.php), not a game server. Two lines read.
Paired donor in the box: not searched.

## Rights-holder status (from the files)
- README.md line 4: "Source code of KeeperRL." Store and itch.io links are given.
- credits.txt names the design and programming author (Michał Brzozowski), music composers, graphics credits (oryxdesignlab, ShroomArts, Artur Reterski), an intro film author, and font credit (Lato, Lukasz Dziedzic). So the work names third-party contributors. Per-asset licence status for the third-party art is not stated in the box.
- COPYING-MEDIA.txt gives the split above.

## Asset inventory
- data_free/: 164 files in total: 75 PNG, 85 TXT, 3 VDF (controller config), 1 XCF (GIMP source). Class B for the folder under CC BY-SA, with subsets in class C (see below).
- data_free/images/: 47 PNG including images/ui/ (menu_core.png, icons.png, spells.png, minimap_icons.png, map_font.png, window_bg.png, mouse_cursor.png, plus buttons, corners, scrollbars, bars, highlights). Header reads: spells.png 80 px wide, menu_core.png 480 px wide. Class B under data_free; icons.png is class C per the file's Lorc note.
- data_free/ui/: several more PNG (deck, damage, capture, steeds, buildings, guard zones; not counted) and text screens (prisoners.txt, number_menu.txt and similar). Class B.
- data_free/game_config/map_layouts/: 8 PNG layouts in 7 folders (adoxie_vault, adoxie_temple, castle1, wizard_tower, city, satan, death). Layout loader not read. Class B.
- data_free/game_config/*.txt: the content tables (see data tables). Class B.
- data_contrib/: Symbola.ttf (public domain per file), Lato-Bol.ttf (SIL OFL per file), SIL_Open_Font_License.txt. Class A (Symbola) and B (Lato, licence travels with the font).
- Audio, music, creature sprites, tile sheets, FX sheets, intro film: not in the box. The data/ folder that COPYING-MEDIA restricts is absent. Class C (not present).

## Data tables (data first)
- data_free/game_config/creatures.txt (5659 lines): creature records. About 268 top-level ids. Each record gives viewId, body (type and size), attr, permanentEffects, maxLevelIncrease, aiType, name generator, body parts, intrinsic attacks, drops, and spells. Class B.
- data_free/game_config/tiles.txt (1027 lines): view id to symbol and colour (e.g. the red dragon is a "D" in red, the keepers are "@" in purple, pink or yellow). Class B.
- data_free/game_config/items.txt (2201 lines): item table (format not checked). Class B.
- data_free/game_config/names.txt (14191 lines): name lists. Class B. Not opened.
- data_free/game_config/body_materials.txt (139 lines): material records (flesh, undead flesh, spirit) with immunities and intrinsic effects. Class B.
- data_free/game_config/enemies.txt (2959 lines), furniture.txt (2682), spells.txt (1056), buffs.txt (528), biomes.txt (399), technology.txt (197), achievements.txt (33). Class B. Not opened beyond the heads.
- data_free/game_config/translations/english.txt (4224 lines of KEY "text" pairs) and polish.txt. The string table is a flat KEY-value list (e.g. the UI labels). Class B. Text not copied.

## Inspiration (own words)
- Creature as one record: the red dragon block combines a huge four-legged body, two wings, a bite that applies burn, a scale drop, a permanent-effect set (fire immunity, ranged vulnerability, steed, capture resistance, regeneration) and a spell list. Read creatures.txt lines 1294-1330. Keep the single-record shape for boss silhouettes and abilities.
- Harvest-to-unlock: a dropped body part grants a named ability ("fire breath"). Loot as ability, with a clear reward moment. Read creatures.txt lines 1315 (red dragon) and 1206 (a poison variant).
- Upgrade ladder: keeper looks upgrade every five tech levels, four steps per look (keeper1 to keeper4, knight variants, female variants). Read creatures.txt line 9 and tiles.txt lines 14-22.
- Symbol and colour fallback: every creature view has an ASCII glyph and a colour in tiles.txt. This is a readability fallback for small screens. Read tiles.txt line 277.
- Additive flipbooks: flames, sparks, flashes, teleport and missile cores are sprite-sheet grids encoded in file names (4x4, 4x2, 2x2) and set to additive blend. Read fx_texture_factory.cpp lines 29 and 54. Sheets are not in the box.
- Body material as an immunity set: undead flesh is sunlight-vulnerable and immune to poison, plague and bleeding; flesh and spirit differ. A material tag is a cheap enemy class. Read body_materials.txt (UNDEAD_FLESH block).

## Briefs
Dom's rule: each brief is a clearly distinct original, never a copy. Traits kept and changed are listed.
1. Label: "Ember wyrm" (red dragon category). Why: a huge four-legged silhouette with wings reads as a boss at 375 wide, and a bite with a burn is a clear signature. Keep: four-legged huge body with two wing parts and a harvest that unlocks a breath ability. Change: recreate as a distinct original: crested, horned head, a teal and bronze palette, folded wings, and a cold breath instead of fire. Ref: data_free/game_config/creatures.txt lines 1294-1330; tiles.txt line 277.
2. Label: "Warden rank ladder" (keeper upgrade ladder). Why: a visible rank change every few levels is readable at a glance. Keep: four stepped looks at fixed intervals. Change: recreate as a distinct original: each step adds a crest or pauldron ornament rather than only a recolour. Ref: creatures.txt line 9; tiles.txt lines 14-21.
3. Label: "Flame flipbook" (fire effect). Why: a 4x4 additive flipbook reads as fire without per-frame art. Keep: additive blend and a 4x4 frame grid. Change: recreate as a distinct original: a cooler ember with a smoke sheet and fewer frames. Ref: fx_texture_factory.cpp lines 29 and 54 (sheets not in box).
4. Label: "Undead flesh tag" (enemy material). Why: one material tag sets the weakness and the immunities, so a whole enemy class plays differently. Keep: a sunlight vulnerability and a bleed immunity on one material record. Change: recreate as a distinct original: our tag names, and a weakness to a different element. Ref: data_free/game_config/body_materials.txt, UNDEAD_FLESH block.

## Cross-link
- hud-ui: symbol-and-colour fallback (tiles.txt) and the UI texture set (images/ui) are worth a look for readability and touch-target chrome.
- vfx: FX sheet names (fx_texture_factory.cpp) show the flipbook grid scheme and additive modes.
- loot and progression: harvest-to-ability (creatures.txt) and the keeper look ladder.
- animation and camera: no animation files in the box (data/ absent).
- sound: none in the box (audio absent; credits name composers only).
- spawns and encounters: enemies.txt (2959 lines) and the map layouts hold encounter setup; not read in depth.

## Not read
- Binary image and font content (sizes from header bytes only for three PNGs).
- data_contrib font files and XCF and VDF files (names only).
- Most creature records, all of items.txt and names.txt beyond line counts.
- Top-level C++ beyond three files and the cited lines. Loader for map_layouts not read.
- server/*.php beyond two lines.
- CLAUDE.md and AGENTS.md: not present in this donor.
