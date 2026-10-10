# OpenTTD-OpenTTD (design catalogue, DC043)

Donor: OpenTTD-OpenTTD (VPS: /mnt/frankendom-donors/OpenTTD-OpenTTD/). The data tables are in src/table/ (engines.h, cargo_const.h, town and industry land tables); the rules are in src/*.cpp.
Licence (as the files say): the repo is GPL v2 (README.md:26 says GPL v2 with third-party exceptions; COPYING.md is the GPL v2 text). Base-set sprite sources are GPL v2 by their nfo header (media/baseset/openttd/openttd.nfo header, per AU041). The four OpenTTD fonts are GPL-2.0 (media/baseset/OpenTTD-font.md:4, per AU041). The original Transport Tycoon Deluxe files are not in the repo (README.md:88); owner not stated in the files.
Donor class: B (GPL v2 base graphics and fonts; copyleft conditions). Original data would be class C, and it is not in the box.
Dom's rule for every entry below: recreate as a clearly distinct original, never a copy. All labels are ours.

## Halves read
- Data half (read): src/table/engines.h (the vehicle table, all four vehicle macros), src/table/cargo_const.h (cargo rows). Not read: industry_land.h, town_land.h, townname.h word lists, sprites.h, train_sprites.h.
- Engine half (read in part): src/disaster_vehicle.cpp and .h (disaster tables, the small UFO tick, the scheduler), src/vehicle.cpp (VehicleServiceInDepot, CheckVehicleBreakdown, HandleBreakdown smoke flag), src/roadveh_cmd.cpp (crash on flood), src/water_cmd.cpp (flood functions), src/animated_tile.cpp (the tile loop), src/landscape.cpp (snow line pointer), src/company_func.h (company colours).
- Server and client: one repo, one game engine. There is no server or client split to name; the engine is the whole game.
- Data pack (the base-set GRF binaries and the sprite sources under media/baseset): listed, not decoded here. The free graphics pair (OpenGFX) is not in the box, so there is no paired donor. OpenGothic is in the box but is not a pair for this donor.

## Counts (what each number counts)
- creatures: 0. There are no beasts, creature families or enemy units. The closest analogues are the hazard actors in section 5 (not counted as creatures).
- classes: 4 vehicle classes (rail, road, ship, air). Companies are factions; their maximum count is a code constant (src/company_func.h, not counted). AI scripts (src/ai) are not read.
- weapons: 0. No weapons, no damage types beyond vehicle crashes and disasters.
- gear_sets: 4 vehicle families are the gear sets. The table has 256 engine and wagon rows: rail 116 (30 locomotive rows, 5 multi-unit rows, 81 wagon rows), road 88, ship 11, air 41 (engines.h macros MT, MM, MW, MR, MS, MA; counts from grep -c on the macro names).
- zones: 4 climates (temperate, arctic, tropic, toyland; engines.h:91-97). Industry and town layouts are not counted.
- Cargo: 35 cargo rows (cargo_const.h:58 onward), counted by macro.
- Disaster kinds: 8 scheduled events in one table (disaster_vehicle.cpp:940).

## 1. Creatures and beasts
None. OpenTTD has no creature families, no mobs and no bosses. The enemy-like actors are disaster vehicles (section 5). Top 8 creatures: not applicable (0 creatures). The list is empty on purpose; nothing is padded.

## 2. Classes, races and factions
- Vehicle classes (4): rail, road, ship, air. Each class has its own engine table block in engines.h (MT, MM, MW for rail; MR for road; MS for ship; MA for air).
- Factions: companies, each with a colour (company_func.h:39 colour table, one entry per company), plus AI-run companies (src/ai, not read).
- Progression shape: a vehicle row has an introduction date (a base in days since 1920, engines.h:18), a decay speed, a life length in years, and a base life (the macro arguments, engines.h:26). Rows are gated by a climate bitmask (engines.h:91-97).
- Cargo rows (35): each row sets a label, a colour, a weight and a cargo-class list (cargo_const.h:58 shows the passenger row; the rest were counted, not read).

## 3. Weapons
None. The closest mechanic is vehicle breakdown (section 6): a hidden pity counter, a telegraph, and a repair (depot) that resets it.

## 4. Gear and gear tiers
- Tiers are introduction generations, not materials. Each engine row has an introduction date and a life window, so a generation of gear appears on the calendar and wears out (engines.h macros and fields).
- A vehicle's reliability is a value clamped to 16 bits that drains on every breakdown check and resets at the depot (vehicle.cpp:189-203 for the reset, vehicle.cpp:1333 for the drain).
- No material looks (no metallic, gold or glow tiers). Vehicle liveries use company colours (company_func.h:39).

Top 5 gear-like mechanics (striking):
1. Reliability drain and depot reset (vehicle.cpp:189-203 and 1333). Keep: a wear value that drains with use and resets at a safe point. Change: wear drains only while moving in a zone, and the reset is a shrine. Why: a wear bar that reads.
2. Pity-counter breakdowns (vehicle.cpp:1352-1366). Keep: the streak breaker. Change: a visible pressure meter. Why: a fair failure rule with a tell.
3. Introduction generations (engines.h:18 and the macro fields). Keep: a row gated by date and climate. Change: gated by zone tier and progression, not the calendar. Why: gear that belongs to a place.
4. Company livery (company_func.h:39). Keep: one colour per owner shown on the vehicle and the sign. Change: a colour per team or party. Why: owner colour at a glance.
5. Engine life and decay (macro fields c, d and b; engines.h:26). Keep: a life window after which the row is retired. Change: retirement is a loot-table removal, not a deletion. Why: a dated retire rule.

## 5. Zones, hazards and dungeon-like archetypes
- Climates (4): temperate, arctic (snow line), tropic and toyland (engines.h:91-97). The snow line is one static pointer (landscape.cpp:108) with a fixed height from the game settings.
- No dungeons. The zones are open maps with towns and industries. Industry and town layouts are not read.
- Disasters (the hazard actors). Eight kinds in one table (disaster_vehicle.cpp:940-950), each with a year window:
  - Zeppelin: crashes at an airport; state 0 flies to the airport and crashes (disaster_vehicle.cpp:228).
  - Small UFO: wanders, then hunts a road vehicle (state machine below).
  - Airplane: attacks an oil refinery industry.
  - Helicopter: attacks a factory industry.
  - Big UFO and big UFO destroyer.
  - Small and big submarine.
  - Coal-mine event.
  Year windows (disaster_vehicle.cpp:940-950): zeppelin 1930-1955; small UFO 1940-1970; airplane 1960-1990; helicopter 1970-2000; big UFO 2000-2100; small submarine 1940-1965; big submarine 1975-2010; coal mine 1950-1985.
- Scheduler: a daily timer counts down a delay of 730 days plus up to 511 more (disaster_vehicle.cpp:970). When it fires, it picks one available kind uniformly (disaster_vehicle.cpp:964). The difficulty setting can switch it off (disaster_vehicle.cpp:980).
- Small UFO state machine (disaster_vehicle.cpp:328-372): wander to a random tile, count six arrivals (age < 6, line 342), then choose a live road vehicle uniformly across all companies (line 359). If its target is crashed or already targeted, it leaves (line 363). If there are no road vehicles, it leaves at once.
- Flood (water_cmd.cpp:1098-1122 and 1209): water spreads tile by tile onto flat and sloped tiles. A road vehicle or train below the flood level crashes (line 1121-1122). A flooded road vehicle gets a long crash timer of 2000 (roadveh_cmd.cpp:558), against 1 for a normal crash.

Top 5 zone and hazard mechanics (striking):
1. Timed visitor (disaster_vehicle.cpp:940, 964, 970). Keep: a jittered timer, a window of allowed events, a uniform pick. Change: the windows are zone tiers, not calendar years. Why: a threat that comes on a beat.
2. Hunter scout (disaster_vehicle.cpp:328-363). Keep: wander, then lock on, and skip targets already taken. Change: the scout targets player carts or mounts and shows a ground shadow first (disaster_vehicle.h:21). Why: a roaming threat with a readable lock.
3. Rising tide (water_cmd.cpp:1209 and roadveh_cmd.cpp:558). Keep: tile-by-tile spread and a long disable for anything caught. Change: a timed tide with a warning ring. Why: a hazard that moves through the zone.
4. Smoke-tell breakdown (vehicle.cpp:1407 flag; HandleBreakdown telegraph in vehicle.cpp:1376-1400). Keep: a warning smoke before a stop. Change: the telegraph is a ground puff that a reader sees before the event. Why: a readable pre-warning.
5. Snow line (landscape.cpp:108). Keep: one height that changes the climate look. Change: a height per zone, not per game. Why: a zone line that can move.

## 6. Item and effect looks worth recreating
- Blinking threat (disaster_vehicle.cpp:330). The small UFO flips to a darker sprite on tick bit 3, which makes a hover read as alive. Technique: one bit of a tick counter. Ref: src/disaster_vehicle.cpp:330.
- Ground shadow for a flying threat (disaster_vehicle.h:21; the shadow subtype of each flyer). Technique: a second sprite on the ground under the flyer, so the threat reads at any height. Ref: src/disaster_vehicle.h:19-21.
- Breakdown smoke, skippable per engine (vehicle.cpp:1407). Technique: an engine flag decides whether the smoke plays. Ref: src/vehicle.cpp:1407.
- Animated tile list (animated_tile.cpp:75-98). Technique: a list of animated tiles; each tick advances the ones still animated and removes the rest. Ref: src/animated_tile.cpp:75 and 98.
- Company colour as the one owner colour (company_func.h:39). Technique: a colour table per owner used on vehicle and sign. Ref: src/company_func.h:39; src/viewport.cpp:1418 (sign colour).
- Flood as a tile change: plain rail tiles are flooded in place with a halftile water state (water_cmd.cpp:1209 onward). Technique: the tile type changes in place. Ref: src/water_cmd.cpp:1209.

## 7. Inspiration for Frankendom (originals, our names)
1. Timed Visitor (row 23, zone population). Idea: a threat timer with jitter, a window of allowed threats, a uniform pick. Keep: the jittered timer and uniform pick (disaster_vehicle.cpp:964, 970). Change: windows keyed to zone tier and time spent in the zone, not calendar years.
2. Hunter Scout (rows 4 and 23). Idea: a roaming enemy that wanders six waypoints, then locks on to a live target, skipping targets already taken. Keep: the lock rule and the leave-if-no-target rule (disaster_vehicle.cpp:342-363). Change: targets are player carts or mounts; a ground shadow shows the approach (disaster_vehicle.h:21).
3. Pity Meter (row 3 guard, parry and crit). Idea: each check adds one to a hidden chance; a rare roll adds 25 more; the counter resets when the event fires (vehicle.cpp:1352-1366). Keep: the streak breaker and the table lookup by reliability bits (vehicle.cpp:1363). Change: a visible pressure meter instead of a hidden number. Defect check: none found in the lines read; the clamp at vehicle.cpp:1363 covers the ship and reduced-setting bonuses.
4. Rising Tide (row 23, zone hazard). Idea: a flood that spreads tile by tile and disables anything it catches for a long time. Keep: the spread and the long disable (water_cmd.cpp:1209; roadveh_cmd.cpp:558). Change: a timed tide with a warning ring that a reader sees before it arrives.
5. Shrine Grace (row 17, death and respawn). Idea: service at the depot resets wear and quarters the breakdown chance. Keep: the post-reset grace (vehicle.cpp:200, breakdown_chance /= 4). Change: the shrine shows a shield aura for the grace time; no reduced-mode switch.
6. Climate Roster (rows 18 and 23). Idea: each gear row lists the zones it can appear in, as a bitmask. Keep: the bitmask per row (engines.h:91-97 and the macro field). Change: the bitmask gates loot tables and spawn lists, not vehicles.
7. Idle List (row 16, perf and ambient). Idea: a list of animated props; each tick advances those still active and removes the rest. Keep: the list with removal (animated_tile.cpp:75-98). Change: only props near the player are on the list.

## Where seen (folded topics)
- Idle and ambient: the blinking threat and the animated tile list (section 6).
- Death and respawn: the depot reset and grace (section 4 and original 5).
- Boss staging and finishers: none (no bosses).
- Readability at 375 wide: the ground shadow on flyers (section 6).
- Spawn and encounter density: the disaster delay is 730 to 1241 days (the schedule is not a walk density; it is an in-game calendar gap).
- Hud and sound: not read (the string table and news code are not opened in this pass; AU041 notes the english.txt count of 4801 STR keys and news_gui.cpp listed, not read).

## Not read
- src/table: industry_land.h, town_land.h, townname.h word lists, sprites.h, train_sprites.h; engines.h rows other than 0 to 3 and 105 (row counts by grep only).
- Media: base-set GRF binaries and sprite sources (media/baseset), the title data.
- The 66 language files; src/lang/english.txt (count from AU041 only).
- src/ai (AI scripts), src/news_gui.cpp, src/town_cmd.cpp, src/industry_cmd.cpp.
- Vehicle code beyond the breakdown and depot functions (vehicle.cpp 189-203, 1305-1407).
