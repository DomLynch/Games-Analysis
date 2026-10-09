# flutter-team-archive-pinball (sound-music, cell 15)

Donor: /mnt/frankendom-donors/flutter-team-archive-pinball/packages/pinball_audio/lib/src/pinball_audio.dart | Licence: MIT | Dart | symbol PinballAudioPlayer

## 1. Mechanism
- PinballAudioPlayer keeps a table from each sound id to one strategy object, built in the constructor. Each strategy knows its asset path, its volume and how to play. There are five kinds (plus a play-once loop subclass): simple (play now, optional volume), throttled (play at most once per gap, default volume), random A or B (pick one of two clips, each in a pool of 4 players), single-audio pool (overlapping instances up to a maximum), and looped (background music; the `_SingleLoopAudio` subclass starts it only once, 139-147).
- load() (367-371) sets the audio cache prefix to empty and returns a list of each strategy's load function; it does not run them, the caller must.
- play(id) looks up the strategy and calls its play. An unregistered id is an assertion in debug and ignored in release.
- Throttled play (216-243): records the time of the last play from `clock.now()` (the `clock` package, injectable). A new play is accepted when there was none, or when the time since the last accepted play is strictly more than the gap. A rejected call does not move the window, so the gap counts from the last sound that actually played.
- Random A or B (174-214): a coin flip (`nextBool`) from an injected `Random`, which defaults to an unseeded `Random()` (line 266); each clip is in a 4-player pool (199, 204), so plays can overlap.
- Inputs: sound id, clock, random seed. Output: sound playback calls. Event-driven; no per-tick update.

## 2. Key functions
- PinballAudioPlayer (pinball) | /mnt/frankendom-donors/flutter-team-archive-pinball/packages/pinball_audio/lib/src/pinball_audio.dart | 248-381 | the table of strategies, the load and the play dispatch.
- _ThrottledAudio.play (pinball) | /mnt/frankendom-donors/flutter-team-archive-pinball/packages/pinball_audio/lib/src/pinball_audio.dart | 235-242 | time gate: play only after the gap since the last accepted play.
- _RandomABAudio.play (pinball) | /mnt/frankendom-donors/flutter-team-archive-pinball/packages/pinball_audio/lib/src/pinball_audio.dart | 211-213 | random pick of one of two clips.
- PinballAudioPlayer.play (pinball) | /mnt/frankendom-donors/flutter-team-archive-pinball/packages/pinball_audio/lib/src/pinball_audio.dart | 374-380 | look up by id and call its play.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Per-cue time gate that only counts accepted plays | 6 s gap for the dino cue (line 282); 2 s gap for the cow cue (338) (theirs) |
| Random pick between two variants, pooled | volume 0.6 for the bumper and kicker variants (325, 332) (theirs) |
| Pool with a maximum of overlapping instances | maximum 2 players for the flipper (308); volume 0.3 for the rollover (303) (theirs) |
| Loop for background music | volume 0.6 (line 344) (theirs) |
| Table from id to strategy, unknown ids ignored | none (algorithm) |

## 4. TypeScript sketch
simplified: no audio pools (so no overlap and no max-player cap), no volume on the throttled cue (the donor plays it at the default volume), no play-once loop flag, no preload/load list, and the `assert` on an unregistered id is replaced by a silent ignore (release behaviour).

```ts
// Licence: MIT (flutter-team-archive-pinball). Sketch written from the mechanism; donor path cited above.
type Clip = { path: string; volume: number };
type Fire = (path: string, volume: number) => void;
interface Strategy { play(): void }

// Plays at most once per gap; the gap counts from the last accepted play.
class Throttled implements Strategy {
  private last: number | null = null;
  constructor(private clip: Clip, private gapMs: number, private now: () => number, private fire: Fire) {}
  play(): void {
    const t = this.now();
    if (this.last === null || t - this.last > this.gapMs) {
      this.last = t;
      this.fire(this.clip.path, this.clip.volume);
    }
  }
}

// Picks one of two variants with a seeded random source.
class RandomAB implements Strategy {
  constructor(private a: Clip, private b: Clip, private rnd: () => number, private fire: Fire) {}
  play(): void {
    const c = this.rnd() < 0.5 ? this.a : this.b;
    this.fire(c.path, c.volume);
  }
}

class CueTable {
  private table = new Map<string, Strategy>();
  register(id: string, s: Strategy): void { this.table.set(id, s); }
  play(id: string): void { this.table.get(id)?.play(); }   // unknown ids are ignored
}
```

## 5. Lands in
- Frankendom target: `src/fight/sound.ts` (cue-by-id table with per-cue throttle and overlap cap).
- Parity row: 12 (combat sound cues).
- Reuse tag: adapt (MIT)
- Brief rule served: (category default, not per-cell) zone-schema rule; rules 7-9 n/a

## 6. Gaps and risks
- Pinball-specific ids and assets. The table shape transfers; the ids do not.
- The throttle reads a wall clock through an injectable `clock.now()`. Frankendom feeds the fight tick clock so cue timing follows the one engine.
- The random source is injectable but defaults to an unseeded `Random()`. In Frankendom cue variants use a cosmetic RNG kept out of the fight record (row 19), so a replay need not match audio picks.
- Preload (load) is not in the sketch; Frankendom must preload before a fight starts, not at the first hit.
- Cue ids and gaps would be data (zones as data) with defaults; the audio layer only consumes events from the server-verified fight state.
