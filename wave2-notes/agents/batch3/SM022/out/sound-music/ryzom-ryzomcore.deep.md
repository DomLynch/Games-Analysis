# ryzom-ryzomcore (sound-music, cell 15)

Donor: `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/client/src/sound_manager.cpp` (with `nel/src/sound/music_channel_fader.cpp`, `nel/src/sound/music_sound_manager.cpp`, `ryzom/client/src/user_entity.cpp`) | Licence: AGPL-3.0 (`COPYING` and `LICENSE` read: GNU AGPL v3; NeL source headers say "version 3 ... or any later version"), so AGPL-3.0-or-later | C++ | symbol `CSoundManager::updateEventAndGameMusicVolume`

Checked: Cell 15 = category_no from the cells file. Read in full: `updateEventAndGameMusicVolume` (sound_manager.cpp 1627-1660), `playEventMusic` (1444-1466), `CMusicChannelFader::update/play/stop` (music_channel_fader.cpp 94-200) and its header (60-76), the death trigger (user_entity.cpp 4289-4303; the else branch that stops the sting was not read), `CMusicSoundManager::update` and `startMusic` (music_sound_manager.cpp 61-246). Hint file `nel/include/nel/sound/sound_bank.h` is a bank container with no playback logic (opened, not the mechanism). camera_scope: n/a (sound cell). Confidence: high for the stinger-over-ducked-bed path (read end to end). Not written up here, because a cell gets one note: the ambience-bed code (`nel/src/sound/background_sound_manager.cpp`, `updateBackgroundStatus` 852-1286) and the voice allocator (`nel/src/sound/audio_mixer_user.cpp`, `getFreeTrack` 1489-1560). Not read: the hit and spell sound triggers. A grep found no spell or hit word in `sound_manager.cpp`; character sound animations are driven by animation events (`character_cl.cpp` 5833-5875, grep only).

Best transferable idea: Put stingers on their own music slot (one-shot, or looping and bound to a state like the death sting) and duck the background bed with a wall-clock ramp, and have state-driven music check the track name each frame instead of restarting it.
Decision (proposed): adapt - the idea fits (a death or boss-intro sting sits over the zone bed without cutting it), but the donor's fixed 500 ms ramp and silence floor should become data fields, and the donor's stinger has no priority of its own (see section 6).
Acceptance: A death sting loops while the player is dead, the zone bed falls to silence within 500 ms, and the bed comes back when the player is no longer dead (the release call, `stopEvent`); a one-shot sting releases the bed when it ends. A client test asserts the duck gain is 0.5 after 250 ms, that a second request for the same sting name and loop flag returns false, and that `stopEvent` lets the gain climb back to 1.

## 1. Mechanism

- Two music slots. Background (zone) music uses the general channel. Event (sting) music uses a second channel, `EventMusicChannel` (`nel/include/nel/sound/audio_mixer_user.h` 371-372). Each channel is a `CMusicChannelFader` holding two physical faders, so one track can fade out while the next fades in (`music_channel_fader.h` 76).
- Each main-loop pass calls `CSoundManager::update` (`sound_manager.cpp` 1216; called from `ryzom/client/src/main_loop.cpp` 2857), which calls `updateEventAndGameMusicVolume` (1377). Order of steps inside it: (a) if the event track is a one-shot (not looping) and the mixer reports it ended, forget its name (1629-1639); a looping sting is never cleared here; (b) step = wall-clock ms since the last call / 500 (1642-1646); (c) if an event name is set, negate the step (1649-1650), so the bed moves down while a sting plays and up when none does; (d) the bed factor is previous + step, clamped to 0..1 (1651-1652); (e) if the factor changed, re-apply the volume (1654-1659).
- The bed volume is game music volume x fade factor, applied to the general channel only (`setMusicVolume` at `audio_mixer_user.cpp` 2814-2817). The event channel is never multiplied by the duck.
- Starting a sting: `CSoundManager::playEventMusic` (1444-1466) does nothing when event music is off (event music is tied to the background-music switch at 1540). If the same name and loop flag are already playing, it does nothing (dedupe at 1459). Otherwise it calls the mixer's `playEventMusic`, which routes to the event channel (`audio_mixer_user.cpp` 2879).
- Crossfade inside a channel: `CMusicChannelFader::stop(xFadeTime)` starts a fade-out at volume rate 1000 / xFade-ms per second (`music_channel_fader.h` 69). `play` fades a new track in only when another track was fading out (`music_channel_fader.cpp` 168, comment "only fade in when fading out"). `update` adds rate x delta seconds each frame (97, 115) and ends at 0 (stop) or 1 (full volume).
- State-driven trigger: `CUserEntity::updatePreCollision` runs each frame. If the mode is DEATH or SWIM_DEATH and the playing event name is not the death track, it calls `playEventMusic(ClientCfg.DeathMusic, 0, true)` (`user_entity.cpp` 4297-4302). The check is a compare, so repeated frames do nothing. The third argument is `loop = true`, so the death sting loops and the bed stays ducked while the player is dead. The release is the else branch: when the mode is no longer dead and the playing event is the death track, it calls `stopEventMusic(DeathMusic, LoadingMusicXFade)` (`user_entity.cpp` 4305-4309), which is the real path that brings the bed back on respawn.
- Background (zone) competition, for context: `CMusicSoundManager::update` (`music_sound_manager.cpp` 61) picks one zone track from the music sources the listener is in. Lower priority value wins (109). At equal priority a non-looping track beats a looping one (121), and otherwise the name compare decides (`snd1>snd0`). The minimum play time blocks any replacement, and that check runs before the candidate search (74). The crossfade length is min(new fade-in, old fade-out) (208). A non-looping source is marked played once (225) until the listener leaves (the erase is in `removeMusicSourcePlaying`, 53-58).

## 2. Key functions

- `CSoundManager::updateEventAndGameMusicVolume`: `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/client/src/sound_manager.cpp` 1627-1660. Ducking step: clear finished one-shot, step by elapsed time, clamp, re-apply.
- `CSoundManager::playEventMusic`: `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/client/src/sound_manager.cpp` 1444-1466. Dedupe by name and loop flag, then route to the event channel.
- `CMusicChannelFader::play` / `stop` / `update`: `/mnt/frankendom-donors/ryzom-ryzomcore/nel/src/sound/music_channel_fader.cpp` 149-175, 177-200, 94-134. Two faders, fade rates, fade-in only after a fade-out.
- Death trigger: `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/client/src/user_entity.cpp` 4289-4309 (start 4302, release 4305-4309), inside `CUserEntity::updatePreCollision`.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Duck step = elapsed ms / ramp, so the move is frame-rate independent | Ramp 500 ms (theirs, `sound_manager.cpp` 1642) |
| Duck floor (bed silence while a sting plays) | 0 (theirs, clamp at 1652 with a negative step at 1650) |
| Event sting fade-in default | 2000 ms (theirs, `ryzom/client/src/sound_manager.h` 319 default argument); the death sting passes 0 (`user_entity.cpp` 4302) |
| Crossfade rate per second | 1000 / xFade ms (theirs, `music_channel_fader.h` 63 and 69) |
| Physical voices per music channel | 2 (theirs, `music_channel_fader.h` 76) |
| Zone track fade-in / fade-out / minimum play / replay gap | 2000 / 2000 / 10000 / 0 ms (theirs, `nel/src/sound/music_sound.cpp` 42-45) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (clear a finished one-shot, step the duck from elapsed time, clamp, then multiply only the bed). It generalises the donor's floor of 0 into `duckTo` (donor 0) and the fixed 500 ms into `rampMs` (donor 500). It omits the audio driver calls, the async-load wait in the fader, the per-fader Fade flags, the case-insensitive file-name compare (the sketch lower-cases ASCII only), the zone music competition, and the death-state driver in `user_entity.cpp` (the sketch has `stopEvent` as the release call that driver would make).

```ts
// Licence: AGPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation.
interface DuckConfig {
  duckTo: number;  // bed gain while a sting plays (donor: 0)
  rampMs: number;  // ms for a full 0..1 move (donor: 500)
}

interface MusicDuck {
  gain: number;            // bed gain factor, 0..1
  eventName: string | null;
  eventLoop: boolean;
}

// Start an event (sting) track. Same name and loop flag as the one playing: no restart.
function playEvent(m: MusicDuck, name: string, loop: boolean): boolean {
  if (m.eventName !== null && m.eventName.toLowerCase() === name.toLowerCase() && m.eventLoop === loop) {
    return false;
  }
  m.eventName = name;
  m.eventLoop = loop;
  return true;
}

// Once per frame with the wall-clock delta in ms. A finished one-shot releases the bed first.
function stepDuck(m: MusicDuck, cfg: DuckConfig, dtMs: number, eventEnded: boolean): number {
  if (m.eventName !== null && !m.eventLoop && eventEnded) {
    m.eventName = null;
  }
  const span = 1 - cfg.duckTo;
  const step = (dtMs / cfg.rampMs) * span;
  const next = m.eventName !== null ? m.gain - step : m.gain + step;
  m.gain = Math.min(1, Math.max(cfg.duckTo, next));
  return m.gain;
}

// Release a looping, state-bound sting (the donor's stopEventMusic on respawn). The bed then climbs back.
function stopEvent(m: MusicDuck): void {
  m.eventName = null;
  m.eventLoop = false;
}

// The duck multiplies the bed channel only. The event channel is not multiplied.
function bedGain(musicVolume: number, m: MusicDuck): number {
  return musicVolume * m.gain;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/music-duck.ts` (new client-only module; it reads fight state events and never writes engine state). Parity-checklist row 12 (combat sound cues). The death sting also touches row 17 (death/respawn), but this note names one row.
- Reuse tag: rewrite-from-idea (AGPL-3.0-or-later; clean-room only)
- Brief rule served: 1 (one engine; the client is a view, so sound never feeds kill or damage state); addendum sound-music fold-ins (stingers, layering, bed ducking)

## 6. Gaps and risks

- AGPL-3.0: clean-room only. The sketch is written from the mechanism; no donor line is translated.
- The 500 ms ramp is a fixed client constant (`sound_manager.cpp` 1642). Fix: `rampMs` as a data field, so a boss sting can differ from a death sting (sketch does this).
- The bed is ducked to silence (0), not to a level (clamp at 1652). A sting that should sit on top of the bed needs a partial floor. Fix: `duckTo` as a data field (sketch does this).
- The event slot has no priority. `playEventMusic` replaces the current sting whenever the name differs (1459-1464), so a boss intro arriving during a death sting cuts it. Fix: give each sting a priority field and a rule for equal priority; the donor does not have one.
- A fade-in is skipped when nothing was playing (`music_channel_fader.cpp` 168). So the first sting of a session starts at full volume regardless of the 2000 ms default. Fix: an explicit `fromSilence` flag on the sting.
- The zone (background) minimum play time is checked before the candidate search (`music_sound_manager.cpp` 74). A higher-priority zone track cannot cut in for 10 s. This matters only if Frankendom puts fight music on the zone slot; keep fight stings on the event slot (as the sketch does).
- The donor's "ordered by surface" comment (`background_sound_manager.cpp` 1053) does not match the code: the layer list is filled with `push_back` (1092) and never sorted. This is in the ambience code, not written up here.
- Donor defects found while reading, not used: `CompareSources` (`audio_mixer_user.cpp` 2415) is defined and has no call site under `nel/src/sound`; the client's per-priority voice reserves are inside a comment block (`sound_manager.cpp` 485-491), so only the low-water mark of 1 is active (493).
- Not verified: no runtime test. The sketch typecheck passed on the VPS (`tsc --noEmit --strict --target es2020`, exit 0).

## Checker findings (Sonnet 5.5 medium, 2026-10-12)

Verdict: MINOR
- Mechanism and Acceptance treated the death sting as a one-shot; the real call is `playEventMusic(ClientCfg.DeathMusic, 0, true)` (`user_entity.cpp` 4302), loop = true, so it loops and the bed stays ducked until the player is no longer dead, when `stopEventMusic(DeathMusic, LoadingMusicXFade)` fires (4305-4309). The note said it had not read that else branch; it exists. Confirmed.
- Step (a) of `updateEventAndGameMusicVolume` clears only non-looping names, so a looping sting never clears itself. Confirmed (`sound_manager.cpp` 1629-1639).
- Missed (confirmed): the death sting is a looping state-bound track, the 'state-driven music' pattern the Best idea names; `stopEventMusic` on respawn is the release path.

Fixed 2026-10-12: Best idea, Acceptance, step (a), state-driven trigger line and key-function range corrected; sketch gained `stopEvent` (release for looping stings), mirrored in work/ryzom-duck.ts.
