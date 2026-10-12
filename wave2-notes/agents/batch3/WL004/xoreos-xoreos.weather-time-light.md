# xoreos-xoreos (weather-time-light, feel note, cell WL004)

Donor: `/mnt/frankendom-donors/xoreos-xoreos` (C++ reimplementation of BioWare's Aurora engine) | Licence: GPL-3.0 (COPYING: "Version 3, 29 June 2007") | Verdict: PARTIAL (weather is stored and parsed, but no weather runtime was found in the code I read)

Checked: read the Aurora area code for ambient sound and music (`src/engines/nwn/area.cpp` 206-229, 341-361), the module IFO weather fields (`src/aurora/ifofile.cpp` 218-224, 354-368), the Witcher Lua weather bindings (`src/engines/witcher/lua/bindings.cpp` 1100-1128), the date-time wrapper (`src/common/datetime.h` 36-91), and the NWN model lightning controller IDs (`src/graphics/aurora/model_nwn.cpp` 105-111). Grep over `src` for callers of the weather getters found none (only definitions: `src/aurora/ifofile.h` 178-185, `src/aurora/ifofile.cpp` 354-368). Also read the NWN2, KOTOR-base and Witcher area files by grep for day/night and fog terms. Confidence: high that the weather runtime is not in the engine code I read; the data pack (module files) was not read.

Half read: engine/client code only (C++ under `src/`). Data-pack half (the game module and area files, whose fields these parsers read) is NOT in the donor tree I read. No paired data pack was searched for.

Audit/catalogue: no `AU*` or `DC*` folder for this donor exists in batch3.

## 1. What the player sees and feels

From this code, the player sees no weather. Day and night ambience and music are read per area as a pair (day and night), but only the day track is played: the night branch is marked TODO in both the music and the ambient-sound functions. So an area sounds the same at noon and at midnight. The donor's design intent (a day and a night track per area, with a volume set per area) is visible in the data fields, not in the play path.

## 2. Why it works / is striking

- Readable at 375 wide: not assessed. No visual weather is drawn in the code I read.
- One signature behaviour: none in the code read.
- One signature sound: none played for weather. The ambient volume curve (below) is the closest sound idea.
- Could be ours at 20-30 percent resemblance: the per-zone weather fields (intensity range, rain and snow chance) as zone data, which we would build the runtime for ourselves.

Best transferable idea: per-zone weather intensity range and rain and snow chances as data fields on each zone, with a day and night ambient pair per zone, even though this donor reads them and never runs them.

## 3. The rule behind it

Data fields read (module IFO, `src/aurora/ifofile.cpp`):
- Minimum weather intensity, default 0 (line 220).
- Maximum weather intensity, default 100 (line 221).
- Rain chance, default 0 (line 222).
- Snow chance, default 0 (line 223).

Each is stored and exposed through a getter. The getters have no caller in `src` (grep: only the definitions at `src/aurora/ifofile.cpp` 362 and the declaration at `src/aurora/ifofile.h` 183).

Area ambient (`src/engines/nwn/area.cpp`): the day and night ambient sounds are looked up from a 2DA table by row, and each has a volume (0 to 127) mapped by a curve: 1.25 times (1 minus 5 to the power of minus v over 127) (line 355). The play path uses only the day sound: "sound = _ambientDay;" (line 224), with a TODO for day and night (line 222). The music path has the same TODO (line 209).

Witcher Lua bindings (`src/engines/witcher/lua/bindings.cpp`): classes for rain and fog are registered with no methods (lines 1100-1112 for rain and 1115-1127 for fog). Only the Lua type names exist (line 1112).

Time: the date-time wrapper exposes hour, minute, second and date fields (`src/common/datetime.h` 70 and onward). It is a wrapper over a posix time value, not an in-game clock.

Model lightning: NWN model controller IDs for lightning delay, radius and scale are named (`src/graphics/aurora/model_nwn.cpp` 109-111). The render of those controllers was not read.

Numbers as designer-tunable data fields (donor value null, because this is GPL-3):

| name | unit | donor_value_or_null | our starting proposal |
|---|---|---|---|
| weather.intensity_min | 0-100 | null | 0 |
| weather.intensity_max | 0-100 | null | 60 |
| weather.rain_chance | percent | null | 0 for indoor zones |
| weather.snow_chance | percent | null | 0 for most zones |
| ambient.day_track / night_track | track id | null | per zone |
| ambient.volume_day / night | 0-127 | null | 90 |

## 4. For Frankendom

- Zones as data (700 zones): each zone gets day and night ambient and music fields, and weather intensity and chance fields. The donor shape fits zone data, but the play path is missing, so we write the runtime.
- Server-verified: the server picks weather per zone and sends one event; the client plays the matching ambient pair. The night pick should be by server clock, not a client guess.
- Keep: the day and night pair per area; the per-zone min and max intensity range; a per-zone rain and snow chance.
- Change: the night branch must play (donor TODO); the intensity fields need a runtime; zones indoors force both chances to 0.

Server clock sub-line: row 18 / post-K item 3, "server tick: fixed step, input intake, per-tick NPC budget". Zone spawn caps would sit under row 23 (zone population). The ambient pair is client presentation; none of rows 1-22 fits it exactly, so it is a new zone-audio item for Lead to place.

## 5. Five-minute look test

Not applicable from this donor alone: no weather visual exists in the code read. Use the exult look test (see the exult note) for the visual weather direction. For sound: play the day track and the night track of one zone on a phone and compare; Lead to assign a row.

## 6. Licence and IP

GPL-3.0 (COPYING). Clean-room only: the data-field names are our own, and no code was adapted. No game content is used. Inspiration stays category-level: "a zone with a day and a night ambient bed". No legal conclusions.

## 7. Gaps

- Not read: module (IFO, ARE) files and the data pack that these fields come from; the rendering of model lightning controllers; any music or sound table (2DA for ambient sound not read beyond the lookup line); the Witcher and Dragon Age weather code beyond the bindings.
- Half read: engine code only. Data half not in the donor tree read.
- Unverified: whether a weather system exists anywhere else in this donor. I searched `src` by grep for weather, rain, snow, fog and day or night terms, and read the matching area files. A full tree search was not done.
- Death/respawn, loot, walk density and idle animation: not read for this topic.

Reuse tag: data-only idea (zone fields). The runtime is ours to write.
Brief rule served: feel note for weather-time-light; the donor is thin, so the rule is the data-field set only.
