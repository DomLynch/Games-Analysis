# afritz1-OpenTESArena (sound-music, cell 15)

Donor: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Audio/AudioManager.cpp` (hint file `SoundLibrary.cpp` is only a sound-name list; the mechanism is here, with `MusicLibrary.cpp`, `MusicUtils.cpp`, `Game/GameState.cpp`, `Player/Player.cpp`, `Weather/WeatherInstance.cpp`, `Game/Game.cpp`, data `data/audio/MusicDefinitions.txt` and `SingleInstanceSounds.txt`) | Licence: MIT (`LICENSE.txt` line 1: "The MIT License (MIT)"; code may be adapted) | C++ | symbol `AudioManager::playSound` (voice pool) and `AudioManager::setMusic` (stinger, then staged bed)

Checked: Read end to end: `playSound` (1100-1148), `playSoundOneShot` (1162-1190), `updateSources` (953-1000), `allocateSound` and `freeSound` (1007-1040), `setMusic` (850-874), `playMusic` (813-849), `anyPlayingSounds` (727-744), `getRandomMusicDefinitionIf` (478-494). Read in part: `init` and the source pool (469-530), `stopMusic` and `stopSounds` (876-898), the music-to-scene paths (`GameState.cpp` 1215-1240, `Player.cpp` 990-1020, `MusicUtils.cpp` 1-90), `WeatherInstance.cpp` 104-123, `Game.cpp` 266-270 and 979, `Options.h` 89-90, `SoundLibrary.cpp` 1-70 (whole file: a list of 27 sound names in 6 groups, sorted at load). Not read: `KeyValuePool` (the instance pool and its capacity), `stopSound` (1156-1160), `pauseSound`, the MIDI open path, the `OpenALStream` thread code, `ArenaClockUtils::nightMusicIsActive`, `MakeSecondsUntilNextLightning`, the default for the sound-channel option. Counts: `MusicDefinitions.txt` has 38 numbered entries in 8 sections (grep -c, read only); `SingleInstanceSounds.txt` has one entry, DRUMS.VOC. camera_scope: n/a. Confidence high on the source pool, the single-instance rule, the drop-new rule, the stinger staging and the four defects (each read in the code path); the size of the one-shot leak (pool capacity) is not measured. Grep over `src/Audio` for fade, crossfade, duck, ambient, ambience, stinger and priority found nothing: no crossfade, no ambience bed and no layered music in the donor.

## 1. Mechanism

Four parts; the first two are the voice rules the cell asks about.

- **Voice pool (drop, never steal).** At init, `maxChannels` OpenAL sources are created and put on the free list `mFreeSources` (`AudioManager.cpp` 505-529). The count comes from the options (`Game.cpp` 269; the option's range is 1 to 256, `Options.h` 89-90). `playSound` (1100) takes the source from the back of the list (1120-1121). If the list is empty it logs "No free sources to play sound" and returns (1107-1110): the sound is dropped, and no older voice is stopped.
- **Single-instance names.** `SingleInstanceSounds.txt` (in `data/audio`) lists file names that may have one playing copy at a time; the header says the one-sound-at-a-time limit of the original game no longer exists, so this is a new rule (`AudioManager.cpp` 539-549). In `playSound`, a listed name is skipped while `anyPlayingSounds` finds an instance of that name holding a source (1113-1117, 727-744). The check runs after the free-list test, so with no free source the warning comes first.
- **Recycling.** `updateSources` (953-1000, called once per frame from `Game.cpp` 979) looks at each instance. An instance with no source is skipped (960). When its source has stopped (AL_STOPPED), the source is reset and put on the front of the free list (973), and a one-shot instance is destroyed (978). `freeSound` (1028-1040) does the same return on demand.
- **Stinger, then staged bed.** `setMusic(musicDef, optMusicDef)` (850-874): with an optional piece, that piece plays once, not looping (856-857), and the main piece is staged in `mNextSong` (860). Each frame, `updateSources` starts the staged piece looping once the stream is no longer playing (990-996, "Assume that the next music always loops"). `playMusic` (813-849) does nothing if the same file is already playing (815); otherwise it calls `stopMusic` (820, a hard stop) and opens a new stream, but only if a free source exists (822).
- **Context choice of music.** `getRandomMusicDefinitionIf` (478-494) fills an index list in order (481), shuffles it (482), and returns the first entry for which the predicate is true (487): a uniform pick among the matching entries. Exterior music is chosen by the weather definition unless the night clock is active (`MusicUtils.cpp` 52). Interior music is chosen by interior type (dungeon, crypt and tower map to the dungeon set). On a scene change, `GameState.cpp` 1227-1233 passes the main piece and the optional jingle together. Entering water sets a swimming piece (`Player.cpp` 1003, not in interiors), and leaving restores the exterior piece (1016). Data: `data/audio/MusicDefinitions.txt` sections are CharacterCreation, Cinematic, Interior, Jingle, MainMenu, Night, Swimming and Weather; jingle entries carry a city type and a climate type (for example `CityState,Desert`).
- **Thunder.** A countdown in `WeatherRainInstance::Thunderstorm::update` (`WeatherInstance.cpp` 104-119): while the thunderstorm clock is active, when the countdown reaches zero it is re-armed at random and the thunder sound is played as a one-shot (119).
- **Tick.** `updateSources` once per frame (`Game.cpp` 979). Sound-to-source work happens at request time.

## 2. Key functions

- `AudioManager::playSound`: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Audio/AudioManager.cpp` 1100-1148 (voice pool, single-instance check, buffer, play).
- `AudioManager::playSoundOneShot` (3D): same file, 1162-1175.
- `AudioManager::updateSources`: same file, 953-1000 (recycling, one-shot destruction, staged music).
- `AudioManager::setMusic`: same file, 850-874 (stinger and staging); `AudioManager::playMusic`: same file, 813-849; `AudioManager::stopMusic`: same file, 876-885 (read; it does not clear the staged name or the current-song name).
- `AudioManager::anyPlayingSounds`: same file, 727-744.
- `AudioManager::allocateSound` and `freeSound`: same file, 1007-1040.
- `MusicLibrary::getRandomMusicDefinitionIf`: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Audio/MusicLibrary.cpp` 478-494.
- `MusicUtils::getExteriorMusicDefinition`: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Audio/MusicUtils.cpp` 47-68 (partly read; the night check at 52).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Fixed pool of voices; refuse when empty (drop, never steal) | Pool size = sound-channel option, range 1 to 256 (theirs, Options.h 89-90); default not read |
| Single-instance names from a data list | One entry in the donor's data: DRUMS.VOC (`SingleInstanceSounds.txt`, counted) |
| Finished voice returns to the front of the free list | Rule, no number (theirs, AudioManager.cpp 973) |
| Optional stinger plays once | `loop = false` (theirs, 856) |
| Staged bed loops | `loop = true` (theirs, 995 path, comment at 991) |
| Music pick: uniform among matching entries | Shuffle then first match (theirs, MusicLibrary.cpp 481-487) |
| Night switch | Night clock decides the exterior set (theirs, MusicUtils.cpp 52) |
| Thunder is a random one-shot countdown | Countdown distribution not read (theirs, WeatherInstance.cpp 119) |

## 4. TypeScript sketch

simplified: the sketch keeps the voice pool (fixed count, drop when empty, never steal; a single-instance name is skipped while one is playing; the finished source goes back on the front of the free list; a one-shot instance is destroyed when its sound ends), plus the stinger-then-bed stage (an optional stinger plays once; the bed is staged; the bed starts when the stream is free; same-file no-op). It adds two fixes the donor lacks: `playOneShot` releases an instance that cannot start, and the staged bed is cleared only when it really starts, with `stopAll` clearing it and the current-song name too (Defects C and E). It omits the OpenAL calls (buffers, gain, position, resampler, rewind), the VOC buffer lookup and its missing-buffer path (the sketch takes the source only after the instance exists and does not reorder the donor's lookup), the MIDI open, the 3D position and the `freeSound` and `stopSound` details. The donor takes the source before the buffer check; the sketch keeps the same take-then-play order.

```ts
// Licence: MIT (donor, OpenTESArena). Code may be adapted; this sketch is written from the described mechanism.
interface Instance { id: number; name: string; oneShot: boolean; source: number | null }

// Fixed pool of sources (donor: maxChannels sources, free list mFreeSources).
class VoicePool {
  private free: number[];
  private instances = new Map<number, Instance>();
  private nextId = 1;
  private singleInstance: Set<string>;

  constructor(sourceCount: number, singleInstanceNames: string[]) {
    this.free = Array.from({ length: sourceCount }, (_, i) => i);
    this.singleInstance = new Set(singleInstanceNames);
  }

  allocate(name: string, oneShot: boolean): number {
    const id = this.nextId++;
    this.instances.set(id, { id, name, oneShot, source: null });
    return id;
  }

  private anyPlaying(name: string): boolean {
    for (const inst of this.instances.values()) {
      if (inst.name === name && inst.source !== null) return true;
    }
    return false;
  }

  // Donor playSound: no free source means drop (never steal); a single-instance name already
  // playing means skip. Otherwise take a source from the back of the free list.
  play(id: number): boolean {
    const inst = this.instances.get(id);
    if (!inst) return false;
    if (inst.source !== null) return true; // already holds a source: restart (donor rewinds)
    if (this.free.length === 0) return false;
    if (this.singleInstance.has(inst.name) && this.anyPlaying(inst.name)) return false;
    inst.source = this.free.pop() as number;
    return true;
  }

  // Donor freeSound: give the source back to the front of the free list and drop the instance.
  release(id: number): void {
    const inst = this.instances.get(id);
    if (!inst) return;
    if (inst.source !== null) {
      this.free.unshift(inst.source);
      inst.source = null;
    }
    this.instances.delete(id);
  }

  // Fix for a donor defect: a one-shot that cannot start is released at once. The donor keeps such
  // an instance forever, because its per-frame update only destroys one-shots whose source ran.
  playOneShot(name: string): boolean {
    const id = this.allocate(name, true);
    if (this.play(id)) return true;
    this.release(id);
    return false;
  }

  // Per frame (donor updateSources): a source whose sound has stopped is recycled;
  // a one-shot instance is destroyed when its sound ends.
  update(isStopped: (source: number) => boolean): void {
    for (const inst of [...this.instances.values()]) {
      if (inst.source === null || !isStopped(inst.source)) continue;
      this.free.unshift(inst.source);
      inst.source = null;
      if (inst.oneShot) this.instances.delete(inst.id);
    }
  }

  freeCount(): number {
    return this.free.length;
  }
}

// Stinger-then-bed: an optional stinger plays once; the bed is staged and starts when the stinger ends.
class MusicStage {
  private current: string | null = null;  // donor mCurrentSong
  private staged: string | null = null;   // donor mNextSong

  constructor(
    private startStream: (file: string, loop: boolean) => boolean,
    private isStreamPlaying: () => boolean,
  ) {}

  set(bed: string, stinger?: string): void {
    if (stinger !== undefined) {
      this.play(stinger, false);
      this.staged = bed;
    } else {
      this.staged = null;
      this.play(bed, true);
    }
  }

  // Donor playMusic: the same file already playing is a no-op; otherwise stop, then start.
  private play(file: string, loop: boolean): void {
    if (this.current === file) return;
    this.current = null;
    if (this.startStream(file, loop)) this.current = file;
  }

  // Fix for a donor defect: stopping all music also clears the staged bed. (The donor's stopMusic
  // leaves it set, so the old bed starts on the next frame.) The caller stops the stream itself.
  stopAll(): void {
    this.staged = null;
    this.current = null;
  }

  // Per frame (donor updateSources): when nothing is playing and a bed is staged, start the bed looping.
  // Fix for a donor defect: the staged name is cleared only when the bed really started (the donor
  // clears it even when there was no free source, so the bed is lost).
  update(): void {
    if (this.staged !== null && !this.isStreamPlaying()) {
      const bed = this.staged;
      this.play(bed, true);
      if (this.current === bed) this.staged = null;
    }
  }

  nowPlaying(): string | null {
    return this.current;
  }
}

export {};
```

## 5. Lands in

- TARGET `origins/client/audio/voices.ts` (new; client-only, since sound is client-only by ruling). It holds the voice pool and one-shots. The stinger stage (`MusicStage`) goes in the same module for now. The server sends the cue id and the position; the client plays.
- Parity-checklist row: 12 (combat sound cues). The brief's hint was row 14 (HUD); this is sound, so row 12. Zone ambience has no row of its own.
- Reuse tag: rewrite-from-idea (MIT: code may be adapted; the sketch is clean from the mechanism, and the donor's shape is taken without copying lines)
- Brief rule served: 1 (one engine, zones as data); sound is client-only, so the server carries the cue id and the position

## 6. Gaps and risks

- Defect A, one-shot instances leak. A one-shot whose play fails keeps its instance forever. Three paths: a refused single-instance name returns before a source is taken (`AudioManager.cpp` 1115-1117); a dropped sound returns from `playSound` and `playSoundOneShot` still runs on the instance (1173); and the per-frame update skips instances with no source (960), so they are never destroyed. Fix: release the instance when the play fails (`playOneShot` in the sketch). The pool's capacity (`KeyValuePool`, not read) decides how many leaks it takes to fail an allocation (`allocateSound` logs "Couldn't allocate sound instance ID", 1011-1014); that is not measured.
- Defect B, a missing buffer holds the source. The source is taken (1120-1121) before the VOC buffer lookup (1123), and a missing buffer returns with the source attached and never played. For a one-shot, the instance then never recycles (Defect A). Fix: look up the buffer first, then take the source.
- Defect C, a stopped staged bed starts again. `stopMusic` (876-885) clears the stream but not `mNextSong` (the name is still set). `setMusic(nullptr)` (872) during a stinger leaves the staged bed set; the next frame starts it (`hasNextMusic` at 772 and the free-stream check at 990). Fix: clear the staged bed on every stop (`stopAll` in the sketch). See also Defect E for the current-song name.
- Defect D, a staged bed is lost when it cannot start. `playMusic` does nothing without a free source (822) and no retry is made, but the staged name is cleared right after the attempt (996). Fix: clear it only when the stream starts (the sketch does).
- Defect E, a stopped track cannot be requested again. `stopMusic` (876-885) never clears `mCurrentSong` (it is only assigned at 840 when a stream starts). After `setMusic(nullptr)` or `stopMusic`, asking for the same track again hits the `mCurrentSong == filename` early return at 815 and silently does nothing. Fix: clear the current-song name on every stop; the sketch's `stopAll` sets `current = null` for this reason, and `play` clears it before a start so a failed start is not remembered as playing.
- Music changes are hard cuts. `playMusic` stops the old stream at once (820). The donor has no crossfade anywhere in `src/Audio`. If Frankendom adds a zone bed, it needs a fade (the shape is the same as the Valve donor: step is frame time over fade time; that donor is restricted and is not used).
- No priority. A sound is dropped when the pool is empty, never ranked against a telegraph or a finisher. Fix (not in the donor): a priority tier per cue; a high-priority cue may evict a lower one.
- Sound names are code. `SoundLibrary.cpp` (10) has a TODO to load them from `SoundDefinitions.txt`; the donor's names are a fixed list of 27 in six groups. For zones as data, the cue list should be data from the start.
- No ambience beds, no layered music, no biome-keyed loops. The donor's per-biome music is by weather and climate on the jingle and weather lists; there are no ambient loops per biome. The Frankendom biome beds have to be designed from scratch.
- Thunder is a one-shot countdown (`WeatherInstance.cpp` 104-119). The donor uses randomness for when the next strike comes; the distribution was not read.

Reuse tag: rewrite-from-idea (MIT; code may be adapted, the sketch is clean from the mechanism)
Brief rule served: 1 (one engine, zones as data); sound is client-only; the server carries the cue id and position

## Checker findings (Sonnet 5.5 medium, 2026-10-12)

Verdict: MINOR
- No false claim found; all cited lines check.
- Missed defect E: `stopMusic` (AudioManager.cpp 876-885) never clears `mCurrentSong` (assigned only at 840), so after a stop the same track cannot be requested again (early return at 815). The sketch's `stopAll` already fixed it silently; now recorded as a donor defect with its reason. Confirmed against code.

Fixed 2026-10-12: added Defect E, and noted it in the stopMusic key-function line and sketch intro. Sketch code unchanged.
