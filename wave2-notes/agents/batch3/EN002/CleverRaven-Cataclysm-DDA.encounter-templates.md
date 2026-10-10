# CleverRaven-Cataclysm-DDA: encounter-templates (EN002)

Depth: full. Half read: data pack (JSON) plus the game-side spawn code at three call sites (src/overmap.cpp place_mongroups, src/mapgen.cpp spawn roll, src/options.cpp SPAWN_DENSITY). Client rendering and monster AI bodies were not read.
Donor root (VPS, read-only): /mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/
Asset audit used first: /private/tmp/p2/wave2-haiku/batch3/AU010/CleverRaven-Cataclysm-DDA.assets.md (code and content CC BY-SA 3.0 per LICENSE.txt line 1). No catalogue exists for this donor in DC*.

## 1. What the player sees and feels
Walking a field or forest road, the first sign of a group is a fixed landmark on the overmap, not a surprise. A two-by-two wooden fort (four tiles plus roof tiles) is a bandit camp that reads from the edge of the screen. On a road, a single red X marks a bandit roadblock before you reach it. A forest patch of webs marks a spider pit; the pit is one tile on the map and holds a second, underground layer that you only find by going down. A roadstop may hold a caravan that a timed roll places and a later removal entry clears (meaning of days_till_spawn not read). On a 375-wide phone the landmark, not the crowd, is what you read first.

## 2. Why it works or is striking
- Readable silhouette at 375 wide: the camp is a 2x2 block with a roof layer; the roadblock is one glyph (sym X, red), placed on the road.
- One signature behaviour per template: the roadblock is visible from afar (autonote_visibility "details"); the camp keeps raiders leaving it (Mi-Go camp raiding parties); the pit is a lair that never empties by walking past.
- Signature sound or effect: not read (no sound files in the data pack read).
- Could be made ours at 20-30 percent resemblance: a red-X road marker and a small walled camp with a roof layer. Keep the readable landmark; change names, palette and the NPC mix.

## 3. The rule behind it
Three layers, each a table you can tune.

A. Landmarks (overmap specials). Each special has occurrences [min, max] (weight range), city_distance [min, max], locations (terrain types), and flags. 214 specials are in data/json/overmap/overmap_special/specials.json. The encounter-shaped ones:
- bandit_camp: occurrences [50, 100], city_distance [20, -1], locations wilderness, four overmap tiles plus four roof tiles.
- bandit_work_camp: occurrences [10, 100], field, nine tiles.
- Occupied Homeless Camp: occurrences [30, 100], city_distance [3, 10], city_sizes [8, -1].
- Mi-Go Encampment: occurrences [80, 100], city_distance [10, -1], spawns group GROUP_MI-GO_CAMP_OM, population [20, 50], radius [2, 30].
- Spider Pit: occurrences [33, 100], city_sizes [0, 12], locations forest, two layers (ground and underground).
- Large Dermatik Nest: occurrences [0, 3], city_distance [20, -1], spawns GROUP_DERMATIK, population [10, 20], radius [10, 15].

B. Groups with budget (monstergroups). Members have weight, cost_multiplier (budget points per unit), pack_size range, and starts/ends day windows and seasonal conditions. Example: GROUP_MI-GO_CAMP_OM has 8 entries; the file comment says it is for raiding parties that keep large groups from spawning until the player can deal with them. Top-level monstergroups/*.json holds 360 monstergroup entries.

C. Ambient walk density (per overmap tile). Each terrain's spawns block gives group, population [min, max], chance (percent). The roll is chance times the world option SPAWN_DENSITY (hidden world slider, range 0 to 50, default 1.0). When the odds would exceed the cap, the code raises a count multiplier instead. Animal groups use SPAWN_ANIMAL_DENSITY. Example: GROUP_FOREST chance 13, population [0, 1]; GROUP_WASP_GUARD chance 100, population [3, 8]. Per tile, population is spawn_count times rng(min, max).

D. Timed roadstop encounters. Three EOC files in data/json/encounters/ (10,699 bytes total). Each runs on recurrence 1800 and rolls chance 10 (percent) for a spawn that lasts days_till_spawn 7 days. Caravan: merchant and two guards plus a pickup. Refugee group: only while fewer than 45 days have passed since the cataclysm. Traveller: a camper van with a random travel direction.

E. Roadblocks (ambush-shaped map extras). mx_bandits_block (Roadblock, Bandits; zlevel 0 only) and mx_roadblock (Roadblock, Police). Each is a map extra on roads that nests one or two chunks. The bandit variant file has 11 entries, two of which place nothing; the police variant has 4 entries placing 2 vehicles and up to 2 monsters. The bandit block carries the note that it "doesn't always place anything".

Data fields (designer-tunable; donor values null because the donor is CC BY-SA, not MIT/Apache/BSD):
- landmark.occurrence_min, occurrence_max (weight, unitless)
- landmark.city_distance_min, city_distance_max (overmap tiles)
- group.member.weight (unitless)
- group.member.cost_multiplier (budget points per unit)
- group.member.pack_size_min, pack_size_max (units)
- group.member.day_start, day_end (game days)
- spawn.population_min, population_max (units)
- spawn.radius_min, radius_max (overmap tiles)
- ambient.chance_percent (percent, 0 to 100)
- world.spawn_density (multiplier, 0 to 50, default 1.0)
- roadstop.recurrence (turns; unit not verified in this read)
- roadstop.roll_chance_percent (percent)
- roadstop.days_till_spawn (days)

## 4. For Frankendom
Map to our shape (700 zones as data, 100 Pit characters reused across zones, many-vs-one with at most 3 attackers, server-verified events driving client presentation):
- Make an encounter template a data row: shape (ambush, camp, patrol, lair, escort), anchor rule (road, field, forest, zone edge), members as {character family id, weight, cost, pack range, day window}, a budget, a reveal rule and a respawn rule. Characters come from the 100 Pit pool by family, not as per-zone content.
- Keep: budget points per group so a zone's danger is one number the server can check; day windows on members; a world-wide density multiplier that is one knob; the readable landmark marker before contact on roads.
- Change: CDDA camps carry up to 14 NPCs, far past our 3-attacker cap. Keep the NPC roster as a reserve pool that comes in as the front three fall, not as one crowd on screen.
- Server-verified: the server rolls the landmark, the roster and every respawn; the client shows the marker and the members the server sends.
- Roadstop-style timed spawns map onto our timed-event scheduler (a daily check with a roll and a clean-up pass), not a live simulation of caravans.

## 5. A 5-minute look test Dom can judge on his phone
Build a static flag on the existing scene (no release rows, no lock; the look-test skill). Three screens at 375 wide with the same three enemy sprites:
1. Camp: a 2x2 fort tile with a roof layer, three members at the gate, one lookout behind.
2. Roadblock: a red X on the road tile, two members behind a vehicle sprite, the road visible for 6 tiles.
3. Lair: a web-patch tile with two members, no marker on the approach until the last tile.
Dom judges: can he count attackers at a glance; does the marker read before contact; does the lair say "stay out" in one look. Compare with the density knob at 0.5x, 1x and 2x on one 60-second walk loop (not built).

## 6. Licence and IP
- Code: CC BY-SA 3.0 (LICENSE.txt line 1; README line 64 summarises code and content). Some bundled code is under other licences (README line 65).
- Data and text (the JSON read here): CC BY-SA 3.0 project-wide per AU010; a copy would carry share-alike terms.
- Inspiration stays category-level: "a roadblock marker on a road", "a small walled camp with a roof layer", "a dig with a second level". No copied JSON, text, names, stat lines or exact numbers as donor values.
- Recreate as a clearly distinct original: keep the readable landmark and the budget rule; change names, palette, NPC mix and the marker glyph. No legal conclusion.

## 7. Gaps
- Not read: monster AI bodies; the bandit camp mapgen beyond the place_npcs counts; the Mi-Go camp mapgen beyond place_nested count; the roadblock monster identities; robofac_mi2_convoy_ambush_chunk (a mission chunk, present); the C++ map_extra functions mx_looters and mx_corpses; sound files (none in the data pack read).
- Escort: no escort encounter template found. "escort" occurs as text in 5 files (snippets/radio.json, snippets/e_logs.json, snippets/LIXA_snippets.json, snippets/fliers.json, npcs/refugee_center/surface_visitors/NPC_old_guard_representative.json); not read beyond the grep line.
- Patrol: the word appears as an NPC mission type (GUARD_PATROL) in 12 NPC files (for example npcs/Lighthouse_Family/NPC_lighthouse_man.json line 10, npcs/tacoma_ranch/NPC_ranch_guard.json). The mission logic was not read, so this is a mission-type name only.
- Ambush word: 16 data files mention it, mostly as flavour and item text (not read).
- Half read: data plus three game-side spawn call sites. The client half is not read. Region settings hold no monster-density keys (checked by grep).
- Counts used here: 214 specials (specials.json); 16 specials with a spawns block; 77 map_extra entries (overmap/map_extras.json); 360 monstergroup entries (top-level monstergroups/*.json); 3 encounter files.
