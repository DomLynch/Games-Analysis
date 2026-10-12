# afritz1-OpenTESArena (weather-time-light, feel, cell WL002)

Donor: `/mnt/frankendom-donors/afritz1-OpenTESArena` (code in `OpenTESArena/src`, data in `data/`) | Licence: MIT (`LICENSE.txt` line 1: "The MIT License (MIT)", copyright 2016-2026 The OpenTESArena Developers) | C++ | Decision: adapt (idea); shape only for the EXE-derived tables, which are not in the box

Checked: read in full `src/Weather/ArenaWeatherUtils.cpp` (127 lines), `src/Weather/ArenaWeatherUtils.h` (82), `src/Weather/WeatherDefinition.cpp` (111), `src/Weather/WeatherInstance.cpp` (420), `src/Weather/WeatherInstance.h` (99), `src/Time/ArenaClockUtils.cpp` and `.h`, `src/Time/ClockLibrary.cpp` (74), `data/Clocks.txt` (25 lines, 18 entries). Read by key range: `src/Game/GameState.cpp` (tickGameClock 1240-1280, getWeatherForLocation 640-656, updateWeatherList 737-778, isFogActive 686-720, weather swap 1090-1093), `src/World/MapLogic.cpp` (170-220), `src/World/SceneManager.cpp` (95-190, sky gradient and window colour), `src/Rendering/RenderSkyManager.cpp` (786-815, storm flash), `src/Sky/SkyInstance.cpp` (456-480, lightning), `src/Rendering/RenderWeatherManager.cpp` (430-435, 590-625), `src/Time/Clock.cpp`, `src/Time/Date.cpp`, `src/Time/ArenaDateUtils.h`, `src/Rendering/ArenaRenderUtils.h` (screen and frame constants), `src/Math/Random.cpp` (default seed), `src/Assets/ExeData.h` (table sizes). Not read: `RenderWeatherManager.cpp` and `RenderSkyManager.cpp` in full, sun and moon placement in `Sky/SkyGeneration.cpp` and `SkyInstance.cpp`, `Audio/MusicUtils.cpp` beyond the call, the EXE binary (not in the box). Candidate files checked for the weather topic: 8 (ArenaWeatherUtils, WeatherDefinition, WeatherInstance, GameState, MapLogic, SceneManager, RenderSkyManager, SkyInstance). Confidence: high for the thunderstorm, rain, snow and clock constants; high for the weather roll shape; medium for the renderer (sampled, not read in full).

Best transferable idea: a named-clock table (18 times in one text file) drives lamps, ambient, music and storms, and a thunder timer whose minimum gap equals the flash length keeps flashes from overlapping.

## 1. What the player sees and feels

- The view is a 320x200 original whose particle speeds are tuned to 25 frames per second (`FRAMES_PER_SECOND`), so the rain and snow read as a stylised layer over the scene: 60 streaks in three speeds, slanting left, and 100 flakes that drift left and right in three speeds.
- In a storm the sky flashes on an irregular timer: a flash lasts 0.35 seconds, a bolt is drawn for the first 0.2 seconds, and a thunder clap plays on the strike. Gaps between strikes run from 0.35 to 5.35 seconds, so flashes never overlap.
- The day is a palette that slides. The sky gradient index moves from dawn (6:00) to dusk (18:00) and clamps to its end values at night, so the sky changes by changing an index, not by drawing a new sky.
- Dawn and dusk take 15 game minutes: the windows warm up from 06:00 to 06:15 and dim from 17:45 to 18:00, and the street lamps switch on at 17:45 and off at 06:15, the same brackets as the ambient change.
- Fog appears only in daylight (06:15 to 17:45) and only in overcast or snow weather, so night reads clean.

## 2. Why it works / is striking

- Readable at 375 wide: rain and snow are three speed tiers, so the speed difference is the depth cue. The tiers, not the count, carry the depth.
- One signature behaviour: a thunder timer with a fixed minimum gap (the flash length) plus a random extra of 0 to 5 seconds. One state machine, one rule, no overlap bug to guard.
- One signature sound: the thunder clap on the strike, with no delay. The clip name is THUNDER.VOC (a name only, not copied).
- 20 to 30 percent resemblance: the named-clock file, the thunder timer, the three-tier particles and the slide-the-palette sky. All four can be ours with our own numbers.
- Seed discipline built in: heavy fog is a pure function of the day number (`(currentDay & 8) != 0`), so the same day always gives the same fog with no random call at all.

## 3. The rule behind it

Clock and calendar:
- One real second is 13 game seconds (`ArenaClockUtils.h` line 7-8: a day of 86400 game seconds over 6646.15 real seconds). Camping runs at 600 times (`CampingTimeScale`, GameState.cpp 1246).
- The month has 30 days and there are 12 months (`ArenaDateUtils.h` line 13). Season: `(month + 10) % 12 / 3`, so March is spring (`Date.cpp` line 77).
- Crossing an hour boundary calls `updateWeatherList` (GameState.cpp 1271 `if (newHour != prevHour)`, 1275 call). So the 36 world-map quadrant weathers (`GameState.h` line 180, WORLD_MAP_WEATHER_QUADRANT_COUNT = 36) re-roll every game hour. A day is counted when the clock wraps (GameState.cpp 1255).

Weather roll (quadrant to map):
- Each quadrant takes a variant from a weighted pick: variant 2 at 40 percent, 1 at 20, 3 at 20, 0 at 10, 4 at 10 (comment at GameState.cpp line 750; code 748-771).
- The weather is `weatherTable[climate x 20 + season x 5 + variant]` (GameState.cpp 775-778). The table is 140 bytes (`ExeData.h` line 441); 140 / 20 gives 7 climate rows of 4 seasons x 5 variants (inferred from the sizes, not checked against the binary). The values come from the original game's executable, which is not in the box, so they are not read.
- Desert cities: snow is replaced by rain (`ArenaWeatherUtils.cpp` line 70 comment; applied in `GameState.cpp` 654 for city locations only).
- When the player enters a location, that weather is sampled once: `initFromClassic` (MapLogic.cpp 217). The map's weather then stays fixed until the next map. Standing in a city does not re-roll the sky.

Per-map details:
- Overcast or snow fog is heavy when the zero-based day has bit 3 set (`ArenaWeatherUtils.cpp` line 54), so the fog pattern is a fixed 8-on, 8-off rhythm across the month.
- A rain map is a thunderstorm with probability 24000/65536, about 36.6 percent (`ArenaWeatherUtils.cpp` line 59).
- Storm active from 18:01 to 06:00 (`Clocks.txt` lines 24-25; `WeatherInstance.cpp` line 29 wrap logic).
- Storm timer: flash 0.35 s, bolt 0.20 s, next strike after 0.35 + uniform(0, 5) s (`WeatherInstance.cpp` lines 34, 111, 113). The timer only advances while the storm is active (line 109-111), and the renderer checks `active` before drawing a flash (`RenderSkyManager.cpp` 794-796).

Particle tiers (screen 320x200, 25 fps):
- Rain: 60 drops, 20 fast, 20 medium, 20 slow. Vertical speed 24, 20 and 16 px per frame, which is 600, 500 and 400 px per second. Horizontal speed is minus half the vertical (12, 10, 8 px per frame). Drops respawn on the top or right edge, with the top-edge share equal to aspect / (aspect + 1) (`WeatherInstance.cpp` line 159).
- Snow: 100 flakes, 20 fast, 30 medium, 50 slow. Vertical 8, 6 and 4 px per frame (200, 150, 100 px per second). Horizontal drift is 2 px per frame x 0.5 correction (`WeatherInstance.cpp` line 280). A flake's direction flips with probability 15000/65536 (about 22.9 percent) each 1/25 of a second (lines 263, 268). A recycled flake keeps the overshoot: `yPercent = -(yPercent - 1)` (line 253).

Sky gradient and window colour:
- The gradient index is `(dayPercent - 6am) / (6pm - 6am)` scaled by palette length and clamped (`SceneManager.cpp` line 105). Night clamps to the first or last index.
- Window colour during sunrise and sunset is a ramp over the 15-minute bracket (`SceneManager.cpp` line 181), from a 3-byte-per-entry table in the EXE (not read).

Data fields (designer-tunable; donor value shown only where the donor value is in the repo):

| name | unit | donor_value |
|---|---|---|
| clock_game_s_per_real_s | game s per real s | 13 (ArenaClockUtils.h line 8) |
| camp_time_scale | multiplier | 600 (ArenaClockUtils.h line 12) |
| named_clock_entries | count | 18 (data/Clocks.txt) |
| ambient_brighten_start / end | 24h clock | 06:00 / 06:15 (Clocks.txt lines 13-14) |
| ambient_dim_start / end | 24h clock | 17:45 / 18:00 (Clocks.txt lines 15-16) |
| lamp_on / lamp_off | 24h clock | 17:45 / 06:15 (Clocks.txt lines 18-19) |
| music_to_day / to_night | 24h clock | 06:19 / 17:45 (Clocks.txt lines 21-22) |
| storm_start / end | 24h clock | 18:01 / 06:00 (Clocks.txt lines 24-25) |
| storm_flash_s | seconds | 0.35 (ArenaWeatherUtils.h line 33) |
| storm_bolt_s | seconds | 0.20 (ArenaWeatherUtils.h line 34) |
| storm_gap_extra_s | seconds, uniform | 0 to 5 (WeatherInstance.cpp line 34) |
| storm_share_of_rain | probability | 24000/65536 (about 0.366, ArenaWeatherUtils.cpp line 59) |
| snow_flip_probability | per check | 15000/65536 (about 0.229, line 64) |
| snow_flip_check_s | seconds | 1/25 (ArenaWeatherUtils.h line 49) |
| rain_count_tiers | count | 20 / 20 / 20 (ArenaWeatherUtils.h lines 20-22) |
| rain_px_per_frame_y | px per frame | 24 / 20 / 16 (ArenaWeatherUtils.h line 25 and siblings) |
| snow_count_tiers | count | 20 / 30 / 50 (ArenaWeatherUtils.h lines 38-40) |
| snow_px_per_frame_y | px per frame | 8 / 6 / 4 (ArenaWeatherUtils.h lines 43-45) |
| snow_drift_px_per_frame | px per frame | 2 x 0.5 (ArenaWeatherUtils.h line 47; WeatherInstance.cpp line 280) |
| fog_distance_clear / overcast / rain / snow / snow_overcast | Unity-like units | 100 / 30 / 50 / 25 / 20 (ArenaWeatherUtils.cpp lines 20-27; comment line 17 says arbitrary) |
| variant_weights | percent | 40 / 20 / 20 / 10 / 10 for variants 2 / 1 / 3 / 0 / 4 (GameState.cpp line 750) |
| frame_rate | fps | 25 (Rendering/ArenaRenderUtils.h line 57) |
| screen | px | 320 x 200 (ArenaRenderUtils.h lines 41-42) |

## 4. For Frankendom

- 700 zones as data: keep the named-clock idea as a zone-independent file (18 named times, one line each). Lamp, music, ambient and storm all read the same file, so the world's timing is data, not code.
- Server verified: the weather roll for a region is a server seed of (region, game hour), set when the player enters the zone. Do not re-roll while standing in the zone, because the donor freezes weather at map entry (MapLogic.cpp 217). The client only presents the result.
- Seed discipline: the heavy-fog bit is a pure function of the day. Copy that pattern for any visual that must match across viewers.
- The one unseeded spot in the donor: the wild-map roll creates `Random random; // @todo: get from Game` (GameState.cpp line 432) and seeds it from the clock (`Random.cpp` line 27 uses microseconds since epoch). The thunderstorm flag from that roll is therefore not reproducible. For us: take the flag from the server seed.
- Many-vs-one: the storm flash is a presentation event. Do not fire a flash during an enemy's windup telegraph; gate the flash so the three-attacker telegraph stays readable (row 16 colour grade/quality; row 12 combat sound cues for the thunder clap).
- Keep: the thunder timer with the flash-length minimum gap; the three particle speed tiers; the slide-the-palette sky; the lamp and ambient bracket times.
- Change:
  - Fog distances are placeholders (`ArenaWeatherUtils.cpp` line 17 comment says they are arbitrary). Tune them at 375 wide against the fight camera.
  - The desert snow filter is applied for city locations only (GameState.cpp 650-654). Open question: whether a wild desert location can get snow from the table. Not checked.
  - Rain and snow particle counts are fixed per tier. On a phone, check that 60 and 100 sprites fit the frame budget.

## 5. A 5-minute look test Dom can judge on his phone

- Build: a 375-wide preview of one enemy and one player on a flat ground, with a clock slider, a rain toggle at 60 drops in three tiers, and a storm toggle that flashes the background for 0.35 seconds at random 0.35-5.35 second gaps.
- Compare: (a) the same scene with the donor's three-tier rain against a single-tier rain at the same count; (b) the palette-slide sky against a sun-arc sky at the same time of day.
- Dom judges: does the flash hide the enemy's windup; does the three-tier rain read as depth; does the palette-slide sky tell the time in one second.
- Publish to `/preview/` as a style flag only (look-test skill), with no release rows and no lock.
- Target file: `src/fight/<module>.ts` (proposed `src/fight/weather-light.ts`, not checked against the repo, Lead to confirm). Parity row: 16 (colour grade/quality).

## 6. Licence / IP

- Code: MIT (`LICENSE.txt`). Code may be adapted with the notice kept.
- `data/Clocks.txt` is in the MIT repo. The file does not say where its values came from; treat it as the donor's data and do not assume it is original work.
- The EXE-derived tables (the 140-byte weather table, the window twilight colours, the thunderstorm flash colours and the palettes) come from the original game's executable. They are not in the box, were not read, and must not be copied. Use shape only.
- Sound clip names (THUNDER.VOC) are names only.

## 7. Gaps

- Half read: client code (weather, sky, time, lighting) and one data file (`data/Clocks.txt`). The EXE tables are not in the box, so the numbers that depend on them are not read and are reported as unknown.
- Not read: `RenderWeatherManager.cpp` in full (711 lines), `RenderSkyManager.cpp` in full (1093), sun and moon placement (`Sky/SkyGeneration.cpp`, `SkyInstance.cpp`), `Audio/MusicUtils.cpp` beyond the call, `ExeData.cpp` table loader.
- Not run: no playback, so the storm feel and the fog distances are judged from numbers only.
- Also reported where seen:
  - Idle and ambient: rain, snow and storm tiers only; no creature idles in this topic.
  - Death/respawn presentation, loot reveal, walk density: not in this topic, not read.
  - Readability at 375: fog distances (20 to 100 units) and the 320x200 frame are the closest reference; the frame is 4:3 presented, not 375 wide.
