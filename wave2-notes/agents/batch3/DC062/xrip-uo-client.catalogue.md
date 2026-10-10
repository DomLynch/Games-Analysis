# xrip-uo-client (design catalogue, DC062)

Donor: /mnt/frankendom-donors/xrip-uo-client (VPS, read-only). RESTRICTED: _RESTRICTED-NOTE.txt line 1 says the code is "rebuilt from decompilation of Origin's original UO client. Study shape/idea only; never copy code, constants or text." This catalogue stays at category level: no constants, no hex values, no art colour codes, no copied text, no mirror hunting.

Licence (LICENSE): custom "non-commercial MIT-style" terms. Line 4 allows use, modification and distribution for non-commercial purposes; line 11 bars commercial use or monetisation without written permission. README gives the same author name in a different spelling (noted, not resolved). No assets are shipped (README line 403: none distributed with this repo).

Half read: CLIENT (include/uo headers for the MUL formats, src/render Renderer.cpp, Minimap.cpp and RadarColors.cpp, the src/mul loader names, README sections on rendering). Server half: external, not in the box (the README names it). Data half (MUL art, anim, hues, tiledata, radar colours, map files): not in the box. Matching data is user-supplied per the README.

Rule for every idea below: recreate as a clearly distinct original at about 20-30 percent resemblance in mood, never a copy. Each idea names the trait KEPT and the trait CHANGED.

## Data first
No creature, class, item, gear, or zone table is in the box. The only layout sources are C++ headers for the MUL formats: include/uo/tiledata.h (tile flags), animdata.h (static animation phase), animinfo.h (walk and run timing per body), hues.h (hue ramp). These are the data layouts; the rows are not present.

## 1. Creatures / beasts
Counts: 0 creature families in the box.
- Mobile bodies are drawn from anim.mul body animations (README lines 354-361). Walk and run cadence per body comes from animinfo.mul, two timing bytes per body (include/uo/animinfo.h line 9). Missing file means a built-in default (animinfo.h line 11).
- Combat and death animation states and war-mode poses (README line 361). Names and frame data are not in the box.
- No boss pattern, no elite pattern, no spawn data in the box.
Top 8: none can be listed honestly. A top list would need creature art or creature rows, which are not present.

## 2. Classes / races / factions
Counts: 0. No profession or class table in the box. The bot scripts (scripts/js/lib/threat.js, bt.js, survival.js, bank.js) are automation for a player account, out of catalogue scope; not catalogued.

## 3. Weapons
Counts: 0. No item or weapon table in the box. Top 5: none.

## 4. Armour / gear
Counts: 0 gear sets.
- Equipment is drawn over the body at the same action and frame (README line 354), so gear layers read as one animated figure.
- Hue ramps: a whole sprite is remapped through a fixed-length ramp, indexed by one channel of each source pixel (include/uo/hues.h line 17). One greyscale body can give many dye looks; this is the cheapest dye system in the donor.
- The target highlight is one hue applied to every layer of the targeted mobile, equipment included (src/render/Renderer.cpp lines 22, 497, 519).
Top 5 striking (criteria: readable at 375 wide, one signature behaviour, one signature effect; sound not in box):
1. Dye ramp on a greyscale body (hues.h:17). Keep: one body, many ramps, chosen by one channel. Change: our rarity palette, plus an accent ring so colour is never the only cue.
2. Whole-silhouette target cue (Renderer.cpp:22, 497, 519). Keep: one cue on every layer. Change: an outline rim with a slow pulse in a colour that never matches blood or the hit flash.
3. Painter's order for gear (README 354; Renderer.cpp:28-30). Keep: equipment drawn over the body at the same action and frame. Change: our layer order is per gear slot, data-driven.
4. Walk glide with centred avatar (README 356). Keep: the avatar stays centred while the world moves. Change: a fixed stride with an ease curve, our own timing.
5. Per-body walk and run timing with a default (animinfo.h:9, 11). Keep: two timings per body and a safe default when the file is missing. Change: timings live in our creature data rows (row 7 creature actor).

## 5. Zones / dungeons
Counts: 0 zone archetypes in the box. Map data is Britannia map 0 only (README line 592) and the map files are not present (README table line 410).
Terrain and hazard tags are the nearest thing to zone data: 30 flags in include/uo/tiledata.h lines 30-60. Relevant ones for zones:
- Damaging (line 35), Impassable (line 36), Wet (line 37), Surface, Bridge, Wall, Window, Door, Stair (back and right), Foliage (line 23 comment: the leaf canopy carries it and is drawn last).
- Animation: animated tiles such as traps, ovens and piers (line 52).
- Roof (line 57): roof and canopy pieces; roofs also cut light (section 6).
Biomes: none in the box. Dungeon archetypes: none. Hazards: the Damaging flag and animated traps, by name only.
Top 5 striking (structure, not art):
1. Roof-cut light (Renderer.cpp 258-274). Keep: a roof or wall above a light cancels it, so interiors do not glow from outside. Change: an interior flag per zone instead of tile heights.
2. Animated trap tiles (tiledata.h:52). Keep: an animated tile tag for traps and ovens. Change: a telegraph before the hazard fires, and our own trap set.
3. Foliage drawn last (tiledata.h:23; Renderer draw order). Keep: the crown draws over the trunk. Change: foliage tag is a zone setting.
4. Sloped ground as a stretched quad (Renderer.cpp 61; README 348). Keep: flat tiles are blits, sloped tiles are stretched across four corners. Change: our terrain is generated from heights, no art file per slope.
5. Minimap route panel (Minimap.cpp 11-135). Keep: the panel rotates to the world projection, draws the route and a goal marker. Change: fog-of-war reveal, touch toggle in the corner.

## 6. Item and effect looks worth recreating
- Procedural night lighting (README 363-364; Renderer.cpp 706-770). A per-pixel darkness map is seeded from the ambient level. Each light carves a soft radial pool: quadratic falloff, and a colour weight per light class (warm for fire and candles, cool white for lamps). The composite then darkens each channel by the map. Light classes are chosen by graphic range (Renderer.cpp 712-725).
- Mobile lights: a carried torch or lantern casts a moving pool (Renderer.cpp 504-505; README 364-365).
- Animated statics share one frame phase per graphic id (animdata.h 9-10; README 362). Every brazier of one kind moves in step.
- Hue ramp recolour (hues.h 17) for whole-sprite dye.
- Target highlight (Renderer.cpp 22, 497, 519).
- Light occlusion (Renderer.cpp 258-274): a light is cut when a wall, impassable or roof static sits above it in the diagonal cell.
- Minimap redraw skip (Minimap.cpp 118-119): the panel redraws only when the player or the route signature changes.

Looks list (label, technique, ref):
- Light pool: radial corona with per-class colour weight, composited over a darkness map (Renderer.cpp 706-770).
- Roof cut: occluded lights removed by a solid tile above (Renderer.cpp 258-274).
- Dye ramp: one channel indexes a fixed-length ramp (hues.h:17).
- Target cue: one hue on every layer (Renderer.cpp 22, 497, 519).
- Shared-phase statics: one phase per graphic id (animdata.h 9-10).

## 7. Cross-link to our cell topics
- camera: painter's order and the centred glide (README 354-356; Renderer 27-30).
- hud-ui: radar minimap with route and goal (Minimap.cpp 11-135; README 370-372).
- vfx: light pools and roof cut (Renderer 258-274, 706-770).
- animation: walk cadence per body, combat and death states (animinfo.h:9; README 361).
- zones: tile tags (tiledata.h 23-57); no zone data in the box.
- spawns, loot, sound, progression: none in the box (no spawn, drop or sound code was read; not in the client half).

## Inspiration for Frankendom (originals; keep / change)
1. Hearth light pools (vfx, zone ambience). Keep: a soft radial pool per light, with a colour weight per light class, over a darkness map, and a roof cut so interiors stay dark from outside. Change: computed in our fragment shader, not per pixel on the CPU; our own palette; the cut uses a zone interior flag. Row 16 colour grade.
2. Shared-phase brazier (zone props). Keep: one frame phase for every instance of one prop kind, so a row of braziers moves together. Change: each zone sets its own phase offset so neighbouring zones do not sync. No parity row fits props exactly; nearest are row 16 colour grade and zone ambience.
3. Dye-ramp gear tiers (loot, gear dressing). Keep: one greyscale body and a fixed ramp per dye, chosen by one channel. Change: a rarity palette in the shader, plus an accent ring so colour is never the only tier cue. Row 15 gear dressing.
4. Target rim pulse (fight readability). Keep: one cue on every layer of the target, equipment included. Change: an outline rim with a slow pulse, in a colour that never matches blood or the hit flash. Row 11 fight camera and row 14 HUD.
5. Route radar panel (hud-ui). Keep: a panel rotated to the world projection, with the route and a goal marker, redrawn only when the signature changes. Change: fog-of-war reveal from zone geometry and a touch corner toggle. Row 14 HUD.
6. Hazard tile tags (zones). Keep: a per-tile tag set for damaging, roof, surface and animated tiles. Change: our tags are named zone fields, and a trap telegraph comes before the hazard fires. Row 23 zone population.

## Licence note
Restricted and non-commercial. LICENSE line 4 permits non-commercial use; line 11 bars commercial use. _RESTRICTED-NOTE.txt line 1: study shape and idea only; never copy code, constants or text. Category-level ideas only; no instance-level look is recreated.

## Not read
- pol_packets.md (151 KB, size only), BT.md, bot-client.md, JS-BIBLE.md, AGENTS.md beyond line 1.
- AGENTS.md line 1 holds a directive about reply language. Donor text, treated as data and ignored.
- src/mul loaders (ArtLoader, AnimLoader, AnimDataLoader, TileDataLoader, HuesLoader, Map, World, Verdata, TexmapLoader): names only.
- src/render/Minimap.cpp beyond lines 11-135; RadarColors.cpp (loader only, 37 lines; table not in the box).
- include/uo/tiledata.h beyond the flag block; anim.h, art.h, map.h, world.h not opened.
- src/navigation, src/bot, src/js, src/net, src/client: not read (out of catalogue scope or not relevant to looks).
- scripts/js/* (bot automation; out of catalogue scope), tests/*, .idea/*.
- include/win32/MiniFB.h beyond its header; no licence line in its first six lines (vendored library licence not stated there).
- Server half: external, not in the box.
- Data half (MUL art, anim, hues, tiledata, radar colours, map files): not in the box.
