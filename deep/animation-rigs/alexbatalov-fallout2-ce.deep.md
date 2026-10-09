# alexbatalov-fallout2-ce (animation-rigs, cell 3)

Donor: /mnt/frankendom-donors/alexbatalov-fallout2-ce/src/animation.cc | Licence: Sustainable Use License v1.0 (donor LICENSE.md: internal business or non-commercial use only, free non-commercial distribution only); clean-room only, never a line-by-line translation | C++ | symbol animationRunSequence/_anim_animate
Symbol check (re-opened): the input's line 265 is a forward declaration. Definitions: animationRunSequence 1352-1536, _anim_set_continue 1539-1560, _anim_animate 2705-2737, _object_animate 2740-2905. The file is .cc (C++ style, static functions and structs).

## 1. Mechanism
- The engine keeps a table of animation sequences (ANIMATION_SEQUENCE_LIST_CAPACITY 32, line 40), each holding up to 55 step descriptions (line 41). A step has a kind (move to object or tile, animate, animate reversed, animate and hide, animate forever, rotate, hide, callback, set or unset flag, set fid, take out weapon, light changes, stairs, falling check, outline, ping, continue) and a delay.
- animationRunSequence(index) (1352-1536) is a while loop. It returns at once for index -1 or an ended sequence, and returns 0 when all steps have been taken. Steps ahead of the completed-step counter (field_0 > animationIndex) are gated by delay: a negative delay blocks and returns; a positive delay counts down one per call and returns. Otherwise it takes the next step and switches on its kind. A step that finishes instantly calls _anim_set_continue(seq, 0), which bumps animationIndex (and ends the sequence at the last step); a step that returns -1 ends the sequence through _anim_set_end. Animate-kind steps do not finish instantly: they queue a descriptor and the next loop pass blocks on the following step until the descriptor calls _anim_set_continue(seq, 1) (1539-1560), which bumps the counter and re-enters animationRunSequence. Which registration functions set delay to -1 (lines 943-1026 do) was not read.
- _anim_animate(obj, anim, seqIndex, flags) (2705-2737) returns -1 if the descriptor list (gAnimationSads, ANIMATION_SAD_LIST_CAPACITY 24, line 42) is full. It builds a frame id from the object's art id, the animation id and the rotation + 1 (ANIM_TAKE_OUT is built differently, with flags in the fid), returns -1 if the art does not exist, then fills the descriptor (sequence index, timestamp 0, ticksPerFrame from animationComputeTicksPerFrame at 3287, which was not read) and increments the count.
- _object_animate (2740-2905) is the scheduler pass over the descriptors (its caller and call rate were not read). Done descriptors (field_20 == -1000) are skipped. A descriptor not yet past its own ticksPerFrame (getTicksBetween) is skipped; when due, it stamps the time and calls animationRunSequence first (if that returns -1, skip). Then: if it has a move path (field_1C > 0) it moves the object (straight or tile path) and continues. Otherwise, on its first due tick (field_20 == 0) it releases other descriptors on the same object that were parked (-2000 to -1000, set_continue) and parks itself, then swaps the object's fid to the new animation and sets frame 0 (the last frame if reversed). On later ticks it advances the frame (or steps back if reversed); at the last frame, unless forever, it marks itself done, optionally hides the object, and calls _anim_set_continue(seq, 1). Each change unions dirty rects and refreshes the tile window. _object_anim_compact (2908) runs at the end (body not read).
- Inputs: object, animation id, flags. Outputs: art frame, object position, sequence completion. Gated per descriptor by ticks.

## 2. Key functions
- animationRunSequence | /mnt/frankendom-donors/alexbatalov-fallout2-ce/src/animation.cc | 1352-1536 | step stepper with delay gate and kind dispatch.
- _anim_set_continue | /mnt/frankendom-donors/alexbatalov-fallout2-ce/src/animation.cc | 1539-1560 | bumps the completed-step counter; ends the sequence at the last step; optionally re-enters the stepper.
- _anim_animate | /mnt/frankendom-donors/alexbatalov-fallout2-ce/src/animation.cc | 2705-2737 | builds the frame id, checks art, queues a descriptor.
- _object_animate | /mnt/frankendom-donors/alexbatalov-fallout2-ce/src/animation.cc | 2740-2905 | per-tick scheduler: per-descriptor time gate, run sequence, move or advance frame.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Sequence of steps with a completed-step counter and a delay gate that blocks until the previous step reports done | Step kinds (theirs, Fallout script types, 1352-1536) |
| Per-descriptor time gate, one sequence pass per due tick | ticksPerFrame from animationComputeTicksPerFrame (theirs, 3287, not read) |
| Fixed-capacity descriptor queue that refuses when full | ANIMATION_SAD_LIST_CAPACITY 24, sequences 32, steps 55 (theirs, lines 40-42) |
| Direction from rotation index | Six-direction art (theirs) |

## 4. TypeScript sketch
simplified: the donor loops steps while each completed one bumps a counter (animationIndex) and a negative delay blocks the next step; the sketch omits step kinds, movement paths, frame-id building, art checks, the object fid swap, parked-descriptor release, reverse/forever/hide flags, dirty rects and the compact pass. Its rc 0 / -1 mirrors the donor's return values; a step finishes by calling complete().

```ts
// Licence: Sustainable Use License v1.0 (alexbatalov-fallout2-ce; non-commercial / internal use only) | clean-room: written from the mechanism, never a line-by-line translation.
interface Step { delay: number; run: (seq: Sequence) => number } // 0 ok, -1 fail; async steps call complete(seq, true) later
interface Sequence { steps: Step[]; next: number; done: number; ended: boolean }
interface Descriptor { seq: Sequence; ticksPerFrame: number; lastTick: number; framesLeft: number }

const MAX_DESCRIPTORS = 24; // theirs: ANIMATION_SAD_LIST_CAPACITY (animation.cc line 42)
const active: Descriptor[] = [];

// Queue a descriptor; refuse when the list is full (the donor returns -1).
function enqueue(d: Descriptor): number {
  if (active.length >= MAX_DESCRIPTORS) return -1;
  active.push(d);
  return 0;
}

// A step reports finished: bump the counter; end at the last step; optionally resume the stepper.
function complete(seq: Sequence, resume: boolean): number {
  if (seq.ended) return -1;
  seq.done++;
  if (seq.done === seq.steps.length) { seq.ended = true; return 0; }
  return resume ? runSequence(seq) : 0;
}

function runSequence(seq: Sequence): number {
  if (seq.ended) return -1;
  for (;;) {
    if (seq.next >= seq.steps.length) return 0;
    const step = seq.steps[seq.next];
    if (seq.next > seq.done) {            // previous step not yet reported done
      if (step.delay < 0) return 0;       // blocked
      if (step.delay > 0) { step.delay--; return 0; }
    }
    seq.next++;
    if (step.run(seq) === -1) { seq.ended = true; return -1; }
    if (seq.ended) return -1;
  }
}

// Per tick: each descriptor waits for its own frame time, then runs its sequence and advances one frame.
function tickAnimations(now: number): void {
  for (const d of active.slice()) {
    if (now - d.lastTick < d.ticksPerFrame) continue;
    d.lastTick = now;
    if (runSequence(d.seq) === -1) continue;
    if (--d.framesLeft <= 0) {
      active.splice(active.indexOf(d), 1);
      complete(d.seq, true);
    }
  }
}
```

## 5. Lands in
- Frankendom file(s): TARGET src/fight/hero-sequencer.ts (new module, hero step sequencer). Creature side is the origins' own copy (origins/preview/mob-clips.ts, row 7; path from the Frankendom lane notes, not checked here).
- Parity-checklist row: 6 hero actor/animation (finisher step chains also touch row 9).
- Reuse tag: rewrite-from-idea (Sustainable Use License v1.0, non-commercial only; the mechanism only, clean-room).
- Brief rule served: (category default, not per-cell) 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks
- This is a scripted step queue (movement, dialogue, animation). Frankendom's hero attack needs combo windows and hit frames, which this does not model.
- The time gate is in the donor's game ticks. The shared fight loop runs at 60 Hz (checklist row 4), so tick, frame and millisecond units must be pinned before reuse.
- A full queue (24 descriptors) or missing art makes _anim_animate return -1, which ends the sequence. Frankendom must not let an animation limit decide hits (server-verified kills).
- Art ids and rotation mapping are Fallout-specific.
- Licence is the Sustainable Use License v1.0 (internal business or non-commercial use only): no code is carried over and nothing is translated line by line; only the mechanism is described.
