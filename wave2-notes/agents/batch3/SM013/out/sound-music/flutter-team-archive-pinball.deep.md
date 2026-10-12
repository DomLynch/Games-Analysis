# flutter-team-archive-pinball (sound-music, cell 15)

Donor: `/mnt/frankendom-donors/flutter-team-archive-pinball/packages/pinball_audio/lib/src/pinball_audio.dart` | Licence: MIT (`/mnt/frankendom-donors/flutter-team-archive-pinball/LICENSE`: "MIT License", Copyright (c) 2021 Very Good Ventures) | Dart | symbol `PinballAudioPlayer`, `_ThrottledAudio.play`, `_RandomABAudio.play`, `_SingleAudioPool`, `_SingleLoopAudio.play`

Checked: read in full: packages/pinball_audio/lib/src/pinball_audio.dart, all 381 lines (enum, five play policies, registry built in the constructor, load and play). Not read: the playback engine (`flame_audio` FlameAudio.play/loop and the `audioplayers` AudioPool, which set how a pool behaves when all its players are busy); lib/gen/assets.gen.dart (asset path names only); the games that call `PinballAudioPlayer.play`. Confidence: high for the per-sound policy and its numbers (read in full); medium for voice caps, because the cap is set here but enforced by the package I did not read. Files opened for the topic: pinball_audio.dart (the hint file, the right one), pinball_components and pinball_flame were not opened; the audio calls there were not searched. Depth: full for this policy layer, thin for everything about layering, beds and priority, which this donor does not have. Camera scope: not applicable (sound cell).

## 1. Mechanism

One registry maps each sound (an enum with 14 values) to one of five play policies. The registry is built in the constructor (pinball_audio.dart:267-346). `load()` preloads every sound through the cache and `play()` looks the sound up and calls its policy (364-380).

The five policies:
- Simple (`_SimplePlayAudio`, 82-102): each play is a fire-and-forget call to `playSingleAudio` with the volume (100). No cap, no state. Used for google, sparky, dash, android, launcher, rollover (volume 0.3), the voice-over lines and the game-over line.
- Loop once (`_SingleLoopAudio`, 126-148): plays the background track once through `loopSingleAudio`. A `_playing` flag stops a second start (142-146). The flag is never cleared in this file, so once the track is started it cannot be restarted from this class (not verified beyond the code shown).
- Pool (`_SingleAudioPool`, 150-172): an `AudioPool` created at load with a fixed `maxPlayers` (flipper: 2, 305-309). Play calls `pool.start()`. The cap is set here; the behaviour when all players are busy is in the package (not read).
- Random A/B (`_RandomABAudio`, 174-214): two clips, each in its own `AudioPool` with `maxPlayers: 4` (199, 204). Play picks A or B with a seeded `Random.nextBool()` (212). Used for the bumper and the kicker, volume 0.6 (320-333).
- Throttled (`_ThrottledAudio`, 216-243): plays only if no play happened yet or more than `duration` has passed since the last play (236-241, the test is strictly greater). Time comes from `clock.now()` (236), so tests can fake the clock. Dino: 6 s (278-283). Cow moo: 2 s (334-339).

Volumes per entry: the default is 1 (`volume ?? 1`, 100). Rollover 0.3 (303). Bumper and kicker 0.6 (325, 332). Background music 0.6 (344).

Background music: `_SingleLoopAudio` at volume 0.6, path `Assets.music.background` (340-345).

Load and play: `load()` returns one future per sound (370), so the game can preload the whole table. In the constructor the audio cache prefix is cleared (264). `play()` asserts that the sound is registered in debug builds (375-378) and then does nothing for an unknown sound (379, `?.`).

## 2. Key functions

- `PinballAudioPlayer` (constructor, the registry): `/mnt/frankendom-donors/flutter-team-archive-pinball/packages/pinball_audio/lib/src/pinball_audio.dart` 248-347.
- `_ThrottledAudio.play`: same file, 235-242.
- `_RandomABAudio.play`: same file, 211-213.
- `_SingleAudioPool`: same file, 150-172.
- `_SingleLoopAudio.play`: same file, 141-147.
- `PinballAudioPlayer.play`: same file, 374-380.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant (theirs) |
|---|---|
| Cooldown per sound, strictly greater than the gap | dino 6 s (282); cow moo 2 s (338); test at 238 |
| Voice cap per sound | flipper pool 2 (308); A/B pools 4 each (199, 204) |
| Random variant pick | seeded coin flip between two clips (212) |
| Per-sound loudness | 1 default; rollover 0.3 (303); bumper and kicker 0.6 (325, 332); background 0.6 (344) |
| Play-once guard for a loop | `_playing` flag (143, 145) |
| Preload table | one load per sound (370) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's five policies and their order of checks: cooldown test first for throttled sounds, the play-once flag for loops, the cap before a start for pools, the random variant before a start for A/B. It omits the audio engine, the asset paths, the preload table, the volume scaling and the debug assert. Fixes against the donor: the cap is an explicit drop-new check in the sketch, not a package behaviour; the sketch releases voices explicitly so a cap can recover (the donor's release path is inside the package and was not read). The self-check tests a dino cooldown at 5 s and 6.001 s, a flipper cap of two, a loop played once and a bumper using both variants.

```ts
// Licence: MIT (donor). Adaptation of the cue policy shape is permitted; this sketch is still written from the described mechanism, not a line-by-line port.
export {};

// One policy per cue. Each kind mirrors one donor class (pinball_audio.dart).
type Policy =
  | { kind: "simple"; volume: number }                              // _SimplePlayAudio
  | { kind: "loopOnce"; volume: number }                            // _SingleLoopAudio: play once, guard
  | { kind: "pool"; volume: number; max: number }                   // _SingleAudioPool: voice cap
  | { kind: "randomAB"; volume: number; max: number; variants: [string, string] } // _RandomABAudio
  | { kind: "throttled"; volume: number; cooldownMs: number };      // _ThrottledAudio

interface Started { cue: string; clip: string; volume: number; atMs: number; }

class CuePlayer {
  private lastPlayed = new Map<string, number>();    // throttle clock per cue
  private active = new Map<string, number>();        // live voices per cue
  private looping = new Set<string>();               // loopOnce guard
  readonly started: Started[] = [];

  constructor(private policies: Record<string, Policy>, private rng: () => number, private now: () => number) {}

  play(cue: string): boolean {
    const p = this.policies[cue];
    if (!p) throw new Error(`unregistered cue ${cue}`);  // donor asserts in debug
    const t = this.now();
    switch (p.kind) {
      case "simple":
        return this.start(cue, cue, p.volume, t);
      case "loopOnce":
        if (this.looping.has(cue)) return false;          // donor: _playing flag, never reset here
        this.looping.add(cue);
        return this.start(cue, cue, p.volume, t);
      case "pool": {
        const live = this.active.get(cue) ?? 0;
        if (live >= p.max) return false;                  // fix: explicit drop-new cap (donor pool behaviour not read)
        return this.start(cue, cue, p.volume, t, true);
      }
      case "randomAB": {
        const live = this.active.get(cue) ?? 0;
        if (live >= p.max) return false;
        const clip = this.rng() < 0.5 ? p.variants[0] : p.variants[1];
        return this.start(cue, clip, p.volume, t, true);
      }
      case "throttled": {
        const last = this.lastPlayed.get(cue);
        if (last !== undefined && !(t - last > p.cooldownMs)) return false;   // donor: strictly greater than duration
        return this.start(cue, cue, p.volume, t);
      }
    }
  }

  // Simple voice bookkeeping: a voice ends when `release` is called.
  release(cue: string): void {
    const n = this.active.get(cue) ?? 0;
    if (n > 0) this.active.set(cue, n - 1);
  }

  private start(cue: string, clip: string, volume: number, t: number, counted = false): boolean {
    this.lastPlayed.set(cue, t);
    if (counted) this.active.set(cue, (this.active.get(cue) ?? 0) + 1);
    this.started.push({ cue, clip, volume, atMs: t });
    return true;
  }
}

const policies: Record<string, Policy> = {
  google: { kind: "simple", volume: 1 },
  rollover: { kind: "simple", volume: 0.3 },
  background: { kind: "loopOnce", volume: 0.6 },
  flipper: { kind: "pool", volume: 1, max: 2 },
  bumper: { kind: "randomAB", volume: 0.6, max: 4, variants: ["bumper_a", "bumper_b"] },
  dino: { kind: "throttled", volume: 1, cooldownMs: 6000 },
};

let clock = 0;
let seed = 3;
const rng = (): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const player = new CuePlayer(policies, rng, () => clock);

// Self-check: throttle blocks a repeat inside the cooldown, a pool caps at two, A/B alternates clips.
clock = 0;
if (!player.play("dino")) throw new Error("first dino play should pass");
clock = 5000;
if (player.play("dino")) throw new Error("dino repeated inside 6 s");
clock = 6001;
if (!player.play("dino")) throw new Error("dino blocked after 6 s");
if (!player.play("flipper") || !player.play("flipper")) throw new Error("flipper should play twice");
if (player.play("flipper")) throw new Error("flipper exceeded cap of 2");
player.release("flipper");
if (!player.play("flipper")) throw new Error("flipper blocked after release");
if (!player.play("background") || player.play("background")) throw new Error("background should play once");
for (let i = 0; i < 20; i++) { player.play("bumper"); player.release("bumper"); }
const clips = new Set(player.started.filter((s) => s.cue === "bumper").map((s) => s.clip));
if (clips.size !== 2) throw new Error("bumper should use both variants");
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0; compiled and run with node on the VPS, self-check exit 0.

## 5. Lands in

- TARGET `src/fight/sound-cues.ts` (new client module; sound is client-only). Parity-checklist row 12 (combat sound cues). Per-cue policy (throttle, voice cap, random variant, play-once) is the table for hit, impact and voice cues. Music and beds are not in this donor, so they stay out of this module.
- Reuse tag: rewrite-from-idea (MIT: code may be adapted; this sketch is clean-room from the mechanism anyway)
- Brief rule served: 1 (one engine emits cue ids; the client plays them with the policy); addendum sound-music rules (voice limits, variant choice)

## 6. Gaps and risks

- Licence MIT: adaptation is allowed. The sketch is still written from the mechanism, not copied.
- No music layering, no stingers beyond single voice-over clips, no ambience beds, no crossfades, no priority. This donor covers voice limits and repetition control only. The layering, bed and crossfade parts of the cell are not supported by this donor (depth thin for those).
- Simple sounds have no cap at all (`_SimplePlayAudio.play`, 99-101): every play starts another player. In a many-on-one fight, a simple cue can stack. Frankendom must give each cue a cap or a policy.
- The pool cap and what happens when it is full are set here but enforced by `audioplayers` (not read). The sketch makes the drop-new rule explicit; the donor's behaviour may differ.
- `_SingleAudioPool` and `_RandomABAudio` create their pools in `load()` and read them in `play()` through `late` fields (160, 189-190). Playing before load would fail. Frankendom must preload before the first cue (the donor's `load()` list is the hook).
- The loop-once guard is never reset in this file (143-146). A stop-and-restart of the background track from this class is not possible; the donor has no stop method here.
- Throttle uses wall-clock `clock.now()` (236), which is fine for a client cue but is not a server clock; Frankendom must keep cue timing out of the server path.
- Hit and spell cues: not in this donor. Stingers: the voice-over lines are plain simple sounds; no stinger logic found.

Reuse tag: rewrite-from-idea (MIT: code may be adapted; this sketch is clean-room from the mechanism anyway)
Brief rule served: 1 (one engine emits cue ids; the client plays them with the policy); addendum sound-music rules (voice limits, variant choice)

Best transferable idea: Give each cue its own small policy (cooldown, voice cap, random A/B clip, play-once) in one table, so repetition and stacking are controlled per sound instead of globally.
Decision (proposed): adapt - take the per-cue policy table and its five kinds for hit, impact and voice cues in src/fight/sound-cues.ts; add a cap to simple cues and make the drop-new rule explicit; reject the package-level pool as the cap mechanism.
Acceptance: In a 3-on-1 fight, a repeated hit grunt plays at most once per 2 s and at most the cap number of impacts overlap; the two bumper-style impact clips alternate (client unit test of CuePlayer, no server involved).
