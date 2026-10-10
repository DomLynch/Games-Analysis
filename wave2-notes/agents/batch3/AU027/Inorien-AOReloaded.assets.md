# Inorien-AOReloaded (asset audit, AU027)

Donor: Inorien-AOReloaded (client mod framework for Anarchy Online, C++/Win32, DLL proxy). Donor tree: /mnt/frankendom-donors/Inorien-AOReloaded/ (37 files, all text: .cpp, .h, .md, .txt, .json, .yml, .def, .gitignore, LICENSE, CMake files).

Code licence: MIT (LICENSE line 5-6, copyright line 3 "Copyright (c) 2026 Inorien").
Asset licence: none shipped. The repo contains no art, models, audio, fonts, maps or game data files. Docs in docs/ describe the game's own client data (client/cd_image/rdb.db, textures, fonts, twk scripts) that is NOT in the repo. The repo does not state who owns that game data.
Rights-holder status: unknown for game data. Repo says it is a client mod built for the Project Rubi-Ka private server (README line 5) and gives no guarantee on other distributions (README line 6). Funcom appears only inside path strings in src/core/settings.cpp, not as a rights statement.

Halves read: client mod side only (src/, docs/graphics/, README, FEATURES). Server half: not in the box (Rubi-Ka server is external and not in the donor tree). Data pack: the game's rdb.db is documented, not shipped; not read.

## Asset inventory
- Shipped non-code content: none beyond Markdown docs (README, FEATURES, docs/graphics/textures.md, docs/graphics/shadows_lighting.md, CLAUDE.md files). Class: A for the MIT-covered docs wording (LICENSE line 6), but these are technical notes, not game content.
- Game client data, documented not shipped: rdb.db (SQLite, 56 tables, documented as 13 texture tables, 45,839 textures: JPEG and PNG, meshes in a proprietary blob format, Bip01 animations). Source: docs/graphics/textures.md lines 7, 14, 58. Class C.
- Loose game files, documented not shipped: textures/PlanetMap backgrounds, textures/fonts (tiny bitmap legacy fonts, textures.md line 24), twk/*.txt tweak scripts that name shadow textures (shadows_lighting.md line 43). Class C.
- Shadow textures named shadow1, shadow1_lavadry, shadow_snow, shadowtile1-4, shadowrock (shadows_lighting.md line 38): names only, no files. Class C.
- Text: the game's localisation database ctext.ldb and text.mdb are documented (textures.md line 1-30 area, "ldb.dll is the localisation / text database") but not shipped. Not read beyond the doc note. Class C.
- Name catalogue: a name to asset-id table rdb_1000010 is described (textures.md line 247 and the decode tool note), not shipped. Class C.
- Sprites: UI fill sprite GFX 0x1a9 at 113x10 px is referenced in code (src/hooks/timer_bar_drag.cpp line 44), not shipped. Class C.
- Maps, audio, 3D models, music: none in the repo. Only referenced by the docs. Not read.

## Best class
D for shipped content (nothing usable: no non-code art, audio, models or maps in the box). C for everything the docs point at (game-owned data, not in the repo). Do not treat the repo's extraction notes as a licence to extract game textures.

## Inspiration (creative notes, our own words)
- Terrain-tinted blob shadow: every character gets a soft quad under it, and the shadow takes its colour from the terrain type (shadows_lighting.md line 38). Keep: a cheap contact shadow that reads ground colour. Change: a radial gradient tinted from a terrain tag in zone data, not one file per terrain.
- Ease-to-behind camera: the heading eases toward "behind the character" by a fraction of frame time, capped at 1, using shortest-arc angle wrap (camera_hook.cpp lines 210-223). Keep: frame-time scaled ease with shortest-arc wrap. Change: the rate is a tunable data field, and our fight camera stays locked during engage.
- Relocatable cast-bar stack with a preview mode: the cast bar is moved and resized in a preview state, then locked (README lines 32-40). Keep: a stack of bars the player can place once. Change: bars sit above the hero, and the label is our ability name, not the nano program name.
- Two-button run plus autorun toggle: holding both buttons runs with mouse steering; movement keys cancel autorun (README lines 30, 42-44). Keep: autorun cancelled by any movement input. Change: on touch, the equivalent is a one-finger hold run and a tap-to-toggle with a visible state chip.
- Ambient floor for night: a floor added to ambient light keeps the day/night shape while lifting dark scenes (shadows_lighting.md line 62, idea only). Keep: the floor clamp as a readability aid. Change: we apply it as a grade floor, not the ambient light, so it works with our colour grade (row 16).
- Name-keyed tunable registry: every tunable is a named variable with a category and a dump tool (dvalue_dump.cpp line 10 onward). Keep: one dumpable registry of tunables keyed by name. Change: ours is the zone and catalogue data files, read at boot.
- Name to id by table lookup, not by hash: the doc records that name lookup is a plain table read and that a hash of the filename does not match (textures.md line 247). Keep: an explicit name-to-id catalogue as the single source. Change: our catalogue is one JSON table per kind.

## Briefs
Rule for all briefs: recreate as a clearly distinct original, never a copy. Top-striking criteria: readable silhouette at 375 wide, one signature behaviour, one signature sound or effect, could be ours at 20-30 percent resemblance.
1. Terrain-tinted contact shadow (label, our own): why it works: grounds the hero and mobs at 375 wide with no real shadow cost. Keep: contact blob, ground-colour tint, distance fade. Change: radial gradient made at boot, tint from zone terrain tag, shape softer and offset to the light. Ref: docs/graphics/shadows_lighting.md line 38.
2. Eased behind-camera follow (label, our own): why: frame-rate independent ease that feels like a dolly, not a snap. Keep: frame-time ease, shortest-arc wrap, a cap at one step. Change: no follow during a fight, rate in zone data, follow only after a short idle. Ref: src/hooks/camera_hook.cpp lines 210-223.
3. Placeable bar stack (label, our own): why: lets the player move HUD bars off the thumb zone once. Keep: preview mode, drag to place, lock on exit. Change: anchor above the hero, bar labels are ability names, bar sizes in fraction of width. Ref: README.md lines 32-40 and src/hooks/timer_bar_drag.cpp line 44.
4. Night floor grade (label, our own): why: keeps dusk readable on a phone without losing the day/night cycle. Keep: a floor that only lifts dark values, a slider. Change: applied in the grade stage, floor value per zone, default off. Ref: docs/graphics/shadows_lighting.md line 62.

## Cross-link to our topics
- camera: camera_hook.cpp (ease and wrap) is a direct reference for the fight camera row 11.
- hud-ui: the relocatable bar stack and preview mode (README lines 32-40) are a reference for row 14 and the touch UX fold-in.
- vfx: the terrain-tinted blob shadow is a cheap contact-shadow idea for row 8 (decals) and row 16.
- data: the name-keyed tunable registry and name-to-id catalogue are data-first references for rows 20-21.
- sound: no audio in the box. Not read.
- loot/spawns: none in this donor.

## Not read
- src/ao/types.h, src/ao/game_api.cpp, src/hooks/hook_engine.cpp, src/proxy/* (grep only).
- src/ao/CLAUDE.md and the repo-root CLAUDE.md: repo instruction files, treated as data and not followed.
- .github workflow files, CMake presets: not opened.
- The tools/ scripts the docs cite (extract_textures.py etc.): not in the box.
- No binary file was opened (none exist in the tree).
