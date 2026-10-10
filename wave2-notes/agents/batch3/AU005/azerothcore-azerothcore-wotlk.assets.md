# azerothcore-azerothcore-wotlk: asset audit (AU005)

Path: /mnt/frankendom-donors/azerothcore-azerothcore-wotlk (VPS, read-only)

## Licence (as the files say)
- Code: GNU GPL version 2 (LICENSE, title "Version 2, June 1991").
- Assets: no separate asset licence file in data/ or src/tools. The world SQL sits under the repo LICENSE with no per-folder notice. The content is game-derived (DBC-named tables, extractor tools that read client archives), so the licence position is unclear. Class C.

## Rights-holder status (from repo files only)
- .github/README.md line 88: "not an official Blizzard Entertainment product" and "not affiliated with or endorsed by World of Warcraft or Blizzard Entertainment".
- The repo does not state that the game data is licensed for reuse. The owner of the game content is not stated in the repo; treat as unclear.

## Asset inventory
- World SQL (data/sql/base/db_world, 309 files, about 297M): creatures, items, gameobjects, quests, text. About 30,000 creature template rows. Class C.
- DBC-derived SQL (110 *_dbc.sql files): spell visual, map difficulty, combat rating tables. Numeric data, not art. Class C.
- Localised text tables (*_locale.sql, broadcast_text, npc_text): game dialogue and item text. Not reproduced. Class C.
- Archive and update SQL (data/sql/archive 213M, updates 51M, old): history of the same tables. Not read. Class C.
- Art, models, audio, fonts, maps, navmesh tiles: none in the repo (0 files of the usual binary types). Class D.
- Extractor tools (src/tools/map_extractor, vmap4_extractor, mmaps_generator) read the original client archive, which is not shipped.
- deps/recastnavigation is a code library, not game content. Its licence header names Mikko Mononen, 2009. Full text not read.

## Best class
C overall (game-derived data, unclear licence). D for all art (none shipped).

## Inspiration
1. Spell visuals are referenced by numeric ID from a DBC-derived table. The effects are client-side and absent here. Recreate as our own ID-to-particle table.
2. A creature points to its display models through a weighted table with scale. One creature, several looks. Build our own variant set.
3. Creature templates link a base entry to difficulty-tier siblings. Show tiers with palette, glow and ornament rather than only size.
4. Map collision and navigation are baked offline from client data, then fed to a navmesh library. For us: bake navmeshes from our own level geometry as a build step (cross-link zones, spawns).
5. Text lives in parallel locale tables next to the data rows. Good layout for our text layer.
6. Item and gameobject templates are split from their addon tables: what a thing is versus how it looks and behaves.

## Inspiration briefs (5)
- Clockwork hatchling: small mechanical flier with a single glowing eye. Ref creature_template.sql line 95 (row name only; no model in repo).
- Field golem: farm construct of weathered harvest materials. Ref creature_template.sql line 99 (row name only).
- Cave crawler pack: low, many-legged pack creature with a crystal carapace. Ref creature_template.sql line 102 (row name only).
- Appearance roll: one creature picks a weighted model and scale. Ref creature_template_model.sql line 41.
- Elite tier: a harder sibling shown by crown or glow, not only size. Ref creature_template.sql line 25.
Full fields in azerothcore-azerothcore-wotlk.assets.json.

## Cross-link to our cell topics
- spawns and zones: navmesh bake step; the zone and spawn tables.
- loot and vendors: item and gameobject template split.
- vfx: spell visual ID table.
- camera: low creature silhouettes in dark caves (brief 3).

## Not read
Most of the 309 db_world SQL files (creature tables sampled only), archive, updates and old folders, all C++ source and tests, full Recast licence text, the modules folder beyond its readme, the .github, .claude and AGENTS.md files.
