# wowserhq-wowser (design catalogue, DC061)

Donor tree: /mnt/frankendom-donors/wowserhq-wowser/ (read over ssh only, nothing copied or run).
Asset audit used first: AU058 (`/private/tmp/p2/wave2-haiku/batch3/AU058/wowserhq-wowser.assets.md`). Not repeated here.
Half read: PIPELINE and UI. Read: DBC loader and table names, M2 material blend and flags, ADT and M2 shaders for fog and layers, doodad streaming, map loading, character list packet, unit display join, React HUD and portrait/frame styles, and one server file (archive chain). The matching other half in the box is wowserhq-client (WebGL UI engine), catalogued in its own file.
Receipts: `receipts.tsv` in this folder (rows for this donor verified with verify_receipts.py).

## Donor type and licence
This is a WoW-style client pipeline and UI, not a game with content in the box. The game data (DBC tables, MPQ archives, models, terrain) is read at runtime from the user's own client and is not in the box.
- Code: MIT (LICENSE line 3; package.json license field).
- 10 PNG UI images (frame, portrait, logo, favicon) have no licence file, and the MIT text does not state it covers images. Class C. Their pixel content was not opened, so we do not describe their art.
- Recreate every look as a clearly distinct original, never a copy. Not legal advice.
- No CLAUDE.md or AGENTS.md in the tree.

## Counts
- creatures 0, classes 0, weapons 0, gear_sets 0, zones 0.
- Basis: DBC tables are named (creature display, creature model, map) but no rows ship. Race and class arrive as numbers on the wire, with no name table. No string or locale table is in the box, so no entry count.

## 1. Creatures / beasts
None in the box. The code shows the join a creature look goes through: creature display id, then display row, then model row, then the model file (`src/lib/game/unit.js` lines 44-56; receipts wowser-dbc). Top 8: none.

## 2. Classes / races / factions
None named. Race and class are read as unsigned bytes from the character list packet (`src/lib/characters/handler.js` lines 43-44; receipts wowser-characters). No names, roles, mechanics or progression are in the box.

## 3. Weapons
None. The character list reads one model id per equipment slot (`handler.js` line 72). That is a per-slot model, not a weapon tier table. Top 5: none.

## 4. Armour / gear
None as tiers. The list packet loops over 23 equipment slots per character (`handler.js` line 70). No material tiers, sets or looks are defined here. Top 5: none.

## 5. Zones / dungeons
None as data. Map ids join through the Map table to a world file path (`src/lib/game/world/map.js` lines 125-132; receipt wowser-dbc). Terrain and world content are not in the box, so no biome list.
Streaming shape (read, not data): map chunks load and unload by chunk index (`map.js` lines 110-118), and doodads are reference-counted per chunk (`src/lib/game/world/doodad-manager.js` lines 35-85). A shared doodad stays loaded while any chunk still refers to it.
Hazards: none. Top 5: none.

## 6. Item and effect looks worth recreating
- Blend-mode table. Seven material blend modes, cases 0-6 of one switch (`src/lib/pipeline/m2/material/index.js` lines 160-209; receipt wowser-m2). Each mode is a pair of source and destination factors. Mode 4 is additive (source alpha, destination one; lines 191-196).
- Alpha-key cutout. Mode 1 discards pixels at or below half alpha (`src/lib/pipeline/m2/material/index.js` line 150; `src/lib/pipeline/m2/material/shader.frag` line 32). Cheap hard edges for cards and foliage.
- Per-material flags. Bit 0x01 turns off lighting, 0x02 turns off fog, 0x04 turns off back-face culling, 0x10 turns off depth writes (`index.js` lines 123-143). A glow can be unlit and unfogged without new shaders.
- Effects fade into fog. Modes 2 to 5 scale their alpha by the fog factor (`shader.frag` lines 116-119; receipt wowser-fog). Glows dissolve instead of popping.
- Terrain layer paint. A base texture plus up to three alpha-blended layers, each lit before it blends (`src/lib/pipeline/adt/chunk/shader.frag` lines 81-110; receipts wowser-adt). The shader declares four alpha maps and uses three.
- Terrain fog clears alpha far away (`adt/chunk/shader.frag` lines 26-29), so distant ground goes opaque rather than semi-transparent.
- Nine-slice frames. One texture per border weight: thin, thick, panel, and a headless panel with a smaller top border (`src/components/wowser/ui/frame/index.styl` lines 21-23, 32-34, 42-44, 61-63). A near-opaque dark plate sits 3 px outside each frame on a lower layer (lines 10-19).
- Unit plate. A portrait background image (`src/components/game/portrait/index.styl` line 6), a round icon at a small negative offset so it overlaps the plate edge (lines 8-12), and the name placed to the right of the icon with the level in the top-right corner (lines 14-25). Health and mana bars sit stacked at the bottom with gradient fill and a one-pixel offset edge (mid-file, not line-counted).
- Conditional target plate. The self plate always renders; the target plate renders only when a target exists (`src/components/game/hud/index.jsx` lines 16-17; receipts wowser-hud).
- Audio: none. No sound, music or ambience code is in this half. The client half's sound surface is all stubs.
- Idle animation, death and respawn presentation, boss intro, minimap, touch UX: none in this half. Chat and quests are commented out of the HUD (`hud/index.jsx` lines 5 and 7).

## 7. Inspiration for Frankendom
Nine originals. Each keeps one trait and changes the rest. Recreate from scratch; never copy the donor art or code.
1. Unit plate with a hanging icon. Keep: a round icon overlapping the plate edge, name inline, level in the corner. Change: a tall chamfered plate, an icon ring in our palette, and threat shown as a bar along the bottom edge, not as name colour. Refs: portrait/index.styl 6-25. Maps to row 14 (HUD); readable at 375 wide.
2. Empty-until-needed target plate. Keep: the second plate renders only when a target exists, so empty space is the default. Change: on phones the target plate stacks above the self plate. Ref: hud/index.jsx 16-17. Row 14.
3. Nine-slice frame family. Keep: one texture per border weight, plus a headless variant for panels with no title bar. Change: chamfered corners and our own edge art. Ref: frame/index.styl 21-23, 42-44, 61-63. Row 14.
4. Dark offset plate for contrast. Keep: a near-opaque plate offset 3 px behind each frame on a lower layer, so panels read over bright scenes. Change: our own radius and opacity, tested against bright and dark scenes at 375 wide. Ref: frame/index.styl 10-19. Row 14.
5. Additive aura that dissolves into fog. Keep: additive blending for glows, and alpha that fades with fog distance. Change: a colour per tier and a pulse timed to our combat sound cue. Defect to fix first: the opaque-at-fog-end test (shader.frag 111-114) applies to every mode, while its comment (line 110) names only certain modes; confirm in game, then restrict it. Ref: m2/material/shader.frag 110-119; index.js 191-196. Row 16 (colour grade and quality).
6. Hard alpha cutout for cards and foliage. Keep: a cutout at half alpha, cheap on phones. Change: our own alpha art and a mobile-first threshold. Ref: m2/material/shader.frag 32; index.js 150. Row 16.
7. Trickle loader for zone props. Keep: each tick loads a fraction of pending items (1/40, minimum 2) and yields, so frames stay smooth. Change: fix the idle loop. Both timers re-arm every 1 ms even with nothing pending (doodad-manager.js lines 112 and 172). Fix: re-arm only when work is pending, otherwise back off to about 100 ms. Ref: game/world/doodad-manager.js 5-12, 87-113. Row 18 sub-line "per-tick budget" (client-side analogue, not an NPC budget).
8. Numbered overlay zone patches. Keep: a base data set plus ordered overlays where a later overlay wins. Change: sort overlays by an explicit numeric index rather than relying on glob order. Defect: the patch list is passed to a glob with no sort (`src/lib/server/pipeline/archive.js` lines 6-20 and 27-31), so patch order inside one pattern depends on the glob library (globby ordering not read). Fix: sort by numeric patch index, then apply. Row 20 (catalogue as runtime source) and the zones-as-data ruling.
9. Terrain paint with a shared blend map. Keep: a base layer plus up to three alpha-blended layers, each lit before blending. Change: cap at three layers on phones and pack the blend maps into one texture to save fetches. Ref: adt/chunk/shader.frag 2, 81-110. Row 16.

Also seen: creature look join (unit.js 44-56) is the pattern for item and creature catalogue rows (row 21 fields). Keep the join, put the look fields inline in our catalogue row.

## Not read
- Server: src/lib/server/cluster.js, config, index.js (only archive.js read). Realms, auth, net socket, worker pool.
- Pipeline: m2 batch-manager, animation-manager, blueprint; adt and wmo loaders; wmo shaders beyond the fog function.
- Components: chat, stats, quests (quests shows a placeholder, per the audit). PNG pixel content. package-lock.json, bin/serve.
