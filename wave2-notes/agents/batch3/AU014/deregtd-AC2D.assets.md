# deregtd-AC2D: asset audit (AU014)

"AC2D - The Alternate Client Project" (website/index.php line 36). A reverse-engineering client and terrain viewer. Best class C: screenshots and icons are unlicensed and likely show game-derived art. The executable in terrain.zip is class D and was not run.

## Licence
- Code: GNU GPL v2. LICENSE is the GPLv2 text (line 2: "Version 2, June 1991"). ChecksumXorGenerator.cpp header (line 3: "Copyright (C) 2014 Daniel Skorupski"; line 7: "either version 2 of the License, or") says GPL v2 or later.
- zlib folder: zlib copyright lines in headers (zlib.h line 4). Licence text not read.
- Assets: none stated. No licence or credits file for the screenshots, icons or terrain.zip. The page text credits the author by name ("by Akilla", index.php line 73).

## Rights holder (from repo files)
Reverse-engineering project. index.php line 119: "reverse-engineer enough of the game's file formats/network protocol" to make "a usable alternate client to the normal Turbine one". The viewer installs into the user's own game directory (index.php line 96: "Download and extract the viewer to your AC:ToD directory"). Game data is therefore not in the repo, and the original content is proprietary by that text.

## Which half was read
CLIENT half: the alternate client and terrain viewer (cPortal.h line 25 uses cTurbineFile for portal data; WindowLib and cInterface are client UI). The SERVER half of Asheron's Call is not in this repo. Matching server folder in the box by folder name only (not opened): ACEmulator-ACE. A client reverse-engineering folder by name, also not opened: Mag-nus-acclient-AI-RE.

## Data tables (DATA FIRST)
- None in the repo. Portal and landblock data is read from the user's own game install.
- The site's page text (index.php) is not a data table.

## Inventory and class
| group | path | count | class |
|---|---|---|---|
| screenshot gallery | website/pics | 67 files (full and _sm thumbnails) | C |
| loose JPG shots | website/ | about 36 JPG | C |
| icons | AC2DTest.ico, client.ico, small.ico, WindowLib.ico | 5 ICO (23558 and 4710 bytes sampled) | C |
| terrain viewer archive | website/terrain.zip | 197328 bytes, one file terrain.exe (458752 bytes) | D (executable; not run) |
| zlib library | zlib/ | zlib.h, zconf.h, ioapi.h, zlibstat.lib | C |
| GL header | gl/glext.h | 284470 bytes | C (not read) |
| in-game content | not in repo | 0 | D |

Totals: 103 JPG in the whole repo. No audio, no 3D models, no sprite sheets, no fonts files in the repo. Image names suggest spell bars, frost walls, explosions, robes, mansions, fonts, terrain and model shots (modelh8, modelh82); none was opened.

## Inspiration (category level; game-derived)
- A terrain flyer built from landblock cells, with textured ground and a grid whose draw radius steps up or down. Recreate the readable outdoor from height with our own terrain.
- A minimap you click to jump the camera. Simple navigation for a big world.
- A plain dark gallery page with thumbnails and a single accent rule. Cheap devlog format.
- The screenshot categories (spell bars, a frost wall, an explosion, robes, a mansion) show what a developer wants to show. Recreate each from scratch.
- The stated aim is an alternate client, not only a viewer. A readable spell-bar HUD is worth building early.
- Colours, shapes and animation of these shots were not checked (no image opened).

## Briefs
1. Ice barrier spell (ours). Keep: translucent slab, frost edges, shards on impact, short fade-in. Change: our own shape and colour, a crystal or spore wall. Ref: website/pics/frostwall.jpg (not viewed). Signature behaviour: the wall blocks movement. Sound: none in repo.
2. Spell bar HUD (ours). Keep: fixed row of slots, a cooldown fill, a short label. Change: our own frame, icons and colours; a radial or split bar. Ref: website/spellbars1.jpg (not viewed). Fits a 375-wide phone as a single row.
3. Area blast effect (ours). Keep: bright core, expanding ring, brief shockwave, fast fade. Change: our own element and palette, a dust or spark style. Ref: website/pics/boom.jpg (not viewed).

All briefs: recreate as a clearly distinct original, never a copy.

## Cross-links (task item 6)
- zones and camera: the terrain flyer and minimap are worth a look (structure only; images not viewed).
- hud-ui: spell bars. vfx: frost wall and blast names. Worth a look.
- loot, spawns, animation, sound: no assets in the repo.

## Not read
JPG and ICO bodies; terrain.zip contents beyond the listing (not extracted, not run); zlib licence text and library binary; gl/glext.h body; most C++ client sources; WindowLib and Interfaces bodies; matching server folders (names only).

Receipts: receipts.tsv (rows for deregtd-AC2D; verified).
