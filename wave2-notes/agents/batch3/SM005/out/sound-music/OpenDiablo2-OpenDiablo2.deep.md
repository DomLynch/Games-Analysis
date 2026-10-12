# OpenDiablo2-OpenDiablo2 (sound-music, cell 1)

Donor: `/mnt/frankendom-donors/OpenDiablo2-OpenDiablo2/d2core/d2audio/sound_environment.go` | Licence: GPL-3.0 (root LICENSE file, "Version 3, 29 June 2007"; no per-file licence header read) | Go | symbol `SoundEnvironment.SetEnv` (with `SoundEnvironment.Advance`, `SoundEngine.Advance`, `Sound.update`)

Checked: The list's hint file `d2common/d2interface/audio_provider.go` is a 9-line interface (PlayBGM, LoadSound, SetVolumes) and was opened; it is not the mechanism. I read in full: `d2core/d2audio/sound_environment.go` (69 lines), `d2core/d2audio/sound_engine.go` (269 lines), `d2core/d2audio/ebiten/ebiten_audio_provider.go` (182 lines), `d2core/d2audio/ebiten/ebiten_sound_effect.go` (91 lines), and the record loaders `d2core/d2records/sound_details_loader.go`, `sound_environment_loader.go`, `sound_environment_record.go`, `sound_details_record.go`. I read `d2game/d2gamescreen/game.go` lines 225-290 (the caller loop). Grep over the whole donor for PlayBGM, Night, Priority, GroupSize, SetEnv and PlaySoundID found the callers listed below. Confidence: high on the layering and fades (read end to end). Not read: the sound and environment data files (sounds.txt, the SoundEnvironment and Level tables are not in the donor box, so every numeric value is "(not read)"), the ebiten library internals, and the wav content. The step cadence `s.timer = 0.2` is at sound_engine.go line 180, a 13-character line, so it has no receipt under the 15-character floor; the line was read.

camera_scope: not applicable (sound topic).

## 1. Mechanism

- Two layers of sound are set per region. A map tile has a region type; the level record for that region holds a `SoundEnv` index (game.go 248-249; level_details_loader.go 139). That index selects a `SoundEnvironRecord` with: a song (`Song`), a day ambience bed (`DayAmbience`), a one-shot day event (`DayEvent`) and an event delay (`EventDelay`).
- Region check, polled, not event-driven: the game loop adds elapsed time and, when `ticksSinceLevelCheck` passes 1 second, it resets it to 0 and calls `SetEnv` for the tile under the local player (game.go 240-249). So a region change is noticed at most about one second after the player crosses the border.
- `SetEnv` (sound_environment.go 32-54) does nothing when the index is unchanged. Otherwise it handles the song and the ambience separately. If the song id differs, the old song is stopped (`bgm.Stop()`, line 38) and the new song is started (line 41). If the ambience id differs, the same happens for `ambiance` (lines 44-50). The two stop/start pairs are not synchronised: the old sound's fade-out and the new sound's fade-in run at the same time, so a crossfade is the overlap of the two record fade lengths. Where the song id is the same across two regions, the song keeps playing without a restart.
- One-shot events (`Advance`, sound_environment.go 57-68): a timer counts down by elapsed seconds. When it goes below 0 it is reset to `EventDelay / 25` seconds (line 60; `assumedFPS` = 25 at line 9), plays `DayEvent`, and sets the event's stereo pan to a uniform random value from -1 to 1 (line 65).
- Playing a sound (`SoundEngine.PlaySoundID`, sound_engine.go 201-231): if the record has a group size, a uniform random variant is chosen (line 210). The sample is loaded and wrapped in a `Sound` with an envelope, put in the `sounds` map (line 226) and started with `Play` (line 228).
- Envelope (`Sound.Play` 76-91, `Sound.Stop` 94-105, `Sound.update` 45-68). A fade-in record (`FadeIn != 0`, line 80) starts in attack at volume 0 (line 83) and rises at `vTarget / (FadeIn / 25)` per second (line 85). Without a fade-in it sustains at once at `Volume / 255`. A stop with a fade-out (`FadeOut != 0`, line 95) enters release and falls at `volume / (FadeOut / 25)` per second (line 98). When volume drops below 0 the effect is stopped (line 60-61). Without a fade-out, stop is immediate (lines 99-103).
- Engine cadence (`SoundEngine.Advance`, sound_engine.go 161-183): the engine accumulates elapsed time (line 163). Every 0.2 seconds (line 180) it calls `update` on each live sound with the accumulated time, removes finished or stopped sounds (lines 170-177), and resets the accumulator (line 181). Envelope values therefore change in 0.2 s steps, not per frame.
- Stereo pan (`ebiten_sound_effect.go` 28-51): each block of samples is scaled by a left gain `min(1 - pan, 1)` and a right gain `min(1 + pan, 1)` (line 37-38). This is a linear per-channel law, so the centre is at full gain on both channels.

Order for one zone crossing (what happens, in order): (1) the 1-second poll sees the new tile's region; (2) `SetEnv` sees a new index; (3) old song and old ambience get `Stop` (fade-out starts); (4) new song and new ambience start (fade-in starts, sustain once done); (5) events keep firing on the event timer, which is not reset by the change; (6) each 0.2 s the engine steps every envelope.

## 2. Key functions

- `SoundEnvironment.SetEnv`: `/mnt/frankendom-donors/OpenDiablo2-OpenDiablo2/d2core/d2audio/sound_environment.go` 32-54. Index check, separate song and ambience swaps, stores the new record.
- `SoundEnvironment.Advance`: `/mnt/frankendom-donors/OpenDiablo2-OpenDiablo2/d2core/d2audio/sound_environment.go` 57-68. The one-shot event timer, random pan.
- `SoundEngine.PlaySoundID`: `/mnt/frankendom-donors/OpenDiablo2-OpenDiablo2/d2core/d2audio/sound_engine.go` 201-231. Group variant pick, load, fade-in start, registry.
- `Sound.update` / `Sound.Play` / `Sound.Stop`: `/mnt/frankendom-donors/OpenDiablo2-OpenDiablo2/d2core/d2audio/sound_engine.go` 45-68, 76-91, 94-105. Attack, sustain, release, stopped.
- `SoundEngine.Advance`: `/mnt/frankendom-donors/OpenDiablo2-OpenDiablo2/d2core/d2audio/sound_engine.go` 161-183. The 0.2 s envelope cadence and cleanup.
- Caller: `/mnt/frankendom-donors/OpenDiablo2-OpenDiablo2/d2game/d2gamescreen/game.go` 224-249 (region poll) and 280 (`soundEnv.Advance`).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Region (zone) selects a bundle of song, bed, event and event delay; the bundle is data | Per-level `SoundEnv` index (level table, not read) |
| Bed change = old fades out, new fades in, overlap is the crossfade | Fade lengths per sound record, in frames at 25 fps: FadeIn/FadeOut divided by 25 (sound_engine.go 85, 98; theirs `originalFPS` 25, line 30) |
| Envelope steps toward a target at a fixed rate | Rate = target / fade time (line 85) or current / fade time (line 98); donor steps every 0.2 s (line 180) |
| Volume stored 0-255, scaled to 0..1 | `volMax` 255 (line 29) |
| One-shot ambient event on a timer with random pan | Event delay in frames: `EventDelay / 25` seconds (sound_environment.go 60; `assumedFPS` 25, line 9); pan uniform -1..1 (line 65) |
| Random variant from a group | Group size from the record, uniform pick (line 210) |
| Poll interval for region change | 1 s (game.go 241) |
| Cap on simultaneous voices | None in the donor. The map at line 226 is unbounded. |
| Priority to choose which voice to drop | None read. `Priority` is loaded from sounds.txt (sound_details_loader.go 29) but nothing reads it |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's layering (one song and one bed per zone, a random-stereo one-shot event on a timer, fade-out of the old bed and fade-in of the new one, overlap as the crossfade). It changes four things on purpose: (a) the envelope steps every frame with the real frame time, not every 0.2 s; (b) a voice cap with priority eviction, which the donor does not have; (c) the event timer keeps its phase and has a zero-delay guard; (d) the zone change is an input (`setEnvironment` called by the caller), not a 1-second poll. It omits the group variant pick, the sample loading and decoding, the EAX fields, the night variants (donor loads them and never plays them), the pan law (the sketch passes the random pan to the caller), and the donor's record-driven stop-when-release-finished path for loops. Fade times are inputs, not the donor's frame counts.

```ts
// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Bed {
  id: string;
  gain: number;      // current linear gain, 0..1
  target: number;    // gain the bed is heading to
  rate: number;      // gain change per second
  fadeOutS: number;  // seconds to fade out
  alive: boolean;
  priority: number;  // higher wins a voice
}

export function startBed(id: string, volume: number, fadeInS: number, fadeOutS: number, priority: number): Bed {
  return { id, gain: 0, target: volume, rate: fadeInS > 0 ? volume / fadeInS : Infinity, fadeOutS, alive: true, priority };
}

export function stopBed(bed: Bed): void {
  bed.target = 0;
  bed.rate = bed.fadeOutS > 0 ? bed.gain / bed.fadeOutS : Infinity;
}

// One frame step with the real frame time dt (seconds, dt > 0).
export function stepBed(bed: Bed, dt: number): void {
  if (bed.gain < bed.target) bed.gain = Math.min(bed.target, bed.gain + bed.rate * dt);
  else if (bed.gain > bed.target) bed.gain = Math.max(bed.target, bed.gain - bed.rate * dt);
  if (bed.target === 0 && bed.gain === 0) bed.alive = false;
}

export interface VoiceTable { beds: Bed[]; maxVoices: number; }

// Admit a bed. When the cap is full, the lowest-priority audible bed is faded out,
// but only if it is strictly lower priority than the newcomer.
export function admit(t: VoiceTable, bed: Bed): boolean {
  const audible = t.beds.filter((b) => b.alive && b.target > 0);
  if (audible.length < t.maxVoices) { t.beds.push(bed); return true; }
  let worst = audible[0];
  for (const b of audible) if (b.priority < worst.priority) worst = b;
  if (worst.priority >= bed.priority) return false;
  stopBed(worst);
  t.beds.push(bed);
  return true;
}

export function stepAll(t: VoiceTable, dt: number): void {
  for (const b of t.beds) stepBed(b, dt);
  t.beds = t.beds.filter((b) => b.alive);
}

export interface EnvSpec { song: string; bed: string; event: string; eventDelayS: number; }
export interface Env { current?: EnvSpec; song?: Bed; bed?: Bed; eventTimer: number; }

// Zone change: the old bed fades out while the new one fades in (the overlap is the crossfade).
// The song is restarted only when the song id actually changes.
export function setEnvironment(env: Env, t: VoiceTable, next: EnvSpec, vols: { song: number; bed: number }, fadeInS: number, fadeOutS: number): void {
  if (env.current?.song !== next.song) {
    if (env.song) stopBed(env.song);
    env.song = startBed(next.song, vols.song, fadeInS, fadeOutS, 10);
    admit(t, env.song);
  }
  if (env.current?.bed !== next.bed) {
    if (env.bed) stopBed(env.bed);
    env.bed = startBed(next.bed, vols.bed, fadeInS, fadeOutS, 5);
    admit(t, env.bed);
  }
  env.current = next;
}

// Ambient one-shot every eventDelayS seconds with a random stereo pan in -1..1.
// The timer keeps its phase (adds the delay) instead of resetting to zero. Guard against 0 delay.
export function tickEvents(env: Env, dt: number, playEvent: (pan: number) => void): void {
  env.eventTimer -= dt;
  if (env.current && env.current.eventDelayS > 0 && env.eventTimer < 0) {
    env.eventTimer += env.current.eventDelayS;
    playEvent(Math.random() * 2 - 1);
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/sm005-od2-sound-environment.ts), exit 0.

## 5. Lands in

- TARGET `src/fight/cues.ts` (new, client-side voice table and envelope step; it plays cues, it decides nothing). Parity-checklist row 12 (combat sound cues). Note: the batch hint said row 14, but row 14 is HUD; the sound topic matches row 12.
- Zone ambience beds (song, bed, event, delay per zone) are zone data. The Frankendom zone file that would hold them is not named in this donor and was not read (not read).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only, shape only)
- Brief rule served: zones as data on one runtime; sound stays client-only; the engine emits events and never plays sound.

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the described mechanism; no donor line is translated.
- Region change is a 1-second poll in the donor (game.go 241). Frankendom should drive a zone change from the server-confirmed zone transition, not poll the tile.
- The envelope is stepped every 0.2 s (sound_engine.go 180), which makes fades audibly stepped. Fix: step every frame (sketch `stepBed`).
- No voice cap. The donor's `sounds` map is unbounded (sound_engine.go 226). A many-on-one fight with a hit cue per attacker can exceed any sensible voice count. Fix: cap and priority (sketch `admit`). This must match MAX_ATTACKERS = 3 in the engine: at most three attacker cues per target per beat is a Frankendom ruling, not a donor value.
- Priority is in the data (sound_details_loader.go 29) and unread. Fix: use it as the eviction key.
- Night ambience and night event are loaded (sound_environment_loader.go 16, 18) and never used. Fix: choose the variant from a time-of-day or zone-state flag, or drop the fields.
- Event delay of 0 would make the donor's event fire on every frame (`eventTimer` is reset to 0 and is below 0 again next frame). I did not read the data to see whether any record uses 0; the sketch guards it.
- Every play decodes the sample again (ebiten_audio_provider.go 154) and there is no cache, although the record has a `Cache` flag that is never read. Fix: decode once per sound id and reuse the buffer.
- The title and menu music uses `PlayBGM`, which cuts hard: it closes the old player and loads the new song (ebiten_audio_provider.go 62-68). The in-game zone music goes through the sound engine and does crossfade. Two music paths; Frankendom should have one.
- `PlayBGM("")` pauses but a later return to the same track reloads from the start rather than resuming (ebiten_audio_provider.go 57-60, 70). Minor.
- Pan law is linear per channel (ebiten_sound_effect.go 37-38), not constant power. Fix: equal-power pan in the client.
- The donor has no combat cue wiring. Grep of `d2game`, `d2core` and `d2common` for sound and sfx found only UI sounds (escape menu cursor, quest complete, hero select). There are no hit or spell cues to borrow; the donor gives the sound layer, not the combat mapping.
- What the donor gives, that Frankendom lacks: a region-to-sound table as data, fades defined per sound, a layered bed plus event pattern, and randomised group variants (sound_engine.go 210).

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: zones as data on one runtime; sound is client-only (addendum); licence rule 7 (copyleft, shape only)
Best transferable idea: each zone names one song, one looping bed and one timed one-shot event; a zone change fades the old bed out while the new one fades in, and the overlap is the crossfade.
Decision (proposed): adapt - keep the zone bundle and the fade overlap, but step envelopes every frame, add a voice cap that uses the priority field, and drive zone change from the server-confirmed transition instead of a 1-second poll.
Acceptance: walking from a forest zone into a crypt zone, the forest bed fades out over its fade-out time while the crypt bed fades in, both audible in the overlap, no hard cut; a client test asserts the gain changes every frame and that no more than maxVoices beds are audible at once.
