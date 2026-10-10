# widelands-widelands (asset audit, AU057)

Donor: /mnt/frankendom-donors/widelands-widelands/ (Widelands: C++ engine in src/, Lua and PNG/OGG data in data/)
Halves read: DATA pack (tribes, world, sound, music, i18n fonts, licence files) and a slice of the engine (src/logic/map_objects/tribes/soldier.cc). Server and network half: in src/, not read. Paired halves: the box holds data and engine together.
Code licence: GPL v2 (COPYING lines 1-2). README line 16: GPL v2+, with some assets under various Creative Commons licences per folder.
Asset licence: mixed, folder by folder (section 1).
Rights-holder status: community project. debian/copyright line 207: "Copyright: 2002-2026 by the Widelands Development Team" for the tribe PNG pattern. Named authors appear in the sound csv and music file.
Best class: B. Per-row A for CC-0 and PD sounds; C for unclear folders (world, UI images, maps, campaigns).

## 1. Licence files (read)
- COPYING: GPL v2.
- README.md line 16 and line 173 (AI policy: the project states it holds against AI-generated content; quoted, no legal reading).
- data/music/LICENSE.txt: line 1 default GPL v2 or later; lines 3-6 tag four tracks: three CC-BY-SA v3.00 (Stuart Marshall) and one CC-BY 4.0 (Jan F. Bruns).
- debian/copyright (DEP-5 style): paragraph lines 206-208: data/tribes/*/*.png, GPL-2+. Other paragraphs: Culmus GPL-2+, Nakula GPL-2+, MicroHei Apache 2.0, DejaVu Vera fonts licence (BSD-like), Widelands.ttf SIL OFL, and the Eris and zlib entries for code libraries.
- data/txts/LICENSE.lua: game is FOSS under GPL v2 or later (text read in the first lines).
- data/sound/wl-sound-docu.csv: per-sound licence column (section 2).
- data/images/wui/menus/CREDITS.txt: one credit line for the Lua logo.

## 2. Asset inventory (counts from find and tallies; only the listed files opened)
- data/tribes: 16,125 PNG and 1,518 Lua. Soldier data: data/tribes/workers/barbarians/soldier/ (init.lua plus many sprite sheets and icon files, not counted). Other tribes: amazons, atlanteans, empire, frisians (per the workers folder listing).
- data/world: 1,212 files. critters/ has 16 animal folders (badger, brownbear, bunny, chamois, deer, duck, fox, lynx, marten, moose, reindeer, sheep, stag, wildboar, wisent, wolf). terrains/, immovables/, resources/, pics/, map_generation.lua.
- data/sound: 114 files: 113 OGG and wl-sound-docu.csv (48 rows with licence values: CC-3 18, blank 14, CC-0 9, PD 6, personal 1).
- data/music: 33 files (OGG) with LICENSE.txt.
- data/i18n: 1,803 files (fonts/ and translations/ and locales/; 53 locale entries).
- data/maps: 661 files (66 PNG and wmf maps with player_position, player_names and objective files). data/campaigns: 672 files.
- data/images: 348 files. data/txts: 22 files. data/scripting 43, data/templates 80, data/shaders 16, data/ai 4.

## 3. Rights-holder status (repo files only)
Community open-source project. Copyright held by the Widelands Development Team per debian/copyright; named authors in the sound csv and in some music metadata. No licensed third-party game data in the box.

## 4. Data first (where the soldier lives)
- Battle stats are per-unit data: data/tribes/workers/barbarians/soldier/init.lua. Four tracks (health, attack, defense, evade), each with a base, a step per level and a max level (lines 115-141). Icons per level loaded by pattern (lines 119, 126). Battle clip pairs for success and failure in each direction (lines 94-163). Global level bounds in a shared block (lines 94-101 region).
- Sprite sheets are declared as data with fps, frame count, rows, columns and directional flag (top of init.lua).
- Engine side (src/logic/map_objects/tribes/soldier.cc, partly read): the level helper (line 80), percent getters (lines 461-466), debug print (lines 965-966), and a random battle-clip pick from the logic random source (line 228).

## 5. Inspiration (category level; GPL code is clean-room, shape only)
- Four stat tracks as icon ladders above a unit: a veteran reads from across the field.
- Result-specific battle clips: separate hit and miss clips per direction, so the result reads without a number.
- Logic-random clip choice: deterministic per tick, a fit for our replay rule (row 19).
- Chance-to-avoid stats shown as percent (defense and evade).
- Critter idle and walk sets: one folder per animal, an idle frame, six walk-direction frames (east, north-east, north-west, south-east, south-west, west), a menu icon.
- Sound manifest per file with usage, author, licence and source; empty stub files lower a sound's play chance (csv line 2).

## 6. Briefs (4)
Dom's rule: recreate as a clearly distinct original, never a copy.
1. Four-track veteran (init.lua 94-141, 115-138): kept four tracks, per-level steps and icon ladders; changed to guard, stamina, crit and reach with rune-ladder icons and a glow rim for veterans.
2. Win-or-lose strike clip (init.lua 94-163): kept separate success and failure clips per direction; changed to one clip with a result glyph and hitstop, a dust curl for a miss.
3. Grazer at the edge (data/world/critters/deer/ and badger/, listing only): kept idle plus six walk directions and a menu icon; changed to a six-legged moor grazer with a horned crest and a flee clip.
4. Silent pool (csv line 2): kept silent entries in a pool to lower repeats; changed to a rest entry in our manifest with per-biome weights.

## 7. Cross-link
- camera, zones, spawns, loot: not read (data/campaigns and data/maps are listed only).
- hud-ui: percent stats (soldier.cc 965-966). Minimap and touch UX not read.
- vfx and animation: battle clip pairs (init.lua 94-163). Effects not read.
- sound-music: per-file licence tally (csv) and tagged music (LICENSE.txt). Layering and biome beds not read.
- progression: the four-track level model (init.lua 94-141). Talent trees not read.

## 8. Not read
Most of src/ (the battle roll resolution and the server half), campaigns and maps content, i18n and locale strings, the licence texts inside font folders, the csv source pages (external; not opened), critter Lua files, the 48 csv rows checked by tally not one by one, the rest of the tribe folders.
