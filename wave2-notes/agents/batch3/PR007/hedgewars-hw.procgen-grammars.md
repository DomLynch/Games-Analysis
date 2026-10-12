# hedgewars-hw (procgen-grammars, second pass, feel/world-design note)

Donor: `/mnt/frankendom-donors/hedgewars-hw` | Licence: GPL v2 (`COPYING`, "Version 2, June 1991"). The procgen source files (`rust/landgen`, `rust/mapgen`, `hedgewars/uLandGenPerlin.pas`) and the three data files carry no per-file licence header, and `rust/landgen/Cargo.toml` has no licence field. Treat as copyleft (shape only). | Licence class: copyleft | Half read: both (generator code plus the three data files; the tile PNGs named in the WFC data were NOT opened) | Depth: full for the three generator cores (wave-function collapse, outline with midpoint displacement, maze braid) and the template loader; thin for rendering, theme and the outline polygon output.

## 1. What the player sees and feels

A Hedgewars random map is a side-on landscape, not a top-down grid. Depending on the template it is one of three looks: a cave-like outline with rounded islands and walls (outline type), a stone labyrinth of corridors with dead ends and some loops (maze type), or a patchwork of modular rooms and shaped blocks whose edges line up like jigsaw pieces (wave-function-collapse type). The maze rows read here are 1,536 to 4,096 px wide, several phone screens across, so on a 375 px phone the player sees a slice: the nearest block, the corridor they are in, and the edge where land meets sky. (Where the teams spawn was not read.)

## 2. Why it works / is striking

- Three generators share one data shape. Each is a list of rows (size, a few flags, a count of spawns, and generator knobs) grouped into named types, and a type picks one row at random. The shipped data has about 76 rows (54 outline, 12 maze, 10 wave-function-collapse templates) plus 61 tiles, which is the whole random-map catalogue.
- One signature rule: modular tiles that only join when their edge labels match, so a room can never have a door that leads nowhere. A per-side bitmask (anti-match) forbids pairs that share a tag, a cheap second check.
- One signature knob: the maze's braid value. One wall in `braidness` is knocked out when a dead end is hit, so HIGH values give a tree-like maze (one route) and LOW values give many loops (flank routes); the shipped rows use 3 to 20. That is a direct, designer-readable dial for "how many ways round". Donor defect: the value is a u32 with no validation, and 0 makes `gen_range(0..0)` panic (maze.rs 162). Fix for us: store loop chance as a fraction 0..1 (or reject 0 at load) so the dial reads in the natural direction.
- One signature failure rule: when the modular generator gets stuck, it clears the stuck cell's neighbours and tries again; after 128 resets it stops clearing and leaves holes. The donor accepts holes at that point.
- Could be made ours at 20 to 30 percent resemblance: yes for the maze and the outline. The modular (WFC) method is a good fit for dungeon kits (rooms and corridors) but is heavier to tune; start with the maze and the outline.

## 3. The rule behind it (order of operations, as the code runs)

Selection (`rust/mapgen/src/lib.rs`): a map asks for a template type name (for example "small", "medium", "large", "cavern", "wacky" for outline templates). `get_template` picks one row uniformly at random from that type's list (line 55, `choose(rng)`). Type lists are index lists into one shared row table, so one row can appear in several types (see the cavern type, section 4).

Outline generator (`rust/landgen/src/outline_template_based/outline.rs`):
1. A template is a set of island outlines (each a closed ring of rectangles), optional walls (rectangle lists) and fill points. Optional symmetry: mirror and flip (`mirror`, `flip`, 319 to 331), and an inverted "cavern" form.
2. Each outline edge is split by recursion (`distort`, 286 to 296; `divide_edges` runs until a full pass splits nothing). Splitting an edge: take its midpoint, look along its normal in both directions, stop at the map box (with a margin equal to `distance_divisor`), at other outline edges, and at a maximum reach of `normal_len x 128 / distortion_limiting_factor` (239). If the free space on both sides sums to less than `2 x distance_divisor + 10` the edge is split at its midpoint with no push (243). Otherwise a new point is placed at a uniform random offset in the free range (249).
3. An edge is split only if its normal is at least three times the distance value (139). That makes the recursion stop on its own: short edges are left alone.
4. Optional bezier smoothing of each ring (`bezierize`, 280), and the rectangle outline is then rasterised.

Maze generator (`rust/landgen/src/maze.rs`):
5. Cell count per axis is the map size divided by `cell_size`, forced to an odd number (`prev_odd`, 91 and 375). The map is centred with an offset (114 to 115).
6. Carving: a randomised depth-first walk over cells (`see_cell`, 134 onward). When the next cell is already seen, a random wall is knocked out with probability 1 in `braidness` (162), unless the template is inverted. Inverted templates never braid.
7. Polygon output and the distortion pass (`distortion_limiting_factor`, passed at 459) are not read in detail.

Wave-function-collapse generator (`rust/landgen/src/wavefront_collapse/`):
8. Tiles are loaded with their symmetry variants: flip, mirror and rotations are added as extra tiles according to the tile's `can_*` flags (`generator.rs` 151 to 173; rotation by 180 is skipped when flip or mirror is on, 166 to 168).
9. Adjacency: two tiles may sit side by side when their facing edge labels match (same id, and the sides differ in reversal or the edge is symmetrical, `tile_image.rs` 42), and when their per-side anti-match bitmasks share no bit across the join (156). A soft edge (not `hard_match`) also allows an empty cell next to it (`build_rules`, 196 to 300).
10. Rule weight: each tile's weight is multiplied by a ramp over its position in the tile list, `(f x 2 x i / (n - 1) + 100 - f)`, where f comes from `distance_divisor`: f = (divisor - 1) x 8 - 96 (generator.rs 289 and 317). At the minimum divisor the base ramp runs from 196 for the first listed tile to 4 for the last (about 49 times, before the per-tile weight and before squaring); at the maximum it runs the other way. The divisor is asserted to be between 1 and 25 (313 to 314). The ramp depends on list order, which the data file does not say.
11. Collapse: pick the cell with the fewest possible tiles (`collapse_step`, 151 to 252). Its candidate weights are squared (187 to 188, the code comment says "quadratic weight"), and one tile is drawn with a weighted index (220).
12. Contradiction: a cell with no candidates resets its neighbours to empty and adds one to the reset counter (232 and 82). After 128 resets the step ignores unsolvable cells (82), so holes can remain.
13. Wrap: when the template says `wrap = true`, the horizontal neighbour index wraps (108). Vertical wrap is not in the donor's code path that I read.

Data loading (`rust/mapgen/src/lib.rs`): YAML and TOML are parsed with `unwrap()` (144, 176), so a malformed data file panics at load. A missing tile-set or edge name panics at an `expect` (template/wavefront_collapse.rs 75). Template indices into the row table are not checked.

Legacy generator (`hedgewars/uLandGenPerlin.pas`, Pascal): a Perlin noise map whose hedgehog budget is a formula of the feature size: a base of 12 for small tunnels plus one per size step, with other bases (14, 16) for medium and large tunnels, capped at 24 for tunnels only (145 to 155); island maps use other branches (32+, 28+, 24+ bases, about 64..32, 56..28, 48..24) with no 24 cap (156 to 168), and odd results are rounded down to even. The engine receives the value over IPC (`hwengine.pas` 618).

## 4. Numbers as designer-tunable data fields

Donor values are NOT copied (copyleft). Locations only.

| Field | What it really is | Unit | Donor location | Where it lives |
|---|---|---|---|---|
| width, height (per template) | map size in pixels | px | `map_templates.yaml`, `maze_templates.yaml`, `wfc_templates.toml` | zone data |
| max_hedgehogs | spawn budget written on the row (parsed; no Rust reader found by grep) | count | `mapgen/src/template/outline.rs` 31; `wfc_templates.toml` 448 | zone data |
| distance_divisor (overloaded) | outline min gap AND WFC order bias | count 1 to 25 (WFC asserted) | `outline.rs` 131; `generator.rs` 314, 317 | engine knob (name is wrong) |
| distortion_limiting_factor | max push of an outline edge (larger = smaller push) | ratio (x 128 scale) | `outline.rs` 239; `maze_templates.yaml` | zone data |
| braidness | 1 in N collisions knocks out a wall (loops) | count | `maze.rs` 162; `maze_templates.yaml` 11 | zone data |
| cell_size | maze cell size | px | `maze_templates.yaml`; `maze.rs` 91 | zone data |
| tile weight (default 10) | relative draw weight, then squared | count (default 10) | `wavefront_collapse.rs` 187 to 188; `generator.rs` 294 | zone data (per tile) |
| anti_match | per-side tag bitmask | bits | `wfc_templates.toml` 139; `tile_image.rs` 156 | zone data (per tile) |
| reset limit | resets before unsolved cells are accepted | count (128) | `wavefront_collapse.rs` 82 | engine constant |
| force_invert | a type inverts its rows | flag | `map_templates.yaml` 2511; `mapgen/src/lib.rs` 157 | zone data (per type) |
| wrap | horizontal wrap of a WFC template | flag | `wfc_templates.toml` 449; `wavefront_collapse.rs` 108 | zone data |

PASS2 as-data shape:
- Tables: `share/hedgewars/Data/map_templates.yaml` (outline rows, 54 rows, plus a `template_types` block at 2502), `share/hedgewars/Data/maze_templates.yaml` (maze rows, 12 rows, `template_types` in the same file), `share/hedgewars/Data/wfc_templates.toml` (10 WFC templates, 61 tiles in 4 tile sets: hex 26, Shoppa 20, Rooms 9, round120 6; 4 named edge sets).
- Outline row fields (struct in `rust/mapgen/src/template/outline.rs`): width (u32), height (u32), can_flip, can_invert, can_mirror, is_negative, put_girders (bool), max_hedgehogs (u8), outline_points (list of lists of rect {x, y, w, h}), walls (optional, same shape), fill_points (list of {x, y}). Type entry: indices (list of row numbers), force_invert (optional bool).
- Maze row fields (`rust/mapgen/src/template/maze.rs`): width, height, max_hedgehogs (u8), cell_size, distortion_limiting_factor, braidness (u32), invert (bool). Type entry: a plain list of row numbers.
- WFC template fields (`rust/mapgen/src/template/wavefront_collapse.rs`): width, height, can_invert, is_negative, put_girders (optional bools), max_hedgehogs (u8), wrap (optional bool), edges (name of an edge set), tiles (list of tile-set names). Tile fields: name (image file name), weight (optional u8, default 10), edges (four strings: top, right, bottom, left), anti_match (optional four u64 bitmasks), is_negative, can_flip, can_mirror, can_rotate90, can_rotate180, can_rotate270 (optional bools). Edge set: top, right, bottom, left, each with begin, fill, end (all optional strings).
- A new outline template is one row: yes (add a row, then name its row number in a type; a bad number panics at load).
- A new maze template is one row: yes (same caveat).
- A new WFC tile is one row: yes, but only if its four edge strings match existing ones; an orphan tile is loaded and never matched (the donor does not warn; not run).
- A new template type is one entry: yes.
- A new generator kind is one row: no (code).

## 5. For Frankendom: how it maps to our shape

- Zones as data: one template row per zone family (width, height, spawn budget, generator knobs). A type maps a family to a list of rows, and the per-type override (force_invert) lets one row serve two families. That is the answer to "700 zones as data" without 700 hand-drawn maps.
- Dungeons: the maze with the braid knob is the dungeon grammar we need for corridors. Braid is a per-zone dial for loops, so a flank route exists when three attackers arrive (MAX_ATTACKERS = 3). Feeds the zone-as-data loader; row 23 (zone population) for spawn budget.
- Modular rooms: the WFC edge sockets are the way to make rooms that always connect. Keep the idea (edge labels plus per-side tags) for dungeon kits only; open world zones do not need it.
- Overworld: the outline with walls and fill points is a clearing or cliff shape. Keep the fill point (a seed for the interior) and the wall rectangles (obstacles).
- Keep: the typed row tables with a uniform choice per type; the shared row table with per-type overrides; the braid dial; the bounded reset counter (but see defects).
- Change: rename `distance_divisor` into two knobs (outline `min_gap`, WFC `tile_order_bias`); give every tile an explicit weight so list order does not change probabilities; never ship unsolved cells (re-roll the seed instead of accepting holes after 128 resets); make the data loader report row numbers instead of panicking; wire `max_hedgehogs` to the spawn budget or delete it (no reader found).
- Client versus server: the donor generates on the host that runs the room. For us the generator runs on the server or at build time, and the zone data sent to the client is the finished tile map.

## 6. Look test (5 minutes on Dom's phone)

Render six maze zones from six seeds at braid 3 (many loops) and six at braid 20 (nearly a tree), side by side, at 375 px wide, top-down. Dom judges which set reads as a place with a choice of routes, and whether the braid 20 set feels like a tree you can get stuck in. (Braid 0 is not a valid test: the donor panics on it.) Second set: six outline zones with and without wall rectangles. No game code; generator printout only.

## 7. Licence and content status

- Code: GPL v2 per `COPYING`. No per-file licence header in the procgen files; no Cargo licence field. Copyleft: take the shape (typed rows, shared row table with overrides, braid dial, edge-socket matching, per-side tags), write our own code, no line-by-line translation.
- Data: the three data files have no licence header; treat as copyleft. Use field names and the idea, not the values.
- Art: the WFC tiles refer to PNG files by name (for example "120_filled.png"). The images were not opened. Their licence is not checked here, so do not reuse them.

## 8. Gaps

- Not read: `rust/landgen/src/wavefront_collapse/transform.rs` (rotation code), `apply_one` and `apply_all` in `wavefront_collapse.rs`, the `is_negative` branch of `load_image_tiles` (`generator.rs` 106), `rust/landgen/src/outline_template_based/template_based.rs` (153 lines), `outline_template.rs` (the cavern transform), the outline bezier step and the polygon output, `maze.rs` 262 to 375 (`to_islands`), `rust/mapgen/src/theme.rs` (254 lines) and `make_texture`, `rust/landgen/src/lib.rs` (the trait), the legacy Pascal generator outside the budget formula, the engine integration (`rust/lib-hedgewars-engine/src/world.rs` only grepped).
- Not checked: whether `max_hedgehogs` is read by the engine or the server; grep found no Rust reader, and the server hit was an unrelated room variable.
- Half read: generator code and the three data files. The client side was not read.
- No tests were run and no map was generated.
- No git history: the donor has no `.git` directory (only `.github` and `.gitignore`). History below comes from `ChangeLog.txt`.

## 9. What they patched later (history)

- `ChangeLog.txt` 224: "Display recommended max. hedgehog count for Perlin maps". The budget became visible to the host. Fix for us: show the zone's spawn budget in the zone's editor or debug view.
- `ChangeLog.txt` 700: "Improved hedgehog spawns on maps that lack land mass or free space". A spawn fallback for crowded or thin maps. Fix for us: a spawn validator that says what to do when there is no room (relax the spacing, not the count).
- `ChangeLog.txt` 1141: "Generated map stays same if the template is the same between groups". Seed discipline by template: the same template in two groups gives the same map. Keep this.
- `ChangeLog.txt` 1065 and 1422: Perlin maps, then maze maps, were added as separate random-map modes. The modes are kept as separate generators, not merged.
- Code: no FIXME, HACK or TODO found in `rust/landgen`, `rust/mapgen` or `uLandGenPerlin.pas` (grep, not exhaustive).

## 10. Rulings for Dom (at most three)

1. Should one template row serve several families with per-family overrides (the cavern pattern), so 700 zones need about 50 rows rather than 700? Recommendation: yes.
2. When the modular generator gets stuck, should we re-roll the seed up to N times and never ship holes? Recommendation: yes; the donor's 128-reset fallback leaves holes.
3. Should dungeon zones carry a loop-density dial (the braid value) so the three-attacker rule has room to flank? Recommendation: yes, with a low loop chance by default (a high braid value in the donor's terms, or a small fraction in ours) so fights stay readable.

## Checked

Read: `rust/mapgen/src/lib.rs` 40 to 215 (selection and the three loaders), `rust/mapgen/src/template/outline.rs` (all), `rust/mapgen/src/template/maze.rs` (all), `rust/mapgen/src/template/wavefront_collapse.rs` 1 to 80 (struct, `to_template`, tile conversion), `rust/landgen/src/wavefront_collapse/wavefront_collapse.rs` 70 to 102 and 151 to 252 (generation loop, collapse step), `rust/landgen/src/wavefront_collapse/generator.rs` 179 to 330 (template loading, rule building, caller with the distance factor) and 412 to 420, `rust/landgen/src/wavefront_collapse/tile_image.rs` 41 to 44 and 150 to 230 (edge matching, anti-match, transforms of the bitmask), `rust/landgen/src/outline_template_based/outline.rs` 60 to 160 and 228 to 300 (edge split and distort), `rust/landgen/src/maze.rs` 82 to 175 and 375 to 383 (cell count, braid, odd helper), `data/map_templates.yaml` 2500 to 2513 (types block), `data/maze_templates.yaml` 1 to 60, `data/wfc_templates.toml` 1 to 16, 418 to 460, `hedgewars/uLandGenPerlin.pas` 120 to 160 and head, `hedgewars/hwengine.pas` 618, `ChangeLog.txt` (grep of the procgen terms), `COPYING` line 2. Receipts: 135 across the three donors, verifier passed all 135 (`/private/tmp/p2/wave2-haiku/batch3/PR007/receipts.tsv`). Confidence: high for the WFC loop, the weight ramp and the outline split rule (read end to end); medium for the maze carve (read the braid step and the cell count, not the output); low for `max_hedgehogs` consumption (absence found by grep only).

Best transferable idea: a zone family is one typed row in a data table (size, a generator knob such as braid, a spawn budget), picked uniformly at random from its type, with per-type overrides on shared rows, so hundreds of zones come from a few dozen rows.

Decision (proposed): adapt. Keep the typed row table, the per-type override, the braid dial and the edge-socket matching for dungeon kits; rename the overloaded knob, give tiles explicit weights, re-roll instead of shipping holes, and make data errors report a row number.

Acceptance: a braided dungeon zone at the many-loops end of the dial (donor braid 3, not 12) has at least one loop route between two spawns in the server check, a nearly-tree setting (donor braid 20) may have none, and a braid/loop value of 0 is rejected at load; a modular zone with an unsolved cell is never sent to a player (re-rolled or refused at build time).

Reuse tag: procgen-grammars / zone rows, row 23 (zone population, spawn budget).
Brief rule served: as-data shape (PASS2 1), provenance (PASS2 2), patch history (PASS2 3), rulings (PASS2 4), keep the idea and fix the defect (BRIEF-ADDENDUM).

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: WRONG
- Braid direction inverted in section 2 (and the Look test, ruling 3, Acceptance built on it): maze.rs:162 knocks a wall out with chance 1/braidness, so LOW braidness = MORE loops, high = tree-like; data uses 3 to 20. Sections 3 and 4 were already right.
- Missed donor defect: braidness 0 (u32, unvalidated) makes gen_range(0..0) panic; the note called braid 0 a "tree".
- Missed: uLandGenPerlin.pas has island budget branches with no 24 cap; the cap is tunnel-only (145-155).
- Everything else checked held (template choice, split rule, WFC reset limit, ramp, asserts, unwraps, row counts, ChangeLog lines, licence).
Fixed 2026-10-12: braid direction in section 2, Look test (braid 3 vs 20), ruling 3 wording, Acceptance (low value loops; 0 rejected at load), added the braid-0 panic and fraction fix, scoped the 24 cap to tunnels.
