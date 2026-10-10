# SWG-Source-swg-main (asset audit, AU052)

Donor folder: /mnt/frankendom-donors/SWG-Source-swg-main (VPS only, read-only)
Half read: ORCHESTRATION only (root scripts, build and tool scripts, .gitmodules, README). The game code and data are in git submodules: dsrc, src, serverdata, stationapi, exe. In this box all five submodule directories are EMPTY (each has 0 entries). So no data pack and no game code is present here. Paired donor: SWG-Source-src holds the server code and engine (read in its own note). The dsrc data pack is absent from both boxes.

## Restriction
_RESTRICTED-NOTE.txt line 1: leaked official SWG source, proprietary, no licence. Read for shape and idea only; clean-room rewrite from the idea.

## Licences
- No LICENSE file at the root of this folder. The only licence-like statement is the RESTRICTED note (proprietary, no licence).
- Submodule .gitmodules points at other repositories (dsrc, src, serverdata, stationapi, exe). Their licences are not in the box and were not read.

## Rights-holder status
Leaked proprietary source per the RESTRICTED note. README.md line 2 says the repo "houses the base of the SWG Source project". No copyright line seen in README.md, build.xml, build.properties or exec.sh. tools/ was listed but not grepped for copyright lines.

## Data first
- No data tables are present. dsrc and serverdata (where the data tables would live) are empty.
- tools/ holds table build scripts: buildCrcStringTable.pl, buildQuestCrcStringTables.pl, buildAppearanceTable.pl. utils/ holds build_object_template_crc_string_tables.py, build_planet_crc_string_tables.py and build_quest_crc_string_tables.py. Names only: they show the original team compiled data into CRC-keyed string tables. Not read.
- utils/ also has build scripts for node lists and tab files (names only).

## Asset inventory
| kind | path | count hint | licence | class |
|---|---|---|---|---|
| art, models, audio, UI, fonts | none (submodules empty) | 0 | n/a | D |
| maps, text, string tables | none (dsrc empty) | 0 | n/a | D |
| tool binaries (.exe, .dll, .dat) | tools/ | about 247 files under tools/ (depth 2) | unknown | D (not opened) |
| build and tool scripts | root, tools/, utils/ | several dozen .pl, .sh, .btm, .py | unknown | not an asset; not read in depth |

## Best class: D
No usable non-code content in this box.

## Inspiration (category-level)
- Data compiled into CRC-keyed string tables by build scripts. Idea: a catalogue of named rows compiled into a runtime lookup, the same shape as Frankendom row 20 (catalogue as runtime source). Read only by name in tools/ and utils/.
- A git-submodule split between code, data and config. Idea: keep designer data in its own folder with its own build step. Name-level only.

## Briefs
None usable from this folder. The only striking item is the build step that turns tables into lookup tables; its shape is covered by the SWG-Source-src brief set (threat ladder, typed damage mod list) and is not repeated here.

## Cross-links
- Data-first rule: the table build scripts point at the data half that is missing here. Use SWG-Source-src schema files (row 21 catalogue fields) for any real look at the data shape.

## Not read
- All scripts in tools/ and utils/ beyond names.
- Tool binaries.
- Submodule contents (absent).
- Client half (absent).
