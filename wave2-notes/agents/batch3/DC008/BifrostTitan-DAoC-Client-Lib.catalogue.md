# BifrostTitan-DAoC-Client-Lib (design catalogue, DC008)

Donor root (VPS, read-only): /mnt/frankendom-donors/BifrostTitan-DAoC-Client-Lib/ . Paths below are relative to that root.
Asset audit used first: AU006 (`/private/tmp/p2/wave2-haiku/batch3/AU006/BifrostTitan-DAoC-Client-Lib.assets.md`). Not repeated here.

Rule for every idea below (Dom, 2026-10-11): recreate as a clearly distinct original, never a copy. Each entry names the trait KEPT and the trait CHANGED, at about 20-30% resemblance in mood or mechanic only. This donor is a non-rendering data library with no art, no creatures and no items. Inspiration is CATEGORY-LEVEL only (zone data design), never instance-level data from the game client.

Licence note (as the files say): LICENSE:1 "MIT License", LICENSE:3 "Copyright (c) 2026 Nathan Martell". The repo ships no game data. README.md:5 says the library reads an existing client directory at runtime. The repo does not state the licence of that data. Not legal advice.

Which half I read: the CLIENT DATA READER half only (`include/`, `src/`, `tests/`, `tools/`). The matching game data (the zone packages and tables the library reads) is NOT in the box. The sibling native NIF library is a separate donor (`BifrostTitan-daoc-niflib`, AU006 audit only; not read in DC008; DC009 has it).

## Counts (from ls, find and grep)
- creatures: 0. No creature data in the repo.
- classes: 3 factions. The library names three realms in a fixed array (`src/craft_recipes.cpp:240` realm array of 3; the names are at `src/craft_recipes.cpp:254` and are not copied here). Craft professions are a separate count (19, `src/craft_recipes.cpp:15`), not classes.
- weapons: 0.
- gear_sets: 0. Material level and item level are fields on recipes (section 4).
- zones: 4 zone types (`include/daoc_client_lib/zone_geometry.h:18-24`: terrain, city, dungeon, sky city). Zone instances are data-driven and not counted (the zone packages are not in the repo).

## 1. Creatures and beasts
None in the repo. The library parses zone and craft data only. The `tests/` and `tools/` files do not add creature data (`tools/zone_exporter.cpp` NOT read in full).
Top 8 striking: not applicable. Nothing to list without inventing it.

## 2. Classes, races and factions
- Three realms as a fixed set of faction slots (`src/craft_recipes.cpp:240-254`). Each realm has its own recipe table in the binary (`src/craft_recipes.cpp:257-315`).
- Progression shape: none for characters. The library does not read character classes.
- Professions: 19 craft professions, each with 200 category slots (`src/craft_recipes.cpp:15-16`, `:140-144`, `:273`). That is a crafting progression, useful as a pattern for skill trees.

## 3. Weapons
None in the repo (no weapon data).

## 4. Armour and gear (tiers by data, not visuals)
Recipe struct carries a skill level, an item level and a material level (`include/daoc_client_lib/craft_recipes.h:21-30`; the binary reader reads `material_level` at `src/craft_recipes.cpp:50`). Ingredients name a base material and a count, and may point to a sub-recipe (`include/daoc_client_lib/craft_recipes.h:11-18`).
Top 5 striking (for tiering by data):
1. label: "Material-level gate". why: a recipe tier is set by a material level plus skill level, not by a look. keep: two-number gate for a craft tier. change: names, count and the gate formula. ref: `include/daoc_client_lib/craft_recipes.h:21-30`.
2. label: "Sub-recipe chain". why: an ingredient can point to another recipe, so one item is built from a tree of crafts. keep: nested craft chain. change: the tree shape and depth. ref: `include/daoc_client_lib/craft_recipes.h:11-18` (sub_recipe_id).
3. label: "Base-material swap". why: an ingredient may name a base material, an optional field. keep: optional base material on an ingredient. change: material families. ref: `include/daoc_client_lib/craft_recipes.h:11-18`.
4. label: "Fixed-slot profession table". why: 19 professions times 200 categories, a fixed grid read from a binary table. keep: a fixed grid of skill categories. change: the counts. ref: `src/craft_recipes.cpp:15-16`, `:140-144`.
5. label: "Recipe tests". why: a test file per data rule. keep: a test next to each table reader. change: none. ref: `tests/craft_recipes_tests.cpp`.

## 5. Zones and dungeons
Zone types (`include/daoc_client_lib/zone_geometry.h:18-24`): terrain (0), city (1), dungeon (2), sky city (4). The chooser maps a zone id to a type from zone data (`src/zone_geometry_chooser.cpp:38`), and the zone is a directory named by id that holds a package (`src/zone_geometry.cpp:19` builds the package name from the zone id).
Dungeon archetype: water, geometry and terrain are separate layers (see section 6). Hazards: none read in the repo (no hazard data, the library reads geometry and water only).
Top 5 striking:
1. label: "Zone as a data bundle". why: one zone is a folder of small named tables, one loader per table. keep: one bundle per zone with one table per concern. change: table names and the set of concerns. ref: `src/zone_geometry.cpp:130-201` (loaders per table, as listed in AU006).
2. label: "Zone exit rows". why: a jump point is a row with a position, heading and a list of zones it is also in. keep: zone-to-zone exits as data rows. change: the fields. ref: `include/daoc_client_lib/jump_point.h:12-22`; `include/daoc_client_lib/zone_records.h:12`.
3. label: "Heightfield from an image". why: terrain height is read from a PCX image per zone, a quick way to make many heightfields. keep: image-authored height. change: the image format and the sampling. ref: `src/zone_geometry.cpp:201` (terrain image name), `include/daoc_client_lib/terrain_height_map.h:11` (class). Sampling code NOT read in full.
4. label: "Water as its own layer". why: water is a separate geometry layer, not baked into terrain. keep: water layer per zone. change: shape and rules. ref: `include/daoc_client_lib/dungeon_water.h:17-22` (corners and translation); `include/daoc_client_lib/river_geometry.h:13-19` (bank records).
5. label: "Warn, do not fail". why: parsers collect warnings for one bad row and keep loading. keep: loud warnings, no hard fail on one row. change: the warning format. ref: `include/daoc_client_lib/tree_replacement_map.h:31` (warnings), `src/tree_replacement_map.cpp:123` (warning push).

## 6. Item and effect looks worth recreating (as patterns)
- Tree swap per zone: a real model name maps to a replacement model with bark and leaf textures, and cluster lists for variants. `include/daoc_client_lib/tree_replacement_map.h:12-22`; `src/tree_replacement_map.cpp:107-119`. Recreate as: themed trees per zone.
- Water as a separate layer with corner quads: `include/daoc_client_lib/dungeon_water.h:17-22`.
- River banks as paired strips of three points: `include/daoc_client_lib/river_geometry.h:13-19`.
- NIF placement metadata (the sibling library reads it): `include/daoc_client_lib/nif_geometry.h:12`.

## 7. Inspiration for Frankendom
1. name: "Zone Bundle". idea: each zone is a folder of small tables, one per concern (exits, boundary, terrain, water, fixtures). keep: one bundle per zone, one table per concern. change: table names, file format, our own concern list.
2. name: "Zone Exit Rows". idea: zone travel is a row, not code (position, heading, and extra zones the exit is also in). keep: exits as data rows. change: fields and the travel rule.
3. name: "Heightfield From Image". idea: zone terrain heights come from an authored greyscale image. keep: image as the height source. change: format, scale and sampling.
4. name: "Water Layer". idea: water is its own layer with corner quads, not baked into the terrain. keep: separate water layer. change: shape and flow rules.
5. name: "Themed Tree Swap". idea: per-zone tree sets with bark and leaf textures and variant clusters. keep: per-zone tree sets with variant clusters. change: all models and textures.
6. name: "Tiered Craft Gate". idea: a craft tier is a skill level plus a material level, with nested sub-recipes. keep: two-number gate and nested sub-recipes. change: names, counts and formula.
7. name: "Warn, Do Not Fail". idea: a loader warns on a bad row and keeps the rest. keep: warn and continue. change: warning format.

## Not read
- The DAoC client data itself (zone packages, tables, texts): not in the repo, not obtained.
- Function bodies in `src/` beyond the cited lines.
- `tests/` bodies (names only, except `craft_recipes_tests.cpp` by count).
- `tools/zone_exporter.cpp`.
- `src/terrain_height_map.cpp` sampling and `src/river_geometry.cpp` builders.
- The sibling `BifrostTitan-daoc-niflib` (separate donor).
