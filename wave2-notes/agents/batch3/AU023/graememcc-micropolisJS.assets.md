# graememcc-micropolisJS - asset audit (AU023)

Source tree (VPS, read only): /mnt/frankendom-donors/graememcc-micropolisJS/
Half read: the whole game (it is one client-side JS/HTML5 project). Data tables read: src/spriteConstants.ts, src/tileValues.ts. Art files read by header and name only. No server half in the box.

## Licence (what the files say)
- Code: GPLv3 with additional terms. README.md line 6: "The code is licensed under the GPLv3, with some additional terms". LICENSE line 3: "Copyright (C) Graeme McCutcheon, 2013." LICENSE line 5: "Adapted from the original Micropolis source code release". LICENSE line 10: "No trademark or publicity rights are granted." COPYING is the GPL v3 text (header read).
- Name: MicropolisPublicNameLicense.md (version 1, line 3) applies in addition. README line 6: "additionally governed by the Micropolis Public Name License". Term 1 (line 16) requires attribution when the name "Micropolis" is used, including in variations.
- Font: css/FONT_LICENSE.markdown (line 1 copyright Meredith Mandel, reserved font name "Chunk"; line 3 SIL Open Font License 1.1).
- Art: no file states a licence for images/ or sprites/. LICENSE covers "this program". COPYING covers code. about.html line 45 says Micropolis is the open-source release of a commercial game once sold by Electronic Arts (text stripped of tags). So the art licence is unclear. Class C.

## Rights-holder status (from repo files only)
mixed, as the files say: code copyright Graeme McCutcheon (LICENSE line 3), adapted from the original Micropolis release (LICENSE line 5); name is a registered trademark of Micropolis GmbH per README.md line 9 and MicropolisPublicNameLicense.md. Art owner not stated.

## Asset inventory
| group | path | count | licence | class | note |
|---|---|---|---|---|---|
| object sprites | sprites/obj<group>-<frame>.png | 61 files | no asset licence stated | C | 32x32 px (IHDR read for obj1-0.png and obj8-3.png). Numbered by group and frame. |
| tile sheets | images/tiles.png (512x512), images/tilessnow.png (512x512) | 2 | no asset licence stated | C | Terrain sheets. Snow variant. |
| sprite sheet | images/sprites.png (768x128) | 1 | no asset licence stated | C | Single strip of sprites. |
| ground background | images/dirtbg.png (16x16) | 1 | no asset licence stated | C | 16 px tiling background. |
| display font | css/chunk.woff (font file; header not read) | 1 | SIL OFL 1.1 with reserved font name "Chunk" (css/FONT_LICENSE.markdown lines 1-3) | B | Conditions: OFL 1.1 terms (only the header was read) and the reserved font name. |
| trademark name | MicropolisPublicNameLicense.md | 1 doc | name licence v1 | B (name only) | Attribution when using the name "Micropolis". Not an art asset. |
| data tables | src/spriteConstants.ts (7 SPRITE_ constants); src/tileValues.ts (about 198 export lines) | 2 | GPLv3 with extra terms (code) | n/a | Data first: the sprite kinds and the tile ID blocks are here. |
| code | src/ (90 files), test/ (7 files) | 97 | GPLv3 with extra terms | n/a | Code. |
| page text | index.html, about.html, name_license.html | 3 | GPL / name licence headers | n/a | Project pages, not game text. |

## Data first
- Sprite kinds: src/spriteConstants.ts. Seven constants: SPRITE_TRAIN, SPRITE_HELICOPTER, SPRITE_AIRPLANE, SPRITE_SHIP, SPRITE_MONSTER, SPRITE_TORNADO, SPRITE_EXPLOSION (line 14 is SPRITE_TRAIN).
- Tile IDs: src/tileValues.ts. Blocks are contiguous: water starts at RIVER and runs to LASTRIVEDGE with edge variants in between; woods start at TREEBASE. Line 14 holds an open TODO: "Add comment for each tile". Some IDs are unlabelled ("tile 1 ?", "tile 6 -- 19 ?").
- Only the two files above were read for data. Other tile and building tables were not opened.

## Inspiration (category level, because the art licence is unclear)
- Water and woods live in contiguous ID blocks with edge variants (src/tileValues.ts). A block-per-terrain-family scheme makes autotiling simple.
- Seven sprite kinds cover moving city units (train, helicopter, airplane, ship), a roaming monster, a tornado and an explosion (src/spriteConstants.ts). A short list of sprite kinds keeps the cast small.
- The monster is shown in a separate TV-style window module (src/monsterTV.js). A side-screen event is a cheap way to add a news beat.
- Small 32 px sprites are numbered by group and frame (sprites/obj*.png). An easy naming scheme for an artist to follow.
- A chunky display font is used for titles (css/style.css lines 22-25). Usable only under OFL conditions and not under the name "Chunk".

## Briefs (art is class C: category level only)
See graememcc-micropolisJS.assets.json key "briefs". Rule for all briefs: recreate as a clearly distinct original, never a copy. Each brief names the trait kept and the trait changed.

## Cross-link to our cell topics
- spawns and animation: sprite kinds (src/spriteConstants.ts) and numbered frames (sprites/).
- vfx: tornado and explosion kinds (src/spriteConstants.ts) and src/explosionSprite.js (not read).
- hud-ui and sound: monsterTV.js side window (not read); font usage in css/style.css.
- zones and camera: tile ID blocks (src/tileValues.ts).
- loot: no content in this box.

## Not read
- The art files' pixel content (names, sizes and header bytes only).
- css/chunk.woff binary content (only the file name and the css reference).
- src/monsterTV.js (header only), src/explosionSprite.js, src/splashScreen.js, src/disasterWindow.js (names only).
- about.html and name_license.html in full (grep for the lines cited).
- COPYING (header only).
