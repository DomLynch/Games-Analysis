# luanti-org-luanti (procgen-grammars, feel/world-design note)

Donor: `/mnt/frankendom-donors/luanti-org-luanti` | Licence: LGPL-2.1-or-later (SPDX line in src/mapgen/dungeongen.h line 2; README badge LGPLv2.1+; COPYING.LESSER line 1). LICENSE.txt covers textures and sounds under CC BY-SA 3.0; not used here. | C++ engine with a Lua registration API | copyleft: shape only | depth: full for dungeons, biome selection, seeds and the PRNG; partial for schematics and decorations | half read: server (mapgen C++); data half is doc/lua_api.md only

Checked: dungeongen.cpp (all 658 lines: generate, makeDungeon, makeRoom, makeFill/makeHole/makeDoor, makeCorridor, findPlaceForDoor, findPlaceForRoomDoor, rand_ortho_dir, turn_xz, random_turn, dir_to_facedir); dungeongen.h (struct DungeonParams and class DungeonGen, lines 1-125); mapgen.cpp (dungeon step 890-952; style roll 896-930; seed read 1050-1060; position hash 228-234); mapgen_v7.cpp:318; mapgen_v6.cpp 483-486 and the dungeon call (566-607, only partly); noise.h PseudoRandom (36-90); noise.cpp PcgRandom::range (80-128, partly); mg_biome.cpp 231-282; mg_schematic.cpp 140-205 and 328-350; mg_schematic.h defines; util/numeric.cpp 14-41; main.cpp 775-792; mg_decoration.cpp 125-140 and 386-396; doc/lua_api.md biome fields (11775-11815) and register function list (6533-6552). Confidence: high on the dungeon walker and biome choice; high on the schematic probability arithmetic (read, not run); medium on whether the schematic roll is ever hit by a thread race (not checked). Nothing was executed.

## 1. What the player sees/feels

From the code, not from play: dungeons are boxy stone rooms (walls on all six faces, open inside) joined by one- or two-block-wide corridors, with occasional short stairs in the corridors. They are dug only into solid ground, so they do not cut open the sky or water. Some wall blocks are swapped for a mossy variant where a 3D noise field is above zero, which breaks up the walls. Biomes change in climate blobs; at a biome's top edge the surface blends into the biome above over a few blocks with a speckled, dithered edge. Small structures (schematics) drop blocks at random, so a structure can look incomplete on purpose.

## 2. Why it works / is striking

- Readable at 375 wide: a boxy room with straight corridors reads as "dungeon" at a glance; the room count and corridor length set the scale.
- One signature behaviour: the corridor walker. It walks a random length, turns at the end of each segment, sometimes steps up or down a stair, and when it hits solid ground it turns away and still spends its length budget. A room is then placed so its door lines up with the corridor end.
- Could be made ours at 20-30 percent resemblance: yes. A zone's interior is a room-and-walk grammar with per-zone rolled style (room count, room size, corridor length, a large-room chance, a diagonal flag), and the walker is seeded from the zone's own stream.

## 3. The rule behind it

Per map chunk (mapgen.cpp 890-952):
- Dungeon count comes from a 3D noise value at the chunk corner, floored and clipped at zero (896-897). So density varies across the map.
- Style is rolled from a per-chunk stream (PseudoRandom seeded by block seed + 70033, 901): room count 2 to 16 (912); room size 5 to 12 wide, 5 to 6 high, 5 to 12 deep (913-914); large rooms on in 1 style in 4 (917), and when on, the first room is large and each later room is large with a 1 in 8 chance (138, 235); a diagonal flag of 1 in 8 (918); hole width 2 if diagonal else 1 or 2 (920).
- Carving (dungeongen.cpp): when only-in-ground is on, every air, liquid, ignored or non-ground node is marked untouchable first (80-103). The first room is placed at a random free spot (100 tries, 137); if its chance is 1 or more it is large (138). For each later room: the walker starts at the last room's centre with probability 2 in 3 (202); it walks to a wall pair that works as a door site (up to 100 steps, re-rolling direction every fourth step or when blocked, 491-494); a door is carved on a coin flip (222); a corridor is walked from the door (makeCorridor, 385-488); then a new room is placed so its door lines up with the corridor end (up to 30 tries, 544). A room's walls overwrite non-untouchable nodes; its interior is marked untouchable so later rooms cannot cut it (343).
- Corridor (makeCorridor): length from the range (391). Segments have their own random lengths; at a segment end the walker turns straight, right or left (random_turn). Stairs are allowed when a segment is at least 3 long, at a 1-in-2 chance (396). A blocked step turns the walker and resets the segment, and it still uses one unit of the length budget (463-467).
- Alt walls: a wall node becomes the alt material where a 3D noise value at that node is above zero, using the block seed (116).
- Randomness: PseudoRandom is a 32-bit linear congruential generator; output is 15 bits (noise.h 59-61). range() throws on max less than min (67) and on spans above 6553 (74). Modulo is used (77), so there is a small bias.

Data fields (copyleft: donor values withheld, shown as null):

| name | unit | donor value | where |
|---|---|---|---|
| dungeon count per chunk (density noise floor) | count | withheld | zone data (noise field) |
| num_rooms range | count | withheld | zone data |
| room_size min / max (normal) | blocks | withheld | zone data |
| room_size_large min / max | blocks | withheld | zone data |
| large_room_chance (1 in N, first room if 1 or more) | ratio | withheld | zone data |
| holesize (corridor width, 1 or 2) | blocks | withheld | engine constant (width 3 or more known to break stairs) |
| corridor_len min / max | blocks | withheld | zone data |
| diagonal_dirs (1 in N chance per direction roll) | ratio | withheld | zone data |
| only_in_ground | bool | n/a | engine constant |
| alt-wall noise threshold | ratio | withheld | zone data |
| walker start in last room (2 in 3) | ratio | withheld | engine constant |
| door coin flip (1 in 2) | ratio | withheld | engine constant |
| door search step limit (100) and room-door tries (30) | count | withheld | engine constant |

Biomes (mg_biome.cpp 231-282, documented in doc/lua_api.md 11775-11805): each biome is a point in (heat, humidity) space with a weight. For a column, the closest point wins; distance is squared heat and humidity difference divided by weight when weight is above zero. A biome is eligible only inside its own box (min_pos to max_pos, plus its vertical blend above the top). Above a biome's top, its band of vertical_blend blocks still shows that biome near the top; higher up the upper biome takes over. A dithered roll (PcgRandom seeded from height plus climate, 270-274) decides block by block which of the two shows in the band.

Schematics (mg_schematic.cpp): each node carries a probability in 0-127 (mask 0x7F in mg_schematic.h 57), where 0 means never and 127 means always; bit 0x80 forces placement over existing nodes. A y-slice has its own probability. Nodes overwrite only air or ignored space unless forced (173-175). Placement roll: a node is skipped when its stored value is at or below a roll from 1 to 127 (179-180). Rotation is drawn from the same global generator (204).

Seeds: the world seed string is read as a number when it is all digits or hex; anything else, including trailing text, is hashed to 64 bits with a fixed salt (string.cpp 318-331, murmur at 329; mapgen.cpp 1057). A chunk's block seed is a position hash with mixing (mapgen.cpp 231-233; mapgen_v7.cpp 318). The older mapgen v6 uses a linear sum (mapgen_v6.cpp 486), which mixes nothing.

## 4. For Frankendom

- Maps to: the room-and-walk grammar for interior zones. A zone row = room count range, room size ranges, corridor length range, large-room chance, diagonal flag, plus its seed. 700 zones = the same grammar with different rolled styles per zone. The 100 Pit characters are not involved.
- Keep: the walker (turn, stairs, blocked-turn rule); the room shell with interior untouchable so later sub-zones cannot cut it; the per-zone style roll from its own salted stream (a new roll does not change the others); the biome-as-points map as a later world climate map (nearest point, weight, box, dithered blend).
- Keep for the schematic idea: a structure is a list of cells with a per-cell probability and a force flag; it overwrites only air unless forced. That is a camp or ruin template as data.
- Change (keep the idea, fix the defect):
  - A diagonal door direction leaves the room position unset. In findPlaceForRoomDoor only the four axis directions assign it (552-566). With diagonal_dirs on, a diagonal door direction is reachable by reading (findPlaceForDoor returns the walker's direction, 502). Fix: reject or handle diagonal doors explicitly. Not run.
  - A dungeon that cannot place its next door just stops (219, 248): no error, a partial dungeon. Fix: the zone build reports a failed dungeon and retries with the next seed.
  - Range calls throw at runtime when a size is below 4 (the room-door ranges at 554 need room size 4 or more). Fix: validate ranges when a zone row is loaded.
  - A stored probability of 1 never places a schematic node: the roll is from 1 to 127 and the test is "skip if stored is at most roll" (179-180), so a 1 is always skipped. Chance is (stored minus 1) over 127, not stored over 127. Fix: roll from 0 or use strict comparison; read from code, not run.
  - Schematic rolls and rotation use the process-wide generator, seeded from OS randomness at start (numeric.cpp 15, 38-40; main.cpp 780-791), not from the world seed or the chunk. Structure layout is therefore not a pure function of the seed. Fix: draw every structure roll from the zone's own seeded stream. This matters for our fingerprint receipts.
  - Mapgen v6 block seed is linear (mapgen_v6.cpp 486). Fix: use the mixed hash only.
- Core slice this week: the zone builder (offline). Feeds zone data for interior zones; the room count and corridor length rows give row 23 (zone population) a spacing input only after a look test. Not the live server.

Decision (proposed): adapt. Take the walker, the untouchable room shell, the per-zone salted style roll and the structure cell-probability idea; fix the five defects above.
Acceptance: a build test builds 50 zones from stored seeds; each zone is one walkable component; a zone whose dungeon stops early is reported as failed and rebuilt; a structure with a stored probability of 1 can place a cell; rebuilding a stored seed gives identical output with no global generator used.

## 5. Look test (Dom, 5 minutes, phone)

Render six zones from one room-and-walk row with six seeds, top-down at 375 px wide. Dom ranks them: which read as "dungeon with rooms and corridors", which look like noise, which look cut off. Then render one schematic camp with the current probability rule and with the fix (one cell set to 1). Dom says whether the fixed version shows the cell.

## 6. Licence / IP

LGPL-2.1-or-later. Copyleft: clean-room shape only. Every rule above is written in our words, and the donor's numbers are withheld (donor_value null). Block and node names used in the donor (cobble, mossy cobble, stair) are not used.

## 7. Gaps

- Not read: mapgen_v7.cpp except the block seed line (other generation paths of v7 not read); mapgen_v6.cpp dungeon body (566-607, partly); cavegen.cpp; treegen.cpp; mg_ore.cpp; mapgen_valleys, mapgen_carpathian, mapgen_fractal, mapgen_flat, mapgen_v5, mapgen_singlenode; mg_decoration.cpp body (only lines 125-140 and 386-396); mg_schematic.cpp save and load format (only the probability arithmetic and migration); PcgRandom implementation (only the range wrapper); builtin Lua registration functions (grep only).
- Half read: server (C++). The data half is doc/lua_api.md (biome fields, register function names at 6533-6552). Decoration and ore registration fields not read.
- Nothing was run. The receipts are reading-level only.

## As-data shape

- Dungeon: no table. Row equivalent is the C++ struct DungeonParams (dungeongen.h 26-68): c_wall, c_alt_wall, c_stair, np_alt_wall, num_dungeons, only_in_ground, num_rooms, room_size_min/max, room_size_large_min/max, large_room_chance, holesize, corridor_len_min/max, diagonal_dirs, notifytype. Values are set in code (mapgen.cpp 896-930) from the per-chunk style roll; constructor defaults are used only when no params are passed (dungeongen.cpp 36-58).
- Biome: Lua table via core.register_biome (doc/lua_api.md 6537; fields name, heat_point, humidity_point, weight, min_pos, max_pos, y_min, y_max, vertical_blend; 11775-11805).
- Schematic: Lua table via core.register_schematic (doc 6552) with a node list (name, param1 probability and force bit, param2 facedir) and y-slice probabilities; stored as a binary or text schematic (mg_schematic.cpp).
- Decoration and ore: core.register_decoration (6546) and core.register_ore (6533), fields not read.
- A new biome is one row: yes (a Lua table). A new schematic is one row: yes (a Lua table or schematic file). A new dungeon style is one row: no (the style roll is code, mapgen.cpp 896-930).

## Provenance per claim

Repo: luanti-org-luanti (folder above), LGPL-2.1-or-later. Receipts in `receipts.tsv` (note = luanti-org-luanti), verified with the gate verifier: dungeongen.cpp 75 (seed offset), 80 (only in ground), 116 (alt wall), 137-138 (first room), 202 (walker start), 219 (door search), 222 (door coin), 343 (untouchable room), 391 (corridor length), 396 (stairs), 463 (blocked turn), 491-494 (door walker), 544 (room door tries), 552-558 (door direction branches), 502 (door direction); mapgen.cpp 890, 896-897, 901, 912-920, 952, 231-233, 1057; mapgen_v7.cpp 318; mapgen_v6.cpp 486; noise.h 59-77; noise.cpp 120; mg_biome.cpp 247-274; doc/lua_api.md 11797, 11805; mg_schematic.h 57; mg_schematic.cpp 152, 179-180, 204, 342, 347; numeric.cpp 15, 40; main.cpp 780, 791; mg_decoration.cpp 131, 134, 390; string.cpp 329; mapgen.cpp 230.

## What they patched later

- Known bug recorded in the header: hole width 3 or more causes stair corridor bugs (dungeongen.h 57-58); the style roll keeps width at 2 or less (mapgen.cpp 920).
- Stairs marked as a TODO that is not finished (dungeongen.cpp 417).
- Schematic probability format changed in v4: files older than v4 have their stored values halved on load (mg_schematic.cpp 342-347). Format v2 ignored-node rule also migrated (not receipted).
- Biome dither: a comment says the seed variation was tuned to avoid single-node dither (mg_biome.cpp 263), and a cast was added to avoid undefined behaviour in the seed (not receipted).
- The block seed hash notes an unsigned multiply to avoid signed overflow (mapgen.cpp 230).
- Decoration: square area only, marked as a restriction to lift (mg_decoration.cpp 134); schematic ownership FIXME (390).
- No git history in the box.

## Rulings for Dom

1. Should the first zone grammar be the room-and-walk interior (Luanti) with one Brogue-style reward blueprint inside it, or only one of the two? Recommend both in one zone row.
2. Should a dungeon that stops early mark the zone as a failed build and retry with the next seed, rather than ship a partial zone? Recommend yes.
3. Should every structure and decoration roll draw from the zone's seeded stream, with no process-wide generator? Recommend yes; it is a rule, so no change needed in the question sense.

## Reuse tag

Reuse tag: adapt (LGPL-2.1-or-later; clean-room shape only; fix the five defects; keep the walker, room shell, salted style roll, structure cell probability).
Brief rule served: zones as data (room-and-walk row); seed discipline (per-zone salted stream, no global generator) for the fingerprint receipts; PASS2 items 1-5 done above.


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN.
- About 25 claims held (style roll, large rooms, walker start, door coin flip, tries, stairs, schematic roll, v4 halving, PcgRandom seeding, v6 block seed, biome weights, licence, patch-history lines).
- Checker note: roomplace is unset for diagonal door dirs; v3s16 zero-inits, so the room is rejected by the area check, not UB; 'not run' is acceptable.
- Checker missed-item (not added to the note body): all dungeons in a chunk share one PseudoRandom seeded bseed+2 (dungeongen.cpp 75), so a changed dungeon count shifts later dungeons (relevant to the salted-stream rule).
