# openmw (weather-time-light, depth full)

Donor: openmw, root /mnt/frankendom-donors/openmw. Licence: GNU GPL v3 (LICENSE). Clean-room: shape only. No code, constants or colour codes are copied, and every donor value is withheld (null) in the JSON. Half read: client engine (apps/openmw/mwworld/weather.cpp, apps/openmw/mwrender/sky.cpp) and the shipped fallback table (files/openmw.cfg). No server half exists (single-player engine). The region weather roll runs in-process. Region chance records (components/esm3/loadregn.cpp) and the game's own weather records were not in the box and were not read.

Checked: read in full the TimeOfDay interpolator (weather.cpp 40-134), region weather choice (306-361), WeatherManager::update (831-980), timers and transitions (1163-1296), per-weather result and blend (1298-1400), thunder (232-305); sky.cpp lines 428, 548, 793 and the rain setup at 605-640 by grep. Confidence high on weather state, transitions and thunder. fogmanager.cpp and most of sky.cpp were not read. Receipts: 64 of 64 pass (receipts.tsv, shared with OpenGothic).

Best transferable idea: a region-rolled weather that changes on a timer and crossfades in real seconds, carrying any overflow time into the queued change, so a fast sequence of changes never snaps.

## 1. What the player sees and feels
Weather changes on a timer (fallback 20 game hours). The choice is rolled per region from its chance table, so crossing into a new region can start a new weather. The change is a real-time crossfade. Each weather sets its own speed per real second; the clear weather's value is 0.015, so moving into clear takes about 67 real seconds. Sky, fog and ambient colours move through four keys (sunrise, day, sunset, night), each with pre and post bands, so dusk is a long soft blend. In a storm, lightning strikes at random in real time. Each flash tints fog, ambient and sun together, and a thunder sound plays with it. Rain is emitted into a box of set diameter and height, with the count set by a per-weather cap. Clouds drift at a speed set per weather, and the cloud texture crossfades to the next weather's texture.

## 2. Why it works, or is striking
- Readable at 375 wide: colour keys with narrow pre and post bands never snap, so the state reads by colour and by the rain count.
- One signature behaviour: flashes add up across strikes (weather.cpp:284). Back-to-back strikes get brighter and last longer, then decay at a per-weather rate.
- One signature sound: thunder has four distance bins. A near strike is brighter (flash 1.0, 0.75, 0.5, 0.25 across the bins, from 1 minus distance times 0.25, weather.cpp:282-284) and louder; a far one is faint.
- Could be made ours at 20-30 percent resemblance: a region-rolled weather, a real-time crossfade with queue and carry, and a four-key colour blend.

## 3. The rule behind it
- Timer: each update subtracts elapsed game time from the interval (weather.cpp:1165). On expiry every region forgets its weather (1173) and the interval is added back, so the phase is kept (1176).
- Region choice: a roll from 1 to 100 walks the region's cumulative chance table (weather.cpp:348-361). If a region's chance for its current weather drops to zero, it re-rolls (311).
- Crossfade: the factor falls by elapsed real seconds times the incoming weather's transition speed (1202-1203, comment at 222 says real time, not game time). If a change is requested mid-crossfade, it is queued. When the factor passes zero, the overflow time is turned back into a factor for the queued change (1215-1216), and the new crossfade starts at factor 1 (1264).
- Colour blend: each colour has four keys. Between keys the blend is linear over the band, with factor = advance / duration * 2 (weather.cpp:88, 97, 117, 126). The bands come from the pre and post times per colour group (openmw.cfg:238-253).
- Sun: the orbit is linear within day and within night separately (weather.cpp:912), and the sun direction uses a fixed arc vector (921). Glare fades as a triangle that peaks at the midpoint of the day (933).
- Thunder: strike chance per frame is frequency times 10 per minute, scaled by how far the transition is past the threshold (271-272). Flash decays at a per-weather decrement per second (261). Flash brightness is added across strikes (284).
- Rain: emission rate is max drops over entrance speed times 20 per second (sky.cpp:428). Cloud scroll is duration times cloud speed over 400 (sky.cpp:548). Cloud crossfade is clamped to 0 to 1 (sky.cpp:793).

Defects found, with the fix (idea kept):
- Flash is hard-cut to zero whenever the transition is below threshold (weather.cpp:250). Fix: keep running the decrement every frame so the flash decays to zero instead of cutting.
- Region chances that do not sum to 100 silently pick the first weather in store order (weather.cpp:361). Fix: check and renormalise the table at load, and log a warning.
- Ashstorm and blight transition speeds are named in the validator (components/fallback/validate.cpp:41) but their transition lines are not in files/openmw.cfg (8 types have one). Fix: state the defaults explicitly in our data.
- Rain emission divides by entrance speed (sky.cpp:428, 619). A zero entrance speed would divide by zero. Fix: clamp to a minimum.

Data fields (designer-tunable; donor values withheld, GPL):
| name | unit | donor_value_or_null |
|---|---|---|
| weather_change_interval | game hours | null |
| sunrise_key, sunset_key | hh | null |
| sunrise and sunset band durations | hours | null |
| transition_speed (per weather) | 1 per real second | null |
| region_chance_table | percent, must sum to 100 | null |
| thunder_frequency | strikes per minute at 1.0 | null |
| thunder_threshold | fraction of transition | null |
| flash_decrement | brightness per second | null |
| max_raindrops (per weather) | count | null |
| rain_entrance_speed | per second | null |
| cloud_speed | scroll per 400 per second | null |

## 4. For Frankendom
- Server rolls weather per region with the seeded PRNG and emits one event per change (start time, weather id, transition speed). The client crossfades. This matches our rule that the server verifies and the client presents. The engine itself rolls in-process, so the server roll is the new piece.
- Zones as data: a weather preset is a row (chance table, four colour keys, transition speed, rain cap, thunder settings). Many zones can share the same few presets. This is the same reuse shape as the 100 Pit characters across zones.
- Many-vs-one: flashes and rain must not hurt threat readability. Cap the flash brightness and keep attacker outlines out of the fog. Keep the rain particle count under a per-frame budget on a phone.
- Keep: region roll, real-time crossfade, queue and carry overflow, four-key blend with bands, additive flash with distance bins, timer that keeps phase.
- Change: renormalise chances at load; keep the flash decay running; state the Ashstorm and blight defaults; keep flash separate from hit impact (parity row 10) so a thunder flash never lands on a hitstop frame.
- Parity row 16 (colour grade/quality) for the sky, fog and tint. Thunder sound belongs with row 12 (combat sound cues) only if it is a cue; otherwise keep it ambient.

## 5. The 5-minute look test
Publish a style flag on the existing arena scene (look-test skill, /preview/, no release rows). Three presets: clear noon; overcast dusk with a slow crossfade; storm with a flash about every 10 seconds. On a 375-wide phone check that the hero and a three-attacker ring stay readable through a flash, that a crossfade does not pop, and that the rain count is comfortable. Compare dusk with four keys against a single key.

## 6. Licence and IP
GNU GPL v3 (LICENSE, version 3, 29 June 2007). Shape only: each mechanism is described in our own words. No code, numbers or colour codes are copied, and the JSON withholds donor values. No legal conclusion.

## 7. Gaps
- Not read: components/esm3/loadregn.cpp and the region records; components/esm3/weatherstate.cpp; apps/openmw/mwrender/fogmanager.cpp (95 lines); most of sky.cpp (only lines 428, 548, 605-640, 793 and the rain setup).
- Not read in full: the Weather constructor (weather.cpp 135-218, fallback names seen by grep only) and the moon model (380-470, named only).
- Game data (the Morrowind weather and region records) is not in the box; the 287 weather fallback lines in files/openmw.cfg are the only numbers read, and they are not copied.
- Server half: none (single-player).
- Not read: death and respawn, loot reveal, walk density, boss staging.

Decision: adapt (idea), with the four defects fixed in the design above.

No code sketch: this template asks for data fields, not code, so nothing was typechecked.

Tags: weather-state, day-night, duration-rule, flash, stinger, particle-burst, mood-preset, new:region-roll, new:transition-carry, new:sky-keyframes
