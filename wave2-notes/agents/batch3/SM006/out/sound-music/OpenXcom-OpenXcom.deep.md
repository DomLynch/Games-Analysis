# OpenXcom-OpenXcom (sound-music, cell 3)

Donor: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Battlescape/BattlescapeState.cpp` (bed start and stop), with the mechanism spread over `src/Engine/Sound.cpp`, `src/Engine/Game.cpp`, `src/Battlescape/Map.cpp` and `src/Mod/RuleTerrain.cpp` | Licence: GNU GPL v3 or later (`src/Engine/Music.cpp` and `src/Engine/Sound.cpp` headers: "either version 3 of the License, or (at your option) any later version"; `LICENSE.txt` is the GPL v3 text) | C++ | symbol `BattlescapeState::init` (bed start) and `Sound::loop`

Checked: The hint file `src/Engine/Music.cpp` is the wrong place for the mechanism. It is a thin SDL_mixer wrapper (play, stop, pause, resume), and it has no ambience logic. The ambience bed is in `Sound.cpp` (the loop on a fixed channel), `Game.cpp` (channel setup and the ambient volume multiplier), `Map.cpp` (stereo angle from the camera), `BattlescapeGenerator.cpp` (sets the bed from the terrain) and `RuleTerrain.cpp` (the per-terrain sound and volume from the ruleset). Files read: `Music.cpp` 33-162 (whole file), `Sound.cpp` 20-133 (whole class), `Map.cpp` 1705-1735 (`getSoundAngle`), `Game.cpp` 360-390 (`setVolume`, starts at 367) and 655-675 (channel setup), `BattlescapeState.cpp` 488-500 and 2016-2026, `BattlescapeGenerator.cpp` 2005-2016, `RuleTerrain.cpp` 32, 88-94, 250-258, `SavedBattleGame.cpp` 1984-2000 and 2059-2073 (accessors), `Sound.h` (signature). Not read: `Camera::convertMapToScreen`, `Mod::loadSoundOffset`, the adlib player, and where battle music is chosen (I found only the play function). Confidence: high on the bed chain (read end to end); high on the angle law (read, and the donor's own comment states the 80-degree reason); medium on the SDL_mixer channel-selection rule, which I state from the SDL_mixer API, not from the donor source. No crossfade exists in the bed or the music path (searched). camera_scope: n/a (sound cell; the camera is used only as the stereo reference).

Best transferable idea: Give each zone a looping ambience bed (sound id and volume as zone data) on a fixed reserved channel, scale it by the master volume, and pan one-shots by camera-relative position with the sweep clamped to 80 degrees so no speaker goes silent.
Decision (proposed): adapt — the per-zone bed with its own volume and channel is the zone-as-data shape Frankendom wants, but the donor has no crossfade and a hard-cut music change, so the browser build adds gain ramps and keeps the 80-degree clamp.
Acceptance: Entering a zone starts its bed within one frame with no restart if it is already playing; crossing from zone A to zone B fades A out and B in over a data-set time (test asserts both gains move monotonically with no step); a one-shot hit at the far left of a 375-wide view is panned at the clamped 80-degree limit, not fully left.

## 1. Mechanism

- Zone data sets the bed. `RuleTerrain` reads the bed's sound id from the ruleset (`ambience`, `RuleTerrain.cpp` 92) and its volume (`ambientVolume`, 93), defaulting to volume 0.5 (32). The battle generator copies both onto the save (`BattlescapeGenerator.cpp` 2011-2012, `SavedBattleGame::setAmbientVolume` at 2062). So the bed is chosen once per battle from the terrain (OpenXcom's word for a biome-like map set).
- Start (`BattlescapeState::init`, 494-498). If the save has an ambience sound, call `loop()` on it, then `setVolume` with the options. `Sound::loop` (`Sound.cpp` from 110) plays the sound on channel 3 with loop count -1 (forever), but only if channel 3 is not already playing (112). So starting twice is a no-op.
- Volume (`Game::setVolume`, `Game.cpp` 367-383). The master sound volume is set on all channels (374). Then channel 3 is set to the master sound volume times the save's ambient volume (377). With no battle loaded, channel 3 gets half the master (381-382). So the bed scales with both the master and the zone's own volume.
- Channel plan (`Game.cpp` 667-669). The mixer is opened with 16 channels, and channels 0 to 3 are reserved (`Mix_ReserveChannels(4)`). Channel 3 is the bed. One-shots that pass channel -1 use the unreserved part of the pool (channels 4 to 15, 12 voices) (SDL_mixer API behaviour, not read in the donor).
- Stop (`BattlescapeState::finishBattle`, `BattlescapeState.cpp` 2013-2022). `stopLoop()` halts channel 3 (`Sound.cpp` from 125, halt at 129). The lookup uses depth 0, but `stopLoop` ignores the sound object, so this is harmless (a nit, not a defect).
- Stereo one-shot (`Map::getSoundAngle`, `Map.cpp` 1717-1731). Each one-shot gets an angle from the world position: convert to screen by the camera (1722), take the x offset from the view centre (1719, 1725), clamp it to half the view width, and map it into 280 to 440 degrees (1731). The comment (1728-1729) says the sweep stops at 80 degrees, not 90, so one speaker is never fully muted. `Sound::play` applies the angle only when stereo is on (`Sound.cpp` 86-88).
- Distance is not used. `Sound::play(channel, angle, distance)` defaults distance to 0 (`Sound.h` 44), and every caller in the grep passes only the angle. So there is no distance attenuation.
- Music is a separate path. `Music::play` stops the current track and starts the new one at once (`Music.cpp` 93-94, with `stop()` halting it at 113). There is no fade. So a track change is a hard cut. (Search: "fade" appears in none of the music or sound files read.)

Order of operations for a one-shot: `getSoundAngle` (camera → clamp → angle) → `Sound::play` (choose channel by -1, set position if stereo). For the bed: terrain → save (sound, volume) → `init` loop on channel 3 → `setVolume` (channel 3 = master × ambient).

Defects and risks (keep the idea, fix the defect):
- R1, the bed can silently not start. `Sound::loop` returns when channel 3 is busy (112) and reports nothing. The only stop call I found is in `finishBattle` (2022). If a battle ends by another route, the old bed keeps looping and the next battle's `loop()` returns without starting its own bed. I did not check every exit path. fix: report the busy state and stop or replace the old bed on the next zone change (the sketch returns "busy").
- D2, music is a hard cut. `Music::play` halts then plays (93-94, 113). fix: fade the old track out and the new one in over a data-set time (browser build: gain ramps). This is the change the topic's crossfade needs.
- Gap, not a defect: no distance attenuation (distance is always 0). fix: pass the world distance to the camera as the distance argument, so far sounds are quieter.

## 2. Key functions

- `Sound::loop` / `Sound::stopLoop`: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Engine/Sound.cpp` from 110 and from 125 (end lines not read). Start and stop the bed on channel 3.
- `Game::setVolume`: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Engine/Game.cpp` 367-383. Master volume plus the bed's own volume on channel 3.
- `Map::getSoundAngle`: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Battlescape/Map.cpp` 1717-1731. Camera-relative stereo angle with the 80-degree sweep.
- `BattlescapeState::init`: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Battlescape/BattlescapeState.cpp` 494-498. Bed start.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants (theirs) |
|---|---|
| Zone bed = sound id + volume as zone data | Default volume 0.5 (RuleTerrain.cpp 32); override from ruleset (93) |
| Bed on a fixed channel, started once | Channel 3 (Sound.cpp 112-114) |
| Bed loudness = master × zone volume | Master from options; fallback half master with no battle (Game.cpp 381-382) |
| Reserved channels for beds and UI | 16 channels total (Game.cpp 667); 4 reserved (669) |
| Camera-relative stereo angle, clamped | Half view width clamp (Map.cpp 1725); sweep 80 degrees (1728-1731); angle range 280 to 440 |
| Distance attenuation (not used) | Distance argument 0 (Sound.h 44) |

## 4. TypeScript sketch

simplified: the sketch keeps the zone bed (sound id and volume as data), the fixed bed channel, the master × zone gain, the 80-degree clamped stereo angle and the reserved-channel one-shot pick. It fixes two things (marked "Fixed"): a busy bed is reported instead of ignored (R1), and a zero half-width no longer divides by zero. It omits the SDL_mixer calls, the ruleset loading, the stereo-off branch, the no-battle fallback, the distance argument (not used by the donor, and not added here), and any crossfade (the donor has none; the browser build adds it).

```ts
// Licence: GPL-3.0-or-later (donor, Music.cpp and Sound.cpp headers; LICENSE.txt is GPL v3). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface ZoneBed { soundId: number | null; volume: number; }   // zone data: one bed per terrain/zone (donor default volume 0.5)

const TOTAL_CHANNELS = 16;      // engine constant: channel pool size
const RESERVED_CHANNELS = 4;    // engine constant: channels 0..3 kept back from general one-shots
const BED_CHANNEL = 3;          // engine constant: the ambience bed's fixed channel
const SWEEP_DEG = 80;           // engine constant: stereo sweep each side of straight ahead, in degrees

// Start a zone's bed on its fixed channel. Fixed: a busy bed channel is reported, not silently ignored.
function startBed(bed: ZoneBed, channelBusy: (ch: number) => boolean,
                  play: (ch: number, id: number) => void): "started" | "none" | "busy" {
  if (bed.soundId === null) return "none";
  if (channelBusy(BED_CHANNEL)) return "busy";   // donor: loop() returns without starting when channel 3 is playing
  play(BED_CHANNEL, bed.soundId);
  return "started";
}

// Bed loudness = master sound volume x the zone's ambient volume, each clamped to [0, 1].
function bedGain(masterSound: number, bed: ZoneBed): number {
  return Math.min(1, Math.max(0, masterSound)) * Math.min(1, Math.max(0, bed.volume));
}

// Stereo angle from a world x relative to the view centre, clamped to the half view width.
// Result is in degrees, 280..440 for the full sweep (360 = straight ahead), as the donor does.
// Fixed: a zero half-width returns straight ahead instead of dividing by zero.
function stereoAngle(relX: number, halfWidth: number): number {
  if (halfWidth <= 0) return 360;
  const clamped = Math.max(-halfWidth, Math.min(halfWidth, relX));
  return 360 + clamped / (halfWidth / SWEEP_DEG);
}

// One-shots take any free channel from the unreserved part of the pool (donor: first free channel from 4 up).
function pickOneShotChannel(busy: boolean[]): number | null {
  for (let c = RESERVED_CHANNELS; c < TOTAL_CHANNELS; c++) {
    if (!busy[c]) return c;
  }
  return null;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/zone-bed.ts` (new client-side module: plays a zone's ambience bed and maps one-shot positions to stereo for the player's view; sound is client-only and the engine never imports it). Parity-checklist row 12 (combat sound cues) for the one-shot pan; the bed itself is zone data (row 23 zone population does not apply to sound, so row 12 is the row). I did not read Frankendom's current sound code.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only, shape only)
- Brief rule served: 1 (one engine; sound is a client that reads engine events); rule 8 (target and row named)

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism, not the donor lines.
- The donor has no crossfade and no stinger. Its music change is a hard cut (`Music.cpp` 93-94). Frankendom's zone-to-zone bed and music crossfades are therefore new work; the donor shows only where the bed is set.
- R1 (busy bed is silently skipped) is a real code gap in the donor, but I found no path that puts a one-shot on channel 3. Frankendom should still report the busy state.
- The 80-degree clamp is a good rule for a 2D fight, where a fully hard-panned hit would mute one speaker. Frankendom should keep it.
- No distance attenuation in the donor. A far enemy's cue is as loud as a near one, apart from the stereo angle. Frankendom needs a distance law as data if far cues must be quieter.
- Ambience is chosen once per battle at generation, not per tile, so a border between two biome zones has no crossfade in the donor.
- The bed and one-shot pan both depend on the camera. The camera is client-only, so the sound layer reads it; the engine must never read the camera.

Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
Brief rule served: 1 (one engine, sound is a client); rule 8 (target and parity row 12 named)
