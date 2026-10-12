# crawl-crawl (sound-music, cell 15)

Donor: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/sound.cc` (with `sound.h`, `message.cc`, `delay.cc`, `initfile.cc`, `options.h`, and the option guide `crawl-ref/docs/options_guide.txt`) | Licence: GPL v2 or any later version (`LICENSE` line 7: "either version 2 of the License, or"; the file says it may be redistributed under that licence) | C++ | symbol `check_sound_patterns` / `play_sound`

Checked: Read `sound.cc` (121 lines) and `sound.h` (83 lines) in full; `options_guide.txt` 538-575 read; `message.cc` 795-812 read (the print hook); `initfile.cc` 3476-3510 read (the rule parser). Seen by grep only, not read in context: `delay.cc:761` (the memorise-spell call), `initfile.cc:758-760` (option registration), `options.h:98-116` and `620-621`. Confidence high on the code path (lookup, play, one-voice switch). Medium on how much this matters for us: the whole sound system here is about 120 lines plus its hooks, and it has no priority, no per-family voice limit, no music, no layering, no ambience and no biome beds. Not read: the SDL_mixer library (whether freeing a chunk that is still playing stops that channel is the library's behaviour, not in the box). camera_scope: not a camera cell.

## 1. Mechanism

- Sound is a message-to-file lookup. Every message line printed goes through the hook in `message.cc` (807), which calls `check_sound_patterns` on the full text (sound.cc 43-63).
- The lookup walks the player's `sound` rules in option order (51). A rule matches when its regex matches the text (55). The first match is kept (58) and the loop breaks (59). If nothing matches, the result is an empty rule (48-49, no file, no hold). The doc (options_guide.txt 544-545) says the last matching regex plays; the code plays the first. The code is what runs.
- Named events exist for things that have no message text. `sound.h` defines ten: PICKUP, CHANGE_QUIVER, FIRE_PROMPT, WIELD_WEAPON, WIELD_NOTHING, EQUIP_ARMOUR, DEQUIP_ARMOUR, WEAR_JEWELLERY, REMOVE_JEWELLERY, MEMORISE_SPELL (41-53). A caller passes the constant as the "message" (for example `parse_sound(MEMORISE_SPELL_SOUND);` at `delay.cc` 761). There is no hit-sound constant and no spell-cast constant in `sound.h`.
- Playback (`play_sound`, 66-119): a rule with an empty file plays nothing. The file path is the `sound_file_path` prefix plus the rule file (70). Playback happens only when `sounds_on` is set (81). The `interrupt_game` flag is marked `UNUSED` for the whole function (79). Its only use is in the command backend under `HOLD_SOUND_PLAY_COMMAND` (94-96), and that define is commented out in `sound.h` (29), so the hold flag does nothing in a default build.
- Three backends. Command backend: runs a configured command, refuses file names that are not shell-safe (92), and can use a second "hold" command (99, `HOLD_SOUND_PLAY_COMMAND`, see the sound.h warning at line 27 that holding is not fully implemented). SDL backend (the one most builds use): if `one_SDL_sound_channel` is set and a channel is still playing, it halts that channel (106-110); then it frees the previous chunk (113), loads the new file from disk (115), and plays it on any free channel (116). A WINMM backend is also present (not read in detail).
- Rule syntax: `regex:file`, split at the first colon (3488, 3508). `hold_sound` is the same parser with the interrupt flag set (3481). Rules are an ordered list option (`initfile.cc` 758-760).

## 2. Key functions

- `check_sound_patterns`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/sound.cc` 43-64 (the loop, the first match, the empty result).
- `play_sound(sound_mapping)`: sound.cc 66-73 (path prefix, delegation to the file-level play).
- `play_sound(const char*, bool)`: sound.cc 77-119 (sounds_on gate, command and SDL backends, one-voice halt at 106-110).
- Caller on every printed message: `message.cc` 800-808 (the call at 807 is the only lookup on the print path that this note confirms).
- Rule parser: `initfile.cc` 3485-3509 (split at the colon, 3488).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Ordered rule table, first match wins (code) or last (guide) | list order; the two disagree (sound.cc 58 vs options_guide.txt 545) |
| Single-voice option: a new cue cuts the last one | `one_SDL_sound_channel`, default off (options_guide.txt 569-570; options.h 621) |
| Master mute | `sounds_on` (sound.cc 81) |
| Named event key for a non-text event | ten constants (sound.h 41-53); call sites seen by grep: PICKUP (items.cc), WIELD, EQUIP and JEWELLERY (player-equip.cc), CHANGE_QUIVER (quiver.cc), FIRE_PROMPT (throw.cc), MEMORISE_SPELL (delay.cc 761) |

## 4. TypeScript sketch

simplified: the sketch keeps the ordered rule table, the first-or-last choice (made explicit, since the donor's guide and code disagree), the master switch and the single-voice cut. It replaces the donor's regex-over-text match with exact event keys, which is the change this note recommends. It omits the file path prefix, the command and WINMM backends, the hold flag (unused on the SDL path), the chunk freeing and disk loading, and the shell-safety check. It does not model the SDL library's behaviour when a chunk is freed while playing.

```ts
// Licence: GPL-2.0-or-later (donor). Clean-room sketch from the described mechanism, not a translation.
export interface CueRule {
  key: string;      // event key, e.g. "MEMORISE_SPELL" (donor matches regex over message text instead)
  file: string;     // sound file path
  hold: boolean;    // donor: interrupt flag; not used by the SDL playback path
}

export interface CueOptions {
  soundsOn: boolean;   // donor: sounds_on
  pickRule: "first" | "last"; // donor code takes the first match; donor guide says the last
  oneVoice: boolean;   // donor: one_SDL_sound_channel, default false
}

export interface CueDecision {
  play: string | null;     // file to play, or null
  stopPrevious: boolean;   // true when the single voice must cut the sound still playing
}

// Donor order: rules are checked in list order; one rule is taken per event.
export function routeCue(
  rules: CueRule[],
  key: string,
  opts: CueOptions,
  playing: string | null,
): CueDecision {
  if (!opts.soundsOn) return { play: null, stopPrevious: false };
  const hits = rules.filter((r) => r.key === key);
  if (hits.length === 0) return { play: null, stopPrevious: false };
  const rule = opts.pickRule === "first" ? hits[0] : hits[hits.length - 1];
  return { play: rule.file, stopPrevious: opts.oneVoice && playing !== null };
}

// Fix: the guide and the code disagree on first vs last; the sketch makes it an explicit option with a test.
export const exampleRules: CueRule[] = [
  { key: "MEMORISE_SPELL", file: "sounds/memorise.wav", hold: false },
  { key: "MEMORISE_SPELL", file: "sounds/memorise_alt.wav", hold: false },
];
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, with `export {}` appended, exit 0.

## 5. Lands in

- TARGET `origins/client/cue-router.ts` (new, client-only: sound is client-only). It routes typed engine events to cue files; it does not read chat or combat-log text. Parity-checklist row 12 (combat sound cues).
- Best transferable idea: Route each typed combat or UI event key through one ordered cue table with an explicit first-or-last rule and an optional single voice, instead of matching text.
- Decision (proposed): adapt. Keep the ordered table, the explicit first-or-last choice (pick one and test it), the master switch and the single-voice cut. Reject the regex-over-text trigger (chat or log text is not the ledger and is fragile), and reject the hold flag unless it is built end to end.
- Acceptance: a client test sends a typed memorise-spell event through a table with two rules for one key and asserts the chosen rule under each setting, and that the single-voice option cuts the previous cue.
- Reuse tag: rewrite-from-idea (GPL v2 or later: clean-room only; the sketch is written from the mechanism).
- Brief rule served: sound is client-only; the addendum's sound-music fold-in (priority and voice limits: here only the one-voice switch); keep the idea and fix the defect.

## 6. Gaps and risks

- GPL: clean-room only. The sketch is written from the mechanism.
- Thin: this donor does not give hit sounds, spell-cast sounds, priority, families, layering, music or ambience. Do not cite it for those.
- Defects to fix (keep the idea):
  1. The guide says the last matching regex plays (options_guide.txt 545); the code takes the first (sound.cc 58-59). fix: an explicit option with a test that fails on the other reading.
  2. The hold flag is parsed (initfile.cc 3481) and the SDL path ignores it (sound.cc 79); the hold branch exists only under a commented-out define (sound.cc 94-96, sound.h 29), and the header warns it is not fully implemented (sound.h 27). fix: drop it, or build it end to end with a test.
  3. The SDL path loads the file from disk on every play (sound.cc 115) and frees the previous chunk each time (113). fix: load the cue set once at start (an idea from our side; the donor does not preload).
  4. The lookup runs on each printed message line (message.cc 807), so a message that is merged or repeated can match twice. Not verified in the code paths read. fix: route only typed events, one call per event.
- Rulings: sound is client-only, so the router must never decide a hit, a kill or a spell result; it only plays a cue for an event the server already confirmed (one ledger). The single-voice switch is the only voice limit here, and a 3-attacker fight (MAX_ATTACKERS = 3) would need per-family limits that this donor does not show.
- The JSON sidecar has the data fields.
