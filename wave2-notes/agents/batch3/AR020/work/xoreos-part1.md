# xoreos-xoreos (animation-rigs, cell 1)

Donor: `/mnt/frankendom-donors/xoreos-xoreos/src/graphics/aurora/animationchannel.cpp` | Licence: GPL-3.0-or-later (read in the file headers: "version 3 ... or (at your option) any later version"; the repo COPYING is GPL v3) | C++ | symbol `AnimationChannel::manageAnimations`

Checked: `AnimationChannel::manageAnimations` is animationchannel.cpp 107-176 and was read in full. Its callers were checked: animationthread.cpp:132 (the animation thread), model.cpp:644 (Model::manageAnimations, which loops the channels) and model.cpp:603 (advanceTime); all three were read. `playAnimationCount` has no caller in src (grep). Camera: not a camera topic; the camera appears only as the distance input to the thread skip (animationthread.cpp:166), so there is no camera_scope tag. Confidence high on the tick order, clip requests, idle roll, keyframe sampling and the thread skip. Not read: the RNG class internals (grep only), the body of `flushNodeBuffers`, the units of `EventMan.delay`, and the head-channel use in engines/kotorbase/creature.cpp (grep only, 686-688). "Transition time is never read" comes from a grep over the whole src tree: the only uses are the setter at animation.cpp:71 and the two MDL readers (model_kotor.cpp:308, model_nwn.cpp:468). The hint file, gr2file.cpp, was read: it is a GR2 loader and runs no clips.

Best transferable idea: One clip per actor where a timed request interrupts at the next tick and a finished clip falls back to a weighted, rolled idle, with a distance-based update skip that carries the skipped time forward.
Decision (proposed): adapt - the one-channel rules (timed request, one-loop idle that re-rolls, loop count, speed) fit hero and creature rigs, but the donor has no cross-fade, no hit timing and a random idle roll, so Frankendom must add those itself.
Acceptance: In the Pit the hero's attack clip plays at its authored speed and returns to idle with no visible hold, and a server test asserts the hit frame comes from the duel-step data, never from the clip length.

## 1. Mechanism

- Shape: each model has channels in a map keyed by `kAnimationChannelAll` and `kAnimationChannelHead` (model.h:59-60); KotOR creatures add the head channel (engines/kotorbase/creature.cpp:434). A channel plays one clip at a time. `Model::playAnimation` always uses the first channel (model.cpp:567-569).
- Requests: `playAnimation` resets the play timer (animationchannel.cpp:60) whether or not it restarts, and schedules the clip as "next" only when `restart` is set or the clip differs from the current one (line 63). A request with speed <= 0 is ignored (line 50). Length 0 means one loop at that speed, `clip length / speed` (line 54). `playAnimationCount` gives `loopCount + 1` loops (line 76); a negative count gives length -1, which is "until replaced" (lines 74-76, and the end test at line 143 only fires for length >= 0). A scheduled clip starts on the next tick and replaces the current one at once (lines 118-119).
- Idle: when there is neither a current nor a next clip, the channel rolls an idle (lines 114-115). The roll is an integer 0-99 (line 197; random.cpp:37 excludes the maximum). Entries are tested in order: an entry wins when the roll is below its weight, otherwise the weight is taken off the roll (lines 200 and 203). If no entry wins, there is no idle and the last pose holds (traced, not run). An idle equal to the current clip schedules nothing (lines 180-181). An idle plays one loop, because its play length is set to its clip length; when that ends the roll is made again.
- Sampling: `Animation::update` samples only `nextFrame`; `lastFrame` is unused (animation.cpp:75). Position keys: find the last key before the time and lerp by the time fraction (animation.cpp:178). Orientation keys: lerp and normalise, with one end flipped when `acos(dot) >= pi/2` (animation.cpp:214). Values go to node buffers (animation.cpp:103), which `ModelNode::flushBuffers` copies to the live fields later (modelnode.cpp:991-1003).
- Skinning (render side, `SkeletalAnimation`): for each skinned mesh node the whole node tree is recomputed (skeletalanimation.cpp:58), then each vertex is the weighted sum over its bones of base x bone x base-inverse (skeletalanimation.cpp:130). The bone matrix is `_absoluteTransform * _absoluteBaseTransformInv` (modelnode.cpp:1053).
- Update throttle (animation thread, not the render frame): each pass, a model's `skippedCount` is compared with N = roundf(distance to camera) / 8 (animationthread.cpp:116, 166-167). While the count is below N, the count goes up and the model is skipped. On the update pass, dt = time since the last update (animationthread.cpp:126-130; `lastChanged` is written only on updates, line 130). So skipped time is carried into the next step; the step is variable, with no fixed step and no accumulator.

## 2. Key functions

- `AnimationChannel::manageAnimations` (animationchannel.cpp:107-176). Order of steps for one tick, dt in real seconds:
  1. lastFrame = loop time; nextFrame = loop time + speed x dt (line 111).
  2. If there is neither a current nor a next clip, roll an idle (114-115).
  3. If a clip is scheduled, make it current, reset loop time, and set dt and both frame values to 0 (118-126).
  4. No current clip: return without sampling (129).
  5. Loop end inside this tick (133): sample at the loop length, add dt to the play timer, return.
  6. Timed clip finished (143): roll an idle, make it current (or none), sample at 0 if a clip is current, return.
  7. Loop wrap (157): sample at 0, nextFrame = speed x dt (161).
  8. Otherwise sample at nextFrame, add dt to the play timer, set loop time = nextFrame (167-170).
- `AnimationChannel::playAnimation` (animationchannel.cpp:48): validate speed, set speed and length, reset the timer, schedule if restart or a different clip.
- `AnimationChannel::playDefaultAnimationInternal` (178-193): roll; an idle equal to the current clip returns (180-181); otherwise it is scheduled with speed 1 (184) and length = clip length.
- Animation thread: `EventMan.delay(kYieldDuration)` with kYieldDuration = 1 (animationthread.cpp:39, 101); the skip check (116-120); dt and update (126-132); `getNumIterationsToSkip` (160-167).
- Skinning: `SkeletalAnimation::update` calls `Animation::update` then `updateModel` (skeletalanimation.cpp:46-47); the per-vertex sum is at line 130.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants and rules |
|---|---|
| One clip per channel; a scheduled clip interrupts at the next tick | Interrupt on the next tick (animationchannel.cpp:118-119); no queue behind the current clip |
| Timed request, timer reset on every request | Timer reset (line 60); length 0 means clip length / speed (line 54); speed must be > 0 (line 50) |
| Loop count | count + 1 loops (line 76); negative means until replaced (lines 74-76) |
| Weighted idle roll, with a remainder that means "no idle" | Roll 0-99 (line 197, random.cpp:37); entry wins when roll < weight (line 200); weight taken off the roll (line 203); idle speed forced to 1 (line 184) |
| Idle equal to current does nothing | Lines 180-181 |
| Loop end and wrap | Last frame shown at the loop length (line 133); wrap to frame 0 (line 157) |
| Keyframe blend | Linear position lerp (animation.cpp:178); nlerp with a sign flip at acos(dot) >= pi/2 (animation.cpp:214) |
| Update throttle by distance | N = roundf(distance) / 8 passes skipped (animationthread.cpp:166-167); result is a uint8 (animationthread.h:75; animationthread.cpp:160) |
| Time carried over skipped passes | dt measured from the last update (animationthread.cpp:128, 130) |
| Transition time (cross-fade) | Stored from the MDL (model_kotor.cpp:308; model_nwn.cpp:468) and never read (animation.cpp:71). No cross-fade exists in this tree. |

Tunable in data for Frankendom: idle weights, clip speed, requested length, loop count (all per actor or per request). The skip divisor (8) and the 0-99 roll are engine rules.

## 4. TypeScript sketch

simplified: one channel with a scalar pose instead of per-node transforms; no mutex, model-node map, attached-model or head-channel recursion, createBound or buffer flush; the idle list is passed in instead of looked up by name. It keeps the donor's tick order (steps 1-8 in section 2) and its one-tick hold when a timed clip ends and the idle roll repeats the current idle. It leaves out the keyframe sampling; `nlerpShortest` is the one interpolation helper included. `play()` takes a clip object, so the donor's missing-animation check is not present.

