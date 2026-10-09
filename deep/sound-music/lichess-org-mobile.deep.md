# lichess-org-mobile (sound-music, cell 15)

Donor: /mnt/frankendom-donors/lichess-org-mobile/lib/src/service/sound_service.dart | Licence: GPL-3.0 per root LICENSE (sound_service.dart has no header) | Dart | symbol SoundService::play

## 1. Mechanism
- SoundService.play(sound, volume) is the single entry for one-shot cues. It reads two settings, sound-enabled and master volume. The volume argument is checked only by an `assert` (176, debug builds). If sound is off, or master times the requested volume is zero, it returns. Otherwise it plays the sound id at master times the requested volume. On Linux that goes to an external command (pw-play, paplay or aplay, found at start-up by checking `/usr/bin`, `/usr/local/bin`, then `which`, 61-81). The volume is clamped to 0..1 and passed as an argument for pw-play (`--volume`) and paplay (times 65536); aplay gets no volume argument (100-113). On other platforms it goes to a sound-effect plugin set to at most two concurrent streams.
- `SoundService.initialize()` (153-172) runs once at start: it reads the saved theme, initialises the plugin or finds the Linux command, then loads every sound for the theme.
- _loadSound(theme, sound): tries the theme's file; if missing, falls back to the standard theme's file. On Linux the file is copied once to a temp folder and its path cached (83-98); the plugin keeps the loaded clip otherwise. A failed initialisation is only logged (169-171).
- changeTheme(theme): releases the old set, re-initialises the plugin (non-Linux only; on Linux it only clears the cached paths), loads the move sound first so it is ready, plays it if asked, then loads the rest.
- playCaptureSound chooses the explosion cue for the atomic variant, else the capture cue.
- Inputs: sound id, volume in 0 to 1, preferences, theme. Output: one playback. Event-driven.

## 2. Key functions
- SoundService.play (lichess) | /mnt/frankendom-donors/lichess-org-mobile/lib/src/service/sound_service.dart | 175-187 | gate on enabled and master times volume; route to Linux command or plugin.
- _loadSound (lichess) | /mnt/frankendom-donors/lichess-org-mobile/lib/src/service/sound_service.dart | 128-145 | theme file first, standard file as fallback.
- SoundService.changeTheme (lichess) | /mnt/frankendom-donors/lichess-org-mobile/lib/src/service/sound_service.dart | 199-211 | release, re-init, load and play the move sound first, then the rest.
- _LinuxSoundPlayer.play (lichess) | /mnt/frankendom-donors/lichess-org-mobile/lib/src/service/sound_service.dart | 100-113 | external command with a volume argument.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Master volume times cue volume, silent when either is off | none (algorithm) |
| Theme file with fallback to a standard file | standard theme name (theirs) |
| Load the most urgent cue first on a theme change | the move cue is the first loaded (theirs) |
| Cap concurrent streams | 2 streams (`_kMaxConcurrentStreams`, line 15) (theirs) |
| Extension depends on platform | aifc on iOS, mp3 elsewhere (line 50) (theirs) |

## 4. TypeScript sketch
simplified: the sketch throws on a bad volume where the donor only asserts (debug builds); the Linux command path, the temp-folder cache, the plugin's two-stream cap (`MAX_STREAMS` is not enforced here), the settings read through the provider and the capture/explosion variant choice are omitted.

```ts
// Licence: GPL-3.0 (lichess-org-mobile). CLEAN-ROOM: written from the mechanism, no donor lines.
type Prefs = { soundEnabled: boolean; masterVolume: number };
type Backend = { playClip(id: string, volume: number): void };
const MAX_STREAMS = 2;   // concurrent stream cap (theirs); enforced by the backend in this sketch

function play(id: string, requested: number, prefs: Prefs, backend: Backend): void {
  if (requested < 0 || requested > 1) throw new RangeError("volume must be 0 to 1");
  const final = prefs.masterVolume * requested;      // master scales every cue
  if (!prefs.soundEnabled || final === 0) return;    // off or silent: nothing to do
  backend.playClip(id, final);                       // the backend applies MAX_STREAMS
}

// Theme file first; missing files fall back to the standard theme.
function resolveTheme(theme: string, ids: string[], exists: (path: string) => boolean): Map<string, string> {
  const out = new Map<string, string>();
  for (const id of ids) {
    const own = `${theme}/${id}`;
    out.set(id, exists(own) ? own : `standard/${id}`);
  }
  return out;
}

// On a theme change: load the move cue first, so the next move is never silent.
function changeOrder(ids: string[]): string[] {
  return ["move", ...ids.filter((id) => id !== "move")];
}
```

## 5. Lands in
- Frankendom target: `src/fight/sound.ts` (one-shot play gate with master volume, and theme fallback).
- Parity row: 12 (combat sound cues).
- Reuse tag: rewrite-from-idea (GPL-3.0)
- Brief rule served: (category default, not per-cell) zone-schema rule; rules 7-9 n/a

## 6. Gaps and risks
- Chess app. Sound ids are chess cues. The gate and the fallback transfer; the ids do not.
- Linux path shells out to an external player. Not usable in a browser; Frankendom's web build cannot follow it.
- Plugin-level stream cap (2). Frankendom needs its own cap, since the donor leaves the limit to the plugin; MAX_ATTACKERS = 3 sets the plausible simultaneous cue count for a duel.
- Master volume and sound-enabled are client settings; they never enter the fight record or the one engine.
