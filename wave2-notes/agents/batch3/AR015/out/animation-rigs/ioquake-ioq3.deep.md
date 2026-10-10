# ioquake-ioq3 (animation-rigs, cell 1)

Donor: `/mnt/frankendom-donors/ioquake-ioq3/code/cgame/cg_players.c` (clip clock 1138-1218, torso/legs yaw swing 1290-1344) with `/mnt/frankendom-donors/ioquake-ioq3/code/renderergl1/tr_animation.c`, `/mnt/frankendom-donors/ioquake-ioq3/code/renderergl1/tr_model_iqm.c`, `/mnt/frankendom-donors/ioquake-ioq3/code/cgame/cg_ents.c` | Licence: GPL-2.0-or-later (as read in the file headers: "either version 2 of the License, or (at your option) any later version"; `/mnt/frankendom-donors/ioquake-ioq3/COPYING.txt` is GPL v2) | C | symbols `CG_RunLerpFrame`, `CG_SwingAngles`, `CG_PositionRotatedEntityOnTag`, `RB_MDRSurfaceAnim`, `ComputePoseMats`

Checked: read in full: `CG_RunLerpFrame` (cg_players.c 1138-1218), `CG_SetLerpFrameAnimation` (1110-1128), `CG_PlayerAnimation` (1238-1275), `CG_SwingAngles` (1290-1344), `CG_PositionRotatedEntityOnTag` (cg_ents.c 59-85), `RB_MDRSurfaceAnim` (tr_animation.c 311-422), `QuatSlerp` (tr_model_iqm.c 107-141). Read in part: `ComputePoseMats` (tr_model_iqm.c 1165-1215; the rest not read), `LerpMeshVertexes_scalar` (tr_surface.c 612-678). Callers checked: `CG_PlayerAnimation` has one caller (cg_players.c 2295); `CG_RunLerpFrame` is called for legs, torso and flag (1261, 1263, 1270, 1753); `CG_SwingAngles` yaw calls 1424-1425 read, pitch call 1439 and flag call 1726 seen in grep only. Camera scope: not a camera cell. Confidence: high on the clock and the swing (read end to end, numbers checked against the lines); the 'no fast-forward after a stall' result is a hand trace of the code, not a run. Not read: `trap_R_LerpTag` (the engine side of tag lookup), the IQM vertex-influence loop (tr_model_iqm.c after 1297), `MD3_XYZ_SCALE`, the contents of any `animation.cfg`.

Best transferable idea: give each actor one clip clock that schedules frame times from the previous frame time (not the wall clock), starts a new clip after one frame of delay, and blends the old frame into the new with one backlerp weight, so every clip switch and every part attachment reads one number.
Decision (proposed): adapt - take the clock rules (scheduled frame times, one step per call, one-frame start delay, hold-then-next for non-looping clips, the 200 ms schedule guard) and the single backlerp weight as the shape of hero and creature clip switching; drop the MD3 vertex morph and the matrix blend, since Three.js does skinning and clip mixing. Client-side only: the engine never reads a pose.
Acceptance: a Pit hero that switches from guard to strike starts the strike clip one clip frame after the command and blends from the guard's last frame over that frame; a unit test feeds fake times to `advance` (work/ioquake-ioq3-clip-clock.ts) and asserts frame and backlerp at 0 ms, one frame and 1000 ms after a stall.

## 1. Mechanism

Three client-side layers in the donor (cgame and renderer; the server never sees a pose). No physics, no IK.

(a) Clip clock, one per body part. `CG_RunLerpFrame` (cg_players.c 1138) runs once per frame for each part (legs, torso, flag) and holds two frame indexes (`frame`, `oldFrame`) and two times (`frameTime`, `oldFrameTime`). The clip is the model's `animation_t`, whose frame rate comes from the model's `animation.cfg` (cg_players.c 593): `frameLerp = 1000 / fps` ms (245), with `initialLerp` set to the same value (246).
- Clip switch: when the requested animation number differs, `animationTime = frameTime + initialLerp` (1123). The new clip's first frame is exact one frame-length after the old schedule. The blend starts from whatever frame the old clip was on (`oldFrame` is copied from `frame` at the next step), so a switch is a blend in frame-index space inside one shared frame list.
- Step: only when `cg.time >= frameTime` (1155) does the clock move, and by one frame only: `oldFrame = frame`, `oldFrameTime = frameTime`, then `frameTime = oldFrameTime + frameLerp` (1167), or `animationTime` if the clip has not started yet (1164-1165). The frame index is the number of whole frames between `animationTime` and the new `frameTime` (1169), multiplied by `speedScale` (1170). Haste gives 1.5 (1252).
- Wrap: if the index passes `numFrames`, a looping clip subtracts and wraps into its last `loopFrames` frames (1177-1180). A non-looping clip holds on its last frame (1182) and sets `frameTime = cg.time` (1185), so the next clip may start at once.
- Catch-up and guard: if the clock is already past `frameTime`, `frameTime = cg.time` (1197-1198). A `frameTime` more than 200 ms ahead of now is pulled back to now (1205-1206). `oldFrameTime` later than now is pulled back (1209-1210).
- Blend weight: `backlerp = 1 - (cg.time - oldFrameTime) / (frameTime - oldFrameTime)` (1216), or 0 when the two times are equal (1213-1214). The renderer shows `frame` at backlerp 0 and `oldFrame` at backlerp 1.
- Two consequences, from the code and my hand trace (not run): the index comes from the schedule, not from the wall clock, so after a long stall the clip resumes from the next scheduled index and does not fast-forward; and the clock moves at most one frame per call, however large the time gap.
- Legs turn override: while the legs are yawing and the legs animation is the idle one, the legs clock runs the turn clip instead (1260-1261).

(b) Torso and legs yaw swing, `CG_SwingAngles` (1290-1344), called from `CG_PlayerAngles` (cg_players.c 1384) at 1424-1425. The legs aim at the head yaw plus the movement offset (1420), the torso at the head yaw plus 0.25 of it (1421). A part starts swinging only when its lag exceeds its tolerance: 25 degrees for the torso and 40 for the legs (1299, 1424-1425). It keeps swinging until it reaches the target (1323-1325). While swinging, it moves `cg.frametime * scale * speed` (1322), where `speed` is `cg_swingSpeed` (default 0.3, cg_main.c 249) and `scale` is 0.5, 1.0 or 2.0 by distance (1312-1317: below half the tolerance, below the tolerance, above it). `cg.frametime` is the ms difference of `cg.time` (cg_view.c 847). If the lag still exceeds the clamp of 90 degrees (1339), the angle is pulled to within 89 degrees of the target (1340).

(c) Pose blend and skinning, two renderer paths and one non-skeletal path. The base game's player parts are MD3 meshes (`models/players/%s/head.md3`, cg_players.c 559), not bones.
- MD3 vertex morph (tr_surface.c 612-678): each vertex is `old x backlerp x scale + new x (1 - backlerp) x scale` (629, 678). No skeleton.
- MDR bones (tr_animation.c 311-422): if `oldframe == frame` there is no blend (329). Otherwise every component of each 3x4 bone matrix is blended linearly, `frontlerp x frame + backlerp x oldFrame` (377). Each vertex is linear-blend skinned: sum of weight x (matrix x offset + translation) (398); normals use the rotation part only (402).
- IQM bones (tr_model_iqm.c 1165-1215): translate and scale are blended linearly with `backlerp` and `lerp = 1 - backlerp` (1187, 1191); rotation is a shortest-path slerp from old to new with `lerp` (114, 125-130, 1199). Joint matrices are then multiplied by the parent joint (1214) and the inverse bind matrix (1215). Vertex influence blending after 1297 was not read.

(d) Attachment points, `CG_PositionRotatedEntityOnTag` (cg_ents.c 59-85). The child's origin is the parent's origin plus the tag's origin expressed along the parent's axes (79). The tag itself is looked up at `1.0 - parent->backlerp` (73-74), so the attachment uses the same blend weight as the parent part. The child's axis is the tag axis times the parent axis (83). In the player, legs attach to the torso through `tag_torso` (cg_players.c 2348) and the torso to the head through `tag_head` (2574).

Time source: the animation clock runs on the server clock, `cg.time = serverTime` (cg_view.c 764). The renderer takes `backlerp` straight from the entity (tr_model_iqm.c 1272).

## 2. Key functions

- `CG_RunLerpFrame`: `/mnt/frankendom-donors/ioquake-ioq3/code/cgame/cg_players.c` 1138-1218. Clock step, wrap, guard and blend weight.
- `CG_SetLerpFrameAnimation`: `/mnt/frankendom-donors/ioquake-ioq3/code/cgame/cg_players.c` 1110-1128. Clip switch; sets `animationTime`.
- `CG_PlayerAnimation`: `/mnt/frankendom-donors/ioquake-ioq3/code/cgame/cg_players.c` 1238-1275. Legs (with turn override) and torso clocks; haste scale; one caller at 2295.
- `CG_SwingAngles`: `/mnt/frankendom-donors/ioquake-ioq3/code/cgame/cg_players.c` 1290-1344. Yaw follow with tolerance, speed bands and clamp; called from `CG_PlayerAngles` (1384) for yaw at 1424-1425.
- `CG_PositionRotatedEntityOnTag`: `/mnt/frankendom-donors/ioquake-ioq3/code/cgame/cg_ents.c` 59-85. Attachment of a child part to a tag.
- `RB_MDRSurfaceAnim`: `/mnt/frankendom-donors/ioquake-ioq3/code/renderergl1/tr_animation.c` 311-422. MDR bone blend and linear blend skinning.
- `QuatSlerp` and `ComputePoseMats`: `/mnt/frankendom-donors/ioquake-ioq3/code/renderergl1/tr_model_iqm.c` 107-141 and 1165-1215. IQM slerp and joint pose.
- `LerpMeshVertexes_scalar`: `/mnt/frankendom-donors/ioquake-ioq3/code/renderergl1/tr_surface.c` 612-678. MD3 vertex morph (read in part).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant (theirs) |
|---|---|
| Frame time from clip rate | `frameLerp = 1000 / fps` ms, fps per clip from `animation.cfg` (cg_players.c 245) |
| One-frame delay before a new clip starts | `initialLerp = 1000 / fps`, `animationTime = frameTime + initialLerp` (cg_players.c 246, 1123) |
| Frame index from the schedule | integer whole frames (cg_players.c 1169); `frameLerp` is an int, msec between frames (game/bg_public.h 537) |
| Haste speeds the clip | `speedScale = 1.5` (cg_players.c 1252) |
| Schedule-ahead guard | 200 ms (cg_players.c 1205) |
| Blend weight | `backlerp` in 0..1, 0 shows the new frame (cg_players.c 1216) |
| Torso yaw swing start | tolerance 25 degrees (cg_players.c 1424) |
| Legs yaw swing start | tolerance 40 degrees (cg_players.c 1425) |
| Swing clamp | 90 degrees; pulled to 89 (cg_players.c 1339-1340) |
| Torso share of movement offset | 0.25 (cg_players.c 1421) |
| Swing speed | `cg_swingSpeed` default 0.3, times frametime (cg_main.c 249; cg_players.c 1322) |
| Swing speed bands | 0.5 / 1.0 / 2.0 at half and full tolerance (cg_players.c 1312-1317) |
| Rotation blend | shortest-path slerp, linear fallback at cos >= 0.999999 (tr_model_iqm.c 114, 125) |
| Bone position blend (MDR) | linear over the 3x4 matrix components (tr_animation.c 377); no renormalise |

Units: all clock times are ms (`cg.time` is the server time in ms, cg_view.c 764). Angles are degrees (the `AngleSubtract` and `AngleMod` helpers; I did not read the header that defines them).

## 4. TypeScript sketch

simplified: the sketch keeps the clock order (start delay, one step per call, index from the schedule, speed scale, loop or hold, catch-up, the 200 ms guard, backlerp), the rotation slerp with the shortest path, and linear blend skinning of one point. It omits the `reversed` and `flipflop` clip modes, the legs turn override, the torso and legs yaw swing, the tag attachment, the MD3 vertex morph and the scale blend, the `frameLerp` truncation to int (the sketch uses floats), and the `cg_animSpeed` debug switch. It also omits the `frameTime == 0` early out for a clip with no frame length.
```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface ClipDef {
  firstFrame: number;    // first frame index in the model's frame list
  numFrames: number;     // frames in the clip
  loopFrames: number;    // 0 = plays once and holds; else the last loopFrames frames repeat
  fps: number;           // from the clip table; per-frame time = 1000 / fps ms
}

export interface Clock {
  clip: ClipDef | null;
  frame: number;          // current frame index
  oldFrame: number;       // frame the blend starts from
  frameTime: number;      // ms: when `frame` should be exactly on screen
  oldFrameTime: number;   // ms: when `oldFrame` was exactly on screen
  animationTime: number;  // ms: when the new clip's first frame is exact
  backlerp: number;       // 0 = show `frame`; 1 = show `oldFrame`
}

export interface Pose { frame: number; oldFrame: number; backlerp: number; }

// Switching clip: the new clip's first frame is reached after one frame of delay.
export function startClip(c: Clock, clip: ClipDef): void {
  c.clip = clip;
  c.animationTime = c.frameTime + 1000 / clip.fps;
}

// One call per rendered frame. `now` is the server clock in ms.
export function advance(c: Clock, now: number, speedScale: number): Pose {
  const clip = c.clip;
  if (clip === null) throw new Error("no clip started");
  const frameLerp = 1000 / clip.fps;

  if (now >= c.frameTime) {
    // move at most one frame per call, scheduled from the previous frame time
    c.oldFrame = c.frame;
    c.oldFrameTime = c.frameTime;
    c.frameTime = now < c.animationTime ? c.animationTime : c.oldFrameTime + frameLerp;

    let f = Math.trunc((c.frameTime - c.animationTime) / frameLerp);
    f = Math.trunc(f * speedScale);

    const numFrames = clip.numFrames;
    if (f >= numFrames) {
      f -= numFrames;
      if (clip.loopFrames > 0) {
        f = (f % clip.loopFrames) + (numFrames - clip.loopFrames);
      } else {
        f = numFrames - 1;     // hold on the last frame
        c.frameTime = now;     // and let the next clip start at once
      }
    }
    c.frame = clip.firstFrame + f;

    if (now > c.frameTime) c.frameTime = now;   // catch-up: never schedule in the past
  }

  if (c.frameTime > now + 200) c.frameTime = now;   // guard: schedule ahead of now by >200 ms
  if (c.oldFrameTime > now) c.oldFrameTime = now;

  c.backlerp = c.frameTime === c.oldFrameTime
    ? 0
    : 1 - (now - c.oldFrameTime) / (c.frameTime - c.oldFrameTime);
  return { frame: c.frame, oldFrame: c.oldFrame, backlerp: c.backlerp };
}

export type Quat = [number, number, number, number];
export interface JointPose { t: [number, number, number]; r: Quat; }

// Shortest-path slerp, as in the donor's QuatSlerp; `f` is the weight on `b`.
function slerp(a: Quat, b: Quat, f: number): Quat {
  let cos = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  const sign = cos < 0 ? -1 : 1;
  cos = Math.abs(cos);
  const bb: Quat = [sign * b[0], sign * b[1], sign * b[2], sign * b[3]];
  let wa: number;
  let wb: number;
  if (cos < 0.999999) {
    const angle = Math.acos(cos);
    const s = Math.sin(angle);
    wa = Math.sin((1 - f) * angle) / s;
    wb = Math.sin(f * angle) / s;
  } else {
    wa = 1 - f;
    wb = f;
  }
  return [
    a[0] * wa + bb[0] * wb,
    a[1] * wa + bb[1] * wb,
    a[2] * wa + bb[2] * wb,
    a[3] * wa + bb[3] * wb,
  ];
}

// Blend one joint: `backlerp` weights the OLD pose, the rest the NEW pose.
export function blendJoint(oldP: JointPose, newP: JointPose, backlerp: number): JointPose {
  const lerp = 1 - backlerp;
  return {
    t: [
      oldP.t[0] * backlerp + newP.t[0] * lerp,
      oldP.t[1] * backlerp + newP.t[1] * lerp,
      oldP.t[2] * backlerp + newP.t[2] * lerp,
    ],
    r: slerp(oldP.r, newP.r, lerp),
  };
}

// Linear blend skinning for one point: sum of weight * (bone matrix applied to offset).
// mats[j] is a row-major 3x4 matrix as 12 numbers (row i = m[4i..4i+3]).
export interface Influence { joint: number; weight: number; offset: [number, number, number]; }
export function skinPoint(mats: number[][], infl: Influence[]): [number, number, number] {
  const out: [number, number, number] = [0, 0, 0];
  for (const w of infl) {
    const m = mats[w.joint];
    for (let i = 0; i < 3; i++) {
      out[i] += w.weight * (m[4 * i] * w.offset[0] + m[4 * i + 1] * w.offset[1] + m[4 * i + 2] * w.offset[2] + m[4 * i + 3]);
    }
  }
  return out;
}
```

## 5. Lands in

- TARGET `src/fight/actor-anim.ts` (new, client-side only): the hero and creature clip clock and pose blend. The engine never reads a pose; the fight state (the duel step, a hit, a guard) stays in the engine and the clip only shows it.
- Parity-checklist row 6 (hero actor/animation). Creature clips (row 7) would use the same clock with their own clip table.
- Server tick sub-line: the donor drives the clock from the server time handed to each frame (cg_view.c 764). For Frankendom that means the clip clock reads the server tick sub-line "server tick: fixed step, input intake, per-tick NPC budget" (row 18 / post-K item 3), not the client's wall clock, so a late client does not drift its hit-reaction clip away from the server.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one engine, two clients: the clock is presentation and the engine owns the state); rules 7-9 n/a

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch was written from the described mechanism and typechecks with `tsc --strict`; it is not a translation of the C.
- Stall behaviour: after a stall the clock resumes from the next scheduled index (hand trace of 1155-1169 and 1197-1199), not from the wall-clock index. For a hit-reaction or a guard clip this can look like a pause. Test it on the Pit before adopting; do not assume the donor's choice is the right one for a fight.
- Frankendom rules: the clock must never decide a hit. A hit-reaction clip is presentation; the kill and the damage are server-verified (ruling), so the clip may lag the server by a few frames but must not change the result.
- Data fields: fps per clip, clip start delay, the 200 ms guard, the swing tolerances and the swing speed are client tuning. The schema allows only zone data or engine constant as `where`; per-clip and per-actor values are catalogue data (row 21), so I labelled them "zone data" as the nearer of the two, and flagged that in the sidecar.
- Matrix blend (MDR) is linear in the matrix components with no renormalise (tr_animation.c 377). A large rotation between two frames can distort the bone; the IQM path slerps the rotation instead. Choose slerp for Frankendom.
- Player "skeleton" in the base game is MD3 mesh parts linked by tags, with a vertex morph between frames, not bones (cg_players.c 559; tr_surface.c 678). The bone paths exist (MDR, IQM) but I did not check which models in the donor use them.
- The cvars `cg_swingSpeed` and `cg_animSpeed` are CVAR_CHEAT (cg_main.c 249-250). Frankendom should expose them as client tuning, not as player-facing settings.
- Not read: `trap_R_LerpTag` (engine tag lookup), the IQM vertex influence loop, `MD3_XYZ_SCALE`, the `animation.cfg` files, the rest of `ComputePoseMats` after 1215, and whatever Three.js or Frankendom's own hero rig already does.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: 1 (one engine, two clients); rules 7-9 n/a
