# Asset audit: alexbatalov-fallout2-ce (AU003)

Class: **C** overall. Like the Fallout 1 port, the repo ships no usable game art, audio, maps or text. Non-code content is launcher icons with unclear status. The original data and mod data are user-supplied and proprietary (class D for us).

## Licences (as the files say)
- Code: Sustainable Use License 1.0 (LICENSE.md line 1). Line 15: "You may use or modify the software only for your own internal business purposes or for non-commercial or personal use." README line 117 points the source to this licence.
- Assets: no separate licence. The SUL is the only licence file read.
- Rights holder: fan community re-implementation (README line 3, "fully working re-implementation of Fallout 2"). README line 11: "You must own the game to play." The original publisher is not named in the files read.

## Asset inventory
- Original data: not in repo. README line 69 names master.dat, critter.dat, patch000.dat and a data folder from the user's own install. Mods such as Nevada and Sonora are said to be partly supported (README line 5), so mod data is also outside the repo. Class D.
- Launcher icons: os/android mipmap PNG files (15), os/ios AppIcon.png (1024x1024, about 1.0 MB), os/windows fallout2-ce.ico, os/macos fallout2-ce.icns. Class C.
- third_party zlib, fpattern and sdl2 LICENSE and README files: names only, not read.

## Inspiration (own words)
- Lip-sync by phoneme table: 42 mouth slots (lips.h line 10) with speech markers keyed to audio. Recreate with 8 to 12 of our own mouth shapes.
- Automap that keeps its view options in the save file (automap.h lines 17-18).
- Cutscenes as a streamed frame container with audio and per-frame effects (movie_lib.cc, movie_effect.cc). Use a standard video format instead.
- Palette, light and art kept as separate modules (color.cc, light.cc, art.cc, tile.cc names). Recreate as one tint layer.
- Sound effects cached by a fixed list (sound_effects_cache.cc, sound_effects_list.cc).
- Separate worldmap module (worldmap.cc, worldmap.h), names only.

## Briefs
1. Phoneme-timed talking head: keep a fixed mouth-shape set and speech markers; change to 8 to 12 shapes and our own face. Ref: src/lips.h line 10.
2. Automap that remembers its view: keep view state in the save; change to isometric projection with our own markers. Ref: src/automap.h lines 17-18.
3. Streamed cutscene with effects: keep stream plus audio and per-frame effects; change to standard video and our transitions. Ref: src/movie_lib.cc line 535 (container signature only).

## Cross-link to our cell topics
- animation: lip-sync phoneme table (lips.h).
- hud-ui: automap view state, worldmap module.
- sound: sound effects cache and list (names only).
- vfx: palette and light modules (names only).
- camera, zones, spawns, loot: no assets in repo; not read in depth.

## Not read
- Source bodies beyond quoted lines; all PNG, ICO and ICNS pixels; third-party licence and readme text; README beyond quoted lines; original Fallout 2 and mod data (not fetched); worldmap, color, light, art and tile sources.
