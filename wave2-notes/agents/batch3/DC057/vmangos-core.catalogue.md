# vmangos-core (design catalogue, DC057)

Donor/Licence: vmangos (Progressive Vanilla), a C++ server emulator with SQL content. Code GPL-2.0 (LICENSE line 2, "Version 2, June 1991"). Game content in sql/ has no licence stated in the files read. The repo ships no art, models, textures or audio (audit AU055 searched for .dbc, .mpq, .vmo, .mmap, .m2, .blp and found none; not re-run here). README line 5 says it continues two earlier codebases, and the README lists supported client builds (audit AU055 cites line 8), so the content is versioned against an original commercial client. Rights holder not named in the repo; no affiliation disclaimer found. Treat as PROPRIETARY-DERIVED (class C/D): inspiration stays CATEGORY-LEVEL. No quest or dialogue text, no names, numbers or coordinates are taken here. Dom's rule: recreate as clearly distinct originals, never copies. Not legal advice.

Checked: receipts in receipts.tsv (Veloren and vmangos rows together), verify_receipts.py passes all 59. Audit AU055 read first and not repeated. No CLAUDE.md or AGENTS.md in the donor (checked the repo root and grepped the .md files; none found).

Halves read: SERVER code, in part (src/game/Maps/Pool/PoolManager.cpp, src/game/Objects/Creature.cpp, src/game/SharedDefines.h and CreatureDefines.h enums, src/game/Objects/ItemPrototype.h enum header). DATA half read as table names, statement counts and README files only (sql/migrations, sql/custom). CLIENT half is NOT in the box: the repo ships no client data, so there is no paired client to name. Zone content rows (pool rows, creature rows, quests) were not read, on purpose.

Counts (what I counted, how; these are NOT content counts):
- INSERT statements found at line start in sql/migrations (grep, not row counts): creature_template 4,203 (plus 5 REPLACE), pool_template 1,931, creature_loot_template 312, item_template 718, gameobject_template 308. Migration files: 1,168 total; 287 touch creature_template, 280 touch pool_template, 36 touch creature_loot_template.
- Enum entries (line scan of src/game/SharedDefines.h): races 9, classes 9; creature family enum 24 (src/game/Objects/CreatureDefines.h line 59 onward); item quality rungs 7 (SharedDefines.h line 194 onward); ItemClass enum in ItemPrototype.h line 135 onward.
- The JSON counts are therefore 0 for creatures, weapons, gear_sets and zones (rows not read), and 9 for classes (the class enum size).

## 1. Creatures and beasts (category level only)

Creature data is SQL rows (creature_template, creature_loot_template). Rows were not read. The code side is the spawn and respawn logic, not looks:
- Creature family enum with 24 entries (CreatureDefines.h line 59): a family tag that can drive grouping and behaviour. Names not copied here.
- Creature class field documented as only four classes known for creatures (CreatureDefines.h line 256): a small creature-class set beside the player classes.
- Escalation with level: not read; the code path I read does not compute level-scaled stats (PoolManager and respawn code only).

Top creatures (category level, no instance looks):
1. Label: roaming pack with a cap (category: capped group).
   Why: a pool holds a maximum count and refills one slot at a time when a member goes (PoolManager.cpp line 360). A pack never grows past its cap and does not return all at once.
   Keep: cap per group; one-slot refill; named group.
   Change: our cap is zone data with a grace timer; packs cap at three attackers (MAX_ATTACKERS).
   Ref: src/game/Maps/Pool/PoolManager.cpp lines 351-392 (SpawnObject); src/game/Objects/Creature.cpp line 60.
2. Label: mixed-member pool (creatures and objects share one cap).
   Why: the pool code is templated over the member type, and a comment says game objects are processed differently from creatures (PoolManager.cpp line 354). Nodes and chests can share a cap with monsters, which sets the walk density.
   Keep: one cap across member kinds.
   Change: our member kinds and our cap numbers as data.
   Ref: src/game/Maps/Pool/PoolManager.cpp line 354 and the PoolGroup SpawnObject template (line 351).
3. Label: randomised respawn window.
   Why: each spawn record draws its respawn time between a minimum and a maximum (Creature.cpp line 60). Stops a pack returning on the same beat.
   Keep: random window per spawn record.
   Change: our window is zone data.
   Ref: src/game/Objects/Creature.cpp line 60.

## 2. Classes, races and factions (category level)

- Races: 9 entries in the race enum (SharedDefines.h line 56 onward). Role: playable species. Signature mechanic: not read.
- Classes: 9 entries in the class enum (SharedDefines.h line 87 onward). Role: playable class tags. Class kits and talent data are not read.
- Creature class tags: four classes known for creatures (CreatureDefines.h line 256).
- Progression shape: patch-windowed content (see zones), not class trees. Talent and skill data not read.
- Factions: not read.

## 3. Weapons (category level)

- ItemClass enum with 16 entries (ItemPrototype.h line 135 onward): item families by class. Names not copied.
- Quality ladder: 7 rungs (SharedDefines.h line 194 onward: poor, normal, uncommon and up). The rung order is the category idea; colours are only in comments.
- Item rows: item_template statement count 718 (grep). Rows not read.
- Special properties (elemental, set bonus): not read.

Top 5 striking: not made. The code read does not show weapon looks or special properties, and the rows were not read. Category idea only: a seven-rung quality ladder with one fixed order, which is already in the Frankendom loot plan.

## 4. Armour and gear (category level)

- No gear look data read. The repo has no art (see licence).
- Material tiers: creature_loot_template (36 migration files) holds per-creature drop rows. Category idea only: one table per creature class with counts and a rare tier roll.
- Set bonuses: not read.

Top 5 striking: not made, for the same reason. Category ideas only, in section 7.

## 5. Zones and dungeons (category level)

- Zone rows: pool_template (1,931 INSERT statements, grep), creature and object spawns by pool. Zone names not copied.
- Patch windows: each pool row carries a minimum and maximum patch and is selected by the current build (PoolManager.cpp line 685). Zone rows can be season-tagged.
- Biomes, dungeon archetypes and hazards: not read (no map or biome data in the code read).
- Custom content: re-runnable SQL applied last (sql/custom/README.md line 2; 30 files, names only).

Top 5 striking zone ideas (category level): patch-windowed zone rows; mixed-member pools for walk density; capped respawn zones; custom season overlays that run last; config-gated custom behaviour per zone. Not zone looks.

## 6. Item and effect looks worth recreating

None read. The repo has no shaders, models, textures or audio, and the code read has no look or effect code. Nothing to recreate from this donor at look level.

## 7. Inspiration for Frankendom (category level)

1. Name: Capped roaming pack. Idea: a group with a cap that refills one slot at a time from a random window (PoolManager.cpp line 360; Creature.cpp line 60). Keep: cap, one-slot refill, random window. Change: zone-data cap, grace timer, three-attacker packs (MAX_ATTACKERS).
2. Name: Mixed walk-density pool. Idea: one cap shared by creatures, a chest, a shrine and a corpse (pool with mixed member kinds, PoolManager.cpp line 354). Keep: one cap across member kinds. Change: our member kinds and numbers as zone data.
3. Name: Patch-stamped zone row. Idea: each zone row carries a version window and only rows for the current build are loaded (PoolManager.cpp line 685). Keep: version window per row. Change: a season or release tag per zone, no copied rows.
4. Name: Corpse-then-return pair. Idea: a body that decays on one timer and a respawn that waits for the body to clear (Creature.cpp lines 818 and 901). Keep: two timers and the wait. Change: a loot ceremony with a shaped decay and fade, not a plain timer.
5. Name: Config-gated custom behaviour. Idea: custom behaviour sits behind a config option and is off by default (README.md line 21). Keep: off-by-default flag for every Frankendom experiment. Change: our flags.
6. Name: Last-applied overlay. Idea: custom content as re-runnable SQL applied last (sql/custom/README.md line 2). Keep: a re-runnable overlay that runs last. Change: our overlay format for zone data.
7. Name: Per-creature material table. Idea: one loot table per creature class with counts (creature_loot_template, category only). Keep: table per class with counts. Change: our material set, count ranges and a rare tier roll.

Patch-tag rule for our data (README.md line 23): every data row is marked with the patch in which it was added or changed. Useful as a provenance rule for our zone data.

## Licence and cross-links
Code GPL-2.0: shape only, no code copied. Game content: no licence stated; proprietary-derived; category ideas only. Cross-links: spawns and encounters (pool cap, row 23), death and respawn (corpse and respawn timers, row 17), loot (per-creature table, row 18), progression (patch-windowed rows).

## Not read
- Content rows of sql/migrations (table names and statement counts only; quest and dialogue text not read on purpose).
- sql/custom beyond the README and file names; sql/translations contents.
- dep/ libraries; src/scripts, src/shared, src/framework, src/realmd, src/mangosd (names only); contrib/mmap, vmap and model reader code (names only).
- PoolManager.cpp beyond lines 351-392, 685 (and the pool query lines around them); Creature.cpp beyond lines 58-60, 818, 901.
- Client data: not in the box.
