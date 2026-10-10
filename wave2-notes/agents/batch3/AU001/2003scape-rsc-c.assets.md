# 2003scape-rsc-c: asset audit (AU001)

Read from the VPS tree only (read-only). Nothing downloaded, run or viewed as an image. Counts from `find`; PNG sizes from IHDR headers. `_RESTRICTED-NOTE.txt` is not present in this donor. Treat this donor as restricted anyway, because it ships original game data (see below). Descriptions are high level on purpose.

## Licences (as the files say)
- Code: GNU AGPL v3. `COPYING` line 1 is the AGPL v3 title. `README.md` lines 352-365 "license": "Copyright 2024 2003Scape Team" (line 353) and the AGPL v3 grant (line 356).
- Assets: no asset licence file in the repo. No LICENSE, NOTICE or CREDITS file for `cache/`, `gfx/`, `texture-pack/`, `3ds/`, `wii/`, `switch/`, `web/`, `win/`.
- The `cache/` folder holds archive files named like the original RuneScape Classic client data (`*.jag`, `*.mem`). The README says to distribute the client "with ./cache directory" (line 67) and that the client decompresses "cache archives" (line 348). `texture-pack/texture-pack.js` reads those archives by name (lines 156, 169, 183). The repo states no licence for them.
- The client code has a "jagex logo" comment (`src/mudclient.c` line 822). That is a code comment; it is not a licence.

## Rights-holder status (repo files only)
- Code: 2003Scape Team (2024), AGPL v3.
- Game data in `cache/`: the files and the texture-pack script read original game archives. The repo gives no licence or permission for them. Status per the files: uses original game data; rights holder not named in the repo beyond the "jagex" references. Treat as proprietary.
- Derived atlases in `cache/textures/` and `gfx/` are generated from those archives by `texture-pack.js` (it packs sprites from the archives into atlases). The repo does not say whether those atlases carry the same status; treat as derived from the archives.
- No leak or decompile is claimed in the repo files. Do not look for mirrors.

## Asset inventory (counts from find)
- `cache/` (3.5 MB): 12 `.jag` archives and 4 `.mem` files, plus a `models36.jag.backup`, plus 14 small shader files (`flat.*`, `game-model.*`, `pick.webgl.*`).
  - Archive names (names only): config85, entity24, entity8, filter2, jagex, land63, maps63, media58 (+ compact), media59, models36, textures17. Sounds: sounds1.mem. Land and maps: land63.mem, maps63.mem.
  - Largest: models36.jag about 367 KB; entity8.jag about 317 KB; entity24.jag about 244 KB.
  - `cache/textures/`: 7 PNG atlases, 1024x1024 RGBA (entities_0-4, model_textures, sprites), about 1.2 MB total.
- `gfx/` (2.1 MB): 8 PNG and 7 `.t3s` index files. Atlases: entities_0-4 (1024x1024 RGBA), model_textures (1024x1024 RGBA), sprites (1024x1024 RGBA), game_top (400x240 RGB). The `.t3s` sidecars are index files (35-39 bytes each).
- `texture-pack/`: `texture-pack.js` (about 26 KB) packs sprites and textures into atlases with a MaxRects packer (line 10 import) and writes entity templates (`entities.template.c/.h`).
- Platform folders: `3ds/` 2 PNG, `wii/` 3 PNG (plus YUV `.c` generated from PNG per README), `switch/` 1 PNG, `web/` 1 PNG, `win/` 1 PNG icon source, root `3ds-cia.png` (27 KB; name suggests the 3DS .cia build, not opened).
- One `.wav` file (location not checked).
- Text: `README.md` (about 11 KB), `options.ini` defaults embedded in `src/options.c`. No quest or lore text in the repo (not checked beyond names).
- Maps, dialogue and item text live inside the `.jag` archives. They are not extracted in the repo. Not read.

## Class per group
- Code (C source, AGPL v3): code class, out of scope here.
- `cache/*.jag`, `*.mem` (original game archives, no licence in repo): class C (proprietary or unclear). Do not reuse. Do not extract for use.
- `cache/textures/*.png` and `gfx/*.png` (atlases derived from the archives): class C.
- Platform PNG and banner (`3ds-cia.png`, `wii`, `switch`, `web`, `win`): class C, origin not stated.
- Shader GLSL files in `cache/`: code; licence follows the repo (AGPL), not an asset class.
- Class A and B: none found in the repo.
- Class D (no usable content): none, because the archive files are present (but they are class C).

## Inspiration (own words; high level, no constants or colour values)
- Atlas packing as a build step: a script packs many sprites and textures into a few large 1024 atlases with a rectangle packer and writes a small index beside each sheet. This keeps draw calls low and is a clean build pattern for our own art.
- Lighting atmosphere by toggle: underground flicker, fog-of-war veil and roof hiding are simple on/off options on the lighting and occlusion code (`src/options.c`). These are cheap mood tools that do not need new art.
- Hidden-roof rule: roofs are shown unless the player is inside a building. A simple rule of this kind is a common, clean occlusion fix.
- Ground items as small 3D models: the README (line 14) says ground items are 3D models "based on runescape 2 beta models". The repo says nothing more; treat the idea (drops as small 3D models on the floor) as the inspiration, and build our own models.
- A cycling-colour text effect for highlights, at a low target frame rate (option in `src/options.c`): a cheap, shared text effect for rare-drop or chat highlights.
- Low-end interlaced mode (README line 36, F1 mode): render only every second scanline as a cheap fallback for weak hardware.
- Touch controls: hold-to-right-click and drag-to-zoom with delays (README, touch options): a clear mobile input pattern.

## Inspiration briefs
See `2003scape-rsc-c.assets.json` (`briefs`). These are config and README descriptions. The art was not viewed.

## Cross-link to our cell topics
- camera: drag-to-zoom and touch camera controls (README, options); roof hiding is an occlusion rule.
- zones: underground flicker and fog-of-war are zone moods.
- spawns: none in the repo (server-side).
- loot: ground items as 3D models; rare-drop text effect.
- hud-ui: interface scaling, bank interface, compass menu (README).
- vfx: flicker, fog-of-war, cycling text effect.
- animation: model shaders in `cache/` (not read).
- sound: `sounds1.mem` (not read).

## Not read
- No image opened or viewed; no archive opened; `.jag` and `.mem` contents not read beyond names and sizes.
- `texture-pack.js` read only at the lines cited above.
- GLSL shader contents not read.
- `options.ini` defaults in `src/options.c` read only as names of toggles.
- The one `.wav` file not identified.
- Platform PNG contents not opened.
