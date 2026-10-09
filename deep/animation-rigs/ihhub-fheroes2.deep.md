# ihhub-fheroes2 (animation-rigs, cell 3)

Donor: /mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/monster/monster_anim.cpp | Licence: GPL-2 | C++ | symbol RandomMonsterAnimation::increment

## 1. Mechanism
- Donor: fheroes2 (Heroes of Might and Magic II re-implementation) idle animation for adventure-map and battle creatures. It is a frame sequencer, not a rig: it plays sprite frame indices in order.
- Setup (constructor, 41-66): a list of allowed moves is built from the monster's data. Each move type is added only if the monster has frames for it (_addValidMove, 171); static and moving are added twice to raise their weight; idle once; melee and ranged each have three variants (top, front, bot), each added once. Hit (WNCE) and death (KILL) are added only when includeDeathAnimation is true. The constructor ends by calling increment() once.
- increment (68-128): when the frame queue is empty, one move type is picked uniformly from the valid list (Rand::Get on the vector, rand.h 196; duplicates are the weight). The move expands into a run: static pushes the static frame vector 10 to 20 times (Rand::Get(10,20) is inclusive both ends, rand.cpp 93-100), idle once, moving pushes a start vector, then the moving vector 3 to 5 times, then an end vector (flyers use FLY_UP and FLY_LAND), each melee or ranged variant pushes its frames then its _END frames, hit and death push once. Every run ends with one push of the static vector. When the queue is not empty, increment only pops the next frame. The random source is a per-thread device, not seeded (rand.cpp 99).
- _pushFrames (154-169) appends a whole animation vector (several frames) for the type, and the matching offsets (zeros for idle, a special case; the offset list is padded with zeros to the frame list length). Each frame index plus a frame offset comes off the front of the queue (_updateFrameInfo, 177-189) and is exposed through frameId() and offset() (135-143).
- reset (145-152) clears both queues, pushes the static frames and pops one.
- Runs once per drawn creature frame, driven by the caller's animation timer (not read here).

## 2. Key functions
- RandomMonsterAnimation (constructor) | /mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/monster/monster_anim.cpp | 41-66 | builds the allowed move list from the monster's frame data, with weights by duplication, then fills the first run.
- RandomMonsterAnimation::increment | /mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/monster/monster_anim.cpp | 68-128 | when the queue is empty, picks one move at random and expands it into frames.
- RandomMonsterAnimation::_pushFrames | /mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/monster/monster_anim.cpp | 154-169 | appends one move's frame and offset sequences to the queue.
- RandomMonsterAnimation::_addValidMove | /mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/monster/monster_anim.cpp | 171-175 | adds a move type only if the monster has frames for it.
- RandomMonsterAnimation::_updateFrameInfo | /mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/monster/monster_anim.cpp | 177-189 | pops the next frame and offset from the queue.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Weighted random pick from a list where duplicates raise the weight | Static and moving listed twice (theirs; lines 48-49 and 57-58) |
| Each move expands to a fixed frame run; every run ends on rest | Static run 10 to 20 pushes; moving run 3 to 5 pushes (theirs; lines 77 and 87) |
| Only valid moves are offered; missing frames drop the move | Frame sets come from each creature's sprite data (theirs) |
| Death and hit only when the caller asks | includeDeathAnimation flag (theirs; lines 59-63) |
| A separate fixed 15-entry frame sequence (line 31, exposed by getMonsterAnimationSequence at 36-39; the increment path does not use it) | Sequence values (theirs) |

## 4. TypeScript sketch
simplified: melee and ranged have three variants each in the donor (top, front, bot), here one each; flyer fly-up and fly-land are not modelled; each name stands for a whole frame vector in the donor, here one frame; no validity filter (donor drops moves with no frames); no per-frame offsets; hit and death never enter the pool.

```ts
// Licence: GPL-2 | clean-room: written from the mechanism, no donor lines.
// Idle sequencer: pick a move at random from the allowed list (duplicates weight the pick),
// expand it into a run of frame names, end every run on a rest frame, and pop one frame per call.
type Move = "static" | "idle" | "moving" | "melee" | "ranged" | "hit" | "death";
const POOL: Move[] = ["static", "static", "idle", "melee", "ranged", "moving", "moving"];   // repeats = weight (theirs)

function expand(move: Move, rand: (n: number) => number): string[] {
  const seq: string[] = [];
  if (move === "static") {
    const n = 10 + rand(11);                       // 10 to 20 frames (theirs)
    for (let i = 0; i < n; i++) seq.push("static");
  } else if (move === "moving") {
    seq.push("move_start");
    const n = 3 + rand(3);                         // 3 to 5 frames (theirs)
    for (let i = 0; i < n; i++) seq.push("moving");
    seq.push("move_end");
  } else if (move === "melee" || move === "ranged") {
    seq.push(move, move + "_end");
  } else {
    seq.push(move);
  }
  seq.push("static");                              // every run ends on rest
  return seq;
}

class Sequencer {
  private queue: string[] = [];
  next(rand: (n: number) => number, pool: Move[] = POOL): string {
    if (this.queue.length === 0) this.queue = expand(pool[rand(pool.length)], rand);
    return this.queue.shift() ?? "static";
  }
}
```

## 5. Lands in
- Frankendom file: src/fight/creature-idle.ts (proposed, K3 creatures, row 7). Today the creature clips are the origins own copy at origins/preview/mob-clips.ts (not under src/).
- Parity-checklist row: 7 (creature actor and clips, origins own copy; K3 creatures).
- Reuse tag: rewrite-from-idea (GPL-2; mechanism only).
- Brief rule served: (category default, not per-cell) 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks
- Frame names are abstract; Frankendom's clips are time-based, so the frame count must become a duration.
- The sequencer is not seeded, so two clients show different idles. Harmless for presentation, but any reaction that must match across clients needs a shared seed or a server tick.
- Hit and death runs play once and then rest; the donor does not tie a hit to damage, so Frankendom must send the hit from the engine event (rule 2 is for kills, not for the animation).
- The attack moves here play the wind-up and recovery frames, not the timing of the blow. Blow timing belongs to the engine's move timing (row 13 specials, row 3 guard and roll).
- GPL-2: mechanism only. The fixed rest table (monsterAnimationSequence) is not copied.
