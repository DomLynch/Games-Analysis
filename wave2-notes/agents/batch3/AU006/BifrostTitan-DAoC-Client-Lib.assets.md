# BifrostTitan-DAoC-Client-Lib (asset audit, AU006)

Donor root (VPS, read-only): /mnt/frankendom-donors/BifrostTitan-DAoC-Client-Lib/
Scope: C++17 library that reads the non-rendering data layer of a commercial MMO client (DAoC). 55 files: 34 cpp, 16 h, README, LICENSE, CMakeLists, tests and one tool. No asset files.

## Licences (as the files say)
- Code: LICENSE:1 "MIT License". LICENSE:3 "Copyright (c) 2026 Nathan Martell".
- Assets: none in the repo. The library reads game data at runtime from a client directory (README.md:5 "client directory discovery"). The repo does not state the licence of that data.

## Rights-holder status (repo files only)
- Code: copyright line for Nathan Martell (MIT).
- Game data: unknown. The README does not name who owns the client data it reads, and the repo ships none of it.

## Asset inventory
- In repo: no art, models, audio, maps or text data. Only .cpp, .h, CMake, README, LICENSE.
- External, read at runtime (names from src/zone_geometry.cpp; not in repo, not inspected):
  - zone packages named dat###.mpk (src/zone_geometry.cpp:19 builds the name)
  - sector.dat (line 53), zonejump.csv (line 130), nifs.csv (line 140), fixtures.csv (line 146), bound.csv (line 135), city.csv (line 191), dungeon.water.csv / skycity.water.csv (line 185), terrain.pcx (line 201)
  - craft and text tables (text_data, craft_recipes, tree replacement tables)

## Class per group
| group | path | class | reason |
|---|---|---|---|
| code | src/, include/, tests/, tools/ | A (MIT) | MIT: adaptable with the licence notice (per the addendum rule: MIT code may be adapted) |
| external client data | not in repo | C | licence not stated; do not ship or copy |
best_class: D for the repo (no non-code content). External data would be C.

## Inspiration (own words, no copied text)
- A zone is a folder of small named tables (jump links, a boundary box, terrain NIF list, fixtures, water, city). One loader per table (src/zone_geometry.cpp, lines 130-201). Keep the zone as a data bundle with one table per concern.
- Zone exits are data rows: a jump point struct and a jump table per zone (include/daoc_client_lib/jump_point.h:12; zonejump.csv). Good for zone-to-zone travel without code.
- A tree swap map: a real model name maps to a replacement model and bark and leaf textures, with cluster lists for variants (include/daoc_client_lib/tree_replacement_map.h:12-36). Use it for themed trees per zone.
- Terrain height is read from a PCX image per zone (src/zone_geometry.cpp:201; terrain_height_map.h). Authoring height from an image is a quick way to make many zone heightfields. Sampling code not read.
- Water is a separate geometry layer (dungeon_water.h, river_geometry.h), not baked into terrain. Keep water as its own layer for our zones.
- Recipes are plain structs of ingredients and a result (craft_recipes.h:11 and :21), with tests (tests/craft_recipes_tests.cpp). A loot and crafting table in data.
- Parsers collect warnings rather than failing on one bad row (tree_replacement_map.h:31 warnings()). Good for data-driven zone loading.

## Inspiration briefs
See the JSON "briefs" key (3 briefs). No creatures, items or armour visuals in this donor.

## Cross-link to our cell topics
- zones: strongest match (zone bundle, jump rows, water layer, terrain from image).
- loot: recipe struct and recipe tests.
- camera, spawns, vfx, sound, hud-ui, animation: nothing read; the library is non-rendering.

## Not read
- Function bodies in src/ beyond the lines cited above.
- tests/ bodies (names only).
- tools/zone_exporter.cpp.
- The DAoC client data itself (not in repo, not obtained).
