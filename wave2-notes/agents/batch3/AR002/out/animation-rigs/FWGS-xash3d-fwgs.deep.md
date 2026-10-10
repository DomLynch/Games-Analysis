# FWGS-xash3d-fwgs (animation-rigs, cell 2)

Donor: `/mnt/frankendom-donors/FWGS-xash3d-fwgs/engine/common/mod_studio.c` (`SV_StudioSetupBones`, 631-730; client twin `R_StudioSetupBones` in `/mnt/frankendom-donors/FWGS-xash3d-fwgs/ref/gl/gl_studio.c`, 815-905) | Licence: GPL-3.0-or-later per the source headers (gl_studio.c line 7 and mod_studio.c line 7: "either version 3 of the License, or (at your option) any later version"; public/xash3d_mathlib.c has the same wording); no LICENSE file at the donor root (checked with ls) | C | symbol `SV_StudioSetupBones`

Checked: The hint file `engine/client/cl_sprite.c` is the sprite loader. `R_GetSpriteFrame` (33-70, read to line 70) picks a sprite group frame by time modulo the group's full interval (67). That is a flipbook, not a rig, so it is not the mechanism. The rig is the studio (.mdl) pose path, read as follows: `engine/common/mod_studio.c` 448-540 (Mod_StudioCalcBoneAdj, Mod_StudioCalcRotations) and 631-730 (SV_StudioSetupBones), 731-790 (Mod_StudioGetAttachment, Mod_GetBonePosition, read in full); `public/xash3d_mathlib.c` 436-510 (R_StudioCalcBones, read in full) and `public/xash3d_mathlib.h` 583-592 (R_StudioSlerpBones); `ref/gl/gl_studio.c` 555-606 (estimate frame and interpolant), 658-752 (controller blend and client rotations; R_StudioCalcBoneAdj read in part, its value and mouth branches only), 760-806 (R_StudioMergeBones), 815-905 (R_StudioSetupBones, read to the latch branch; lines after 905 not read), 965-975 (R_StudioSaveBones); `engine/client/cl_frame.c` 261-290 (CL_ResetLatchedVars) and the call sites at 589 and 1153. Callers of the server pose: reached from Mod_StudioGetAttachment (761, 787) and from the hull code at 400 (that hull code, Mod_HullForStudio 371-447, was not read). Not read: the hitbox builder, R_StudioCalcAttachments (gl_studio.c 1161), R_StudioFxTransform, and any path that calls CL_ResetLatchedState on a plain sequence change. Confidence: high on the pose math and the 0.2 s transition window; medium on when the transition latch is set (see section 6). camera_scope: not applicable (not a camera topic).

## 1. Mechanism

A studio model carries bones (each with a parent), named sequences (a clip with a frame count, an fps, a looping flag and a motion bone), per-bone channels (three translations and three rotations per clip), bone controllers (named 0-255 inputs with a start and end), attachment points (a bone plus a local offset), and per-entity blend and controller values. The donor turns these into one world matrix per bone. The code read is the pose path only; the renderer that uses the matrices was read only where it touches the pose.

Server pose, `SV_StudioSetupBones` (631-730), in the order the code runs:
- It evaluates a requested bone list. A bone index of -1 means all bones, parents first. Any other index evaluates only that bone's parent chain (677). Attachments use this cheap path, because a bone's pose needs only its ancestors.
- Frame: `f = (frame * (numframes - 1)) / 256` (682). The entity's stored frame is a 0-255 position across the clip.
- Primary clip: per-bone rotations at f with the controller offsets (684).
- Blend: if the sequence has more than one blend (686), a second clip is evaluated at the same f and slerped with weight `pblending[0] / 255` (693-695). If the sequence has four blends, two more clips are slerped in pairs, and the pairs are slerped with `pblending[1]` (read at 697-709).
- World: the root bones multiply the entity transform, and each child multiplies its parent's matrix (the last loop of the function).

Client frame clock, `R_StudioEstimateFrame` (ref/gl/gl_studio.c 561-590): `f` is the stored frame position (573) plus `(time - animtime) * framerate * fps` (568). The entity's `framerate` is a playback multiplier and the clip's `fps` is the clip's own rate. A looping sequence wraps modulo `(numframes - 1)` (581). A non-looping sequence stops just short of its last frame (585).

Per-bone sampling, `R_StudioCalcBones` (public/xash3d_mathlib.c 436-510): each bone has six channels. Each channel is stored as blocks of samples with a count of valid and total entries. The function walks the blocks to find frame j and reads the sample after it (v1 at j, v2 at j+1). Each value is `bone.value + stored * bone.scale + controller offset` (489). Position is lerped by the fractional frame s (494), and the rotation angles become a quaternion that is slerped by s (506). The bracket frame and s are computed once per clip evaluation (Mod_StudioCalcRotations), and the same frame and s are used for every bone and channel.

Bone controllers, server `Mod_StudioCalcBoneAdj` (448-500) and client `R_StudioCalcBoneAdj` (658-710): a raw 0-255 value is divided by 255 and clamped to 0..1, then mapped as `(1 - v) * start + v * end` (473 on the server). Rotation controls convert degrees to radians (483 on the server, 703 on the client). The mouth is a special case: the server skips it (460-461), and the client drives it from the mouth opening divided by 64 (670). On the client, controller values are mixed between the current and the latched previous values by `dadt` (692).

Client blend crossfade (gl_studio.c 841, 853, 856): blend weights are mixed between the current entity value and the latched previous value by `dadt`. `dadt` is `(time - animtime) / 0.1`, clamped to 2 (604-605).

Sequence transition, client (gl_studio.c 861-903): for 0.2 s after `latched.sequencetime` (861), the previous clip is evaluated at the frozen `latched.prevframe`, and the live pose is slerped toward it with `s = 1 - (time - sequencetime) / 0.2` (897-898). Outside that window the code writes `prevframe = f` each frame (903), so the freeze lasts only for the window. The latch is set by `CL_ResetLatchedVars(ent, true)`: it stores `sequencetime = animtime` (270) and `prevframe` = the estimated frame of the old state (273). It is called from cl_frame.c 589 and 1153.

Root motion: the clip's translation on the motion bone is zeroed on the axes the sequence marks (server 535-537; client 749-751). The clip's own travel is removed, so game code moves the entity.

Attachment points, `Mod_StudioGetAttachment` (731-778): with no attachments, the function returns the entity origin (742). Otherwise it evaluates the attachment's bone chain (`SV_StudioSetupBones` with the attachment bone, 761), takes that bone's world matrix and multiplies it by the attachment's local origin (765). Pitch is negated unless the compensate flag is set (758-759).

Child model merge, client `R_StudioMergeBones` (760-806, called for the weapon at 3095): a weapon or gear model is drawn on the host skeleton. For each child bone, the code searches the host's cached bones with a case-insensitive name compare (780). If a match exists, the child bone takes the host's world matrix. If not, the bone is computed from its own pose: a root bone uses the rotation matrix (792 and the branch after it), and a child bone multiplies its parent's matrix. The host's names and matrices are saved when the host is drawn (971).

Clock and timing: the client uses `g_studio.time`. The server pose is computed on demand, by the attachment and bone queries (761, 787). I did not read a per-tick caller, so the server tick is not described.

## 2. Key functions

- `SV_StudioSetupBones`: `/mnt/frankendom-donors/FWGS-xash3d-fwgs/engine/common/mod_studio.c` 631-730. Bone list, frame, primary and blend clips, world matrices.
- `Mod_StudioCalcRotations` and `Mod_StudioCalcBoneAdj`: `/mnt/frankendom-donors/FWGS-xash3d-fwgs/engine/common/mod_studio.c` 448-540. Controller mapping and frame clamp, root-motion strip (535-537).
- `R_StudioCalcBones`: `/mnt/frankendom-donors/FWGS-xash3d-fwgs/public/xash3d_mathlib.c` 436-510. Per-bone sampling, lerp and quaternion slerp.
- `R_StudioEstimateFrame`: `/mnt/frankendom-donors/FWGS-xash3d-fwgs/ref/gl/gl_studio.c` 561-590. Client frame clock.
- `R_StudioSetupBones` (client): `/mnt/frankendom-donors/FWGS-xash3d-fwgs/ref/gl/gl_studio.c` 815-905. Two-clip blends and the 0.2 s transition.
- `Mod_StudioGetAttachment`: `/mnt/frankendom-donors/FWGS-xash3d-fwgs/engine/common/mod_studio.c` 731-778. Attachment point as bone times local offset.
- `R_StudioMergeBones`: `/mnt/frankendom-donors/FWGS-xash3d-fwgs/ref/gl/gl_studio.c` 760-806. Child (weapon or gear) bones matched by name.
- `CL_ResetLatchedVars`: `/mnt/frankendom-donors/FWGS-xash3d-fwgs/engine/client/cl_frame.c` 261-290. Latch for the transition.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Stored frame as a 0-255 position across the clip | divide by 256 (mod_studio.c 682; gl_studio.c 573) |
| Clip time advance: elapsed * entity rate * clip fps | rate is the entity's framerate field, fps is the clip's (gl_studio.c 568) |
| Looping wrap; non-looping clamp just short of the last frame | modulo (numframes - 1) (gl_studio.c 581); clamp at numframes - 1.001 (585) |
| Controller raw value to range | raw / 255, clamp 0..1 (mod_studio.c 473) |
| Rotation controls in degrees | `value * (M_PI_F / 180.0f)` (mod_studio.c 483); `DEG2RAD` (gl_studio.c 703) |
| Blend weight from a byte | `pblending[0] / 255` (mod_studio.c 693) |
| Client controller and blend crossfade | `dadt = (time - animtime) / 0.1`, clamped at 2 (gl_studio.c 604-605) |
| Transition window after a latch | 0.2 s (gl_studio.c 861, 897) |
| Mouth controller from opening | opening / 64 (gl_studio.c 670); server skips the mouth (mod_studio.c 460-461) |
| Frozen previous pose during the transition | prevframe written only outside the window (gl_studio.c 903) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's frame clock (wrap and clamp), the quaternion slerp and the 0.2 s frozen-pose transition with the donor's weight formula, the root-motion strip, and the attachment formula (bone position plus the local offset rotated by the bone quaternion). It omits: the run-length channel decoding (the sketch takes an already sampled pose), the donor's controller crossfade and mouth rule, the four-way blend (only one slerp is shown), the parent-chain-only evaluation, the hitbox path, and the donor's matrix form (the sketch uses position and quaternion). Unmatched bones in `mergeByName` keep their own pose without composing the parent chain. Controller values are returned in the clip's units and degree conversion is left to the caller. The block below is the typechecked file; the file adds `export {}` at the end.

```ts
// clean-room sketch of client-side studio pose evaluation (donor licence GPL-3.0-or-later: shape only, not a translation)
export type Vec3 = [number, number, number];
export type Quat = [number, number, number, number]; // x, y, z, w
export interface Pose { pos: Vec3; q: Quat; }

// Frame clock: stored frame is 0..255 across the clip; rate is the entity's playback multiplier; fps is the clip's.
export function clipFrame(stored: number, numFrames: number, looping: boolean,
  secSinceStart: number, fps: number, rate: number): number {
  if (numFrames <= 1) return 0;
  const span = numFrames - 1;
  let f = (stored * span) / 256 + secSinceStart * rate * fps;
  if (looping) {
    f = f % span;
    if (f < 0) f += span;
  } else {
    f = Math.min(Math.max(f, 0), span - 0.001); // stop just short of the last frame
  }
  return f;
}

export function lerpVec(a: Vec3, b: Vec3, s: number): Vec3 {
  return [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s, a[2] + (b[2] - a[2]) * s];
}

function normQuat(q: Quat): Quat {
  const n = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return [q[0] / n, q[1] / n, q[2] / n, q[3] / n];
}

export function slerp(a: Quat, b: Quat, s: number): Quat {
  let dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  const bb: Quat = dot < 0 ? [-b[0], -b[1], -b[2], -b[3]] : b;
  dot = Math.abs(dot);
  if (dot > 0.9995) {
    return normQuat([a[0] + (bb[0] - a[0]) * s, a[1] + (bb[1] - a[1]) * s,
      a[2] + (bb[2] - a[2]) * s, a[3] + (bb[3] - a[3]) * s]);
  }
  const theta = Math.acos(dot);
  const sinT = Math.sin(theta);
  const wa = Math.sin((1 - s) * theta) / sinT;
  const wb = Math.sin(s * theta) / sinT;
  return [wa * a[0] + wb * bb[0], wa * a[1] + wb * bb[1], wa * a[2] + wb * bb[2], wa * a[3] + wb * bb[3]];
}

// Controller value (raw 0..255) mapped into [start, end]; the donor applies the same rule to bend and twist controls.
export function controllerValue(raw: number, start: number, end: number): number {
  const v = Math.min(1, Math.max(0, raw / 255));
  return (1 - v) * start + v * end;
}

// Transition: for the first 0.2 s after a latch reset, slerp from the live pose toward the frozen previous-clip pose.
export function transitionPose(live: Pose, frozenPrev: Pose, sinceResetSec: number, windowSec = 0.2): Pose {
  const s = 1 - sinceResetSec / windowSec;
  if (!(s > 0)) return live;
  const t = Math.min(1, s);
  return { pos: lerpVec(live.pos, frozenPrev.pos, t), q: slerp(live.q, frozenPrev.q, t) };
}

// Root motion: the motion bone's translation is zeroed on the axes the clip marks, so game code moves the character.
export function stripRootMotion(pos: Vec3, axes: { x: boolean; y: boolean; z: boolean }): Vec3 {
  return [axes.x ? 0 : pos[0], axes.y ? 0 : pos[1], axes.z ? 0 : pos[2]];
}

// Attachment point: rotate the local offset by the bone's rotation and add the bone position.
export function attachmentPosition(bone: Pose, local: Vec3): Vec3 {
  const [x, y, z] = local;
  const [qx, qy, qz, qw] = bone.q;
  // v' = v + 2w(q x v) + 2 q x (q x v), with q = (qx,qy,qz)
  const cx = qy * z - qz * y, cy = qz * x - qx * z, cz = qx * y - qy * x;
  const ccx = qy * cz - qz * cy, ccy = qz * cx - qx * cz, ccz = qx * cy - qy * cx;
  return [
    bone.pos[0] + x + 2 * (qw * cx + ccx),
    bone.pos[1] + y + 2 * (qw * cy + ccy),
    bone.pos[2] + z + 2 * (qw * cz + ccz),
  ];
}

// Weapon or gear model: a child bone copies the host pose of a same-named bone (case-insensitive).
// Simplified: a bone with no host match keeps its own pose and the child's parent chain is not composed.
export function mergeByName(childBones: string[], host: Map<string, Pose>, own: Pose[]): Pose[] {
  return childBones.map((name, i) => host.get(name.toLowerCase()) ?? own[i]);
}
```

Best transferable idea: On a clip change, hold the old pose frozen and blend it out over a fixed 0.2 s, and place attachments as a bone pose plus a local offset, while stripping the clip's root motion so the game moves the character.

Decision (proposed): adapt - take the frozen-previous-pose transition (0.2 s), the root-motion strip, and the name-based gear merge with indexes resolved once at load; do not port the channel decoder or the matrix code, because three.js's animation mixer already evaluates skeletal clips (general knowledge of the library, not checked in this repo) and the donor's channel format is not ours.

Acceptance: in the browser, when the hero goes from idle to a strike, the old pose holds for 0.2 s and then blends into the strike without a snap; the hero's stride matches the movement speed the game applies, because the clip's root travel is removed; a sword mesh attached to the hand bone stays in the grip on every frame of the strike.

Reuse tag: adapt-from-idea (GPL-3.0-or-later; clean-room only)
Brief rule served: 1 (one engine, two clients: pose evaluation stays on the client, and the engine never reads a pose or a transform to decide a hit or a movement); row 6 hero actor/animation.

## 5. Lands in

- TARGET `origins/client/rig/pose.ts` (new, client only; path proposed, repo layout not checked in this task). The engine never imports it.
- Parity-checklist row 6 (hero actor/animation).
- Frankendom gap check: src/fight decides movement and hits. The pose module reads the game's speed and state and never writes them.

## 6. Gaps and risks

- The transition latch is not shown to fire on every clip change. The 0.2 s blend starts only from `CL_ResetLatchedVars(ent, true)` (cl_frame.c 589 and 1153), and I did not find the path that makes a plain sequence change call it. Frankendom's state machine must call the transition explicitly and must not assume the donor's trigger.
- Two-way and four-way blends are the only donor forms, and four-way is fixed as two pairs with two weights (mod_studio.c around 697-709; gl_studio.c 845-857). Fight states that need more than four clips need a different blend structure.
- The mouth controller is hard-wired to index 4 with a divisor of 64 (gl_studio.c 670). Frankendom has no mouth; leave it out, do not copy the constant.
- Root-motion stripping makes the game the source of travel, so foot-slide appears whenever game speed and clip cadence disagree. The donor has no foot lock (not read: no such code found in the paths read). Frankendom needs the speed-to-rate mapping as data per clip.
- The name merge (gl_studio.c 780) is a case-insensitive string compare inside a bone loop, run every frame for each child model. Frankendom should resolve bone indexes once at load (gear dressing, row 15).
- Hitboxes are a separate path in this donor (Mod_HullForStudio, mod_studio.c 371-447, not read). If Frankendom ever tests hits against bones, the test lives in src/fight data and the server, never in the pose code, so kills stay server-verified.
- The donor's pose is computed on demand on the server (761, 787); I did not find the per-tick server caller, so there is no server tick claim here.
- Licence: GPL-3.0-or-later. Clean-room: the sketch is written from the mechanism. The receipts quote the donor's structure only.
