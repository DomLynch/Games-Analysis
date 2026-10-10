# daggerfall-unity (world-events, cell WE010)

Donor: `/mnt/frankendom-donors/daggerfall-unity` | Licence: MIT for code (root LICENSE lines 1 and 3, "Copyright (c) 2009-2023 Daggerfall Workshop"; `Assets/Licenses/Daggerfall Unity.txt` line 3 names another holder and range, both MIT, recorded as is) | Content (quest scripts, text, tables, rumour strings): class C per AU013 and DC016, category-level only | Data pack NOT in the box

Checked: read `Assets/Scripts/Internal/WorldTime.cs` 20-140 and 60-69 (time advance and milestone events); `Assets/Scripts/Game/Questing/Clock.cs` 185-260, 276-345, 385-422, 422-488 (quest timer: setup, tick, start/stop, travel time); `Assets/Scripts/Game/Questing/Actions/CreateFoe.cs` 40-96 and 109-170 (interval spawn); `Assets/Scripts/Game/Questing/Actions/StartStopTimer.cs` 20-76; `Assets/Scripts/Game/Questing/Actions/DailyFrom.cs` 26-109; `Assets/Scripts/Game/Questing/QuestMachine.cs` 318-330, 441-456, 1982-1992 (tick rate and call sites); `Assets/Scripts/Utility/RandomEncounters.cs` 1-140, 1300-1530 (table heads and the choice function); `Assets/Scripts/Game/Entities/PlayerEntity.cs` 440-505, 545-625, 1626-1760 (catch-up loops, outdoor and indoor spawns, faction and region updates; the 1760-1880 block only by grep); `Assets/Scripts/Game/Formulas/FormulaHelper.cs` 1765-1813 (spawn rolls); `Assets/StreamingAssets/Text/Master Localization CSV Files/Internal_RSC.csv` rows 1400-1418, 1450-1457, 1475-1477 (by grep). Counts by grep: 45 encounter table labels (index 0-44), 36 rows with a 14xx id. Confidence: high on the code paths quoted. Medium on the exact per-window spawn probability (derived, see section 3C).

Half read: client (the Unity project is the whole single-player game). The data pack (DOS arena files, the faction table, most rumour and quest data) is not in the box, so no faction power values are known. No paired data donor exists in this batch.

Verdict: STRONG. Quest countdowns, interval spawners, level-banded encounter ladders, a per-minute encounter roll and a faction-drift loop are all real and read. The rules are self-contained and fit a fast browser game as data.

## 1. What the player sees and feels

Night on the road is busier than day, but the busyness arrives in bursts: a fight can start on a quiet stretch, then nothing for a long walk. Enemies appear a few tiles away, never on top of you (the spawner keeps a minimum distance). News of the world comes through rumours in taverns and talk, not through map markers: a war starts, a treaty ends it, a rival faction is mentioned, and the player finds out by listening. Quest deadlines are countdowns in game days, so a missed clock feels like the world moved on without you. Travel and jail fast-forward the day in one jump, so the lights and the hour change at once.

## 2. Why it works or is striking

- Readable at 375 wide: each random encounter is one enemy, placed at a set distance, from a short list of types per place (the call sites pass a count of 1, `PlayerEntity.cs` 574, 594, 610; the parameter meaning is inferred from the call, not read in `GameObjectHelper`).
- One signature behaviour: the enemy type is chosen by place (dungeon type, underwater, six climates by day or night, indoors by building), so the same road feels different at dusk in a desert and in a swamp.
- One signature sound or cue: not read (the presentation side of the spawn is not in this read).
- Could be made ours at 20-30 percent resemblance: "news is a rumour line that the event emits, with the names filled from the event's own faction" plus "a level-banded ladder of enemy types per zone type".

## 3. The rule behind it

**A. Quest clock (countdown in world seconds).** A clock resource has a starting value and a remaining value (`Clock.cs` 287 subtracts the world-time delta at each tick). The start value comes from the script: fixed; or uniform random between two values (`Clock.cs` 209, 392); or with no value, uniform random between 1 minute and 7 days (`Clock.cs` 193-195, the donor marks the range as a TODO); or the travel time to the place times 2.5 for the return trip, with a one-day floor (`Clock.cs` 32, and the travel-time functions at 444-488). The quest machine ticks ten times per second (`QuestMachine.cs` 45). When remaining reaches zero, the task with the same name starts. Start and stop are separate actions (`StartStopTimer.cs` 54-76).

**B. Interval spawn ("create foe X every N minutes, count or indefinitely, P percent", `CreateFoe.cs`).** Interval is N x 60 game seconds (`CreateFoe.cs` 77). The first slot's phase is random in `[0, interval)` (line 115). Each slot: time stamp is set, then one percent roll; the slot is used up whether the roll passes or fails (lines 134-137). Only one spawn event runs at a time. The count limits how many events run; the word "indefinitely" sets it to infinite (`CreateFoe.cs` 82-83).

**C. Intermittent encounters (per game minute, `PlayerEntity.cs` 455-505).** The catch-up loop walks every game minute that passed since the last update (line 486) and calls the spawn check for each (line 491). The check only rolls in a 12-minute window out of every 144 (`timeForSpawn = ((Minutes / 12) % 12) == 0`, line 559). Outdoors, in the window: wilderness by day 1 in 36 (`FormulaHelper.cs` 1784), wilderness at night 1 in 24 (line 1797), location at night 1 in 24 (line 1771), location by day never (`PlayerEntity.cs` 569-585 region). Indoors, a dungeon spawn only rolls while resting and when enemy alert is active, 1 in 36 (`PlayerEntity.cs` 607; `FormulaHelper.cs` 1810). No spawns while swimming or on a ship (lines 488-490). Minimum distance: 8 tiles in dungeons, 10 in locations and in the wilderness (constants at the head of the function, `PlayerEntity.cs` 547-552). The loop stops at the first spawn (line 491, break), so the rest of the elapsed minutes are skipped.

Derived numbers (my arithmetic, not a donor value): one window per 144 game minutes is 2.4 game hours. With one roll per minute in a 12-minute window, the chance of at least one spawn is about 29 percent in a day window (1 - (35/36)^12) and about 40 percent in a night window (1 - (23/24)^12). At the default time scale of 12 (see D), that is one window per 12 real minutes. This is a design read of the code; I did not run it.

**D. Time scale and milestones (`WorldTime.cs`).** Each real second advances the clock by 12 game seconds (line 67; the default `TimeScale = 12f` is at line 32). At that scale one game day is 7200 real seconds, two real hours. Dawn, dusk, midday, midnight, lights on and lights off each fire when the hour equals the milestone exactly (line 86). New hour, day, month and year fire on change (lines 122-140). Travel, jail and some other actions add time in one jump (for example `DaggerfallTravelPopUp.cs` 344), which means milestones in the jump are skipped (see defect 1).

**E. Faction drift and regional news (`PlayerEntity.cs` 455-1760).** On each game day change, regional prices update (`PlayerEntity.cs` 440-450 region). Every 7 game days (10080 minutes), faction power moves plus or minus 1, decided by a percent roll weighted by allies (sum of their power over 10), enemies (sum over 10), parent (power over 10) and a ruler bonus (line 1669). A child faction stronger than this one pushes this faction up one. Every 38 days (54720 minutes, line 469) regional conditions and rivalries are updated: alliances can end (percent chance from power, around line 1700), rivalries can end, and new alliances are drawn from a random pool. Each change emits a rumour line by id (for example the id 1402 row, `Internal_RSC.csv` line 3089, for ended alliances; 1403 for ended rivalries). The 84-day racial-override check sits a few lines below line 470. Every 112 days reputations normalise. The donor comment just above line 469 says classic ran the conditions update only every 266 days, and believes it should have been 38. The code uses 38.

**F. Encounter pick (`RandomEncounters.ChooseRandomEnemy`, `RandomEncounters.cs` 1334-1526).** The table index comes from the place: dungeon type (0-18), underwater (19), wilderness by climate, day or night and in-location (20-37), or a building type (39-44). Roll d100 (line 1471). A roll of 81-95 picks uniformly from index 0 to player level plus 1; a roll of 96-100 picks from 0 to level plus 2 at level 5 or below, and from the whole list above that; a roll of 1-80 picks from level minus 3 to level plus 3 (line 1477 onward). If the low end is below zero the pick becomes 0-5. If the high end is above 19 it becomes 14-19. A list shorter than 20 entries uses its last six entries (`RandomEncounters.cs` 1517-1523). So a level 12 player meets the middle of each list, and a level 3 player meets the bottom of it. The pick itself uses `UnityEngine.Random` with no seed (line 1526).

**Data fields (designer-tunable).**

| name | unit | donor_value_or_null |
|---|---|---|
| world_time_scale | real seconds to game seconds | 12 |
| quest_tick_hz | ticks per second | 10 |
| clock_random_min | seconds | 60 (1 minute) |
| clock_random_max | seconds | 604800 (7 days) |
| clock_return_trip_mult | multiplier | 2.5 |
| clock_min_travel_day_floor | seconds | 86400 |
| foe_interval_min | game minutes | script value (no default) |
| foe_spawn_pct | percent per slot | script value |
| encounter_window_min | game minutes | 12 |
| encounter_window_every_min | game minutes | 144 |
| roll_wild_day_1_in | integer | 36 |
| roll_wild_night_1_in | integer | 24 |
| roll_location_night_1_in | integer | 24 |
| roll_dungeon_rest_alert_1_in | integer | 36 |
| min_dist_dungeon_tiles | tiles | 8 |
| min_dist_location_tiles | tiles | 10 |
| min_dist_wild_tiles | tiles | 10 |
| band_low_offset | list index | -3 |
| band_high_offset | list index | 3 |
| band_wide_roll_threshold | d100 | 80 (wide at 81-95, all at 96-100) |
| faction_power_period_days | days | 7 |
| faction_conditions_period_days | days | 38 |
| racial_override_check_days | days | 84 |
| reputation_normalise_days | days | 112 |

## 4. For Frankendom

- 700 zones as data: the encounter ladders are data tables, one per zone type (45 indices in the donor: 19 dungeon types, underwater, 18 wilderness, one unused, 6 building types). Keep the level band, but store the level on each entry rather than the list position. Change: 20-entry lists are not needed.
- Many-vs-one: the interval spawner is a wave of foes per slot (the donor's wave size is a foe-spawn count, not read in full). Cap the count per event at 3 (MAX_ATTACKERS). Keep the per-slot percent roll, one event at a time, and a count or infinite field.
- Server-verified: the quest clock, the interval slot, the 12-minute window and the faction drift all become server events on the server clock. The client only presents the spawn and the rumour line. Change: no catch-up loop over minutes on the server; the server steps by boundary (see defect 5).
- One ledger: a quest clock is a ledger row with a due time, not a client timer.
- Rumour as presentation: each world event emits a short line with names filled from its own data. Keep the placeholders idea, write our own lines, do not copy donor text.
- Target: spawn and clock logic in `origins/server/world-spawns.ts` (row 23, zone population: spawn caps, respawn, despawn with a grace timer). The per-tick NPC budget sits on the server tick sub-line (row 18 / post-K item 3). The encounter-band pick is engine logic, and the repo is not on this box, so no `src/fight/` module is named here.

## 5. Five-minute look test on a phone

Walk twelve real minutes of night wilderness at the donor default time scale. Twelve real minutes is 2.4 game hours, which holds exactly one 12-minute roll window. Count encounters. The rule predicts a spawn about 4 times in 10 for one window (about 40 percent). Then walk twelve real minutes at dawn into day: about 3 times in 10. Dom judges whether the night feels like more risk than the day, and whether the first spawn lands far enough away to read on the phone. Second check: open a quest with a three-day clock, travel to the place, and watch the clock change in game days.

## 6. Licence and IP

Code is MIT. Recreate as a clearly distinct original: keep the mechanism (interval slots, level bands, time-of-day rolls, faction drift), change the names, the numbers where they are not needed, and the rumour wording. Content (quest scripts, text, tables, rumour strings) is class C: category-level inspiration only, for example "a rumour line per world event", never the donor's lines. The donor's own comment marks the clock range as unknown (`Clock.cs` 193). No legal conclusions.

## 7. Gaps and defects

Defects (keep the idea, fix the defect):

1. World-time milestones are equality checks, so a jump over a milestone skips it (`WorldTime.cs` 86 and the same pattern for the other milestones). Fix: fire each milestone crossed in (last, now].
2. Faction pool draw removes the wrong entry after the first rejected draw: `keys2.Remove(keys[randomKeyIndex]);` (`PlayerEntity.cs` 1744 and 1877) removes by value from the other list. Fix: `keys2.RemoveAt(randomKeyIndex)` with the same index as the draw. At first the two lists match, so the bug only shows after a rejected draw.
3. Daily window cannot wrap past midnight: `currentDailySeconds >= min && <= max` (`DailyFrom.cs` 69) is never true when min is after max. Fix: when max is before min, use `cur >= min || cur <= max`.
4. Encounter window: `(Minutes / 12) % 12 == 0` gives a 12-minute window in every 144 minutes (`PlayerEntity.cs` 559). If the intent was "every 12 minutes", the modulo is wrong. Not confirmed against classic. Fix: name the window as data (`window_min`, `window_every_min`) and set the intent.
5. Catch-up loops are O(elapsed minutes): the faction loop walks every minute (`PlayerEntity.cs` 455), and the encounter loop walks every minute (line 486). A spawn `break` also skips the remaining minutes' guard roll in the same loop (lines 486-491). Fix: step by boundary crossings, and run the spawn pass separately from the guard pass.
6. Unseeded random: encounter choice (`RandomEncounters.cs` 1523, 1526), encounter rolls (`FormulaHelper.cs` 1784), the clock start (`Clock.cs` 392) and the first slot phase (`CreateFoe.cs` 115) use `UnityEngine.Random` with no seed. Not reproducible, so not server-verifiable. Fix: a seeded stream per zone and per event.
7. Clock random range is a TODO in the donor (`Clock.cs` 193). Fix: make min and max data fields with a stated default.

Not read: `Clock.cs` 92-185 (constructor and parse of the resource line); `QuestMachine.cs` beyond the tick and quest start paths; `PlayerEntity.cs` 1760-1880 (only the lines around 1744 and 1877 by grep); the body of each encounter table (45 labels found by grep; entries read for indices 0, 1, 2 and 44; the file header says each classic list has 20 entries, which I checked on those four); `FACTION` table and the faction loader (data pack); `GameObjectHelper.CreateFoeSpawner` (argument meaning inferred from call sites); the prefab that sets `WorldTime.TimeScale` (code default read); rest window timing (`DaggerfallRestWindow.cs` 378); guild and rumour mill text selection beyond the ids above; DOS data pack.

Where the donor has it (the required extras):
- Idle or ambient behaviour: not read in this topic (the wandering population is in `PopulationManager.cs` and `CityNavigation.cs`, grep only).
- Death and respawn presentation: not read. Quest tombstone is one week (`QuestMachine.cs` 497).
- Loot reveal ceremony: not read.
- Walk density: the outdoor encounter rate above, one enemy per encounter.
- Readability at 375 wide: one enemy per random encounter, minimum 8 to 10 tiles away. Max enemies per frame: not measured.

Reuse tag: keep-idea (interval slots with a percent roll; level-banded ladders; time-of-day rolls; faction drift; news as rumour lines). Fix the seven defects in our copy. No donor code or text reused.
Brief rule served: the world runs on a clock the player can see as a countdown, news reaches the player as talk, and every event is a server row.
