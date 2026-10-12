# cvet-fonline (sound-music, cell 15)

Donor: `/mnt/frankendom-donors/cvet-fonline/Source/Client/AudioManager.cpp` (with `AudioManager.h`, `Client.cpp` 3296-3316, and `Scripting/ClientGlobalScriptMethods.cpp` 700-730) | Licence: MIT (`AudioManager.h` lines 11-13; repo `LICENSE` line 3: "Copyright (c) 2006 - 2026, Anton Tsvetinskiy") | C++ | symbol `AudioManager::ProcessSounds` / `ProcessSound` / `PlaySound` / `UpdateSound` / `PlayMusic`

Checked: Read `AudioManager.cpp` (575 lines) and `AudioManager.h` (96 lines) in full. Read the two callers that reach it: `Client.cpp` 3284-3316 (video music switch) and the script API wrappers `ClientGlobalScriptMethods.cpp` 696-730. Grepped `Examples/` for `PlaySound(`: one plain call with no attenuation, so the distance-to-attenuation formula is not in this donor. Confidence high on the mixer, the culls, the streaming head, the pan and the repeat; high that there is no voice limit or music crossfade. Not read: `IAppAudio` (the device layer: `MixAudio`, `ConvertAudio`, `LockDevice`), the audio baker (`Tests/Test_AudioBaker.cpp` only seen in a grep), and the script that would compute attenuation from distance (not in the box). camera_scope: not a camera cell.

## 1. Mechanism

- A sound is started by name with an attenuation (0 to 1) and a pan (-1 to 1). The plain form uses attenuation 1 and pan 0 (495). When the device is inactive or the sound volume is 0, nothing is loaded (502). When attenuation is at or below 0 the sound is dropped before any read (507). Only then does `Load` read the whole resource file (236), decode a head, and add the voice (401, 405). The returned handle is never reused.
- Load decodes a head of `_streamingPortion` bytes: 64 KB on desktop (91), 128 KB on web (89). If the file ends inside the head, the stream is dropped (386-388). Otherwise the mixer refills from the stream as it plays (153-165).
- Mixing (`ProcessSounds`, 109-138) runs on the audio thread for each playing voice. The volume is the channel volume (music or sound) times the voice's attenuation, rounded (122-123). Pan is applied to the mix block when it is not zero (127-128), not to the decoded clip (125), so a live pan change does not stack. Pan is a balance: the far side is lowered and the near side keeps unity gain (470-471). The author notes it is a balance, not constant power (468). A finished voice without repeat is erased (135).
- Live update: `UpdateSound(id, attenuation, pan)` finds the voice by handle (529) and rewrites its attenuation and pan (530-531) under the device lock (524). The comment on `Sound` says this is so a sound that outlives a camera move is heard from where its source is now (53-54).
- Music: one slot. `PlayMusic` calls `StopMusic` first (548), then loads the file at attenuation 1 with a repeat time (550). `StopMusic` removes music voices (571). `StopSounds` removes only sound voices (560). The video path swaps the music the same way (`Client.cpp` 3297-3300).
- Repeat (for loops): when the decoded clip ends and a repeat time is set (192), the voice waits until the wall clock passes its due time (194-197), then rewinds the buffer (199) and the Ogg stream (204) and plays again. The first wait is set when the clip ends (193-194). A repeat time of 1 ms or less means no wait (194, `RepeatTime > 1ms`).
- Voices are stored in one unbounded list (`AudioManager.h` 92). There is no per-family limit, no priority, and no cap on how many voices play.
- Crossfade: none. A new music track starts after the old one is stopped (548-550), with no overlap and no fade.

## 2. Key functions

- `AudioManager::PlaySound(name, attenuation, pan)`: `Client/AudioManager.cpp` 498-513 (the two culls at 502 and 507, then Load at 513).
- `AudioManager::Load`: `AudioManager.cpp` 231-409 (file read at 236, head size, decode loop, the handle at 401, the list append at 405).
- `AudioManager::ProcessSounds`: `AudioManager.cpp` 109-138 (per-voice mix, volume, pan, erase on finish).
- `AudioManager::ProcessSound`: `AudioManager.cpp` 140-229 (playing, refill, repeat wait, silence).
- `AudioManager::UpdateSound`: `AudioManager.cpp` 516-540 (live update under lock).
- `AudioManager::ApplyPan`: `AudioManager.cpp` 461-480 (balance on S16 stereo).
- `AudioManager::PlayMusic`, `StopMusic`, `StopSounds`: `AudioManager.cpp` 542-573.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Cull before load when a cue is out of earshot | attenuation at or below 0 (507); sound volume 0 (502) |
| Live attenuation and pan for a playing cue | handle lookup and rewrite under lock (529-531) |
| Volume = channel volume x attenuation, rounded | integer channel volume (122-123); scale of the device volume not read |
| Balance pan on the mix block | far-side gain 1 - pan or 1 + pan (470-471) |
| Streamed clip: decode a head, refill as it plays | 64 KB desktop (91), 128 KB web (89) |
| Loop with a wait, then rewind | wait = repeat time, none at 1 ms or less (194) |
| One music slot | music attenuation 1, pan 0 (550); the stop before start (548) |
| Voice cap | none (`_playingSounds` is unbounded, `AudioManager.h` 92) |

## 4. TypeScript sketch

simplified: the sketch keeps the cull before any load, the voice list with a never-reused handle, the live update of attenuation and pan, the volume times attenuation, the balance pan, the single music slot with a hard stop, the loop with a wall-clock wait and rewind, and the drop of finished voices. It omits the file read, the Ogg decode and streaming refill, the device lock, the byte-level mixer and silence byte, the clip-safety of the int16 pan, and the device layer. It uses milliseconds of wall clock for the loop wait, as the donor does. It adds nothing for a voice limit, a priority or a crossfade, because the donor has none.

```ts
// Licence: MIT (donor, Source/Client/AudioManager.h lines 11-13). Clean-room sketch written from the described mechanism.
export interface Voice {
  id: number;
  attenuation: number; // 0..1, set by the caller; can be rewritten while the voice plays
  pan: number;         // -1..1 balance
  isMusic: boolean;
  pos: number;         // frames already produced
  length: number;      // frames in the decoded clip
  repeatMs: number;    // 0 = play once
  nextPlayAt: number;  // wall-clock ms when a repeat restarts, 0 = none pending
}

export interface Mixer {
  nextId: number;
  voices: Voice[];     // no limit: the donor's list is unbounded
  soundVolume: number; // 0..100
  musicVolume: number; // 0..100
}

// Donor: a sound with attenuation <= 0 is culled before any read or decode; zero sound volume plays nothing.
export function playSound(m: Mixer, length: number, attenuation: number, pan: number): number {
  if (m.soundVolume === 0 || attenuation <= 0) return 0;
  m.nextId += 1;
  m.voices.push({ id: m.nextId, attenuation, pan, isMusic: false, pos: 0, length, repeatMs: 0, nextPlayAt: 0 });
  return m.nextId;
}

// Donor: one music slot. Starting music stops the old track first (a hard cut, no overlap).
export function playMusic(m: Mixer, length: number, repeatMs: number): number {
  m.voices = m.voices.filter((v) => !v.isMusic);
  m.nextId += 1;
  m.voices.push({ id: m.nextId, attenuation: 1, pan: 0, isMusic: true, pos: 0, length, repeatMs, nextPlayAt: 0 });
  return m.nextId;
}

// Donor: a live voice is re-positioned by its source; false once the voice has ended.
export function updateSound(m: Mixer, id: number, attenuation: number, pan: number): boolean {
  const v = m.voices.find((x) => x.id === id);
  if (!v) return false;
  v.attenuation = attenuation;
  v.pan = pan;
  return true;
}

// Donor: volume is the channel volume times attenuation, rounded.
export function volumeFor(v: Voice, m: Mixer): number {
  const base = v.isMusic ? m.musicVolume : m.soundVolume;
  return Math.round(base * v.attenuation);
}

// Donor: balance, not constant power. The near side keeps unity gain, the far side is lowered.
export function panGains(pan: number): { left: number; right: number } {
  return { left: pan > 0 ? 1 - pan : 1, right: pan < 0 ? 1 + pan : 1 };
}

// Donor: produce up to `frames` frames. After the clip ends, a repeating voice waits repeatMs (wall clock), then rewinds.
export function advance(v: Voice, frames: number, nowMs: number): number {
  if (v.pos < v.length) {
    const take = Math.min(frames, v.length - v.pos);
    v.pos += take;
    return take;
  }
  if (v.repeatMs > 0) {
    if (v.nextPlayAt === 0) {
      v.nextPlayAt = nowMs + (v.repeatMs > 1 ? v.repeatMs : 0);
    }
    if (nowMs >= v.nextPlayAt) {
      v.pos = 0;
      v.nextPlayAt = 0;
      return advance(v, frames, nowMs);
    }
  }
  return 0;
}

// Donor: a voice that has ended and does not repeat is dropped from the list.
export function dropEnded(m: Mixer): void {
  m.voices = m.voices.filter((v) => v.pos < v.length || v.repeatMs > 0);
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, with `export {}` appended, exit 0.

## 5. Lands in

- TARGET `origins/client/audio-mixer.ts` (new, client-only: sound is client-only). A cue is started by the client when the server confirms an event, and a playing cue follows its source with `updateSound` for as long as the source is in the fight. Parity-checklist row 12 (combat sound cues).
- Best transferable idea: Cull a cue before any read when its attenuation is zero, and let a playing cue be re-positioned live by its source, so hits and loops follow the fight without reloading.
- Decision (proposed): adapt. Take the cull before load, the live attenuation and pan update under one lock, the balance pan on the mix block, and the wall-clock loop wait. Fix the three gaps this donor leaves: add a per-family voice cap with a priority (the donor has none), add a crossfade between two music slots (the donor hard-cuts), and cache decoded short cues (the donor reads and decodes on every play).
- Acceptance: a client test starts a hit cue on an attacker at a given distance, moves the attacker in ten steps with `updateSound`, and asserts the cue volume follows the attenuation at each step; asserts no load when attenuation is 0; and asserts a looping ambience waits its set gap before each repeat.
- Reuse tag: adapt (MIT: code may be adapted; this note still writes a clean sketch and keeps the donor's names only where the mechanism needs them).
- Brief rule served: sound is client-only; addendum sound-music fold-in (priority and voice limits: absent here; crossfades: absent here; ambience loops: present); keep the idea and fix the defect.

## 6. Gaps and risks

- MIT: adaptation is allowed. The sketch is still written from the mechanism.
- No voice limit or priority: `_playingSounds` is unbounded (`AudioManager.h` 92). A 3-attacker fight with a cue per hit would stack voices without limit. fix: per-family caps (for example hit cues per fight, with a rule for which voice to drop).
- No crossfade: `PlayMusic` stops the old track first (548) and starts the new one at once (550). fix: two music slots with a fade, the same dB-shaped curve as the BAR note's fix.
- Read on every play: `Load` reads and decodes the file each time (236, 231-409). For a hit cue that plays many times a fight this is wasted work on the calling thread. fix: decode each short cue once and keep the buffer (the donor only streams long clips; the head rule at 91 is the only cache-like step).
- Loop timing uses wall clock (194-197), not the mixed sample count. A slow frame can shift the loop gap. Acceptable for ambience; not for anything that must line up with a beat. fix: count frames of the output stream for loops that need exact timing.
- Debug trap: a failed decode calls `break_into_debugger()` (342, 379, 392). Harmless in a release build; not read for what the release build does. fix: log and return, never stop a debug session in a shipped client.
- Attenuation curve: not in this donor. The engine accepts a number from the caller and multiplies. Frankendom's distance falloff and the third-person camera's listener position must be designed on our side (the camera is client-only; the listener sits at the camera, not the character).
- Rulings: sound cues must follow server-confirmed events only, and never decide a hit, a kill or a spell result (one ledger).
- The JSON sidecar has the data fields.
