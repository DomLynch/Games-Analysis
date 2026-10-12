# OpenRCT2-OpenRCT2 (sound-music, cell 1)

Donor: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2-ui/ride/VehicleSounds.cpp` | Licence: GNU GPL v3 (`/mnt/frankendom-donors/OpenRCT2-OpenRCT2/licence.txt`, GPL v3 text; the lines I read of VehicleSounds.cpp carry no per-file licence header) | C++ | symbol `UpdateVehicleSounds`

Checked: The hint file `src/openrct2-ui/audio/SDLAudioSource.cpp` is the SDL output source, not the policy, so I did not use it for the mechanism. Files opened: `src/openrct2-ui/ride/VehicleSounds.cpp` (615 lines, read in full for the update path: candidates, priority, admission, slots, stop, volume, pan, pitch), `src/openrct2/audio/Audio.h` (voice cap and structs), `src/openrct2/ride/TrainManager.h` and `TrainManager.cpp` (head-only iteration), `src/openrct2/ride/Vehicle.Sound.cpp` 41-45 and `src/openrct2-ui/WindowManager.cpp` 551-552 (dispatch), `src/openrct2/GameState.cpp` 325-345 (update order), `src/openrct2/entity/Peep.cpp` 1155-1240 (crowd bed), `src/openrct2/audio/Audio.cpp` 380-400. Not read: `CreateAudioChannel` and the mixer internals, where `sound1_id` and `sound2_id` are assigned, and `RideAudio.cpp` beyond its function list. Confidence: high on the voice budget (read end to end); high on the crowd bed numbers (read in full, the sound asset is not read). I did not measure the range of `vehicle.velocity`. camera_scope: n/a (sound cell).

Best transferable idea: Rank every sound cue by a source weight plus a bonus while it already plays, keep a hard voice cap, and evict the lowest voice only when a newcomer outranks it.
Decision (proposed): adapt — the priority-and-cap shape fits crowded many-vs-one hit and impact cues, but the donor's eviction picks the wrong voice, so the sketch fixes it and the weight becomes attacker threat, not train mass.
Acceptance: In a 3-vs-1 fight with 12 extra ambient hit cues queued in one frame, at most 8 cue voices sound (a data field), the 8 with the highest weight win, a server-verified kill cue is never evicted, and a test asserts that a newcomer outranking the lowest voice replaces exactly that voice.

## 1. Mechanism

- One candidate per train. `TrainManager::View` yields train heads only (`TrainManager.cpp` 25, `TrainManager.h` 22). Each game update, `GameState` calls `VehicleSoundsUpdate` (`GameState.cpp` 338), which broadcasts an intent (`Vehicle.Sound.cpp` 44) that `WindowManager.cpp` 552 handles by calling `UpdateVehicleSounds`. So the budget runs once per game update, not per rendered frame.
- Step 1, candidacy (`SoundCanPlay`, 105 onward): a train is skipped in the scenario editor, when it has no sound ids (113), when it has no position, or when it is outside the music-tracking viewport rectangle. In the main window that rectangle is widened by a quarter of the view on each side.
- Step 2, priority (`GetSoundPriority`, from 156): priority = train mass (sum of car `mass` over the train, 102) + (|velocity| >> 13) (158). A train that already holds a voice gets +300 (162-165). The bonus is hysteresis: a playing voice is hard to steal.
- Step 3, admission (`UpdateSoundParams`, 239-270): the candidates live in a list sorted highest priority first, capped at 14 (`kMaxVehicleSounds`, `Audio.h` 25; the list type is `sfl::static_vector`, line 541). A candidate finds the first entry with a lower priority (249). If none, it is appended when there is room (253-255) and dropped when full. If found and there is room, it is inserted there (263). If found and full, it overwrites that entry (267).
- Step 4, stop: any live voice whose train is not in the admitted list is stopped and its slot freed (`kSoundIdNull`, 551-577).
- Step 5, slots: for each admitted candidate, the voice slot already owned by that train is reused; otherwise a free slot is claimed with volume 0x30 (361-366). If there is no free slot the candidate is skipped (585 comment; the `continue` follows it).
- Step 6, volume: the slot volume is an attenuation, not a loudness. The target is 0 (full) or 0x30 (quiet) when the train is below the surface (220, 227-229). A newly claimed slot starts at 0x30 (366), so a new above-ground voice starts quiet and ramps to full over 12 updates, 4 units per update (595, 599). The pan volume is reduced by the live volume (603), and the channel volume is then `volume * panVol / 8 - 0x1FFF`, clamped to -10000 (469-471).
- Step 7, pan and pitch (`CreateSoundParam`, 172-232): pan comes from the train's screen position (186); vertical pan lowers the volume (`VehicleSoundsUpdateGetPanVolume`, 298-339). Pitch (200-218): frequency = |velocity|, doubled when the car type sets `doubleSoundFrequency` (205-208), shifted right by 5 (divide by 32, 212), multiplied by 5512 and shifted right by 14 (213-214), plus base 11025 (216) plus 16 per unit of doppler shift (217). The channel rate is only written when `currentTicks & 3` is 0 and the frequency changed (519), and only for track noises and non-fixed-frequency sounds (`ShouldUpdateChannelRate`, 522). A finished looping channel is released (473-477) and a channel whose sound id changed is stopped (478-482).
- Each train can own two channels (track sound and other sound, `UpdateSound` at 467), so 14 voices can mean up to 28 channels (count from the struct, not measured).

Second mechanism in the same subsystem (read in full): a crowd bed (`PeepUpdateCrowdNoise`, `Peep.cpp` 1168-1240, called from the game update at `GameState.cpp` 339). Each update it counts guests whose sprite rectangle is inside the music viewport, weighting queuing guests 1 and others 2 (1201). It takes half of that total and subtracts 6 (1209). Below zero it mutes the bed (1210 is the test). Otherwise it sets volume to (120 - min(n, 120))^4 mapped through the viewport zoom (1222-1224). The donor comment (1220) says this scales [0, 120] to roughly [-3314, -150] dB/100. My own arithmetic from the code, at zoom level 0: n = 0 gives -3314 and n = 120 gives -150. The bed is audible from a weighted total of 12 (six walking guests, or twelve queuing). The looping channel is created once and reused (1227-1229).

Defects (keep the idea, fix the defect):
- D1, eviction picks the wrong voice. When the list is full, the donor overwrites the first entry below the newcomer (`*soundParamIter = ...`, 267). That is the highest of the lower entries, not the lowest, so a newcomer can evict a voice that outranks the bottom of the list. fix: when full, drop the last (lowest) entry if the newcomer outranks it (sketch `admit`).
- D2, latent overshoot. The ramp is `+= 4` / `-= 4` with no clamp to the target (595, 599). It overshoots when a target is not a multiple of 4. Today the targets are 0 and 0x30 (220, 229), both multiples of 4, so this donor does not overshoot. fix: clamp the step to the target (sketch `rampVolume`).
- Not a defect, a tuning caveat: the speed term is |v| >> 13, and I did not measure the velocity range, so I cannot say how far speed can move priority against mass. A stopped heavy train outranks a fast light one. fix: set the weights from measured data before use.

## 2. Key functions

- `UpdateVehicleSounds`: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2-ui/ride/VehicleSounds.cpp` 534 to the end of the file. Candidate collection, stop pass, slot assignment, ramp, channel update.
- `UpdateSoundParams`: same file, from 239 (the replacement is at 267). Priority admission with the cap and the eviction.
- `GetSoundPriority`: same file, from 156. Mass + speed term + playing bonus.
- `CreateSoundParam`: same file, 172-232. Pan, pitch, underground volume.
- `PeepUpdateCrowdNoise`: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/entity/Peep.cpp` 1168-1240. Crowd bed volume from the visible count.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants (theirs) |
|---|---|
| Priority = source weight + speed term, +hysteresis while playing | Weight is train mass (sum of car mass, 102); speed term |v| >> 13 (158); playing bonus +300 (165) |
| Hard voice cap, sorted admission | 14 voices (Audio.h 25) |
| Volume ramp toward a target, fixed step per update | Step 4 (595, 599); the value is an attenuation: new voice starts at 0x30 (quiet, 366) and ramps to 0 (full); target 0x30 underground (229) |
| Pitch from speed, rate written at a cadence | Base 11025 (216); velocity >> 5 then x 5512 >> 14 (212-214), doubled first for cars flagged doubleSoundFrequency (205-208); doppler 16 per unit (217); rate every 4 ticks (519) |
| Presence-gated looping bed, volume from count | Queuing weight 1, other weight 2 (1201); half, minus 6 (1209); mute below zero (1210); count cap 120 and fourth power (1222-1223) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's priority formula, the +300 playing bonus and the cap, and it fixes D1 (lowest-voice eviction) and D2 (clamped ramp), both marked "Fixed:". It omits the on-screen candidacy test, pan and vertical attenuation, the pitch mapping, the two channels per train, the underground volume, the stop pass (the caller does it), channel creation, and the crowd bed. The list is a plain array, where the donor uses a fixed-capacity static vector.

```ts
// Licence: GPL-3.0 (donor, licence.txt). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface CueVoice { source: number; priority: number; volume: number; }

const MAX_VOICES = 14;        // engine constant: the donor's voice cap
const PLAYING_BONUS = 300;    // engine constant: hysteresis for voices already playing
const RAMP_STEP = 4;          // engine constant: volume change per game update

// Priority: source weight (the whole train, summed by the caller) + speed term + bonus while already playing.
function cuePriority(weight: number, speed: number, alreadyPlaying: boolean): number {
  const base = weight + Math.floor(Math.abs(speed) / 8192);
  return alreadyPlaying ? base + PLAYING_BONUS : base;
}

// Keeps the list sorted highest priority first.
function insertSorted(list: CueVoice[], cand: CueVoice): void {
  const at = list.findIndex(v => cand.priority > v.priority);
  if (at === -1) list.push(cand);
  else list.splice(at, 0, cand);
}

// Fixed: when the list is full the LOWEST voice is evicted, and only if the newcomer outranks it.
// The donor overwrites the first entry below the newcomer, which is not necessarily the lowest voice.
function admit(list: CueVoice[], cand: CueVoice): void {
  if (list.length < MAX_VOICES) {
    insertSorted(list, cand);
    return;
  }
  if (cand.priority > list[list.length - 1].priority) {
    list.pop();
    insertSorted(list, cand);
  }
}

// Volume moves toward its target by a fixed step per game update.
// Fixed: the step is clamped to the target so the ramp cannot overshoot when the target is not a multiple of the step.
function rampVolume(current: number, target: number): number {
  if (current < target) return Math.min(current + RAMP_STEP, target);
  if (current > target) return Math.max(current - RAMP_STEP, target);
  return current;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/cue-voices.ts` (new client-side module: a voice budget for combat sound cues; sound is client-only and the engine never imports it). Parity-checklist row 12 (combat sound cues). I did not read Frankendom's current cue code, so I cannot say what it does today.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only, shape only)
- Brief rule served: 1 (one engine; sound is a client that reads engine events); rule 8 (target and row named)

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism, not from the donor lines.
- The donor budget is about sound only. Frankendom must make sure a budget never drops a cue that confirms a server-verified outcome (a kill or a death). That needs its own top priority class, which the donor does not have.
- The donor weights voices by train mass. Frankendom would weight by attacker threat or hit size, which is untested. The velocity term has no counterpart.
- The 14-voice cap is far above what MAX_ATTACKERS = 3 needs in a duel. The cap belongs in data (zone or Pit), not as a copied constant. The budget matters most for crowd and spectator cues in open zones.
- The donor has no biome beds and no crossfade between music tracks. The ride-music volume follows distance (`RideAudio.cpp` 366-425, not read in full). Frankendom's ambience-bed and crossfade need is not covered by this donor.
- The crowd bed counts entities over the whole guest list each update. That is fine for client-side sound. It must never feed back into engine state.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: 1 (one engine, sound is a client); rule 8 (target and parity row 12 named)

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- Pitch description incomplete: the donor optionally doubles the frequency (doubleSoundFrequency, 205-208) and shifts right by 5 (212) before the 5512 multiply and 14-bit shift, so the velocity scale is 32 times smaller than the note said and the per-car doubling was missing. Confirmed (VehicleSounds.cpp 200-218).
- Volume semantics unstated: the slot volume is an attenuation subtracted from the pan volume (603); a new voice starts at 0x30 (quiet) and ramps to full. Confirmed.
- Missed: UpdateSound (467-528) only updates the rate for track noises and non-fixed sounds, converts volume as volume * panVol / 8 - 0x1FFF clamped to -10000, and releases a finished looping channel (473-477). Confirmed.
- Verified OK by checker: licence, voice cap 14, SoundCanPlay, GetSoundPriority, UpdateSoundParams and defect D1, stop pass, slot claim, ramp (D2 latent), rate cadence, GameState order, crowd bed arithmetic.
Fixed 2026-10-12: pitch formula, volume semantics and channel update path in the mechanism text and tables. Sketch unchanged (it omits pitch).
