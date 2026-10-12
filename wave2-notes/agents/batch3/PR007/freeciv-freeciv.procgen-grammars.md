# freeciv-freeciv (procgen-grammars, second pass, feel/world-design note)

Donor: `/mnt/frankendom-donors/freeciv-freeciv` | Licence: GPL v2 or later. Source header (`server/generator/mapgen.c` lines 4 to 6): "either version 2, or (at your option) any later version". `COPYING` is GPL v2 ("Version 2, June 1991"). Licence class: copyleft (shape only). | Half read: both, partially (generator code in `server/generator/` read in the parts named in Checked; ruleset read only for the property and flag rows of `data/classic/terrain.ruleset`) | Depth: full for the fair-island generator, the start-position placement and the biome quota step; thin for rivers, land shape and fracture (not read in depth).

## 1. What the player sees and feels

A fair-island map looks like a set of separate islands in one sea. Each player's home island is a copy of the same island shape, turned or mirrored at random, so the start looks like the others without being identical. Start islands have a clear band of sea around them; smaller islets fill the rest of the map. Biomes come in patches (forest, jungle, swamp, desert, plains) in roughly fixed shares of the land, so each island reads as a place with a character. On a phone the whole map is too wide to see at once; the player sees their own island first and learns its shape. (Map size is a server setting and was not measured; I did not run a map.)

## 2. Why it works / is striking

- Fairness by construction. Instead of generating a random map and scoring it after the fact, the generator makes one island and copies it with random symmetry, so the shape is the same for every start. That is a clear, checkable promise.
- One signature rule: a placement is all-or-nothing. A copy is first checked tile by tile (land cannot overlap land; sea may overlap sea; resource and hut buffers are respected) and only then written, so a failed copy never leaves half an island behind.
- One signature retry: when placement fails, the whole map is thrown away and the land targets shrink by 1 percent, up to a bounded number of attempts. When attempts run out, it sets the generator to the island type and reports failure (what the caller does next was not read).
- Readable at a glance: islands separated by sea, one start per island, biome patches. Silhouette is the island outline.
- Could be made ours at 20 to 30 percent resemblance: yes. Keep the copy-with-symmetry, the all-or-nothing check, the retry with shrinking target, and the start-position quality bar. Drop the hex topologies, the nations and the fractal fallback.

## 3. The rule behind it (order of operations, as the code runs)

Entry: `map_generate_fair_islands` (`server/generator/mapgen.c` 3395 to 3759).

1. Players are grouped. The start-position setting decides how many players share one island (1, 2 or 3, or all of a team; `switch` at 3425). In the all-of-a-team mode, mismatched team sizes fall back to one player per island (3457 and 3475).
2. Target sizes come from the settings. Per-player land is `tilesperplayer` minus polar tiles divided by players, or `(tiles x landpercent - polar) / (players x 100)` (about 3499 to 3501). Three island sizes are derived: main island = players_per_island x per-player x 0.7 (3504), two islet sizes at 0.2 and 0.1 of per-player land (3508, 3512). Each has a minimum.
3. Attempts: `iter = clip(1, 100000 / tiles, 10)` (3404), so small maps get up to ten tries and large maps one. Each attempt starts from an empty ocean map (3529 onward).
4. Grow one island (`fair_map_island_new`, 3083 onward). Start at the centre. A "fantasy" phase grows a blob from random existing land tiles, `fantasy = size x 2 / 5` steps (3119). A compact phase adds cardinal neighbours until the target size. A sea ring (the city-map radius for start islands, 1 otherwise) is kept clear. Start tiles are picked from the grown land (`FTF_STARTPOS`). Then terrain is assigned by quota with a 70 percent re-roll (3192): forest and jungle share `forest_pct + jungle_pct`, desert and swamp take their percent, hills take `mountain_pct / 150` and mountains `/ 300` (3179 to 3182).
5. Place team islands near each team's start point, scanning outward from a random offset (`fair_map_place_island_team`, 2951 onward). Place the rest at random positions with 10 random tries, then a full scan (`fair_map_place_island_rand`, 2916 onward).
6. Each copy gets a random geometry. On square maps: each of mirror, second mirror and quarter-turn is applied with 50 percent chance (`fair_geometry_rand`, 2784 to 2820). On hex maps: two mirrors at 50 percent, 0 to 2 rotation steps.
7. The copy is checked tile by tile before any write (`fair_map_copy`, 2832 to 2900). A conflict on an already-assigned tile fails the copy unless both tiles are ocean. Resource and hut buffers are respected. Only if the check passes does the second loop write.
8. If any placement fails, discard the map, reduce the three masses by 1 percent (`islandmass1 x 99 / 100`, 3696), and retry (3695 to 3698). If all attempts fail, set the generator to the island type and return false (3712).
9. On success, resources and huts are added, and start tiles get nation or team allowances (from 3716, "Finalize the map").

Start positions (`server/generator/startpos.c`):

10. Each tile gets a value: one point per food, shield and trade it produces, plus half the better of irrigation or mine potential (`get_tile_value`, 51 to 118; the comment at 59). A tile keeps its value only if more of its city-radius neighbours are below it than above it (360). The values are then smoothed.
11. Only tiles with a starter flag count (flag set in the ruleset). Islands are scored by the sum of their starter-tile values, sorted best first, and rescaled to 0 to 1000 (`adjust_int_map_filtered`, 0 to 1000).
12. The mode can fall back. A single-player-per-island mode drops to two-or-three per island if there are too few continents, and that drops to variable if still too few. The all-on-one-island mode drops to variable if the best island is too poor (the per-player constant 1500 at `startpos.c` 308; the test and its log line are near 404 to 408) (`create_start_positions`, 300 to 521).
13. Placement: sample random tiles; a tile is valid only if it passes all of `is_valid_start_pos` (187 to 247): value at or above the current bar; its island still has starter quota; no hut; native to the starting unit; native area at least the minimum (flood fill with early exit, `check_native_area`, 130 to 175); not too cold near the poles; and spacing from other starts. Spacing on the same continent: a tile is refused when `distance x 1000 / bar` is at or below the square root of continent size per starter (239 to 240), so it passes only when strictly above, and at the starting bar any start within about 4.5 tiles is refused (the absolute floor is written as `distance x 1000 / bar < 5`, so the threshold moves as the bar relaxes; 239 to 241).
14. If no tile passes, the bar drops by 5 percent (`data.min_value *= 0.95`, 497). Starting bar 900 (476). At or below 10 (`min_value <= 10`, 498) the run gives up (failure). The bar is also in the spacing formula, so relaxing quality also relaxes spacing.

Biome quotas (`server/generator/mapgen.c` `make_terrains`, 491 onward):

15. Shares are fractions of the land not taken by mountains (507 to 514). Each biome is placed by `PLACE_ONE_TYPE` (470 to 482): pick a random free tile that meets a wetness, temperature and miscellaneous condition, place the biome with a spread weight, and if no tile qualifies move the remaining count to an alternate biome (479). The five calls are hard-coded in code (520 onward): forest falls back to plains, jungle to forest, swamp to forest, desert to alternate desert then plains.
16. The choice of which terrain fills a biome is data-driven: `pick_terrain` (`server/generator/mapgen_utils.c` 692 onward; not mapgen.c, where 692 is river code) picks among all terrains a weighted draw on a target property, filtered by prefer and avoid properties, skipping terrains flagged as not generated.

## 4. Numbers as designer-tunable data fields

Donor values are NOT copied (copyleft). Locations only.

| Field | What it really is | Unit | Donor location | Where it lives |
|---|---|---|---|---|
| tilesperplayer / landpercent | land budget | tiles per player, percent | `server/settings.c` (GEN_INT entries) | server setting |
| startpos (mode) | players per island rule | enum | `server/settings.c` 1662 | server setting |
| mountain share | mountains as share of steepness | percent | `mapgen.c` 1504 | server setting (derived) |
| island size factor | main island share of per-player land | ratio (x 0.7) | `mapgen.c` 3504 | engine constant |
| islet size factors | smaller islets | ratio (x 0.2, x 0.1) | `mapgen.c` 3507, 3511 | engine constant |
| attempts | tries per map | count (clip 1 to 10) | `mapgen.c` 3404 | engine constant |
| mass decay per retry | land shrink | ratio (x 0.99) | `mapgen.c` 3696 | engine constant |
| fantasy share | blob phase | ratio (x 2/5) | `mapgen.c` 3119 | engine constant |
| terrain re-roll | biome mix stickiness | percent (70) | `mapgen.c` 3192 | engine constant |
| symmetry chance | each geometric transform | percent (50) | `mapgen.c` 2789 onward | engine constant |
| start bar | start quality threshold | units 0 to 1000 (900) | `startpos.c` 476 | engine constant |
| bar decay | relax step | ratio (x 0.95) | `startpos.c` 497 | engine constant |
| min goodies per player | start quality per player | points (1500) | `startpos.c` 308 | engine constant |
| min spacing floor | minimum start distance | tiles (5 after scaling) | `startpos.c` 241 | engine constant |
| property_* per terrain | how much a terrain counts as green, temperate, wet, dry, mountainous and so on | percent 0 to 100 | `data/classic/terrain.ruleset` 196 (doc), 609, 660 | zone data (per terrain row) |
| starter flag per terrain | may hold a start | flag | `data/classic/terrain.ruleset` 608 | zone data (per terrain row) |

PASS2 as-data shape:
- Table: `data/classic/terrain.ruleset`, one `[terrain_<name>]` block per terrain. Row fields used by mapgen: `identifier` (string), `name` (string), `flags` (list, for example Starter, CanHaveRiver), `property_<name>` (percent 0 to 100, each optional), plus the economic fields (food, shield, trade, movement) that the start value reads.
- A new terrain is one row: yes for placement (every terrain is iterated; a row with property values is drawn by `pick_terrain` and gets starter or river flags from its row). Not verified by running a ruleset.
- A new biome quota is one row: no. The biome list is five hard-coded `PLACE_ONE_TYPE` calls in code.
- A new start mode is one row: no (enum plus code).
- A new generator option in settings: no (settings table plus code).

## 5. For Frankendom: how it maps to our shape

- Zones as data: a biome is a property vector on a terrain row, not code. The quota (share of each biome per zone) belongs in a zone family row. This matches "zones are data on one runtime".
- Fairness by construction for PvP or duel islands: a duel arena or a shared island can be one template copied with random mirror or quarter-turn, checked before write. For the world, use it sparingly: copies make zones repeat.
- Spawn anchors: the start-position placement is our spawn-anchor rule. Keep the quality bar (value plus local-peak test), the native-area flood fill with early exit (a walk-area check from the anchor), the spacing floor, and the 5 percent relax loop with a hard stop. Feeds row 23 (zone population: spawn points).
- Validators: the all-or-nothing copy check and the native-area check are what we need for "server-verified spawns": a zone whose anchors cannot reach enough walkable tiles is rejected or relaxed, and the rejection is logged.
- Change: the donor's spacing formula uses the quality bar as a divisor, so relaxing quality also relaxes spacing. Split them: keep spacing fixed and relax only quality. Replace nations and team allowances with our character/zone allowances. Do not port the hex topology code.

## 6. Look test (5 minutes on Dom's phone)

Generate six 2-player zones from six seeds in two modes: (a) one template copied with random mirror or quarter-turn (fair), (b) free random placement. Render each top-down at 375 px wide, side by side. Dom judges which pairs look like two fair starts, and whether the fair copies read as a place or as a repeated stamp. No game code needed; generator printout only.

## 7. Licence and content status

- Code: GPL v2 or later (`mapgen.c` header lines 4 to 6; `COPYING` GPL v2). Copyleft: use the shape (copy with symmetry, check before write, retry with shrinking target, quality bar with relax), write our own code, do not translate line by line.
- Data: `terrain.ruleset` is part of the same project; treat as copyleft. Use the field names and the idea (property vector per terrain), not the values.
- Content: no names, art or text proposed for reuse.

## 8. Gaps

- Not read: `make_rivers` (906 to 1052), `make_land` (1053 to 1155), `map_fractal_generate` beyond the fallback at 1323 (1268 to 1497), `mapgenerator2/3/4` (2251 to 2514; names only), `create_island` and `place_island` (1855 to 2018; names only), `fracture_map.c` (only `make_fracture_map` start, 55 to 108), `height_map.c` (`gen5rec`, `make_pseudofractal1_hmap` not read), `mapgen_topology.c`, the ruleset loader for `property_*` (`server/ruleset/ruleload.c`, named only), `min_start_native_area` source (game ruleset, not read), the client, and the `tests/` folder.
- Half read: generator code plus the ruleset rows named above; the client half was not read.
- No run. No generated map was checked.
- No history in git: the donor has no `.git` directory, only a large SVN-era `ChangeLog` (2.8 MB). History below comes from that file.

## 9. What they patched later (history)

- `ChangeLog` 23431 (commit dated 2023-04-09): "Mapgenerator: Check if lake exist before regenerate". Fix for us: a rule that regenerates a feature must first check the feature is missing.
- `ChangeLog` 77551 (2019-12-25): "mapgen: Do not reduce mountains percentage by steepness^2 factor". The code now scales mountains linearly with steepness (`mapgen.c` 1504). Fix for us: check that a derived share is not squared by accident.
- `ChangeLog` 93803: the tile-value change "affects the selection of start positions" as well as the value shown in the popup. Lesson: one value serving two purposes couples them. Keep a start-quality score separate from display.
- `ChangeLog` 21668 (2023-05-12): "Fix init_new_game() state.startpos leak". Generator state leaked between games. Fix for us: a fresh start-position state per zone.
- `ChangeLog` 10992 and 45296: a CodeQL-flagged oddness check in mapgenerator4, and a minimum parameter added to the int-map adjust helper. These are code hygiene, not design.
- Patched bug in code: `startpos.c` 224 to 228. "A longstanding bug allowed starting positions to exist on poles, sometimes" and the fix is a temperature gate (`TT_NHOT`) that refuses cold and frozen start tiles. My reading: the gate is a temperature class test (`TT_NHOT`), which the comment describes as a fixed distance from the pole, so it treats the symptom at the start tile, not the pole placement. Fix for us: a spawn-anchor rule should forbid a class of tiles by name (for example "edge of the world"), not by a value.
- Open markers in code (grep for FIXME, HACK): `startpos.c` 204 (a hut rule the author says "could be ok" to relax, not done); `mapgen.c` 1136 (a hack for oceans at poles, not read); `mapgen.c` 1258 (FIXME: some continent numbers are unused at the end of the fractal generator). These are not bugs we have confirmed; they are the donor's own admissions.
- Comments in code: `startpos.c` 59 documents the value; `mapgen.c` 3695 "for better chances" documents the shrink retry.

## 10. Rulings for Dom (at most three)

1. Should we use fair copies (one template, copied with random mirror or quarter-turn) for PvP or duel islands, and forbid them in the open world? Recommendation: yes for duel islands only; the open world uses hand-tuned families so zones do not repeat.
2. When spawn anchors fail the walk-area check, should the zone be re-rolled up to N seeds, or should the anchor be relaxed (like the 5 percent bar)? Recommendation: re-roll first; relax only the quality bar, never the walk-area minimum.
3. Should spacing and quality share one knob (as the donor does) or be separate settings? Recommendation: separate, fixed spacing; quality may relax.

## Checked

Read: `mapgen.c` 1 to 6 (licence header), 1268 to 1323 (fallback region), 1498 to 1504 (mountain share), 1541 to 1583 (huts and resources, names only), 2784 to 2820 (geometry), 2832 to 2975 (fair copy and placement), 2981 to 3083 (resources and huts names; island start), 3083 to 3200 (island growth and terrain quota), 3395 to 3759 (fair islands entry, attempts, placement, retry, finalize), 470 to 545 and 692 to 710 region (biome placement macro and loop start, pick_terrain), `startpos.c` 51 to 118 (value), 130 to 175 (native area), 187 to 247 (start validity), 300 to 521 (create_start_positions, all of it), `terrain.ruleset` 194 to 212, 555 to 616, 655 to 662, 808 to 813, `settings.c` 1625 to 1668 (generator and startpos settings names), `COPYING` line 2. Receipts written to `/private/tmp/p2/wave2-haiku/batch3/PR007/receipts.tsv` (freeciv rows), verified with the verifier. Confidence: high for the fair-island and start-position order of operations (read end to end); medium for the biome placement fallback (read the macro and first calls, not the rest of `make_terrains`).

Best transferable idea: a spawn or start is a quality-thresholded random sample that relaxes its bar by a fixed step when nothing qualifies, and a map copy is checked tile by tile before any write, so a failed placement never leaves partial geometry.

Decision (proposed): adapt. Keep the check-then-write placement, the bounded relax loop and the walk-area check; split spacing from quality and keep our own numbers.

Acceptance: a generated 2-player zone never has a start whose walkable area from the anchor is below the minimum; a failed zone is re-rolled, not shipped; the spacing between two anchors never shrinks when the quality bar relaxes.

Reuse tag: procgen-grammars / spawn anchors, row 23 (zone population, spawn points).
Brief rule served: as-data shape (PASS2 1), provenance (PASS2 2), patch history (PASS2 3), rulings (PASS2 4), keep the idea and fix the defect (BRIEF-ADDENDUM).

Added 2026-10-12 (checker, verified against mapgen_utils.c 746-759): `pick_terrain` has a fallback chain when no terrain matches; it drops `prefer` first, then `avoid`, then `target`, recursing each time, so it always returns something. Starter tiles use `pick_terrain_by_flag(TER_STARTER)` (mapgen_utils.c 649) before quota terrain. `fair_map_copy` refuses land on an unassigned tile flagged ocean (the sea-ring rule).

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- pick_terrain cited as mapgen.c; it is mapgen_utils.c:692.
- Give-up test is min_value <= 10, not below 10.
- Same-continent spacing refuses when <= sqrt(...); note had the pass condition as 'at or above' (off by equality).
- Missed: pick_terrain fallback chain, TER_STARTER pick, fair_map_copy sea-ring rule.

Fixed 2026-10-12: file citation, give-up wording, spacing wording, added fallback chain line.
