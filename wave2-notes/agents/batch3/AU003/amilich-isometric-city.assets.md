# Asset audit: amilich-isometric-city (AU003)

Class: **C** for all art groups. The code is MIT. The art is large (about 339 MB under public/assets, plus screenshots and save states). The repo has no asset-specific licence, and a skill doc says the sheets are produced with an image-generation tool, so the status of the art is unclear.

## Licences (as the files say)
- Code: MIT. LICENSE line 1 "MIT License", line 3 "Copyright (c) 2025 amilich". package.json line 5 "license": "MIT". README line 76 "Distributed under the MIT License."
- Assets: no asset-specific licence. The MIT statements are about the software. README line 20 says "Made with Cursor."
- Generation: .cursor/skills/isometric-asset-sheets/SKILL.md line 8 says sprite sheets are generated "using the GenerateImage tool". Line 15 gives the sheet spec "6 rows x 5 columns". The terms of that tool are not in the repo.
- Rights holder: individual author (amilich) per LICENSE. Whether any art is original work is not stated.

## Asset inventory (counts from ls/du; images not visually inspected)
- public/assets/buildings/ : 24 sheets in PNG and WebP (48 files), about 65 MB, mostly 2048x2048. Class C.
- public/assets/ages/ : 5 era sheets (classics, medeival, enlightenment, industrial, modern), 2048x2048 PNG, about 41 MB. Class C.
- public/assets/coaster/ : 12 sheets (rides, shops, stations, queue, trees, theme_classic, theme_modern, etc.), 2048x2048 PNG, about 85 MB. Class C.
- public/assets/sprites_red_water_new*.png/.webp : 42 files (21 base names) for variants, planes, vehicles and services, 1.5 to 8.5 MB per PNG. Class C.
- Water sets water.png, water2.png, water3.png (+ WebP) and mansion_alternates.*. Class C.
- public/games/IMG_6902 to IMG_6911 (9 PNG screenshots, about 26 MB). Class C, origin not stated.
- public/example-states/ (12 JSON save states, about 47 MB). Class C.
- public/_gt/ (8 translation JSON files, about 146 KB). Class C.
- No audio files found in the repo.

## Inspiration (own words)
- Sprite sheets as atlases with a type-to-cell map (buildingSprite.ts lines 62-74).
- State variants on sheets with the same grid (skills/adding-asset-sheets.md line 28).
- Explicit priority list for which sheet shows (buildingSprite.ts line 64 "Priority order:" and line 74).
- Red key-colour cut-out with a distance threshold at load (imageLoader.ts lines 7-8). Prefer alpha in our build.
- One city repainted for five eras, and one ride family in two theme skins.
- Seaplane frames in a planes sheet row with wakes and contrails (drawAircraft.ts line 948).
- Typed particle effects: smog, clouds, fireworks (effectsSystems.ts line 2).
- Artist recipe: 6x5 grid, solid background, centred sprites (SKILL.md line 124).

## Briefs
1. Era-stepped civic buildings: keep one family per era with the same grid; change to our own eras and silhouettes. Ref: public/assets/ages/.
2. Seaplane with wake and contrail: keep state frames and overlays; change to a flying boat. Ref: public/assets/sprites_red_water_new_planes.png row 4 (drawAircraft.ts line 948).
3. Theme-park ride sheets in two skins: keep one grid and one flag; change to three themes with other materials. Ref: public/assets/coaster/theme_classic.png and theme_modern.png.
4. Red-key sprite load: keep flat key colour and load-time threshold; change to alpha source. Ref: src/components/game/imageLoader.ts lines 7-8.
5. Abandoned and construction variants: keep state-keyed variants on the same grid; change to a weathering overlay. Ref: public/assets/sprites_red_water_new_abandoned.png and _construction.png.

## Cross-link to our cell topics
- vfx: effectsSystems.ts, smog and firework sheets.
- animation: seaplane and variant frames.
- zones: era and theme sheets.
- hud-ui: sidebar and top bar files named, not read.
- sound: none in repo.
- camera, spawns, loot: not read in depth.

## Not read
- Pixel content of every image (sizes from headers and ls only); _gt JSON contents; example-states contents; screenshot contents; skill doc bodies beyond grep hits; .cursor/CLOUD.md, .locadex/LOCADEX.md, AGENTS.md, CLOUD.md; scripts/*; src/ beyond quoted lines; any image-generation service terms (not in repo).
