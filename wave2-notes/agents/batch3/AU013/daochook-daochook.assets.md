# daochook-daochook: asset audit (AU013)

Source: /mnt/frankendom-donors/daochook-daochook (read-only, VPS). Third-party add-on for Dark Age of Camelot. A record of what the files say, not a legal opinion.

## Halves
- Client-side add-on half: read in part (addons/ Lua layout and names; addons/find/find.lua lines 139-170).
- Binaries NOT READ: daochook.exe, hook.dll, addons/libs/socket/ssl.dll.
- Server half: NOT READ and not in the box. README line 59 says the work targets private servers.
- Data-pack half: the user's own DAoC client. Not in the box.

## Licences (as the files state them)
- Code: GNU AGPL v3. LICENSE line 1 is "GNU AFFERO GENERAL PUBLIC LICENSE". README line 69 says "licensed under GNU AGPL v3" and adds "This is AGPL, not standard GPL."
- Assets: no separate asset licence. The only image is repo/daochook.png (the logo). No licence line names it, so it is class C.
- Third-party libraries (Detours, ImGui, MoonJIT, lstruct, luasocket, luasec, openssl, sol3): listed in the README credits. Their licence files are not in this tree.

## Rights status (from the README)
- Line 52: the project "does not claim ownership of any material(s) related to DAoC."
- Line 55: "Dark Age of Camelot is copyright © 2021 Electronic Arts Inc."
- Line 59: the reverse engineering is described as "clean room" and done against private servers.
- Line 65: no claim of ownership over material gathered by reverse engineering.
- Status: third-party modding tool for a commercial client. No game material is shipped.

## Asset inventory
- Game art, audio, models, maps: none in the tree.
- Logo: repo/daochook.png, 20 KB. Class C. Not opened.
- Pointer tables: config/pointers/1127101_1409.ini, 1127101_1411.ini, 11130_0.ini (about 8.6 KB each). Reverse-engineering data per client build. Not opened. Do not describe values.
- Boot example: config/boot/example.ini. Not read. Class D.
- Lua: 59 files under addons/. Code under AGPL as the README states. Class A as code.
- Binaries: daochook.exe (416 KB), hook.dll (5.8 MB), ssl.dll. Class D. Not opened.

## Data tables (data first)
- config/pointers/*.ini: per-build pointer tables, keyed by build id in the file name. Names only.
- addons/libs/daoc/<build>/*.lua: per-build modules (items, buffs, entities, chat, party, player and others). Names only; data bodies not read.
- Names and looks of items or monsters: not seen in any file read.

## Classes by group
- A: Lua add-on code (AGPL as code).
- C: logo, pointer tables, third-party libraries without licence files in the tree.
- D: binaries, boot example, and the absence of game art or audio.
- best_class: D (no usable non-code game content). The logo is class C.

## Inspiration (UI and technique only: this donor has no creatures, items, armour, zones or effects)
- A search window with a name filter, a four-column item table and row tooltips showing slot and level (addons/find/find.lua lines 139-170). A pattern for any finder in our HUD.
- Immediate-mode tool windows (addons/find/find.lua, addons/libs/imgui.lua). A dev-only overlay style for our debug panel, kept out of the player HUD.
- Per-build config files named by build id (config/pointers/). Keep version-specific values in data, so one code base can support several builds.
- Version-scoped module folders (addons/libs/daoc/<build>/) over a shared core. A layout we can reuse for content packs.
- A live event feed window (addons/packetlogger/packetlogger.lua; name read only). An idea for playtest feedback.
- Sample add-on scripts as a starter kit (addons/example/, addons/example_packets/). Ship a minimal template with each new feature.

## Briefs (UI-level; class D donor, so category-level only)
- Searchable finder panel: keep a name filter, a compact table and hover detail; change to our own columns, icons and theme, with a card list on a 375-wide phone.
- Debug event feed: keep a scrolling log of recent events; change to a dev-only toggle, our own styling and category filters.
- Per-build config split: keep one config file per build id loaded at start; change to our own schema and content packs instead of client builds.
- Every brief: recreate as a clearly distinct original, never a copy. None of these is a creature, item, armour, zone or effect look, because the donor has none.

## Cross-link to our cells
- Camera, zones, spawns, loot: none in assets. Config and module layout only.
- hud-ui: the finder panel and the debug overlay.
- vfx, animation, sound: none shipped.

## Not read
Binaries (exe, dll); pointer table bodies; daoc module data bodies; the logo; third-party library licence texts (not in tree); packetlogger and example bodies (names only); the documentation website (not fetched).
