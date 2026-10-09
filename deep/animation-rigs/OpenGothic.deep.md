# OpenGothic (animation-rigs, cell 3)

Donor: /mnt/frankendom-donors/OpenGothic/common/graphics/mesh/animation.cpp | Licence: MIT | C++ | symbol Animation::Sequence::isInComboWindow / canInterrupt / isPrehit / processEvents
Symbol check (re-opened): canInterrupt 260, isInComboWindow 275, isPrehit 301, extractFrames 317, processEvents 418, processEvent 458-518 (per-tag switch).

## 1. Mechanism
- A Sequence is one playing clip. Its data gives a frame rate, a frame range, combo windows and event tags (hit frames, weapon-mode changes, item and torch events, mesh swap), plus separate ground-effect (gfx) and morph-start lists.
- Playhead: frame = (now - sTime) * fpsRate / 1000. Window values in defWindow are in milliseconds since sTime.
- isInComboWindow(t, comboLen) (275-278) reads the pair defWindow[2*comboLen], defWindow[2*comboLen+1] and returns true when the time sits in the open-closed span.
- canInterrupt(now, sTime, comboLen) (260-273) returns false while inside that combo window, and true when the window pair for that step does not exist. For Transition-class clips it instead requires the pair to exist and defHitEnd to be non-empty, then returns true once (now - sTime) is past the window start (defWindow[2*comboLen]); that branch is separate.
- isPrehit(sTime, now) (301-315) returns false for a clip with zero frames; otherwise truncates the playhead to an integer frame and returns true while any OPTIMAL_FRAME event frame is greater than it.
- processEvents(barrier, sTime, now, ev) (418-456) first calls extractFrames (317-352), which converts barrier and now to integer frames, returns nothing if both are equal, wraps them modulo numFrames for Loop clips (clamps to numFrames otherwise), mirrors them for reversed clips, and swaps them with an invert flag when B < A. Each event frame is clamped into the clip range, and the tag fires when (A <= frame < B) XOR invert. Hit-frame (OPTIMAL_FRAME) tags carry a list of frames; other tags carry one. processEvent (458-518) then counts the hit frame, records a weapon-mode change, or queues timed item, torch and mesh-swap events. The gfx list bumps a ground-sound counter and mmStartAni entries push a morph event, both on the same crossed-span test.
- Inputs: clip data, sTime, now, combo step. Outputs: booleans, and counts or events per tick. Client render-side.

## 2. Key functions
- Sequence::canInterrupt | /mnt/frankendom-donors/OpenGothic/common/graphics/mesh/animation.cpp | 260-273 | combo-window gate for interrupts.
- Sequence::isInComboWindow | /mnt/frankendom-donors/OpenGothic/common/graphics/mesh/animation.cpp | 275-278 | window test for one combo step.
- Sequence::isPrehit | /mnt/frankendom-donors/OpenGothic/common/graphics/mesh/animation.cpp | 301-315 | true while a hit frame is still ahead.
- Sequence::processEvents | /mnt/frankendom-donors/OpenGothic/common/graphics/mesh/animation.cpp | 418-456 | fires tags for frames crossed since the last tick.
- Sequence::processEvent | /mnt/frankendom-donors/OpenGothic/common/graphics/mesh/animation.cpp | 458-518 | per-tag switch that counts or records each tag.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Time-to-frame mapping from a clip rate | fpsRate per clip (theirs, from the animation file; read at 301-315 and 317-352) |
| Open-closed window test for a combo step | defWindow pairs in ms (theirs, per animation) |
| Hit-frame-ahead test for prehit | OPTIMAL_FRAME event tags (theirs) |
| Crossed-frame dispatch of tags | Tag kinds from the MDS format (theirs) |

## 4. TypeScript sketch
simplified: omits extractFrames (loop wrap, reverse, invert-and-swap, clamp to clip range, equal-frame early out), the zero-frame guard, integer truncation of frames, the Transition-class canInterrupt branch, and the hit-end / item / torch / mesh-swap tag kinds.

```ts
// Licence: MIT (OpenGothic). Lift permitted; re-expression of animation.cpp 260-315 and 418-456.
interface Clip { fpsRate: number; defWindow: number[]; hitFrames: number[]; eventFrames: { frame: number; tag: string }[]; }
interface Seq { clip: Clip; sTime: number; }

// Playhead in frames.
function frameAt(seq: Seq, now: number): number {
  return ((now - seq.sTime) * seq.clip.fpsRate) / 1000;
}

// Combo window for step comboLen: open-closed span in ms since sTime.
function inComboWindow(seq: Seq, now: number, comboLen: number): boolean {
  const i = comboLen * 2;
  const w = seq.clip.defWindow;
  if (i + 1 >= w.length) return false;
  const t = now - seq.sTime;
  return w[i] < t && t <= w[i + 1];
}

// Interrupt is allowed when not inside the combo window of this step (Animation class branch only).
function canInterrupt(seq: Seq, now: number, comboLen: number): boolean {
  return !inComboWindow(seq, now, comboLen);
}

// True while any hit frame is still ahead of the playhead.
function isPrehit(seq: Seq, now: number): boolean {
  const f = frameAt(seq, now);
  return seq.clip.hitFrames.some((h) => h > f);
}

// Tags whose frame lies in [frame(barrier), frame(now)) since the last tick.
function eventsCrossed(seq: Seq, barrierMs: number, nowMs: number): string[] {
  const a = frameAt(seq, barrierMs);
  const b = frameAt(seq, nowMs);
  return seq.clip.eventFrames.filter((e) => a <= e.frame && e.frame < b).map((e) => e.tag);
}
```

## 5. Lands in
- Frankendom file(s): TARGET src/fight/hero-clips.ts (new module for hero clip timing; the hero actor lives under src/fight today).
- Parity-checklist row: 6 hero actor/animation. Hit-frame timing also feeds row 10 (hit impact and hitstop).
- Reuse tag: adapt (MIT; the timing functions are reusable, the clip data format is not).
- Brief rule served: (category default, not per-cell) 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks
- Timing is in frames from each clip's fps. The shared fight loop steps at 60 Hz (checklist row 4); frame, millisecond and tick units must be pinned before reuse.
- The Transition-class branch of canInterrupt and the extractFrames wrap/reverse logic are described above but not in the sketch.
- Hit frames only mark when a hit can happen. The damage decision is elsewhere in the donor and was not read.
- Client render-side. The server must still decide hits (server-verified rule); clip timing is never authority.
- Combo windows are per animation data, so Frankendom needs the same data per hero attack.
