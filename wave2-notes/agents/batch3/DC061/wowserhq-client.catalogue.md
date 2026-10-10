# wowserhq-client (design catalogue, DC061)

Donor tree: /mnt/frankendom-donors/wowserhq-client/ (read over ssh only, nothing copied or run).
Asset audit used first: AU058 (`/private/tmp/p2/wave2-haiku/batch3/AU058/wowserhq-client.assets.md`). Not repeated here.
Half read: CLIENT (TypeScript WebGL UI engine, shipped layout XML, two GLSL shaders, UI globals). The matching other half in the box is wowserhq-wowser (pipeline and React UI), catalogued in its own file.
Receipts: `receipts.tsv` in this folder (rows for this donor verified with verify_receipts.py).

## Donor type and licence
This is a UI engine for a retail-style client, not a game. It has no creatures, classes, weapons, gear or zones. The catalogue is therefore short on purpose.
- Licence: MIT for code, XML and shaders (LICENSE lines 1-3; README line 81 repo-wide blanket). No separate asset licence.
- The layout XML names retail-style Interface art paths that are not in the box. We use none of them.
- Recreate every look as a clearly distinct original, never a copy. Not legal advice.
- No CLAUDE.md or AGENTS.md in the tree. No locale or string table in the box, so no entry count.

## Counts
- creatures 0, classes 0, weapons 0, gear_sets 0, zones 0.
- Basis: the full file list (under 300 entries) was checked by name, and the content-bearing files below were read. No content data is shipped.

## 1. Creatures / beasts
None. No creature rows, models or display data. `src/ui/components/simple/Model.script.ts` is a 3D model frame type, but it ships no model content (named only, not read).
Top 8: none.

## 2. Classes / races / factions
None named. The character-create globals return 0 for every race and class query: name, faction, available races, available classes, classes for a race (`src/ui/scripting/globals/glue/character-create.ts` lines 13-29; receipts client-glue). Lines 30-127 were not read.
Progression shape: none.

## 3. Weapons
None. No weapon data or item tiers. Top 5: none.

## 4. Armour / gear
None. Character-select globals are stubs (`glue/character-select.ts`, named only). Top 5: none.

## 5. Zones / dungeons
None shipped. The only zone-adjacent view is the loading screen (see 6). Top 5: none.

## 6. Item and effect looks worth recreating
- Three-layer loading card. A full-bleed background layer (declared 1024x768, anchored corner to corner), a small emblem anchored to the bottom edge with a 10 px offset, and a small corner text anchored bottom-left. All three sit in one artwork layer (`public/Wowser/WowserFrame.xml` lines 7-39; receipts client-loading). Technique: stacked layers, one low focal point, one small caption slot.
- Nine-piece engine backdrop. One tiled background piece plus four edge strips and four corner pieces, each its own texture with the UI image mode (`src/ui/components/Backdrop.ts` lines 147-273; receipts client-backdrop). Technique: nine-slice from separate pieces.
- Plain UI shader. The fragment shader samples the texture and outputs it unchanged (`public/Shaders/pixel/glsles300/UI.frag` line 11). No tint, glow, fog or fresnel. The look comes from art, not the shader, so this donor has no effect technique to borrow.
- Audio: none. All 23 functions in `src/ui/scripting/globals/sound.ts` are stubs that return 0 (receipts client-sound). No stingers, beds, layering or crossfades exist here.
- Idle or ambient animation, death and respawn presentation, boss intro, readability at 375 wide: none in this donor.

## 7. Inspiration for Frankendom (client half)
Only four concrete originals come from this donor. It is short because the donor has little content to learn from. The full list sits in the wowserhq-wowser file.
1. Tip card loading screen. Keep: three layers, one low centred emblem, a small corner caption. Change: our own backdrop art, a rotating tip in the corner slot, and a progress bar under it. Clean-room, never copied. Ref: public/Wowser/WowserFrame.xml 7-39. Maps to row 14 (HUD) and the loading path.
2. Nine-piece menu backdrop kit. Keep: one tile plus eight edge and corner pieces, so one kit can frame any panel. Change: our own corner ornament and our palette. Ref: src/ui/components/Backdrop.ts 147-273. Maps to row 14.
3. Layout as a data tree with script hooks. Keep: anchors and sizes declared in XML, behaviour attached by script. Change: our HUD layout as a typed data tree in TypeScript or JSON, with the same anchor vocabulary. Ref: public/Wowser/WowserFrame.xml 3-16 (anchor and size nodes). Maps to row 14 and the catalogue as runtime source (row 20).
4. Stub-first audio surface. Keep: every audio call exists so scripts run without crashing. Change: our stubs log once and return real handles, so a missing sound shows in the build instead of silently passing. Ref: src/ui/scripting/globals/sound.ts 1-5. Maps to the sound-music topic (cues and layering) and row 12.

## Not read
- src/gfx/apis/webgpu and src/ui/components/* logic (named only).
- Shader bodies other than UI.frag (sizes only). The Lua vendor files (bit.lua, compat.lua) beyond their headers.
- character-create.ts lines 30-127 and character-select.ts. package-lock.json, vite config, .github CI.
