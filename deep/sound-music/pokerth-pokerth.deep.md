# pokerth-pokerth (sound-music, cell 15)

Donor: /mnt/frankendom-donors/pokerth-pokerth/src/gui/qt/sound/qtaudioplayer.cpp | Licence: AGPL-3 | C++ | symbol WavMixer::play / QtAudioPlayer::playSound

## 1. Mechanism
- QtAudioPlayer::playSound(name) is the entry for one-shot sound effects. It returns at once unless audio is enabled and the play-sound-effects setting is on. It then dispatches (501-511) to one of four backends: a software mixer, an external player (paplay or pw-play, with a volume argument), the Windows multimedia API (Windows builds only), or by default a Qt sound-effect object, which restarts a clip that is already playing (514-544). The player id argument is unused.
- Software mixer backend: WavMixer::play(key) looks up the shared PCM for the key and adds a voice (the PCM pointer and a position of 0) under a mutex. It then emits `readyRead` to wake the output sink; the comment (164-170) says a pull-mode sink stops pulling after a buffer underrun until that signal, observed on Android while the app is in the background. The mixer's volume is clamped to 0..1 (176). The WAV loader above it (up to line 148) walks RIFF chunks and stores the data chunk as PCM; it was not read in full.
- WavMixer::readData(maxBytes) is pulled by the audio sink. It rounds the request to whole 4-byte frames, zero-fills the buffer, and returns silence if no voice is active. With N voices active, each voice is scaled by the mixer volume times 1 over the square root of N, then added into 16-bit samples with clamping per add (226-228). A voice that reaches its end is removed (232-234). The comment (208-211) says the attenuation was added against clipping that caused stuttering on Windows 11.
- paplay backend (546-572): `SoundVolume` divided by 10 is turned into a 0 to 65536 volume (paplay) or a 0 to 1 float with two decimals (pw-play, chosen by whether the binary name ends in `paplay`), and an external process is started detached.
- Inputs: sound key, config flags, volume setting, output sink pulls. Output: mixed samples or an external playback. Play is event-driven; mixing is pull-driven by the sink.

## 2. Key functions
- QtAudioPlayer::playSound (pokerth) | /mnt/frankendom-donors/pokerth-pokerth/src/gui/qt/sound/qtaudioplayer.cpp | 494-512 | gate on enabled and config; dispatch to the active backend.
- WavMixer::play (pokerth) | /mnt/frankendom-donors/pokerth-pokerth/src/gui/qt/sound/qtaudioplayer.cpp | 150-171 | adds a voice under lock; wakes the sink.
- WavMixer::readData (pokerth) | /mnt/frankendom-donors/pokerth-pokerth/src/gui/qt/sound/qtaudioplayer.cpp | 191-238 | pull-mode mixer: zero fill, 1 over root-N attenuation, clamped sum, voice retirement.
- QtAudioPlayer::playSoundPaPlay (pokerth) | /mnt/frankendom-donors/pokerth-pokerth/src/gui/qt/sound/qtaudioplayer.cpp | 546-572 | external player with a volume argument.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Voice list with a shared PCM and a position; retire at the end | none (algorithm) |
| 1 over root-N attenuation as voices overlap, to avoid clipping | the rule is the mechanism; the source comment says it was tuned for a Windows stutter (theirs) |
| Clamp summed samples to the 16-bit range | 16-bit range (algorithm) |
| Frame alignment of 4 bytes (two channels of 16-bit) | stereo 16-bit (line 195-196) (theirs) |
| Config flag gate for effects | setting name PlaySoundEffects (theirs) |
| External volume scale | setting SoundVolume divided by 10, times 65536 (lines 556-557) (theirs) |

## 4. TypeScript sketch
simplified: voices hold a PCM array shared by key in the donor (the sketch passes the array); the sketch has no mutex, no `readyRead` wake-up, no sample-loader, and its `pos` counts samples where the donor counts bytes; `volume` is fixed instead of clamped by `setVolume`.

```ts
// Licence: AGPL-3 (pokerth-pokerth). CLEAN-ROOM: written from the mechanism, no donor lines.
type Voice = { pcm: Int16Array; pos: number };
const voices: Voice[] = [];
let volume = 1;                                           // mixer gain, 0 to 1
const clip16 = (x: number) => Math.max(-32768, Math.min(32767, x));

// Game thread: add a voice to the list.
function play(pcm: Int16Array): void {
  voices.push({ pcm, pos: 0 });
}

// Sink thread: fill one buffer.
function pull(out: Int16Array): void {
  out.fill(0);
  if (voices.length === 0) return;
  const atten = voices.length > 1 ? 1 / Math.sqrt(voices.length) : 1;   // 1 over root-N
  const gain = volume * atten;
  for (let v = voices.length - 1; v >= 0; v--) {
    const voice = voices[v];
    const n = Math.min(out.length, voice.pcm.length - voice.pos);
    for (let i = 0; i < n; i++) out[i] = clip16(out[i] + voice.pcm[voice.pos + i] * gain);
    voice.pos += n;
    if (voice.pos >= voice.pcm.length) voices.splice(v, 1);            // retire finished voices
  }
}
```

## 5. Lands in
- Frankendom target: `src/fight/sound.ts` (overlap gain rule for simultaneous cues). The Web Audio graph does the mixing in Frankendom; the root-N rule is the part to test against the fight's loudest overlaps (MAX_ATTACKERS = 3).
- Parity row: 12 (combat sound cues).
- Reuse tag: rewrite-from-idea (AGPL-3; no lines lifted)
- Brief rule served: (category default, not per-cell) zone-schema rule; rules 7-9 n/a

## 6. Gaps and risks
- AGPL-3. Do not lift lines; sketch only. If any server-side code were derived from it, AGPL network terms would apply. Lead to confirm before any reuse.
- No voice cap: `voices.append` is unbounded (line 161), and the root-N rule is the only guard. Frankendom needs a cap.
- The mixer is pull-driven from a sink that starves in the background; that wake-up fix is Qt-specific.
- Config keys and the external-player path are desktop-only.
- Audio is a client consumer of the one fight state; the cue gain rule never feeds the fight record or server-verified kills.
