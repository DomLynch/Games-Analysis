# veloren-veloren (weather-time-light, feel note, cell WL003)

Donor: `/mnt/frankendom-donors/veloren-veloren` | Licence: GPL-3.0 (LICENSE file; matrix row says GPL-3) | Rust, GLSL, RON data | Verdict: STRONG for weather state, time of day, lightning and ambience. Clean-room, shape only.

Checked: read in full `server/src/weather/mod.rs`, `server/src/weather/sim.rs`, `server/src/weather/tick.rs`, `common/src/weather.rs` (1-273), `common/src/time.rs`; read `common/src/resources.rs` 1-70; read `voxygen/src/audio/ambience.rs` 64-245; read `voxygen/src/scene/mod.rs` 925-960, 1361-1380, 490-500; read `voxygen/src/audio/sfx/mod.rs` 525-545; read `voxygen/src/audio/music.rs` 470-500; read `assets/voxygen/shaders/include/sky.glsl` 208-234; read `voxygen/src/render/pipelines/mod.rs` 111-154 (grep and window); read `common/state/src/state.rs` 865-872 (game time advance). Confidence high on the weather sim and the flash gate; the flash gate is read from code and not run in game.

## 1. What the player sees and feels

- Weather rolls in across the land in patches. A cloud band thickens, rain starts where cloud and humidity meet and grows heavier with lower pressure, and wind is mostly calm with occasional gusts.
- A storm brings rain streaks, occasional bolts, a bright white-blue flash that appears at once and decays over about a second, and a thunder rumble that arrives after the flash, delayed by the distance the sound travels.
- The day has four named periods (night, morning, noon, evening). Sun direction is one smooth arc over the day, and the moon cycles through phases over a month of game days.
- On a 375-wide phone the storm reads through rain and flash, not through a changed HUD. The flash is the main risk to readability and to the telegraph.

## 2. Why it works, or is striking

- Readable at 375: the weather is a 2D grid of values, not per-object effects, so it costs little and does not add enemies to the screen.
- One signature behaviour: wind from cubed noise, so most air is calm with rare gusts. That is a gust that reads as a beat.
- One signature effect: thunder volume scales with distance (falloff to the seventh power, delay of distance over speed of sound). A far storm reads as far.
- Could be made ours at 20-30 percent resemblance: yes. The grid, the pressure-from-noise rule, the cubed wind and the distance-delayed thunder all carry over with our own constants.

## 3. The rule behind it

Server, every 5 s (`server/src/weather/mod.rs:11`), on a slow-job thread (`server/src/weather/tick.rs:141-145`):

1. Pressure per cell from two octaves of turbulent noise across space and time, offset by humidity (`server/src/weather/sim.rs:124-135`). Humidity per cell is the chunk average raised to a 0.2 power, capped at 1 (`sim.rs:59`).
2. Cloud = (1 minus pressure, floored at 0) squared, times 4 (`sim.rs:138`). Rain = ((1 minus pressure minus 0.25, floored at 0) times humidity times 2.5) to the 0.75 power (`sim.rs:139-142`). Wind per axis = cubed noise times 200 times (1 minus pressure) (`sim.rs:143-147`).
3. Painted zones: a circle of a forced weather kind with a lifetime, counted down by the update interval (`sim.rs:70-89`, countdown `sim.rs:109`).
4. Lightning candidates: rain above 0.2 and cloud above 0.15 (`sim.rs:150`). Strikes per frame = candidates times 0.0015 times delta time, each at a random candidate cell (`tick.rs:155-169`).
5. Send: the whole grid is compressed to two bytes per cell (`common/src/weather.rs:103-104`), prepared once and sent to every client (`tick.rs:119-123`). Wind is not in the shared grid; each entity gets a local wind update on a 1-in-30 tick stagger (`tick.rs:171-175`).
6. Kind for the HUD, music and NPCs: storm if wind is at least 24.5 m/s; rain if rain is in 0.1..1; cloudy if cloud is in 0.2..1; else clear (`common/src/weather.rs:22-32`).

Client: cloud and rain come from the compressed grid; the flash reads the last strike position and time (`voxygen/src/scene/mod.rs:492-493`); the sky shader adds the flash (`sky.glsl:211-234`). Ambience: rain bed volume = rain times 3 times a height factor times an indoor factor (`voxygen/src/audio/ambience.rs:236`); thunder bed on at rain intensity 0.7 (`ambience.rs:241`); every channel fades to its target over 1.0 s (`ambience.rs:177`). Thunder one-shot: volume = (1 minus distance over 6000) to the seventh, times 3, capped at 2.9; delay = distance over 340 (`voxygen/src/audio/sfx/mod.rs:529-538`).

Time: TimeOfDay is seconds of game time (`common/src/resources.rs:11`); sun direction is a flat arc in one plane from the day angle (`resources.rs:16-23`). The day length setting is real minutes per game day (default 30, `common/src/consts.rs:42`), and the coefficient is 1440 divided by that setting (`server/src/settings/mod.rs:341`). Day period buckets: night before 6 h, morning before 11 h, noon before 16 h, evening before 19 h, then night (`common/src/time.rs:12-24`). Moon phase cycles over 40 game days (`time.rs:34,39-40`).

Client time chase: the displayed time eases to the server value with a factor of dt (`voxygen/src/scene/mod.rs:945`); it snaps instead when the gap exceeds two days with flashing lights on, or a quarter day with them off (`scene/mod.rs:935-939`). The comment says the snap exists to stop flashing in the sky.

Data (designer-tunable; donor value null because the licence is GPL-3):

| name | unit | donor_value_or_null | our starting value |
|---|---|---|---|
| weather_update_s | s | null | 4 |
| cloud_gain | scalar | null | 3 |
| rain_cloud_threshold | scalar | null | 0.3 |
| humidity_exponent | scalar | null | 0.25 |
| rain_onset_exponent | scalar | null | 0.7 |
| lightning_rate_per_candidate_s | per s | null | 0.002 |
| lightning_min_rain / lightning_min_cloud | scalar | null | 0.25 / 0.2 |
| storm_wind_mps | m/s | null | 20 |
| wind_gain | scalar | null | 150 |
| wind_stagger_modulus | ticks | null | 20 |
| thunder_gate_rain | scalar | null | 0.6, ramped over 0.2 |
| thunder_radius_units | zone units | null | 150 |
| flash_decay_s | real s | null | 1.0 |
| day_length_real_min | real min | null | 20 |
| moon_cycle_days | game days | null | 28 |
| snap_days_flashing_on / off | game days | null | 1.0 / 0.1 |

## 4. For Frankendom

- Shape: weather is zone data. Each of the 700 zones holds a weather state (kind and intensity). A server job updates the states every few seconds, and only zones that changed are sent (the donor sends the full grid every update; we send a dirty set).
- Storm and flash never change damage, hit chance, input or the telegraph. The server publishes the state; the client presents rain, flash and thunder. This is the server-verified line.
- Wind is cosmetic. Per-creature wind updates staggered over a modulus keep the per-tick budget flat for many creatures, which maps to the server tick sub-line (per-tick NPC budget).
- Music: the donor filters tracks in stages by day period, weather kind, site and biome, falling back when none match. Our zone music uses the same staged filter with zone tag and weather kind.
- Accessibility: the donor ties the time snap to the flashing-lights setting. We keep that and tie it to our reduced-motion setting.
- Keep: the grid-from-noise weather rule; the pressure and humidity split; cubed wind gusts; distance-delayed thunder; the staged music filter; the flashing-lights snap.
- Change, from the donor's code: see defects below.
- Target file: `src/fight/zone-weather.ts` (new; server zone weather state and the dirty-set send; no combat rule). Parity row: 18 (server tick: fixed step, input intake, per-tick NPC budget).

Defects found, kept idea, with the fix for each:

- D1 (flash gate, `assets/voxygen/shaders/include/sky.glsl:219`): the flash is multiplied by `max(sin(time_of_day.x * 0.4), 0.0)`. `time_of_day.x` is game seconds (`voxygen/src/render/pipelines/mod.rs:141`). Game time advances at real time times the day-cycle coefficient times the time scale (`common/state/src/state.rs:869`), which is 48 times real time at the default 30-minute day. The gate therefore has a period of about 15.7 game seconds, which is about 0.33 s real, and it is on for half of it. The flash (decay about 1 s, `sky.glsl:217`) would be chopped into pulses. The comment calls the factor "Reverb" and does not say why. Not run in game. fix: gate the flash by time since the strike only; if a second bloom is wanted, add it as a timed second pulse at about 0.3 s after the first.
- D2 (cloud range, `server/src/weather/sim.rs:138` vs `common/src/weather.rs:28`): cloud is not clamped and can exceed 1. Server kind then says clear for cloud above 1 with rain under 0.1, while the client caps cloud at 1 through the byte cast and says cloudy. Rain under 0.1 needs humidity near zero (below about 0.07 after the 0.2 power), so this is latent and rare. fix: clamp cloud to 0..1 in the sim and keep the 0.2 lower bound.
- D3 (thunder hard gate, `voxygen/src/audio/ambience.rs:241`): thunder jumps from 0 to 0.7 when rain intensity crosses 0.7. The 1.0 s fade (`ambience.rs:177`) softens it, but the onset is still a step. fix: ramp from 0.5 to 0.7 with a smoothstep.
- D4 (strike pick, `server/src/weather/tick.rs:159`): each strike walks the whole candidate list with `choose`, so cost grows with map size times strikes. fix: pick a random index.

## 5. Five-minute look test (Dom, phone)

- Build: a preview-only flag on the 3-attacker arena with a clear and a storm preset, lightning on a fixed 20 s timer, and a wind gust. No release rows, no lock. Publish to /preview/.
- Compare clear and storm stills at the fight camera, 375 wide, with three attackers in view, plus a short clip of one flash.
- Dom judges: (a) the flash never hides a telegraph or a threat colour for more than 0.3 s; (b) rain streaks do not mask an attacker's silhouette; (c) the thunder bed does not cover the combat sound cues (parity row 12).
- Pass if the flash clears inside 0.3 s, silhouettes stay separable in the storm, and the cues stay audible.

## 6. Licence and IP

GPL-3.0 (LICENSE read). Clean-room, shape only. We keep the idea: grid-from-noise weather, pressure and humidity split, cubed wind gusts, distance-delayed thunder, staged music filter, flashing-lights snap. We change the constants, the palette, the update cadence (dirty-set sends), the flash gate (D1) and the cloud range (D2), and we write our own code. No donor numbers or code are copied. No legal conclusion is drawn.

## 7. Gaps and half-read

- Half read: the server weather sim and the client presentation were both read (single donor holds both halves). The rtsim use of `is_raining` (`common/src/weather.rs:117-123`) was read; its callers in `server/src/rtsim/tick.rs` were grepped only.
- Data pack: `assets/voxygen/audio/ambience.ron` has 7 live tracks (Wind, Rain, ThunderRumbling, Leaves, Cave, RiverQuiet, RiverLoud). `assets/voxygen/audio/soundtrack.ron` has 77 timing fields (21 Day, 29 Night, 27 None) and 77 weather fields (74 None, 3 Rain), but only 74 `music_state` fields. The 3-entry gap is not reconciled and those entries were not opened.
- Not read: `voxygen/src/scene/particle.rs` rain particles (lightning only); the cloud and rain-occlusion shaders; `world/src/sim` humidity and climate source; `voxygen/src/hud/mod.rs:2933` (grepped only); the `music_transition_manifest.ron` content.
- Not read, out of topic: creature idle, death and respawn presentation, loot reveal, walk density.
- Readability at 375 wide was not measured in the donor; the look test is the measurement.

Best transferable idea: weather as a server-owned grid of cloud, rain and wind values, updated on a slow cadence and sent only when it changes, with the flash and thunder kept as client-only presentation.

Reuse tag: none (no prior Frankendom lane reuse used).
Brief rule served: feel note, weather-time-light, phone-first 375 wide, server-verified, one ledger, a world worth walking.
