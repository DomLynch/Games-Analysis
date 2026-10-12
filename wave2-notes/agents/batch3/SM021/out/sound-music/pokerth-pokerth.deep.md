# pokerth-pokerth (sound-music, cell 15)

Donor: `/mnt/frankendom-donors/pokerth-pokerth/src/gui/qt/sound/qtaudioplayer.cpp` | Licence: AGPL-3.0 (repo COPYING, GNU AGPL v3; qtaudioplayer.cpp has no licence header of its own, and the sibling soundevents.cpp header says "version 3 of the License, or (at your option) any later version") | C++ (Qt) | symbol `WavMixer::readData`

Checked: read `WavMixer::play` (150-162), `WavMixer::stopAll` (181-183), `WavMixer::readData` in full (191-237), the sink start and stop-on-background path (684-704, 615-622), and `soundevents.cpp` in full (blinds-raise tiers and the new-game reset). Confidence high on the mixer order of operations and the 1/sqrt(N) gain (all those lines read). Not read: the Qt sink callback plumbing beyond the `readyRead` emit, the WAV parser (`loadWav`), the Windows WinMM path, and the Android sink re-creation timing. Grep of qtaudioplayer.cpp for volume, fade, crossfade, music, ambien, priority, voice, layer, loop found no music bed, crossfade or priority logic (only the one-shot loop count of 1 in the QSoundEffect backend, line 447). soundevents.cpp was read in full, not grepped. camera_scope: n/a (sound).

Best transferable idea: mix every overlapping one-shot cue into one output buffer at equal-power gain 1/sqrt(N), so several hits in the same window do not clip, and drop cues instead of queuing them when there is no consumer.
Decision (proposed): adapt — take the overlap gain and the drop-when-no-sink rule for many-on-one hit cues; add the voice cap and the gain ramp, which the donor does not have; reject the Qt backend choice and the WinMM path as platform plumbing.
Acceptance: a client-only test starts three full-scale hit cues in one window and asserts the output stays inside the 16-bit range with each cue at gain 1/sqrt(3); a test that ends one cue mid-buffer asserts the gain moves across the buffer rather than stepping; a ninth cue in the same window is refused and not queued.

## 1. Mechanism

- Two entry points. `play(key)` (150-162) finds a preloaded sample, appends an active voice (position 0) under the mutex, and emits `readyRead` to wake an idle sink. `readData(data, maxSize)` (191-237) is the audio callback that fills the output buffer.
- Order of steps per `readData` call: take the mutex (193); round the requested size to whole 4-byte frames (196) and return 0 if nothing is left (197-198); zero the buffer (200); if there are no voices, return the silence (202-203).
- Gain for this call (212-216): count the active voices (212); if more than one, gain = 1/sqrt(N), else 1 (213-215); effective volume = master volume times that gain (216). The comment (208-211) says this is an equal-power mix that stops hard-clipping ("stuttering") with overlapping sounds.
- Mix (218-233): walk the voices from the last to the first, so `removeAt(v)` is safe (218). For each voice, mix up to the smaller of the buffer length and the samples left (222-223); add `src[i] * effectiveVolume` into the 16-bit output and clamp to -32768..32767 (225-228); advance the voice position by the bytes mixed (231); remove the voice when it reaches its end (232-233). Return the full buffer length (237), so silence fills any gap.
- Drop rules: `playSoundSoftwareMixer` returns without queuing when there is no sink (617-622): queuing voices nobody consumes would pile them up and replay them all later (620-621 comment). On background suspend, the sink is dropped and `mixer->stopAll()` clears the voices (704), so queued cues are not replayed on resume.
- Tick: this is a pull model. The sink calls `readData` on its own audio-thread schedule, not on a game tick. No frame or simulation clock is involved.

## 2. Key functions

- `WavMixer::readData`: `/mnt/frankendom-donors/pokerth-pokerth/src/gui/qt/sound/qtaudioplayer.cpp` 191-237. The whole mix: lock, silence, gain, sum, clamp, remove.
- `WavMixer::play`: `/mnt/frankendom-donors/pokerth-pokerth/src/gui/qt/sound/qtaudioplayer.cpp` 150-162. Appends a voice, with no count check.
- `WavMixer::stopAll`: `/mnt/frankendom-donors/pokerth-pokerth/src/gui/qt/sound/qtaudioplayer.cpp` 181-183.
- `QtAudioPlayer::playSoundSoftwareMixer`: `/mnt/frankendom-donors/pokerth-pokerth/src/gui/qt/sound/qtaudioplayer.cpp` 615-635 (read in full; the no-sink gate is at 622, and the sink restart check follows the play call).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Equal-power overlap gain for N simultaneous one-shots: 1/sqrt(N), 1 when N = 1 | Exponent 0.5 (theirs, qtaudioplayer.cpp 213-214) |
| Gain computed once per buffer from the live voice count | Buffer length is the sink's (not a donor constant) |
| Mix up to the buffer length, clamp the sum to the output integer range | Clamp -32768..32767 (theirs, 228; 16-bit output) |
| Remove a voice when its samples run out | None (the end test, 232) |
| No voice cap | None (theirs: `voices.append` at 161 has no count check; the cap is absent, not a constant) |
| Drop new cues when nothing consumes them; stop all on background | None (rule only; 622, 704) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's 1/sqrt(N) equal-power gain, the per-voice position and removal of finished voices, the clamp, and the stop-all. It reorders one step on purpose: it computes the gain once for the buffer as the donor does, then ramps linearly from the previous buffer's gain to that target across the buffer, which the donor does not do. It adds a voice cap (refuse at MAX_VOICES) that the donor lacks. It omits the 16-bit integer path, the mutex (the sketch is single-threaded), the sink and backend selection, the WAV load, the readyRead wake-up, the master volume setter, and the Windows and Android buffer sizes.

```ts
// Licence: AGPL-3.0 (donor). Clean-room sketch from the described mechanism; shape only, no line-by-line translation.
// Voice mixer: equal-power gain for overlapping one-shot cues, with a gain ramp and a voice cap.

export interface Voice {
  samples: Float32Array;
  pos: number;
}

export const MAX_VOICES = 8; // fix: donor is uncapped (donor voices.append at qtaudioplayer.cpp:161); value is a proposal, not donor data

export class CueMixer {
  private voices: Voice[] = [];
  private gain = 1; // gain used by the previous buffer; the donor steps the gain per call, this ramps it

  // Donor drops a play request when there is no sink (qtaudioplayer.cpp:622). Here: refuse at the cap.
  play(samples: Float32Array): boolean {
    if (this.voices.length >= MAX_VOICES) return false;
    this.voices.push({ samples, pos: 0 });
    return true;
  }

  // Donor stopAll on background resume (qtaudioplayer.cpp:704) so stale cues are not replayed.
  stopAll(): void {
    this.voices = [];
  }

  // Fills out with mono samples in -1..1. Each voice is scaled by 1/sqrt(N) (equal power), ramped from the previous gain.
  read(out: Float32Array): void {
    out.fill(0);
    const target = this.voices.length > 1 ? 1 / Math.sqrt(this.voices.length) : 1;
    const start = this.gain;
    for (let i = 0; i < out.length; i++) {
      const g = start + (target - start) * ((i + 1) / out.length);
      let mixed = 0;
      for (const v of this.voices) {
        if (v.pos + i < v.samples.length) mixed += v.samples[v.pos + i] * g;
      }
      out[i] = Math.max(-1, Math.min(1, mixed)); // donor clamps with qBound to the 16-bit range
    }
    this.gain = target;
    for (const v of this.voices) v.pos += out.length;
    this.voices = this.voices.filter((v) => v.pos < v.samples.length); // donor removes finished voices after mixing
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 /tmp/sm021-pokerth-mixer.ts` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/cue-mixer.ts` (new; client-side one-shot mixer for combat cues). Sound is client-only, so the mixer reads cue events from engine state and never writes state. The Frankendom repo was not read in this pass (not verified whether the file exists).
- Parity-checklist row 12 (combat sound cues). The list hint said row 14 (HUD); the mixer serves the combat cues, so row 12 is cited.
- Reuse tag: adapt-idea (AGPL-3.0; clean-room, shape only)
- Brief rule served: sound-music fold-in (layering of one-shot cues, voice headroom); sound stays client-only; licence read and stated exactly (rule 6, copyleft, clean-room)

## 6. Gaps and risks

- Defect D1 (kept the idea, fixed the defect): the attenuation is computed once per read call (212-216), so when a voice ends or starts inside a buffer the gain steps at the next buffer boundary. That is an audible step at the cue boundary. Fix: ramp the gain across the buffer, as in the sketch.
- Defect D2 (the donor has no voice cap): `play` appends with no count check (161), so the 1/sqrt(N) gain keeps the peak level down but the mixing cost and the number of simultaneous cues are unbounded. Fix: a cap (MAX_VOICES, proposed value 8, not donor data) that refuses new cues. The Frankendom rule MAX_ATTACKERS = 3 already bounds attacks per exchange, so the cap is a safety net for cue storms, not the main limit.
- Equal power assumes uncorrelated sounds. Two identical cues that start together sum coherently to 2 x (1/sqrt(2)) = 1.41 times one cue, not 1, so headroom is less than the worst case. The clamp (228) still keeps the output in range. This is a design choice; the Acceptance test states the expected level.
- Ruling check (one engine, server-verified kills): the mixer must not decide damage or state. Cue timing follows the event it receives, so a server-driven hit cue lags by the snapshot delay (how Frankendom sends hit events was not read).
- Other sound mechanisms in this donor, real and read (not scored in this note): blinds-raise escalation tiers (soundevents.cpp 62-81: the raise count picks one of three sound tiers, at levels 1-2, 3-4 and 5 and up, and resets when a new game starts, 88). That is a stinger-escalation idea, a candidate for a different cell or for the combo-count stinger.
- The drop-on-no-sink rule (622) and stop-on-background (704) are the same stale-state lesson as the L2Solo backlog rule (verdict file for pmbstyle-L2Solo): do not queue cues nobody will hear.
- Not read: the Qt sink callback beyond the `readyRead` emit (qtaudioplayer.cpp 163-171), the WAV parser, the WinMM and Android sink internals, and the device debounce timer (not sound-music).
- The donor has no music layering, no biome beds, no crossfades, and no priority between voices (grep, no hits). Only one-shot cues are mixed.

Reuse tag: adapt-idea (AGPL-3.0; clean-room, shape only)
Brief rule served: sound-music fold-in (layering of one-shot cues, voice headroom); sound stays client-only; licence read and stated exactly (rule 6, copyleft, clean-room)
