# crossuo-crossuo: asset audit (AU012)

Source tree: /mnt/frankendom-donors/crossuo-crossuo/ (read-only on VPS). Half read: client only. The server half is not in this donor. Other Ultima Online halves named in the box: ModernUO (server), ClassicUO, xrip-uo-client, ZaneDubya-UltimaXNA (names only, not read).

## Licences (as the files say)
- Code: AGPL-3.0-or-later for new files (LICENSE, README SPDX line 3). LICENSE.old says some files are still MIT and new files are AGPL3 (LICENSE.old lines 1 and 3). Many src files carry an MIT SPDX header (e.g. src/QuestArrow.cpp line 1).
- Resources: .reuse/dep5 line 6 "Files: resources/*" with "License: AGPL-3.0-or-later" (line 8). Covers logo.png, launcher png, client.ico, launcher.ico, crossuo.icns, cursor.cur, icon headers.
- Third-party: external/LICENSE.stb offers MIT (line 3). deps/sdl-2.0.10 falls under the dep5 wildcard "License: Zlib or Libpng" (dep5 lines 205 and 207).
- Game data: docs/CONTRIBUTING/Compiling.md line 44 says the user needs all the original Ultima Online data files. None are in the repo.

## Asset inventory
- resources/: 7 binary art files (logo, launcher art, three app icons, cursor), plus icon headers. Pixel sizes not read.
- deps/sdl-2.0.10: 81 png/bmp and 5 wav demo files (count only; not opened). Not game content.
- external/gfx and external/imgui: code only.
- No maps, models, music or game text in the repo. Game art, fonts, maps and sounds are read at runtime from the UO data directory (src/Managers/ProfessionManager.cpp line 381 is one example: "could not find prof.txt in your UO directory").

## Classes
- resources/ logos and icons: B (AGPL per dep5).
- deps/sdl demo media: A (zlib/libpng per dep5 wildcard). Not game content.
- UO data (not in repo): D for this repo. Any UO-derived art would be C.
- Rights holder: unknown. New files carry copyright lines for Danny Angelo Carminati Grein (2020). The repo does not say official, fan, clean-room or leaked.

## Inspiration (own words)
- The HUD is many small gump windows: book, bulletin board, combat book, buff, custom house (src/Gumps/). Copy the modular pattern, not the art.
- Quest pointer: a screen-space arrow from the player to the goal (src/QuestArrow.cpp, Draw()).
- Weather: a particle layer with a size set per particle from an ID (src/WeatherEffect.cpp line 10).
- One logo and one icon in several platform formats (resources/).
- Custom house builder shows a multi-tile preview before placement (src/GUI/CustomHouseMultiObject.cpp; not read in detail).
- Custom cursor as a cheap identity cue (resources/cursor.cur).

## Briefs
1. Quest pointer chevron. Keep: single screen-space pointer, direction from player to goal. Change: chevron ribbon, our palette, HUD-edge anchor. Ref: src/QuestArrow.cpp.
2. Notice board window. Keep: list of posted notes, post action, per-item sub window. Change: pinned paper cards, wood frame, drag-to-pin. Ref: src/Gumps/GumpBulletinBoard.cpp.
3. Drifting weather layer. Keep: per-particle size from ID, sparse drift. Change: pixel-cell particles, tint by region, wind per zone. Ref: src/WeatherEffect.cpp.
4. Two-page reading panel. Keep: two-page spread, page turn. Change: bound edges, bookmark ribbon. Ref: src/Gumps/GumpBook.cpp (name only; not read in detail).
Rule for every brief: recreate as a clearly distinct original, never a copy.

## Cross-link
Camera, zones, spawns and loot are not present as assets here. HUD-UI and VFX (weather, quest pointer) are the topics with code worth a look. Animation and sound: nothing.

## Not read
See the not_read list in crossuo-crossuo.assets.json (deps demo contents, binary art pixel contents, GumpBook and CustomHouse internals).
