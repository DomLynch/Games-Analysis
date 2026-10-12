# CleverRaven-Cataclysm-DDA (sound-music, cell 15)

Donor: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/sounds.cpp` (with `src/sdlsound.cpp`, `src/sound_backend_sdl3.cpp`, `src/sounds.h`, `src/music.cpp`) | Licence: CC-BY-SA 3.0 Unported (LICENSE.txt, first line: "Cataclysm is licensed under the Creative Commons Attribution-ShareAlike 3.0 Unported License") | C++ | symbols `sfx::do_ambient`, `sfx::do_danger_music`, `sfx::play_ambient_variant_sound`

Checked: confidence high for the ambience, danger-theme and volume mechanisms (read in full: `sfx::do_ambient` 1142-1318, `sfx::do_danger_music` 1596-1657, `sfx::do_low_stamina_sfx` 1659-1719, fade and query functions 843-893, `sound_distance` 254-274, `sfx::get_heard_volume` 2093-2104; `sdlsound.cpp` 340-362, 400-517, 544-638, 688-791; `sound_backend_sdl3.cpp` 47-53, 189, 318-343, 374-391, 503-545; `sounds.h` 24-38, 103-135; `music.cpp` whole file). camera_scope: n/a (sound cell). Not read: the sound-effect and playlist data (the donor box holds only `data/sound/Menu_Sound_Test/soundset.json` with 2 menu entries and an empty `musicset.json`, so the real environment, weather and danger beds are not in the box); the body of `sound_thread` (1448-1529); the meaning of the `40` argument to `get_visible_creatures`. Spell sounds: `magic.cpp` and `spell.cpp` make no `sfx` call (grep, no hit); the only spell-like sound is a monster lightning attack (`monattack.cpp` 860). Biome beds: the donor has none keyed by biome (see section 6).

## 1. Mechanism

- Layers are independent channels, not one music stream. `sounds.h` 103-135 defines a fixed channel enum: a daytime bed, a night bed, underground, indoors, indoor rain, outdoor weather beds (snow, flurry, thunderstorm, rainstorm, rain, drizzle, blizzard, portal storm, clear, cloudy, sunny), deafness tone, four danger themes, three stamina cues, chainsaw, player activity, engine sounds, radio. There are 30 reserved slots (MAX_CHANNEL at index 30, counted from the enum).
- Ambient beds (`sfx::do_ambient`, 1142-1318). Each frame the code computes sleep, night, underground, sheltered, weather change, season, indoors. Then it picks at most one bed per branch and starts it only if its channel is not already playing:
  - night (1169-1174): fade the time-of-day group out for 1000 ms, then play the `environment/nighttime` variant on the night channel with a 1000 ms fade-in;
  - day (1176-1181): the same with `daytime`;
  - underground (1184-1191) and indoors (1193-1201): the same pattern, also fading the weather group;
  - indoor rain (1205-1209): a separate channel on top of the indoors bed;
  - outdoor weather (1236-1314): if weather changed or no outdoor bed plays, fade the weather group and each outdoor channel for 1000 ms, then play the bed chosen by weather sound category (`switch`, 1244-1305).
- Crossfade. A bed change is "fade the old group out for N ms, start the new channel with a fade-in of N ms" in the same frame (1171-1174 with the fade-in at 1174). Both run at once, so the old and new layers cross over for 1000 ms. The backend fade is a real track fade (`MIX_StopTrack` with a frame count, sound_backend_sdl3.cpp 391), and a track already fading is not re-armed (388, 533).
- Sleep (1149-1155): the whole mix fades out over 300 ms once; while asleep it returns without touching channels. The danger-music function has its own sleep path: it fades all audio in 100 ms once, then keeps fading the context-themes group, and an active chainsaw theme also suppresses the danger themes (1604-1615).
- Danger music (`sfx::do_danger_music`, 1596-1657). The player's visible creatures (`get_visible_creatures( 40 )`, 1618) are counted when `attitude_to` is HOSTILE (1619). Then:
  - if the count equals the last count, return (1623-1625);
  - 0 to 4: fade the context-themes group out for 1000 ms and remember the count (1626-1629);
  - 5 to 9: theme `danger_low` at volume 100 on its channel, group fade 1000 ms, fade-in 1000 ms (1630-1635);
  - 10 to 14: `danger_medium` (1636-1642);
  - 15 to 19: `danger_high` (1643-1648);
  - 20 or more: `danger_extreme` (1649-1654).
  The theme plays only if its own channel is not already playing. A count inside a tier that is already playing does nothing except update the count. The four theme channels share the `context_themes` group (sdlsound.cpp 351-353), so the group fade is what removes the previous theme. The weather group covers only the channels from `underground_env` to `outdoor_blizzard` (347-350); the portal storm, clear, cloudy and sunny channels (sounds.h 128-131) are outside it and are not faded by the group fade.
- Stamina cues (`sfx::do_low_stamina_sfx`, 1659-1719): at or above 75 percent of max stamina the low-stamina group fades out over 2000 ms (1673-1675); at 74 to 50 percent a low fatigue cue plays on its own channel; 49 to 25 percent a medium cue; 24 to 0 percent a high cue. Separate male and female variants (1680-1715).
- Positional volume (`sounds.cpp` 254-274, 2093-2104). Sound distance is planar distance plus a vertical term (263-273): the vertical displacement, plus 4 when the lower level is underground and the displacement is above 0, plus 20 for each further underground level, and the whole vertical term is then scaled by 5. This underground rule is a reusable mechanism for zones and levels. Heard volume is `int heard_volume = fract * distance - 1 + 100` with `fract = -4.166666` (2097-2098), floored at 0, then multiplied by a deaf multiplier of 0.1 (2102, set at 1731). Worked from the formula: 3 at distance 23 and 0 at distance 24.
- Hits and stingers. A projectile hit on a monster picks a variant by material with a fleshy check first: a monster made of any fleshy material always gets `hit_flesh`; otherwise stone gives `hit_wall`, steel `hit_metal`, else `hit_flesh` (1551-1567), with random pitch from 0.8 to 1.2 (1557). Death plays `clean_up_at_end` with `death_m` or `death_f` (1589-1593), no pitch jitter. Melee sounds run on a detached thread per call (1433-1437).
- Variant lookup (`sdlsound.cpp` 639-651, 688-718). A sound id plus variant key includes season, indoors and night; a random entry is chosen among matches (650); if none match, the `default` variant is tried (705).
- Playlists (`sdlsound.cpp` 400-476, `music.cpp` 30-31). Music is a flat list of modes (`mp3`, `instrument`, `sound`, `title`) with one playlist each. A change calls `stop_music()`, which stops with 0 ms (485): a hard cut, no crossfade.

## 2. Key functions

- `sfx::do_ambient`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/sounds.cpp` 1142-1318. Picks one bed per branch, fades the group out over 1000 ms and starts the new bed with a 1000 ms fade-in.
- `sfx::do_danger_music`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/sounds.cpp` 1596-1657. Hostile count to theme tier, group crossfade, no hysteresis.
- `sfx::do_low_stamina_sfx`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/sounds.cpp` 1659-1719. Stamina threshold cues by channel.
- `sfx::play_ambient_variant_sound` (sdlsound.cpp 753-791): skips when the channel is already playing (764), scales volume (780-788), plays on the reserved channel with fade-in (790).
- `sound_backend::stop_reserved` and `fade_group` (sound_backend_sdl3.cpp 374-393, 511-539): per-track fade-out; a track already fading is not re-armed.
- `sounds::sound` (sounds.cpp 322-344): records each sound event and whether it is provocative to monsters (`is_provocative`, 292-314). The category is not used for audio priority.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Layer per channel; one bed per channel; a playing channel is not restarted | 30 reserved channel slots (theirs, sounds.h 135) |
| Bed change = group fade-out and fade-in of the same length, run together | 1000 ms for beds and themes (theirs, sounds.cpp 1171, 1631); 300 ms sleep mute (1150); 2000 ms stamina group fade (1674) |
| Danger tier from a hostile count within a radius | Thresholds 5 / 10 / 15 / 20 (theirs, 1626-1649); radius argument 40 (theirs, 1618; meaning not read) |
| Tier theme volume | 100 (theirs, 1633 and the other tier calls) |
| Distance attenuation with a vertical penalty | Per-tile slope 4.166666 (theirs, 2097); base 99 (theirs, 2098); vertical scale 5 (theirs, 272) |
| Pitch jitter on repeated hits | 0.8 to 1.2 (theirs, 1557) |
| Stamina cue levels | 75 / 50 / 25 percent (theirs, 1673-1699) |
| Priority | None in audio. `sound_t` order (sounds.h 24-38) is recorded but not used for voices. |
| Voice limit | None found. One track per reserved slot (sound_backend_sdl3.cpp 189), one new track per one-shot (343), melee on a new detached thread (sounds.cpp 1433-1437). |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's tier thresholds and 1000 ms crossfade and adds the two things the donor lacks: a leave margin (hysteresis) on the tier edges, and a voice cap that steals the lowest-ranked voice. It omits the channel and group tables, the weather branches, sleep and deafness, the stamina cues, the positional volume, and the backend track handling. `VOICE_CAP` and `TIER_LEAVE_MARGIN` are proposals, not donor values. Typechecked on the VPS with `tsc --strict --target es2020` (exit 0).

```ts
// Licence: CC-BY-SA 3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Ideas kept: independent layer channels, group fades (1000 ms out, 1000 ms in), hostile-count danger tiers.
// Defects fixed: no hysteresis at tier edges; no voice cap (donor has none).

const TIER_ENTER: number[] = [5, 10, 15, 20];   // donor thresholds (sounds.cpp 1626-1649), zone data
const TIER_LEAVE_MARGIN = 2;                     // fix: a tier is left only when the count falls 2 below its entry (proposed)
const THEME_FADE_MS = 1000;                      // donor (sounds.cpp 1631, 1633)
const VOICE_CAP = 32;                            // proposed; the donor has no cap (sound_backend_sdl3.cpp 343)

// Tier 0 = quiet. Tier n = the n-th danger theme.
function tierFor(hostiles: number, current: number): number {
  let tier = 0;
  for (let t = 0; t < TIER_ENTER.length; t++) {
    const holding = current >= t + 1;            // already in this tier or higher
    const threshold = holding ? TIER_ENTER[t] - TIER_LEAVE_MARGIN : TIER_ENTER[t];
    if (hostiles >= threshold) tier = t + 1;
  }
  return tier;
}

interface Step { op: "fadeGroup" | "playIn"; group: string; ms: number; id?: string; }

// Crossfade plan: fade the old theme out and bring the new one in over the same window.
function crossfadePlan(group: string, nextId: string | null): Step[] {
  const steps: Step[] = [{ op: "fadeGroup", group, ms: THEME_FADE_MS }];
  if (nextId !== null) steps.push({ op: "playIn", group, ms: THEME_FADE_MS, id: nextId });
  return steps;
}

// Voice admission with priority. Priority = donor sound_t order (sounds.h 24-38); the donor records it but never steals voices with it.
const PRIO: Record<string, number> = {
  background: 0, weather: 1, sensory: 2, music: 3, movement: 4, speech: 5, electronic_speech: 6,
  activity: 7, destructive_activity: 8, alarm: 9, combat: 10, alert: 11, order: 12,
};

interface Voice { id: string; prio: number; startedAt: number; }

function admit(voices: Voice[], v: Voice): boolean {
  if (voices.length < VOICE_CAP) { voices.push(v); return true; }
  let low = 0;
  for (let i = 1; i < voices.length; i++) {
    const a = voices[i], b = voices[low];
    if (a.prio < b.prio || (a.prio === b.prio && a.startedAt < b.startedAt)) low = i;
  }
  if (voices[low].prio >= v.prio) return false;  // newcomer is not louder in rank: drop it
  voices.splice(low, 1);
  voices.push(v);
  return true;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/sound-layers.ts` (new, client-only: the mixer model reads engine events and never changes state; the engine never imports it). Parity-checklist row 12 (combat sound cues). Note: the list hint said row 14, but row 14 is HUD; the mechanism here is audio, so row 12 is the closer row. Confirm with Lead.
- Use in the fight: the danger-theme tier is driven by engaged attackers and the hate list (MAX_ATTACKERS = 3), not by a 40-tile visible-creature count, because a duel is one to three attackers. Stingers: a death cue on the death event; a hit cue chosen by surface and hit kind; both client-side.
- Reuse tag: rewrite-from-idea (CC-BY-SA 3.0: clean-room, shape only; no lines copied)
- Brief rule served: client-only sound layer (one engine; sound reads events and never changes state); rules 7-9 n/a

## 6. Gaps and risks

- Licence is CC-BY-SA 3.0 (copyleft, share-alike). Clean-room only; the sketch is written from the described mechanism.
- No biome beds. The donor has no ambient bed keyed by biome or terrain. The only terrain key is the footstep variant (`sounds.cpp` 1897-1898, `has_variant_sound( "plmove", terrain.str(), ...)`). Frankendom's zones-as-data need per-zone beds, so this is a gap to fill in our data, not a donor pattern.
- Hysteresis is missing (defect). The donor switches tiers at exact counts (1626-1653), so a count that flickers between 4 and 5 restarts the theme each time. Fix: the leave margin in the sketch (`TIER_LEAVE_MARGIN`, proposed value 2).
- Voice limit is missing (defect). One-shots create a new track per play (sound_backend_sdl3.cpp 343) and melee sounds start a detached thread per call (sounds.cpp 1433-1437). A busy fight with many hits can grow without a cap. Fix: the voice pool in the sketch, with a cap and steal-by-rank.
- Priority is unused (defect, idea kept). `sound_t` is ordered (sounds.h 24-38) and used only to mark sounds as provocative (292-314, 339). Fix: use the order to steal voices, as in the sketch.
- Effect volume is applied twice on purpose (not a defect). The donor's own comment documents `effect.volume^2 * AMBIENT_SOUND_VOLUME * SOUND_EFFECT_VOLUME * volume / 1e8` (sdlsound.cpp 777-788): `volume` is reassigned at 781 and reused at 788. Keep it as a squared effect-volume curve if a quiet-biased mix is wanted; otherwise apply once.
- Music switches are hard cuts (sdlsound.cpp 446, 485: `stop_music( 0 )`). Fix: fade the old track with the same 1000 ms window used for beds.
- The data half is absent from the box (see Checked). The sound-effect and playlist JSON are loaded in `sdlsound.cpp` 544-638, but the values for each bed are not in this donor, so no bed volumes or file lists are claimed here.
- The `40` radius in `get_visible_creatures` was not checked against its implementation; the tier count depends on it.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- Vertical term 'scaled by 5' was incomplete: sound_distance adds +4 for the first underground level and +20 per further level before the x5 (sounds.cpp 263-272). Confirmed, fixed.
- Weather group fade does not cover portal storm/clear/cloudy/sunny (group range underground_env..outdoor_blizzard, sdlsound.cpp 347-350). Confirmed, added.
- Projectile-hit branch has an is_fleshy precedence (1551-1567). Confirmed, fixed.
- 'Volume applied twice' flagged as a possible defect: the checker is right that the donor documents the effect.volume^2 formula; reworded as intended, not a defect.
- Missed: do_danger_music sleep fades all audio in 100 ms and an active chainsaw theme suppresses danger themes (1604-1615); underground attenuation rule is reusable. Confirmed, added.

Fixed 2026-10-12: vertical attenuation, weather group range, is_fleshy precedence, double-volume claim, danger sleep/chainsaw. Sketch unchanged (it omits positional volume and weather).
