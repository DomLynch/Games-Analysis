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

Client: cloud and rain come from the compressed grid; the flash reads the last strike position and time (`voxygen/src/scene/mod.rs:492-493`); the sky shader adds the flash (`sky.glsl:211-234`). Ambience: rain bed volume = rain times 3 times a height factor times an indoor factor (`voxygen/src/audio/ambience.rs:236`); thunder bed on when rain times 3 reaches 0.7, i.e. raw rain about 0.23, otherwise 0 (`ambience.rs:239-244`; the variable named rain_intensity there is already rain times 3); every channel fades to its target over 1.0 s (`ambience.rs:177`). Thunder one-shot: volume = (1 minus distance over 6000) to the seventh, times 3, capped at 2.9; delay = distance over 340 (`voxygen/src/audio/sfx/mod.rs:529-538`).

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
| thunder_gate_rain | raw rain 0..1 (the donor compares rain x 3 with 0.7, i.e. raw 0.233) | null | 0.2, ramped over 0.07 |
| thunder_radius_units | zone units | null | 150 |
| flash_decay_s | real s (donor decays linearly over about 1 s, `sky.glsl:217`) | null | 0.3 |
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
- D2 (cloud range, `server/src/weather/sim.rs:138` vs `common/src/weather.rs:28`): cloud is not clamped and can exceed 1 whenever 1 minus pressure is above 0.5, which is common in wet cells (cloud = (1-p)^2 x 4). The server kind test only says cloudy for cloud in 0.2..1, so a cell with cloud above 1 and rain under 0.1 reads as clear on the server, while the client caps cloud at 1 through the byte cast and shows cloudy. That needs rain under 0.1 at the same time, which needs humidity near zero, so the visible mismatch is rare even though the overshoot itself is common. fix: clamp cloud to 0..1 in the sim and keep the 0.2 lower bound.
- D3 (thunder hard gate, `voxygen/src/audio/ambience.rs:239-244`): the thunder bed jumps from 0 to 0.7 when rain times 3 crosses 0.7 (raw rain 0.233). The 1.0 s fade (`ambience.rs:177`) softens it, but the onset is still a step. fix: ramp with a smoothstep over a band below the gate (in raw rain, about 0.167 to 0.233; the data table row uses raw rain units).
- D4 withdrawn (checker finding, re-read of `server/src/weather/tick.rs:153-165`): the strike pick uses `iter().choose(&mut rng)` on the cell list. On an iterator with an exact size (a slice iterator) rand's `choose` jumps straight to the chosen index, so it is not a full walk per strike; the cost note was overstated and no fix is needed.

## 5. Five-minute look test (Dom, phone)

- Build: a preview-only flag on the 3-attacker arena with a clear and a storm preset, lightning on a fixed 20 s timer, and a wind gust. No release rows, no lock. Publish to /preview/.
- Compare clear and storm stills at the fight camera, 375 wide, with three attackers in view, plus a short clip of one flash.
- Dom judges: (a) the flash never hides a telegraph or a threat colour for more than 0.3 s; (b) rain streaks do not mask an attacker's silhouette; (c) the thunder bed does not cover the combat sound cues (parity row 12).
- Pass if the flash clears inside 0.3 s, silhouettes stay separable in the storm, and the cues stay audible.

## 6. Licence and IP

GPL-3.0 (LICENSE read). Clean-room, shape only. We keep the idea: grid-from-noise weather, pressure and humidity split, cubed wind gusts, distance-delayed thunder, staged music filter, flashing-lights snap. We change the constants, the palette, the update cadence (dirty-set sends), the flash gate (D1), the flash decay (0.3 s instead of the donor's about 1 s) and the cloud range (D2), and we write our own code. No donor numbers or code are copied. No legal conclusion is drawn.

## 7. Gaps and half-read

- Half read: the server weather sim and the client presentation were both read (single donor holds both halves). The rtsim use of `is_raining` (`common/src/weather.rs:117-123`) was read; its callers in `server/src/rtsim/tick.rs` were grepped only.
- Data pack: `assets/voxygen/audio/ambience.ron` has 7 live tracks (Wind, Rain, ThunderRumbling, Leaves, Cave, RiverQuiet, RiverLoud). `assets/voxygen/audio/soundtrack.ron` has 77 timing fields (21 Day, 29 Night, 27 None) and 77 weather fields (74 None, 3 Rain), but only 74 `music_state` fields. The 3-entry gap is not reconciled and those entries were not opened.
- Not read: `voxygen/src/scene/particle.rs` rain particles (lightning only); the cloud and rain-occlusion shaders; `world/src/sim` humidity and climate source; `voxygen/src/hud/mod.rs:2933` (grepped only); the `music_transition_manifest.ron` content.
- Not read, out of topic: creature idle, death and respawn presentation, loot reveal, walk density.
- Readability at 375 wide was not measured in the donor; the look test is the measurement.

Best transferable idea: weather as a server-owned grid of cloud, rain and wind values, updated on a slow cadence and sent only when it changes, with the flash and thunder kept as client-only presentation.

Reuse tag: none (no prior Frankendom lane reuse used).
Brief rule served: feel note, weather-time-light, phone-first 375 wide, server-verified, one ledger, a world worth walking.


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: Verified: WEATHER_DT 5 s (mod.rs:11), slow job 141-145, pressure formula 124-135 (two octaves, +0.55, -humidity*0.6), humidity powf(0.2).min(1) at 59, cloud 138, rain 139-142 with threshold 0.25, wind 143-147, zone countdown 109, lightning candidates 150, strike count 0.0015*dt at 155-156, prepared once 119-123, 1-in-30 wind stagger 171-175, kind thresholds weather.rs 22-32, 2-byte compression 103-104, DayPeriod 6/11/16/19 (time.rs 14-24), moon 40 days (time.rs:34), day coefficient 1440/day_length (settings 341) and default 30, time chase factor dt (scene/mod.rs 945), snap thresholds 2 days vs 0.25 day (935-939), thunder volume (1-d/6000)^7*3 cap 2.9 and delay d/340 (sfx/mod.rs 529-538), ambience fade 1.0 s (177), rain bed rain*3 (236), sky.glsl flash with sin(time_of_day.x*0.4) at 219 and decay 217 (D1 is a real finding: 48x game clock gives ~0.33 s real period), RON counts (77 timing, 27 None, 74 music_state). Errors: (1) D4 is wrong: tick.rs:159 uses iter().choose(rng) on a slice iterator, which has an exact size hint, so rand's choose jumps with nth in O(1); it does not walk the whole list. (2) Thunder gate unit trap: ambience.rs 239-244 compares rain*3 against 0.7, so the real gate is raw rain 0.233, not 'rain intensity 0.7'; the data table row thunder_gate_rain 0.6 (0..1 rain units) and D3 'ramp 0.5 to 0.7' are in different units than the donor variable, so a donor-faithful port would be off by 3x. (3) D2 says cloud above 1 is rare/latent, but cloud = (1-p)^2*4 exceeds 1 whenever 1-p > 0.5; with humidity near 1 pressure bottoms at about -0.05, so cloud up to ~4.4 is common in wet cells; only the 'rain under 0.1' co-condition is rare, so conclusion holds but reasoning is loose. ACCEPTANCE/DATA CONFLICT: section 5 pass criterion is 'the flash clears inside 0.3 s' and Dom judges 'never hides a telegraph for more than 0.3 s', but the data table sets flash_decay_s = 1.0 (donor decay is 1.0 s linear at sky.glsl:217). A correct build using the table's own 1.0 s value fails its own look test; one of them must change (or the flash must be a short pulse, not the donor's 1 s decay).
Missed: Not covered: the 20-30 percent storm kind is driven by wind >= 24.5 only, wind peak 200*(1-p) so storm kind is reachable from cubed noise >= about 0.5 (not 'rare'). Also rain_vel fall rate 30 and lightning_at max period 5 s (sky.glsl:209) not mentioned.

Fixed 2026-10-12 (Sonnet fixer, tick.rs 153-170, ambience.rs 232-246, sky.glsl 208-230, sim.rs 136-148 re-read over ssh): (1) D4 withdrawn (choose on a slice iterator is not a full walk). (2) Thunder gate stated in the donor's real units (rain x 3 >= 0.7, raw rain 0.233); data row and D3 now in raw rain units. (3) D2 reasoning tightened (overshoot is common, the clear-versus-cloudy mismatch is rare). (4) flash_decay_s set to our 0.3 s so the data table agrees with the look test's 0.3 s pass criterion; the donor's roughly 1 s linear decay is noted. Also found: the sky shader draws the flash only while time since the strike is under MAX_LIGHTNING_PERIOD = 5 s (sky.glsl 209, 224), so the donor's flash has a hard 5 s outer limit as well as the 1 s decay.
