# diasurgical-DevilutionX (sound-music, cell 3)

Donor: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/effects.cpp` (with `Source/engine/sound.cpp`, `Source/engine/sound_position.cpp`, data table `assets/txtdata/sound/effects.tsv`) | Licence: Sustainable Use License, Version 1.0 (LICENSE.md line 1; clean-room, shape only) | C++ | symbols `PlaySfxPriv`, `PlaySfxLoc`, `CalculateSoundPosition`, `snd_play_snd`, `music_start`

Checked: Read whole: `Source/effects.cpp` (1-340, 340 lines), `Source/engine/sound_position.cpp` (1-26). Read by range: `Source/engine/sound.cpp` (165-226, 308-372), `Source/engine/point.hpp` (112-140), `Source/utils/soundsample.h` (76-100), `Source/diablo.cpp` (3074-3090), `Source/monster.cpp` (4104-4114). Grep only: `Source/engine/sound_defs.hpp` (defines), `LICENSE.md` (terms at lines 1, 15, 16), `Source/player.cpp` (callers of `PlaySfxLoc`, lines 279, 406-409, 781, 904). The hint file `Source/player.cpp` is a caller, not the mechanism. The table `effects.tsv` was counted (814 data rows). Candidates opened: effects.cpp, engine/sound.cpp, engine/sound_position.cpp, engine/point.hpp, utils/soundsample.h, diablo.cpp, monster.cpp, player.cpp, LICENSE.md (9). Confidence: high on the located sound, the one-instance gate and the music hard cut (read end to end); medium on the duplicate-voice path, since the Aulib finish callback in `sound.cpp` 133-137 and `SoundSample::SetVolume` were not read.

Best transferable idea: a located sound whose volume falls by a fixed step per tile and which does not start past a floor, panned by the listener's right-hand offset, with one instance per effect and an 80 ms restart guard.

Decision (proposed): adapt — take the distance floor, the right-hand pan and the one-instance-per-effect guard; the donor lets misc effects stack duplicate voices with no cap, so the fix is a cap (sketch `maxVoices`); the isometric pan `(dx - dy)` is replaced by a dot product with the camera's right vector, because our camera is third-person.
Acceptance: a client test: a hit 10 tiles to the camera's right gives pan +2560 and volume -640; a hit 100 tiles away does not start; a misc effect retriggered every 100 ms for 2 s never has more than 4 live voices.

## 1. Mechanism

- Entry: `PlaySfxLoc` (effects.cpp 217-232) picks a variant (`RndSFX`, 105-127), then calls `PlaySfxPriv` with the location flag (231).
- Order inside `PlaySfxPriv` (69-103): (1) no sound while a multiplayer level loads (71-72); (2) no sound if the sound system is off (74-76); (3) one instance per effect: a non-stream, non-misc effect that is already playing is skipped (78-80); (4) located sounds: `CalculateSoundPosition` gives volume and pan, and the call returns if the sound is out of range (84-86); (5) stream effects go to `StreamPlay` (88-91); (6) lazy load of the sample (93-94); (7) user volume: the accessibility cue volume for the cue effects, the sound volume otherwise (99-101); (8) hand-off to `snd_play_snd` (102).
- Located volume and pan (`sound_position.cpp` 8-24): the listener is the player's tile (10). Pan = (dx - dy) x 256, clamped to plus or minus 6400 (13-14). Volume = tile distance x -64 (16). If the volume is at or below the floor -6400, the function returns false and nothing starts (18-19). Consequences: the pan saturates when dx minus dy reaches 25 tiles (6400 / 256), and the sound is cut at about 100 tiles (6400 / 64).
- Distance: `ApproxDistance` (point.hpp 118-128) is an integer approximation: larger axis x 1007 plus smaller axis x 441, minus a small correction when the axes differ by 16 times or more. It is within about 5 percent (112).
- Clamp: `PlayWithVolumeAndPan` (soundsample.h 81-86) sets the volume with a floor of `ATTENUATION_MIN` and a ceiling of 0 (the user volume is added scaled by 4, from `ATTENUATION_MIN / VOLUME_MIN`). The clamp body is not read.
- Retrigger guard (sound.cpp 205-225): a sample can start only if 80 ms have passed since its last start (211-214). If the sample is still playing, a duplicate voice is made (217-221, `DuplicateSound` 120-140) and played; the duplicate is kept in a list until it finishes (129). There is no cap on duplicates. Misc effects skip the one-instance check (78), so they can stack: a misc effect that lasts 2 s can have about 25 duplicates alive at once (2000 / 80), by my arithmetic, not run.
- Streams: `StreamPlay` (45-60) stops the current stream first (49, `stream_stop`, clears at 200-205), then sets the new one as current (58). A stream is checked each update and cleared when it stops (62-67). Streams are never preloaded (171-174).
- Class-gated loading: `sound_init` (268-304) builds a load mask: misc is always in (270), plus the hero's class group (276-296). `PrivSoundInit` (159-182) loads only effects whose flags match the mask (176). Multiplayer loads more groups (271-274).
- Data table `assets/txtdata/sound/effects.tsv`: 814 data rows (one header line; the file has no final newline). Flags: Stream 390 rows (Stream only) plus 141 Stream combined with Warrior, Sorcerer or Rogue (47 each), so 531 rows are streams; Misc 107; Warrior 62; Sorcerer 56; Rogue 56; Ui 2. Example row: Walk, Misc, `sfx\misc\walk1.wav` (line 2).
- Music: `music_start` (sound.cpp 338-369) first releases the current track (`music_stop`, 332-336, called at 343 path), sets the volume from options within the range (361), then plays it as a stream (356-362). There is no fade in the code read. Tracks: eight names in `MusicTracks` (154-163); `GetLevelMusic` (310-330) maps town and each dungeon type to one track, default intro.
- Same-track rule (diablo.cpp 3074-3088): a level change stops the music only if the needed track differs (3076-3077), and starts it only if the track differs (3082-3083). The same track keeps playing across a level change.
- Stinger-like use: a movie plays with the catacomb track through the same start call (monster.cpp 4111-4113).
- Layers: none. There is one music stream, and effects are separate voices over it.

## 2. Key functions

- `PlaySfxPriv`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/effects.cpp` 69-103 (order of checks above).
- `PlaySfxLoc`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/effects.cpp` 217-232.
- `CalculateSoundPosition`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/engine/sound_position.cpp` 8-24.
- `snd_play_snd`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/engine/sound.cpp` 205-225.
- `music_start`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/engine/sound.cpp` 338-369.
- Same-track level change: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/diablo.cpp` 3074-3088.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Volume falls by a fixed step per unit of distance | -64 per tile (theirs, sound_position.cpp 16) |
| Silence floor: no start at or below a set volume | -6400 (theirs, sound_defs.hpp 13; about 100 tiles) |
| Pan from the listener's right-hand offset, clamped | 256 per tile; limit plus or minus 6400 (theirs, sound_position.cpp 13-14, sound_defs.hpp 16-17) |
| Retrigger guard per sample | 80 ms (theirs, sound.cpp 212) |
| One instance per effect unless misc | Misc skips the check (theirs, effects.cpp 78) |
| Duplicate voices for misc, no cap | None: unbounded (defect; fix: cap) |
| User volume scaled into the log range | Factor 4 = ATTENUATION_MIN / VOLUME_MIN (theirs, soundsample.h 83) |
| Same track is not restarted on a level change | None (rule, diablo.cpp 3082) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (range first, then the pan, then the one-instance and retrigger checks) with the donor constants. It uses exact distance (the donor's integer approximation is not modelled), a camera right vector in place of the isometric (dx - dy), and the cap on duplicate voices (the donor has none). It omits the stream path, the lazy load, the user volume and the cue volume, the multiplayer and loading suppression, the Aulib clamp, and the finish callback that frees duplicates.

```ts
// Licence: Sustainable Use License 1.0 (donor; non-commercial use only). Clean-room: shape only, written from the described mechanism.
// Located sound: volume falls with distance and cuts off, pan follows the listener's right-hand offset, and one-instance-per-effect with a retrigger guard.

export interface Pt { x: number; z: number; } // distances in tiles (the donor's unit); the caller converts world metres

export const ATTENUATION_FLOOR = -6400;  // donor ATTENUATION_MIN, log units
export const PAN_LIMIT = 6400;           // donor PAN_MIN / PAN_MAX
export const VOLUME_PER_TILE = -64;      // donor: distance x -64
export const PAN_PER_TILE = 256;         // donor: offset x 256
export const RETRIGGER_MS = 80;          // donor snd_play_snd guard

export interface Located { volume: number; pan: number; }

// Donor CalculateSoundPosition: pan from the offset along the listener's right, volume from distance; no start at or below the floor.
export function locate(listener: Pt, source: Pt, right: Pt): Located | null {
  const dx = source.x - listener.x;
  const dz = source.z - listener.z;
  const side = dx * right.x + dz * right.z;           // offset along the listener's right (donor: dx - dy on the isometric grid)
  const dist = Math.hypot(dx, dz);                    // fix: exact distance (the donor's integer approximation is within about 5 percent)
  const volume = Math.round(dist * VOLUME_PER_TILE);
  if (volume <= ATTENUATION_FLOOR) return null;       // out of range: do not start the sound
  const pan = Math.max(-PAN_LIMIT, Math.min(PAN_LIMIT, Math.round(side * PAN_PER_TILE)));
  return { volume, pan };
}

export interface Effect { lastStartMs: number; }

// Donor: a non-misc effect that is already playing is skipped; a restart inside the guard is skipped; a misc effect still sounding gets a duplicate voice.
// Fix: duplicates are capped at maxVoices (the donor has no cap).
export function gate(e: Effect, nowMs: number, activeVoices: number, misc: boolean, maxVoices: number): 'play' | 'duplicate' | 'skip' {
  if (activeVoices > 0 && !misc) return 'skip';
  if (nowMs - e.lastStartMs < RETRIGGER_MS) return 'skip';
  if (activeVoices >= maxVoices) return 'skip';
  e.lastStartMs = nowMs;
  return activeVoices > 0 ? 'duplicate' : 'play';
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/SM011-devil-spatial.ts`: exit 0.

## 5. Lands in

- TARGET `src/fight/combat-sound.ts` (new, client-only; the engine never reads it). Parity-checklist row 12 (combat sound cues). The located hit and the one-instance guard are combat cues; the music rule (same track is not restarted) is zone data, so it would sit in `origins/zone-audio.ts` as a client rule.
- Reuse tag: rewrite-from-idea (Sustainable Use License 1.0: non-commercial use only; clean-room, shape only; no code)
- Brief rule served: client-only (the camera and sound are client-only); the attenuation and pan constants are data, not fight rules, so server-verified kills are untouched.

## 6. Gaps and risks

- Licence: Sustainable Use License 1.0 allows use only for internal business or non-commercial or personal use, and distribution only free of charge for non-commercial purposes (LICENSE.md 15-16). Frankendom is a commercial product, so no code, constant table or line-by-line port. The idea and the shape only.
- The donor's pan is isometric: `(dx - dy)` is the screen-right axis for an isometric grid (sound_position.cpp 13). Our third-person camera needs the camera's right vector; a fixed world axis would pan wrong when the camera turns.
- The pan saturates at 25 tiles off-axis (6400 / 256). Close fights in a small arena may sit at the limit most of the time, so the 256 scale should be zone data, not a fixed constant.
- The donor has no cap on misc duplicate voices (sound.cpp 217-221, 120-140). A long misc effect retriggered on a many-on-one fight can pile up duplicates. Fix: `maxVoices` in the sketch; the number is for Lead to set (the sketch uses 4 in the acceptance test only).
- Duplicates are freed by a finish callback in SDL2 builds only (sound.cpp 133-137, inside `#ifndef USE_SDL3`); the callback was not read in full. Our sketch has no voice object, so the count must be kept by the caller.
- Music has no fade: a track change stops and starts at once (sound.cpp 343, 361-362). Frankendom's crossfade work is not in this donor; see the daggerfall-unity and dhewm-dhewm3 notes.
- No music layers. Effects sit over one music stream. A layered score is new design, not taken from this donor.
- The 80 ms guard is per sample, not per effect. Walk, bow, spell and swing reset it (effects.cpp 225-229), so the guard is a fight-feel choice that Frankendom should keep as data.
- Streams (531 of 814 table rows) are never preloaded (effects.cpp 171-174). A long speech or ambience clip can stall on first play. Preload on zone entry or accept the stall; not measured.
- Not read: the Aulib finish callback and `SoundSample::SetVolume` bodies, `sound_defs.hpp` beyond the defines, `GetHeroSound` (player.cpp 1703), and the music track files.

Best transferable idea: a located sound whose volume falls by a fixed step per tile and which does not start past a floor, panned by the listener's right-hand offset, with one instance per effect and an 80 ms restart guard.

## Reuse tag
rewrite-from-idea (Sustainable Use License 1.0: non-commercial use only; clean-room, shape only)

## Brief rule served
Client-only sound (camera and sound are client-only); attenuation and pan constants are data; server-verified kills are not touched. Parity row 12 is the target row.
