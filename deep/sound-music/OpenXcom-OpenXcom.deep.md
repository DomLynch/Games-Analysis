# OpenXcom-OpenXcom (sound-music, cell 15)

Donor: /mnt/frankendom-donors/OpenXcom-OpenXcom/src/Engine/Music.cpp | Licence: GPL-3 | C++ | symbol Music::play / stop

## 1. Mechanism
- A thin wrapper over the SDL mixer's music channel. A Music object holds one loaded track, from a file (52-62) or from memory (69-80); both throw an exception if SDL cannot load it.
- play(loop) (86-101): if the game is not muted and a track is loaded, it stops the object's current playback first, then starts the loaded track with the loop count (-1 means forever). A failed start is logged as a warning.
- stop() (106-116): if not muted, it calls `func_mute()` (the Adlib synth's instant stop: `adlplayer.cpp` 529-534 zeroes polyphony, clears the playing flag and resets the Adlib channels), clears the mixer's music hook and halts the music.
- pause and resume: pause halts the mixer's music. If the current music type is "none", which means the synthesised Adlib player is driving it, the hook is cleared; resume restores the hook when needed.
- isPlaying() (151-160): reports `Mix_Playing(-1) != 0` (any mixer channel, not only music), and false when muted.
- Inputs: a track (file or bytes), a loop count, the mute option. Output: music starts or stops. No per-tick logic; the caller decides when.

## 2. Key functions
- Music::play (OpenXcom) | /mnt/frankendom-donors/OpenXcom-OpenXcom/src/Engine/Music.cpp | 86-101 | stop then start with a loop count, mute gated.
- Music::stop (OpenXcom) | /mnt/frankendom-donors/OpenXcom-OpenXcom/src/Engine/Music.cpp | 106-116 | mute helper, clear hook, halt.
- Music::pause and Music::resume (OpenXcom) | /mnt/frankendom-donors/OpenXcom-OpenXcom/src/Engine/Music.cpp | 121-131 and 136-146 (adlib hook set to `AdlibMusic::player` on resume, line 143) | pause halts; resume restarts, with the adlib hook handled when the music type is none.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Stop the current track before starting a new one | none (algorithm) |
| Loop count with -1 meaning forever | loop convention (library) |
| Global mute gate on every call | Options::mute (theirs) |

## 4. TypeScript sketch
simplified: no pause or resume (focus-loss handling and the Adlib hook), no file-or-memory loading, the track pointer is a name and `stop` has no Adlib reset; the donor's `play` also requires a loaded track (`_music != 0`) and logs a warning if the start fails.

```ts
// Licence: GPL-3 (OpenXcom-OpenXcom). CLEAN-ROOM: written from the mechanism, no donor lines.
type Backend = { start(track: string, loops: number): void; halt(): void; playing(): boolean };

class Music {
  private track: string | null = null;
  constructor(private backend: Backend, private muted: () => boolean) {}

  play(track: string, loops = -1): void {               // -1 = repeat forever
    if (this.muted()) return;
    this.stop();                                          // always stop the current track first
    this.track = track;
    this.backend.start(track, loops);
  }

  stop(): void {
    if (this.muted()) return;
    this.backend.halt();
    this.track = null;
  }

  isPlaying(): boolean {
    return !this.muted() && this.backend.playing();
  }
}
```

## 5. Lands in
- Frankendom target: `src/fight/sound.ts` (stop-before-start music wrapper with a mute gate, next to the cue layer).
- Parity row: 12 (combat sound cues), the nearest row; music has none.
- Reuse tag: rewrite-from-idea (GPL-3)
- Brief rule served: (category default, not per-cell) zone-schema rule; rules 7-9 n/a

## 6. Gaps and risks
- `func_mute` only resets the Adlib synth (`adlplayer.cpp` 529-534); it is irrelevant to Frankendom.
- `Music.cpp` has no crossfade or fade-out (the Adlib player has its own volume fade, `adlplayer.cpp` 537-, not read in full). Frankendom music transitions need their own design.
- Adlib synth fallback is not relevant to Frankendom.
- Pause on focus loss is present in the donor; Frankendom needs the same rule if the page loses focus.
- Client-only audio; it must not feed the one fight engine, and mute is a setting, not zone data.
