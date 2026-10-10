# Asset audit: diasurgical-DevilutionX

Class: **C**. The in-tree assets are Diablo-format sprites, palettes, maps and tables with a Blizzard copyright notice and no stated origin. The licence is non-commercial only. Treat the art as inspiration. The structure (palette remaps, data tables, loot affixes) is the useful part.

## Licences (as the files say)
- Code and project: Sustainable Use License 1.0 (`LICENSE.md` line 1). Use is limited to internal business or non-commercial or personal use (`LICENSE.md` line 15). Source is "for non-commercial use only" (`README.md` line 84). This is not an OSI open-source licence.
- Assets: no separate licence file. `README.md` line 82 says the whole project is released under the SUL, which covers `assets/` and `mods/` by location.
- Origin: the files do not say whether `assets/` is extracted from the original game or is new work. `README.md` line 31 says the user copies DIABDAT.MPQ from their own game. `CMakeLists.txt` line 204 says assets are packed into devilutionx.mpq at build.
- Copyright notice: "Blizzard Entertainment, Inc. All rights reserved." (`README.md` line 86). The project disclaims association with Blizzard (line 88).

## Rights-holder status (repo files only)
- Port of Diablo (Blizzard). Origin of the in-tree assets not stated.
- UI and graphics credited to Nikolay Popov (`README.md` line 76). No licence line on those files.
- Hellfire mod: author named as Synergistic Software (`mods/hf/manifest.ini` line 4).

## Asset inventory
| Group | Path | Count / size | Class |
|---|---|---|---|
| Cutscene stills, pause table | `assets/gendata/` | 10 files, about 1.9 MB | C |
| UI panels and buttons | `assets/data/` (with `inv/`) | 24 files, about 340 KB | C |
| UI art, palette | `assets/ui_art/` | 11 files, about 568 KB | C (credited author, no file licence) |
| Fonts (glyph sheets, colour tables) | `assets/fonts/` | 80 files, about 2.3 MB | C |
| Maps | `assets/levels/`, `assets/arena/` | 6 DUN files, 1 AMP file | C |
| Game text tables | `assets/txtdata/` | 51 files, about 500 KB; monstdat 113 lines, itemdat 169, prefixes 84, suffixes 96, questdat 25, spelldat 37, textdat 339 | C |
| Player colour tables | `assets/plrgfx/warrior/whu/` | 3 TRN | C |
| Hellfire mod | `mods/hf/` | 25 files | C |
| Lua library | `assets/lua/inspect.lua` | MIT block at line 23 | A (MIT, with the SUL also applying by location) |
| Audio | none as audio files | 0 WAV, OGG or MP3; 1 AMP | D |

Totals: 195 files under `assets/`, of which 100 CLX, 20 TRN, 49 TSV, 8 Lua, 6 DUN, 5 PNG, 2 PAL.

## Inspiration (own words)
- Palette remap tables: one sprite set recoloured for variants and effects by swapping colour indexes (`assets/plrgfx/warrior/whu/whulm.trn`, `assets/gendata/pause.trn`).
- Indexed run-length sprites with one palette: transparent areas cost almost nothing (`assets/gendata/cutl1dw.clx`).
- Animation as a data table: each creature row has a sprite width and six animation slots, each with a frame count and a frame rate (`assets/txtdata/monsters/monstdat.tsv`).
- Loot by prefix and suffix tables, with unique items in a separate table (`assets/txtdata/items/item_prefixes.tsv`, `item_suffixes.tsv`, `unique_itemdat.tsv`).
- One map file per floor, and the town as its own file (`assets/levels/l1data/`, `assets/levels/towndata/automap.dun`).
- Storyboard stills with portrait frames carry a short cutscene (`assets/gendata/cutportrw.clx`, `cutstartw.clx`).
- An add-on folder for the expansion: `mods/hf` with its own manifest and overrides (`mods/hf/manifest.ini`).

## Briefs (originals, not copies)
1. **Armour-tint hero set** (own label). Why: one body animation and several colour tables give many armour looks. Keep: shared frames, one remap table per variant. Change: our silhouette, shoulder ornament and tints (no metal names). Ref: `assets/plrgfx/warrior/whu/whulm.trn` (names only; not opened).
2. **Ruined chapel dungeon** (own label). Why: one large room gives a focal point. Keep: a dominant room with a clear plan. Change: our architecture and lighting. Ref: `assets/arena/church.dun` (not opened).
3. **Creature sheet by table** (own label). Keep: per-creature frame counts and rates per state. Change: our state names and counts. Ref: `assets/txtdata/monsters/monstdat.tsv` (structure only).
4. **Storyboard still strip** (own label). Keep: a wide still plus cropped portrait frames at a fixed size. Change: our composition and aspect. Ref: `assets/gendata/cutportrw.clx` (not opened).

## Cross-links
- spawns and animation: `monstdat.tsv`.
- zones: per-floor DUN maps and arena set-pieces.
- loot: prefix, suffix and unique tables.
- vfx: palette remap as a cheap colour effect.
- sound: `assets/txtdata/sound/effects.tsv` names sounds, but no audio files are in the tree.
- hud-ui: panels and buttons in `assets/data` and `assets/ui_art`.

## Not verified
- All CLX, TRN, DUN, PAL, PNG and AMP content: names, counts and sizes only.
- Text contents: headers and line counts only. One dialogue line in `textdat.tsv` was seen during the format check; it is not reproduced.
- Lua mod bodies (only `inspect.lua`'s licence block read).
- The external devilutionx-assets repository, which the README links to (not looked for).
- No `_RESTRICTED-NOTE.txt` in this donor.
