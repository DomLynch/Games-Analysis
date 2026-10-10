# Asset audit: afritz1-OpenTESArena (AU003)

Class: **A** for the repo's own text and mesh files, C for samples and an exe string table, D for the original Arena data (never in repo).

## Licences (as the files say)
- Code: MIT. LICENSE.txt line 1 "The MIT License (MIT)", line 3 "Copyright (c) 2016-2026 The OpenTESArena Developers".
- Assets: no separate asset licence. README line 9 says "No game assets are distributed." The repo does not single out data/ files, so their status follows the repo MIT by inference only.
- Rights holder: fan project and clean-room reimplementation of The Elder Scrolls: Arena (README line 9, "with a clean-room approach"). Original game data is supplied by the user (README line 120, "rar x Arena106.exe"). Bethesda Softworks is named as the game's maker (README line 9).

## Asset inventory (paths from the VPS tree)
- data/meshes/ : 30 OBJ files, about 124K. Flat modular pieces (WallWest.obj has 4 vertices, 2 faces). Class A.
- data/ui/ : 23 layout .txt files, about 116K. Reference original image and font names (Automap.txt line 12). The referenced files are not in the repo. Class A for the text.
- data/audio/ : 3 .txt definition files, about 16K. Not opened. Class A (repo MIT, inferred).
- data/exe/ : 2 .txt files, about 28K. Names suggest strings from the original executable. Not opened. Class C.
- data/shaders/ : 40 files, GLSL source and .spv binaries. Class A (code).
- data/icon.bmp, icon.ico, icon.icns, Preview.PNG, samples/ (14 PNG): images, licence unknown. Class C.
- Not in repo: eawpats music patches (options-default.txt line 63 points at them; download link only, not fetched) and the original Arena data folders (options-default.txt line 90). Class C and D.

## Inspiration (own words)
- Modular wall kit: rooms are built from a few flat pieces with a per-piece material name.
- Palette-index shading: index-based textures, index 0 transparent, a light table per light level (shader AlphaTestedWithPaletteIndexLookup.frag).
- Scheduled world clock with overlapping windows for lamps, ambient light, music and a night storm (data/Clocks.txt lines 18-24).
- Declarative screens: each UI screen is a text file of widgets, so layout changes need no code.
- Light binning in a compute shader to keep many torches cheap (LightBinning.comp).
- One percent uniform drives screen-space animation (OpaqueScreenSpaceAnimation.frag line 12).

## Briefs
1. Modular dungeon wall kit: keep 12-15 flat pieces with edge, raised and diagonal variants; change to bevelled blocks and our own corner scheme. Ref: data/meshes/WallWest.obj.
2. Palette-indexed torchlit wall: keep index-to-shade lookup and transparent index 0; change to a cool palette and our own shade curve. Ref: data/shaders/AlphaTestedWithPaletteIndexLookup.frag.
3. Day-to-night clock with lamp and storm windows: keep overlap of lamps, music and storm; change to a moving weather front. Ref: data/Clocks.txt.
4. Declarative HUD screens: keep widget list with position, pivot and draw order; change to JSON with phone-width anchors. Ref: data/ui/Automap.txt.
5. Light binning for many torches: keep per-bin light lists; change to screen-tile bins. Ref: data/shaders/LightBinning.comp.

## Cross-link to our cell topics
- hud-ui: data/ui/*.txt layout format (direct analogue).
- vfx and animation: screen-space animation pass and light binning in data/shaders/.
- zones and time of day: data/Clocks.txt schedule.
- sound: data/audio/*.txt definitions (names only, contents not read).
- camera, spawns, loot: no asset files found for these topics in the repo.

## Not read
- data/audio and data/exe contents; icon and preview pixels; samples pixels; OBJ files other than WallWest.obj; shader bodies beyond the quoted lines; data/ui files other than Automap.txt; docs/ and packaging folders; eawpats; original Arena data (not in repo).
