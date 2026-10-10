# Clancey-wowrust (camera, cell 14)

Donor: `/mnt/frankendom-donors/Clancey-wowrust/crates/wow-render/src/camera.rs` (caller: `crates/wow-app/src/lib.rs`) | Licence: no LICENSE file; README.md:156 says "Private project. Not for distribution." (restricted, clean-room) | Rust | symbol `ThirdPersonCamera::update`

Checked: camera_scope: world camera. Read in full: `crates/wow-render/src/camera.rs` (1-344, all of it, including `ThirdPersonCamera::position`, `view_matrix`, `update`, `movement_forward/right`, and the free-fly camera for contrast), the caller block `crates/wow-app/src/lib.rs` 2836-2900 (third-person branch), movement 2163-2200, the wheel conversion 1846-1851, and `crates/wow-render/tests/camera_test.rs` 1-90. Other writers of `target` (lib.rs 1148 and 2638) are seen by grep and read as one line each. Not read: the input layer (`wow-input`, where `yaw_delta` and `scroll` come from), the renderer's use of the view matrix (grep only). Callers: `update_third_person` has one caller (lib.rs 2881). Confidence: high on the orbit math and clamps (all receipted); it has no collision, no smoothing and no lock-on in any file I read (grep for collision, lerp, smooth, shake, lock, FOV found none in camera.rs). Note the `dt` argument is named `_dt` and is never used.

Best transferable idea: keep the camera a pure function of target, yaw, pitch and distance, with rotation applied only while the look button is held and all clamps in one update step.
Decision (proposed): reject - the donor orbit has no smoothing (dt is unused), no wall test and no shoulder offset, so adopting it would bring back the faults the owner is unhappy with. Collision and smoothing come from the WoWee note (its `camera_controller.cpp` is the source for those); this donor is kept only as a reference for the plain clamps.
Acceptance: not built. If it were, the camera would pass through walls when the character stood against one, and a client test would have to assert otherwise; this donor cannot pass that test.

## 1. Mechanism

- State (camera.rs 12-22): target (player position), distance (default 10, line 28), yaw, pitch (radians), a fixed look height `height_offset` of 1.8 (line 31), FOV 60 degrees (line 32), near 0.1, far 5000.
- Position (lines 40-49): the look point is `target + (0, 0, 1.8)`. The camera is that point plus a sphere offset: x = cos(yaw) x cos(pitch) x distance, y = sin(yaw) x cos(pitch) x distance, z = sin(pitch) x distance. So the camera is always centred on the head at distance, with no offset to either side. It sits on the +(cos yaw, sin yaw) side of the head and looks back at it (the view direction is the negative of that), so "behind" means behind the head as seen from the yaw direction, not behind it relative to movement_forward.
- View (lines 52-58): `look_at_rh(camera_pos, look point, up = Z)`. The camera looks at the same head point it orbits.
- Update (lines 78-93), in this order: (a) if `rotate_active` (right mouse held, from the MouseLook action, lib.rs 2879), yaw += yaw_delta x 0.002 and pitch += pitch_delta x 0.002 (lines 80-83); (b) pitch clamped to plus or minus 80 degrees (line 86); (c) distance = clamp(distance - scroll x 2.0, 2, 50) (line 89); (d) target = input target (line 92). `_dt` is not used, so nothing is frame-rate dependent except the input deltas themselves.
- Caller (lib.rs 2843-2884, update at 2881): once per frame in the third-person branch, `target_position` = the local player's position (default zero if missing), `scroll_delta` = the input layer's scroll value for the frame (its source not read), `rotate_active` = MouseLook held, and `dt` is passed in but ignored by the camera.
- Direct writes (lib.rs 1148, 2638): `target` is also set straight to a converted server position when the player is placed, so the orbit is not the only writer.
- Movement (lib.rs 2163-2191): both branches of an `if` on the yaw/pitch deltas set the walk forward to `movement_forward()` (line 2178 and 2182), with the comment "For now, just use camera forward as a fallback" (line 2181). So the branch does nothing and walking always follows the yaw axes. Those axes are not the camera's look direction: `movement_forward` is +(cos yaw, sin yaw), which points from the head toward the camera, opposite to the view direction. Whether the input layer's forward sign compensates was not read, so this is either a latent donor bug or an unstated input-sign convention. Walk speed is 7 units per second (line 2167); the step is forward x input x speed x dt (line 2190).
- Axes (lines 96-105): forward = (cos yaw, sin yaw, 0), right = (-sin yaw, cos yaw, 0), both normalised. These are the walk axes. Despite the doc comment "camera forward", forward points toward the camera, not along the view (see Position and Movement above).

## 2. Key functions

- `ThirdPersonCamera::position`: `crates/wow-render/src/camera.rs` 40-49. The orbit point.
- `ThirdPersonCamera::update`: camera.rs 78-93. The one update step: rotate (gated), pitch clamp, distance clamp, target snap.
- `ThirdPersonCamera::movement_forward` / `movement_right`: camera.rs 96-105. Yaw-only walk axes.
- Caller block: `crates/wow-app/src/lib.rs` 2843-2884.
- Wheel conversion: lib.rs 1846-1851 (line delta used as-is; pixel delta divided by 100).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Spherical orbit around a head point | Head height 1.8 (camera.rs 31); distance default 10 (line 28) |
| Rotation gated on a held button | 0.002 radians per input unit, yaw and pitch alike (lines 81-82) |
| Pitch clamp | plus or minus 80 degrees (line 86) |
| Distance step and clamp | 2.0 units per scroll unit (line 89); clamp 2 to 50 (line 89) |
| Yaw-only walk axes | None (trig) |
| Walk speed | 7 units per second (lib.rs 2167); not a camera value |

## 4. TypeScript sketch

simplified: the sketch keeps the head-point orbit, the gated yaw and pitch step, the pitch clamp, the distance step and clamp, the target snap and the yaw-only walk axes (with the donor's sign quirk flagged in a comment: the donor's forward points toward the camera, not where it looks, so the axes are not reusable as "camera forward" without a flip). It omits the view and projection matrices, the free-fly camera, the FOV and near/far planes, the wheel-pixel conversion, the direct target writes in lib.rs (1148, 2638), and the walk-speed step. It reorders nothing: rotate, pitch clamp, distance, then target, as in the donor. `dt` is accepted and unused, as in the donor.

```ts
// Licence: restricted (Clancey-wowrust: no LICENSE file; README says "Private project. Not for distribution."). Clean-room sketch of the mechanism; not a translation.
// clean-room
export {};

type Vec3 = { x: number; y: number; z: number };

export interface Orbit {
  target: Vec3;     // player feet position, set every frame
  distance: number; // 2..50, default 10
  yaw: number;      // radians
  pitch: number;    // radians, clamped to +/-80 degrees
}

const HEAD_HEIGHT = 1.8;
const MAX_PITCH = (80 * Math.PI) / 180;
const YAW_PER_UNIT = 0.002;   // radians per mouse unit while rotating
const SCROLL_STEP = 2.0;      // distance units per scroll unit
const MIN_DIST = 2.0;
const MAX_DIST = 50.0;

// The look point and the camera: a point on a sphere around the head, no offset to either side.
// The camera sits on the +yaw side of the head (head + (cos yaw, sin yaw) x distance) and looks back at it.
export function orbitPosition(o: Orbit): Vec3 {
  const hx = o.target.x, hy = o.target.y, hz = o.target.z + HEAD_HEIGHT;
  return {
    x: hx + Math.cos(o.yaw) * Math.cos(o.pitch) * o.distance,
    y: hy + Math.sin(o.yaw) * Math.cos(o.pitch) * o.distance,
    z: hz + Math.sin(o.pitch) * o.distance,
  };
}

// One frame of input. dt is accepted and not used; there is no smoothing or wall test.
export function updateOrbit(
  o: Orbit,
  input: { targetPos: Vec3; yawDelta: number; pitchDelta: number; scroll: number; rotating: boolean },
  _dt: number,
): void {
  if (input.rotating) {
    o.yaw += input.yawDelta * YAW_PER_UNIT;
    o.pitch += input.pitchDelta * YAW_PER_UNIT;
  }
  o.pitch = Math.min(Math.max(o.pitch, -MAX_PITCH), MAX_PITCH);
  o.distance = Math.min(Math.max(o.distance - input.scroll * SCROLL_STEP, MIN_DIST), MAX_DIST);
  o.target = input.targetPos;
}

// Camera-relative walk axes on the ground plane, from yaw alone.
// CAUTION (donor quirk, kept as is): the camera sits at head + (cos yaw, sin yaw) x distance and looks back at the head, so its
// view direction is the NEGATIVE of this forward. The donor's `forward` points from the head toward the camera; whether the
// input layer's forward sign compensates was not read. Do not reuse as "forward = where the camera looks" without flipping.
export function walkAxes(yaw: number): { forward: Vec3; right: Vec3 } {
  return {
    forward: { x: Math.cos(yaw), y: Math.sin(yaw), z: 0 },
    right: { x: -Math.sin(yaw), y: Math.cos(yaw), z: 0 },
  };
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/qc017_clancey_orbit.ts): exit 0.

## 5. Lands in

- TARGET `src/fight/camera.ts` (client, reference only; reject). Parity-checklist row 11 (fight camera).
- Reuse tag: rewrite-from-idea (restricted: private, no licence; clean-room only; reference only)
- Brief rule served: 1 (one engine: the camera reads engine state and writes nothing back); rules 7-9 n/a

## 6. Gaps and risks

- No wall or collision test anywhere in camera.rs: the camera would sit inside geometry. Not usable for the owner's world camera without the WoWee collision (its `camera_controller.cpp` 2119-2224).
- No smoothing: the target snaps to the player each frame and `dt` is unused, so any hitch is a visible jump. Frankendom needs the frame-rate independent lag from WoWee (cpp 2358-2359) instead.
- Centred orbit, no shoulder offset (camera.rs 40-49). The owner's over-the-shoulder view is not in this donor.
- Distance step is a fixed 2.0 per notch, not scaled to the current distance (camera.rs 89). WoWee scales it (cpp 3726). A fixed step is relatively coarser at 2 units than at 50 (my inference from the numbers, not measured).
- Pitch clamp here is plus or minus 80 degrees (camera.rs 86), tighter than WoWee's plus or minus 88 (hpp 584-585). Neither clamp was tested against walls, so neither value is proven for a shoulder camera.
- No lock-on, no framing of several targets, no FOV change in combat. MAX_ATTACKERS = 3 has nothing to copy here.
- Licence: private, no licence file. Clean-room, and do not copy.
- The camera is client-only (the engine never reads it), so none of these values are zone data.


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** All cited lines verified (camera.rs 12-22/25-37/40-49/52-58/78-93/96-105; lib.rs 1148, 1846-1851, 2163-2191, 2638, 2843-2884; unused _dt; update_third_person single non-test caller at lib.rs 2881; README 'Private project'). Weakness: note claims the camera sits 'directly behind the head along the yaw' and walks are camera-relative, but position() puts the camera at +(cos yaw, sin yaw) from the head looking back at it, while movement_forward() is +(cos yaw, sin yaw): walk-forward points TOWARD the camera, i.e. opposite to the view direction. The TypeScript walkAxes reproduces this without flagging it. Cross-references to a WoWee note (camera_controller.cpp 2119-2224, 2358-2359, 3726, hpp 584-585) are a different donor and were not verified.

**Missed:** Sign inversion between the view direction (target - camera_pos = -(cos yaw cos pitch, sin yaw cos pitch)) and movement_forward (+cos yaw, +sin yaw); the doc comment on movement_forward says 'camera forward' so this looks like a latent bug or an unspoken input-sign convention; the note should have flagged it before offering walkAxes as reusable.
