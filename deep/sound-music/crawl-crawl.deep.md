# crawl-crawl (sound-music, cell 15)

Donor: /mnt/frankendom-donors/crawl-crawl/crawl-ref/source/sound.cc | Licence: GPL-2 | C++ | symbol parse_sound / check_sound_patterns

## 1. Mechanism

- Input: one game message string, emitted when the game writes a line to the message log. The donor keeps an ordered list `Options.sound_mappings` of entries `{pattern (regex), soundfile, interrupt_game}`, loaded from the player's option files (the `sound` and `hold_sound` options, `initfile.cc` 758-760; `sound.h` says the patterns are searched as regexes).
- `parse_sound` (sound.cc 31-34) is the entry point. It calls `check_sound_patterns` and then `play_sound`. It is synchronous, on the same call that emits the message. There is no tick.
- `check_sound_patterns` (43-64) walks the list in config order. The first regex that matches the message wins (`break` at line 59). If nothing matches it returns a mapping with an empty `soundfile`. It plays nothing itself, so callers can branch on a hit.
- `play_sound(sound_mapping)` (66-73) does nothing when `soundfile` is empty. Otherwise it joins `Options.sound_file_path` with the file name and calls the low-level player.
- `play_sound(file, interrupt_game)` (77-119) returns at once unless `Options.sounds_on` is set. The backend is chosen at compile time: WinMM, a shell command (`SOUND_PLAY_COMMAND`, run with `system()`, guarded by `shell_safe` and a 255-character cap), or SDL_mixer.
- SDL path (103-117): if `one_SDL_sound_channel` is set and the last channel is still playing, it is halted. The previous chunk is freed (even when it may still be playing on another channel), the WAV is loaded with `Mix_LoadWAV` (a synchronous file read, result never tested for null), and it plays on any free channel (`Mix_PlayChannel(-1, ...)`). The channel id is kept for the next call.
- `interrupt_game` only changes behaviour on the shell-command path (`HOLD_SOUND_PLAY_COMMAND`, 94-98, a macro left commented out in `sound.h`). The SDL and WinMM paths ignore it (`UNUSED`, line 79). The donor's own TODO at line 75 says so.
- Output: an audio side effect only. No game state is read or written. The match is client-side and nothing is sent to a server.

## 2. Key functions

- `parse_sound`, `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/sound.cc`, lines 31-34. Entry point: message to match to play.
- `check_sound_patterns`, same file, lines 43-64. First-match regex scan over the configured mappings; returns the mapping or an empty one.
- `play_sound(sound_mapping)`, same file, lines 66-73. Joins the sound path and forwards to the player.
- `play_sound(const char *file, bool interrupt_game)`, same file, lines 77-119. Backend selection (WinMM, shell command, SDL) and the one-channel rule.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants (theirs) |
|---|---|
| Ordered table of (pattern, sound, flag); first match wins; no match returns an empty result | Pattern set and file names come from the player's option files (theirs) |
| Decide first, play second, so the caller can branch on a hit | Sound root path from `Options.sound_file_path` (theirs) |
| Command-line backend with a length cap and a shell-safety check | 255-character command buffer; `SOUND_PLAY_COMMAND` macro (theirs) |
| Single-channel mode: halt the previous sound before starting a new one | `one_SDL_sound_channel` option (theirs) |
| Global on/off gate before any work | `Options.sounds_on` (theirs) |

## 4. TypeScript sketch

Clean-room sketch: written from the mechanism above, no lines translated.

simplified: the backend choice (WinMM, shell command, SDL), the one-channel rule and chunk freeing are omitted: `play` is a callback; the donor's `check_sound_patterns` returns an empty mapping on no match where the sketch returns null; the donor's `catpath` is replaced by a slash join.

```ts
// Licence: GPL-2 - clean-room sketch, no lines translated
// Clean-room: first-match table from a message string to a sound file, decided first and played second.
type SoundMapping = { pattern: RegExp; soundfile: string; interruptGame: boolean };
type Hit = { soundfile: string; interruptGame: boolean };

// Returns the first mapping whose pattern matches, or null when nothing matches.
function matchSound(message: string, table: readonly SoundMapping[]): Hit | null {
  for (const entry of table) {
    // Regex with the g flag keeps lastIndex; the table must use non-global patterns.
    if (entry.pattern.test(message)) {
      return { soundfile: entry.soundfile, interruptGame: entry.interruptGame };
    }
  }
  return null;
}

type Player = (path: string, interrupt: boolean) => void;

// Called once per message line, synchronously.
function onMessage(
  message: string,
  table: readonly SoundMapping[],
  soundsOn: boolean,
  basePath: string,
  play: Player,
): void {
  if (!soundsOn) return;
  const hit = matchSound(message, table);
  if (hit === null || hit.soundfile === '') return;
  const path = `${basePath.replace(/\/+$/, '')}/${hit.soundfile}`;
  play(path, hit.interruptGame);
}
```

## 5. Lands in

- Frankendom file(s): TARGET `src/fight/sound.ts` (an ordered event-to-cue table, first match wins; keyed on event ids, not message text).
- Parity-checklist row: 12 (combat sound cues), the row the module serves. This donor is a generic text-to-sound table with no combat meaning, so it contributes only the first-match table shape.
- Reuse tag: rewrite-from-idea
- Brief rule served: (category default, not per-cell) zone-schema rule; rules 7-9 n/a

## 6. Gaps and risks

- No rate limit, dedupe or cooldown. A burst of matching messages plays every time. On the shell-command path each play spawns a process with `system()`.
- Synchronous file load on the message path (`Mix_LoadWAV`). A slow disk stalls the caller.
- The shell-command path builds a shell string from a configured path. `shell_safe` is the only guard. Do not copy that pattern for Frankendom; use an in-process audio API.
- `interrupt_game` is ignored outside the shell-command backend (donor TODO). The flag has no effect on most platforms.
- No spatialisation, volume, ducking or priority between sounds.
- Client only. Matching on message text would couple audio to log strings; Frankendom matches on fight event ids from the one engine (`src/fight/`), and server-verified kills still decide which events exist. It does not conflict with the one-engine ruling, because it is not a fight system.
- Licence GPL-2: the sketch is clean-room. No lines are translated.
