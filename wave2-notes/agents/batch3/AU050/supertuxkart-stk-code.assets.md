# supertuxkart-stk-code (asset audit, AU050)

Donor: `/mnt/frankendom-donors/supertuxkart-stk-code` (VPS, read only)
Code licence: GNU GPL version 3 or later (COPYING line 1; README line 24).
Asset licence: mixed, per file. COPYING line 3 says the data files are under "a mixture of licenses including, but not limited to" GPL, CC-BY (line 6), CC-BY-SA (line 7) and Public Domain (line 8). COPYING points to `licenses.txt` files in the data subfolders (16 found). No licence file at the data root. The 3D models, tracks, music and sound effects are NOT in the box.
Rights holder status: unknown as one owner. The licence files name the "SuperTuxKart dev team" (`data/gui/icons/licenses.txt` lines 9 and 19), and some named artists in the skin folders. Community project, not a company, no clean-room claim.
Best class: A, but only for the SIL OFL 1.1 fonts (keep the notice). The skin and icon art is B (CC-BY-SA). Data tables and effect files are C (no licence file). Models, tracks and music are D (absent).

Which half: I read the code half partly (`src/items/rubber_ball.cpp`, `src/items/powerup_manager.cpp`, one default in `src/config/stk_config.cpp`) and the data half partly (`data/items.xml`, `data/official_karts.xml`, `data/powerup.xml`, `data/kart_characteristics.xml`, `data/stk_config.xml` line 239, `data/gfx/explosion.xml`). The asset half (models, tracks, music, sound) is absent: no .spm, .ogg, .mp3, .wav, .blend, .obj or similar in the tree. Note: `src/items/rubber_band.cpp` is the plunger's elastic cord, not the catch-up mechanism. Only its header was read.

## Asset inventory

| group | path | count hint | class |
|---|---|---|---|
| fonts | `data/ttf/` | 9 .ttf and 2 .otf | A (OFL 1.1), B for wqyMicroHei (GPLv3 with font exception and Apache-2.0) |
| skin and icon art | `data/skins/`, `data/gui/icons/` | about 778 PNG across data/ | B (CC-BY-SA 3.0 or 3.0+); C for files the cartoon licence says have unclear authors |
| particle XML | `data/gfx/*.xml` | 44 files | C |
| kart, item, power-up tables | `data/kart_characteristics.xml`, `official_karts.xml` (18 karts), `items.xml` (7 entries), `powerup.xml`, `stk_config.xml` | see note | C |
| challenges, grand prix, replays | `data/challenges/` (28), `data/grandprix/` (4), `data/replay/` (51) | counts | C |
| translations | `data/po/` | 65 .po | C |
| shaders | `data/shaders/` | about 145 files | B (under GPL-3 as code) |
| models, track textures, music, sound | not in box | 0 | D |

## Inspiration

- A homing ball's speed depends on distance to its target: near (50 m or less) it adds a small offset to the target's max speed, far (250 m or more) a larger one, linear between. The speed changes by a 5-second slew so a shortcut does not make it jump (`src/items/rubber_ball.cpp` 304-307, 560-585).
- Mismatch to note, not copy: the item block sets the near offset to 9.0 (`data/powerup.xml` line 78), but the loader raises it to at least 10.0 (`src/items/rubber_ball.cpp` 355-356). Fix in our version: one place for the clamp and a test that prints the effective value.
- Drops are chosen per finishing position: each rank has its own weight row, one random number is taken modulo the summed weights and walked cumulatively (`src/items/powerup_manager.cpp` 415-448, 609; `data/powerup.xml` 101-120). A catch-up without a visible rubber band.
- Explosive drops are swapped for a harmless pick during the first 15 seconds (`data/stk_config.xml` 239; `src/items/powerup_manager.cpp` 623-624). An opening-grace rule.
- Difficulty is a list of multipliers on the base kart: easy 0.6 on max speed, medium 0.8, hard 0.92, best unchanged (`data/kart_characteristics.xml` 348-361).
- Relative values in data: multiply, or add then multiply, evaluated left to right with no precedence (`data/kart_characteristics.xml` lines 1-22). A useful catalogue rule with its trap written down.
- Particle bursts are data: sphere emitter, wide spread, a high rate for a short life, size that grows (`data/gfx/explosion.xml` 2-29).
- Each item kind has one glow colour in one table (`data/items.xml`), a type cue at a glance set as data.

## Briefs (recreate as clearly distinct originals; never copy)

- **Homing bouncer with distance-scaled speed.** Keep: speed scales with distance to target; slew-limited; a visible bounce arc. Change: a chain of glyphs, not a ball; speed band 0.8x to 1.3x of the target's walk; slew 2 seconds, not 5. Ref: `src/items/rubber_ball.cpp` 552-598; `data/powerup.xml` 75-86.
- **Finishing-position drop table.** Keep: one weight row per rank; modulo and cumulative walk. Change: row chosen by loss streak in a zone; our own item set; weights as zone data. Ref: `src/items/powerup_manager.cpp` 415-448; `data/powerup.xml` 101-120.
- **Opening grace on explosive drops.** Keep: timed swap to a harmless pick; timer as data. Change: first 10 seconds of a zone visit, swap shown as a grey tell. Ref: `data/stk_config.xml` 239; `src/items/powerup_manager.cpp` 623-624.
- **Difficulty as a multiplier table.** Keep: rows multiply the base; top row is the base. Change: zone threat names instead of easy and hard; add a hit-point multiplier. Ref: `data/kart_characteristics.xml` 348-361.
- **Sphere burst that grows.** Keep: wide spread, short high-rate life, growing size. Change: a flat ring of sparks in our palette; 0.4 s life to fit hit-stop. Ref: `data/gfx/explosion.xml` 2-29.

## Cross-link to our topics

- Spawns and encounters: the rank-weighted table and the opening grace are zone-data ideas.
- Progression and balance: the multiplier table and the distance-scaled speed.
- VFX: the particle XML shape.
- HUD and accessibility: the per-item glow colour as a type cue (no values copied).
- Sound and camera: nothing in the box for audio; camera is in `src/` (not read).

## Not read

`src/` beyond the cited items files and one stk_config default; `src/items/rubber_band.cpp` body; `kart_characteristics.xml` beyond lines 1-30, 100 and 346-361; `powerup.xml` beyond the cited lines; `stk_config.xml` beyond line 239; replay bodies; challenge bodies; PO files; shader bodies; particle XML other than explosion.xml; skin images (names and licences only); `data/supertuxkart.git` (read as a pointer file); `lib/` third-party tree.
