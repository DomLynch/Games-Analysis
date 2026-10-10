# CytopiaTeam-Cytopia: asset audit (AU012)

Source tree: /mnt/frankendom-donors/CytopiaTeam-Cytopia/ (read-only on VPS). Half read: client (the whole game is one project; no server half in this donor). No matching name in the top-level box listing.

## Licences (as the files say)
- Code: GPL-3.0-only. data/setup/net.cytopia.Cytopia.metainfo.xml line 8 "<project_license>GPL-3.0-only</project_license>". license.txt is the GPL v3 text (line 1).
- metainfo.xml line 7: "<metadata_license>CC0-1.0</metadata_license>". The file does not say what this metadata licence covers.
- Art, music, sound effects, TileData/UI JSON, translations: no licence line found in the tree. credits.txt names the artists (line 17 "=====Graphics Artists=====", line 18 "Kingtut 101 (Lead Artist, Community Manager)") and composers (line 30 "MB22 (OST, Sound Effects, Ambient Noise)") but states no licence or copyright holder.
- README line 18: "An original soundtrack, ambient noises, and sound effects made mostly by MB22".
- Fonts: data/resources/fonts/Licenses/PressStart2P.txt line 1 "Copyright (c) 2012, Cody "CodeMan38" Boisclair" and line 2 "This Font Software is licensed under the SIL Open Font License, Version 1.1." The Johste font file (license.txt) names the OFL in its header block. Alpha Beta and Edit Undo: "Created by Brian Kent" (alphabeta.txt line 2). pixelFJ8pt1.txt line 2 "downloaded from flashjunior.ch". sources.txt lists 1001fonts URLs.

## Asset inventory (data first)
- Data tables (primary): data/resources/data/TileData.json (about 827 id lines, with tile name, category, description, author); TerrainGen.json (tree species bands); UIData.json and UILayout.json (button textures and layout); settings.json.
- Art: 907 PNG under data/resources/images/: buildings 625, decoration 80, flora 81, terrain 21 plus blueprint, terrain_shorelines 17, roads 16, ui 47, zones 10, selection 3, app_icons 7, underground 1.
- Music: 13 OGG (several with _mono copies). Sound effects: 35 OGG (menu 20, terrain 14, game 1).
- Fonts: 14 TTF in data/resources/fonts/.
- Translations: 23 .po plus Cytopia.pot under data/languages/.
- Pixel sizes and palettes not read. TileData author counts (grep): RockFort 399, Kingtut 101 276, Folesnaid 46, Kekman 30, others smaller.

## Classes
- OFL font (Press Start 2P): B (OFL conditions, including the reserved font name).
- Art, music, SFX, JSON, translations: C (no licence line).
- Other fonts: C until each note is read in full.
- Rights holder: unknown for art and music.

## Inspiration (own words)
- Zone density tiers: res1-3, comm1-3, ind1-3 in images/zones/. Three tiers per zone type make growth readable.
- Forest from three density bands (light, medium, dense) with four species each (TerrainGen.json, the Showcase block). A layered planting rule.
- Shoreline edge set: 17 PNG in images/terrain_shorelines/ give water boundaries their own tiles.
- Menu sounds: short positive and negative pairs with variants and mono copies (sound effects/menu/).
- Buttons with default, clicked and pressed textures set in UIData.json.
- A decoration tile premise: an abandoned woodland ruin with unknown builders (TileData.json, id BD_1x1_AbandonedBuildings). Summarised only; rewrite in our own words.

## Briefs (C-class donor: category-level only)
1. Three-tier neighbourhood block. Keep: three tiers per zone, one palette per zone. Change: our roof shapes and colours, our tier steps. Ref: data/resources/images/zones/res1.png, res2.png, res3.png (filenames only).
2. Forest density band. Keep: three density bands, short species list per band. Change: our species and silhouettes, our band thresholds. Ref: data/resources/data/TerrainGen.json (line 5 tree_pine_light and the medium and dense lists).
3. Shoreline edge set. Keep: separate edge tiles for water boundaries. Change: our palette and bevel, edge count. Ref: data/resources/images/terrain_shorelines/ (filenames only).
4. Positive and negative select pair. Keep: one positive and one negative sound, mono copies for spatial use. Change: our instrument and pitch. Ref: data/resources/audio/sound effects/menu/Positive Select.ogg and Negative Select.ogg (not opened).
Rule for every brief: recreate as a clearly distinct original, never a copy.

## Cross-link
Zones and spawns: zone sprites and TileData zone categories. Loot: none found (not read). HUD-UI: UIData.json buttons and the UI art folder. Sound: menu and terrain sets. Camera, animation, VFX: not checked.

## Not read
See not_read in CytopiaTeam-Cytopia.assets.json (binary art and audio contents, font glyphs, translations, full font licence notes, lilliput steps.pdf).
