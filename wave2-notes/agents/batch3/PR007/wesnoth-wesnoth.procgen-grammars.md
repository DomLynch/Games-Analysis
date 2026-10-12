# wesnoth-wesnoth (procgen-grammars, second pass, feel/world-design note)

Donor: `/mnt/frankendom-donors/wesnoth-wesnoth` | Licence: GPL v2 (`COPYING`, "Version 2, June 1991"); source headers say "either version 2 of the License, or (at your option) any later version" | Half read: both (engine generator code in `src/generators/` plus the data and schema: `data/multiplayer/scenarios/Random_Scenario*.cfg`, `data/schema/core/mapgen/default.cfg`) | Depth: full for the default generator pipeline; mechanism-level for the cave generator (deprecated) | Licence class: copyleft (shape only, no line-by-line translation).

## 1. What the player sees and feels

A random Wesnoth map is a 40 by 40 hex board that reads as a landscape rather than a grid. Hills gather into a mountain massif on one side, a blue lake sits on high ground and a river runs downhill from it to the sea or off the map edge. Two castles sit in the middle third, joined by roads that cross the rivers on bridges. Villages are placed on grass and forest beside water, so each village has a reason to exist where it sits. On a 375 px phone the whole 40-wide board would be roughly 9 px per hex (my arithmetic, not measured), so only the big shapes survive: a lake blob, one river line, a road between two keeps.

## 2. Why it works / is striking

- Readable at 375 wide: the readable units are lakes, rivers, roads and the mountain mass. Terrain thresholds are coarse (six height bands), so the picture has few, large regions.
- One signature behaviour: rivers always head downhill toward water or the edge, and a road is the cheapest path under a per-terrain cost table, so roads bend around mountains and cross water only as bridges.
- One signature rule: each landform is chosen by a single ordered rule list (height band), then a second ordered list re-labels flat ground by height and a temperature field. That is how six height bands plus six converters yield snow, swamp, forest and desert from one grass tile.
- Could be made ours at 20 to 30 percent resemblance: yes. Keep the rule lists, the river and road rules, and the village rating. Drop the hex board, the Wesnoth terrain codes and the naming system.

## 3. The rule behind it (order of operations, as the code runs)

Entry point: `default_generate_map` in `default_map_generator_job.cpp` (689 to 1409). The outer retry loop is in `default_map_generator.cpp` (147 to 156): up to 10 tries of the whole job on `mapgen_exception`, and the job's RNG keeps advancing between tries, so one seed gives one fixed sequence of attempts.

1. Working area: the job builds a map 3x wider and 3x taller than requested (`data.width *= 3` at line 719) and uses only the middle third (comment at 715).
2. Height field: `iterations` hills. Each hill has a random centre and radius `1..hill_size`, adds `radius - distance` where positive, or subtracts in valley mode (island mode). The map is then normalised to 0 to 1000 (`generate_height_map`, 257 to 382).
3. Landforms: for each tile, the FIRST `[height]` rule whose threshold is at or below the tile's height wins (775). The code does not sort or check the order; the comment asks for descending order (152).
4. Lakes and rivers: `nlakes = rng % max_lakes` (803). Per lake slot, up to 100 random tries to find a tile above `min_lake_height` (805). Then ONE attempt: a river is grown by depth-first search, each step may climb at most `river_uphill` above the previous tile (449), neighbours in shuffled order, visited tiles never re-entered during one river. The river is written only if it reaches water or leaves the map (`generate_river`, 426 to 502). The lake is then always generated (835): a recursive spread where the first ring is certain when the fall-off value is 100 or more, and each deeper ring halves the fall-off (403 to 415). The lake overwrites any tile (400).
5. Temperature field: a second height field with its own iteration count and size (`temperature_iterations`, `temperature_size`), scaled by area against a 40x40x9 baseline.
6. Converters: for each flat tile, the FIRST `[convert]` rule that matches its terrain, height range and temperature range replaces it (893 to 905). Rules are ordered; a tile is converted at most once.
7. Castles: for each player, a deterministic scan of a candidate window (inner area of the middle third). A tile is rejected if it is within a hard distance of 6 of another castle (558), within `min_distance` of one, or if any of its 3x3 neighbours is not an allowed terrain. Survivors are ranked by border position, average and nearest distance to other castles, and the count of allowed terrain in an 11x11 window. The highest rank wins. No RNG is used (the comment at 913 says "at random"; the code does not).
8. Roads: `roads` random border-to-border A* routes plus `castles squared` castle-to-castle slots, of which only the upper pairs are used and only when `link_castles` is true (default true, default_map_generator.cpp 48; job.cpp 984, 1007, and the `src_castle >= dst_castle` skip). Random border roads that start and end on the same border are skipped (job.cpp ~1017), and any road whose endpoint costs 1000 or more is skipped. Cost per tile is the `[road_cost]` value for its terrain, times a windiness factor from a hash of position and seed (`road_path_calculator::cost`, from line 74; the end of the function was not separately checked). A failed search is silent (1040): no road, no error.
9. Villages: a grid whose cell area is (middle-third area / `villages`) (1233). Each grid point is jittered; the code draws ONE random offset `add` (1263) and uses it for both x and y (1264 to 1265), so jitter runs along the diagonal only. `place_village` (from line 614) scans radius 2 and picks the tile with the best `rating + count of adjacent_liked neighbours` (rating at 649). A result is accepted only inside the middle third (1270), and only if its terrain has a `[village]` rule; a missing rule is a thrown config error (1278).
10. Names and labels: flood-fill naming and labels, optional, not read in depth.
11. Output: `output_map` (not read; the crop to the middle third is inferred from the comment at 715).

Validators present: an odd width is made even (`++width`, default_map_generator.cpp ~104), never rejected; no castle found throws a player-facing message suggesting the hill size is wrong (`mapgen_exception`, about line 966); the schema (`default.cfg`) types every key (unsigned, terrain_code, terrain_list) and marks required keys. Validators absent: no reachability check between castles (a failed road is silent), no balance check (the shipped description tells players to reroll, Random_Scenario.cfg line 7), no check that `[height]` rules are sorted.

## 4. Numbers as designer-tunable data fields

Donor values are NOT copied (copyleft). They are referenced by file for a human to check.

| Field (donor key) | What it really is | Unit | Donor location | Where it lives |
|---|---|---|---|---|
| map_width / map_height | board size before the 3x working area | tiles | `default_map_generator.cpp` 36 | zone data |
| iterations | number of height hills | count | `Random_Scenario.cfg` 31 | zone data (scaled by area) |
| hill_size | max hill radius | tiles | `Random_Scenario.cfg` 32 | zone data |
| max_lakes | lake slots, uniform count below it | count | `Random_Scenario.cfg` (max_lakes key; line not receipted) | zone data |
| min_lake_height | lake source must be above this height | units 0 to 1000 | `Random_Scenario.cfg` 36 | zone data |
| lake_size (NAME IS WRONG) | lake fall-off percent, not a size | percent (values of 100+ mean certain) | `Random_Scenario.cfg` 37; `default_map_generator_job.cpp` 835 | zone data |
| river_frequency (NAME IS WRONG) | per-step uphill allowance for rivers | units 0 to 1000 | `Random_Scenario.cfg` 38; `default_map_generator_job.cpp` 813 | zone data |
| temperature_iterations, temperature_size | temperature hills | count, tiles | `Random_Scenario.cfg` 40 | zone data |
| villages | village density | per 1000 tiles | `Random_Scenario.cfg` 34; `default_map_generator.cpp` 111 | zone data |
| roads | random border road count | count | `Random_Scenario.cfg` (roads key) | zone data |
| road_windiness | cost noise multiplier | ratio | `default_map_generator_job.cpp` 57 | zone data |
| height band threshold | landform cut-off | units 0 to 1000 | `Random_Scenario.cfg` [height] blocks | zone data (per family) |
| convert min/max height, min/max temperature | converter ranges | units 0 to 1000 | `Random_Scenario.cfg` [convert] blocks | zone data (per family) |
| road_cost cost | path cost per terrain | ratio | `Random_Scenario.cfg` [road_cost] blocks | zone data (per family) |
| village rating and adjacent_liked | village score base plus liked neighbours | points | `Random_Scenario.cfg` [village] blocks | zone data (per family) |
| castle min_distance | minimum castle spacing | tiles | `Random_Scenario.cfg` [castle] | zone data |
| castle hard floor (6) | distance floor | tiles | `default_map_generator_job.cpp` 558 | engine constant |
| 100 lake tries, 10 job retries, middle third | generator rules | count, fraction | 805, `default_map_generator.cpp` 156 | engine constant |

Per the schema (`data/schema/core/mapgen/default.cfg`), the `[height]`, `[convert]`, `[road_cost]`, `[village]` and `[castle]` tags are the row types; scalar keys are the zone header.

PASS2 as-data shape:
- Table: `data/multiplayer/scenarios/Random_Scenario.cfg`, `[multiplayer][generator]` block, validated by `data/schema/core/mapgen/default.cfg`.
- Row fields: `[height]` = height (uint, required), terrain (code, required). `[convert]` = min_height, max_height, min_temperature, max_temperature (uint, optional), from (terrain list, required), to (code, required). `[road_cost]` = terrain (code, required), cost (uint, required), convert_to_bridge (list, optional), convert_to (code, optional). `[village]` = terrain (code, required), convert_to (code, required), adjacent_liked (list, required), rating (uint, required). `[castle]` = valid_terrain (list, required), min_distance (uint, required).
- A new height band is one row: yes (it is a child list read in order; the order is not validated, so a new row can silently shadow an old one).
- A new converter is one row: yes (same caveat: first match wins).
- A new road terrain is one row: yes (lookup by terrain).
- A new village type is one row: yes.
- A second castle variant is one row: no. The code reads one `[castle]` tag (`optional_child`, line 711), so a map has one castle rule.
- A new lake or river shape is one row: no (code).

## 5. For Frankendom: how it maps to our shape

- Zones as data: a zone is one row: `{zone_id, seed, grammar_id, width, height, anchors}`. The grammar is a family row (height bands, converters, road costs, village rules, castle rule). 700 zones can share a small set of family rows, the way the donor's shipped scenarios share one generator block.
- Many-vs-one: the castle rule is a spawn-anchor rule. Two or more anchors with a minimum spacing and a walkable road between them maps to our arena or zone spawn points. Row 23 (zone population) is the closest parity row: spawn anchors feed it.
- Seeds: each zone stores its seed and the grammar version. Regeneration from the same seed should give the same zone. The donor does this (one seeded RNG per job, retries advance it).
- Validators: keep the schema-typed rows and the rejection-and-retry loop (bounded, 10 tries in the donor). Add what the donor lacks: a walk-path check between anchors (the donor drops failed roads silently), and a sorted-rule check on height and converter rows.
- Keep: the rule ordering (first match), the converter idea (flat ground re-labelled by height and a second field), the village rating as weights, the road-as-cheapest-path rule.
- Change: rename the keys (`river_frequency` becomes `river_uphill`, `lake_size` becomes `lake_fall_off`); make the `[castle]` rule a list so a zone can carry several anchor kinds; replace the "at random" comment and behaviour gap with an explicit choice; do not ship a "reroll until balanced" note to players (we verify spawn fairness in the server instead).
- Engine vs data: the donor's output is one `map_data` string (`output_map`, not read). How it reaches clients was not read, so the client side is (not read). For us the proposal is: the generator runs at build time or at zone load on the server, and the rules never ship to the client.

## 6. Look test (5 minutes on Dom's phone)

Generate 6 zones from 6 seeds with one family row, render each top-down at 375 px wide, and show them side by side with the same six seeds run with the river rule turned off. Dom judges: does each map read as a place (one lake or river, a road between two spawn points, at least 3 villages near water), and does the river rule add something a player would notice? Compare to a hand-drawn zone of the same size. Build nothing in the game for this; it is a generator printout only.

## 7. Licence and content status

- Code: GPL v2 (`COPYING`); source headers say "version 2 ... or any later version" (`default_map_generator_job.cpp` 8; `default_map_generator.cpp` 8). Copyleft: use the shape (stages, rule orders, fields), write our own code, no line-by-line translation.
- Data: the `Random_Scenario.cfg` file I read in full has no licence header of its own, and `default.cfg` (62 lines) was read in full. Treat the data as copyleft under the repo COPYING; use field names and the idea, not the values.
- Content: no art or text is proposed for reuse. The scenario description and village names are not used.

## 8. Gaps

- Not read: `output_map` (crop), the naming and label flood fill (lines roughly 1300 to 1409), the bridge branch in full (1062 to 1113 read only in part), `src/scripting/mapgen_lua_kernel.cpp`, the editor dialog `generate_map.cpp`.
- Half read: engine and data together. World Conquest Lua themes: `data/campaigns/World_Conquest/lua/map/generator/` (17 entries, about 2,759 lines in total) and `utilities.lua` lines 14 to 28 and 92 to 96 only, plus `classic.lua` 1 to 40. The Lua route generates the SAME config grammar through helper functions (`dr_height`, `dr_convert`), so it confirms the grammar is data, not code.
- No tests were run. No checks on generated output were run.
- No history: the donor has no `.git` directory, so "what they patched later" comes from `changelog.md` only (below).

## 9. What they patched later (history)

- `changelog.md` 487: fixed random-map settings leaking into unrelated content and causing out-of-sync errors. Generator state must not write into shared game config. Fix for us: the zone generator gets its own config copy.
- `changelog.md` 4223 to 4226: fixed an error when flipping a Lua random map, and an assert on the story map that fired about half the time. Fix for us: test mirrored and rotated variants of every family, not just the base seed.
- `cave_map_generator.cpp` 101: the C++ cave generator now prints a deprecation message and points to Lua. The donor moved the chamber-and-passage idea to Lua. Fix for us: do not build on a deprecated format; keep the idea.
- Code comments: 913 says "at random" but the castle placement is deterministic. 1040 says a failed road is silent. 152 says the height rules must be descending but nothing checks it.
- Random_Scenario.cfg line 7 tells players that random maps are often unbalanced and to reroll. That is a validator gap the donor chose to leave to the player.

## 10. Rulings for Dom (at most three)

1. When a generated zone fails a check, should the build retry with the next seed (up to N) and then fail loudly at build time, or should it fall back to a hand-made zone? Recommendation: retry up to 10 seeds at build time, then fail the build (never at player login).
2. Should each zone store its seed and grammar version so it can be regenerated byte for byte? Recommendation: yes; it is cheap and it makes a bad zone reproducible for a bug report.
3. Should spawn anchors be validated for walkable connection, and a zone rejected if they are not? Recommendation: yes; the donor drops failed roads silently, and a server-verified game should not.

## Checked

Read: `default_map_generator.cpp` lines 35 to 204 (the header and includes, 1 to 34, skipped), `default_map_generator_job.cpp` lines 46 to 229, 243 to 330, 384 to 502, 550 to 688, 689 to 912, 912 to 1000, 1000 to 1130 (roads, partial), 1218 to 1300, 1300 to 1409 (naming, partial), `cave_map_generator.cpp` 34 to 367 (all of the chamber, passage, castle code), `data/multiplayer/scenarios/Random_Scenario.cfg` (all 259 lines), `data/schema/core/mapgen/default.cfg` (all 62 lines), `lua_map_generator.cpp` (99 lines). Receipts: 45 written, verifier passed 45 of 45 (`/private/tmp/p2/wave2-haiku/batch3/PR007/receipts.tsv`).

Best transferable idea: a zone is a seeded rule-list over one heightfield (ordered height bands, ordered converters, a cheapest-path road cost table, a rating-based village picker, a castle-spacing rule), so 700 zones are rows of seed plus family.

Decision (proposed): adapt. Keep the ordered rule lists, the seeded retry loop, and the castle spacing; change the names (`river_uphill`, `lake_fall_off`), add the walk-path validator the donor lacks, and drop its numbers and hex board.

Acceptance: a zone row with seed S regenerates the same map; the server rejects any zone whose two spawn anchors have no walkable path, and the look-test printout shows at least one lake or river and at least three villages in 5 of 6 seeds.

Reuse tag: procgen-grammars / zone rows, row 23 (zone population, spawn anchors).
Brief rule served: as-data shape (PASS2 1), provenance (PASS2 2), patch history (PASS2 3), rulings (PASS2 4), keep the idea and fix the defect (BRIEF-ADDENDUM).

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- Odd width is only made even, not rejected (default_map_generator.cpp ~104): fixed.
- Castle-to-castle roads depend on `link_castles` (default true), shown as unconditional: fixed.
- Missed: same-border random roads skipped, cost>=1000 endpoint roads skipped (added); `default_flatland` schema key (the base terrain before height bands, job.cpp 759; schema default.cfg line 21) is an extra zone-header key.
Fixed 2026-10-12: width validator wording, link_castles gate, skipped-road rules.
