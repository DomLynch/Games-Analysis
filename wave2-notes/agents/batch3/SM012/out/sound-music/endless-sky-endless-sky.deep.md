# endless-sky-endless-sky (sound-music, cell 3)

Donor: `/mnt/frankendom-donors/endless-sky-endless-sky/source/audio/Audio.cpp` (with `source/audio/supplier/effect/Fade.cpp` and `Fade.h`, `source/audio/supplier/AudioSupplier.h`, `source/audio/Music.h`) | Licence: GNU GPL v3 (`license.txt` line 2: "Version 3, 29 June 2007"; source headers, e.g. Audio.cpp line 6: "either version 3 of the License, or (at your option) any later version") | C++ | symbol `QueueEntry::Add`

Checked: read `Audio.cpp` 20-117 (queue, listener, state), 238-248 (`Update`), 262-276 (`Play` with position), 281-305 (`PlayMusic`), 329-422 (`Step`: volume, pause, looping players, new players, music end), 55-62 (`Move`), 465-483 (`QueueEntry::Add` and the combine overload); `Fade.h` 1-60 (whole class); `Fade.cpp` 22-31 (`AddSource`), 35-106 (`Set3x`, `MaxChunks`, `AvailableChunks`, `NextDataChunk`), 110-120 (`CrossFade`); `AudioSupplier.h` 30, 66-77 (sample type, rate, chunk size); `Music.h` 25; `Audio.h` 39-82 (API list); `GameAction.cpp` 504-516; `Engine.cpp` 1450-1458; `PlayerInfo.cpp` 1724-1731. Outline only: `Music.cpp` 38-73. Not read: `Audio::Init`, `LoadSounds`, `Load` (Audio.cpp 118-235 and 486-520), `AudioPlayer.cpp` (the OpenAL distance model, which decides how loud an aggregated source is), `Sound.cpp` body, `Music.cpp` streaming body, `Audio::Quit`. Confidence: high on the per-frame aggregation formula, the looping reuse and the crossfade counter; medium on perceived loudness of an aggregated source (depends on `AudioPlayer.cpp`, not read). camera_scope: n/a (sound). The hint file `Audio.h` is only the public API (83 lines); the mechanism is in `Audio.cpp` and `Fade.cpp`.

## 1. Mechanism

Four parts. Two are fight-relevant (aggregation and looping beds), two are music.

**(a) Per-frame aggregation of identical sounds.** A request is `Audio::Play(sound, position, category)` (262-276). On the main thread it goes straight into `soundQueue` (270). From other threads it waits in `deferred` (274), and `Audio::Update` merges it into `soundQueue` at the start of the next frame (238-248, merge at 246). Every request for the same `Sound *` in the frame is folded into one `QueueEntry` by `QueueEntry::Add` (465-475): the position is scaled by 0.002 (500 units = 1 OpenAL unit, line 468), each request gets weight `d = 1 / (1 + |p|^2)` (471), so near sounds count more and far ones fade toward zero; `sum += d * p` (472) and `weight += d`. `Audio::Step` then creates one player per distinct sound (405-416), placed by `Move` (55-62): the centroid is `angle = sum / weight` (57), the distance scale is `sqrt(1 / (weight * (|angle|^2 + 1)))` (60), and the source sits at `(angle.X * scale, angle.Y * scale, -scale)` (61). Working the formula out, the one source is `sqrt(1 / weight)` OpenAL units from the listener. So three hits on the same frame become one voice at their centroid, with a weight that makes it nearer as more hits pile up. The loudness that results depends on the OpenAL attenuation settings in `AudioPlayer.cpp` (not read).

**(b) Looping ambience beds are kept alive by a per-frame request.** A sound that `IsLooping()` gets a `Fade` supplier and is stored in `loopingPlayers` by sound (403-406). In each `Step`, a looping player whose sound is requested again this frame is moved to the new position and its request is consumed (372-376). A looping player with no request this frame gets `AddSource({}, 3)`: an empty primary source with fade rate 3, which fades the sound out over about 21,846 output samples (380, and the arithmetic in (d) below), and it leaves the map (381). So a bed plays while the caller requests it every frame and stops with a short fade when the caller stops. A bed change is not a crossfade: the new bed starts at full level while the old one fades out, so both are audible for the fade time. (Donor behaviour; no level matching.)

**(c) One-shot sounds get a new player each frame they are requested.** Non-looping sounds are appended to `players` (409, 416) and removed when `IsFinished()` (392). No code caps how many `players` exist: no per-sound limit, no total limit, no priority. The only limit in this file is the OpenAL source count, which is not read. Requests of the same sound in consecutive frames are not merged with a player still playing from an earlier frame, so three hits spread over three frames make three voices (defect D2).

**(d) Music crossfade (`Fade`).** `Audio::PlayMusic(name)` returns at once if the name is the current track (287). Otherwise, if the current music player is not finished, the new track is added to the same `Fade` with the default fade rate (294, rate 1: the default argument is at Fade.h 39, and Fade.cpp 25-26 clamps it to at least 1). If the player has finished, a new `Fade` and player are started (298-303). `Fade::AddSource` (22-31) moves the old primary source into `fadeProgress` with counter `MAX_FADE` (65536, Fade.h 34) and makes the new one primary. `NextDataChunk` (68-106) blends each fading source into the next and then into the primary. The blend (`CrossFade`, 110-120) is `incoming = (outgoing * f + incoming * (65536 - f)) / 65536`, and `f` drops by the rate for every output sample until it reaches 0 (112-118). So the outgoing track starts at full weight and the incoming at none, and the mix is linear per sample, which makes the fade audio-clock driven: it does not depend on the game frame rate. Length: `MAX_FADE / rate` samples (Fade.h 33). For music at rate 1 that is 65,536 interleaved 16-bit samples, about 0.74 s of stereo at 44.1 kHz (music is 16-bit stereo, Music.h 25; the sample rate is AudioSupplier.h 66).

**(e) Which music plays.** System music is set when entering a system (Engine.cpp 1457), planet music on landing (PlayerInfo.cpp 1730). A mission action can name a track, or "<ambient>", which resets to the planet's music if landed and otherwise to the system's (GameAction.cpp 507-513). So the "ambience" is the music of the location, switched by data (`MusicName()`; where that data is loaded was not read). There is no separate bed per biome.

Not found in this donor: layered music stems, stingers, a priority system, a voice limit, or a biome-specific bed. Grep for "ambien|biome|stinger|crossfade|layer" in `source/audio` and `source/*.cpp` returned only an unrelated "Ambient" property comment and the audio header names.

## 2. Key functions

- `QueueEntry::Add` (position): `/mnt/frankendom-donors/endless-sky-endless-sky/source/audio/Audio.cpp` 465-475 (weight and centroid); the combine overload 478-483.
- `Move`: same file, 55-62 (centroid to one source, distance from the weight).
- `Audio::Update`: same file, 238-248 (deferred merge). `Audio::Play`: 262-276.
- `Audio::Step`: same file, 329-422 (looping reuse 370-383 and 399-406, one-shot players 405-416, cleanup 392, music end 420-421).
- `Audio::PlayMusic`: same file, 281-305.
- `Fade::AddSource`: `/mnt/frankendom-donors/endless-sky-endless-sky/source/audio/supplier/effect/Fade.cpp` 22-31; `NextDataChunk` 68-106; `CrossFade` 110-120. Constant: `Fade.h` 33-34.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants (theirs) |
|---|---|
| Merge same-sound requests in one frame into one voice at the weighted centroid | 500 game units = 1 OpenAL unit (Audio.cpp 468); weight 1 / (1 + distance^2) (471) |
| Source distance from the summed weight | `sqrt(1 / weight)` (Move, 60-61, derived) |
| Looping bed: keep alive while requested, fast fade-out when not | fade rate 3 per sample (Audio.cpp 380) |
| Music crossfade, linear per sample | `MAX_FADE` 65536 (Fade.h 34); default rate 1 (Fade.cpp 26) |
| Crossfade length | `MAX_FADE / rate` samples (Fade.h 33): 65,536 for music (about 0.74 s stereo at 44.1 kHz) |
| Location music | per system on entry (Engine.cpp 1457), per planet on landing (PlayerInfo.cpp 1730) |
| Mission reset to location music | "<ambient>" token (GameAction.cpp 507) |

## 4. TypeScript sketch

simplified: `aggregateFrame` keeps the donor's per-frame merge keyed by sound id, with the same weight and centroid formulas, so three hits in one frame are one source at distance `sqrt(1 / weight)`. `crossfadeChunk` keeps the donor's counter that starts at `MAX_FADE` and drops per sample, with the same mix, but uses float samples (the donor's int16 needs no unsigned arithmetic here). `VoiceCap` is the only addition: at most `cap` live voices per sound, the oldest one stopped when a new one starts. The donor has no such limit (defect D1), so this is the one line the sketch adds on purpose. It omits the OpenAL distance model (`AudioPlayer.cpp`, not read), the looping bed players and their fast fade, the music supplier chain, the deferred queue for other threads, and the fast-forward variants. The per-frame merge does not join a sound that is still playing from an earlier frame (donor behaviour, defect D2); the sketch keeps that behaviour and only adds the cap.

```ts
// Licence: GPL-3.0-or-later (donor LICENSE, Audio.cpp header). Clean-room sketch written from the described mechanism, not a translation of the donor.
// clean-room
export interface Req {
  sound: string;
  x: number; // position relative to the listener, in game units
  y: number;
}

export interface Aggregated {
  sound: string;
  x: number; // the one source for this sound this frame
  y: number;
  z: number;
  distance: number; // distance from the listener to that source, in OpenAL units
}

// Donor: 500 game units count as 1 OpenAL unit, and a source at distance 0 has weight 1.
const UNITS_PER_OPENAL = 500;

// One call per frame. Requests for the same sound merge into one source at the weighted centroid.
export function aggregateFrame(reqs: readonly Req[]): Aggregated[] {
  const bySound = new Map<string, { sx: number; sy: number; w: number }>();
  for (const r of reqs) {
    const px = r.x / UNITS_PER_OPENAL;
    const py = r.y / UNITS_PER_OPENAL;
    const d = 1 / (1 + px * px + py * py); // nearer sources weigh more; far ones fade toward 0
    const acc = bySound.get(r.sound) ?? { sx: 0, sy: 0, w: 0 };
    acc.sx += d * px;
    acc.sy += d * py;
    acc.w += d;
    bySound.set(r.sound, acc);
  }
  const out: Aggregated[] = [];
  for (const [sound, acc] of bySound) {
    const ax = acc.sx / acc.w;
    const ay = acc.sy / acc.w;
    const scale = Math.sqrt(1 / (acc.w * (ax * ax + ay * ay + 1)));
    out.push({
      sound,
      x: ax * scale,
      y: ay * scale,
      z: -scale,
      distance: Math.sqrt(1 / acc.w), // equals |(x, y, z)|
    });
  }
  return out;
}

export const MAX_FADE = 65536; // donor: Fade::MAX_FADE

// Crossfade one chunk. The outgoing audio starts at full weight (fade = MAX_FADE) and the counter
// drops by fadePerSample for every output sample until it reaches 0 (incoming only).
// Returns the new counter so the caller can keep it between chunks.
export function crossfadeChunk(
  outgoing: Float32Array,
  incoming: Float32Array,
  fade: number,
  fadePerSample: number,
): number {
  let f = fade;
  for (let i = 0; i < incoming.length && f > 0; i++) {
    incoming[i] = (outgoing[i] * f + incoming[i] * (MAX_FADE - f)) / MAX_FADE;
    f = f > fadePerSample ? f - fadePerSample : 0;
  }
  return f;
}

// simplified: aggregateFrame keeps the donor's per-frame merge keyed by sound id, with the same
// distance weight and centroid. crossfadeChunk keeps the donor's counter (per sample, MAX_FADE
// steps) but uses float samples instead of int16 and needs no unsigned arithmetic.
// VoiceCap is the only addition: a per-sound limit with oldest-stop, which the donor does not
// have (defect D1). It omits the OpenAL distance model (AudioPlayer, not read), the looping
// bed players and their fast fade, the music chain of suppliers, the deferred queue for other
// threads, and the fast-forward variants.
export class VoiceCap {
  private live = new Map<string, number[]>();

  constructor(private readonly cap: number) {}

  start(sound: string, id: number, stop: (id: number) => void): void {
    const ids = this.live.get(sound) ?? [];
    ids.push(id);
    while (ids.length > this.cap) {
      const oldest = ids.shift();
      if (oldest !== undefined) stop(oldest);
    }
    this.live.set(sound, ids);
  }

  finished(sound: string, id: number): void {
    const ids = this.live.get(sound);
    if (ids !== undefined) this.live.set(sound, ids.filter((x) => x !== id));
  }
}

export {};
```

Typecheck: copied to the VPS as `/tmp/endless-sky-aggregate.ts` and run `npx -p typescript tsc --noEmit --strict --target es2020` there: exit 0.

## 5. Lands in

- TARGET `src/fight/hit-sound-mixer.ts` (new, client only): the per-frame merge of identical hit and spell cues, the per-sound voice cap, and the crossfade used by ambience and music changes (the crossfade is shared with `src/fight/music-director.ts`, see cell 2 in this batch, if it is built).
- Parity-checklist row 12 (combat sound cues). The per-frame merge is the sound half of MAX_ATTACKERS = 3: up to three hits from three attackers in one frame play as one cue.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only, shape not code)
- Brief rule served: 1 (one engine, two clients: the engine emits the hit events; the client merges them into voices); 8 (target and parity row named)

## 6. Gaps and risks

- Client only. Merging or dropping a cue must never change what the server counts. A killing blow must still be a server-verified event even if its cue is merged or capped.
- The merge is per frame. Three attacker hits in one frame play as one voice, but the same three hits over three frames play as three. Frankendom's hit cues need a short window (a fixed number of milliseconds, from data), not only a per-frame key, if many-on-one is meant to sound like one hit.
- Defect D1 (no voice cap, `players` grows with each one-shot request, Audio.cpp 409-416): a sound requested every frame stacks indefinitely up to OpenAL's source limit. Fix: `VoiceCap` per sound with oldest-stop (in the sketch). Keep the donor's idea that a finisher or the killing blow is never the one stopped; priority is not in the donor and must be added.
- Defect D2 (no merge with a sound already playing, Audio.cpp 370-376 and 409): consecutive-frame hits stack. Fix: merge into a live voice of the same sound inside the window, as the looping path already does for beds.
- Defect D3 (bed switch overlaps, Audio.cpp 380 and 405-409): a new bed starts at full level while the old one fades, so both are heard. Fix: a level-matched crossfade with `crossfadeChunk` (the donor's mix formula, float samples) and a zone-data fade length. The donor's loudness on aggregated sources depends on `AudioPlayer.cpp`, not read, so tune by ear on a phone.
- Zones as data: the donor keys music on `MusicName()` per system or planet, which maps to a per-zone track id. Frankendom should key ambience beds per zone too, with the fade length as a zone field and the "<ambient>" reset as a zone default.
- The listener is the centre of the screen (Audio.cpp 100-101). Frankendom's listener must be the player's character (the camera is client-only and must not decide game sounds). Keep the listener position in the client, not the engine.
- No stingers, layered stems, or biome beds in this donor. Do not present them as coming from it.
- GPL-3.0-or-later. Clean-room only; the sketch was written from the described mechanism.
- Not read: `AudioPlayer.cpp` (OpenAL distance model), `Audio::Init`, `LoadSounds`, `Load`, `Sound.cpp` body, `Music.cpp` streaming, `Audio::Quit`. The volume and pause handling at the top of `Step` was read but is not used by the sketch.

Best transferable idea: merge identical cues that land in the same frame into one voice at their weighted centroid, and crossfade music and beds on a per-sample counter that starts at full weight on the outgoing track.
Decision (proposed): adapt - take the per-frame merge and the sample-counted crossfade; add the per-sound cap the donor lacks (D1) and a short merge window (D2), and replace the donor's overlapping bed switch (D3) with a level-matched crossfade whose length is zone data.
Acceptance: three attackers hitting in the same frame make one hit cue, not three, and a finisher on a fourth attacker in the next frame still plays (a unit test asserts both); a zone change from one ambience bed to another crossfades over the zone's fade length with no silence gap and no doubled level (a level test asserts the summed gain stays within 1.0 across the fade).

Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
Brief rule served: 1 (one engine, two clients); 8 (target and parity row named)

## Checker findings (Sonnet 5.5 medium, 2026-10-12)

Verdict: CLEAN
- No errors found; all cited lines and numbers verified against the donor.
- Missed: none.
