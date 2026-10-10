# CleverRaven-Cataclysm-DDA: asset audit (AU010)

Root on VPS: /mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/ (read-only, not copied)

## Licences (as the files say)
- Code: CC BY-SA 3.0 Unported, LICENSE.txt line 1. README line 64 summarises code and content as free to use under CC BY-SA 3.0. README line 65: some bundled code is under other software licences.
- Art and content: CC BY-SA 3.0 project-wide (LICENSE.txt line 1). doc/TILESET.md line 687: all tileset art must be CC BY-SA 3.0 or compatible for inclusion.
- Fonts: unifont.ttf is SIL OFL 1.1 and GPL v2+ with font embedding exception (LICENSE.txt line 5). Terminus is SIL OFL (LICENSE.txt line 9; LICENSE-OFL-Terminus-Font.txt).
- LICENSE-Apache-Robot-Font.txt is the Apache 2.0 text. It does not name Roboto-Medium.ttf in the lines read, so the licence for that font is not stated.
- Mod art: no per-mod licence file found by name search, except data/mods/hunvre/credits.txt (a CC BY 2.0 Hubble image, an OFL font).

## Rights-holder status
Community open-source project (README line 64: over 1000 volunteers). No single rights holder named for the art. Third-party items name their own holders.

## Asset inventory (counts from find; sizes from ls)
- gfx/ASCIITileset: ASCIITiles.png (160x50 px, 10x10 cells), fallback.png, tile_config.json, tileset.txt. Class B.
- gfx/Larwick_Overmap: overmap.png (256x416 px), overmap_tall.png, fallback.png, tile_config.json (210 KB). Class B.
- gfx/loading_screens: two PNG (1365x1024, 1920x1460). Class B (project licence; artists not named).
- data/mods/*: about 19 PNG and OGG/TTF across mods (loading images, mod art). Class C (no per-mod licence found).
- data/font: unifont.ttf, Terminus.ttf, VecTerminus12Medium.otf (class B, OFL); Roboto-Medium.ttf (class C, licence not stated); two map-font PNG (class B).
- data/sound/Menu_Sound_Test: two OGG (menu_move 6.5 KB, menu_error 7.4 KB), empty musicset playlist. Class B.
- data/json: about 3,320 JSON files (monsters, items, NPCs, mapgen, speech 4,071 lines, dreams 948 lines, names). Class B text.
- data/title (16 variants), data/credits/en.credits. Class B text.
- data/raw/color_themes (about 25 named palette JSON). Class B.
- data/screenshots: 4 PNG (ultica showcase 1.8 MB; its tileset is not in the repo). Class B for project shots; C for the Ultica showcase until checked.
- Repo-wide: 75 PNG, 4 SVG, 3 TTF, 1 OTF, 2 OGG, 6,690 JSON. No OBJ, FBX, GLB, BLEND or MP3 found, so no 3D models or music in the repo.

## Best class
B (share-alike) for the project art, fonts (OFL) and text. C for Roboto, mod images and the Ultica showcase.

## Inspiration (own words)
- Creature progression by text: fungus_zombie.json gives several description variants for one undead as it changes (lines 6, 20, 37, 79). A fungal walker with three visual stages.
- One glyph per creature family: mi-go entries use one symbol and a colour per variant (mi-go.json lines 15-16, 67-68, 125-126).
- Lit tiles as twins: tile_config.json lists lighting_*_light and lighting_*_dark ids (line 11). A cheap light and shade without a shader.
- Fallback sheets for missing art (fallback.png, overmap_tall.png).
- Whole-UI palettes as one file (data/raw/color_themes).
- A two-blip UI sound set (soundset.json).
- Credits as a file (data/mods/hunvre/credits.txt), a model for our own credits.

## Briefs (see .assets.json for full fields)
- Stalk-crowned fungal walker (fungus_zombie.json).
- Single-glyph horror (mi-go.json).
- Lit-tile twin ladder (tile_config.json line 11).
- Region-map twin sheets (overmap_tall.png, fallback.png).

## Cross-link to our cell topics
- hud-ui: palette themes and the two-blip UI sounds are worth a look.
- vfx: the lighting-twin approach is a low-cost light model to compare with our shader plan.
- spawns and zones: the overmap sheets and the monster description stages are worth a look for zone and spawn art direction.
- camera, loot, animation: no relevant asset found in the files read.

## Receipts
Receipts: receipts.tsv in this folder (rows for CDDA; all verified with verify_receipts.py).

## Not verified
Listed in CleverRaven-Cataclysm-DDA.assets.json under not_read. In short: no image, audio or font opened (only PNG header dimensions); only two monster files read by grep; mod art found by name only; the full OFL and Apache texts not read.
