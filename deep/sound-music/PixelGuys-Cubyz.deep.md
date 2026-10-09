# PixelGuys-Cubyz (sound-music, cell 15)

Donor: /mnt/frankendom-donors/PixelGuys-Cubyz/src/audio.zig | Licence: GPL-3 | Zig | symbol findMusic / MusicLoadTask

## 1. Mechanism
- findMusic(id) is a non-blocking lookup for a music track. It takes the task mutex. If the track is already in the decoded cache, it returns the decoded float samples. If a load for that id is already queued, it returns null. Otherwise it schedules a load and returns null. The caller keeps whatever it is playing until samples arrive.
- MusicLoadTask is a thread-pool task with the highest possible priority and that is never cancelled (isStillNeeded is always true). schedule duplicates the id, adds the task to the pool and records the id as active.
- run (191-198) calls `AudioData.init` (76-116), which decodes the OGG file (stb_vorbis) into interleaved float samples. The file is looked up under `assets/<addon>/music/<name>.ogg`, then under the server-assets folder; a missing file yields a 2-float silent buffer (112-113). When the file's sample rate differs from the device's 44100, it is read as stereo and resampled with linear interpolation (85-105); when equal, it is read with the file's own channel count (107-109), so a mono file stays mono in a buffer the mixer reads as stereo pairs. The result is added to the music cache, and any old entry for the same key is freed.
- The cache is `Cache(AudioData, 4, 4, ...)` (line 142): 4 buckets of 4 entries, 16 in all (its replacement policy is in `utils.zig` 1355-, not read). The key is the id's byte sum (124-130), with equality on the id.
- Playback (`setMusic` 283-289, `mixMusic` 291-336): `setMusic` stores the preferred track id. Each audio buffer, `mixMusic` (under a mutex) compares it with the active id. With nothing active it calls `findMusic` and starts the track when the samples arrive. If a different track is wanted while one plays, it prefetches the new one (302), then fades the current one out over 5 s (`animationLengthInSeconds`, line 278) along a cubic spline (`unitIntervalSpline`, 305); when the fade ends the active id is cleared and the new track starts on a later buffer. If the original track is wanted again mid-fade, it fades back in (307-311). The buffer loops (pos wraps at 332-334) and is scaled by `settings.musicVolume`. It is called from the miniaudio data callback (338-350), so it runs on the audio thread; the device is fixed at stereo f32, 44100 Hz (219-231).
- Inputs: track id. Output: sample buffer or null. findMusic is called from `mixMusic`, on the audio thread; decoding runs on a worker thread.

## 2. Key functions
- findMusic (Cubyz) | /mnt/frankendom-donors/PixelGuys-Cubyz/src/audio.zig | 144-159 | cache hit returns samples; otherwise schedule a load once and return null.
- MusicLoadTask.schedule (Cubyz) | /mnt/frankendom-donors/PixelGuys-Cubyz/src/audio.zig | 172-181 | queues the decode and records the id as active.
- MusicLoadTask.run (Cubyz) | /mnt/frankendom-donors/PixelGuys-Cubyz/src/audio.zig | 191-198 | decodes and swaps the result into the cache.
- AudioData.init (Cubyz) | /mnt/frankendom-donors/PixelGuys-Cubyz/src/audio.zig | 76-116 | open the OGG, resample if the rate differs, silent buffer if missing.
- mixMusic (Cubyz) | /mnt/frankendom-donors/PixelGuys-Cubyz/src/audio.zig | 291-336 | per-buffer: pick the active track, 5 s spline fade, loop, volume.
- setMusic (Cubyz) | /mnt/frankendom-donors/PixelGuys-Cubyz/src/audio.zig | 283-289 | stores the preferred track id under the mutex.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Non-blocking request: return null and load in the background | none (algorithm) |
| De-duplicate in-flight loads by id | none (algorithm) |
| Decode off the audio thread, swap into a cache | cache 4 buckets x 4 entries (line 142); fade 5 s (line 278); device 44100 Hz stereo (219-231) (theirs) |
| Highest priority for the music load | float maximum (`getPriority`, line 184) (theirs) |

## 4. TypeScript sketch
simplified: the load side only. The 5 s spline fade, the preferred/active id handling, looping and the audio-thread mixing (`mixMusic`) are omitted; the sketch's cache is unbounded where the donor's holds 16; the decode (path search, resample, silent fallback for a missing file) is a callback; and `run` in the donor adds to the cache before `clean` removes the id from the active list.

```ts
// Licence: GPL-3 (PixelGuys-Cubyz). CLEAN-ROOM: written from the mechanism, no donor lines.
type Samples = { data: Float32Array; channels: 1 | 2 };
const cache = new Map<string, Samples>();     // decoded tracks by id (the donor's cache is 4 entries)
const pending = new Set<string>();            // ids with a load in flight
const queue: string[] = [];

// Non-blocking: return samples if decoded, otherwise queue one load and return null.
function findMusic(id: string): Samples | null {
  const hit = cache.get(id);
  if (hit) return hit;
  if (!pending.has(id)) {
    pending.add(id);
    queue.push(id);
  }
  return null;
}

// Worker side: decode, swap into the cache, clear the in-flight mark.
function runLoad(id: string, decode: (id: string) => Samples): void {
  const s = decode(id);
  cache.set(id, s);
  pending.delete(id);
}

// Drain the queue on a worker; each id runs once.
function pump(decode: (id: string) => Samples): void {
  while (queue.length > 0) runLoad(queue.shift()!, decode);
}
```

## 5. Lands in
- Frankendom target: `src/fight/sound.ts` (non-blocking music request plus a 5 s style fade between zone tracks), preferred track chosen from zone data.
- Parity row: 12 (combat sound cues), the nearest row; music has none.
- Reuse tag: rewrite-from-idea (GPL-3)
- Brief rule served: (category default, not per-cell) zone-schema rule; rules 7-9 n/a

## 6. Gaps and risks
- Threaded decode with a mutex. A Frankendom web build has a single UI thread unless workers are used; the pattern transfers as an async load with a null-until-ready result.
- The cache's eviction policy (`utils.zig` 1355-) is not read. The sketch has no eviction; Frankendom must cap memory itself.
- The preferred track is the zone's music id ("we returned to the biome" comment, line 307): under zones as data, the music id is a zone field with a default, and the fade is client-only.
- A mono OGG at the device rate is stored mono but mixed as stereo pairs (lines 107-109 vs 316-330); Frankendom should normalise to stereo on decode.
- Music state is client audio and must not touch the one fight engine or the record.
