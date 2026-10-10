# veloren-veloren (animation-rigs, cell 2)

Donor: `/mnt/frankendom-donors/veloren-veloren/voxygen/anim/src/biped_large/run.rs` (with `biped_large/mod.rs`, `anim/src/lib.rs`, `voxygen/src/scene/figure/mod.rs`) | Licence: GNU GPL version 3 (`LICENSE`, lines 1-2, read; the repo has no other licence text for code) | Rust | symbol `RunAnimation::update_skeleton_inner`, `BipedLargeSkeleton::compute_matrices_inner`, figure `update`

Checked: Read in full: `biped_large/run.rs` (439 lines); `biped_large/mod.rs` 26-141 (bone set and forward kinematics), 572-582 (tempo table start), 698-775 (mount transform); `anim/src/lib.rs` 1-240 (bone type, `Animation` trait, skeleton lerp macro); the figure dispatch for biped_large (`voxygen/src/scene/figure/mod.rs` 5559-5624) and the blend line (6268); the accumulator and smoothing in the figure `update` method (8423-8483, 8629-8652). Not read: the other 22 biped_large animation files (only `run.rs` is cited); `jump.rs`, `idle.rs` (named only in the dispatch); `SkeletonAttr::from` body table (`mod.rs` 218-697, species data); the `vek` Transform lerp (orientation interpolation not traced); the rest of figure `update`. Confidence: high on the chain (bones, gait phase, accumulator, per-frame blend). Medium on the hidden second weapon during run (read in code only, not seen in game). Camera scope: not applicable.

## 1. Mechanism

- Rig: 16 mesh bones and 10 non-mesh control bones (`biped_large/mod.rs` 46-71; the 16 equals `MAX_BONE_COUNT` at `anim/src/lib.rs` 113). Control bones are not drawn: `torso`, `control`, `control_l/r`, `weapon_l/r`, `leg_control_l/r`, `arm_control_l/r`. Composition is forward kinematics (`compute_matrices_inner`, `mod.rs` 87-140): a leg or hand is its control bone times its own transform, and the hand composes arm control, weapon control and hand.
- An animation is a pure function. `update_skeleton_inner` takes a template skeleton, a dependency tuple, the state time, an out-parameter `rate`, and body attributes, and returns a new skeleton (`anim/src/lib.rs` 198-216). The figure passes a fresh `BipedLargeSkeleton::default()` as the template (`figure/mod.rs` 5600). The run starts from a clone of it (`run.rs` 44). The animation holds no state of its own.
- Gait phase (`run.rs` 50-104, 120-131): the gait phase is `acc_vel * lab`, where `lab = 0.65 * tempo` (50). `acc_vel` is an accumulated distance-like value (see below). Step size `speednorm` is the capped speed (`min(speed, 16) / 12`) raised to 0.6 (51). Each foot's vertical offset is a sine of the phase times step size (54-55). The foot rotation uses a squared-sine normalised shape that is flatter at the extremes than a plain sine (57-61; the exact shape is not copied here). Hip phases differ by pi between left and right (120-121 use 1.45 pi and 0.45 pi).
- Speed for offsets is the instantaneous velocity `speed = |rel_vel|` (45), while the phase uses the accumulator. The two are separate: amplitude follows what the body is doing now; the step timing follows how far it has gone.
- Lean: the angle between current and last facing, clamped to 0.2 and then multiplied by 1.3, tilts the upper body (106-118).
- Choice of pose (`figure/mod.rs` 5593-5624): on ground and moving (`rel_vel` squared above 0.2 squared; `MOVING_THRESHOLD` 96) gives run (`true, true, false`, 5599); airborne gives jump (5617); everything else falls to idle (5624).
- The accumulator (`figure/mod.rs` 8629-8652, in the figure `update`): smoothed velocity `avg_vel = 0.1^dt * avg_vel + (1 - 0.1^dt) * (pos - last_pos) / dt` (8629-8631). Rate is the magnitude of `avg_vel` relative to ground (8648 for a biped_large, since only humanoids take the other branch at 8645-8646). `acc_vel += rate * dt / scale` (8650). If `avg_vel` is exactly zero, `acc_vel` is reset to zero (8636, 8652). Because the smoothed speed decays toward zero after the entity stops, the phase stops advancing but is not reset in the normal case; the reset is for exact zero only (reasoned from the code, not measured).
- Animation clock: `state_time += dt * rate / scale` (8483). Body scale slows the clock. The run sets `rate` to 1.0 (48, not receipted). The run's look vector uses `global_time` and `anim_time` with a floor step (72-83), so the head and jaw jitter in steps.
- Blend: once per frame the figure sets `state.skeleton = lerp(state.skeleton, target_bones, dt_lerp)` with `dt_lerp = min(15 * dt, 1)` (`figure/mod.rs` 996, 6268). The lerp is per bone (`anim/src/lib.rs` 46-71). The stored skeleton is the only memory of the pose; continuity comes from this one blend.
- Lean reference: `last_ori` is blended with `15 * dt` too (8481).
- Frame rate: `dt` is the frame delta (`figure/mod.rs` 995). Velocity smoothing is an exact per-second retention. The pose blend is linear per frame: for short frames it approximates an exponential at 15 per second; any frame longer than 1/15 s (about 67 ms) snaps the pose to the target (derived from the formula, not measured).
- Attachment points: (a) weapons. `run.rs` 293-322 places the `main` and `second` weapon bones per tool kind (bow, staff or sceptre, sword, hammer or axe, default) with fixed offsets and rotations; `run.rs` 139-140 sets `hold.scale` and `second.scale` to zero during run. (b) riders and mounts: `mount_transform` (`mod.rs` 722-775) takes a per-species offset table (729-766) and transforms it by the right shoulder chain (`mount_mat`, 698-720; 712).
- Tick: no fixed step. The gait is distance-driven (accumulator); the animation clock and the blend are frame-driven (`dt`).

## 2. Key functions

- `compute_matrices_inner`: `/mnt/frankendom-donors/veloren-veloren/voxygen/anim/src/biped_large/mod.rs` 87-140. Bone-to-matrix chain and buffer write (138).
- `Animation` trait: `/mnt/frankendom-donors/veloren-veloren/voxygen/anim/src/lib.rs` 198-216. Signature and the pure-function contract.
- `RunAnimation::update_skeleton_inner`: `/mnt/frankendom-donors/veloren-veloren/voxygen/anim/src/biped_large/run.rs` 28-438. Gait 44-131; lean 106-118; weapon bones by tool kind 293-322; float branch 413-435.
- Figure dispatch and template: `/mnt/frankendom-donors/veloren-veloren/voxygen/src/scene/figure/mod.rs` 5559-5624.
- Accumulator and smoothing: same file, 8629-8652; clock and lean reference 8481-8483.
- Blend: same file, 996 and 6268.
- Mount: `/mnt/frankendom-donors/veloren-veloren/voxygen/anim/src/biped_large/mod.rs` 698-775.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Gait phase = accumulated distance times a frequency factor times a per-creature tempo | `lab = 0.65 * tempo` (theirs, `run.rs` 50); tempo table per species, sample rows 0.9 and 0.8 (theirs, `mod.rs` 574-582) |
| Step size from speed: capped, divided, power | cap 16, divisor 12, power 0.6 (theirs, `run.rs` 51) |
| Moving test on relative velocity | 0.2, squared in the test (theirs, `figure/mod.rs` 96) |
| Pose blend per frame toward the target | `min(15 * dt, 1)` (theirs, `figure/mod.rs` 996) |
| Velocity smoothing per second | retention 0.1 per second, exact form `0.1^dt` (theirs, `figure/mod.rs` 8629) |
| Lean reference blend | 15 * dt (theirs, `figure/mod.rs` 8481); lean clamp 0.2 (theirs, `run.rs` 114) |
| Body scale divisor for the bone matrices | `scaler / 8` (theirs, `mod.rs` 93) |
| Mount offsets per species | per-species table in code (theirs, `mod.rs` 730-766; not copied) |

## 4. TypeScript sketch

simplified: keeps the donor's chain (smoothed velocity, then a distance accumulator divided by scale, then phase = accumulator times tempo, then the feet as half-cycle-apart waves, then a per-frame blend of the stored pose, then attachment points as an offset in a parent bone's frame). It uses our own saturating wave in place of the donor's sine-over-root form and a linear step ramp in place of the donor's power curve; the sample constants are ours. It omits: the look jitter, the tilt, the tool-kind weapon branches, the humanoid exponent, the float branch, the hold and second-weapon visibility, the bone matrices and the buffer write, and the terrain. Its blend offers both the donor's linear form and our exponential form, and the exponential form does not snap on long frames.

```ts
// Licence: clean-room sketch written from the mechanism in the donor note (donor is GPL-3.0; no donor lines or formulas copied).
// Sample values below are ours, not the donor's.

export interface Vec3 { x: number; y: number; z: number; }
// One bone: local offset from its parent and one hinge angle about the x axis (radians). Quaternions omitted.
export interface Bone { p: Vec3; rx: number; }
export interface World { p: Vec3; rx: number; }
export type Rig = Record<string, Bone>;

// Tunable data. Donor values were read, not copied.
const PHASE_PER_DISTANCE = 0.65; // radians of gait phase per unit of accumulated distance at tempo 1
const SPEED_CAP = 16;            // speed used for step size is capped here
const SPEED_FULL = 12;           // step size reaches 1.0 at this speed
const BLEND_RATE = 15;           // per second; pose blend toward target
const SMOOTH_BASE = 0.1;         // velocity smoothing: kept fraction per second
const MOVING_EPS = 0.2;          // speed below this counts as standing still

// 1) Phase accumulator: unsigned distance-like integral, divided by body scale.
export function accumulatePhase(acc: number, speed: number, dt: number, scale: number): number {
  return acc + (speed * dt) / scale;
}

// Velocity smoothing with an exact per-second retention (frame-rate independent).
export function smoothVelocity(prev: Vec3, sample: Vec3, dt: number): Vec3 {
  const keep = Math.pow(SMOOTH_BASE, dt);
  return {
    x: keep * prev.x + (1 - keep) * sample.x,
    y: keep * prev.y + (1 - keep) * sample.y,
    z: keep * prev.z + (1 - keep) * sample.z,
  };
}

export function isMoving(v: Vec3): boolean {
  return v.x * v.x + v.y * v.y + v.z * v.z > MOVING_EPS * MOVING_EPS;
}

// 2) Foot phase per body. tempo is per creature (data), not per zone.
export function gaitAngle(acc: number, tempo: number): number {
  return acc * PHASE_PER_DISTANCE * tempo;
}

// Our own saturating wave (not the donor's sin over sqrt form): a planted foot holds near its extremes.
export function footWave(theta: number, sharp: number): number {
  return Math.tanh(sharp * Math.sin(theta)) / Math.tanh(sharp);
}

// Left and right feet are half a cycle apart.
export function footPair(theta: number): { left: number; right: number } {
  return { left: footWave(theta, 3), right: footWave(theta + Math.PI, 3) };
}

// Step amplitude grows with speed, capped.
export function stepAmount(speed: number): number {
  return Math.min(speed, SPEED_CAP) / SPEED_FULL;
}

// 3) Forward kinematics for one hinge chain: translate by the local offset rotated by the parent's angle.
export function compose(parent: World, local: Bone): World {
  const c = Math.cos(parent.rx);
  const s = Math.sin(parent.rx);
  const ly = local.p.y * c - local.p.z * s;
  const lz = local.p.y * s + local.p.z * c;
  return {
    p: { x: parent.p.x + local.p.x, y: parent.p.y + ly, z: parent.p.z + lz },
    rx: parent.rx + local.rx,
  };
}

// Attachment point: an offset in a parent bone's frame (a rider seat, a weapon grip).
export function attachPoint(parent: World, offset: Vec3): Vec3 {
  return compose(parent, { p: offset, rx: 0 }).p;
}

// 4) Pose blend toward the target pose, once per frame.
export function blendFactorLinear(dt: number): number {
  return Math.min(BLEND_RATE * dt, 1); // donor form: linear per frame, snaps when a frame is long
}

export function blendFactorExp(dt: number): number {
  return 1 - Math.exp(-BLEND_RATE * dt); // our form: same rate, no snap
}

export function lerpRig(current: Rig, target: Rig, f: number): Rig {
  const out: Rig = {};
  for (const key of Object.keys(target)) {
    const t = target[key];
    const c = current[key] ?? t;
    out[key] = {
      p: {
        x: c.p.x + (t.p.x - c.p.x) * f,
        y: c.p.y + (t.p.y - c.p.y) * f,
        z: c.p.z + (t.p.z - c.p.z) * f,
      },
      rx: c.rx + (t.rx - c.rx) * f,
    };
  }
  return out;
}

// 5) Leg offsets from the gait for one frame.
export function legOffsets(acc: number, tempo: number, speed: number): { left: number; right: number } {
  const amp = stepAmount(speed);
  const pair = footPair(gaitAngle(acc, tempo));
  return { left: amp * pair.left, right: amp * pair.right };
}
```

## 5. Lands in

- TARGET `src/fight/anim-gait.ts` (new client-side module: the creature gait and the pose blend). It reads the fight state and writes only the pose; the engine never reads it. Parity-checklist row 7 (creature actor/clips). Attachment offsets are catalogue data (row 21), not code tables.
- today: not read (no Frankendom file was opened in this pass).
- Decision (proposed): adapt. Take the distance-driven phase (with the per-creature tempo as data), the one-stored-pose blend and the attachment offset in a parent bone's frame. Do not take the unsigned accumulator as is, the linear per-frame blend, or the species tables in code.
- Acceptance: a creature with tempo 0.9 walking at 6 units per second takes the same number of steps per metre on a 30 fps and on a 144 fps client; when it stops, the pose reaches 90 percent of the idle target in about 0.15 s (ln 10 over 15) with no snap on a 100 ms hitch; a rider's seat keeps the same offset in the mount bone's frame in a rig test.
- Reuse tag: rewrite-from-idea (GPL-3.0: clean-room only; sketch written from the mechanism; no donor lines or formulas copied)
- Brief rule served: 1 (one engine, two clients: the pose is a client view of engine state and never changes HP or position)

## 6. Gaps and risks

- The accumulator is unsigned (`figure/mod.rs` 8648-8650 with a magnitude). Walking backwards plays the gait forward, so a guard step back (row 3) would look like a forward stride. Teeworlds, by contrast, uses a signed position. We need a deliberate choice: signed phase, or an explicit back-step pose.
- The phase is not reset when the creature stops (only at exact zero, 8636-8652), so the legs freeze mid-stride and then the idle pose blends in. Decide whether a stop should hold the phase or reset it.
- The pose blend is linear per frame and snaps on any frame longer than 1/15 s (`figure/mod.rs` 996). A hitch then jumps the pose. Use the exponential form in our sketch.
- Feet are offsets from the body; the code read does not place feet on terrain, so slopes and stairs float or clip. A 3D creature rig needs foot placement or IK on top of this.
- Tempo, scale, the mount table and the step constants are code in the donor (`mod.rs` 574-582, 730-766; `run.rs` 50-51). Move them to creature catalogue fields (rows 20-21). Our values are authored per creature, not copied.
- The bone cap is 16 (`lib.rs` 113), and biped_large uses exactly 16 mesh bones. A helmet, cape or second hand bone would breach it. Check our cap before adding bones.
- Second weapon during run: `run.rs` 140 sets `second.scale` to zero, and the hammer or axe branch (313) sets its position but not its scale. As read, the second weapon is hidden while running. Not seen in game; do not port this without a check.
- The `FIXME` at `mod.rs` 134 says the hold bone may hang from the wrong control chain. Not resolved in the donor; do not copy the chain.
- Licence: GPL-3.0. Clean-room only. The sketch uses our own wave shape and our own sample constants.
- Not read: the other 22 biped_large animations (jump and idle named only), the body attribute table (`mod.rs` 218-697), the vek Transform lerp used for the skeleton blend, and most of figure `update`.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: 1 (one engine, two clients)
