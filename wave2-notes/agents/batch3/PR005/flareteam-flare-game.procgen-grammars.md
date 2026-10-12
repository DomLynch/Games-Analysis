# flareteam-flare-game (procgen-grammars, feel note)

Donor/Licence: flareteam-flare-game. Art and data are CC-BY-SA 3.0 (README, line 21); the storage matrix says UNCLEAR. Paired engine flareteam-flare-engine is GPL-3 (COPYING, line 1). Clean-room, category level only. No tile, name, map or numeric value from the donor is carried into our design.

Checked: depth full. Data half read: mods/empyrean_campaign/maps/procgen_rules/ (4 files, read in full), tiled/iron_labyrinth/ (41 Tiled sources; about 10 read in part by header and property lines; the rest counted by type), tiled/ruins/rules/ (4 ruleset files, headers and layer names read), mods/empyrean_campaign/items/random/ (10 files, one read in full, the rest by grep), items/categories/mastite.txt (63 sections counted). Loader half read: flareteam-flare-engine src/Map.cpp procGen functions (procGenWalkSingle, procGenCreatePath, procGenFillArea), src/main.cpp (seed), src/UtilsParsing.cpp (default separator), src/ItemManager.cpp (LevelScaledValue::parse, option picker, partly). Confidence high on the labyrinth generator, medium on the item randomizer (parser read, full item build not read). Not read: tile PNGs (not opened, so no readability at 375 wide was judged), the Tiled automap run itself, map save/load internals, UI and client draw code, the loot files named by chests. Receipts: 50 rows in receipts.tsv, all pass verify_receipts.py.

Best transferable idea: place one key per gate level before filling rooms, ramp the gate chance per step so gates arrive at a steady pace, and cache the generated layout per instance until a reset flag is set.

## 1. What the player sees and feels
A stone labyrinth built from fixed room tiles. Each floor is a cross of rooms joined by seam pieces, with locked doors across the route. A locked door says it needs a key (the door message is the same line on every door in the donor). The key sits in a room of the same gate level, so the player always sees a route with a reachable key before the next gate. The floor-one map carries a wind loop that starts on load. Chests are hotspot events that name a loot file per room. Start and end rooms are fixed per floor. Rooms are isometric 28 by 28 tile chunks (Tiled tile size 192 by 96 px). On a phone at 375 wide this reads as a short corridor of rooms with one gate and one key at a time, not an open map.

## 2. Why it works / is striking
- Readable beat at 375 wide: a gate plus one key room per level. The player always has one open question at a time.
- One signature behaviour: the route is generated, but the gate-and-key pattern repeats, so the layout feels new while the rule stays readable.
- One signature sound: a looping wind bed on floor entry (event on load; receipt in receipts.tsv).
- Could be made ours at 20-30 percent resemblance: yes. A stone bridge-district with three keyed gates and a different seam set reads as ours.

## 3. The rule behind it (generator order, own words)
The generator is a seeded-or-not random walk on a grid of chunk cells, then a fill pass. The order matters:
1. Read the floor's rule file: a shared settings block (door cap, door spacing, main path min/max and attempt cap, branch min/max, branches per door level) plus a chunk list. Each floor file pulls in the shared block and adds its own start and end chunks.
2. Lay a grid of cells sized from the event region and the chunk size.
3. Main path: pick a random start cell. Each step picks a random direction (rotating if that link is taken). A step is refused when it enters a start, end, door or already-used cell on the main path. Each accepted step opens a link between the two cells. Branch roots are recorded at random: the chance starts at 50 percent and rises by 5 each step; after a root is made it drops to 50 and takes the same step's +5, so it restarts at 55. Once the walk is past the minimum door spacing, a straight cell can become a door. The first door is forced (chance set to 100), later doors ramp by 5 per step. Each door raises the door level of the cells beyond it.
4. Retry the whole main path until its length is in range and at least one door exists, up to the attempt cap. The desired length is a step budget that also burns on refused steps, so real paths are often shorter than the draw; the retry loop is what enforces min and max.
5. Branches: from each root, one walk of branch length. A branch may pass through or join existing normal cells of the same door level; it may not enter start, end or door cells.
6. Keys: for each door level, one random normal cell becomes the key cell. Keys are removed from the normal pool so they are not reused.
7. Fill: each cell draws a random chunk of its type from the pool, skipping unique chunks already placed in this campaign. Each seam uses a random link chunk and copies its seam rectangles. Start cell sets the hero spawn. Unique chunks set a campaign flag when placed.
8. Save the filled region to a file and reuse that file until a reset flag is set.

Data fields (names; donor value null because the donor is CC-BY-SA data and GPL code):
- door_cap (count) - settings door cap
- door_min_spacing (cells) - settings door spacing
- main_len_min, main_len_max (cells)
- main_attempts_max (count) - retry cap
- branch_len_min, branch_len_max (cells)
- branches_per_door_level_max (count) - the branch counter resets at every door, so the cap is per door level
- branch_root_chance_start (percent) - engine constant, not in data
- branch_root_chance_step (percent per step) - engine constant
- door_chance_step (percent per step) - engine constant; first door forced to 100
- chunk_pool per type (list of chunk ids)
- chunk_unique_flag (bool) and campaign flag name
- region_reset_flag (campaign flag name)

Defects found in the loader (keep the idea, fix each):
- D1 Branch length uses the minimum as the upper bound (the max is ignored, so every branch has the min length). Fix: draw between min and max with max clamped to at least min.
- D2 Main path retry gives up silently. When the attempt cap runs out, the last path is kept even if it has no door, so the level has no gate and no key. Fix: on exhaustion, fall back to a fixed template or restart from a new start cell; log it as a data error.
- D2b If the attempt cap (`main_path_attempts_max`) is missing or 0, the retry loop never runs and no main path is built. Fix: default the cap to a positive number and log a data error when it is absent.
- D3 Global RNG seeded from the wall clock at boot, and the generator draws from that shared stream. Layouts cannot be reproduced or checked by a server. Fix: a per-instance seed (zone id, instance id, reset counter) and its own stream.
- D4 Variant avoidance is a single bump per neighbour and is not re-checked after the bump. A match can survive, and a wrap to zero can recreate it. Minor. Fix: loop up to N tries that re-check both neighbours.
- D5 Data typo in two mastite randomizer files (hp_regen bonus, same line in both): a comma where a colon belongs. The engine splits on the comma, reads the bare 25 as a base value, and overwrites base 1. Fix: base:1:25 in both files; the loader should warn on a bare number inside a scale string.
- D6 Tiled automap rules export to a mod folder that is not in the donor (procgen_test). The rules run in the editor, not at runtime, as far as the files show. Note only, no fix needed for us.

## 4. For Frankendom
- 700 zones as data: one zone region is one rule record (settings plus chunk list) and a seed. The donor already shares a settings block and lets each floor include it. Do the same for zones: one shared block, a per-zone override line.
- 100 Pit characters reused across zones: enemy groups in the donor pick a category (one category per room file) with a number range and a spawn level tied to the hero. Our version: the category picks from the 100 characters by tier; the count range is data.
- Many-vs-one: sampled room files carry one enemy group each (room9 carries four; treasure and vendor carry none). Group counts of 3 to 5 exceed MAX_ATTACKERS = 3. Keep the count as data and let the fight engine queue the extra attackers, not the zone generator.
- Server-verified: generation runs on the server and writes an instance record to the ledger (chunks, gates, keys, seed). The client only draws it. The donor's file cache becomes a ledger row with a reset flag.
- Keep: key per gate level, ramped gate chance, unique rooms per campaign, cache until reset, fixed seam rectangles so chunks join without pair-specific art.
- Change: per-instance seed (D3), fallback on exhaustion (D2), clamp branch range (D1), fix the mastite bonus string (D5), cap concurrent attackers at 3 in the fight engine.
- Parity mapping: zone population row 23 (spawn count per group from the count range; region reset by a campaign flag, not by clearing). Loot row 18: the mastite option picker rolls one number and takes the option whose chance is the closest at or above it, then draws a bonus count and a level range (partly read). Fight row 4 (aggro/leash): not in this donor.

## 5. 5-minute look test (Dom, phone)
Build one three-room gate strip in a test zone: start room, two rooms, one key room, one locked gate, one end room. Generate three seeds and screenshot each at 375 wide, idle, no combat. Dom answers three questions: can I see the gate and say what opens it; do the three layouts differ enough to feel new; can I find the key room without a minimap. Pass means all three answers are yes in under a minute per seed.

## 6. Licence / IP
Art and data are CC-BY-SA 3.0 (share-alike; no copied tiles, maps, names or numeric values). The engine is GPL-3: clean-room, we describe the order of operations only. Category-level inspiration only: "a stone labyrinth with keyed gates". The fixed numbers in the donor's settings are not carried; our data fields are named with null donor values.

## 7. Gaps
- Not read: tile PNGs and the 375-wide readability of the rooms; the rest of the 41 Tiled sources (about 10 read in part); the rest of the 10 item randomizer files (one read in full); the full item-build pipeline; map save/load internals; UI and client draw code.
- Respawn and death presentation: not found in the generator code I read. Not in the half I read; not claimed as absent in the whole donor.
- Walk density: sampled 7 room files only (enemy groups: 1 in most, 4 in one, 0 in treasure and vendor). Not measured per 20 seconds of walking.
- Engine half read: procGen functions and parser only, not the renderer or the save format.
- Confidence: high for the generator order (every step cross-checked against the function text); medium for the bonus-scale parser's effect on hp_regen (read the splitting and fallback code, did not run it).

## Checker findings (Sonnet 5.5 medium, 2026-10-12)

Verdict: CLEAN
- Nit (confirmed): branch-root chance after a root is set to 50 then gets +5 in the same step (effectively 55); note said only "resets".
- Missed (confirmed): `desired_length` is decremented every pass including refused steps (flare-engine `Map.cpp` 1187), so the main path is usually shorter than the draw and the retry loop enforces min/max.
- Missed (confirmed): with `main_path_attempts_max` missing or 0 the while-loop (1332) never runs and no main path is built.
- Missed (confirmed): placing a door resets `branch_count` (1165), so `branches_per_door_level_max` is a per-door-level cap.

Fixed 2026-10-12: root-chance wording, step-budget line in step 4, new defect D2b, per-door-level note on the branch cap field.
