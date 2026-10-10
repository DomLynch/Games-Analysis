# DCurrent-openbor: asset audit (AU014)

OpenBOR, a sprite-based beat-em-up engine. The repo is the ENGINE half only. Best class C: engine art has no stated licence; no game content is shipped.

## Licence
- Code: 3-clause BSD-style licence text in LICENSE (line 1: "Copyright (c) 2003, Roel van Mastbergen & Senile Team"; line 2: "Copyright (c) 2004, OpenBOR Team"). engine/LICENSE carries the same text. Line 7 speaks of "Redistributions of source code".
- Assets: none stated. The BSD-style text does not name art. No separate licence for the PNG, GIF or ICO files was found in the files read. Unclear, so class C.

## Rights holder (from repo files)
Mixed by the repo's own text. OpenBOR is an open engine (Senile Team and OpenBOR Team copyright lines). README line 21 says the original Beats of Rage used "assets from SNK Playmore's King of Fighters series". The repo does not say whether any of those assets remain in this tree. Do not use any art that traces back to that line.
README line 3 calls the engine "royalty free". README line 9 says "Sell it if you can!" These are the repo's own statements about the engine, not about the art.

## Which half was read
ENGINE half (engine/, root README, root and engine LICENSE, tools/borpak README). The DATA PACK half (game modules: sprites, scripts, sounds) is not in this repo. No module folder matching this engine was identified in the box by folder name (not opened).

## Data tables (DATA FIRST)
- No game-data tables (XML, JSON, CSV or Lua) for names or looks in the repo.
- engine/translation.txt: gettext-style msgid list for engine strings (header read only). The only string table found.
- The XML and JSON files that exist are devcontainer, vscode and CMake config.

## Inventory and class
| group | path | count | class |
|---|---|---|---|
| title and menu art (PNG) | engine/resources | logos and menus at 320x240 and 480x272, plus Sony and Link variants; about 35 PNG across the engine tree | C |
| app icons | engine/resources and engine/android res | 2 ICO, 1 ICNS, 16 Android mipmap PNGs | C |
| bitmap menu font sheets | engine/resources/BOR_Menu_Font_1..3.gif | 3 GIFs, 3278 bytes each | C |
| Android background | engine/android/app/src/main/res/drawable/background.png | 1 | C |
| module content | media/ | 0 (only _DUMMY, empty) | D |
| bundled tools | tools/ (7-Zip, devkitpro, bin, borpak) | 18 EXE and 5 DLL repo-wide | D (not run) |
| borpak pack tool | tools/borpak | source and READMEs | C (licence per README credits) |
| translation template | engine/translation.txt | 1 | C |

No sprites, no sounds, no music, no maps in the repo. Sizes and names were taken without opening the binaries.

## Inspiration (category level)
- Title and menu art made once and exported at two sizes (console-size and wide). A plan for our title art.
- A bitmap menu font as a few GIF sheets on a fixed cell grid: draw our own pixel font the same way.
- Launcher icons split into foreground, background and monochrome layers: good practice for our Android icon.
- The lane layout of the side-scroll beat-em-up genre (README names the genre): a structure to use with our own characters.
- A pack tool that bundles module files into one archive: an asset-bundle idea; write our own format.
- Nothing creature, armour or effect-like is in the repo, so that look is ours to create.

## Briefs
1. Title logo plate (ours). Keep: one master mark at two sizes, high contrast, clear centre focus. Change: our own wordmark, palette and plate shape. Ref: engine/resources/OpenBOR_Logo_480x272.png (not viewed; name and size only). Silhouette at 375 wide: not verified.
2. Bitmap menu font sheet (ours). Keep: fixed cell grid, one sheet per weight, native pixel size. Change: our own letterforms, cell size and accent glyphs. Ref: engine/resources/BOR_Menu_Font_1.gif (not viewed).

All briefs: recreate as a clearly distinct original, never a copy.

## Cross-links (task item 6)
- hud-ui: title and menu art and the bitmap font are the only UI assets. Worth a look for structure.
- camera: the side-scroll lane layout is the engine's genre (structure, not assets).
- zones, spawns, loot, vfx, animation, sound: no assets in the engine half.

## Not read
PNG, GIF, ICO and ICNS bodies; Android mipmap PNGs (names only); tools/7-Zip licence text and all binaries; tools/devkitpro, bin and win-sdk; engine C source; tests/test_invariant_borpak.c; README compile and contribute sections; the data pack half.

Receipts: receipts.tsv (rows for DCurrent-openbor; verified).
