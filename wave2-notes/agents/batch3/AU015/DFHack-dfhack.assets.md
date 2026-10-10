# Asset audit: DFHack-dfhack

Class: **C** (the graphics are described as derived from Dwarf Fortress art under a permission line the repo does not spell out). Code is Zlib.

## Licences (as the files say)
- Code: Zlib for the core, plugins, scripts and other DFHack code unless noted (`LICENSE.rst` line 7). Some MIT and BSD components. The JSON.lua component is CC-BY-SA 3.0 (`LICENSE.rst` line 63).
- Graphics: "Some graphic assets are derived from vanilla DF assets and used with permission from Bay12" (`LICENSE.rst` lines 15 to 16). The repo does not state the scope or terms of the permission.
- Blueprints, screenshots and stockpile presets: no licence line of their own found.

## Rights-holder status (repo files only)
- Third-party tool for Dwarf Fortress (`README.md` line 8: a Dwarf Fortress memory access library).
- Graphics: derived from Dwarf Fortress art, with permission from Bay12 (`LICENSE.rst` line 15). Otherwise unknown.

## Asset inventory
| Group | Path | Count / size | Class |
|---|---|---|---|
| UI chrome and icons | `data/art/` | 23 PNG: border frames 56 x 36; pins 16 x 24; icon strip 40 x 24; glyph sheet 416 x 64; tile sheet 128 x 144 | C |
| Documentation screenshots and Stonesense samples | `docs/images/` | 30 PNG (screenshots and sprite diagrams) | C |
| Quickfort blueprint layouts | `data/blueprints/` | 50 CSV, 2 XLSX | C |
| Stockpile presets | `data/stockpiles/` | 100 binary .dfstock | D |
| Stonesense art guide | `docs/guides/stonesense-art-guide.rst` | 71 lines of prose | C |

## Inspiration (own words)
- Isometric footprint sprite: a 32 px sprite whose solid footprint sits on a 2:1 diagonal, with a dotted volume for one storey above (`docs/images/stonesense-sprite-template.png`; `stonesense-art-guide.rst` lines 19 and 36).
- Floors on their own sheet (32 x 20 px), separate from object sprites, so ground and objects layer cleanly (`stonesense-art-guide.rst` lines 21 and 71).
- One sprite sheet addressed by a single index with a fixed row width (`docs/images/stonesense-indexed-sprites.png`).
- One frame family in three line weights: bold, medium, thin (`data/art/border-*.png`).
- Two-colour map pins (`data/art/red-pin.png`, `data/art/green-pin.png`).
- Packed glyph sheet for a text UI (`data/art/curses-small-letters_top-left.png`).
- Layouts as text grids: crypts and mines written as character plans (`data/blueprints/tombs/`).

## Briefs (originals, not copies)
1. **Isometric footprint sprite kit** (own label). Why: a diamond footprint with a column reads as a 3D room from flat tiles. Keep: footprint and volume outline; floors on their own sheet. Change: our own tile size and ratio; our own wall ornament. Ref: `docs/images/stonesense-sprite-template.png`.
2. **Two-colour map pin** (own label). Keep: small silhouette, two colours for two states. Change: a diamond or flag shape; a third state colour. Ref: `data/art/red-pin.png`, `data/art/green-pin.png`.
3. **Weighted frame family** (own label). Keep: same outer size; bold, medium and thin weights. Change: our corner ornament and palette. Ref: `data/art/border-bold.png`, `border-medium.png`, `border-thin.png`.
4. **Crypt plan as a text grid** (own label). Keep: one character per cell; rooms as blocks. Change: our room shapes and names. Ref: `data/blueprints/tombs/` (path only).

## Cross-links
- camera: the 2:1 isometric footprint rule is a projection choice.
- zones and spawns: the crypt and mining plans are cell-grid zone layouts.
- hud-ui: frame family, pins and glyph sheet.
- animation, vfx, loot, sound: none in this donor.

## Not verified
- Binary PNG content: sizes from headers only; no image viewed.
- The two XLSX test files and the 100 .dfstock files: headers only.
- `docs/images` content: names and counts only.
- `depends/`: only the LICENSE.rst table read, not each package's licence.
- Blueprint CSV contents: only the tombs folder searched for author or licence lines.
- No `_RESTRICTED-NOTE.txt` in this donor.
