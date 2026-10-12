# exult-exult (sound-music, cell 15)

Donor: `/mnt/frankendom-donors/exult-exult/objs/animate.cc` | Licence: GPL-2.0-or-later (sfxinf.cc header: "of the License, or (at your option) any later version."; COPYING is version 2) | C++ | symbol `Object_sfx::handle_event`, `Shape_sfx::update`, `Audio::play_wave_sfx`, `AudioMixer::playSample`, `Background_noise::handle_event`

Checked: read in full: objs/animate.cc 62-160 (Object_sfx) and 176-262 (Shape_sfx update); shapes/shapeinf/sfxinf.cc 40-74 (chance, range, variant pick); audio/Audio.cc 620-690 and 758-830 (wave play, 2D position, volume); audio/AudioMixer.cc 175-200 (channel pick); audio/AudioChannel.cc 786-820 (side volume); gamewin.cc 189-298 (background bed and bird/cricket layer); audio/Midi.cc 117-170 and 850-910 (music start, MIDI sfx). Not read: the caller that re-invokes Shape_sfx::update each frame; combat.cc hit and spell cue mapping (combat.cc:328 only seen as a call); Combat_schedule::danger_music (called at gamewin.cc, body not read); the MIDI driver's startSequence replacement behaviour; ogg_play_track. Confidence: high for the emitter, the voice pick and the bed selector; low for hit and spell cues, which this donor does not cover in what I read. Depth: full for the mechanism named here; the cell is wider than what I read.

## 1. Mechanism

Three layers, all in the client (the engine never reads them).

(a) Positional emitters on map objects. Two kinds. `Object_sfx` is started by usecode or by a sound on an object; `Shape_sfx` is driven by per-shape sound data. Both poll on a 100 ms grid. Each poll computes the listener, decides whether the emitter is in range, and then starts, updates or stops a voice.
- Grid: next poll = now + 100 - (now % 100) (animate.cc:113, 151). The timing is aligned to wall-clock multiples of 100 ms, not a per-emitter timer.
- Range gate: the emitter is silent when its squared screen-space distance from the listener is over 24 x 24 tiles (animate.cc:55; Audio.h:55).
- Object_sfx order of steps per poll: in range and no voice yet, start (animate.cc:137); otherwise, if it has a voice, update its position (146). Out of range, it stops the voice (about 149-150, not receipted) and then, with no voice left, calls `stop();` and deletes itself (153). So a usecode loop that the player walks away from is destroyed, not paused.
- Shape_sfx order of steps (animate.cc 176-262): compute `looping` from the shape data (line 170); drop channels whose sound has ended (206-215); if nothing plays and nothing is due, return (218-220); roll chance before starting a non-looping sound (224); pick the variant (227); if the hourly chime is due, put it on channel slot 1 (230-236); compute volume from the shape percent (242); if out of range, stop the channels (about 256-258, not receipted); otherwise start (253) or update the position (259).

Distance and pan for every wave sound (Audio.cc 758-784, AudioChannel.cc 786-817):
- Listener = centre tile of the visible window at the camera actor's lift (Audio.cc:763-764). Not the actor's own tile.
- distance = squared distance x 256 / 576 (Audio.cc:774). Adding the listener's lift x 8 (Audio.cc:777-778) and capping at 256.
- Pan = (dx x 2 - tile height - listener height) x 32 / 5 (Audio.cc:784).
- Each side volume = volume x (256 - distance) x side balance / 65536 (AudioChannel.cc:816). Over 255 distance = silent (AudioChannel.cc:793).

(b) Shape sound table (`SFX_info`, sfxinf.cc). Per shape: `chance` (percent per start roll, clamped 1-100, default 100; sfxinf.cc:48-49), `range` (number of variants, default 1; sfxinf.cc:53), `random` (random pick, or cycle in order; sfxinf.cc:70 and 72), `extra` (an hourly chime sound), `volume` (percent), `frame` (play only on one animation frame). A sound loops only when range is 1, chance is 100 and there is no chime (animate.cc:170). A non-looping sound re-rolls each time its channel is free (sfxinf.cc:64 `return rand() % 100 < chance;`).

Hourly chime: when the game clock is on minute 0 (animate.cc:232), the chime sound plays hour mod 12 times, 12 for hour 0 and 12 (animate.cc:234-235).

(c) Background bed selector (`Background_noise::handle_event`, gamewin.cc 189-298). Only compiled unless `COLOURLESS_REALLY_HATES_THE_BG_SFX` is defined (gamewin.cc:190).
- State is a priority chain, first match wins: dungeon, then rain, then snow, then night, else outside (gamewin.cc 196-208, read).
- The bed track is chosen per state (gamewin.cc 219-253). It is re-issued only when the state changed or no track is playing (gamewin.cc:219). Starting a track calls `start_music` (gamewin.cc:253). For MIDI, the call stops the current track first (Midi.cc:156 `stop_music();`). I found no fade in audio/ (grep for fade returned nothing), so a bed change is a hard cut.
- A bird/cricket layer on a timer. The default delay is 8000 ms (gamewin.cc:192), set to 1000 ms while a music player exists (about line 214, not receipted). At night it picks from {61, 61, 255}; 255 is silence (gamewin.cc:269, 275). By day it picks from {82, 85, 85} only when no music track is playing (gamewin.cc:277-278). After a play it repeats with probability 1/(repeats+1) after 500-1499 ms (gamewin.cc:285-287); otherwise it resets and waits 4000-6999 ms (gamewin.cc:289).

(d) Voices. Mixer has 32 wave channels (Audio.cc:62, 270). `playSample` takes the first free channel. If none is free it takes the lowest-priority channel, and only if that channel's priority is lower than the request (AudioMixer.cc:182, 185-189). Every wave sound is requested with priority 0 (Audio.cc:666), so the steal branch never fires for sound effects. When all 32 are busy, play returns -1 and the sound is dropped; the CERR "No channel was available" log sits in play_wave_sfx (line not receipted).

(e) MIDI sound effects are a separate path. When the MIDI effects option is on, `play_sound_effect` hands the number to MIDI and returns -1 with no distance or pan (Audio.cc:624). The MIDI path uses sequence slot 1 (Midi.cc:92, 905); music uses slot 0 (Midi.cc:91). The data is `data/midisfx.flx`: a FLEX file, count 135 at header offset 0x54, entries of 8 bytes from offset 0x80, each entry an XMIDI `FORM` (checked by a header parse on the VPS; the file is binary, so no receipt for the table).

## 2. Key functions

- `Object_sfx::handle_event`: `/mnt/frankendom-donors/exult-exult/objs/animate.cc` 113-156 (grid poll, range gate, start, update, stop).
- `Shape_sfx::update`: `/mnt/frankendom-donors/exult-exult/objs/animate.cc` 176-262 (looping, chance, variant, chime, volume, per-channel start or update).
- `Audio::get_2d_position_for_tile`: `/mnt/frankendom-donors/exult-exult/audio/Audio.cc` 758-786 (listener, distance, pan).
- `Audio::play_wave_sfx`: `/mnt/frankendom-donors/exult-exult/audio/Audio.cc` 640-685 (volume, playSample, 2D position).
- `AudioMixer::playSample`: `/mnt/frankendom-donors/exult-exult/audio/AudioMixer.cc` 175-200 (first free, else priority steal).
- `SFX_info::get_next_sfx` and `time_to_play`: `/mnt/frankendom-donors/exult-exult/shapes/shapeinf/sfxinf.cc` 64-74.
- `Background_noise::handle_event`: `/mnt/frankendom-donors/exult-exult/gamewin.cc` 189-298 (bed state, track, birds).
- `MyMidiPlayer::start_music` (num overload): `/mnt/frankendom-donors/exult-exult/audio/Midi.cc` 117-170 (same-track check, stop, start on music sequence).
- `MyMidiPlayer::start_sound_effect`: `/mnt/frankendom-donors/exult-exult/audio/Midi.cc` 850-910 (MIDI sfx on slot 1).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant (theirs) |
|---|---|
| Emitter range gate, silent beyond it | 24 tiles (Audio.h:55; gate at animate.cc:55) |
| Distance falloff, linear in squared distance | 256 over 24 x 24 (Audio.cc:774) |
| Height adds distance per level | 8 per level, capped at 256 (Audio.h:56; Audio.cc:777-778) |
| Poll on a fixed grid | 100 ms (animate.cc:113, 151) |
| Voice count | 32 (Audio.cc:62) |
| Chance roll, percent | default 100, clamped 1-100 (sfxinf.cc:48-49, 64) |
| Variant pick, random or cycle | range default 1 (sfxinf.cc:53, 70, 72) |
| Hourly chime | hour mod 12, 12 at hour 0 and 12 (animate.cc:232-235) |
| Bird/cricket pools | night {61, 61, 255}; day {82, 85, 85} (gamewin.cc:269-270) |
| Bird repeat and gap | repeat 500 + rand % 1000 ms; gap 4000 + rand % 3000 ms (gamewin.cc:287, 289) |
| Bed start delay | 8000 ms default (gamewin.cc:192); 1000 ms with a music player (line not receipted) |
| Priority for every wave sound | 0 (Audio.cc:666), so no steal |
| Music and sfx on separate sequences | slot 0 music, slot 1 sfx (Midi.cc:91-92) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: range gate, distance, pan, chance roll, variant pick, voice allocation, and a grid-aligned poll. It omits the MIDI sfx path, the hourly chime, the frame gate, the looping flag, the one-shot Object_sfx path, the bed selector and bird layer, and the screen-centre listener (it takes a camera position). Fixes in the sketch, each against the donor: height uses the difference (donor adds the listener lift only, Audio.cc:777-778); pan uses the x offset only (donor also mixes heights into pan, Audio.cc:784); an out-of-range emitter is silenced but kept (donor deletes Object_sfx, animate.cc:153); cue priority is real, so a full table steals from a lower cue (donor passes 0). The sketch's self-check runs 40 torches for 50 polls and checks the voice cap.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

interface Vec3 { x: number; y: number; z: number; } // tiles; z = height level

const RANGE_TILES = 24;      // engine constant (donor Audio.h:55)
const HEIGHT_STEP = 8;       // engine constant (donor Audio.h:56)
const POLL_MS = 100;         // engine constant (donor objs/animate.cc:113)
const VOICES = 32;           // engine constant (donor audio/Audio.cc:62)
const SILENT = 256;          // distance at or over this = no sound (donor audio/AudioChannel.cc:793)

interface Emitter {
  id: string;
  at: Vec3;
  cues: number[];       // variant ids, zone data (donor: sfxnum + range offset)
  chance: number;       // percent chance per start roll, 1-100 (zone data; donor default 100)
  randomPick: boolean;  // true = random variant, false = cycle in order (zone data)
  volume: number;       // percent 0-100 (zone data; donor default 100)
  priority: number;     // cue class; the donor passes 0 for every sfx, so nothing is ever stolen
  voice: number;        // index into the voice table, -1 when silent
  cursor: number;       // position in cues for cycle mode
}

interface Voice { emitter: string; cue: number; priority: number; pan: number; distance: number; }

interface Spatial { distance: number; pan: number; inRange: boolean; }

// Listener = the camera position in tiles. Donor uses the centre tile of the visible window.
function spatial(listener: Vec3, at: Vec3): Spatial {
  const dx = at.x - listener.x;
  const dy = at.y - listener.y;
  const sq = dx * dx + dy * dy;
  if (sq > RANGE_TILES * RANGE_TILES) return { distance: SILENT, pan: 0, inRange: false };
  let distance = Math.floor((sq * 256) / (RANGE_TILES * RANGE_TILES));
  // fix: use the height difference, not the listener's lift alone (donor adds apos.tz * 8)
  distance = Math.min(256, distance + Math.abs(at.z - listener.z) * HEIGHT_STEP);
  // fix: pan from the x offset only (donor also mixes heights into the pan term)
  const pan = Math.max(-256, Math.min(256, Math.trunc((dx * 2 * 32) / 5)));
  return { distance, pan, inRange: true };
}

// Stereo gain 0..256 each side, donor shape: volume * (256 - distance) * side balance / 65536.
function stereo(sp: Spatial, volume: number): { left: number; right: number } {
  if (!sp.inRange || sp.distance > 255) return { left: 0, right: 0 };
  const base = Math.floor((volume * 256) / 100);
  const lbal = sp.pan > 0 ? Math.max(0, 256 - sp.pan) : 256;
  const rbal = sp.pan < 0 ? Math.max(0, sp.pan + 256) : 256;
  return {
    left: Math.floor((base * (256 - sp.distance) * lbal) / 65536),
    right: Math.floor((base * (256 - sp.distance) * rbal) / 65536),
  };
}

// Donor rule: first free slot; otherwise steal the lowest-priority voice only if it is strictly lower.
function allocate(voices: (Voice | null)[], want: Voice): number {
  const free = voices.findIndex((v) => v === null);
  if (free >= 0) { voices[free] = want; return free; }
  let low = 0;
  for (let i = 1; i < voices.length; i++) {
    const a = voices[i];
    const b = voices[low];
    if (a && b && a.priority < b.priority) low = i;
  }
  const cur = voices[low];
  if (cur && cur.priority < want.priority) { voices[low] = want; return low; }
  return -1;
}

// Grid-aligned next poll time (donor: curtime + delay - (curtime % delay)).
function nextPoll(nowMs: number): number {
  return nowMs + POLL_MS - (nowMs % POLL_MS);
}

// One poll for one emitter. Returns the voice index it is playing on, or -1.
// fix: an emitter that goes out of range is silenced but kept, so it re-arms when the listener returns.
function pollEmitter(e: Emitter, listener: Vec3, voices: (Voice | null)[], rng: () => number, now: number): number {
  void now;
  const sp = spatial(listener, e.at);
  if (!sp.inRange) {
    if (e.voice >= 0) { voices[e.voice] = null; e.voice = -1; }
    return -1;
  }
  if (e.voice >= 0 && voices[e.voice]) {
    const v = voices[e.voice];
    if (v) { v.pan = sp.pan; v.distance = sp.distance; }
    return e.voice;
  }
  // chance roll (donor sfxinf.cc: rand() % 100 < chance)
  if (rng() * 100 >= e.chance) return -1;
  if (e.cues.length === 0) return -1;
  let cue: number;
  if (e.randomPick) {
    cue = e.cues[Math.floor(rng() * e.cues.length)] ?? e.cues[0] ?? 0;
  } else {
    e.cursor = (e.cursor + 1) % e.cues.length;   // donor: advance, then pick
    cue = e.cues[e.cursor] ?? 0;
  }
  const slot = allocate(voices, { emitter: e.id, cue, priority: e.priority, pan: sp.pan, distance: sp.distance });
  e.voice = slot;
  return slot;
}

// Example: 40 torches, one listener, 100 ms poll; checks the voice table is never over VOICES.
const voices: (Voice | null)[] = new Array(VOICES).fill(null);
let seed = 7;
const rng = (): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const torches: Emitter[] = [];
for (let i = 0; i < 40; i++) {
  torches.push({ id: `torch${i}`, at: { x: i % 10, y: Math.floor(i / 10), z: 0 }, cues: [3, 4, 5], chance: 60,
    randomPick: true, volume: 80, priority: 1, voice: -1, cursor: 0 });
}
const listener: Vec3 = { x: 4, y: 2, z: 0 };
let t = 1000;
for (let tick = 0; tick < 50; tick++) {
  for (const e of torches) pollEmitter(e, listener, voices, rng, t);
  t = nextPoll(t);
}
const playing = voices.filter((v) => v !== null).length;
const sample = stereo(spatial(listener, { x: 5, y: 2, z: 0 }), 80);
if (playing > VOICES || sample.left < 0) throw new Error("voice cap or gain broken");
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/sound-cues.ts` (new client module; sound is client-only, the engine only emits cue ids). Parity-checklist row 12 (combat sound cues). Zone ambience emitters are zone data (cues, chance, range, volume per emitter), not code in that module. Note: the task hint named row 14; row 14 is HUD. Sound maps to row 12.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one engine: the engine emits cue ids and the client plays them); addendum: sound-music layering, ambience beds and voice limits

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism.
- No crossfade anywhere in audio/. A bed change is a hard cut (Midi.cc:156 stops the track before the new one starts). Frankendom's biome border crossfades have no model in this donor and must be designed fresh.
- Priority is 0 for every wave sound (Audio.cc:666), so the steal branch never runs and a full table drops new sounds. For fight cues that means a hit impact can be dropped while a footstep plays. Fix in the sketch: real cue priority classes, with impacts above ambience.
- Object_sfx deletes itself when the listener leaves range (animate.cc:153). An ambient loop started by usecode is lost for good. Fix in the sketch: the emitter is kept and re-arms.
- Height falloff uses the listener's lift only (Audio.cc:777-778). A ground torch gets quieter when the player climbs. Fix in the sketch: height difference.
- The MIDI sound effect path has no distance or pan and one sound slot (Audio.cc:624, Midi.cc:905). It cannot do positional cues. Reject for Frankendom cues.
- The donor has five bed states (dungeon, rain, snow, night, outside), not biomes (gamewin.cc 196-208). Biome beds need zone data from Frankendom.
- Hit and spell cues: not covered. The only combat sound call read is combat.cc:328 (comment "The weird noise"); the cue mapping was not read. Stingers: not read (Combat_schedule::danger_music is called at gamewin.cc but its body was not read).
- The 32-voice cap and the 100 ms grid are donor numbers from a 1990s-era engine. Frankendom should pick its own count and test it on a phone.
- Listener is the centre of the visible window, not the actor (Audio.cc:763-764). Frankendom's camera is the listener, so the centre choice would need a check against the over-the-shoulder camera.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: 1 (one engine, client-only sound); addendum sound-music rules (layering, beds, voice limits)

Best transferable idea: Give every ambient emitter a range gate, a chance roll and a variant pick from its own data, and let the voice table steal by real priority, not a fixed 0.
Decision (proposed): adapt - keep the emitter shape (24-tile gate, chance, variant pick, pan and falloff, grid poll) as zone data for cues and ambience; fix priority, the out-of-range delete and the height term; reject the MIDI sound path and the hard bed cut as models.
Acceptance: Walk away from a campfire emitter and its loop goes silent, then comes back when you return; with more cues than voices, a hit impact still plays while a lower-priority footstep is dropped (client unit test of pollEmitter and allocate, no server involved).
