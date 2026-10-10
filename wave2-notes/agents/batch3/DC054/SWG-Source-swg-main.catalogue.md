# SWG-Source-swg-main (design catalogue, DC054)

Donor: /mnt/frankendom-donors/SWG-Source-swg-main (VPS only, read-only). 
Half read: ORCHESTRATION only (root scripts, build and tool scripts, .gitmodules, README, restricted note). 
Game code and data are in five git submodules (dsrc, src, serverdata, stationapi, exe). All five directories are EMPTY in this box (0 entries each). So no data pack, no game code and no client half are present here.
Paired donor: SWG-Source-src holds the server half and the data tables that are in the box (see its catalogue).

## Restriction and licence (class C)
- _RESTRICTED-NOTE.txt line 1: "RESTRICTED: leaked official SWG source (proprietary, no licence). Read for shape/idea ONLY." Clean-room rewrite from the idea. Category-level only.
- No LICENSE file at this folder's root. The submodules point to other repositories whose licences are not in the box.
- No copyright line seen in README.md, build.xml, build.properties or exec.sh (checked by audit AU052; re-read here for README only).
- Not a legal opinion.

## Counts (what was actually found in this box)
- Creatures: 0. Classes: 0. Weapons: 0. Gear sets: 0. Zones: 0. No game data entries exist in this folder; the submodules are empty.
- Tool and build files: 247 files under tools/ (depth 2). Extension mix: 130 .pl, 22 .pm, 22 .lnt, 21 .btm, 15 .exe, 4 .sh, 4 .dat, 2 .txt. Most are Perl scripts, not binaries (the audit called them tool binaries; that is a correction).
- utils/: 19 files (build scripts for CRC string tables, planet tables, quest tables, node lists and tab files).

## 1 to 6 (creatures, classes, weapons, gear, zones, looks)
- No creature, class, weapon, gear, zone or look data in this box. Nothing to list from game content.
- Build step worth knowing (names only, scripts not read in depth): tools/buildCrcStringTable.pl, tools/buildObjectTemplateCrcStringTables.pl, tools/buildQuestCrcStringTables.pl, tools/buildAppearanceTable.pl, utils/build_planet_crc_string_tables.py, utils/build_object_template_crc_string_tables.py, utils/build_quest_crc_string_tables.py. They show the original team compiled designer rows into CRC-keyed string tables. Their data sources (dsrc) are absent.
- Where the data would live (per the empty submodules): dsrc (data pack) and serverdata. Both empty.

## 7. Inspiration for Frankendom (category-level, own words)
1. Designer rows compiled into a runtime lookup. A build step that turns named catalogue rows into a lookup table the server reads at start. Keep: one row per named thing, compiled once. Change: our catalogue JSON as the source, checked by a gate; our own names, no CRC keys. Frankendom row 20 (catalogue as runtime source).
2. Data kept in its own folder with its own build step. Keep: a clear split of designer data from code. Change: our data folder and build command; no submodule split needed.

## Briefs
- None usable from this folder as content. The build step idea above is covered by SWG-Source-src's catalogue (data tables and enum headers), and is not repeated there.
- Rule for any idea taken from here: recreate as a clearly distinct original, never a copy. Keep: one compiled lookup from named rows. Change: our names, our source format, our gate.

## Audit corrections
- Tool count 247 confirmed. Mostly Perl scripts (130 .pl), not binaries (15 .exe in total).
- README wording confirmed ("houses the base of the SWG Source project").

## Not read
- Every script in tools/ and utils/ beyond names (and the file-type count).
- Tool binaries and .dat files.
- Submodule contents (absent: 0 entries each).
- Client half (absent).
- Copyright scan of tools/ (audit did not grep tools/ for copyright lines either).

Reuse tag: catalogue only; no code reused.
