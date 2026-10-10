# drgomesp-midgarts: asset audit (AU017)

Donor root: /mnt/frankendom-donors/drgomesp-midgarts/ (VPS, read-only)

## Licences (as the files say)
- Code: conflicting. LICENSE is the GNU GPL v3 full text with no copyright line (LICENSE line 1). README.md line 165 says the project is under the MIT License. Class C on the conflict.
- Assets: no asset licence stated for the repo. The font metadata says use is granted subject to the GNU GPL (assets/fonts/FreeSans.ttf, binary line 2283). The GRF fixtures state nothing.

## Rights-holder status
- Unknown. The repo names no copyright holder. README line 106 says the client needs a user-supplied GRF through GRF_FILE_PATH, so the game data is original and not in the repo. The owner of that data is not named in the files read.

## Halves
- Read: the client half (Go SDL/OpenGL renderer under cmd/ and internal/, plus the GRF and SPR parsers).
- Data pack: not read in content. The five GRF files in assets/grf/ are parser fixtures; their contents were not opened.
- Server half: not in this repo. The box has a folder named rathena-rathena, which was not read; whether it matches this client is not verified.

## Data tables (data first)
- No CSV, JSON, XML, Lua or SQL data tables in the repo (full file list of 78 files checked).
- The game's sprite and map tables live inside the user-supplied GRF. Not read.

## Asset inventory
- assets/fonts/FreeSans.ttf: 568,896 bytes, TrueType. Class B (GPL per font metadata).
- assets/grf/: five GRF files (936,658 B, 655 B, 57 B, 46 B, 0 B). Class C, origin unknown.
- Game sprites and maps: none in the repo. Class D for the box copy.
- No music, no 3D models, no textures, no dialogue or item text in the repo.

## Cross-link to our cell topics
- camera: internal/camera/camera.go exists; not read.
- zones: internal/romap/map.go and the .gat/.gnd loaders; not read.
- spawns, loot: no files found in the repo.
- hud-ui: none beyond the font.
- vfx: box.frag is a debug fill shader; sprite.frag does the tint.
- animation: the action index and 8-facing tables are worth a look (see below).
- sound: no audio in the repo.

## Inspiration (own words, technique level)
- Paper-doll character: four stacked layers (shadow, body, head, shield) in fixed order. internal/character/attachments.go.
- Eight facings with a mirror remap table. internal/character/directiontype/statetype.go.
- Action blocks of eight rows per action in one atlas. internal/character/actionindex/actionindex.go.
- Palette-indexed, run-length packed sprites. internal/fileformat/spr/spr_file.go.
- Hard alpha cut plus per-vertex tint as hit flash or faction colour. internal/system/opengl/shaders/sprite.frag.
- Sprite-pair manifest: action file matched to sprite sheet by name. internal/fileformat/grf/grf_file.go.

## Briefs
See drgomesp-midgarts.assets.json, key "briefs" (3 briefs). Each brief names the trait kept and the trait changed, and states Dom's rule: a clearly distinct original, never a copy.

## Not read
See the not_read list in the JSON.

## Binary metadata note
- Font and Ogg metadata lines were read with grep -a on binary files. They are not in receipts.tsv because the verifier cannot decode binary lines.
