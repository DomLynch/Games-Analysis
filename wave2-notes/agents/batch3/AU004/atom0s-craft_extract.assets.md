# atom0s-craft_extract: asset audit (AU004)

Source: /mnt/frankendom-donors/atom0s-craft_extract (read-only, VPS).

## Licences (as the files say)
- Code: GNU AGPL version 3 (LICENSE line 1; README "License" section: "is licensed under GNU AGPL v3", line 97). README notes it is AGPL, not standard GPL.
- Assets: no asset licence line. The logo (repo/daochook.png, res/daochook.ico) is not named in any licence line.
- Third-party libraries in ext/ (cxxopts, nlohmann_json, sqlitecpp, sqlite3): no licence files in the tree; their licences are not stated in the repo.

## Rights holder status
- Tool by atom0s. Source headers read "craft_extract - Copyright (c) 2022 atom0s" (src/main.cpp line 2; same line in defines.hpp, v66.hpp, v67.hpp).
- README line 83: "Dark Age of Camelot is copyright © 2021 Electronic Arts Inc."
- README line 80: the tool "does not claim ownership of any material(s) related to DAoC."
- README line 87: the reverse engineering is described as "clean room".
These are the repo's own statements. No legal view is given here.

## Inventory
- No game content in the repo. The README says the user supplies tdl.crf, extracted from the game's craft archive (README line 28).
- repo/daochook.png (about 20 KB) and res/daochook.ico (about 152 KB): project logo and icon.
- res/resources.rc and resources.h: Windows resource script.
- src/: main.cpp (147 lines), defines.hpp (63), v66.hpp (661), v67.hpp (663). Format definitions.
- ext/: cxxopts.hpp, json.hpp, sqlitecpp (include and src), sqlite3 headers, and ext/sqlite3/lib/sqlite3.lib (binary). 24 files in total.

## Classes
- C: logo and icon; third-party libraries (no licence in tree).
- D: game content (none).
- B: format definition code (AGPL, code, not art).
- Best class: D.

## Inspiration
- Profession tree: professions, categories, recipes and materials as nested structs (src/v67.hpp: structs at lines 62, 69, 83, 89, 97, 124, 131).
- Material slots with level gates: recipes hold up to eight material slots, each with a base material, skill and level (src/v67.hpp around lines 62-80).
- Base-material list drives the material tiers (src/v67.hpp line 39).
- Separate craft record and material entries (craft_t line 131; craftmaterial_t line 124). Struct names only.
- Several output modes for the same recipe data: CSV, JSON, SQLite, text (src/defines.hpp line 46 enum; README usage section).

## Briefs
1. Profession and recipe browser (own label): ref src/v67.hpp (lines 62-131).
2. Tiered material gate (own label): ref src/v67.hpp material_t (line 62; fields lines 66-80).

## Cross-links to our cell topics
- loot and crafting: recipe data model is the useful part.
- hud-ui, vfx, camera, zones, spawns, sound, animation: no assets.

## Not read
No PNG, ICO or LIB file was opened. src/main.cpp and the v66 and v67 bodies were only grepped for struct names. ext/ libraries were not reviewed.
