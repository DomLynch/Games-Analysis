# freeorion-freeorion (sound-music, cell 2)

Donor: `/mnt/frankendom-donors/freeorion-freeorion/UI/Sound.cpp` (with `UI/Sound.h`, `UI/ClientUI.cpp`, `client/human/GGHumanClientApp.cpp`, `UI/MapWnd.cpp`, `UI/FleetWnd.cpp`) | Licence: GPL-2.0-or-later as read from the sibling header `UI/Hotkeys.h` ("either version 2 of the License, or (at your option) any later version"); the repo `README.md` 148-150 says source code is GPL v2 and assets are CC-BY-SA-3.0 (see `default/COPYING`); `UI/Sound.cpp` itself has no licence header | C++ (OpenAL + libvorbis) | symbol `Sound::Impl::PlaySound`

Checked: Read in full: `UI/Sound.h` (all), `Sound::Impl` class (Sound.cpp 20-101), the disabler (196-201), `GetSoundBuffer` (407-481), `PlayMusic` (482-552), `StopMusic` (567-580), `PlaySound` (581-619), `DoFrame` (691-719), `UISoundsTemporarilyDisabled` and the depth helpers (720-727). Not read: `RefillBuffer` body (Sound.cpp 102-195), `Enable`, `InitOpenAL`, `ShutdownOpenAL`, the volume setters (217-406 and 621-690). Callers read: `client/human/GGHumanClientApp.cpp` 375-379, `UI/ClientUI.cpp` 483-502 (option table), `UI/MapWnd.cpp` 3029, `UI/FleetWnd.cpp` 198; `UI/OptionsWnd.cpp` 396-427 seen by grep only. Searched for layering, stingers as a separate path, ambience or biome beds, crossfade and priority in `UI/Sound.*` and its callers: none (grep). The donor ships 20 combat `.ogg` files in `default/data/sound/combat/`, but no code in this copy references them (grep, confidence high). Torn between PARTIAL and STRONG: writing STRONG because the cue guard and the capped voice pool are real, read end to end, and small; depth is thin because most of the topic (layers, stingers, ambience, crossfade, priority) is absent. Confidence: medium. The sketch typechecked on the VPS: `npx -p typescript tsc --noEmit --strict --target es2020 /tmp/SM014-freeorion-sketch.ts` exit 0.

Best transferable idea: Mute feedback cues for the length of a programmatic UI change with a depth counter, and give a capped voice pool a priority steal so a hit cue can take the slot of a lower-priority ambience cue.
Decision (proposed): adapt - take the scope-guard mute and the capped pool; the donor drops any cue when all voices are busy (defect), so the sketch adds a priority steal.
Acceptance: When a fight starts and the HUD rebuilds its lock-on and list rows, no click plays (a client test asserts a UI cue is skipped inside the rebuild scope while a world cue still plays), and with the voice pool full a hit cue plays while the lowest-priority ambience cue is the one dropped (a test asserts both).

## 1. Mechanism

- Two cue classes. UI feedback cues are played with `is_ui_sound = true` (for example button press, list select, window close). World cues are played without it. `PlaySound` (Sound.cpp 581-619) returns early when the sound is off, or when the cue is a UI cue and the mute depth is above zero (582).
- The mute is a scope guard. `TempUISoundDisabler`'s constructor increments the depth (197) and its destructor decrements it (200). `UISoundsTemporarilyDisabled` is `m_temporary_disable_count > 0` (721). Callers open the scope before changing controls in code, e.g. `UI/FleetWnd.cpp` 198. The header comment (`UI/Sound.h`) says the scope exists so that a list-select sound does not play when a window is built with an item preselected.
- Voices: 16 OpenAL sources (`NUM_SOURCES = 16`, Sound.cpp 82). Source 0 carries music. `PlaySound` scans sources 1 to 15 in order (598) and takes the first one whose state is neither playing nor paused (600), binds the cached buffer and plays it (603). If none is free it logs `Could not find avialble source` and drops the cue (609). There is no priority and no stealing.
- Buffer cache: a sound is decoded in full on first use, stored in a map keyed on the file path (`GetSoundBuffer`, 407-481), and kept until `FreeSound` or `FreeAllSounds`. A file over `MAX_BUFFER_SIZE` is refused (8 * 1024 * 1024 bytes, Sound.cpp 104).
- Music: one file. At startup `GGHumanClientApp.cpp` 375-379 plays `audio.music.path` with `loops = -1` (forever). `PlayMusic` (482-552) stops any current music (StopMusic when a name is set), opens the ogg, sets `m_music_loops = loops` (519), and fills two streaming buffers (`NUM_MUSIC_BUFFERS = 2`, Sound.cpp 83; `MUSIC_BUFFER_SIZE = 409600`, line 103). `DoFrame` (691-719) reads the number of processed buffers on source 0 (700), unqueues each one, refills it from the file (704) and queues it again, and restarts the source if it has stopped (716). `StopMusic` (567-580) halts source 0 at once: there is no fade.
- Cue table: 16 UI sound paths and the music path are options with defaults under `default/data/sound/` (ClientUI.cpp 483-502; the list includes 486 button rollover, 496 alert, 502 turn start). Option keys ending in `sound.path` form their own options section, found by suffix (`client/human/chmain.cpp` 170-177, receipt 174). A separate bool, `ui.turn.start.sound.enabled` (501), gates the turn-start cue (`MapWnd.cpp` 3028-3029: `if (GetOptionsDB().Get<bool>("ui.turn.start.sound.enabled"))` then `PlaySound(..., true)`).
- Layering: none in the C++ UI sound code (music is one stream). Stingers: none as a separate path there; the turn-start and alert cues are plain one-shot UI sounds. Ambience beds per biome, border crossfades: none found in `UI/Sound.*` or its callers. The `godot/` and `godot4/` clients (AudioStreamPlayer nodes in `godot/FreeOrionClient.tscn`, `godot/GalaxyMap.tscn`) were not searched, so absence there is not claimed.
- Not every UI cue is guarded: `is_ui_sound` defaults to false (Sound.h 42), and `UI/SystemIcon.cpp` 29 plays the system-icon rollover without the flag, so the mute scope does not silence it. `ui.turn.start.sound.enabled` defaults to false (ClientUI.cpp 501). `PlaySound` also returns silently if the buffer cannot be loaded, and the mute depth is a `std::atomic` counter (Sound.cpp 95).

## 2. Key functions

- `Sound::Impl::PlaySound`: `/mnt/frankendom-donors/freeorion-freeorion/UI/Sound.cpp` 581-619 (mute check, first free source, drop on full).
- `Sound::TempUISoundDisabler` ctor and dtor: `/mnt/frankendom-donors/freeorion-freeorion/UI/Sound.cpp` 196-201.
- `Sound::Impl::UISoundsTemporarilyDisabled`: `/mnt/frankendom-donors/freeorion-freeorion/UI/Sound.cpp` 720-721.
- `Sound::Impl::PlayMusic`: `/mnt/frankendom-donors/freeorion-freeorion/UI/Sound.cpp` 482-552 (stream start, loop count).
- `Sound::Impl::DoFrame`: `/mnt/frankendom-donors/freeorion-freeorion/UI/Sound.cpp` 691-719 (per-frame buffer pump).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Depth counter scope guard that mutes feedback cues only | Depth 0 means unmuted (theirs, Sound.cpp 721) |
| Capped voice pool, first free voice | 16 sources, one for music so 15 for cues (theirs, Sound.cpp 82, 598) |
| Drop when full | Log and return (theirs, Sound.cpp 609); no priority |
| Two-buffer stream pump | 2 buffers (theirs, Sound.cpp 83); 409600 bytes each (theirs, Sound.cpp 103) |
| One-file loop | loops = -1 means forever (theirs, GGHumanClientApp.cpp 379) |

Defects (keep the idea, fix the defect):
1. Drop on full with no priority: when all 15 cue voices are busy, a turn-start or alert cue is dropped silently and a low-value cue can hold a voice that a hit needs. fix: `playCue` in the sketch steals the lowest-priority voice for a strictly higher-priority cue.
2. Hard music switch: `StopMusic` halts source 0 at once (Sound.cpp 567-580), so a track change is a cut. fix: not in this donor's idea; take the crossfade shape from the freeciv note (both gains in one window), not from this file.

## 4. TypeScript sketch

simplified: The sketch models the cue guard (a depth counter with a release function that works like the donor's RAII scope), the UI-versus-world split, and a capped voice pool with a priority steal (the steal is added, the donor drops the cue). It omits the streaming music pump and its two buffers, the decode cache and its size limit, the OpenAL source-state polling, the volume and pause calls, the options section, and the singleton. Callers must pass `cap` = 15 to keep one voice for music, as the donor does.

```ts
// Licence: GPL-2.0-or-later as read from a sibling header (UI/Hotkeys.h); UI/Sound.cpp has no licence header. Clean-room sketch from the described mechanism, not a translation.
// clean-room

// Cue guard: a depth counter. Code that changes controls programmatically mutes feedback (UI) cues for the
// length of the scope. World cues are not affected.
class CueGuard {
  private depth = 0;

  muted(): boolean {
    return this.depth > 0;
  }

  // Start a scope. The returned function ends it; call it exactly once (use try/finally).
  mute(): () => void {
    this.depth += 1;
    let released = false;
    return () => {
      if (!released) {
        released = true;
        this.depth -= 1;
      }
    };
  }
}

type CueKind = "ui" | "world";

interface Voice {
  cue: string;
  priority: number;
  endMs: number;
}

// Voice pool with a cap (the donor uses 15 effect voices and keeps one source for music).
// Donor behaviour: first free voice, otherwise the cue is dropped (no priority).
// Fix in this sketch: a full pool gives up its lowest-priority voice only to a strictly higher-priority cue.
function playCue(
  guard: CueGuard,
  pool: Voice[],
  cap: number,
  cue: string,
  kind: CueKind,
  priority: number,
  durationMs: number,
  nowMs: number,
): boolean {
  if (kind === "ui" && guard.muted()) return false;
  const live = pool.filter((v) => v.endMs > nowMs);
  pool.splice(0, pool.length, ...live);
  if (live.length < cap) {
    pool.push({ cue, priority, endMs: nowMs + durationMs });
    return true;
  }
  let lowest = live[0];
  for (const v of live) {
    if (v.priority < lowest.priority) lowest = v;
  }
  if (priority <= lowest.priority) return false;
  lowest.cue = cue;
  lowest.priority = priority;
  lowest.endMs = nowMs + durationMs;
  return true;
}

// Example use: a list rebuilt in code must not click every row.
function rebuildWithoutCues(guard: CueGuard, rebuild: () => void): void {
  const release = guard.mute();
  try {
    rebuild();
  } finally {
    release();
  }
}

export {}
```

## 5. Lands in

- TARGET `src/fight/cue-pool.ts` (new client module: the cue guard and the capped voice pool; the fight state from the engine picks the cue, the pool only plays it). Parity-checklist row 12 (combat sound cues). Client-only: the engine never reads it.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one engine, sound is client-only); row 12 (combat sound cues)

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism; no lines were translated.
- The donor's C++ sound topic is mostly absent (the godot clients were not searched): no layered music, no stingers as a separate path, no ambience beds per biome, no crossfade. Those parts of the topic have no code to copy here.
- Priority is the piece Frankendom needs most (a hit or a spell cue must beat an ambience or HUD cue) and the donor has none. The steal in the sketch is new design, not donor code.
- The mute scope mutes every UI cue app-wide while open. For Frankendom, a fight-start HUD rebuild must not swallow a world hit cue; the sketch's `kind` split keeps world cues audible, but this has to be tested with the real HUD.
- The 15-voice cap is an OpenAL device detail; Frankendom's web audio budget is different and should be a data field, not copied.
- The combat sound files in `default/data/sound/combat/` have no code that uses them in this copy, so they tell us nothing about how hit or spell sounds are picked.
- `RefillBuffer` (Sound.cpp 102-195) was not read, so the looping behaviour of the stream at end of file is not described here.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: 1 (one engine; sound is client-only); row 12 (combat sound cues)


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: Mechanism claims hold: NUM_SOURCES 16 (Sound.cpp:82), NUM_MUSIC_BUFFERS 2 (:83), MUSIC_BUFFER_SIZE 409600 (:103), TempUISoundDisabler ctor/dtor 196-201, PlaySound mute guard and first free source 1..15, drop with 'avialble' log, no priority, DoFrame pump 691-719, StopMusic halts at once (no fade), ClientUI.cpp option lines 486/496/501/502, 16 UI sound paths, 20 combat ogg files, GGHumanClientApp 375-379 loops -1, MapWnd 3028-3029, FleetWnd 198. Errors: (1) note says MAX_BUFFER_SIZE 'value is not read' - it is Sound.cpp:104, 8*1024*1024. (2) Licence: note derives GPL-2.0-or-later from Hotkeys.h only; the repo README.md:148-150 states 'source code licensed under GPL v2' with default/COPYING (assets CC-BY-SA-3.0) - README not cited. (3) 'none in this donor' for layering/stingers/ambience/crossfade is only searched in UI/Sound.* and callers; godot/ and godot4/ clients (AudioStreamPlayer nodes in godot/FreeOrionClient.tscn, GalaxyMap.tscn; combat oggs have .import files) were not searched, so the absence claim is wider than the evidence. (4) is_ui_sound defaults to false (Sound.h:42) and SystemIcon.cpp:29 plays a UI rollover without the flag, so some UI cues are not muted by the guard; also ui.turn.start.sound.enabled defaults false (ClientUI.cpp:501).
Missed: RefillBuffer's loop handling is unread (admitted). Also unnoted: PlaySound ignores the cue when the whole path is not cached (GetSoundBuffer fails), and the guard counter is std::atomic (thread-safe) at Sound.cpp:~90.

Fixed 2026-10-12 (Sonnet fixer): MAX_BUFFER_SIZE value (8 MiB, Sound.cpp 104) now stated; README licence cited; absence claims narrowed to the C++ UI sound code (godot/godot4 not searched); noted is_ui_sound defaults false and SystemIcon.cpp 29 bypasses the guard, turn-start sound defaults off, silent return on failed buffer load, atomic counter. All verified over ssh.
