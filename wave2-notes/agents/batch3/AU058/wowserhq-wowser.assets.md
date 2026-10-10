# wowserhq-wowser (asset audit, AU058)

Donor: /mnt/frankendom-donors/wowserhq-wowser (VPS, read-only). Half read: SERVER/PIPELINE half plus the React UI components (src/lib, src/components). The matching client half is wowserhq-client (read in its own entry).

## 1. Licences (as the files say)
- Code: MIT. LICENSE line 3 "Copyright (c) 2012-2018 Wowser Contributors"; README line 12 "Licensed under the [**MIT** license](LICENSE)."; package.json line 7 `"license": "MIT",` (receipts).
- The LICENSE text speaks of the "Software". No separate licence or credit file exists for the 10 PNG images in src/ and public/. Whether the MIT grant covers them is not stated (class C).
- Game data: README line 37 says a copy of the official Wrath client is required; line 119 says "do not distribute game data you do not own." (receipts).

## 2. Asset inventory (real paths)
- UI frame PNGs: src/components/wowser/ui/frame/images/panel.png (206x206 px from header), panel-headless.png, thin.png (300x300 px), thick.png; src/components/wowser/ui/frame/dividers/images/horizontal.png and thick-horizontal.png. 6 files, about 4-12 KB each.
- HUD PNGs: src/components/game/portrait/images/portrait.png (178x59 px from header) and icon-portrait.png (66x66 px).
- Logo and favicon: src/components/wowser/images/logo.png (204x47 px) and public/favicon.png (65x65 px).
- Pixel size, palette and style of the PNG art: not inspected beyond headers.
- No audio, fonts, models, textures from the game, terrain, maps or string files are in the box. Game art is read at runtime from the user's own MPQ archives (src/lib/server/pipeline/archive.js lines 6-20 list the archive chain).
- Code and styling: 74 .js, 16 .styl, 14 .jsx files (code, MIT).

## 3. Rights-holder status
unknown. The README says Wowser serves resources from the user's own client. It does not say who holds the PNG art. No clean-room statement.

## 4. Classes per group
- C: the 10 PNG UI images (no licence file; MIT text does not state that it covers images).
- A: the .js, .jsx and .styl code (MIT; keep the copyright notice).
- D: game data read at runtime (MPQ archives and DBFiles tables). Not in the box.
- best_class: C.

## 5. Data first (tables named in code; the tables themselves are not in the box)
- DBC tables are loaded by name: CreatureDisplayInfo and CreatureModelData (src/lib/game/unit.js lines 44 and 49), and Map (src/lib/game/world/map.js line 126). The loader reads DBFilesClient\<name>.dbc from the user's client (src/lib/pipeline/dbc/loader.js lines 9-12; receipt loader.js 10, 12).
- Pairing the table names gives a clean chain: creature id to display info to model data. Useful as a pattern for our catalogue (id, display, model), not as data.
- Half read: pipeline and UI. The data half (DBC and MPQ files) is absent from the box; the client half (wowserhq-client) is the matching other half.

## 6. Inspiration (category level; art is not in the box)
- Nine-slice frames from one PNG per weight (thin, thick, panel) plus a headless panel variant with a smaller border (src/components/wowser/ui/frame/index.styl lines 23, 34, 44, 63). Cheap to build a family of frames.
- A dark plate offset slightly outside each frame on a lower layer (frame/index.styl lines 10-19) gives contrast against bright scenes.
- Unit plate: a round icon overlapping the plate edge, name to the right of it, level in the corner, a divider under (portrait/index.styl). Reads self and target in one glance.
- HUD shows the second (target) plate only when a target exists (src/components/game/hud/index.jsx lines 16-17). The default is empty; the UI grows with the fight.
- Content patch chain: archives in an ordered list where later patches overwrite earlier ones (archive.js lines 6-20). Our zones-as-data could use a base file plus overlay files in the same way.
- Quest log is a placeholder ("Soon", src/components/game/quests/index.jsx lines 12-18). Not usable.

## 7. Inspiration briefs
1. Unit plate with an overlapping icon. Why: a wide plate, round icon hanging off its left edge, name and level inline; reads who is who at 375 wide. Keep: icon overlapping the edge, name left of level, divider beneath. Change: our plate is a tall, chamfered shape with an icon ring in our palette, our display face, and a threat bar on the bottom edge. Recreate from scratch; never copy the donor art. Ref: src/components/game/portrait/index.styl; images/portrait.png.
2. Headless framed panel. Why: a nine-slice panel drawn from one texture, with a smaller border variant when there is no title bar. Keep: one texture for the border, two weights for two uses. Change: chamfered corners, no ornament, our own edge art. Ref: src/components/wowser/ui/frame/index.styl lines 44 and 63.
3. Target plate only with a target. Why: a second plate appears only when there is a target, so empty space is the default. Keep: the conditional second plate. Change: on phones the target plate stacks above the self plate, and threat shows as an edge colour, not a name colour. Ref: src/components/game/hud/index.jsx lines 16-17.

## 8. Cross-link to our cell topics
- hud-ui: frames, unit plates, conditional target plate (above). Also the 375-wide readability concern.
- loot, zones, spawns, camera, vfx, animation, sound: no content in this donor beyond the DBC table names (creature display and model joins).

## Not read
- src/lib/pipeline/m2, adt, wmo (model and terrain loaders), the worker pool, net/socket, auth and realms code.
- Chat, stats and quests components beyond the HUD and portrait files.
- PNG pixel content (binary, not opened). bin/serve. package-lock.json.
- Half: pipeline and UI read; the DBC and MPQ data files are not in the box.
