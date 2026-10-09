# openmw (sound-music, cell 15)

Donor: /mnt/frankendom-donors/openmw/apps/openmw/mwsound/soundmanagerimp.cpp | Licence: GPL-3 | C++ | symbol SoundManager::streamMusic / playTrack

## 1. Mechanism

- One music slot. Music is a single streamed track. Callers use `streamMusic(filename, type, fade)` (351-359), which sets `mMusicType` and then calls `advanceMusic`.
- Scripted-music hold: when the current type is `MWScript` and the new request is any other type, the request is dropped (line 354-355). Built-in playlists cannot interrupt scripted music.
- `advanceMusic` (333-344): if nothing is playing, it starts the track now through `streamMusicFull`. If something is playing, it stores the request in `mNextMusic` (a second request during the fade overwrites it) and sets a fade-out on the current track (`setFadeout`, sound.hpp 66: a volume ramp to zero from the current fade volume, flagged to stop at the end; calling it again restarts the ramp from wherever the volume is).
- `streamMusicFull` (301-331): returns if output is not initialised, stops the current track, returns if the filename is empty (so an empty request acts as a stop), opens a decoder (on failure it logs and returns, leaving the old track stopped), creates the stream at base volume `volumeFromType(Music)`, flags it as 2D, no environment scaling, and hands the decoder to the output.
- `volumeFromType` (93-117): master volume times the per-type volume (music, sfx, voice, footsteps; movie and mask get master volume only).
- Frame tick: `update(duration)` (1233-1255) runs each frame. It returns early if output is not ready or playback is paused. On the main menu with nothing playing it starts the title track. The title track is only requested if the title file exists in the VFS. Then it updates sounds (`updateSounds`) and, outside the no-game state, warms cell sounds, then updates the region sound and the water sound (1248-1254).
- `updateMusic` (1214-1231), called at line 1107 inside `updateSounds` (1074-1212), which `update()` calls. `updateSounds` first adds `duration` to a timer and returns early until at least 1/30 s has passed (`sMinUpdateInterval`, line 54; lines 1089-1093), so music updates run at most about 30 times a second with the accumulated duration. Then: if there is no stream, `updateFade` returned false (a fade-out with stop-at-end has reached its target, sound.hpp 130-154) or the stream stopped, it stops, then starts `mNextMusic` if set (and clears it), otherwise resets `mMusicType` to Normal (so the scripted hold also clears when no stream exists). Otherwise it updates the stream.
- `playTrack` (460-479) is for non-music tracks: it creates a stream at the type's volume, plays it, and keeps it in a sorted list of active tracks. It returns the stream pointer, or null if output is not ready or the stream fails to start.
- Output: audio side effects. The tick is per frame with a `duration` argument.

## 2. Key functions

- `SoundManager::streamMusic`, `/mnt/frankendom-donors/openmw/apps/openmw/mwsound/soundmanagerimp.cpp`, lines 351-359. Music request with the scripted-hold rule.
- `SoundManager::advanceMusic`, same file, lines 333-344. Start now, or queue and fade out the current track.
- `SoundManager::streamMusicFull`, same file, lines 301-331. Decoder open and stream start for one track.
- `SoundManager::volumeFromType`, same file, lines 93-117. Master times per-type volume.
- `SoundManager::updateMusic`, same file, lines 1214-1231. Fade and end-of-track handling; starts the queued track.
- `SoundManager::update`, same file, lines 1233-1255. Per-frame entry: title track on menu, then sounds, cell, region, water.
- `SoundManager::playTrack`, same file, lines 460-479. Non-music track start, kept in an active list.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants (theirs) |
|---|---|
| One music slot; a new request fades the current track and queues the next | Fade time is passed by the caller (theirs) |
| Scripted music holds the slot against built-in playlists | `MusicType::MWScript` and `MusicType::Normal` enum values (theirs) |
| Output volume = master times per-type setting | Setting keys `mMasterVolume`, `mMusicVolume`, `mSfxVolume` and others (theirs) |
| Title track starts on the main menu when nothing is playing | `MWSound::titleMusic` file path (theirs) |
| Per-frame tick with a duration argument | Region and water sound updaters (theirs); update throttle `sMinUpdateInterval` = 1/30 s (line 54, theirs) |

## 4. TypeScript sketch

Clean-room sketch: written from the mechanism above, no lines translated.

simplified: the title-track rule, the stream object and decoder, `updateFade` semantics (the donor's `updateFade` returns false when a stop-at-end fade is over), empty-filename stop and the per-type volume are omitted; a request during a fade replaces the queued path and restarts the fade (the donor restarts a volume ramp from the current fade volume; the sketch restarts a plain timer); the donor's `updateMusic` runs only after a 1/30 s throttle in `updateSounds` and also resets `mMusicType` to Normal whenever no stream exists (the sketch returns early when idle).

```ts
// Licence: GPL-3 - clean-room sketch, no lines translated
// Clean-room: one music slot. Scripted music holds the slot; a new request fades the current track and queues the next.
type MusicType = 'normal' | 'scripted';

class MusicSlot {
  private musicType: MusicType = 'normal';
  private playing = false;
  private queued: string | null = null;
  private fadeLeft = 0;

  request(path: string, type: MusicType, fadeSeconds: number): void {
    if (this.musicType === 'scripted' && type !== 'scripted') return;
    this.musicType = type;
    if (!this.playing) {
      this.start(path);
      return;
    }
    this.queued = path;
    this.fadeLeft = fadeSeconds;
  }

  update(dt: number, streamPlaying: boolean): void {
    if (!this.playing) return;
    if (this.fadeLeft > 0) this.fadeLeft -= dt;
    const fadeDone = this.queued !== null && this.fadeLeft <= 0;
    if (fadeDone || !streamPlaying) {
      this.playing = false;
      const next = this.queued;
      this.queued = null;
      if (next !== null) this.start(next);
      else this.musicType = 'normal';
    }
  }

  private start(path: string): void {
    this.playing = true;
    this.fadeLeft = 0;
    void path; // the host opens and plays the stream here
  }
}
```

## 5. Lands in

- Frankendom file(s): TARGET `src/fight/sound.ts` (single music slot with fade-and-queue). The zone choice that picks a track belongs with the zone data.
- Parity-checklist row: 12 (combat sound cues), the nearest row; the scripted hold is the nearest thing to a combat override, but no row covers ambient music.
- Reuse tag: rewrite-from-idea. The single slot with a queue is a generic idea; the code is GPL-3.
- Brief rule served: (category default, not per-cell) zone-schema rule; rules 7-9 n/a

## 6. Gaps and risks

- No combat override by name: the scripted hold is a generic lock, not a combat rule. Frankendom needs fight-state priority, which this does not supply.
- No zone-keyed playlist. The donor drives tracks from script and region code, not from zone data.
- Track start on the main thread inside `streamMusicFull` (decoder open is synchronous in the code shown). Whether that stalls at scale was not measured.
- A failed decoder open logs and returns with the old track already stopped. The player gets silence, not the previous track.
- Licence GPL-3: clean-room only.
- Client only. It does not conflict with the one-engine ruling, because music is not a fight system; a combat override would read the server-verified fight state in `src/fight/`.
