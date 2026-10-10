# Return-To-The-Roots-s25client (animation-rigs, cell 3)

Donor: `/mnt/frankendom-donors/Return-To-The-Roots-s25client/libs/s25main/animation/Animation.cpp` (playback clock, 1-211) with `/mnt/frankendom-donors/Return-To-The-Roots-s25client/libs/s25main/animation/AnimationManager.cpp` (driver) | Licence: GPL-2.0-or-later (every animation file header: `SPDX-License-Identifier: GPL-2.0-or-later`; the repository LICENSE file is the GPL v2 text, June 1991) | C++ | symbol `Animation::update`

Checked: Read in full: `Animation.cpp` (all 211 lines), `Animation.h`, `MoveAnimation.cpp`, `ToggleAnimation.h`, `AnimationManager.cpp` (update, finish and add paths). Driver: The only call site of `animations_.update` found by grep in `libs/s25main/*.cpp` is `Window.cpp` 442. Not read: `BlinkButtonAnim`, the `RTTR_Assert` macro, the body of `VIDEODRIVER.GetTickCount()`, the callers in `dskTest.cpp` and `dskGameLobby.cpp` beyond their grep lines. Confidence: high on the clip clock and the finish rule (read in full, and the sketch was run on the VPS against the described sequences). Moderate on fit: this is a UI-element frame player with no skeleton, no blend, no inverse kinematics, no attachment points and no state machine. The part that transfers is the clip clock and the finish rule. camera_scope: not a camera note.

## 1. Mechanism

- One clock per animation. `update(time)` is called once per window draw with the wall-clock tick (Window.cpp 442; AnimationManager.cpp 27). The first call starts it: frame 0, `lastTime_ = time` (Animation.cpp 40).
- Next call: `passedTime = time - lastTime_`. If it is less than the frame rate, nothing happens (48). Otherwise the frames due are advanced (50).
- Frames due: `numFramesPassed = passedTime / frameRate_` (91). Two skip policies, set per animation (`skipType_`, default Frames):
  - Time (94-98): play one frame and move `lastTime_` so that the leftover is `frameRate - 1` ms. The rest of the elapsed time is dropped; every frame is played and the timing stays honest.
  - Frames (104-122): move `lastTime_` by the whole frames passed (104), then cap the count by the repeat mode: none stops at the last frame (108), repeat wraps by full cycles (113), oscillate by a cycle of `2N - 2` frames (117), oscillate-once by the frames left (121). If only one frame is due, `lastTime_` moves by one frame (128).
- The leftover after the frames is the "part" of the next frame, `remainingTime / frameRate`, passed to `doUpdate` (72). On a held last frame (no overshoot) the part is forced to zero (70-71), except in oscillate mode.
- Per frame the direction flips at the ends for the ping-pong modes (`advanceFrame`; the flip is at the last frame going up or at frame 0 going down).
- Finish: `finish(parent, finishImmediately)` first turns repeat into a one-shot (Repeat becomes None, line 172; Oscillate becomes OscillateOnce, line 174; these two lines are not in receipts.tsv). With `finishImmediately` false it returns (191), so the clip plays out to its natural end. With true it jumps: last frame for None (194), frame 0 going down for the ping-pong modes (197). The manager removes the animation when it reports finished (`isFinished`, 206-208; AnimationManager.cpp 28, 123).
- Whole-clip position: `getCurLinearInterpolationFactor` = (frame + part) / (frames - 1) (84), used by the move and toggle subclasses.
- Move subclass: frame rate = max(1, floor(min ms per pixel)) (MoveAnimation.cpp 17); frames = ceil(time / frame rate) + 1 (19); the element is placed at origin + diff x factor, rounded (32).
- Toggle subclass: two frames, time skip (ToggleAnimation.h 33); the boolean switches at factor 0.5 (40).

Order for one hold: `update` (first call sets the clock) -> later calls: if due, advance frames (cap by mode) -> compute part -> `doUpdate` on the element. If the clip is one-shot and reaches its end, `isFinished` is true and the manager deletes it on the same pass.

## 2. Key functions

- `Animation::update`: `/mnt/frankendom-donors/Return-To-The-Roots-s25client/libs/s25main/animation/Animation.cpp` 33-55 (first call, due check, advance).
- `Animation::execFrame`: same file, 57-73 (held last frame, part passed to `doUpdate`).
- `Animation::advanceFrames`: same file, 89-133 (skip policy, repeat caps, one-frame advance).
- `Animation::advanceFrame`: same file, 135-167 (wrap, ping-pong flip).
- `Animation::finish`: same file, 169-201 (repeat conversion, immediate jump, play-out).
- `Animation::isFinished`: same file, 203-211.
- `AnimationManager::update`: `/mnt/frankendom-donors/Return-To-The-Roots-s25client/libs/s25main/animation/AnimationManager.cpp` 23-35 (update all, delete finished).
- `MoveAnimation` constructor and `doUpdate`: `/mnt/frankendom-donors/Return-To-The-Roots-s25client/libs/s25main/animation/MoveAnimation.cpp` 11-20 and 29-37.

Line ranges above were taken from function-boundary greps on the VPS; the quotes in receipts.tsv are the exact anchors.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Clip clock: elapsed time over frame time gives frames due; the remainder is the part of the next frame | Frame time is passed per animation: 1 ms minimum for move (MoveAnimation.cpp 17), 2 frames for toggles (ToggleAnimation.h constructor) |
| Two skip policies: play every frame and drop time, or keep timing and skip frames | Default Frames (Animation.cpp, constructor); toggles use Time (ToggleAnimation.h 33) |
| Repeat modes: none (clamp at end), repeat (modulo N), ping-pong (modulo 2N-2), ping-pong once | Oscillate cycle 2N-2 (Animation.cpp 117) |
| Held last frame, no overshoot | Part forced to 0 on the last frame (70-71) |
| Immediate finish jumps to the end pose; play-out lets it run | Immediate for None jumps to N-1 (194); for ping-pong to frame 0 (197) |
| Switch a boolean at half the clip | Factor 0.5 (ToggleAnimation.h 40) |
| Move at a rate of at most one frame per pixel | `max(1, floor(min ms per px))` (MoveAnimation.cpp 17) |

Worked check (derived from the formulas, not run in RTTR): 100 px in 4000 ms gives 40 ms per pixel, so a 40 ms frame and 101 frames.

## 4. TypeScript sketch

simplified: the sketch keeps the frame clock, the Frames and Time skip policies, the four repeat modes with their caps, the part forced to zero on a held frame, the immediate and play-out finish, and the whole-clip fraction. It omits the not-started finish path, the element-missing path (repeat forced to None when the element is gone), the rescale hook, and the RTTR asserts. It uses a numeric clock in ms, not `unsigned`. I ran the sketch on the VPS (node, compiled from the typecheck copy): oscillate on 3 frames gives 0 1 2 1 0 1 2 1 0; repeat gives 0 1 2 0 1 2; none holds at 2; one-shot oscillate ends at 0 and stays; a 45 ms jump with time skip gives frame 1 with part 0.9.

```ts
// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// One clock per clip: time in, frame index and a 0..1 part of the next frame out. Repeat modes and a finish call that either jumps or plays out.

type Repeat = "none" | "repeat" | "oscillate" | "oscillateOnce";
type Skip = "frames" | "time";
interface Pose { frame: number; part: number; }

class ClipClock {
  private frame = 0;
  private up = true;                  // counting up or down (oscillate)
  private last: number | null = null; // clock time (ms) at which the current frame was due
  repeat: Repeat;
  skip: Skip = "frames";

  constructor(private numFrames: number, private frameMs: number, repeat: Repeat) {
    this.repeat = repeat;
  }

  // Advance to clock time t (ms). Frames never run ahead of the clock.
  update(t: number): Pose {
    if (this.finished()) return this.report(0);                // donor never ticks a finished clip
    if (this.last === null) { this.last = t; this.frame = 0; this.up = true; return this.report(0); }
    const passed = t - this.last;
    if (passed < this.frameMs) return this.report(passed);      // next frame not due yet
    const steps = Math.floor(passed / this.frameMs);
    if (steps > 1 && this.skip === "time") {
      this.last += passed - this.frameMs + 1;                   // play one frame, drop the rest of the time
      this.advance();
    } else {
      this.last += steps * this.frameMs;                        // keep the remainder for the part
      const n = steps > 1 ? this.capSteps(steps) : 1;
      for (let i = 0; i < n; i++) this.advance();
    }
    return this.report(t - this.last);
  }

  // Immediate: jump to the end pose (or the start pose for ping-pong). Play-out: let the clip run to its end.
  finish(immediate: boolean): Pose {
    if (this.repeat === "repeat") this.repeat = "none";
    else if (this.repeat === "oscillate") this.repeat = "oscillateOnce";
    if (this.repeat === "oscillateOnce" && this.frame === 0) this.up = false;
    if (!immediate || this.finished()) return this.report(0);
    if (this.repeat === "none") this.frame = this.numFrames - 1;
    else { this.frame = 0; this.up = false; }
    return this.report(0);
  }

  finished(): boolean {
    if (this.repeat === "none") return this.isLast();
    if (this.repeat === "oscillateOnce") return !this.up && this.frame === 0;
    return false;
  }

  // Position across the whole clip, 0..1, for tweens that span the clip.
  fraction(part: number): number {
    return (this.frame + (this.up ? part : -part)) / (this.numFrames - 1);
  }

  private isLast(): boolean {
    return (this.up && this.frame + 1 >= this.numFrames) || (!this.up && this.frame === 0);
  }

  private report(rem: number): Pose {
    // Hold the last frame (no overshoot) unless the clip oscillates.
    const hold = this.isLast() && this.repeat !== "oscillate" && (this.repeat !== "oscillateOnce" || !this.up);
    return { frame: this.frame, part: hold ? 0 : rem / this.frameMs };
  }

  private capSteps(steps: number): number {
    switch (this.repeat) {
      case "none": return Math.min(steps, this.numFrames - 1 - this.frame);
      case "repeat": return steps % this.numFrames;
      case "oscillate": return steps % (this.numFrames * 2 - 2);
      case "oscillateOnce": return Math.min(steps, this.up ? this.numFrames * 2 - 2 - this.frame : this.frame);
    }
  }

  private advance(): void {
    this.frame += this.up ? 1 : -1;
    if (this.up && this.frame >= this.numFrames) this.frame = 0;   // plain repeat wraps
    if (this.repeat === "oscillate" && this.isLast()) this.up = !this.up;
    if (this.repeat === "oscillateOnce" && this.frame + 1 >= this.numFrames) this.up = !this.up;
  }
}
```

Sketch typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, passed (file `rttr_clip_clock.ts` in `/tmp`, copy in the work folder).

## 5. Lands in

- TARGET `src/fight/actor-clip.ts` (new, proposed; not checked against the repo). A client clip clock for hero and creature clips: frame and part out, one finish call for interrupts. Clip timing is per-clip content; the engine owns when a clip is requested and what it means.
- Parity-checklist row 6 (hero actor/animation). Row 7 (creature clips) fits equally; the hero is the first user. No row covers skeletons, blending, IK or ragdoll, because this donor has none of them.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 6 (timing: the clock is wall-clock time sampled per draw, so it is variable-step; described in section 1); 7 (copyleft, clean-room only)

Best transferable idea: a clip should be a clock with an explicit skip rule and an explicit "finish now or play out" call, so a hit can cut a recovery clip to its last pose without the animation or the duel state drifting apart.
Decision (proposed): adapt - take the clock, skip rule and finish call; reject the UI-only parts (window elements, the move and toggle subclasses) and keep the duel's own clock for anything that decides damage or timing.
Acceptance: when a server-confirmed hit stops a hero's recovery clip, the hero either snaps to the clip's last pose in one frame (immediate) or finishes the clip (play-out), as set by clip data; a test asserts the clip reaches its final frame and that the duel state is never read from the clip.

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not from the donor lines.
- This is not a rig. No skeleton, no skinning, no blend between clips, no inverse kinematics, no retargeting, no attachment points. The hero's 3D rig still needs its own pose blend; this donor gives only the clock and the finish rule.
- The clock is wall-clock time sampled once per window draw (Window.cpp 442). That is variable-step: it is right for playback on screen and wrong for anything that decides a hit. Frankendom's engine must never read the presentation clock (rulings: one engine, server-verified kills).
- Immediate finish of a ping-pong clip jumps to frame 0, not to its peak (Animation.cpp 197). A designer would expect the end pose. Frankendom must state the rule per clip rather than inherit it.
- Frame timing per clip is content: the donor passes frame time as a constructor argument. In Frankendom it is clip data, not a zone field and not an engine constant.
- Not read: `BlinkButtonAnim`, the `RTTR_Assert` macro, the wall-clock function behind `GetTickCount()`, and the call sites beyond their grep lines.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: 6 (clock and skip rule described, variable-step noted); 7 (copyleft, clean-room only)
