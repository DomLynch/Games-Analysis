# rathena-rathena (asset audit, AU044)

Donor: /mnt/frankendom-donors/rathena-rathena (VPS, read only).

Halves: server half plus data pack. The server is C++ (src/, README). The data pack is db/ (YAML and text tables) plus npc/ (script text) and sql-files/. The client half is not in the box. No other donor in this batch is its matching client.

## Licence (what the files say)
- Code: GNU GPL v3. LICENSE line 1 "GNU GENERAL PUBLIC LICENSE", version 3 text. README.md line 81: "Licensed under [GNU General Public License v3.0]".
- Data files: db/re/mob_db.yml line 2 "Copyright(C) 2024 rAthena Development Team" with a GPL v3 header (lines 5-16). Only this file's header was read; other data files' headers were not checked.
- Third party: 3rdparty/README.txt lists cmake, httplib, libconfig, mysql, pcre, zlib, json, yaml-cpp, rapidyaml. Licence text for these not read.
- Asset licence: no separate asset licence file. The source game the data describes is not named in the files read (README, db readme files, 3rdparty README, sql-files README). A grep for gravity, ragnarok and copyright over README.md, the db readme files, 3rdparty/README.txt and sql-files/README.md matched only README.md line 81.

## Asset inventory (count and paths)
| group | path | count | class | note |
|---|---|---|---|---|
| monster table | db/re/mob_db.yml | about 2,675 entries (grep of "- Id:") | C | stats, drops, boss flags, MVP prize lists |
| skill table | db/re/skill_db.yml | about 1,635 entries | C | skill data |
| item, drop, quest, reputation tables | db/re/*.yml (item_db*.yml, map_drops.yml, quest_db.yml, reputation*.yml, and more) | db/ holds 181 .yml, 23 .txt, 5 .dat (ext count) | C | not opened beyond headers |
| mob skill script | db/re/mob_skill_db.txt | 15,004 lines | C | header read (lines 1-4); rows not read |
| effect catalogue | doc/effect_list.md | 978 lines | C | numbered effect list; header read (line 3 and the first table rows) |
| NPC and quest scripts | npc/ | 1,178 files (find count) | C | script text, quest dialogue; not opened |
| binary data | db/GeoIP.dat, db/map_cache.dat, db/re/map_cache.dat | 3 files | C | binary; not opened; licence not read |
| SQL | sql-files/ | many .sql files | C | not opened |
| audio, sprites, models | none found in db/ | 0 in db/ | D | not checked across the whole tree |

Data tables first: db/re/mob_db.yml, skill_db.yml, item_db*.yml, mob_skill_db.txt are the data half. The loader in src/ was not read.

## Rights-holder status (from the files)
Unknown from the repo files. The files name the rAthena Development Team as copyright holder and GPL v3 as licence. They do not name the game whose monster, item and skill data sit in db/. Status: unknown.

## Best class
C. Code is GPL v3, so under the GPL rule we take shape only and copy no values. The data tables carry a GPL v3 header but the source game is not named, so their origin is unclear. Treat all data and scripts as inspiration only.

## Inspiration
- Boss entry with a boss class flag and a separate MVP prize table with per-item rates (db/re/mob_db.yml lines 1840-1844). Idea: a boss is one flag away from a different reward ceremony.
- Boss skill range longer than its chase range (db/re/mob_db.yml lines 1827-1828). Idea: the boss uses ranged skills before it closes in, so the player sees the threat early.
- A numbered catalogue of hit and impact effects that scripts can trigger (doc/effect_list.md line 3 and the table below it). Idea: a small named list of hit feels, each with a sound cue.
- A flat monster skill script table keyed by monster (db/re/mob_skill_db.txt lines 1-4). Idea: each monster is a list of skills with cast conditions in one text table.
- The boss entry also carries separate attack delay and motion fields (db/re/mob_db.yml around line 1834). Idea: wind-up and recovery are data fields, so the telegraph is tunable per boss.

## Briefs (category level, all ours to design)
Dom's rule: recreate as a clearly distinct original, never a copy. Numbers from this donor are not to be copied: use our own tuning.

1. **Tiered boss with its own prize table** (own label). Why it works: one flag switches a boss to a shared-reward ceremony. Kept: boss flag plus an MVP-only prize list with per-item rates. Changed: the prize list feeds a shared loot ceremony with a party share and our own item set. Ref: /mnt/frankendom-donors/rathena-rathena/db/re/mob_db.yml lines 1840-1844.
2. **Boss that casts from beyond chase range** (own label). Why it works: the threat is felt before melee. Kept: skill range longer than chase range, so ranged skills fire first. Changed: a visible wind-up ring at 375 wide before each ranged cast, and a different silhouette. Ref: /mnt/frankendom-donors/rathena-rathena/db/re/mob_db.yml lines 1827-1828.
3. **Named hit-feel catalogue** (own label). Why it works: scripts pick a numbered hit feel. Kept: numbered IDs that scripts trigger. Changed: our feel names and a paired combat sound cue per entry. Ref: /mnt/frankendom-donors/rathena-rathena/doc/effect_list.md line 3.
4. **Monster skill script table** (own label). Why it works: one flat table describes what each monster can cast and when. Kept: skills keyed by monster with cast conditions. Changed: our conditions are HP-threshold and aggro-count triggers that match the hate-list rule. Ref: /mnt/frankendom-donors/rathena-rathena/db/re/mob_skill_db.txt lines 1-4 (header only).

## Cross-link
- Spawns and loot: db/re/mob_db.yml (drops, MVP prizes), db/re/map_drops.yml (not read).
- VFX: doc/effect_list.md (header read).
- Animation: attack and damage motion fields in mob_db.yml (around line 1834).
- Zones: npc/ and map_cache files (not read).
- Sound: none in db/ (no audio files found there).
- HUD: none.

## Not read
- The rows of db/re/mob_db.yml outside the boss block (lines 1807-1850), item_db*.yml, skill_db.yml rows, quest_db.yml, map_drops.yml, mob_skill_db.txt rows.
- npc/ (1,178 files), sql-files/, the rest of doc/, 3rdparty licence texts, GeoIP.dat, map_cache.dat files.
- src/ server code (not read beyond the tree).
- Client half: not in the box.
