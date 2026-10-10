# SWG-Source-dsrc (asset audit, cell AU051)

Donor: `/mnt/frankendom-donors/SWG-Source-dsrc/` (VPS only, read-only). **RESTRICTED** per `_RESTRICTED-NOTE.txt`: leaked official SWG source, proprietary, no licence. Study shape and idea only. Descriptions stay at category level: no constants, coordinates, colour codes or copied text. Table contents were not reproduced.
Half read: **data half** (`sku.0/` compiled data tables, palettes, text docs) plus `LICENSE.md`, `README.md`, `build.xml` and `build.properties` (top lines). The matching engine and client halves are `swgemu-Core3` / `swgemu-engine3` (server engine, not the same data) and `SWG-Source-client-tools` (client).

## 1. Licences (as the files say)
- `LICENSE.md` is the **GNU Lesser General Public License, version 3** text (line 1 "GNU Lesser General Public License"; line 11 "This version of the GNU Lesser General Public License incorporates").
- `_RESTRICTED-NOTE.txt` line 1: "leaked official SWG (Sony Online/Disney) source, proprietary, no licence".
- `README.md` line 3: "This repo was forked from Stella Bellum." It asks credit to Stella Bellum (notably Cekis). It does not state a licence for the data.
- **Conflict**: LGPL v3 text in `LICENSE.md` versus "no licence" in the restricted note. Class C for every data group.
- Asset licence: conflicting, class C.

## 2. Asset inventory (what is here)
- **Data tables (`.tab`, 15,799 files)**, the largest group, under `sku.0/sys.server/compiled/game/datatables/` and `sku.0/sys.shared/compiled/game/datatables/`:
  - `npc_lair/` 1,825 (lairs and camps, named by camp or herd, for example `bandit_camp.tab`, `bantha_herd.tab`).
  - `questtask/quest/` 1,640 and `questlist/quest/` 1,640 (quest task and quest list tables, paired).
  - `poi/` 742 (points of interest).
  - `spawning/ground_spawning/types/` 716 (ground spawn types, by region; `tatooine/` 243).
  - `space/` 648 (space tables), `spawning/static_npc/` 341.
  - Spawn type tables open with a two-column header (name and float size), read with `head -3`; column names are structural and not reproduced.
- **Other data**: `.tpf` 63,454 files (not opened); `.java` 5,638 files under `sku.0/sys.server/compiled/game` (by extension; not opened); `.mif` 337; `.me` 71; `.tdf` 63; `.xls` 21 (not opened); `.pl` 12; `.cfg` 9; `.xml` 2; `.yml` 2.
- **Text docs with rules**: `datatables/loot/dungeon/tables.txt` (one loot table per dungeon, five levels; read in part), `datatables/food/food_data.txt`, `datatables/ship/ship_balance.txt`, `datatables/crafting/readme*.txt`, and several `readme.txt` files. Only the loot table file was read in part.
- **Palettes**: `sku.0/sys.shared/built/game/palette/` 32 `.tga` files, names by prefix `pc_eye_*` (eye palettes, one per three-letter code). Not opened.
- **String table**: `sku.0/sys.shared/compiled/game/misc/planet_crc_string_table.txt`, 47 lines. Not read beyond the line count. No `.stf` files in the repo.
- **Art and audio**: none found (0 `.dds`, `.msh`, `.wav`).
- `build.xml`, `build.properties`: ant build and server settings (top lines read).

## 3. Rights-holder status (repo files only)
- Restricted note: "leaked official SWG (Sony Online/Disney) source". README: fork of Stella Bellum. The data is leaked official material per the note.
- Status: **leaked / restricted**. Class C.

## 4. Best class
**C** for all data groups (restricted, conflicting licence). **D** for anything not usable. Inspiration stays category-level.

## 5. Inspiration (category-level, own words)
- **Lair as a unit**: a camp or herd is one table with its own roster (`npc_lair/`, 1,825 files, named by camp or herd, for example `bandit_camp.tab`). Idea: a camp is a landmark with its own small roster, not a random spawn. Recreate with our own camp layouts and rosters.
- **Five-tier dungeon loot**: each dungeon has one loot table with five levels (`datatables/loot/dungeon/tables.txt`, line 4). Idea: a visible five-step climb per dungeon. Recreate with our own tier names and rarity colour.
- **Region spawn types**: spawn types are split per region (`spawning/ground_spawning/types/`, 716 files; `tatooine/` 243). Idea: region-scoped spawn types that feed the walk-density numbers (row 23 zone population).
- **Paired quest tables**: a quest list and its tasks sit in two matching table sets (1,640 each). Idea: keep quest tasks in their own table pointing to the list. Recreate with our schema only.
- **Palette swatches by feature**: 32 palette images keyed by a feature prefix give colour variation without new models (`built/game/palette/`). Idea: a palette per feature family, the same one-model/many-skin idea as Core3 `bol.lua` line 30. Recreate with our own ramps.

## 6. Inspiration briefs
Dom's rule for every brief: recreate as a clearly distinct original, never a copy. KEPT and CHANGED traits are named below. Category-level only. No art or audio in this donor, so silhouette and sound fields are ours to design.

1. **Roster camp (own label)**. Why: a camp that holds a small mixed roster is a readable hostile landmark on the map. Silhouette at 375 wide: a camp marker with a clear edge (idea only). Signature behaviour: the roster stays together around the camp (idea; behaviour not read in this donor). Signature sound: none read. Kept: one table per camp with its own roster. Changed: our own camp layout and roster; our own camp names. Ref: `sku.0/sys.server/compiled/game/datatables/npc_lair/bandit_camp.tab` (file name only; not opened).
2. **Five-tier dungeon chest (own label)**. Why: five tiers per dungeon make a visible climb. Kept: five levels per dungeon, one table each. Changed: our tier names, rarity colour, and drop rules. Ref: `sku.0/sys.server/compiled/game/datatables/loot/dungeon/tables.txt` line 4.
3. **Region spawn type (own label)**. Why: spawn types grouped by region give each zone its own feel and density. Kept: region-scoped spawn tables. Changed: our zones and our walk-density numbers (row 23). Ref: `sku.0/sys.server/compiled/game/datatables/spawning/ground_spawning/types/` (directory; files not opened).

## 7. Cross-link to our cell topics
- spawns / encounters (row 23): npc_lair, ground_spawning types and poi are the closest matches. Strong data-level cross-link.
- loot: dungeon five-tier tables, and the loot tables in Core3 `bin/scripts/loot` (`swgemu-Core3.assets.md`).
- progression: quest task and list tables (paired), category only.
- sound-music, hud-ui, vfx, animation, camera: no assets in this donor; palettes only.

## Not read
- The `.tab` contents (only structure from `head -3` on one spawn type file), `.tpf`, `.java`, `.mif`, `.me`, `.tdf`, `.xls`, `.pl`, `.cfg`, `.xml`, `.yml`.
- `datatables/loot/dungeon/tables.txt` beyond the first six lines.
- `planet_crc_string_table.txt` beyond the line count.
- The 32 palette `.tga` files.
- `include/`, `.github/`, `build.xml` beyond its top, `build.properties` beyond its first lines.
- `README.md` beyond line 3.
