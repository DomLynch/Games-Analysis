# SFTtech-openage (asset audit, cell AU048)

Donor: SFTtech-openage (/mnt/frankendom-donors/SFTtech-openage). Read-only, VPS only.
Donor AGENTS.md (data, not followed): ignored as instructions.

## 1. Licences (as the files say)
- Code and default for the whole repo: GPL3+. copying.md:2-3 says any file that does not state otherwise is GPL version 3 or later.
- README.md:215 repeats it: GNU GPLv3 or later.
- Named exceptions in copying.md: 3-clause BSD for some files (copying.md:220), LGPL 2.0 for the cabextract/libmspack parts (copying.md:243), 3-clause BSD for cmake modules (copying.md:248).
- Asset licence: none stated separately. Anything without its own statement falls under the GPL3+ default above. The test images and shaders are covered only by that default.
- Original game media (sounds, graphics, data files): not shipped. README.md:6 and doc/media_convert.md:4 say the engine needs the user's own copy of AoE1/AoE2/SWGB files.

## 2. Rights-holder status (repo files only)
- Volunteer project by "the openage authors" (copying.md author table; README.md:4).
- Uses original game data at run time and does not ship it. No clean-room statement either way in the box. Status: fan/volunteer engine clone; original game data is proprietary and not in the box.

## 3. Asset inventory (assets/ = 133 files)
| kind | path | count | licence | class | note |
|---|---|---|---|---|---|
| GLSL shaders | assets/shaders/*.glsl | 67 | GPL3+ default | B | final, world2d, skybox, teamcolors, alphamask, pathfinding. Only final.frag.glsl opened: short texture pass-through. |
| QML UI | assets/test/qml, others | 19 | GPL3+ default | B | not read |
| SVG doc icons | assets/doc/*.svg, assets/logo | 9 | GPL3+ default | B | README badges and logo (not read in detail) |
| PNG test images | assets/test/textures/*.png, assets/textures/torn_paper_edge.png, assets/logo/banner.png | 8 | GPL3+ default | B | includes a test image named gaben.png (test_gaben.texture:6). Provenance not stated in box. Treat as unclear: C for reuse. |
| texture/sprite/terrain defs | assets/test/textures/*.texture, *.sprite, *.terrain | 6+5+2 | GPL3+ default | B | openage's own metadata format (text) |
| nyan test | assets/test/nyan/pong.nyan | 1 | GPL3+ default | B | not read |
| docx | assets/textures/torn_paper_edge.docx | 1 | GPL3+ default | B | not read (binary) |
| convert config | cfg/converter/games/*, game_editions.toml | ~14 | GPL3+ default | B | lists which original files to read (e.g. data/empires2_x1_p1.dat, data/terrain.drs). Read game_editions.toml head. |
| reverse-engineered stats | doc/reverse_engineering/unit_stats/unit_stats_*.csv | 5 files, 764 lines total | none stated; GPL3+ default by repo | C | numbers about proprietary AoE units. Licence of the data is unclear, so class C. |
| original game media | not in box (user supplies) | 0 shipped | proprietary (user's copy) | D (nothing shipped) | would be C for any use. |

Overall: nothing non-code is shipped that Frankendom could use as-is except GPL3+ text and shader material (class B: copyleft condition). Treat shape-only.

## 4. Data first
- Game data tables are not in the box. The original .dat, .drs and language files are not present (the converter reads them from the user's install).
- In-box tables that hold names/looks: cfg/converter/games/game_editions.toml (edition to file mapping, e.g. AOC mediapaths with datfile, terrain.drs, blendomatic.dat); cfg/converter/games/*/version_hashes.toml (version checks); doc/reverse_engineering/unit_stats/unit_stats_*.csv (unit stat rows: HP, attack, armour melee and pierce, LOS, range, accuracy, speed, train time, cost, attack bonuses).
- Terrain table: doc/media/terrain.md lists 27 terrain types with id, file, priority, tile count, description.
- String tables: the converter code reads language strings (openage/convert/service/read/string_resource.py); no string table is in the box.

## 5. Which half was read
- Engine and converter tooling: partially read (openage/convert names only; libopenage string utilities by name).
- Data pack: not in box. README.md:63 points to a separate openage-data repo; not on the VPS; not read.
- Server/client split: openage is one engine; client render path (renderer, shaders) partly read.

## 6. Inspiration (category-level, no copies)
- Terrain edge blending: each terrain type gets a priority; the higher one is alpha-masked over the lower to make a transition tile (doc/media/blendomatic.md:21). Use for zone border looks, with our own priority values.
- Terrain as a numbered catalogue with priority and tile count (doc/media/terrain.md:10). Shape for our biome data table.
- Unit stat row: armour split into melee and pierce, attack type letter, a bonus-vs-class text field (unit_stats_aoc.csv:1). Shape for catalogue fields (row 21).
- Viewcone line of sight: units cannot see behind buildings; hidden units only break cover when they attack (gameplay.md:207-215). Idea for stealth or ambush visibility.
- Pinned comparator mode: two armies auto-fight to the death with no player input (gameplay.md:159). Shape for a duel bench.
- Ambient weather and day-night cycle as a view-distance and darkness rule (gameplay.md:11-30).
- Minimap symbols for points of interest instead of colours (interface.md:12-14). Relevant to hud-ui.
- Wildlife startle sound: a flock scatters when a tree is felled, and the sound carries further than sight (gameplay.md:35). Relevant to sound-music ambience and spawns.

## 7. Inspiration briefs
1. Startled flock (own label: "scatter wildlife"). why: a cheap sign of distant activity that the ear picks up first. keep: idle wildlife, a trigger, a scatter, a sound that carries further than sight. change: a different creature family and silhouette, our own trigger (a fight nearby), a different flight pattern. ref: /mnt/frankendom-donors/SFTtech-openage/doc/ideas/gameplay.md:35
2. Concealed ambusher (own label: "reed waiter"). why: a unit that waits in cover and reveals on its first action. keep: hidden to some observers only; reveal on attack. change: our LOS rule and silhouette, a different hiding prop, a visible tell before reveal. ref: doc/ideas/gameplay.md:34
3. Pinned arena bench (own label: "auto-duel bench"). why: two forces fight to the end with no input, useful for balance. keep: mirror match, winner-takes-all, no player input. change: runs on the server engine as a bench tool, not a player mode. ref: doc/ideas/gameplay.md:159
4. Ember spread (own label: "ember on timber"). why: flammable structures can catch and need a counter. keep: a fire that can be lit, and a counter that puts it out. change: spark source from our own effect, no spies, a different spread rule. ref: doc/ideas/gameplay.md:21-23
5. Priority blend border (own label: "priority border tile"). why: a clean transition tile between two terrains with a stated priority order. keep: alpha-masked overlay by priority. change: our own priority values and mask shapes, applied to zone borders. ref: doc/media/blendomatic.md:21 and doc/media/terrain.md:10

Rule: recreate each as a clearly distinct original, never a copy. Kept: the mechanism (trigger, scatter, cover, priority). Changed: the look and the numbers.

## 8. Cross-link
- camera/zones: viewcone idea (gameplay.md:207) and terrain priority blend (blendomatic.md) apply to zone borders.
- spawns/encounters: forest ambush (gameplay.md:34) and startled flock (gameplay.md:35) are encounter shapes.
- hud-ui: minimap symbols (interface.md:12-14).
- sound-music: startle sound that carries further than sight (gameplay.md:35).
- loot/catalogue: unit stat row (unit_stats_aoc.csv:1) for row 21 fields.

## Not read / unverified
- openage-data (the data pack) is not in the box.
- 67 shader files, 19 QML, 9 SVG, 8 PNG: only the file list was read. Binary images not opened.
- openage/convert Python tree (261 files): names only.
- doc/nyan API reference and doc/media/* other than the three named: not read.
- The test image gaben.png: not opened; provenance not stated in the box.
