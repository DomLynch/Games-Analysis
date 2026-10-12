# daggerfall-unity (sound-music, cell 1)

Donor: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/AmbientEffectsPlayer.cs` | Licence: MIT License (LICENSE line 1; file header line 4) | C# | symbol `AmbientEffectsPlayer` (Update, PlayEffects, StartWaiting, ApplyPresets)

Checked: Read in full: `Game/AmbientEffectsPlayer.cs` (1-558), `Game/EnemySounds.cs` (20-254), `Internal/AudioSourceExtensionMethods.cs` (whole file, 53 lines). Read in part: `Game/SongManager.cs` (1-700 of 1034; the playlist tables 700-1034 are not read), `Internal/DaggerfallSongPlayer.cs` (27-215 and 336-420 of 519; the MIDI loader and synth setup are not read), `Game/WeatherManager.cs` (350-385). Grep only: `Internal/DaggerfallAudioSource.cs` (no priority or voice-cap code found), `SoundClips.cs` (the hint file; it is the clip id table, not the mechanism). Candidates opened: AmbientEffectsPlayer, SongManager, DaggerfallSongPlayer, EnemySounds, AudioSourceExtensionMethods, WeatherManager, SoundClips (7). Confidence: high on the ambience scheduler and the hard cuts; medium on the music side, since the playlist tables and the quest PlaySong action (`Game/Questing/Actions/PlaySong.cs`, not read) were not read. Hit and spell sounds: the hit and parry one-shots are read (EnemySounds 116-141); the spell sound path is (not read).

Best transferable idea: a per-zone ambience bed that loops one bed and fires at most one random one-shot at a time after a random wait window, with a single shared gate so one-shots never stack.

Decision (proposed): adapt — the scheduler shape (preset per zone, random wait window, one shared ambient slot, ring placement) fits zones as data; the donor's hard cut on a preset change and its isPlaying-based gate are defects, so the sketch ramps the loop and uses a busy flag set at call time.
Acceptance: a client test with a fake clock: entering a rain zone fades the rain loop to full gain within 2.0 s; over 600 simulated seconds no two ambient one-shots overlap; a zone with an empty one-shot list plays only its loop.

## 1. Mechanism

- Driver: `Update` runs every frame and calls `PlayEffects` when the countdown passes the wait. The countdown adds `Time.deltaTime` (variable step, not fixed) (A:146-152). The donor's `StartWaiting` restarts the countdown after every fire, whether or not a sound plays (A:148-151, A:399-404).
- Preset choice (the bed for the place and weather): `WeatherManager.SetAmbientEffects` checks rain and storm first, then day or night (W:360-383). Rain alone gives `Rain`, rain with storm gives `Storm`, day gives `SunnyDay`, night gives `ClearNight`, anything else gives `None`. So weather beats time of day.
- Preset change is a hard cut (A:114-131): when `Presets` differs from `lastPresets`, the loop is stopped and its clip cleared at once (A:122-127), the presets are applied (A:129, A:413-465), and the countdown restarts (A:130). There is no fade.
- Loop beds: `Rain` and `Storm` loop the rain clip (A:134-137); `ClearNight` loops the crickets clip (A:140-143). `SunnyDay` and `Dungeon` have no loop, only one-shots (A:417-436, A:448-455). The loop volume follows the SoundVolume setting each frame (A:189-190).
- One-shot pool: each preset has a list; `PlayEffects` picks an index with `random.Next(0, ambientSounds.Length)` (A:268). A dungeon one-shot list is about 14 clips (A:419-434).
- Gate: the one ambient `AudioSource` is shared by the ordinary one-shots (A:217-225), the spatial one-shots (A:228-239), and the water sounds (A:176, A:182). A new one-shot is skipped while that source reports `isPlaying` (A:219, A:230). It is a skip, not a queue.
- Castle: one-shots are dropped inside castle blocks when `doNotPlayInCastle` is set (A:290-298). The loop is not affected by that check.
- Placement: a one-shot lands `Random.onUnitSphere * radius` from the player, radius = sqrt of a uniform value between 10^2 and 20^2 (A:246-251, A:249). The horizon version uses a bearing and a 3000-unit max distance (A:253-259, A:258). The spatial max distance is min distance x 8 (A:236). Spread is 45 for the Dungeon preset (the only interior preset) and 15 for Storm and SunnyDay (A:435, A:454, A:470, A:476).
- Storm lightning: a distant strike runs 20 to 29 flashes (A:353-354, exclusive upper bound), then a 1.7 s wait, then the rolling thunder sound on the horizon (A:355, A:393). Each flash sets the light intensity to 2 and then back to its start value (A:374, A:380). This is a stinger-style pairing (light first, sound later), though it is not a music stinger.
- Cemetery: a separate countdown with its own range, 1 to 80 s (A:28-29, A:406-411), plays a distant howl or a creepy bird call around the player (A:45-50, A:308-320). It goes through the same shared gate (A:246-251 and A:228-239).
- Water: a 50/100 chance check every `classicUpdateInterval` (A:165-186, value not read: `GameManager.classicUpdateInterval = 0.0625f` is at GameManager.cs:42, read by grep only).

Music (`SongManager` and `DaggerfallSongPlayer`) is a related but separate mechanism:
- The context is re-checked every frame (S:198-209). A new song is picked only when the playlist changes, the game day changes or the location changes (S:222-226). If the song has stopped, the same song is restarted (S:229-230). The context holds environment, weather, time, game day, location and the arrested flag (S:62-80, S:69).
- Context to playlist (S:573-655). Arrest overrides everything with the court list (S:576-580). Taverns share the day's song in sequence (S:342-344). Dungeons pick a song from a seed built from the dungeon header and region (S:347-360, S:357). Most places pick by game day (S:368-372).
- Starting a song first calls `Stop()` (P:153-154). There is no crossfade, and no second layer: one `MidiFileSequencer` (P:51). Synth polyphony is 100 voices (P:32). Output is `sampleBuffer * Gain` (P:401, Gain 5.0 at P:44).

Sound cues in combat (`EnemySounds`, the enemy-side cues):
- Attract: the countdown runs always, but the sound fires only if the player is inside `AttractRadius` of 16 (E:26, E:94-98). The wait is an integer from 3 to 9 s (E:27-28, E:199).
- Occlusion: from the enemy toward the player, one raycast (E:236-238). If the hit is static geometry or a door, the volume scale is 0.25 (E:244-249). A hit on the player is ignored (E:241-242).
- Hit: with a weapon, `Hit1` plus 0 to 4 (E:123); without, `Hit1` plus 2 or 3 (E:127); volume scale 1.1 (E:130).
- Combat voice: a pitch jitter of 0 to 0.3 is added for one call, then restored (E:172-175).

## 2. Key functions

- `AmbientEffectsPlayer.Update`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/AmbientEffectsPlayer.cs` 108-191. Preset switch (114-131), loops (134-143), countdown and fire (146-152), water (164-186), loop volume (189-190).
- `AmbientEffectsPlayer.PlayEffects`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/AmbientEffectsPlayer.cs` 261-306. Castle check (290-298), index (268), storm branch (271-287), general branch with placement (300-304).
- Gate: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/AmbientEffectsPlayer.cs` 217-239 (`AmbientPlayOneShot` 217-225 and `SpatializedPlayOneShot` 228-239).
- `WeatherManager.SetAmbientEffects`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/WeatherManager.cs` 354-384 (priority order).
- Load wait: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Internal/AudioSourceExtensionMethods.cs` 23-51 (`PlayOneShotWhenReady` and `WhenClipReadyCoroutine`; gives up after 0.150 s, line 9).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Random integer wait window between one-shots, countdown on frame time | Min 4 s, max 35 s (theirs, A:26-27); cemetery 1 to 80 s (theirs, A:28-29) |
| Shared single slot: skip a one-shot while the slot is busy | Slot is shared by one-shots, spatial one-shots and water (theirs, A:217-239) |
| Ring placement around the listener, radius between 10 and 20 units | sqrt of a uniform between 10^2 and 20^2 (theirs, A:249); max distance = 8 x min distance (theirs, A:236) |
| Preset priority: weather before time of day | Rain and storm before day and night (theirs, W:360-383) |
| Stinger pairing: a visual then a delayed sound | 20 to 29 flashes, then 1.7 s (theirs, A:353-355) |
| Hard cut on preset change | None (the donor does not fade; this is the defect we fix) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (ramp, countdown, then skip if suppressed or busy, otherwise emit), with the same integer waits and sqrt ring radius. It omits the lightning sequence, the water sounds, the cemetery timer, the horizon bearing and the donor's full sphere (we use a flat ring), the spread angles, and the load wait (the 0.150 s give-up is not modelled). Fixes made: the loop ramps over `fadeSeconds` instead of stopping at once, and `busy` is set when the one-shot is emitted and cleared by `clipEnded`, instead of reading an `isPlaying` flag that lags a clip load.

```ts
// Licence: MIT (donor, Daggerfall Unity). Shape adapted; code written fresh for this sketch.
export type Preset = 'none' | 'rain' | 'storm' | 'sunny' | 'night';

export interface PresetSpec {
  loop: string | null;     // looped bed id, or null
  oneShots: string[];      // one-shot ids, picked at random
  minWait: number;         // seconds, integer; donor MinWaitTime = 4
  maxWait: number;         // seconds, exclusive upper bound; donor MaxWaitTime = 35
  fadeSeconds: number;     // fix: donor hard-cuts the loop; we ramp it
}

export const PRESETS: Record<Preset, PresetSpec> = {
  none:  { loop: null,           oneShots: [],                              minWait: 4, maxWait: 35, fadeSeconds: 2 },
  rain:  { loop: 'rain-loop',    oneShots: [],                              minWait: 4, maxWait: 35, fadeSeconds: 2 },
  storm: { loop: 'rain-loop',    oneShots: ['thunder-far', 'thunder-roll'], minWait: 4, maxWait: 35, fadeSeconds: 2 },
  sunny: { loop: null,           oneShots: ['bird-a', 'bird-b'],           minWait: 4, maxWait: 35, fadeSeconds: 2 },
  night: { loop: 'crickets-loop', oneShots: [],                              minWait: 4, maxWait: 35, fadeSeconds: 2 },
};

// Priority: rain or storm beat day/night (donor WeatherManager.SetAmbientEffects order).
export function pickPreset(raining: boolean, storming: boolean, isDay: boolean): Preset {
  if (raining) return storming ? 'storm' : 'rain';
  return isDay ? 'sunny' : 'night';
}

export interface Bed {
  preset: Preset;
  loopGain: number;   // 0..1, ramped toward loopTarget
  loopTarget: number;
  waitLeft: number;   // seconds until the next one-shot
  busy: boolean;      // at most one ambient one-shot at a time
}

export interface Rng {
  int(min: number, maxExclusive: number): number;
  unit(): number; // 0 <= x < 1
}

export type Pt = { x: number; z: number };
export type Emit = (clipId: string, at: Pt) => void;

export function setPreset(b: Bed, p: Preset, rng: Rng): void {
  b.preset = p;
  b.loopTarget = PRESETS[p].loop !== null ? 1 : 0;
  b.waitLeft = rng.int(PRESETS[p].minWait, PRESETS[p].maxWait);
}

// Called every frame with real dt (variable step, like the donor's Time.deltaTime).
export function tick(b: Bed, dt: number, player: Pt, suppressed: boolean, rng: Rng, emit: Emit): void {
  const spec = PRESETS[b.preset];
  const step = dt / spec.fadeSeconds;
  b.loopGain = b.loopGain < b.loopTarget
    ? Math.min(b.loopTarget, b.loopGain + step)
    : Math.max(b.loopTarget, b.loopGain - step);

  b.waitLeft -= dt;
  if (b.waitLeft > 0) return;
  // Like the donor, the countdown restarts whether or not a sound plays. A blocked sound is skipped, not queued.
  b.waitLeft = rng.int(spec.minWait, spec.maxWait);
  if (suppressed || spec.oneShots.length === 0 || b.busy) return;

  const id = spec.oneShots[rng.int(0, spec.oneShots.length)];
  const radius = Math.sqrt(100 + rng.unit() * 300); // donor: sqrt(Random.Range(10^2, 20^2))
  const angle = rng.unit() * 2 * Math.PI;
  b.busy = true; // set now, not read back from the player (donor reads isPlaying, which lags a clip load)
  emit(id, { x: player.x + Math.cos(angle) * radius, z: player.z + Math.sin(angle) * radius });
}

// The caller must call this when the one-shot finishes or is dropped.
export function clipEnded(b: Bed): void {
  b.busy = false;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/SM011-daggerfall-ambience.ts`: exit 0.

## 5. Lands in

- TARGET `origins/zone-audio.ts` (new, client-only; zone data picks the preset per zone, the engine and server do not read it). Parity-checklist row 12 (combat sound cues) is the nearest row; ambience has no row of its own, so this is a gap for Lead to rule on. The combat-side cues (attract, hit, parry, occlusion, EnemySounds 95-251) would land in `src/fight/` under row 12 as well.
- Reuse tag: adapt-permitted (MIT; shape adapted, sketch written fresh)
- Brief rule served: zones as data (preset and clip lists are zone data); client-only, so no server rule is touched.

## 6. Gaps and risks

- No crossfade in the donor: `Update` stops and clears the loop at once on a preset change (A:122-127). Frankendom needs the ramp (sketch, `fadeSeconds`). Pick the fade time per zone, not in code.
- Presets are chosen by global weather and time (W:360-383), not by zone. Frankendom's ambience must come from the zone the player is in (zones as data). The donor's priority rule (weather before time) can be kept, with the zone supplying the bed.
- The busy gate reads `isPlaying` (A:219, A:230), but `PlayOneShotWhenReady` plays only after the clip has loaded (AudioSourceExtensionMethods 23-31, 39-51). Two calls before playback can both pass the gate. Fix: the busy flag in the sketch.
- Clip load give-up: a clip not loaded within 0.150 s is dropped silently (AudioSourceExtensionMethods 9, 46-47). On a phone this will drop sounds. Fix: preload zone clips on zone entry, or log drops.
- Horizon bearing: `Quaternion.AngleAxis(Mathf.Sqrt(Random.Range(0f, sqr(10000f))), Vector3.up)` (A:257) is not a uniform angle: sqrt of a uniform value up to 10000^2 has a density that rises with the value, so bearings near the top of the range are a bit more likely. My hand arithmetic puts the skew at single-digit percent after the wrap; not run. Fix: `Random.Range(0, 360)`. Keep the idea (a horizon sound far away), fix the draw.
- One shared slot for ambience, water and cemetery sounds means a water bubble can block a bird call. Frankendom should decide whether ambience gets its own slot per zone.
- Music: the donor has no layering (one sequencer, P:51) and no crossfade (P:153-154). Layering and stingers would be new design, not taken from the donor. The day-seeded song pick (S:370) is deterministic per game day, so the same song plays all day in a place. This is a single-player donor with no multiplayer clock; it only helps Frankendom if zones share one clock.
- Lightning stinger timing (flash count, then 1.7 s, A:353-355) is worth testing as data for a boss or wave cue, but it is light-plus-sound and needs a client-side light.
- Not read: `Questing/Actions/PlaySong.cs` (the quest stinger path), the MIDI loader and synth (`DaggerfallSongPlayer.cs` 216-335), and the playlist tables (`SongManager.cs` 700-1034).

Best transferable idea: a zone-level ambience bed with one loop and one shared one-shot slot that skips rather than queues, drawing its wait from a random window.

## Reuse tag
adapt-permitted (MIT)

## Brief rule served
Zones as data (the preset, loop id and one-shot list are zone data); client-only; no server rule touched. Parity row 12 is the nearest row, flagged above as a gap.
