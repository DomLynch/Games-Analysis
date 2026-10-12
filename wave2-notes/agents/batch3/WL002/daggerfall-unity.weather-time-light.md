# daggerfall-unity (weather-time-light, feel, cell WL002)

Donor: `/mnt/frankendom-donors/daggerfall-unity` | Licence: MIT (`LICENSE` line 3: "Copyright (c) 2009-2023 Daggerfall Workshop"; per-file headers say MIT too) | C# (Unity) | Decision: adapt (idea), with the defects below fixed in the sketch

Checked: read in full `Assets/Scripts/Game/WeatherManager.cs` (577 lines), `Assets/Scripts/Game/Weather/Weather.cs` (237), `Assets/Scripts/Internal/WorldTime.cs` (243), `Assets/Scripts/Game/SunlightManager.cs` (200), `Assets/Scripts/Game/PlayerAmbientLight.cs` (127), `Assets/Scripts/Game/PlayerWeather.cs` (88), `Assets/Scripts/Game/Questing/Actions/Weather.cs` (110), and the data table `Assets/Resources/WeatherTable.json` (189 lines). Read by key range: `Utility/DaggerfallDateTime.cs` (time constants, IsDay/IsNight, RaiseTime, season mapping, ToSeconds/FromSeconds), `Internal/DaggerfallSky.cs` (sky frame and mirror logic), `Game/AmbientEffectsPlayer.cs` (ambient one-shots and lightning), `Utility/AssetInjection/Components/DayNight.cs`, `Utility/ClimateSwaps.cs` (season texture offsets), `Game/Entities/PlayerEntity.cs` (daily re-roll, line 439-447). Data: `Prefabs/World/SkyRig.prefab` and `SunlightRig.prefab` (curve keys), `Prefabs/DaggerfallUnity.prefab` (WorldTime block), `Scenes/DaggerfallUnityGame.unity` (ambient settings), string row `seasonNames` in `StreamingAssets/Text/Master Localization CSV Files/Internal_Strings.csv`. The time and light code was found by grep -rn for weather, daylight, sunrise, TimeOfDay and DateTime across Assets/Scripts, and the matches were then read. Confidence: high for the weather odds, the sunlight/ambient chain and the clock; medium for the Unity curve wrap behaviour (not run).

Best transferable idea: one clock-driven scalar drives sun pitch, sun intensity, shadow strength and ambient colour, and weather is a per-climate table rolled once per in-game day that every zone of that climate shares.

## 1. What the player sees and feels

- On a 375-wide phone the day is a slow sun. The clock runs at 12 game seconds per real second, so one game day is 2 real hours and daylight (06:00 to 18:00 game time) is about one real hour.
- The sun is a directional light whose pitch runs from horizon (dawn) to overhead (noon) to horizon (dusk), and whose brightness follows a five-key curve that is 0 at dawn, 0.9 at noon and 0 at dusk. Night switches the light off at the hour boundary, and the curve is already 0 at both ends, so the switch is invisible.
- Weather is a multiplier on that same light and on the ambient colour: overcast x0.65, rain x0.45, storm x0.25, snow x0.45. Fog is exponential with density 0.05 in heavy fog, which makes about half of everything beyond 14 units (Unity units, metres not checked) vanish, so an enemy pack at range becomes a shape, not a read.
- Ambient sounds fire every 4 to 35 seconds in code (5 to 25 in the scene), chosen by preset: rain, storm, sunny-day birds, clear-night crickets. The preset is picked each frame from the weather and the clock (WeatherManager.cs `SetAmbientEffects`).

## 2. Why it works / is striking

- Readable at 375 wide: one number (sun scale) moves light, shadow and ambient together, so the screen reads as one change, not five. Night is not dark-on-dark because the ambient is lerped from a night colour (0.25) to a noon colour (0.9), not set to black.
- One signature behaviour: a weather roll per climate per season from a 24-row table (6 climate groups x 4 seasons, each row summing to 100 percent). The same roll applies to every zone in that climate, so a region has one sky.
- One signature sound: the rain and storm presets switch the ambient bed, while the one-shots keep firing on a random timer.
- 20 to 30 percent resemblance is enough: a region weather table plus a sun/ambient scalar gives the same feel with our own numbers.
- Criteria: readable silhouette at 375 is partial (fog gate, see section 4); signature behaviour yes (region roll); signature sound yes (preset beds); could be ours at 20-30 percent yes.

## 3. The rule behind it

Order of operations for light (`WeatherManager.SetSunlightScale`, WeatherManager.cs 312-349): start from scale 1.0. If winter, set the base to 0.65 with shadow 0.8 (line 316). Then one branch wins, in this order: rain and not storm (0.45 / 0.4), storm (0.25 / 0.4), snow (0.45 / 0.25), overcast (0.65 / 0.6) (lines 323-343). The weather branch overrides winter completely. Then shadow strength is multiplied by exp(-50 x outdoor fog density) (line 344), so heavy fog kills shadows. The result is written to `SunlightManager.ScaleFactor` (line 349) and the sunlight manager multiplies its curve value by that factor (SunlightManager.cs 119-125). `PlayerAmbientLight.CalcDaytimeAmbientLight` then lerps the ambient colour between the night and noon colours by the same daylight scale (PlayerAmbientLight.cs 124). One scalar, three outputs.

Roll order for weather (data to code):
- Season comes from the month, not the day: Dec, Jan, Feb = winter; Mar-May = spring; Jun-Aug = summer; Sep-Nov = fall (`DaggerfallDateTime.cs` 583-605). The source comment says Daggerfall rolls seasons part way through the last month; this code does not model that.
- When the in-game date changes (PlayerEntity.cs 439-447), the game re-rolls six climate groups from the table (`WeatherManager.SetClimateWeathers`, lines 419-427), storing one weather per group. The player's weather then comes from the group that matches their climate (`SetWeatherFromWeatherClimateArray`).
- A roll is a cumulative pick over 0-100 (`Weather.cs` 120-125).
- The periodic 30-second re-roll is commented out (WeatherManager.cs 153 `//PollWeatherChanges();`, poll timer at line 89). Weather changes only on date change, first load and respawn in a new climate. This is a real design choice, not a bug.

Data fields (designer-tunable; donor value given because the repo is MIT):

| name | unit | donor_value |
|---|---|---|
| weather_odds[climate][season][weather] | percent, rows sum to 100 | e.g. Desert/Summer: Sunny 85, Cloudy 15 (`Resources/WeatherTable.json` lines 16-19) |
| table_rows | count | 24 season rows; 127 non-zero cells (counted with python on the VPS, nothing written) |
| sun_scale_overcast / rain / storm / snow / winter | 0-1 | 0.65 / 0.45 / 0.25 / 0.45 / 0.65 (WeatherManager.cs 38-46) |
| shadow_strength_overcast / rain / storm / snow / winter | 0-1 | 0.6 / 0.4 / 0.4 / 0.25 / 0.8 (WeatherManager.cs 49-57) |
| fog_density_rain / snow / heavy | 1/unit (exponential) | 0.003 / 0.005 / 0.05 (WeatherManager.cs 72-74) |
| fog_sunny_linear_end | Unity units | 2400 (WeatherManager.cs 70) |
| clock_time_scale | game s per real s | 12 (WorldTime.cs 32) |
| day_start_hour / day_end_hour | game hour | 6 / 18 (DaggerfallDateTime.cs 48-49) |
| city_lights_on_hour / off_hour | game hour | 17 / 8 (DaggerfallDateTime.cs 50-51) |
| sun_pitch_range | degrees | 0 to 180 across day, x rotation = 180 x time (SunlightManager.cs 115) |
| sun_intensity_keys | (time, value) | (0, 0), (0.08, 0.36), (0.5, 0.9), (0.92, 0.36), (1, 0) (`SunlightRig.prefab` LightCurve) |
| ambient_night / noon | RGB 0-1 | 0.25 grey / 0.9 grey (PlayerAmbientLight.cs 14-15) |
| dungeon_ambient_fade | seconds | 3 (PlayerAmbientLight.cs 23, step 0.1) |
| ambient_oneshot_wait | seconds | 4 to 35 in code (AmbientEffectsPlayer.cs 26-27); scene 5 to 25 |
| sky_frames | count | 64; frames 32-63 are mirrors of 0-31 (DaggerfallSky.cs 170) |
| sky_curve_keys | (time, value) | (0, 0), (0.083, 0.15), (0.166, 0.317), (0.5, 0.5), (0.834, 0.683), (0.917, 0.85), (1, 1) (`SkyRig.prefab`) |
| season_texture_offset | archive index | +1 winter, +2 rain (ClimateSwaps.cs 97; DFLocation.ClimateWeather enum) |

## 4. For Frankendom

- 700 zones as data: each zone carries a climate id. Odds live in one table (6 climate groups x 4 seasons), not in 700 zone tables. Zone data stays small.
- Server verified: the server owns the clock and the weather roll. DFU's clock is client-side (`WorldTime.Update` adds `Time.deltaTime x TimeScale` each frame, WorldTime.cs 67). For us the server sends epoch seconds and the client computes sun pitch, intensity and ambient from the same pure function. `DaggerfallDateTime.ToSeconds()` (line 430) and `FromSeconds()` (line 446) are already pure; keep them.
- Seed: roll the region weather with a seed of (climate, game day) on the server. No client random touches gameplay.
- Many-vs-one: fog must not hide three attackers at fight distance. Cap heavy fog so the nearest and farthest of three enemies stay readable at 375 wide; the look test below measures it.
- Parity row to cite: 16 (colour grade/quality) for light, fog and ambient. Row 11 (fight camera) for the fog distance.
- Keep: one sun/ambient scalar; the table-driven odds; the season and climate texture offsets; mirrored sky frames (halves the art); the ambient one-shot timer.
- Change, each with a reason from the donor code:
  - Instant weather change. `// TODO add smooth weather transitions` (WeatherManager.cs 28). Fix: lerp fog density and sun scale over about 4 s, so a storm does not cut in mid-fight.
  - Cloudy is not real. `SetWeather(Cloudy)` only sets sunny fog (`WeatherManager.cs` line 449, `// TODO make skybox cloudy`), and the quest condition for cloudy is hard-coded false (`Questing/Actions/Weather.cs` 64-65). Fix: give cloudy its own scale and make the quest check the same flag.
  - Overcast leaves the sky style alone. `SetOvercast` (224-227) only sets fog, while `ClearOvercast` sets the sky to Normal (161), so overcast nights can keep the stars. Not run in game; verify before copying the look.
  - Time seeded from the millisecond clock. `AmbientEffectsPlayer` seeds with `new System.Random(System.DateTime.Now.Millisecond)` (line 79), which gives 1000 possible seeds. Fix: seed from the zone and server tick.
  - Lightning is switched off in both scene instances (`PlayLightningEffect: 0` at scene lines 522 and 1360, and the code says lightning is deprecated, AmbientEffectsPlayer.cs 21). Do not copy the disabled path; if we want a flash, write our own presentation-only timer.
  - Light curve wrap. The curve serialises pre and post infinity as 2 (`SunlightRig.prefab`, m_PreInfinity). Night times fall outside [0,1] and rely on that wrap. Not run; clamp the time in our code and check the editor setting before reuse.

## 5. A 5-minute look test Dom can judge on his phone

- Build: a 375-wide preview of one enemy silhouette and one player silhouette on a flat ground, with a time slider from 06:00 to 18:00 (one real hour mapped to the slider) and three toggles: clear, overcast (sun x0.65), heavy fog (density 0.05).
- Compare: (a) the same scene with the donor's sun-and-ambient scalar; (b) the scene with the fog density halved. Dom judges whether the enemy in fog still reads as a threat colour at fight distance, and whether the sun pitch alone tells him the time in under one second.
- Publish to the `/preview/` folder as a style flag only (look-test skill), with no release rows and no lock.
- Target file: `src/fight/<module>.ts` (proposed name `src/fight/weather-light.ts`; not checked against the repo, Lead to confirm). Parity row: 16.

## 6. Licence / IP

- Code: MIT (`LICENSE`). Code may be adapted with the copyright notice kept. The file headers repeat MIT.
- Numbers: the table's source comment cites "DaggerFall Chronicles pg. 47" (`Game/Weather/Weather.cs` line 181). Treat the table values as design data and cite that source if we reuse the numbers.
- Art and audio are not covered by the MIT file: the sky textures, sound clips (`SoundClips`), the weather particle prefabs and `Assets/Licenses`. Not read in full; take shape only, never assets.
- Restricted content: none found in the parts read.

## 7. Gaps

- Not read: `Game/Questing/Clock.cs` (534 lines, quest timers, relevant to scheduler but not to feel), `StreamingWorld.cs`, `DaggerfallLight.cs`, post-processing fog path, `Standard Assets`, shaders, Localization beyond `seasonNames`.
- Half read: client code and data (WeatherTable.json, prefab curves, scene settings). No server half exists in this donor (single-player client), so the server half is not in the box, and I do not report it as absent.
- Not run: no in-game capture, no Unity playback, so the curve wrap and the overcast-night stars are unconfirmed.
- Also reported where seen:
  - Idle and ambient: day birds, night crickets, rain and storm beds; one-shots every 4-35 s.
  - Death/respawn presentation: not in this topic, not read.
  - Loot reveal ceremony: not in this topic, not read.
  - Walk density: one ambient one-shot every 5 to 25 s on average while walking.
  - Readability at 375: heavy fog half-visibility about 14 units; snowy about 139 units; rainy about 231 units (ln 2 / density).
