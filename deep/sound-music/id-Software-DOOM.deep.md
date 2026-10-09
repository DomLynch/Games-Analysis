# id-Software-DOOM (sound-music, cell 15)

Donor: /mnt/frankendom-donors/id-Software-DOOM/sndserv/soundsrv.c | Licence: GPL-2 | C | symbol mix / updatesounds

## 1. Mechanism
- This is the external sound server of DOOM. It mixes eight voices into a stereo 16-bit buffer and writes the buffer to the output device. `updatesounds` (410-416) runs `mix()` and calls `I_SubmitOutputBuffer(mixbuffer, SAMPLECOUNT)`; who calls `updatesounds` and how often was not read, nor was `I_SubmitOutputBuffer`.
- addsfx(sfxid, volume, step, separation) assigns a voice. Six special sounds (four saw sounds, stone move, pistol; 438-443) first cut one voice found playing the same sound (the loop at 445-451 leaves after the first match). Then the first free voice is used (the scan at 455 stops at the first empty slot). If all eight are busy, the voice with the oldest start time is stolen (the age test is `channelstart < oldest`, 457; the start times come from the server clock `mytime`, stored at 478, whose updates are not in the opened range). The voice gets the sample pointer and end, the step (pitch), a handle from an unsigned 16-bit counter that starts at a fixed value (472-475), and its start time. The sound data are 8-bit samples.
- Stereo: separation is shifted by one (480-481). Left gain is volume minus volume times the square of the separation, over 65536. Right gain is the mirror, from the opposite end. Each gain (0..127) selects a 256-entry row of `vol_lookup` (502-503), built elsewhere; the donor calls `derror` (an error handler, 136-139) if a gain falls outside 0..127 (494-498).
- mix() writes SAMPLECOUNT stereo frames. For each frame and each of the eight voices, it reads the current sample, adds the left and right table values to the mix, then advances the voice by its step (a 16-bit fraction in `channelstepremainder`); a voice that reaches its end is stopped. The eight voices are unrolled by hand (168-269). The sums go to a signed 16-bit output (the older char-range clamp is commented out, 271-278) and are clamped at 280-292 (lines too short to quote).
- Inputs: sound requests (id, volume, step, separation). Output: one buffer per `updatesounds` call (the caller was not read).

## 2. Key functions
- mix (DOOM) | /mnt/frankendom-donors/id-Software-DOOM/sndserv/soundsrv.c | 142-299 | eight-voice mixer: table gains, 16.16 step, end stop, 16-bit clamp.
- updatesounds (DOOM) | /mnt/frankendom-donors/id-Software-DOOM/sndserv/soundsrv.c | 410-416 | runs mix and submits the buffer.
- addsfx (DOOM) | /mnt/frankendom-donors/id-Software-DOOM/sndserv/soundsrv.c | 419-509 | voice choice (cut same, free slot, steal oldest), stereo gains from separation.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Fixed polyphony with steal of the oldest voice | 8 voices (theirs) |
| Cut the same cue before retriggering certain cues | six cue ids (theirs) |
| Stereo gain from separation with a squared law | separation range (theirs); 65536 scale (theirs, 256*256 at 485) |
| Pitch as a 16.16 fixed-point step | the step is supplied per request (theirs) |
| Handles from a counter | start value (theirs, 473) |
| Mix in fixed frames per tick | frame count per buffer (theirs, SAMPLECOUNT) |

## 4. TypeScript sketch
simplified: gains use floating-point division (the donor uses integer division and treats out-of-range gains as an error); the sketch cuts every voice with a cut-same id, the donor only the first; the age clock is a per-call counter, not the server's `mytime`; the donor's gain lookup is a table (the sketch's `gain` is a stand-in) and its eight voices are unrolled.

```ts
// Licence: GPL-2 (id-Software-DOOM). CLEAN-ROOM: written from the mechanism, no donor lines.
type Voice = { data: Uint8Array; pos: number; frac: number; step: number; left: number; right: number; id: number; start: number };
const VOICES = 8;
const voices: (Voice | null)[] = new Array(VOICES).fill(null);
const CUT_SAME = new Set<number>();           // ids of the six special cues (theirs; fill from the data)
let clock = 0, nextHandle = 100;

function addsfx(id: number, volume: number, step: number, sep: number, data: Uint8Array): number {
  if (CUT_SAME.has(id)) voices.forEach((v, i) => { if (v && v.id === id) voices[i] = null; });
  let slot = voices.findIndex((v) => v === null);
  if (slot < 0) {                                                  // all busy: steal the oldest
    slot = 0;
    for (let i = 1; i < VOICES; i++) if (voices[i]!.start < voices[slot]!.start) slot = i;
  }
  const s = sep + 1;                                               // 1..256
  const left = volume - (volume * s * s) / 65536;
  const right = volume - (volume * (s - 257) * (s - 257)) / 65536;
  voices[slot] = { data, pos: 0, frac: 0, step, left, right, id, start: clock++ };
  return nextHandle++;
}

// Stand-in for the donor's volume-by-sample table: the table itself was not read.
const gain = (vol: number, sample: number) => (vol * (sample - 128)) / 128;

function mixFrames(out: Int16Array): void {                        // interleaved stereo
  for (let f = 0; f < out.length / 2; f++) {
    let l = 0, r = 0;
    for (let i = 0; i < VOICES; i++) {
      const v = voices[i];
      if (!v) continue;
      const s = v.data[v.pos];
      l += gain(v.left, s); r += gain(v.right, s);
      v.frac += v.step; v.pos += v.frac >> 16; v.frac &= 0xffff;   // 16.16 step
      if (v.pos >= v.data.length) voices[i] = null;                // voice ended: free the slot
    }
    out[2 * f] = Math.max(-32768, Math.min(32767, Math.round(l)));
    out[2 * f + 1] = Math.max(-32768, Math.min(32767, Math.round(r)));
  }
}
```

## 5. Lands in
- Frankendom target: `src/fight/sound.ts` (voice cap and steal-oldest rule for cue playback).
- Parity row: 12 (combat sound cues).
- Reuse tag: rewrite-from-idea (GPL-2)
- Brief rule served: (category default, not per-cell) zone-schema rule; rules 7-9 n/a

## 6. Gaps and risks
- A separate process fed by a pipe, 1990s hardware target. The IPC and the device path do not transfer.
- The voice cap is a fixed 8. Frankendom's cap is a design choice for Lead and Strategy, not something to copy here.
- The gain table (`vol_lookup`, indexed at 502-503) is built elsewhere and was not read; the sketch's gain function is a placeholder, labelled as such. The donor treats a gain out of range as an error (`derror`); Frankendom should clamp.
- Handles and the cut-same list are donor-specific.
- The cut-same list is a fixed set of ids in code; Frankendom would hold it as data (a per-cue flag with a default).
- Cue playback is a client consumer of the one fight state; with MAX_ATTACKERS = 3 the voice cap can be sized to a duel rather than copied.
