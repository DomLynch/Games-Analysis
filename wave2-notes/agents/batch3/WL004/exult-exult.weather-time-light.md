# exult-exult (weather-time-light, feel note, cell WL004)

Donor: `/mnt/frankendom-donors/exult-exult` (C++ engine, Ultima VII / Serpent Isle client) | Licence: GPL-2.0 (COPYING: "GNU GENERAL PUBLIC LICENSE Version 2, June 1991") | Verdict: STRONG (clock, palette glide, storm timers, ambient bursts all read in code)

Checked: read in full order of operations: `gameclk.cc` (get_time_palette 42-54, get_final_palette 56-82, set_time_palette 88-160, set_fog 202-208, set_overcast 193-196, increment 240-259, handle_event 265-311); `gameclk.h` (ticks_per_minute 32); `palette.h` (palette names 32-45); `palette.cc` (Palette_transition 726-746, set_step 748-772); `effects.cc` (Weather_effect 1221-1233, Lightning_effect 1478-1500, Storm 1512-1518, Snowstorm 1547-1550, Sparkle 1579-1582, Fog 1616-1629, Clouds 1741-1756 and 1804-1822, Rain_effect ramp 1389-1397, drop tick 1438); `objs/egg.cc` (Weather_egg 524-535, nocturnal checks 843 and 959, set_weather 1381-1418); `gamewin.cc` (Background_noise 196-289, schedule_npcs 2525-2537); `objs/animate.cc` (hourly chime 232-238, hourly frame 382-384); `data/exultmsg.txt` (string table). Confidence: high on the code paths read. I did not run the game. Numbers are read from code, not measured on a phone.

Half read: engine/client code (C++) plus one data file (`data/exultmsg.txt`). Data-pack half NOT in the box I read: weather egg placements and palette tables live in original game map and palette files (`PALETTES.FLX` is referenced at `palette.cc` 728, not present in the donor tree I looked at). No paired data pack was searched for.

Audit/catalogue: no `AU*` or `DC*` folder for this donor exists in batch3, so none was read.

## 1. What the player sees and feels

- The light follows a clock. Dawn starts at 05:00, day holds until 20:00, dusk at 20:00, then night. Each change is a one-hour glide between palettes, so a player feels the dusk coming before the screen changes. Indoors (dungeon) is always night.
- A storm (a weather egg on the map) starts clouds at once. Rain fades in over several seconds, streaks ramping up toward 200 drops (we would cap lower on a phone). Lightning turns the screen white for 25 or 50 ms with a thunder sound, then waits 4 to 7 seconds before the next flash. Now and then (1 in 50 flashes) it re-flashes within 40 to 280 ms.
- Fog is a day-only palette wash with sparkle drops. At night it does not show.
- Outside, the ambience is a short bird burst by day and cricket burst by night, each one may repeat. The background music switches to a rain or snow track while a storm plays. Indoors and in dungeons it uses its own track.
- An object with the hourly flag strikes the hour on the hour (count = hour mod 12, 0 means 12). A hourly sprite cycles one frame per game hour.

## 2. Why it works / is striking

- Readable at 375 wide: the screen has one light mood per hour, and the change is a glide (60 steps over one game hour), so it does not cut across a telegraph.
- One signature behaviour: the two-step lightning burst (flash, sometimes a quick re-flash, then a long random pause). It reads as weather without any gameplay effect.
- One signature sound: the thunder cue on each flash, and the bird-to-cricket swap at dusk.
- Could be ours at 20-30 percent resemblance: a duel arena or zone that drifts from dawn to night over a play session, and a storm that rolls across a zone for a few minutes, presentation only.

Best transferable idea: a server-owned game clock that moves the light palette in one-hour glides and triggers timed storm events, with the client only drawing them.

## 3. The rule behind it

Clock. One game minute is 25 sub-steps (`gameclk.h` 32). A requested time jump is rounded to the nearest 15 minutes (`gameclk.cc` 245). Each full hour: heal the party, run hunger checks, and re-read NPC schedules (`gameclk.cc` 294, 296; `gamewin.cc` 2536, where schedule blocks are 3 hours wide).

Phase by hour (`gameclk.cc` 42-54): indoors or before 05:00 is night; 05:00 is dawn; 06:00 to 19:59 is day; 20:00 is dusk; after 20:00 is night. Nocturnal eggs use the same night window, 21:00 to 04:59 (`objs/egg.cc` 843).

Glide. The palette target is the phase of the next hour (`gameclk.cc` 99). The hourly fade runs at 25 ticks per step, 60 steps (`gameclk.cc` 156). A weather change (overcast or fog toggled) takes a quicker fade: 1 tick per step, 20 steps (`gameclk.cc` 135-140). Fade step = elapsed ticks divided by the step size (`palette.cc` 749, 755).

Storm, in order from the egg firing (`effects.cc` 1512-1518; times in ms unless stated):
1. Clouds at once.
2. Rain starts at 20 to 1019 ms. Rain stays 2 game minutes past the storm end.
3. Lightning starts 0 to 499 ms after rain. It stops 2 game minutes before the storm end.

Lightning loop (`effects.cc` 1487-1498): flash is 25 or 50 ms; after a flash, 1 in 50 re-flashes after 40 to 280 ms; otherwise waits 4000 to 6999 ms. No lightning in a dungeon unless from usecode.

Rain ramp (`effects.cc` 1397, 1390, 1438): check every 100 ms. Ramp up by 0 to 4 drops per check to 200. Ramp down by 0 to 14 per check after the end.

Fog (egg kind 4, `effects.cc` 1619-1620, 1629): sparkles start 250 to 1249 ms in, capped at 100 (MAXDROPS / 2). Fog is shown only in dawn and day palettes (`gameclk.cc` 75-76).

Egg packing (`objs/egg.cc` 531, 1390): one 16-bit field: low byte = kind (0 clear, 1 snow, 2 storm, 3 sparkle, 4 fog, 5 overcast, 6 clouds), high byte = minutes. Zero minutes means continuous (6000). A new kind clears old weather except fog (`objs/egg.cc` 1395).

Ambient state (`gamewin.cc` 196-205, 285-289): priority is dungeon, rain, snow, night, outside. Ambient bird and cricket bursts: after a play, repeat with chance 1 in (repeats + 1), after 500 to 1499 ms; otherwise wait 4000 to 6999 ms and reset (`gamewin.cc` 269-270 lists the entries: night 61, 61, 255 where 255 is silence; day 82, 85, 85).

Hourly chime (`objs/animate.cc` 234): on minute 0, strike hour mod 12, with 0 becoming 12. Hourly frame (`objs/animate.cc` 384): frame = hour mod frame count.

Numbers as designer-tunable data fields (donor value null, because this is GPL-2):

| name | unit | donor_value_or_null | our starting proposal |
|---|---|---|---|
| clock.substeps_per_minute | sub-steps | null | 25 (keep the feel) |
| clock.dawn_hour / dusk_hour | hour | null | 5 / 20 |
| palette.hour_glide_steps | steps | null | 60 |
| palette.weather_glide_steps | steps | null | 20 |
| storm.rain_start_ms | ms | null | 20 to 1019 |
| storm.lightning_jitter_ms | ms | null | 0 to 499 |
| storm.rain_lead_min / lightning_lead_min | game minutes | null | 2 / 2 |
| lightning.flash_ms | ms | null | 25 or 50 |
| lightning.reflash_chance | 1 in N | null | 50 |
| lightning.pause_ms | ms | null | 4000 to 6999 |
| rain.drop_cap | drops | null | 80 on phone (donor 200) |
| rain.ramp_up_per_check / ramp_down | drops per 100 ms | null | 0 to 4 / 0 to 14 |
| fog.sparkle_cap | drops | null | 40 on phone (donor 100) |
| ambient.repeat_gap_ms | ms | null | 500 to 1499 repeat, 4000 to 6999 gap |
| clock.default_zone_weather_minutes | minutes | null | 6000 when zero |

## 4. For Frankendom

Mapping to our shape:
- 700 zones as data: each zone gets a `sky` block with `indoors` (bool), an optional `phase_override`, and a list of weather events `{kind, minutes, at}`. The donor packs kind and minutes into one egg field; we keep them as JSON fields, the packing is not needed.
- Server-verified: the server owns the clock, the phase, and every weather event, and sends `sky.phase` and `sky.weather.start` as events. The client only glides and draws. Donor weather changes no combat in the code I read: palette, particles and sound only. We keep it presentation-only in v1.
- Pit: the donor forces night indoors. Change: the Pit (indoor arena) uses its own fixed readable palette, not night. Dungeon zones may still use night.
- Many-vs-one: the donor lightning is a full-screen white flash of 25 or 50 ms. Change: no flash inside the first 500 ms of an enemy telegraph or during a finisher camera. Keep the 25 or 50 ms length.
- Rain and fog particle caps: 200 and 100 in the donor. Ours 80 and 40 on phone so three attackers stay readable.
- Keep: the hour glide (60 steps over an hour), the random lightning pause, the one-field weather egg with its clearing rule, and the ambient repeat rule.
- Change: the counters (see defects), the indoor-night rule, and the flash near telegraphs.

Server clock sub-line: row 18 / post-K item 3, named "server tick: fixed step, input intake, per-tick NPC budget". The palette glide itself is client presentation and sits under row 16 (colour grade). NPC schedule blocks by hour are a population question and would sit under row 23 (zone population), not a weather row.

Defects found by reading (keep the idea, fix the defect):
1. Clouds with kind 6 (no overcast) calls `set_overcast(false)` in its constructor (`effects.cc` 1755) with no matching increment. The counter goes to -1, and the next overcast leaves it at 0, so it does not darken. Fix: only touch the counter in the overcast branch, and clamp at 0. Our build uses one clamped channel.
2. Fog counter is forced to 0 at night (`gameclk.cc` 204-205), but the fog effect's destructor still decrements (`effects.cc` 1608). A fog that starts or ends at night leaves the counter at -1, so a later day fog shows nothing. Fix: clamp; read night as a draw-time rule, never as a counter write.
3. Dawn and dusk share palette index 1 (`palette.h` 33-34, with the comment "Think this is it."). Not proven wrong. Fix for us: give dusk its own palette entry, or leave it as one and say so in the look test.
4. The `???` on the night fog rule (`gameclk.cc` 205) is the donor's own open question. Our call: fog allowed at dusk, not night.

## 5. Five-minute look test (Dom, on his phone)

Target file (proposed): `src/fight/sky.ts` (new, client presentation only). Parity row: 16 (colour grade/quality). Build a flag on the existing fight scene with four presets, publish to the /preview/ folder (look-test skill, no release rows).

Dom judges, 30 seconds each, on a 375-wide phone:
- A: dawn to day glide (60 steps) with three attackers on screen.
- B: dusk to night glide.
- C: storm, rain at 80 drops, lightning flashes 25 or 50 ms with 4 to 7 s pauses.
- D: day fog with 40 sparkles.

Question: can he read the three silhouettes and the telegraph colour during a lightning flash and during fog? Pick one as the default look.

## 6. Licence and IP

GPL-2.0 (COPYING). The sketch is clean-room: written from the mechanism described here, not a translation of donor lines. Content (the game's maps, palettes, sounds) is not used. Inspiration stays category-level: "a storm that rolls across a zone with a white flash". Recreate as an original: keep the hour glide, the random lightning pause and the egg-style timed event; change the indoor rule, the counters, the flash timing near telegraphs and the particle caps. No legal conclusions.

## 7. Gaps

- Not read: the rain and cloud drawing code (`Rain_effect::paint`, `Clouds_effect::paint`), the palette data, `data/bg/shape_info.txt`, weather calls from usecode scripts (grep showed clock readers only: `objs/egg.cc` 843, 959; `schedule.cc` 426, 680, 737, 1226, 1228; `usecode/intrinsics.cc` 1194, 1221, 3693; `gamedat.cc` 476; `cheat_screen.cc` 1338), `npctime.cc` beyond its hour hook, and `Palette_transition::set_step` after line 772.
- Grep result, for the weather flags (overcast, fog): the only reads outside the weather code are an options-name string (`exult.cc` 2951, 2989) and an options palette label (`gumps/UIOptions_gump.cc` 284). No gameplay read of weather found in what I searched.
- String table `data/exultmsg.txt`: 1141 lines, 904 hex-keyed entries. The only weather-named entries are palette labels at 0xB10 to 0xB18 ("Night Palette", "Dusk", "Overcast" via 0xB13, "Fog", "Lightning"), used by the options screen. No player-facing weather text found.
- Death/respawn presentation, loot ceremony, walk density, and idle creature animation were not read for this topic. The donor has a red hit palette (`palette.h` 41, "Used when hit in combat"), not traced.

## 8. Sketch (typechecked on the VPS with `tsc --noEmit --strict --target es2020`, exit 0)

simplified: the sketch is clean-room. It keeps the donor's order (phase per hour with indoor night, one-hour lookahead for the glide, storm timers, lightning loop, rain ramp, fade step) and fixes the counter drift with one clamped channel. It omits the palette index blend, the particle drawing, the sound choice, the NPC schedule call, the hourly wrap in the donor fade, and the donor's rounding helper beyond the one line shown.

```ts
// Licence: GPL-2.0 (donor). Clean-room sketch of the described mechanism, not a translation of donor lines.
export {};

type Phase = 'dawn' | 'day' | 'dusk' | 'night';
type Rnd = () => number; // returns a value in [0, 1)

// Designer fields (our starting values, not donor values)
const TICKS_PER_MINUTE = 25; // sub-steps per game minute
const DAWN_HOUR = 5;
const DUSK_HOUR = 20;

// Phase for an hour. Indoors reads as night (donor rule; the Pit may override this).
function phaseAt(hour: number, indoors: boolean): Phase {
  if (indoors || hour < DAWN_HOUR) return 'night';
  if (hour === DAWN_HOUR) return 'dawn';
  if (hour < DUSK_HOUR) return 'day';
  if (hour === DUSK_HOUR) return 'dusk';
  return 'night';
}

// The palette fade starts inside the current hour and lands on the next hour's phase.
function fadeFor(hour: number, indoors: boolean): { from: Phase; to: Phase } {
  return { from: phaseAt(hour, indoors), to: phaseAt((hour + 1) % 24, indoors) };
}

// Clock increments are rounded to the nearest 15 game minutes.
function roundToQuarterHour(minutes: number): number {
  const n = minutes + 7;
  return n - (n % 15);
}

// Nocturnal eggs and night checks: 21:00 to 04:59.
function isNocturnal(hour: number): boolean {
  return hour >= 21 || hour <= 4;
}

// Hourly chime strikes hour % 12, with 0 meaning 12 strikes.
function chimeStrikes(hour: number): number {
  const r = hour % 12;
  return r === 0 ? 12 : r;
}

// Weather egg: one packed field. Low byte = kind (0-6), high byte = minutes; 0 minutes = continuous (6000).
function decodeWeatherEgg(d1: number): { kind: number; minutes: number } {
  const raw = (d1 >> 8) & 0xff;
  return { kind: d1 & 0xff, minutes: raw === 0 ? 6000 : raw };
}

// Storm timers, in ms from the egg firing and in game minutes for the ends.
interface StormPlan {
  rainAtMs: number;
  lightningAtMs: number;
  rainEndMin: number;
  lightningEndMin: number;
}

function planStorm(minutes: number, rnd: Rnd): StormPlan {
  const rainAtMs = 20 + Math.floor(rnd() * 1000);
  return {
    rainAtMs,
    lightningAtMs: rainAtMs + Math.floor(rnd() * 500),
    rainEndMin: minutes + 2,
    lightningEndMin: minutes - 2,
  };
}

// One lightning flash: 25 or 50 ms, then a quick re-flash (1 in 50) or a 4.0 to 6.99 s pause.
function flashMs(rnd: Rnd): number {
  return (1 + Math.floor(rnd() * 2)) * 25;
}

function pauseAfterFlashMs(rnd: Rnd): number {
  const r = Math.floor(rnd() * 1000000);
  return r % 50 === 0 ? (1 + (r % 7)) * 40 : 4000 + (r % 3000);
}

// Gradual rain, checked every 100 ms: ramps up while on, down after the storm ends.
function rainDrops(current: number, on: boolean, rnd: Rnd, cap: number): number {
  if (on) return Math.min(cap, current + Math.floor(rnd() * 5));
  return Math.max(0, current - Math.floor(rnd() * 15));
}

// Palette fade step: elapsed ticks over ticks-per-step, capped at the step count.
// Hourly fade: ticksPerStep = TICKS_PER_MINUTE, steps = 60. Weather fade: ticksPerStep = 1, steps = 20.
function fadeStep(elapsedTicks: number, ticksPerStep: number, steps: number): number {
  return Math.min(Math.floor(elapsedTicks / ticksPerStep), steps);
}

// Fixed counter: one clamped counter per weather channel. Night never writes the counter.
class Channel {
  private n = 0;
  start(): void {
    this.n += 1;
  }
  end(): void {
    this.n = Math.max(0, this.n - 1);
  }
  isOn(): boolean {
    return this.n > 0;
  }
}

// Fog and overcast show only in dawn and day phases (donor rule), decided at draw time.
function fogVisible(fog: Channel, phase: Phase): boolean {
  return fog.isOn() && (phase === 'dawn' || phase === 'day');
}

function overcastVisible(overcast: Channel, phase: Phase): boolean {
  return overcast.isOn() && (phase === 'dawn' || phase === 'day');
}
```

Reuse tag: new (sky clock and weather timers). No other lane's weather code was searched (not read).
Brief rule served: feel note for weather-time-light; rule and data fields given; GPL so clean-room only.
