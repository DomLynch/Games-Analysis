# PixelGuys-Cubyz (weather-time-light, feel note, cell WL003)

Donor: `/mnt/frankendom-donors/PixelGuys-Cubyz` | Licence: GPL-3.0 (LICENSE file; matrix row says GPL-3) | Zig | Verdict: STRONG for time, sky and light. No weather system exists in this donor.

Checked: read in full `src/game.zig` 400-560 (World clock, DayTime struct: phases, ambient, sky factor, fog blend); `src/server/world.zig` 1100-1122 (server clock step and time send); `src/network/protocols.zig` 640-668 (client clock correction); `src/renderer.zig` 150-165 and 836-850 (ambient floor, stars); `src/itemdrop.zig` 650-665 (sun and block light combine); `src/server/terrain/biomes.zig` 236-290 (biome fog fields). Grep over `src/`, `assets/`, `docs/` for weather, rain, snow, fog, sun: no weather system; no sun disc drawn (only a TODO at renderer.zig:156). Confidence high on the clock and sky; I did not read the chunk or entity shaders in full.

## 1. What the player sees and feels

- The world runs on one long day. Day is the longest stretch, then a short dusk, a long night, and a short dawn. The night is dim and blue-grey, never black, so the shapes of what is nearby still read.
- Dusk drains the sky colour one channel at a time: blue goes first, then green, and red lingers last. Dawn runs the same ramp backwards, so the sunrise feels warm before the day feels cool.
- Stars fade in during dusk and drift across the sky with the day's progress. The sun itself is not drawn.
- Fog colour follows the sky colour, so the horizon matches the sky. When the player crosses into a new biome, the fog eases into the new colour and density over about half a second instead of cutting.
- On a 375-wide phone the change is mostly tint and fog. Silhouettes stay readable because the ambient light has a floor.

## 2. Why it works, or is striking

- Readable silhouette at 375 wide: ambient never goes below a floor, and the night floor is a tint (renderer.zig:159-160), so an enemy stays a shape, not a hole.
- One signature behaviour: a single clock (server counter, one step per 100 ms) drives sky, fog, stars and light, so every system agrees on the time of day.
- One signature effect: the channel-by-channel sky ramp (blue first at dusk, red last). It is cheap, and it reads as sunset without a sunset asset.
- Could be made ours at 20-30 percent resemblance: yes. The clock, the phase split and the staged ramp carry over. Palette, durations and the night tint are ours to set.

## 3. The rule behind it

Order of operations on each client frame, with the server clock as the authority:

1. Server clock: one counter, +1 per 100 ms while the world runs (`src/server/world.zig:1113`). The server sends the counter to every connected client when more than 2 s have passed since the last send (`src/server/world.zig:1115`).
2. Client clock: its own counter also steps +1 per 100 ms (`src/game.zig:405-414`). On each server packet it corrects: if the gap is 10 ticks or more it snaps, otherwise it steps one tick toward the server per packet (`src/network/protocols.zig:653`).
3. Phase: tick modulo the cycle, then the phase name and progress 0..1 (`src/game.zig:456-477`).
4. Ambient scalar: day = 1; dusk ramps from 1 down to the night floor; night = floor; dawn ramps from floor back to 1 (`src/game.zig:491-499`).
5. Sky factor per channel, staged on solar presence (dusk uses 1 minus progress): red rises first, green from a quarter to three quarters, blue from a half to 1 (`src/game.zig:500-533`, receipts R7-R9).
6. Blend: biome fog colour, sky colour, density and fog range ease toward the target with `t = 1 - exp(-2 * dt)` (`src/game.zig:538-545`), then the fog colour is multiplied by the sky factor (`src/game.zig:549-550`).
7. Light: the item-drop path combines the sun channel (scaled by the ambient scalar) and the block light as a square root of summed squares, clamped to 1 (`src/itemdrop.zig:661-663`). The chunk shader was not read.

Data fields (designer-tunable; donor value null because the licence is GPL-3):

| name | unit | donor_value_or_null | our starting value |
|---|---|---|---|
| cycle_real_s | s of real time per full cycle | null | 1200 |
| phase_fraction_day / dusk / night / dawn | fraction, sums to 1 | null | 0.45 / 0.08 / 0.39 / 0.08 |
| ambient_night_floor | 0..1 scalar | null | 0.12 |
| night_tint_rgb | 0..1 per channel | null | a cool grey-blue, picked in our palette |
| night_brightness_setting | 0..1 player slider | null | 0.5 |
| sky_ramp_red_end / green_start / green_end / blue_start | solar presence 0..1 | null | 0.45 / 0.3 / 0.7 / 0.55 |
| fog_blend_rate | per second | null | 1.5 |
| clock_sync_interval_s | s | null | 2 |
| clock_snap_ticks | ticks | null | 8 |

## 4. For Frankendom

- Shape: 700 zones as data. Each zone row carries a sky preset (fog colour, fog range, ambient floor, night tint), so 700 zones are 700 rows, not 700 code paths.
- One clock for the server. Clients slew toward it exactly as the donor does. Zones may share the clock, with an optional per-zone offset later.
- Duels never blend. The fog and sky read the zone preset as it was at engage, and the blend runs only between fights. This keeps the 3-attacker read stable.
- Server-verified: time of day and presets never change damage, hit chance or spawn outcome in this note. The server publishes the clock and the preset; the client presents them.
- Many-vs-one: the ambient floor and fog range must keep three attackers distinct at 375 wide. Threat colour codes must be excluded from the sky grade.
- Keep: one clock; the staged channel ramp; the ambient floor; the eased fog blend on zone change.
- Change: the donor draws no sun disc, so we draw one (or a moon) as a sky sprite, a presentation-only add. Make the phase split data, not code.
- Target file: `src/fight/zone-clock.ts` (new; holds the clock and the zone preset read; no combat rule). Parity row: 16 (colour grade/quality).

## 5. Five-minute look test (Dom, phone)

- Build: a preview-only flag on the existing 3-attacker Pit arena. A time slider with four stops (dawn, noon, dusk, night) and one fixed sky preset. No release rows, no lock. Publish to the /preview/ folder.
- Compare at the fight camera, 375 wide: noon and night stills, with the three attackers in view.
- Dom judges three things: (a) at night can he tell the three attackers apart and see their threat colour; (b) does dusk read as dusk, not as a damage tint; (c) is the night dim, not black.
- Pass if the three attackers stay separable at night and the threat colours do not shift with the sky.

## 6. Licence and IP

GPL-3.0 (LICENSE read). Clean-room, shape only. We keep the idea of one clock, a staged channel ramp, an ambient floor and an eased fog blend. We change the palette, the durations, the phase split and the night tint, and we write our own code. No donor numbers, colours or code are copied. No legal conclusion is drawn.

## 7. Gaps and half-read

- Half read: both the server clock and the client render were read, so the donor is read in full on both halves. The data pack (226 biome `.zon` files matching the biome path; 35 set `fogColor`, 40 set `fogDensity`) was counted by grep, not opened one by one.
- Not read: `chunk_vertex.vert`, `entity_vertex.vert` (ambientLight only grepped), the sky and star shader, `transparent_fragment.frag` fog, the lava and water block-texture fog values (grepped only).
- Not read, out of topic: creature idle behaviour, death and respawn presentation, loot reveal, walk density.
- Readability at 375 wide was not measured in the donor; the look test above is the measurement.

Best transferable idea: one server clock plus staged sky and fog presets, slewed on the client, lets 700 zones share one day at near-zero cost.

Reuse tag: none (no prior Frankendom lane reuse used).
Brief rule served: feel note, weather-time-light, phone-first 375 wide, server-verified, one ledger, a world worth walking.
