# ihhub-fheroes2 (animation-rigs, cell 3)

Donor: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/monster/monster_anim.cpp` | Licence: GPL-2.0-or-later (per file header: "either version 2 of the License, or (at your option) any later version"; the donor's root `LICENSE` is GPL v2 text) | C++ | symbol `RandomMonsterAnimation::increment`

Checked: Read in full: `monster_anim.cpp` (1-190) and `monster_anim.h` (30-108: the clip enum and the class). Read: `TimeDelay` (engine/timing.h 62-110), the animation delay gate (game/game_delays.cpp 94-166, plus the castle unit delay line 104), the castle dwelling driver (castle/castle_well.cpp 234-246, 288-291, 550-606; the loop's early `break` at 580 not read), the army dialog driver (dialog/dialog_armyinfo.cpp 511-512, 566-570), the fixed-sequence users (maps/maps_tiles_render.cpp 329-331; game/game_highscores.cpp 163-169), the RNG (engine/rand.h 196-202; engine/rand.cpp 67-100). Offsets: battle/battle_animation.cpp 271-290 (partial). Grep of callers: `RandomMonsterAnimation` is used only in castle/, dialog/ and monster/; nothing in battle/. So the battle's own attack and hit playback is a different path and was not read. Candidates opened: about nine. camera_scope: n/a (not a camera topic). Confidence: high on the phrase builder and the timing gate; medium on "one advance per dwelling per redraw" (the loop can `break` at 580, not read). Not read: the monster data that fills the clip vectors and offsets (`AnimationReference`, battle_animation.cpp 1-270 except the switch), the army dialog's redraw rate, the battle attack and hit playback.

## 1. Mechanism

- Purpose and scope: a display-only scheduler that makes one monster sprite look alive on the castle well and army info screens. Its choices never reach gameplay (the callers only draw; see grep above).
- State: a list of valid moves (`_validMoves`, duplicates act as weights), two queues of equal length (`_frameSet` for frame ids and `_offsetSet` for per-frame x offsets), and the current `_frameId` and `_frameOffset` (monster_anim.h 95-101).
- Valid moves are built once in the constructor (monster_anim.cpp 41-63). A move is added only if the monster has frames for it (`_addValidMove`, 171-175). The list is: STATIC twice (48-49), IDLE once (50), MELEE_TOP, MELEE_FRONT, MELEE_BOT, RANG_TOP, RANG_FRONT, RANG_BOT once each (51-56), MOVING twice (57-58). If the caller asks for death clips, WNCE and KILL are added once each (59-63). With every move present that is 11 entries, or 13 with death clips. So STATIC has 2 of the 11 entries (2 of 13 with death clips), and MOVING has 2 of 11 (2 of 13). A monster missing a clip type has the others' weights raised.
- `increment()` (68-128) shows one frame per call. Order of steps: (a) if the frame queue is empty, pick one move uniformly from the valid list (`Rand::Get(_validMoves)`, 74), then push a phrase for it (76-122); (b) push a static clip at the end of every phrase (124); (c) pop one frame id and one offset from the queues into `_frameId` and `_frameOffset` (127, 182-188).
- Phrase shapes (76-122):
  - STATIC: the static clip repeated 10 to 20 times (77-79).
  - IDLE: the idle clip once (81-83). The enum comment says the engine changes IDLE to STATIC when done (monster_anim.h 46).
  - MOVING: a start clip (MOVE_START, or FLY_UP for flyers), then the walk clip repeated 3 to 5 times (87-89), then an end clip (MOVE_END, or FLY_LAND) (84-91).
  - Melee and ranged: the strike clip, then its `_END` clip (93-116).
  - WNCE (hit) and KILL (death): the clip once (117-122). Monster_anim.h 67 describes WNCE as "combined UP and RETURN anim".
- `_pushFrames` (154-169): appends the clip's frame ids to `_frameSet`, and its per-frame offsets to `_offsetSet`. IDLE gets zero offsets (159-161). Other clips take the offsets from the monster's data (163-164). If the offset queue is shorter than the frame queue, it is padded with zeros (167-168).
- Per-frame offset: the sprite is drawn shifted by `offset()` (castle_well.cpp 590, 593). For walk phrases these offsets come from the move data (battle_animation.cpp 282-290: the start, main and tile-end offsets are joined for MOVE_START, and the tile-start, main and tile-end offsets for MOVING). This is the root-motion-in-pixels channel.
- `reset()` (145-152): empties both queues, queues one static clip, and pops one frame. The army dialog calls it when the dialog is not animated (dialog_armyinfo.cpp 568-570).
- Timing (not inside the scheduler): the castle well polls `validateAnimationDelay(CASTLE_UNIT_DELAY)` (castle_well.cpp 288). That delay is 150 ms (game_delays.cpp 104). When it passes, the whole dwelling loop redraws, and each dwelling's scheduler calls `increment()` once (castle_well.cpp 554, 605). So a dwelling advances about 6.7 frames per second of wall time. The army dialog advances only while it is animated (dialog_armyinfo.cpp 511-512), at its own redraw rate (not read).
- The gate itself: `TimeDelay::isPassed` is "elapsed steady-clock ms at least the delay" (timing.h 88-93). `validateAnimationDelay` returns true when it has passed and then restarts the count from now (game_delays.cpp 153-155). So the period is the delay plus the time until the next poll: wall-clock, with no catch-up. `pass()` backdates the start by two delays (timing.h 102-105), so the first poll succeeds (castle_well.cpp 246 calls `passAnimationDelay` before the loop).
- Two other screens do not use the random scheduler. Map sprites index a fixed 15-entry sequence (0, 0, 1, 2, 1, 0, 0, 0, 3, 4, 5, 4, 3, 0, 0; monster_anim.cpp 31) at `(adventure animation index + x * y) % 15` (maps_tiles_render.cpp 329-331). The high-score sprites use the same sequence at `(x + y + dayCount + frame id) % 15` (game_highscores.cpp 163-169). A phase from the tile or row desynchronises the creatures without any randomness.
- Randomness: `Rand::Get` draws from a thread-local PCG32 seeded by `std::random_device` (rand.cpp 85-91, 93-100). The ranges are inclusive (rand.cpp 74, 82). So the idle choices are not seeded and cannot be reproduced.

## 2. Key functions

- `RandomMonsterAnimation::increment`: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/monster/monster_anim.cpp` 68-128 (phrase choice and push, then one pop).
- Constructor and valid-move list: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/monster/monster_anim.cpp` 41-66, `_addValidMove` 171-175.
- `_pushFrames` (frames and offsets, padding): `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/monster/monster_anim.cpp` 154-169.
- `reset`: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/monster/monster_anim.cpp` 145-152.
- Delay gate: `/mnt/frankendom-donors/ihhub-fheroes2/src/engine/timing.h` 62-110 (`TimeDelay`); `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/game/game_delays.cpp` 149-166.
- Driver: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/castle/castle_well.cpp` 288-291 and 605.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Weighted pick from a list where duplicates are weights | STATIC 2, MOVING 2, IDLE and each melee and ranged 1 (theirs, monster_anim.cpp 48-58). Death adds WNCE 1 and KILL 1 (61-62). |
| Phrase with a repeat count | Static repeats 10 to 20 (theirs, 77); walk cycles 3 to 5 (theirs, 87). |
| Every phrase ends on the rest clip | One static clip (theirs, 124). |
| Per-frame offset queue padded to the frame count | Zero pad (theirs, 168). |
| Wall-clock frame gate, restart from now | 150 ms castle unit delay (theirs, game_delays.cpp 104). |
| Passed on first poll | Backdate by two delays (theirs, timing.h 104). |
| Fixed sequence with a phase per position | 15 entries (theirs, monster_anim.cpp 31); phase `x * y` (theirs, maps_tiles_render.cpp 331) and `dayCount` (theirs, game_highscores.cpp 169). |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's phrase rules (static repeats 10 to 20 times, walk cycles 3 to 5, the start and end clips, a fly variant, the static tail), the weighted uniform pick over a list with duplicates, the one-frame pop, and the per-frame offset queue. It omits the donor's filter that drops moves a monster does not have (the caller passes the list), the `_offsetSet` clear and pad steps (the sketch pads per frame, which gives the same result when offsets are not longer than frames), the IDLE zero-offset special case (the data supplies zeros), the empty-list assert, the 32-bit range handling of `Rand::Get`, and the timing gate, which lives in the caller. The sketch takes the RNG as a parameter.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface ClipData {
  frames: number[];   // frame ids of one animation type
  offsets: number[];  // per-frame x offset for the same frames (missing entries count as 0)
}

// Inclusive range, like the donor's Rand::Get(from, to).
export type Rng = (from: number, to: number) => number;

export class IdleScheduler {
  private queue: { frame: number; offset: number }[] = [];
  public frame = 0;
  public offset = 0;

  constructor(
    private readonly clips: Map<string, ClipData>,
    private readonly valid: string[],   // duplicates act as weights
    private readonly isFlyer: boolean,
    private readonly rng: Rng,
  ) {
    this.increment();
  }

  // Show the next frame. When the queue is empty, queue a new phrase picked from the valid list.
  increment(): void {
    if (this.queue.length === 0) {
      this.queuePhrase(this.valid[this.rng(0, this.valid.length - 1)]);
    }
    this.take();
  }

  // Back to the static pose.
  reset(): void {
    this.queue = [];
    this.pushClip('STATIC');
    this.take();
  }

  private take(): void {
    const next = this.queue.shift();
    if (next !== undefined) {
      this.frame = next.frame;
      this.offset = next.offset;
    }
  }

  private pushClip(name: string): void {
    const clip = this.clips.get(name);
    if (clip === undefined) return;
    for (let i = 0; i < clip.frames.length; i++) {
      this.queue.push({ frame: clip.frames[i], offset: clip.offsets[i] ?? 0 });
    }
  }

  private queuePhrase(move: string): void {
    if (move === 'STATIC') {
      const n = this.rng(10, 20);               // repeat the static clip 10 to 20 times
      for (let i = 0; i < n; i++) this.pushClip('STATIC');
    } else if (move === 'MOVING') {
      this.pushClip(this.isFlyer ? 'FLY_UP' : 'MOVE_START');
      const n = this.rng(3, 5);                 // 3 to 5 walk cycles
      for (let i = 0; i < n; i++) this.pushClip('MOVING');
      this.pushClip(this.isFlyer ? 'FLY_LAND' : 'MOVE_END');
    } else if (move === 'IDLE' || move === 'WNCE' || move === 'KILL') {
      this.pushClip(move);
    } else {
      this.pushClip(move);                      // attack: the strike, then its end part
      this.pushClip(move + '_END');
    }
    this.pushClip('STATIC');                    // every phrase ends on the static clip
  }
}

export {};
```

## 5. Lands in

- TARGET `src/fight/creature-idle.ts` (new; client-only presentation). It schedules idle, walk and attack-end clips for a zone creature between server events. The engine owns the hit and the death: a wince or a death clip plays only when the server's hit or kill event says so, never from this scheduler. Note: the rulings put the engine in `src/fight`; this file is client presentation, so the Lead decides whether it stays there or moves to the Pit client tree (the same question as the cell 1 note).
- Parity-checklist row: 7 (creature actor/clips). Zone population (row 23) is not involved: this scheduler does not spawn or despawn anything.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: addendum anti-strictness rule 2 (judge the idea, not the genre); rules 7-9 n/a

Best transferable idea: Show creature idle variety as a queue of weighted phrases (each a rest, a walk or a strike, then a rest clip), with the weights written as duplicates in the clip list, so no two creatures of one type look copied and the server never has to send idle choices.

Decision (proposed): adapt — the phrase queue and weighted pick are the right shape for zone creature idle, but the donor's wall-clock delay gate and unseeded RNG are display choices we must not use for anything the server checks, so we drive the queue from the shared client clock (as in the cell 1 note) and keep the RNG out of the engine.

Acceptance: In one zone with 12 idle creatures of one type, no two share the same phrase boundary within 5 seconds, and in a test where the server sends no hit event, the creature's wince clip never plays; a hit event from the server plays the wince clip on the same frame in every client.

## 6. Gaps and risks

- The donor's random pick includes the wince and death clips in its ordinary list (only when the caller asks for death clips, monster_anim.cpp 59-63). That is a display rule. In Frankendom the wince and death must come only from the server's hit and kill events (server-verified kills), so the scheduler's list for zone creatures must never include them.
- The donor's RNG is unseeded (rand.cpp 85-91). Fine for idle looks; it must never feed hit results, kills or drops (the record and replay rule, row 19).
- The donor's gate is wall-clock with restart from now (timing.h 96-99; game_delays.cpp 153-155), so the period drifts with poll timing. Ours should use the shared fixed client clock (the cell 1 approach), so two clients show the same phrase at the same clock.
- Weights are implicit (duplicates in a list). Frankendom's catalogue should state weights as data per creature type (zone data), with a test that the sum matches.
- An empty valid list is an assert in the donor (rand.h 198), not a fallback. Our creature with no idle clips must fall back to its static clip explicitly.
- The per-frame x offset is the root-motion channel for walks (battle_animation.cpp 282-290, read in part). Our rigs should keep root motion in the clip data, not in the scheduler.
- The map and high-score screens use a fixed sequence with a phase per position (maps_tiles_render.cpp 331; game_highscores.cpp 169). That is a cheap desync we can use for Pit crowds with no randomness at all.
- Not read: the donor's battle attack and hit playback (where the real hit reaction is shown), the monster data that fills the clip vectors and offsets, and the army dialog redraw rate. The battle path is the one that matters for hit reactions, so a second note is needed before we decide on hit clips.
- MAX_ATTACKERS = 3 and the one ledger do not appear in this file; nothing here affects them.
- The file is GPL: clean-room only. The sketch is written from the mechanism.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: addendum anti-strictness rule 2 (judge the idea, not the genre); rules 7-9 n/a
