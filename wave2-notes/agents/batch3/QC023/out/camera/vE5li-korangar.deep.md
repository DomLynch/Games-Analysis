# vE5li-korangar (camera, cell 14)

Donor: `/mnt/frankendom-donors/vE5li-korangar/korangar/src/world/cameras/player.rs` | Licence: MIT License (`/mnt/frankendom-donors/vE5li-korangar/LICENSE.md`, read: "MIT License", Copyright (c) 2023 Lucas Pütz) | Rust | symbol `PlayerCamera`

Checked: camera_scope: world camera. Read in full: `world/cameras/player.rs` (127 lines), `world/cameras/smoothed.rs` (55 lines), `world/cameras/mod.rs` (constants and trait), `world/cameras/start.rs`, `graphics/projection.rs` 36-47, `system/timer.rs` 77-102; read by line range: `lib.rs` 1969-2063 (event handling), 2734-2750, 2805-2812, 3025-3033, 3082-3092, 3119; `input/mod.rs` 19, 96-131; not read: `debug.rs`, `directional_shadow.rs`. Confidence high on the order of operations and on every constant (the 103 receipts in `receipts.tsv`, all three games, verified). The offset heights and the frame-rate figures in section 3 are hand-computed from the constants, not run. Not read: how `Entity::get_position` interpolates between tiles, the shadow path behind the SDSM flag, the renderer. The donor is a fixed-elevation chase camera; it has no over-the-shoulder offset.

## 1. Mechanism

- A camera holds three smoothed values: a focus point (x, y, z), a yaw angle and a distance. Its position is the focus plus an offset: the offset is `(0, 0, distance)` rotated by a fixed pitch of -55 deg and then by the yaw (`player.rs` 85-91). Hand-derived from the rotation, the offset is about 0.82 x distance above the focus and about 0.57 x distance along +Z at yaw 0 (at the default yaw of 180 deg the Z part flips sign). The view direction is the negative of the offset (92). In this donor +Y is up (`mod.rs` 27). There is no shoulder offset, no collision and no lock-on in this file.
- Inputs. Holding the right mouse button sets the RotateCamera mouse mode (`lib.rs` 3256-3258). While that mode is set, each frame pushes the horizontal mouse delta as a RotateCamera event (1979-1982), which becomes `view_angle.desired += px * 0.005` (`player.rs` 60-62). A wheel delta over the world (not over the interface) pushes ZoomCamera (3280-3285), which becomes `distance.desired = clamp(distance.desired + delta * 1.0, 150, 500)` (`player.rs` 55-58). A double right click pushes ResetCameraRotation (3259-3261), which sets only the desired yaw back to 180 deg (`player.rs` 64-66). The code that clears the RotateCamera mode was not read.
- Order inside one frame. (a) `GameTimer::update` gives a wall-clock `delta_time` (`lib.rs` 3025; `system/timer.rs` 78-79): a variable step, not a fixed one. (b) `process_user_events` (3033) drains the input buffer; soft_zoom and soft_rotate only move the desired values. (c) `update_main_camera` (3082) calls `player_camera.update(delta_time)` (2805-2807), which steps focus x, y, z, then distance, then yaw (`player.rs` 76-80), then builds the position and view direction (82-92). (d) Only after that, `set_smoothed_focus_point(player position)` (3092) sets the focus target. The focus target used in frame N+1 is therefore the player position read in frame N, so the camera trails the player by one extra frame before the smoothing lag.
- Smoothing rule (`smoothed.rs` 21-29). A SmoothedValue has current, desired, threshold and speed. If desired is at least the threshold above current, current moves by `(desired - current) * speed * delta_time` and is capped at desired (`min`). If desired is at least the threshold below, the step is the mirror image, capped with `max`. If the gap is smaller than the threshold, nothing moves: a dead band, so the value stops up to 0.01 short and does not snap.
- Speeds. Focus x, y, z: speed 5.0 each (`player.rs` 32). Yaw: 15.0 (35). Distance: 5.0 (36). Threshold 0.01 for all three (12).
- Snapping. `set_focus_point` writes current and desired at once. It runs on a normal map change (`lib.rs` 2750), so a map change snaps the focus; the start camera uses the same idea (2734).
- Speed flag. `is_rotating_or_zooming_fast` is true when yaw velocity `|desired - current|` is above 0.02 or distance velocity is above 20 (`player.rs` 68-72). It turns off the SDSM shadow path for that frame (`lib.rs` 3119). This is the only use of camera speed outside the camera.
- Start camera (`world/cameras/start.rs`). A separate orbit at distance 150, 45 deg vertical FOV, offset `(0, d, d)` before yaw, spinning at 0.03 rad per second of `delta_time` (42). Used when the player entity is not yet in the world (`lib.rs` 2806-2811).

## 2. Key functions

- `PlayerCamera::update`: `/mnt/frankendom-donors/vE5li-korangar/korangar/src/world/cameras/player.rs` 75-93. Steps the smoothed values, then builds the orbit position and view direction.
- `PlayerCamera::soft_zoom`: `/mnt/frankendom-donors/vE5li-korangar/korangar/src/world/cameras/player.rs` 55-58. Clamps the desired distance only; the current distance catches up in `update`.
- `PlayerCamera::soft_rotate` 60-62 and `reset_rotation` 64-66. Both change desired yaw only.
- `PlayerCamera::is_rotating_or_zooming_fast`: `/mnt/frankendom-donors/vE5li-korangar/korangar/src/world/cameras/player.rs` 68-73.
- `SmoothedValue::update`: `/mnt/frankendom-donors/vE5li-korangar/korangar/src/world/cameras/smoothed.rs` 21-29. `move_desired_clamp` 44-46.
- Wiring: `update_main_camera` (`/mnt/frankendom-donors/vE5li-korangar/korangar/src/lib.rs` 2805-2812), focus set at 2750 and 3092, input at 1979-1982, 2061-2063, 3256-3261, 3280-3285.
- Timer: `/mnt/frankendom-donors/vE5li-korangar/korangar/src/system/timer.rs` 77-102. `FrameTimers.delta_time` is wall-clock time since the last frame.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Fixed-elevation orbit: offset is the distance at a fixed pitch and a yaw; view points back at focus | Pitch -55 deg (`player.rs` 10); default yaw 180 deg (9); default distance 400 (8) |
| Dead-banded smoothing toward desired, never overshoot | Threshold 0.01 (12); speeds 5.0 focus (32), 15.0 yaw (35), 5.0 distance (36) |
| Zoom clamped on the desired value only | Minimum 150 (`world/cameras/mod.rs` 25), maximum 500 (24) |
| Drag to yaw | 0.005 rad per pixel (`player.rs` 7) |
| Wheel to distance | ZOOM_SPEED 1.0 (6) times the wheel delta; a wheel line is 30 (`input/mod.rs` 19, 115) |
| Narrow lens | Vertical FOV 15.5 deg (`player.rs` 11), used at 108 via `graphics/projection.rs` 36-38 |
| Speed flag | 0.02 yaw velocity, 20 distance velocity (`player.rs` 15-16) |

Hand-computed, not run:
- At distance 400 and pitch 55 deg, the camera sits about 328 units above the focus (400 x sin 55) and about 229 units back (400 x cos 55). At the minimum distance 150 the figures are about 123 and 86.
- Frame-rate dependence of the donor step. For the focus (speed 5.0) after 1 s, the donor's linear step leaves 0.42 percent of the gap at 30 fps and 0.62 percent at 144 fps. The exact exponential leaves 0.67 percent at either rate. The donor is roughly frame-rate independent, not exact.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (smooth focus, then distance, then yaw, then place). It omits the snap on map change, the SDSM speed flag, the start camera, the projection and FOV, and the event buffer. Two changes are on purpose: the step uses the exact per-second fraction `1 - exp(-speed * dt)` instead of the donor's linear `speed * dt`, and the focus is one vector instead of three scalars. The offset is written for our axis convention, not the donor's left-handed one.

```ts
// Licence: MIT (vE5li-korangar, LICENSE.md). Clean-room sketch of the mechanism; not a line translation.
// camera_scope: world
type Vec3 = { x: number; y: number; z: number };

interface Smoothed { current: number; desired: number }

interface CameraTuning {
  elevationRad: number;      // fixed elevation above the focus (donor: pitch -55 deg)
  yawDefaultRad: number;     // donor: 180 deg
  distanceDefault: number;   // units
  distanceMin: number;       // units
  distanceMax: number;       // units
  yawPerPixelRad: number;    // donor: 0.005 per pixel of drag
  zoomPerWheelUnit: number;  // donor: 1.0 per wheel unit
  focusSpeed: number;        // per second
  yawSpeed: number;          // per second
  distanceSpeed: number;     // per second
  deadBand: number;          // donor: 0.01, the value stops inside the band and does not snap
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

// Donor rule (smoothed.rs update): step toward desired, stop inside the dead band, never overshoot.
// Sketch: exact per-second fraction 1 - exp(-speed * dt) instead of the donor's linear speed * dt.
function stepSmoothed(s: Smoothed, speed: number, deadBand: number, dt: number): void {
  const gap = s.desired - s.current;
  if (Math.abs(gap) < deadBand) return;
  s.current += gap * (1 - Math.exp(-speed * dt));
}

class ThirdPersonCamera {
  private readonly fx: Smoothed;
  private readonly fy: Smoothed;
  private readonly fz: Smoothed;
  private readonly yaw: Smoothed;
  private readonly distance: Smoothed;
  private pos: Vec3 = { x: 0, y: 0, z: 0 };
  private dir: Vec3 = { x: 0, y: 0, z: -1 };

  constructor(private readonly t: CameraTuning, focus: Vec3) {
    this.fx = { current: focus.x, desired: focus.x };
    this.fy = { current: focus.y, desired: focus.y };
    this.fz = { current: focus.z, desired: focus.z };
    this.yaw = { current: t.yawDefaultRad, desired: t.yawDefaultRad };
    this.distance = { current: t.distanceDefault, desired: t.distanceDefault };
  }

  // Donor: set_focus_point snaps (used on map change); set_smoothed_focus_point sets the target each frame.
  snapFocus(p: Vec3): void {
    this.fx.current = this.fx.desired = p.x;
    this.fy.current = this.fy.desired = p.y;
    this.fz.current = this.fz.desired = p.z;
  }

  follow(p: Vec3): void {
    this.fx.desired = p.x;
    this.fy.desired = p.y;
    this.fz.desired = p.z;
  }

  zoom(wheelUnits: number): void {
    this.distance.desired = clamp(this.distance.desired + wheelUnits * this.t.zoomPerWheelUnit, this.t.distanceMin, this.t.distanceMax);
  }

  rotate(pixels: number): void {
    this.yaw.desired += pixels * this.t.yawPerPixelRad;
  }

  resetYaw(): void {
    this.yaw.desired = this.t.yawDefaultRad;
  }

  // Donor order inside update(): smooth focus, then distance, then yaw; then place the camera.
  update(dt: number): void {
    stepSmoothed(this.fx, this.t.focusSpeed, this.t.deadBand, dt);
    stepSmoothed(this.fy, this.t.focusSpeed, this.t.deadBand, dt);
    stepSmoothed(this.fz, this.t.focusSpeed, this.t.deadBand, dt);
    stepSmoothed(this.distance, this.t.distanceSpeed, this.t.deadBand, dt);
    stepSmoothed(this.yaw, this.t.yawSpeed, this.t.deadBand, dt);

    const d = this.distance.current;
    const e = this.t.elevationRad;
    const a = this.yaw.current;
    // Closed form of the donor's pitch-then-yaw quaternion applied to (0, 0, d); axis convention is ours.
    const off: Vec3 = { x: d * Math.cos(e) * Math.sin(a), y: d * Math.sin(e), z: d * Math.cos(e) * Math.cos(a) };
    this.pos = { x: this.fx.current + off.x, y: this.fy.current + off.y, z: this.fz.current + off.z };
    const len = Math.hypot(off.x, off.y, off.z);
    this.dir = { x: -off.x / len, y: -off.y / len, z: -off.z / len };
  }

  position(): Vec3 {
    return this.pos;
  }

  viewDirection(): Vec3 {
    return this.dir;
  }
}
```

## 5. Lands in

- TARGET `src/fight/camera.ts` (client-only module; the engine never imports it). Parity-checklist row 11 (fight camera). The nearest existing row: there is no world-camera row (see section 6).
- today: Frankendom's current world camera file (not read in this pass).
- Reuse tag: adapt-shape (MIT: code may be adapted with the copyright notice; this note uses the shape only, the sketch is our own).
- Brief rule served: the camera is client-only and the engine never reads it; owner ruling 2026-10-10 says the world camera is what to improve (camera_scope world).

## 6. Gaps and risks

- No over-the-shoulder offset. The focus is the player's position (`lib.rs` 3092), so the character sits at screen centre. The shoulder offset would be our addition, as a data field.
- The donor's view is a high 55 deg chase, not a shoulder view. Adopt the mechanism, not the elevation as the world default. Elevation and distance band are zone data.
- No collision. The camera is placed by offset alone (`player.rs` 91) and the whole file has no raycast. Walls will clip unless we add a pull-in step; the donor gives no example.
- No lock-on, no framing of several enemies, no FOV change in combat, no shake. A grep for shake and lock-on across `korangar/src` found nothing; the FOV is a fixed constant (`player.rs` 11). All four are our additions.
- Frame order: the camera updates before the focus target is set (3082 before 3092), which adds one frame of lag. In `src/fight/camera.ts` set the target first, then update.
- The donor's linear step is only roughly frame-rate independent (section 3). The sketch uses the exact fraction.
- The dead band is 0.01 for world units and for radians alike. Scale it per value in our data.
- The SDSM toggle (`lib.rs` 3119) couples the camera to the renderer. Do not copy it; the camera must not hold renderer state.
- Rulings: the camera is client-only; the engine never reads it. Distance band, elevation and per-zone framing are zone data. Smoothing speeds, dead band and FOV are engine constants. The Pit camera is frozen and is not touched by this note.
- Rulings check (one engine, server-verified kills, one ledger, MAX_ATTACKERS = 3): the camera changes no kill, no ledger entry and no attacker count, so it adds no engine rule. A lock-on or multi-enemy frame must read enemy positions from the engine's state and must not hold any of them itself.
- Not read: `Entity::get_position` (any interpolation between tiles would add its own lag), the shadow path, and the renderer.

Best transferable idea: give the world camera its own smoothed focus that trails the character with a dead band and an exact per-second step, and keep distance and yaw as clamped targets that input moves and a timer settles.
Decision (proposed): adapt - take the decoupled, dead-banded focus smoothing and the clamped distance and yaw targets; change the step to the exact per-second fraction, add the shoulder offset, the collision pull-in and the target-first frame order, because the donor has none of those and the owner's complaint is about the shoulder view.
Acceptance: after a 10-tile walk and a stop, the remaining focus gap is 0.67 percent of the start after 1 s at both 30 fps and 144 fps (a unit test asserts this within 0.01 points), and 100 wheel notches never leave the distance outside its zone-data band.
