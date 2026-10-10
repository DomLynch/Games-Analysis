# PixelGuys-Cubyz (assets audit, AU042)

Donor/Licence: voxel sandbox engine and game in Zig. Code licence GPL-3.0 (root LICENSE, version 3 text). No separate asset licence file, no CREDITS or NOTICE. The 'licence' and 'credit' hits in assets/cubyz/wordlist are dictionary words.
Rights holder: partly stated. README names the original creators (2018) and the current maintainer (lines 22, 24). The files do not name an owner of the art, models, sounds or word list. Asset class C overall; D for audio and fonts (none present).
Halves: server and client both sit in src/ (src/server, src/client). Read: data and assets, plus src/items.zig and src/assets.zig loaders. Neither half read in full.

## Asset groups
- Game data (zon tables): about 957 .zig.zon files across assets/cubyz (blocks 519, items, tools, recipes, biomes 35 entries, cave_layers, structure_tables, world_presets 3, entity_models, materials). Class C. Data first: this is the table set that holds item and material stats, tool part grids, structure chances and creature model ids.
- 2D PNG: block, tool, UI and particle textures (1129 PNG in total with palettes). Tool sprites 16 x 16 px (header read). Class C.
- Palettes: assets/cubyz/materials/*_palette.png (copper, gold, iron, silver and others; not counted). Class C.
- Structure blueprints: assets/cubyz/sbb/<family>/ (670 .blp files: tree 347, phantasmal 112, mushroom 68, rare 39 and others). Binary, not opened. Class C.
- 3D models: 35 .obj (blocks and props), 6 .glb (creatures). Not opened. Class C.
- Entity textures: 6 PNG (cubert, missing, moffalo, snail, snale, snela). Class C.
- Shaders: 24 frag, 23 vert, 2 comp, 2 glsl. Code, not read. Class C.
- Word list: assets/cubyz/wordlist, 2047 lines, origin not stated. Class C.
- Logos and backgrounds: logo.png, logo.icns, default_background.png, star.png (header only: 15000 x 1 px RGBA). Class C.
- Audio: none under assets/. Class D.
- Fonts: none under assets/. Class D.

## Inspiration (own words, category level where needed)
1. One shape, many metals: gold, copper, iron and silver share one texture and differ by a palette PNG named in the item file (copper_ingot.zig.zon line 4; loader src/items.zig line 42). For gold-plated armour: one plate shape, a gilt ramp with dark seams, a low roughness for a sharp highlight. Keep the palette swap; change the ramp hues and seam pattern.
2. Material as a stat block: gold has durability 400, massDamage 14.0, swingSpeed 0.25 and roughness 0.05 (gold_ingot.zig.zon lines 2-10). Tags (.metal, .precious) sit beside the stats. Idea: rarity or metal class as tags plus a few numbers.
3. Safe default for roughness: src/items.zig line 78 floors the value at 0 and uses 1.0 when it is missing. Idea for our material defaults.
4. Tools from a part grid: sword.zig.zon has a 5 x 5 disabled grid and a 5 x 5 optional grid (lines 3-16) and a matrix that maps a material stat to a tool stat. Idea for crafted weapons, outside the fight loop.
5. Rare set piece with a chance: meteorite.zig.zon sets chance 0.00002 (line 4), roughly 1 in 50000 per the file's number. Idea for row 23 zones: rare set pieces as data with a chance.
6. Small creature data: snail.zig.zon is four fields (model id, default texture, height 1, coordinate system). The look is a model plus a texture id. Idea for row 7 (creature actor).
7. Layered biome and cave data: cave_layers holds at least five layer files and biomes/ 35 entries. Idea for zone-as-data: a zone is a stack of layers with rules.
8. Tool icons with a per-part overlay: a base 16 x 16 sprite and an overlay per tool (tools/sword_overlay.png and others). Idea for weapon variants readable at 375 px: base silhouette plus a small coloured overlay.

## Briefs (recreate as clearly distinct originals; never copies)
- Gilt plate armour (own label): keep one greyscale plate texture, a palette ramp and a low roughness; change silhouette (our own pauldron and skirt), ramp hues (warm brass) and the seam pattern. Ref: assets/cubyz/items/gold_ingot.zig.zon lines 2 and 10; src/items.zig line 42.
- Part-grid hewing tool (own label): keep a mask of present parts, a stat matrix and a per-part overlay; change the part set, tag names and the silhouette. Ref: assets/cubyz/tools/sword.zig.zon lines 2-16; assets/cubyz/tools/sword_overlay.png.
- Meteor crater set piece (own label): keep a very low chance and one placement mode; change crater shape, palette, and make the centre an arena rather than loot. Ref: assets/cubyz/structure_tables/meteorite.zig.zon line 4; assets/cubyz/sbb/meteorite/ (folder listing only).

Readability at 375 px, sound and silhouette: not read for the creatures (headers and names only); no audio in this donor.

## Not read
See the .assets.json not_read list (the 670 blueprints, every PNG, OBJ and GLB body, shaders, most zon files, the server and client halves beyond the two loaders, docs/, mods/). The Java predecessor repository named in the README is not verified in the box.
