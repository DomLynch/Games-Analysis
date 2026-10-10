# supertuxkart-stk-code (animation-rigs, cell 3)

Donor: `/mnt/frankendom-donors/supertuxkart-stk-code/lib/graphics_engine/include/ge_animation.hpp` | Licence: the file header is an MIT permission notice ("Copyright (c) 2022 SuperTuxKart-Team", lines 1-20); the mechanism also runs through `lib/graphics_engine/src/ge_vulkan_animated_mesh_scene_node.cpp` (no per-file header), `lib/irrlicht/source/Irrlicht/CAnimatedMeshSceneNode.cpp` (Irrlicht notice: "see copyright notice in irrlicht.h", which names the zlib and libPng licences), and `src/karts/kart_model.cpp` (GNU GPL header). The repo `COPYING` is GPL-3.0-or-later ("either version 3 of the License, or (at your option) any later version"). Treated as copyleft for Frankendom: clean-room, shape only | C++ | symbol `GE::Armature::getPose`

Checked: `GE::Armature::getPose`, `getInterpolatedMatrices`, `getWorldMatrix` read in full (ge_animation.hpp 40-266). `GESPM::finalize` and `getSkinningMatrices` read in full (ge_spm.cpp). `GEVulkanAnimatedMeshSceneNode::OnAnimate` and `setTransitionTime` read in full (ge_vulkan_animated_mesh_scene_node.cpp). Irrlicht `buildFrameNr` read (CAnimatedMeshSceneNode.cpp 60-100) and `setAnimationSpeed` (470-473). Irrlicht `getInterpolated` (vector3d.h 247-251) and quaternion `slerp` (quaternion.h 531-555) read, to fix the blend direction. The caller in `src/karts/kart_model.cpp` read at 1080-1190 and 1385-1425. Candidates opened: ge_animation.hpp, ge_spm.cpp, ge_vulkan_animated_mesh_scene_node.cpp, CAnimatedMeshSceneNode.cpp, vector3d.h, quaternion.h, kart_model.cpp, animation_base.cpp (read in full: object IPO playback, no rig blend), three_d_animation.cpp and ipo.cpp (grep only: no rig blend). Not read: the Irrlicht non-SPM blend path (CAnimatedMeshSceneNode.cpp 851-878), the vertex skinning shader and `ge_spm_buffer` (how the skinning matrices reach the GPU), the kart animation frame setup (`AF_*` values), the physics side. Confidence: high on the sample, the frozen-pose blend direction and the steer mapping; medium on what the GPU skinning does with the matrices (not read). Camera: not a camera note.

## 1. Mechanism

- A skinned rig is an armature: joints with names and parents, a bind pose, and a list of key frames. Each key frame is an integer frame index plus one local location, rotation and scale per joint (ge_animation.hpp:40-145, read()).
- Sampling (`getInterpolatedMatrices`, ge_animation.hpp 193-241). Before the first key or at/after the last key, the pose is the first or last key (195-205). Inside the range the two keys around the frame are found, and the fraction `(frame - k1) / (k2 - k1)` is used (219-221). Location and scale are linear (231-238) and rotation is slerped between the two keys (233-235).
- Joint matrix (`getPose`, 147-177). The world matrix of each joint is composed from its parent chain (`getWorldMatrix`, 243-261). The skinning matrix is `world(joint) × inverseBind(joint)` (174-175). The inverse bind is computed once in `finalize` by sampling the bind frame and inverting the world matrix (ge_spm.cpp:55-64).
- Clock. Each frame, `GEVulkanAnimatedMeshSceneNode::OnAnimate` takes the millisecond delta since the last call (ge_vulkan_animated_mesh_scene_node.cpp 72-77), advances the frame counter with `buildFrameNr` (76), then calls `getSkinningMatrices` with the current frame and the transition state (79-80). The step is variable: it is the real frame delta. Irrlicht's `buildFrameNr` adds `timeMs × FramesPerSecond` to the frame when looping (CAnimatedMeshSceneNode.cpp:98), and `FramesPerSecond` is the speed given to `setAnimationSpeed` divided by 1000 (472). So a speed of 0 freezes the clock (kart_model.cpp:1169, then CAnimatedMeshSceneNode.cpp:98).
- Transition (freeze and blend). `setTransitionTime(T)` converts T seconds to whole milliseconds (ge_vulkan_animated_mesh_scene_node.cpp:127), sets the blend rate to 1/ms (129), sets the blend to 0 (130), and saves the current frame as the frozen frame (131). `buildFrameNr` then adds `timeMs × rate` to the blend each frame (CAnimatedMeshSceneNode.cpp:80-82). When the blend passes 1 the transition ends and calls `setTransitionTime(0)` (83-87), which clears the saved frame in the GE node (its lines 122-123).
- Blend (ge_animation.hpp 151-167). While a transition is active, the pose at the live frame is kept as `copied`, the pose at the frozen frame is sampled into the working array, and each joint is mixed: location and scale `frozen × (1 - rate) + live × rate` (158-166), rotation `slerp(frozen, live, rate)` (161-162). So rate 0 is the frozen pose and rate 1 is the live pose. The direction follows from `getInterpolated` (vector3d.h:249-250) and from slerp giving q1 at time 0 (quaternion.h:546).
- Where it is used. The kart calls `setTransitionTime(0.2f)` in two places: when the jump-start clip hands over to the default clip (the flag is set only in that case, kart_model.cpp:1099-1104, and applied at 1145-1146), and in the end-of-win or end-of-lose callback (1121). Every other clip switch snaps without a blend.
- Steering (kart_model.cpp:1397-1420). Only while the default clip is current (1397), the frame is a linear scrub from STRAIGHT toward RIGHT when steer > 0, `STRAIGHT - (STRAIGHT - RIGHT) × steer` (1411-1413), or toward LEFT when steer < 0, `STRAIGHT + (STRAIGHT - LEFT) × steer` (1414-1416). When the kart is reversing (`back`, 1403), the same rule uses the BACK_* frames (1405-1410). The frame is set with `setCurrentFrame` (1420), and time does not move it because the speed was set to 0 (1169).

## 2. Key functions

- `GE::Armature::getPose`: `/mnt/frankendom-donors/supertuxkart-stk-code/lib/graphics_engine/include/ge_animation.hpp` 147-177. Sample, blend with frozen pose, skinning matrices.
- `GE::Armature::getInterpolatedMatrices`: ge_animation.hpp 193-241. Key lookup, hold at ends, linear and slerp.
- `GE::Armature::getWorldMatrix`: ge_animation.hpp 243-261. Parent chain, memoised per pose.
- `GESPM::getSkinningMatrices` and `finalize`: `/mnt/frankendom-donors/supertuxkart-stk-code/lib/graphics_engine/src/ge_spm.cpp` 44-80.
- `GEVulkanAnimatedMeshSceneNode::OnAnimate` and `setTransitionTime`: `/mnt/frankendom-donors/supertuxkart-stk-code/lib/graphics_engine/src/ge_vulkan_animated_mesh_scene_node.cpp` 62-93 and 118-133.
- `CAnimatedMeshSceneNode::buildFrameNr`: `/mnt/frankendom-donors/supertuxkart-stk-code/lib/irrlicht/source/Irrlicht/CAnimatedMeshSceneNode.cpp` 78-100.
- `KartModel::setAnimation` and the steer update: `/mnt/frankendom-donors/supertuxkart-stk-code/src/karts/kart_model.cpp` 1094-1190 and 1397-1420.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Hold the end key outside the key range | no extrapolation (ge_animation.hpp:195-205) |
| Linear location and scale, slerp rotation between keys | fraction `(frame - k1)/(k2 - k1)` (219-221) |
| Frozen-pose blend, rate 0 frozen to 1 live | the rate is the blend, ms-based (ge_vulkan_animated_mesh_scene_node.cpp:127-131; CAnimatedMeshSceneNode.cpp:82) |
| Transition length | `0.2f` seconds at kart_model.cpp:1121 and 1146; converted to whole ms (ge_vulkan_animated_mesh_scene_node.cpp:127) |
| Transition ends when the blend passes 1 | `> 1.f` (CAnimatedMeshSceneNode.cpp:83) |
| Steer scrub, linear between STRAIGHT and LEFT or RIGHT | the steer value times the frame gap (kart_model.cpp:1411-1416); no clamp of steer seen |
| Clock frozen while scrubbing | speed 0 (kart_model.cpp:1169) |
| Frame rate stored per millisecond | `× 0.001f` (CAnimatedMeshSceneNode.cpp:472) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (advance the transition clock, then sample the live pose and blend it with the frozen one), the same key sampling rule (hold at the ends, linear between keys), the freeze-at-start and end-past-1 rules, and the steer mapping with its signs. It omits the rotation slerp (scalars are lerped), location and scale (one channel per key), the parent chain and the skinning matrix, the GPU path, the non-SPM Irrlicht blend, the backpedal frame set (the caller picks it), any clamp on steer (none is in the donor function), and the reset of the transition when the saved frame is cleared (the sketch returns null). Times are in milliseconds for the transition and in the caller's unit for frames.

```ts
// Licence: MIT (lib/graphics_engine/include/ge_animation.hpp), GPL-3.0-or-later (src/karts/kart_model.cpp). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Key { frame: number; value: number; }   // one scalar channel of one joint (donor: loc, rot, scale)

// Linear sample between the two keys around `frame`. Before the first key or at/after the last key, return the boundary key (no wrap).
function sample(keys: Key[], frame: number): number {
  const first = keys[0];
  const last = keys[keys.length - 1];
  if (frame < first.frame) return first.value;
  if (frame >= last.frame) return last.value;
  for (let i = 0; i + 1 < keys.length; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (frame >= a.frame && frame < b.frame) {
      const t = (frame - a.frame) / (b.frame - a.frame);
      return a.value * (1 - t) + b.value * t;
    }
  }
  return last.value;   // unreachable with sorted keys
}

// A transition freezes the frame the outgoing pose is on and blends from it to the live pose.
interface Transition { frozenFrame: number; durationMs: number; blend: number; }   // blend 0 = frozen pose, 1 = live pose

function startTransition(currentFrame: number, durationMs: number): Transition {
  return { frozenFrame: currentFrame, durationMs, blend: 0 };
}

// Advance the blend clock by dtMs. Once the blend passes 1 the transition ends and the live pose is used.
function stepTransition(t: Transition | null, dtMs: number): Transition | null {
  if (!t) return null;
  t.blend += dtMs / t.durationMs;
  return t.blend > 1 ? null : t;
}

// Pose value for one channel: live sample, or the frozen sample mixed in while a transition runs.
// Scalar lerp here; the donor lerps location and scale and slerps rotation.
function poseValue(keys: Key[], liveFrame: number, tr: Transition | null): number {
  const live = sample(keys, liveFrame);
  if (!tr) return live;
  const frozen = sample(keys, tr.frozenFrame);
  return frozen * (1 - tr.blend) + live * tr.blend;
}

interface SteerFrames { straight: number; left: number; right: number; }

// Steer in [-1, 1] scrubs the frame between STRAIGHT and RIGHT (positive) or LEFT (negative). Range is not checked here.
function steerFrame(steer: number, f: SteerFrames): number {
  if (steer > 0) return f.straight - (f.straight - f.right) * steer;
  if (steer < 0) return f.straight + (f.straight - f.left) * steer;
  return f.straight;
}

// One frame: the transition clock advances first, then the pose is sampled (donor: buildFrameNr, then getSkinningMatrices).
function frameStep(keys: Key[], liveFrame: number, tr: Transition | null, dtMs: number): { value: number; transition: Transition | null } {
  const next = stepTransition(tr, dtMs);
  return { value: poseValue(keys, liveFrame, next), transition: next };
}
```

## 5. Lands in

- TARGET `src/fight/hero-pose.ts` (client: hero pose switching with a frozen-pose blend and a one-value frame scrub; it never decides a hit, a guard or a state). Parity-checklist row 6 (hero actor/animation).
- today: not located in the Frankendom repo (not read).
- Reuse tag: rewrite-from-idea (clean-room, shape only; the getPose code is MIT, but the transition trigger and the steer mapping are GPL)
- Brief rule served: 1 (one engine, client-only presentation); rules 7-9 n/a

## 6. Gaps and risks

- Licence mix. The getPose shape is in an MIT file, but the trigger (`kart_model.cpp`) is GPL-3.0-or-later and the transition timer is Irrlicht (zlib notice). Frankendom takes the shape only and writes its own code.
- Client only. The frozen-pose blend and the steer scrub change what is drawn. Nothing here may decide a hit window, a guard or a death. Those come from the server-verified duel step (row 1). A pose frame must never time a hit.
- Transition is used sparingly in the donor. Only the jump-start to default hand-off (kart_model.cpp:1099-1104) and the win or lose end callback (1121) blend. Every other switch snaps. Frankendom should decide per move which switches blend, and write that in the catalogue (row 21), not leave it to code paths.
- Blend is per channel and linear for scalars. The donor slerps rotation and lerps the rest. A frozen pose blended with a live pose is correct only for the same rig and the same bind; the frame indexes must belong to one clip set.
- Steer is not clamped in the donor function. An input outside [-1, 1] extrapolates past the RIGHT or LEFT frame. Frankendom should clamp the scrub value in the engine (not in the pose), because it is a fight input (row 5).
- The clock is variable (frame delta from the caller). The transition length is in whole milliseconds (ge_vulkan_animated_mesh_scene_node.cpp:127). Frankendom must use the same unit everywhere (ms), and the catalogue fields should say so.
- Not read: the GPU skinning path (ge_spm_buffer and the shader), so the cost of the per-joint matrix work at many attackers is not measured. MAX_ATTACKERS = 3 bounds the number of rigs that would run this per frame.

Best transferable idea: freeze the outgoing pose at the frame it is on and blend it to the live pose over a short fixed time, and scrub a single 0-to-1 value (steer, or a stance lean) between a centre frame and two side frames.
Decision (proposed): adapt - the frozen-pose hand-off suits a hero landing back into a stance or leaving a hit-react without a pop, and the one-value scrub suits a client-only lean or stance depth; Frankendom keeps both on the client, takes the transition length and blend-on list from the catalogue, and clamps the scrub input in the engine.
Acceptance: a player sees a hero landing from a jump settle into the stance over the catalogue blend time with no pop, and a stance lean scrubs smoothly between centre, left and right frames; a unit test on `src/fight/hero-pose.ts` asserts that the blend equals the frozen sample at start and the live sample once the blend passes 1, and that a scrub input of 2 is clamped to 1 before the frame is picked.
