# CleverRaven-Cataclysm-DDA (procgen-grammars, cell PR002)

Donor/Licence: CleverRaven-Cataclysm-DDA. LICENSE.txt line 1 says the game is licensed CC BY-SA 3.0 (share-alike). Shape only: no code, data or names copied.
Root (VPS): /mnt/frankendom-donors/CleverRaven-Cataclysm-DDA. Paths below are relative to this root.
Checked: read data first: data/json/region_settings/region_settings/regional_map_settings.json (18 map_extra_collection entries by grep), data/json/overmap/map_extras.json (77 map_extra entries by grep), data/json/mapgen_palettes/common_parameters.json, data/json/overmap/overmap_special/ (43 files, 320 overmap_special objects by grep). Read code: src/mapgen.cpp 280-310 (production extra roll), src/mapgen.cpp 1760-1860 (palette parameters), src/regional_settings.cpp 750-775 and 850-870, src/map_extras.cpp 1240-1280 (debug simulator), src/overmap.cpp 3148-3345 (special placement and deck), src/overmapbuffer.h 155-172. Confidence high on the roll order and placement order (read line by line). Medium on what OMSPEC_FREQ does (not traced).

Half read: both (data and code). No paired donor needed.

## 1. What the player sees and feels
Walking open ground, most tiles are plain, and a landmark shows up now and then. The gate is set per terrain family: rare in forest, much more frequent in fields (the donor ratio is not copied; regional_map_settings.json holds the per-collection chance fields, forest id at line 844, field id at line 960). Each landmark is one glyph with one colour (every map_extra carries a symbol and a colour), so it reads as a single shape on a 375-wide screen: a crater, a pond, a dead-vegetation patch, a site with bodies. Buildings repeat one floor plan, but walls and floors come from a parameter picked per building, so a town looks like one family of houses in different skins. Rare unique structures are guaranteed a fixed number per world cycle, but they land on unpredictable overmaps, so the player meets them as news, not as a timer. (Inference from the data and code. Not played.)

## 2. Why it works / is striking
- Readable silhouette: one glyph and one colour per landmark (map_extras.json, sym and color fields).
- One signature behaviour: a per-tile gate that is rare, then a weighted pick. Most tiles show nothing.
- One signature sound or effect: not read (outside the procgen topic).
- Could be made ours at 20-30 percent resemblance: yes. A zone skin palette plus a rare landmark glyph.

## 3. The rule behind it (grammar)
(a) Gate then weight. Per tile, a one-in-N roll decides whether a landmark exists. Then a weighted list picks which one (src/mapgen.cpp 295-301). In the biome variant, components are tried in order and the first gate that fires wins, so list order is a designer lever (src/regional_settings.cpp 765).
(b) Filter before the roll. Landmarks whose z-range does not fit the tile are removed first. If none are left, the collection is skipped (src/regional_settings.cpp 854-866; src/mapgen.cpp 289).
(c) Palette plus parameters. A layout template maps symbols to terrain. Parameters carry weighted distributions and fallbacks (data/json/mapgen_palettes/common_parameters.json line 49, "param" plus "fallback"). A parameter with no scope is rolled once per overmap special, so a whole building keeps one wall type (src/mapgen.cpp 1762). Parameters scoped per tile roll per tile (266 "scope": "omt" lines in data, by grep).
(d) Rare decoration. A nested chunk list gives a null entry a large weight, so decoration is rare (common_parameters.json line 52: null weight 598 against two weight-1 chunks).
(e) Placement order. Specials have a priority tier. Within a tier the list is shuffled, and the first special that fits is placed. Each has min and max occurrences. A mandatory pass runs first, then an optional pass. Ten attempts per sector (src/overmap.cpp 3158-3163, 3215, 3342). The shuffle-first-fit inside a tier is not weighted in this function.
(f) Deck for rare unique specials. A virtual deck holds "successes" (min) and "deck_size" (max) cards. One card is drawn per eligible overmap, and the deck reshuffles when empty (src/overmap.cpp 3302-3310; src/overmapbuffer.h 159-172). This turns a probability into exactly N per cycle, with no clumping.

Data fields (designer-tunable; donor values not copied, licence is share-alike):
- landmark_gate_one_in_N | tiles | null
- landmark_weight | integer weight | null
- landmark_z_band | zone depth band | null
- palette_param_weights | weight per option | null
- null_chunk_weight | weight | null
- special_priority | tier int | null
- special_min_max | count per cycle | null
- deck_successes_min, deck_cards_max | count per cycle | null
- placement_attempts_per_sector | count | null

## 4. For Frankendom
- 700 zones as data: map a zone's terrain tag to a landmark collection (gate plus weighted list). One data file per collection, one id per biome.
- 100 Pit characters reused across zones: a landmark picks an existing actor template. The palette changes the skin (about 20-30 percent resemblance), so do not clone actors.
- Many-vs-one, MAX_ATTACKERS = 3: a landmark encounter spawns at most 3 attackers at once. The donor does not cap this (not needed for a map glyph).
- Server-verified: the per-tile roll and the deck state live on the server (zone population, row 23; origins/server/world-spawns.ts). The client receives "landmark X at tile T" and draws the glyph. Deck state is ledger data, so a restart cannot re-roll a rare unique.
- Keep: gate then weight; filter before roll; deck for rare uniques; palette parameters scoped per zone, not per tile, so a zone keeps one look.
- Change: seed the per-tile roll from the zone seed plus tile index so the server can replay it. Remove the double draw (defect 1 below).

## 5. Five-minute look test (Dom, on his phone)
Publish six 375-wide stills to the /preview/ folder (no release rows, per the look-test skill):
1. The same room template in three palettes (zone skin).
2. The same zone with the landmark gate at two frequencies (ours, not the donor's).
3. One rare unique landmark: placed randomly in 2 of 6 zones, versus a deck guaranteeing exactly 1 per cycle.
Dom judges: does a landmark about every 20 seconds of walking feel like a world worth walking? The 20-second rule is ours to set; the donor gives no timing.

## 6. Licence and IP
CleverRaven-Cataclysm-DDA, LICENSE.txt line 1: CC BY-SA 3.0. Share-alike, so category-level only.
Kept (idea): gate then weight; filter before roll; palette parameters with fallbacks; scope per building or zone; rare nested decoration; deck for rare uniques.
Changed: names, symbols, colours, every number, landmark families, file layout.
No legal conclusions.

## 7. Gaps
- Not read: src/overmap_special_mutable.cpp, src/overmap_special_fixed.cpp, src/overmap_noise.cpp, the apply functions in src/map_extras.cpp, data/json/mapgen_palettes beyond common_parameters.json (114 files in the folder, one read), locale/string tables (lang/) (not read), the OMSPEC_FREQ use in src/overmap.cpp (not traced).
- Half read: both. The debug simulator at src/map_extras.cpp 1259-1270 mirrors the production gate; I read it but did not run it.
- Depth: full.

Defect (keep the idea, fix the defect):
1. src/mapgen.cpp line 296 picks `ex.values.pick()` into `extra` and checks it for null. Line 301 then picks again with `*ex.values.pick()` and applies that. The checked pick is discarded. Distribution is unchanged, but each roll draws twice. fix: apply `*extra`.

Best transferable idea: a per-tile gate, then a weighted pick, with a filter before the roll. This keeps the world sparse and each landmark readable.

Decision: adapt (idea). Defect fixed in the sketch.
Reuse tag: pattern only (gate-then-weight, palette, deck).
Brief rule served: zones as data; server-verified events; one ledger.
