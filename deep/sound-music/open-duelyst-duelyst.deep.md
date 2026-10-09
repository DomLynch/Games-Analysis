# open-duelyst-duelyst (sound-music, cell 15)

Donor: /mnt/frankendom-donors/open-duelyst-duelyst/app/audio/SoundEffectSequence.js | Licence: CC0-1.0 | JavaScript | symbol SoundEffectSequence.play / playNext

## 1. Mechanism
- A SoundEffectSequence is an ordered playlist of sound effects. addSoundEffect(id, looping, duration) appends an entry unless the same id is already in the list (one entry per id). Entries can be added while the sequence plays.
- play(onComplete) stops any running playback, stores the completion callback, and starts at index 0 through playNext.
- playNext(): if the index is past the last entry, it runs the callback and then stops (callback first, then `stop()`, which clears the stored callback and resets the index: a callback that calls `play()` again would be wiped by that later `stop()`). Otherwise it plays the entry at the index, with a completion that calls playNext again. The index advances unless the entry is the last one and it loops, so a looping last entry repeats.
- SoundEffectData.play(onComplete): stops its previous instance, starts the effect through the audio engine, and if there is a callback, schedules it after the entry's duration (the forced duration, else the clip's own duration read from the audio object, else 0, lines 118-127) on the cocos action manager. The chain therefore advances on a timer, not on the audio's end event.
- stop(): stops the current entry and its pending callback, and resets the index to 0.
- Inputs: ids, loop flags, durations, the completion callback. Output: effect playback and a final callback. Runs on timers, not per frame.

## 2. Key functions
- SoundEffectSequence.addSoundEffect (Duelyst) | /mnt/frankendom-donors/open-duelyst-duelyst/app/audio/SoundEffectSequence.js | 25-34 | appends one entry per id.
- SoundEffectSequence.play and playNext (Duelyst) | /mnt/frankendom-donors/open-duelyst-duelyst/app/audio/SoundEffectSequence.js | 47-76 | start, advance, loop the last entry, callback at the end.
- SoundEffectSequence.stop (Duelyst) | /mnt/frankendom-donors/open-duelyst-duelyst/app/audio/SoundEffectSequence.js | 80-87 | stop current, reset index.
- SoundEffectData.play (Duelyst) | /mnt/frankendom-donors/open-duelyst-duelyst/app/audio/SoundEffectSequence.js | 128-146 | start the effect and a timed completion.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Playlist with one entry per id | none (algorithm) |
| Loop only the last entry | rule (theirs) |
| Advance on a timer equal to the clip length or a forced length | forced duration per entry (theirs, in data) |
| Stop cancels the pending advance | none (algorithm) |

## 4. TypeScript sketch
simplified: `seconds` is always supplied (the donor falls back to the clip's own length, or 0 if unknown); the sketch's `stop` cancels only the timer, not the playing clip (the donor's data `stop` also halts the audio); the sketch advances the index before playing (the donor plays first, then advances; same result unless play re-enters synchronously); entries are one list with an id check, where the donor keeps an id-to-data map plus the list and wraps each entry in a data object that owns its play and stop; a null playlist entry (donor: chain silently ends) is not modelled; `addSoundEffects` (39-43) is omitted.

```ts
// Licence: CC0-1.0 (open-duelyst-duelyst). Sketch written from the mechanism; donor path cited above.
type Step = { id: string; loop: boolean; seconds: number };   // seconds 0 means use the clip length (not in sketch)
class Sequence {
  private steps: Step[] = [];
  private index = 0;
  private done: (() => void) | null = null;
  private cancel: (() => void) | null = null;

  constructor(private play: (id: string) => void,
              private after: (ms: number, fn: () => void) => () => void) {}

  add(id: string, loop = false, seconds = 0): void {
    if (this.steps.some((s) => s.id === id)) return;     // one entry per id
    this.steps.push({ id, loop, seconds });
  }

  start(onDone?: () => void): void { this.stop(); this.done = onDone ?? null; this.next(); }

  private next(): void {
    if (this.index >= this.steps.length) {
      const f = this.done;
      f?.();               // donor: callback first, then stop (stop clears the callback and index)
      this.stop();
      return;
    }
    const step = this.steps[this.index];
    if (this.index < this.steps.length - 1 || !step.loop) this.index++;   // loop only the last entry
    this.play(step.id);
    this.cancel = this.after(step.seconds * 1000, () => this.next());
  }

  stop(): void { this.cancel?.(); this.cancel = null; this.index = 0; this.done = null; }
}
```

## 5. Lands in
- Frankendom target: `src/fight/sound.ts` (timed cue chain for a finisher or stinger sequence).
- Parity row: 12 (combat sound cues); row 9 (finishers) for the finisher timing it would follow.
- Reuse tag: adapt (CC0-1.0; can be lifted with no attribution duty, but the sketch is re-typed)
- Brief rule served: (category default, not per-cell) zone-schema rule; rules 7-9 n/a

## 6. Gaps and risks
- The chain advances on a timer, so a slow or muted clip still moves the chain on time. That may be right for a sting; check against the audio end for a dialogue line.
- Timers must be driven by game time and cancelled on pause, not by wall clock.
- The donor stop also halts the playing clip. The sketch cancels only the timer; the caller must stop the clip too.
- Card-game sequencing. Frankendom's finisher timing belongs to the one fight engine (row 9), so this is a client-side helper that follows engine events and never sets their timing.
