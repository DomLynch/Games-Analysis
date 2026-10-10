# vmangos-core (asset audit, AU055)

Donor: vmangos (Progressive Vanilla), a server emulator in C++ with SQL content. Halves: SERVER code (src/, read in part: PoolManager.cpp, Creature.cpp) and the DATA half (sql/, read as table names and README files only). The paired CLIENT is not in the box; the repo ships no client data.

## Licences (as the files say)
- Code: GPL-2.0. LICENSE line 2 "Version 2, June 1991".
- Dependencies in dep/: each has its own licence, not read.
- Game content in sql/ (migrations, custom, translations): no licence stated in the files read. Class C.
- No art, models, textures or audio in the repo (find for .dbc, .mpq, .vmo, .mmap, .m2, .blp returned nothing).

## Rights-holder status
Not named in the repo. README.md line 5: "an independent continuation of the Elysium / LightsHope codebases". The supported-builds list (README.md line 8) names client build numbers, so the content is versioned against an original commercial client. No trademark or affiliation disclaimer was found in README.md, CONTRIBUTING.md or LICENSE. Status: derived from original game content, rights holder unknown from repo files.

## Asset inventory
- World content SQL: sql/migrations, 1,168 entries. Table counts by grep: creature_template 287 files, pool_template 280, gameobject_template 100, quest_template 92, spell_template 56, creature_loot_template 36, item_template 33. Class C. Quest and dialogue text not read on purpose.
- Custom SQL: sql/custom, 30 files (README line 2: re-runnable, applied last). Class C.
- Translations: sql/translations (ptBR, readme.txt line 1). Class C.
- Schemas and tools: characters.sql, logon.sql, logs.sql, make_migration.py. GPL-2 with repo. Class B.
- Server source: src/game (PoolManager.cpp, Creature.cpp, ObjectMgr.cpp and others), about 20 MB. GPL-2. Class B (shape only).
- Extractor and tools: contrib/extractor (dbcfile.h line 20), contrib/mmap, vmap tools. GPL-2. Class B.
- Dependencies: dep/, about 38 MB. Not read. Class C.
- Art, audio, models: none in the repo. Class D.

## Best class: C overall. Code is GPL-2 share-alike (B): we take shape only.

## Inspiration (category level; this is a proprietary-derived donor)
- Capped spawn pools: a pool has a cap, counts its live members, and refills one slot when a member goes. Members are chance-weighted or equal-weighted (PoolManager.cpp lines 360, 372-386). The spawn-cap idea for row 23.
- Randomised respawn window per spawn record (Creature.cpp line 60).
- Two timers after a death: body decay, then respawn that waits for the body to clear (Creature.cpp lines 818, 901).
- Patch-windowed rows selected by build (PoolManager.cpp line 685). Good for season-tagged zone rows.
- Config-gated custom behaviour and data-first content (README.md lines 21-23).
- Re-runnable custom SQL applied last (sql/custom/README.md line 2).
- Pools mix creatures and objects (PoolGroup<GameObject>), so nodes and chests can share a cap with monsters: walk density.
- Per-creature material tables (creature_loot_template, category level only).

## Briefs (4; category level, no instance looks)
1. Capped roaming pack: keep the cap, one-slot refill, random window; change to zone data with a grace timer, three-attacker packs (MAX_ATTACKERS), no hard-coded counts.
2. Patch-stamped zone row: keep the version window and build selection; change to season tags, no copied rows.
3. Corpse-then-return pair: keep the two timers and the wait; change to a loot ceremony with a shaped decay.
4. Per-creature material table: keep one table per creature class with counts; change the material set and the rare tier roll.

Dom's rule: recreate as clearly distinct originals, never copies. No quest text, names, numbers or coordinates taken.

## Cross-links
- spawns and encounters: pools, respawn window, pool with objects (row 23).
- death and respawn: corpse and return timers (row 17).
- loot: per-creature material tables (row 18).
- progression: patch-windowed rows and custom re-runnable SQL.

## Not read
See vmangos-core.assets.json, not_read array (content rows, custom SQL body, translations, dependencies, most of src and contrib, scripts).
