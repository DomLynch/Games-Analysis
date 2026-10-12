# Warzone2100-warzone2100 (sound-music, cell 15)

Donor: `/mnt/frankendom-donors/Warzone2100-warzone2100/lib/sound/audio.cpp` (with `track.h`, `track.cpp`, `openal_track.cpp`, `cdaudio.cpp`, `playlist.cpp`, data `data/base/audio/audio.json`) | Licence: GPL-2.0-or-later (`audio.cpp` header lines 8-9: "version 2 of the License, or (at your option) any later version"; `COPYING` is the GPL v2 text; clean-room, shape only) | C++ | symbol `audio_CheckTooManySame3DTracksPlaying` (voice cap) with `audio_Play3DTrack` (caller)

Checked: Read end to end: the same-cue voice cap (audio.cpp 609-645) and its use in the 3D play path (653-700, up to the add-to-list call at 720). Read in part: the cue loader (68-92), the 2D queue cap (270-300, 320), the repeat cooldown (865-875), track storage (track.cpp 96-137, 269-275), the per-frame cull and per-sample gain (openal_track.cpp 436-470, 731-740, 1395-1420), the music stop/open/next/mode code (cdaudio.cpp 140-330), the playlist filter, next and random start (playlist.cpp 362-382, 573-647). Not read: `sound_Play3DTrack` (the OpenAL source creation), the playlist JSON loader (388-508), the name of the function that holds openal_track.cpp 1395-1420, and the unit of `realTime`. The cue table was counted with python (`python3 -I`, read only) over `data/base/audio/audio.json`: 32 groups (33 top-level keys, of which `_Format` is a comment block), 357 entries, 8 with `loop` true, `volume` 5-100, `range` 1800 for every entry. camera_scope: n/a. Confidence high on the voice cap, the gain constants and the music hard cut (read whole). Grep over `lib/sound` found no `fade`, no `stinger` and no ambience bed (the only `ambient` hits in `src/` are lighting terms), so those absences are from search, not from reading every file.

## 1. Mechanism

Two halves: 3D cues (hits, speech, effects) and one music stream.

- **Cue table (data).** `data/base/audio/audio.json` holds groups of cue entries, each with a file name, a `loop` flag, a `volume` (0-100) and a `range` (the audible radius). The loader reads each group's `data` array and calls `audio_SetTrackVals` (audio.cpp 84-87), which stores the radius on the track (track.cpp 137). Every one of the 357 entries has `range` 1800 (counted, not read line by line).
- **3D play order (audio.cpp 653-720).** (a) If audio is disabled or paused, return false. (b) Voice cap: `audio_CheckTooManySame3DTracksPlaying(track, x, y, z)` (668). (c) Distance from the listener to the source (the listener is read with `alGetListener3f`). (d) Linear gain `1 - distance x 0.0003`, clamped to 0..1 (687-694). (e) If gain is exactly 0, return false (697): the sample is not added. (f) Allocate the sample, store position and track (711), and add it to the playing list (720).
- **Voice cap rule (audio.cpp 609-645).** Walk the playing samples. For each sample of the same track, take the squared distance from its source point to the new source point (627-630). If that squared distance is under the cue's radius squared (631-633), count it. As soon as the count is greater than 2 (`MAX_SAME_SAMPLES`, line 42; check at 638), refuse the new cue. So a new copy is accepted while at most two copies are already in earshot at that spot, and refused when three are. The check uses source points, not the listener. A refused cue is dropped: nothing is queued, and no older voice is stopped.
- **2D queue cap (audio.cpp 270-300, 320).** The same count, without position, over the queued (not yet playing) samples. Refused when more than two of the same cue are queued.
- **Per-frame cull (openal_track.cpp, `sound_Update`, test at 454).** `sound_Update` reads each playing source's gain; if it is exactly 0, the sample is destroyed (454).
- **Per-sample gain (openal_track.cpp 1410).** `gain = (1 - distance x ATTENUATION_FACTOR) x sample volume x 3D volume`, then clamped (the clamp lines follow 1410; not counted). Sample volume is the track volume over 100 (738).
- **Repeat cooldown (audio.cpp 865-875).** `audio_PlayBuildFailedOnce` plays the build-fail cue only when `realTime - last >= 100` (869), then stores the time (872). The cooldown is for one cue only.
- **Music (cdaudio.cpp).** One stream. `cdAudio_OpenTrack` (184) first stops the old stream (196, which calls `sound_StopStream` at 147), then opens the new one at once (201) with `music_volume x base_volume / 100`, clamped 0-1 (178-180). When a track ends, `cdAudio_TrackFinished` (233) asks the playlist for the next track (227). On the start of an in-game session the playlist starts at a random point (283; playlist.cpp 613-631): it takes `rand() % N` steps along the filtered ring, where N is the full list size (619). A game-mode change (`cdAudio_SetGameMode`, 311-329) only re-filters the playlist (316, playlist.cpp 362-381). The current stream keeps playing; the new filter takes effect at the next track. One exception: when `queued_play_track_while_loading` is set (saved-game load), the call clears it and calls `cdAudio_PlayTrack` (326-329), which starts music at once.
- **Tick.** The 3D cap and gain run when a sound is requested (game event). The cull runs in `sound_Update`; the comment above it says it is called from `audio_update()` in the render loop ("gets called in audio.cpp: audio_update(), which gets called in renderLoop()").

## 2. Key functions

- `audio_CheckTooManySame3DTracksPlaying`: `/mnt/frankendom-donors/Warzone2100-warzone2100/lib/sound/audio.cpp` 609-645. The voice cap.
- `audio_Play3DTrack`: same file, 653-720 (read to the add call at 720; the call into `sound_Play3DTrack` not read).
- `audio_CheckTooManySameQueueTracksPlaying`: same file, 270-300 (2D queue cap).
- `audio_PlayBuildFailedOnce`: same file, 865-875 (repeat cooldown).
- `loadAudioEffectFileData`: same file, 68-92 (loader).
- `sound_Update`: `/mnt/frankendom-donors/Warzone2100-warzone2100/lib/sound/openal_track.cpp` (read 425-470; the cull test at 454) (per-frame cull).
- Per-sample gain: same file, 1395-1420 (name not read).
- `sound_SetTrackVals` and `sound_GetTrackAudibleRadius`: `/mnt/frankendom-donors/Warzone2100-warzone2100/lib/sound/track.cpp` 96-137 and 269-275.
- `cdAudio_OpenTrack`, `cdAudio_TrackFinished`, `cdAudio_SetGameMode`: `/mnt/frankendom-donors/Warzone2100-warzone2100/lib/sound/cdaudio.cpp` 184-205, 233-258, 311-329.
- `PlayList_FilterByMusicMode`, `PlayList_FindNextMatchingTrack`, `PlayList_NextSong`, `PlayList_RandomizeCurrentSong`: `/mnt/frankendom-donors/Warzone2100-warzone2100/lib/sound/playlist.cpp` 362-381, 573-589, 606-611, 613-631.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Refuse a same-cue copy when too many copies are already in earshot at that spot (drop, no queue, no steal) | Cap of 2 existing copies (theirs, audio.cpp 42; check at 638) |
| Radius per cue, read from data | Every entry is 1800 (counted from audio.json; stored at track.cpp 137) |
| Linear distance falloff to zero | 0.0003 per unit (theirs, track.h 31). Gain is 0 at 3333.3 units (1 / 0.0003, computed by hand, not run). At 1800 units gain is 0.46 (computed by hand) |
| Cue volume on a 0-100 scale | Divided by 100 (theirs, openal_track.cpp 738) |
| Zero gain means inaudible: do not add, and cull | Exact zero test (theirs, audio.cpp 697; openal_track.cpp 454) |
| Repeat cooldown for an annoying cue | 100 in `realTime` units; the unit was not read (theirs, audio.cpp 865, 869) |
| Music default volume | 0.5 (theirs, cdaudio.cpp 40); track volume = music x base/100 (178), clamped (180) |
| Random start in a playlist | `rand() % N` steps, N = full list size (theirs, playlist.cpp 619) |

## 4. TypeScript sketch

simplified: the sketch keeps the same-cue voice cap (refuse when more than two copies of the same cue are already inside the cue's radius of the new source), the zero-gain refusal, the linear falloff (0.0003 per unit, volume 0-100 scaled to 0-1), the per-frame zero-gain cull and an optional repeat cooldown. The cooldown is taken from the build-fail cue only and is checked before the cap; in the donor it is a separate function. It omits the OpenAL source handles and streaming, the 2D queue variant (the same rule counted without position), the 3D volume scale, the callbacks, the cue-table loader and the music stream, and it takes `now` as a parameter instead of `realTime`. It fixes one defect: the donor's squared distance is 32-bit int math (floats here). Otherwise the order matches the donor: the voice cap is checked before the listener gain, and a zero gain is refused before the voice is added.

```ts
// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Vec3 = { x: number; y: number; z: number };

// Per-cue data (donor: one track entry with a volume 0-100 and an audible radius).
interface CueData {
  id: string;
  audibleRadius: number;   // world units; donor reads it per track
  volume: number;          // 0-100 scale, as in the donor data
  cooldownMs: number;      // 0 = no repeat cooldown
}

interface Voice {
  cue: string;
  pos: Vec3;
  volume: number;          // 0-1 (volume / 100)
  gain: number;            // last computed gain, 0-1
}

const MAX_SAME = 2;        // donor MAX_SAME_SAMPLES: refuse when the count of same-cue sources in radius exceeds this
const ATTENUATION = 0.0003; // donor ATTENUATION_FACTOR per world unit; gain reaches 0 at 1 / 0.0003 units

function dist(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz); // floats here: the donor's int math overflows for large offsets
}

function gainAt(d: number, volume: number): number {
  let g = (1 - d * ATTENUATION) * volume;
  if (g > 1) g = 1;
  if (g < 0) g = 0;
  return g;
}

class VoicePool {
  private voices: Voice[] = [];
  private lastPlayed = new Map<string, number>();

  constructor(private cues: Map<string, CueData>) {}

  // Drop policy: a refused cue is never queued and never evicts an older voice.
  tryPlay(cueId: string, pos: Vec3, listener: Vec3, now: number): boolean {
    const cue = this.cues.get(cueId);
    if (!cue) return false;

    // Optional repeat cooldown (donor: audio_PlayBuildFailedOnce).
    if (cue.cooldownMs > 0) {
      const last = this.lastPlayed.get(cueId);
      if (last !== undefined && now - last < cue.cooldownMs) return false;
    }

    // Voice cap: count same-cue sources already inside this cue's radius of the new source.
    let count = 0;
    for (const v of this.voices) {
      if (v.cue !== cueId) continue;
      if (dist(v.pos, pos) < cue.audibleRadius) {
        count++;
        if (count > MAX_SAME) return false;
      }
    }

    // Inaudible at the listener: do not add it (donor: gain == 0 returns false).
    const vol = cue.volume / 100;
    const gain = gainAt(dist(pos, listener), vol);
    if (gain === 0) return false;

    this.voices.push({ cue: cueId, pos, volume: vol, gain });
    this.lastPlayed.set(cueId, now);
    return true;
  }

  // Per frame: recompute gains and cull voices that reach zero (donor: sound_Update).
  update(listener: Vec3): void {
    this.voices = this.voices.filter(v => {
      v.gain = gainAt(dist(v.pos, listener), v.volume);
      return v.gain > 0;
    });
  }

  activeCount(): number {
    return this.voices.length;
  }
}

export {};
```

## 5. Lands in

- TARGET `origins/client/audio/voices.ts` (new; client-only, since sound is client-only by ruling). The server sends the cue id and the source position from the simulation object; the client runs the cap and the gain. The pool is shared by hits, telegraphs and speech.
- Parity-checklist row: 12 (combat sound cues). The brief's hint was row 14 (HUD); the cue table is combat sound, so row 12.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only; the shape of the cap and the radius-per-cue table is taken, no donor line is translated)
- Brief rule served: 1 (one engine, zones as data); sound is client-only, so the server carries only cue id and position

## 6. Gaps and risks

- Licence: GPL-2.0-or-later. The sketch is written from the mechanism only.
- Defect A, 32-bit overflow. The donor computes the squared source distance in `SDWORD` (audio.cpp 627-630). The sum of the three squared offsets passes 2^31 - 1 when the offsets are large: about 26,750 units per axis if all three axes differ by that much, or about 46,340 units if only one axis does (arithmetic, not run). Fix: float or 64-bit maths, as in the sketch. Whether a Frankendom zone reaches those offsets was not checked.
- Defect B, two radii that do not agree. The cap uses the cue radius (audio.cpp 631; 1800 for every cue in the data) and the gain reaches zero at 3333 units (track.h 31). A cue at 2000 units is not counted in the cap but is still heard at about 0.4 gain (computed by hand). Fix: one radius per cue, with the falloff derived from it, so the cap and the audible range match.
- Defect C, no priority. The cap refuses the newcomer and never evicts. A boss telegraph can be dropped behind three hit sounds. Fix (not in the donor): a priority tier per cue; a high-priority cue may evict the lowest-priority voice of the same cue or a lower tier. The priority bypass is a proposal, not something the donor shows.
- Gap D, the cap ignores the listener. A quiet copy far from the camera counts the same as a loud one. Frankendom should consider listener distance in the count if many quiet hits stack near the camera.
- Music, hard cut. `cdAudio_OpenTrack` stops the old stream at once (cdaudio.cpp 196, 147) with no fade. The donor has no crossfade anywhere in `lib/sound`. If Frankendom adds a zone bed, the fade has to be built (the Valve donor shows a shape: step is frame time over fade time; that is a different licence, so the shape only).
- Music mode change is deferred. `cdAudio_SetGameMode` re-filters (316), so a mode change is heard at the next track end, except the saved-game-load case where a queued track is started immediately (326-329). For zone entry that is too slow; Frankendom needs an explicit switch.
- Random start is not uniform over the filtered tracks: the step count comes from the full list (619) while the walk skips filtered-out tracks, so a track after a run of filtered-out tracks gets more starts. (Reasoned from the loop; not measured.)
- Absences, from search: no stingers, no layered music (one stream), and no ambience beds per biome in `lib/sound`. The cue table holds speech and combat and UI cues only. Frankendom must design the beds and stingers itself.
- OpenAL specifics (source handles, state queries, the error polling) do not port; the sketch keeps only the rules.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: 1 (one engine, zones as data); sound is client-only; the server carries only cue id and position

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- "cdAudio_SetGameMode only re-filters" was incomplete: when queued_play_track_while_loading is set it clears it and calls cdAudio_PlayTrack (cdaudio.cpp 326-329). Confirmed.
- "33 groups" in audio.json: _Format is a comment block, so 32 real groups. Confirmed (33 top-level keys).
- Missed: none significant.
Fixed 2026-10-12: group count, SetGameMode mechanism line and the deferred-mode-change defect line. Sketch unchanged.
