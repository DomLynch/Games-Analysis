# ASSET AUDIT: FWGS-xash3d-fwgs (AU022)

Donor root: /mnt/frankendom-donors/FWGS-xash3d-fwgs/ (VPS, read-only). Receipts: receipts.tsv (verified, 51 rows across 4 donors).

## Summary
- Code licence: not one stated licence. No LICENSE file. Headers: GPL text in 339 .c/.h files (engine/server/sv_main.c:7 says version 3), BSD text in 4, and SPDX BSD-3-Clause in public/getopt.c:4.
- Asset licence: none stated. The engine ships without game data; the Half-Life valve folder is user-supplied (README.md:34, :37).
- Rights status (from README only): fork of an original Xash3D Engine by Unkle Mike (README.md:11). Game resources are proprietary Half-Life data the user copies in.
- Best class: C. Only icons and documentation screenshots exist, with no licence line. Game art, models, maps and audio are absent (class D).

## Which half was read
- Engine half: top-level layout, engine/, common/, ref/, filesystem/, public/ listed; public/getopt.c and engine/server/sv_main.c header lines read; ref/gl shader include sampled.
- Game-logic half: engine/server and pm_shared/ listed only. The README says the HLSDK fork is in the repo (README.md:36). Not read.
- Game data half: not in the donor tree (no valve/ folder at top level). README.md:37 says the user supplies it.

## Asset inventory (what exists)
| Group | Path | Count | Class |
|---|---|---|---|
| Game data (valve/) | not in tree | 0 | D |
| App icons | game_launch/icon-xash-material.png/.ico, engine/platform/nswitch/icon.jpg, psvita sce_sys icons, android mipmap ic_launcher | 16 | C |
| Doc screenshots | Documentation/images/*.jpg | 8 | C |
| Shader source | ref/gl/gl2_shim/*.glsl.inc, ref/gl/vgl_shim/vgl_shaders/*.cg.inc | 4 | C (code) |

Searched extensions (png, jpg, bmp, tga, wav, ogg, mdl, spr, bsp, wad, ttf, ico, svg): 24 matches, all icons or doc screenshots. No sprites, models, maps, audio or fonts are in the tree.

## Licence detail
- public/getopt.c:4 `SPDX-License-Identifier: BSD-3-Clause` (receipt).
- engine/server/sv_main.c:7 `the Free Software Foundation, either version 3 of the License` (receipt). Header counts from grep: 339 files with GNU GPL text, 4 with BSD text.
- No LICENSE, COPYING, NOTICE or CREDITS file in the tree, checked to depth 4.

## Inspiration (own words; category-level for class C)
1. Touch-control layout editor with a snap grid, named profiles and a per-button parameter panel (Documentation/touch-controls.md:11). Worth recreating for our 375-wide HUD. Screenshots not opened.
2. Controls as data: HUD layouts ship as a config file, not code (Documentation/touch-controls.md:5).
3. Texture override tiers: per map, common, decals, per model (Documentation/hd-textures.md:3-9).
4. Content kept outside the engine: a separate game folder is loaded at run time (README.md:34-37).
5. One shader body, several GL dialects via a version-switch preamble (ref/gl/gl2_shim/fragment.glsl.inc:1-5).

## Briefs
None. The donor has no creatures, items, armour, zones or effects in the tree. Nothing usable, as the brief rule allows.

## Cross-link to our cell topics
- hud-ui: touch-controls doc and editor screenshots (Documentation/).
- vfx: the GLSL shim is a technique reference only.
- camera, zones, spawns, loot, animation, sound: no assets in the tree.

## Not verified
- Half-Life game data (not present).
- Game-logic C in engine/server, engine/client and pm_shared (listed only).
- 3rdparty submodule contents (mainui and extras have only a wscript and an xash-extras directory listed).
- Renderer C in ref/soft and ref/gl.
- All binary images (listed and sized, not opened).
- No full-tree search for string or data tables.
