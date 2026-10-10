# Asset audit: alexbatalov-fallout1-ce (AU003)

Class: **C** overall. The repo ships no usable game art, audio, maps or text; the only non-code content is launcher icons with unclear status. The original game data is proprietary and user-supplied (class D for us).

## Licences (as the files say)
- Code: Sustainable Use License 1.0 (LICENSE.md line 1 "# Sustainable Use License"). Line 15: "You may use or modify the software only for your own internal business purposes or for non-commercial or personal use." It also says distribution is free of charge and for non-commercial purposes, and that licensor notices must not be removed. README line 115 points the source to this licence.
- Assets: no separate licence. The SUL is the only licence file read.
- Rights holder: fan community re-implementation (README line 3, "fully working re-implementation of Fallout"). README line 9: "You must own the game to play." The original publisher is not named in the files read.

## Asset inventory
- Original game data: not in repo. README lines 17, 41 and 43 say to copy master.dat, critter.dat and the data folder from a user's own install (Windows, or the MacPlay bundle). Class D.
- Launcher icons: os/android mipmap PNG files (15, 48px to 432px), os/ios AppIcon.png (1024x1024, about 1.6 MB), os/windows fallout-ce.ico, os/macos fallout-ce.icns. Class C: the files do not say whether the art carries Fallout marks.
- third_party sdl2 and fpattern LICENSE files: not read.

## Inspiration (own words)
- A single handheld tabbed screen opened with a stated reason and saved with the game (pipboy.h line 11 and save_pipboy/load_pipboy).
- Screen fades done by moving the colour table, not by overlay (palette.h line 12).
- A credits roll driven by a data file plus a forward or reversed style flag (credits.h line 6).
- Game built as small mechanical modules (combat, combat AI, party, perk, skill, inventory). Use for structure only.
- Icon-set discipline: one master, sizes exported from it.

## Briefs
1. Handheld tabbed terminal: keep open-by-intent, tabbed sub-screens and saved state; change to a phone bottom sheet with our own chrome. Ref: src/game/pipboy.h line 11.
2. Palette-ramp screen fade: keep fade by colour table; change to a colour-matrix tween tinted by location. Ref: src/game/palette.h line 12.
3. Data-driven credits roll: keep data-file input and reverse style; change to touch flick scrolling and our font. Ref: src/game/credits.h line 6.

## Cross-link to our cell topics
- hud-ui: pipboy.h (tabbed device screen), palette fades.
- vfx: palette-ramp transitions.
- camera, zones, spawns, loot, animation, sound: no assets in repo; code only, not read in depth.

## Not read
- Source bodies beyond the quoted lines; all PNG, ICO and ICNS pixels; third-party LICENSE texts; README sections beyond those quoted; original Fallout data (not fetched).
