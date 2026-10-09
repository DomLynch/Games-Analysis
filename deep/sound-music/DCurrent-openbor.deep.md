# DCurrent-openbor (sound-music, cell 15)

Donor: /mnt/frankendom-donors/DCurrent-openbor/engine/source/gamelib/soundmix.c | Licence: BSD-3-Clause-style per root LICENSE (OpenBOR Team / Senile Team; soundmix.c header points to it); clean-room only | C | symbol mixaudio / sound_play_sample_with_options / sound_find_lowest_priority_channel

## 1. Mechanism
- A software sound mixer. A fixed pool of playback channels (grouped in banks, tracked by bit masks) holds the active sounds. The mixer fills an output buffer of a given length (todo): `update_sample` (1760-) clears the mix buffer and calls `mixaudio(todo)` at line 1800; that this runs on the audio thread was inferred from the "Soundblaster ISR" comment (1757-1758) and the `SB_lock_audio` calls, and the platform callback that invokes it was not read.
- Playing a sound (sound_play_sample_internal, called by the with-options and offset wrappers): take a free channel from the pool. If none is free, find the active, non-reserved channel with the lowest priority value. The new sound takes that channel only if that channel's priority is not above the new sound's priority. Otherwise the request is refused and returns -1. A forced channel can be requested (2410-2438); it is refused when it is busy with a sound whose priority value is above the new one. Higher value wins: the lowest-priority scan uses a strict `<`, so on ties the first channel found is the victim. Pool: 64-channel banks (`sound_channel.h` 28), total `SOUND_CHANNEL_COUNT_MAX`; free-channel acquisition (`sound_channel_pool_acquire`) was not read.
- Volume: left and right volumes are clamped to 0..`MAX_SAMPLE_VOLUME` (2451-2462). The mixer multiplies each side by the channel volume and divides by `volume_divisor` (default `MAX_SAMPLE_VOLUME`, 1683-1685, 1736-1739).
- Start state (2485-2515): a start frame is optional; without one the channel index staggers the start phase (2492-2494). The record also stores delay frames, a play-chance with a random roll (`rand32`), an owner and a group; `sound_channel_prepare_mix`, which presumably gates on them, was not read.
- Mix (mixaudio): walks only active, unpaused channel bits, bank by bank. Streaming channels go to a separate stream mixer. Other channels read the sample at a fixed-point position, convert the sample to a mix value (8, 16 or 24 bits; mono or stereo), linearly interpolate to the next frame when the position is fractional (1701-1734, wrapping to the loop start for a looping channel), and add it to the left and right output with the channel volumes. The position advances by a fixed-point period per output frame (`sound_sample_position_advance`, not read); a channel that reaches the end and is not looping is deactivated. Invalid samples or channel records are deactivated (1658-1675).
- Inputs: sample number, priority, left and right volume, speed, loop and start options, forced channel. Outputs: a channel id (playid) or -1, and mixed samples per buffer.
- Play requests take the audio lock only around channel selection and activation (2409-2449, 2474-2482, 2530-2532); the sample setup between them is unlocked.

## 2. Key functions
- mixaudio (OpenBOR) | /mnt/frankendom-donors/DCurrent-openbor/engine/source/gamelib/soundmix.c | 1586-1754 | per-buffer mix over active channels with fixed-point position, sample conversion and pan volumes.
- sound_find_lowest_priority_channel (OpenBOR) | /mnt/frankendom-donors/DCurrent-openbor/engine/source/gamelib/soundmix.c | 2280-2309 | returns the active, non-reserved channel with the smallest priority value.
- sound_play_sample_internal (OpenBOR) | /mnt/frankendom-donors/DCurrent-openbor/engine/source/gamelib/soundmix.c | 2370-2535 | allocates a channel: free, forced, or steal the lowest priority under the rule above.
- sound_play_sample_with_options (OpenBOR) | /mnt/frankendom-donors/DCurrent-openbor/engine/source/gamelib/soundmix.c | 2541-2564 | public entry: validates a forced channel and forwards to the internal call.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Fixed channel pool with a priority allocator: free first, else steal the lowest priority not above the new one | Bank size 64 (`sound_channel.h` 28) and pool size `SOUND_CHANNEL_COUNT_MAX` (line 29, banks times 64) (theirs) |
| Mix only active channels, skip paused ones | Bank mask layout (theirs, 64-bit masks) |
| Fixed-point playback position with a period per frame, loop wrap | Fixed-point format (theirs) |
| Left and right channel volumes with a clamp to max | `MAX_SAMPLE_VOLUME` = 100 (theirs, soundmix.c 78) |
| Sample conversion from 8, 16 or 24 bit, mono or stereo | Supported bit depths and channel layouts (theirs) |

## 4. TypeScript sketch
simplified: no volume clamp, sample validation, start-phase stagger, delay or chance fields, streaming path, interpolation, looping or fixed-point position; `mixBuffer` delegates sample reading to a callback; the stolen channel's stream is closed and its record cleared in the donor (2481-2484).

```ts
// Licence: BSD-style 3-clause (DCurrent-openbor). CLEAN-ROOM: from the mechanism description; no donor lines.
interface Channel { id: number; priority: number; reserved: boolean; active: boolean; paused: boolean; }
interface Pool { channels: Channel[]; }

function findLowest(pool: Pool): Channel | null {
  let best: Channel | null = null;
  for (const c of pool.channels) {
    if (!c.active || c.reserved) continue;
    if (best === null || c.priority < best.priority) best = c;
  }
  return best;
}

function playSample(pool: Pool, priority: number, forced?: number): number {
  let ch: Channel | undefined;
  if (forced !== undefined) {
    ch = pool.channels[forced];
    if (ch && ch.active && ch.priority > priority) return -1;   // busy with a higher one
  } else {
    ch = pool.channels.find((c) => !c.active);                   // free channel first
    if (!ch) {
      const victim = findLowest(pool);
      if (!victim || victim.priority > priority) return -1;      // refuse
      ch = victim;
    }
  }
  ch.active = true; ch.priority = priority; ch.paused = false;
  return ch.id;
}

function mixBuffer(pool: Pool, frames: number, sampleAt: (ch: Channel, f: number) => [number, number]): Float32Array {
  const out = new Float32Array(frames * 2);
  for (const c of pool.channels.filter((c) => c.active && !c.paused)) {
    for (let f = 0; f < frames; f++) {
      const [l, r] = sampleAt(c, f);
      out[2 * f] += l; out[2 * f + 1] += r;
    }
  }
  return out;
}
```

## 5. Lands in
- Frankendom file(s): TARGET `src/fight/sound.ts` (channel priority and stealing for combat cues). Most of the mixer engine is more than Frankendom needs.
- Parity-checklist row: 12 (combat sound cues).
- Reuse tag: rewrite-from-idea (BSD-style licence; mechanism only by project convention). Frankendom likely uses the browser's audio graph rather than a software mixer.
- Brief rule served: (category default, not per-cell) zone-schema rule; rules 7-9 n/a

## 6. Gaps and risks
- A software mixer in C. Frankendom runs in the browser, so the audio graph is the platform's; this file is only a reference for priority and channel stealing.
- Priority rule as read: higher value wins, a steal needs the victim's value at most the new one's (line 2443), and ties go to the first channel scanned. Frankendom's cue priorities would be data (zones as data) with a default.
- Licence is BSD-style (3-clause, attribution kept): the sketch is clean-room only by project convention and no code is copied.
- The record holds a random play-chance roll (`rand32`, line 2510). Under the one-engine and server-verified rulings, cue randomness must not share the fight RNG, and audio timing must not affect fight state or the fight record (row 19).
