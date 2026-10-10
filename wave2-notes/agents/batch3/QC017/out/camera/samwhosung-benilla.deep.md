# samwhosung-benilla (camera, cell 14)

Donor: `/mnt/frankendom-donors/samwhosung-benilla/crates/benilla-app/src/player/camera_dynamics.rs` (SmartPivot, lines 154-251), with `player/camera.rs` (seat_camera 1131-1266, drag routing 901-932), `player/camera_channel.rs` (SmoothChannel), `player/camera_zoom.rs` and `crates/benilla-world/src/collision.rs` (cast_camera) | Licence: MIT OR Apache-2.0 (Cargo.toml `license = "MIT OR Apache-2.0"`; LICENSE-MIT and LICENSE-APACHE both present). Adaptation allowed with attribution. | Rust (Bevy) | symbol `SmartPivot::route_pitch`

Checked: camera_scope: world camera. Read in full: `camera_dynamics.rs` 1-262 (constants, options, SmartPivot), `camera_channel.rs` 1-235 (SmoothChannel: arm, advance, snap), `camera.rs` 455-470 (pitch and pivot constants; line 494 seen by grep), 896-932 (drag routing), 1013-1130 (seat_on_subject, read to the seat call), 1131-1266 (seat_camera), `camera_zoom.rs` 1-130, `collision.rs` 160-225 and line 41. Test names were read by grep only (camera_dynamics.rs 576-700 and camera_channel.rs tests). Not read: `TerrainTilt` and `HeadBob` bodies (headers only), `camera_water.rs` (referenced, not read), `camera_shake.rs` (not read), the FollowRig (camera.rs 363-456, headers only), the look session start and end (camera.rs 796-895, 936-1012, not read). Callers: `route_pitch` has one production caller (camera.rs:915); `advance` has one (camera.rs:1250); `seat_camera` has one (camera.rs:1110, inside `seat_on_subject`); `seat_on_subject` has two (controller.rs:328 and 723); `apply_zoom_scroll` has one (controller.rs:271). Confidence: high on the sweep, the clip flag, the bias routing and the cosine tween (all receipted). Medium on the frame order: the drag routing (camera.rs 915) reads `rig.clipped` from the last sweep, and I did not confirm in controller.rs that the look session runs before the sweep (camera.rs 1249 implies it does). Note: the comments cite addresses in the World of Warcraft client binary; the numbers are read from there, the code is the author's own.

Best transferable idea: when the camera's eye is pinned by a wall, a vertical look drag tilts the view through a one-sided bias while the eye stays put, and the bias eases home at a fixed speed once the wall clears.
Decision (proposed): adapt - take the clip-gated look bias and the fixed-duration cosine ease, not the water corridor, head bob or terrain tilt; the eye still pulls in on a wall, and the bias only changes what the camera looks at, which is the shot the owner wants (a shoulder camera that does not swing into a wall).
Acceptance: a player stands with a wall behind a shoulder camera and drags the view upward: the camera does not move, the view tilts up over the top of the wall, and when the player lets go and the wall is clear the view eases back to level at 90 degrees per second; a client unit test asserts that with `clipped` set and a vertical drag the eye position is unchanged while the bias rises.

## 1. Mechanism

- Per frame (`seat_on_subject`, camera.rs 1013-1122): the framing pivot height eases on a channel (1034-1036), the sweep origin is the head (1027-1031, lifted to a water corridor floor when that applies, 1061-1065), and the ground probe for terrain tilt is passed in (1069-1095), gated by the `terrain_tilt` option, which defaults to off (camera_dynamics.rs:93). Then `seat_camera` runs.
- Seat (camera.rs 1131-1177): `pivot = feet + pivot height`; `seat = pivot - forward x distance`, where forward comes from the unbiased arm pitch (1175-1177). The boom is `seat - head` (1178). The comment at 1156-1158 says one sweep runs from the head toward the seat, and it ignores origin penetration.
- Sweep (camera.rs 1186-1190; collision.rs 188-205): `cast_camera(head, boom, water_collision)` sweeps a sphere of radius 0.3 (`CAMERA_PROBE_RADIUS`, collision.rs:41) against solids, and a ray against the waterline when water collision is on; the nearer hit wins. `rig.clipped = hit.is_some()` (1189).
- Collision distance (camera.rs 1190-1197): if the open length is shorter than the eased collision distance, snap in at once; otherwise ease out at `CAM_RETURN_RATE` 6 per second (`1 - exp(-6 dt)`, camera.rs:460, 1195).
- Eye (camera.rs 1198-1199): `frac = collision_distance / boom_len`, clamped 0-1; the eye is `head + boom x frac`. So a wall does pull the eye in along the boom. This is the part of the mechanism the doc comment at camera_dynamics.rs:154-155 ("instead of swinging its arm") does not describe: the code shortens the arm and also tilts the view.
- View (camera.rs 1162-1173): `bias = smart_pivot.bias()` is read before this frame's advance. The arm rotation is `Ry(yaw) Rx(clamp(pitch, +/-89 deg))`; the view rotation is `Ry(yaw) Rx(arm_pitch + bias)`, with no clamp after adding the bias (the comment at 1167-1168 says the bias is bounded only by its own accumulate and +/-89 at the body hand-off).
- Smart pivot advance (camera.rs 1248-1257; camera_dynamics.rs 232-244), after the sweep: `verdict = pivot on && not translating && pitch >= 0 && clipped`. If the verdict holds, the bias is snapped to its live value (no ease in flight). If it does not and the bias is at least 0.001 rad, the bias is armed to 0 at `cameraTargetSmoothSpeed` (90 deg/s, camera_dynamics.rs:15; Arm at camera_dynamics.rs:249). Then the bias channel steps.
- Drag routing (camera.rs 901-924; camera_dynamics.rs 188-219): a look-drag gives `d_pitch = -dy x pitch_rate` and `d_yaw = -dx x yaw_rate`. `route_pitch` takes the bias path when (a) the bias is displaced and not in flight, or (b) `verdict && |d_pitch| > 0.0 && |d_yaw| < 0.05` (the drag is mostly vertical). In the bias path the bias gets `d_pitch` added, clamped to `CAM_PITCH_LIMIT - pitch` when looking up (202-208). If the bias is then at least 0 and pitch is above 0, the function returns None and the pitch integrator does not run (210-213). Otherwise the drag goes to the pitch as normal (217-218, camera.rs 923).
- The bias channel (camera_channel.rs 102-197): `arm(target, rate)` is a no-op when the same target is already in flight (143-146), parks when the gap is under 0.001 (155-161), and otherwise sets `duration = gap / rate` (162) and eases with `(1 - cos(pi s)) / 2` (186-191). It lands on the target at s >= 1 (187-189).

## 2. Key functions

- `SmartPivot::route_pitch`: `crates/benilla-app/src/player/camera_dynamics.rs` 188-219. Drag routing into the bias; one production caller (camera.rs:915).
- `SmartPivot::advance`: camera_dynamics.rs 223-244. The per-frame clip gate and the ease home; one production caller (camera.rs:1250).
- `SmoothChannel::arm` and `advance`: `crates/benilla-app/src/player/camera_channel.rs` 131-197. Duration-based cosine tween.
- `seat_camera`: `crates/benilla-app/src/player/camera.rs` 1131-1266. Seat, sweep, collision distance, eye, view rotation, advance.
- `cast_camera`: `crates/benilla-world/src/collision.rs` 188-205. Sphere for solids, ray for water.
- `apply_zoom_scroll`: `crates/benilla-app/src/player/camera_zoom.rs` 100-110. Zoom glide at a constant speed, not an ease.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Sphere sweep from the head toward the seat, nearer hit wins | Probe radius 0.3 (collision.rs:41) |
| Snap in on contact, ease out over time | Ease-out rate 6 per second (camera.rs:460) |
| Clip gate: only a pinned camera looking level or up takes the look bias | Pitch test `pitch >= 0` (camera_dynamics.rs:198); pitch clamp 89 deg (camera.rs:458) |
| One-sided bias toward the pitch limit | `CAM_PITCH_LIMIT - pitch` (camera_dynamics.rs:207) |
| Bias eases home at a fixed speed | 90 deg/s (camera_dynamics.rs:15) |
| Drag is mostly vertical | Yaw per event under 0.05 (camera_dynamics.rs:11); pitch above 0.0 (line 13) |
| Ease with a duration set by the gap | Duration = gap / rate; epsilon 0.001 (camera_channel.rs:20, 162) |
| Zoom glide at a constant speed | 8.33 yd/s (camera_zoom.rs:29); step 1.0 yd per notch (line 26); max 50 yd (line 14); default 15 yd (line 15) |
| Framing height eases at a rate | 1.2 yd/s (camera.rs:494, comment at 1032-1033) |

## 4. TypeScript sketch

simplified: the sketch keeps the clip gate, the one-sided view bias with the pure-pivot return, the ease home at 90 deg/s, the duration-based cosine channel, and the head sweep that pulls the eye in while the view takes the bias. It omits: the water corridor and the waterline ray, the terrain tilt probe and its channel, the head bob, the shake, the FollowRig auto-follow, the pivot height channel (the sketch takes a fixed pivot height), the zoom glide (the sketch takes a fixed distance), the tracking-hold disjunct in `advance`, and the ground-tilt term in the arm pitch. It reorders one thing on purpose to match the donor: the bias is read before this frame's advance, so the view uses last frame's bias.

```ts
// Licence: MIT OR Apache-2.0 (benilla Cargo.toml "license"; LICENSE-MIT and LICENSE-APACHE present). Adapted from the mechanism and written fresh in TypeScript; not a line-by-line translation.
export {};

type Vec3 = { x: number; y: number; z: number }; // y is up, as in the donor

const CHANNEL_EPS = 0.001;                 // rad or units: closer than this counts as equal
const PITCH_LIMIT = (89 * Math.PI) / 180;  // camera pitch clamp
const RETURN_RATE = 6.0;                   // 1/s: collision distance eases out; pull-in is instant
const HOME_SPEED = (90 * Math.PI) / 180;   // rad/s: the look bias returns to level at this speed
const DX_MAX = 0.05;                       // a drag with less yaw per event than this may pivot
const DY_MIN = 0.0;                        // ...and more pitch per event than this

// A duration-based cosine tween. Duration = gap / rate; ease = (1 - cos(pi s)) / 2.
export class Channel {
  live = 0;
  private from = 0;
  private to = 0;
  private elapsed = 0;
  private duration = 0;
  private moving = false;

  get inFlight(): boolean { return this.moving; }

  snap(v: number): void {
    this.live = v; this.from = v; this.to = v; this.moving = false;
  }

  arm(target: number, rate: number): void {
    if (this.moving && Math.abs(this.to - target) < CHANNEL_EPS) return; // already arming this
    const gap = Math.abs(target - this.live);
    if (gap < CHANNEL_EPS) { this.to = target; this.moving = false; return; }
    this.from = this.live;
    this.to = target;
    this.elapsed = 0;
    this.duration = gap / Math.max(rate, Number.EPSILON);
    this.moving = true;
  }

  advance(dt: number): number {
    if (!this.moving) return this.live;
    this.elapsed += dt;
    const s = this.elapsed / Math.max(this.duration, Number.EPSILON);
    if (s >= 1) {
      this.live = this.to;
      this.moving = false;
    } else {
      const e = (1 - Math.cos(Math.PI * s)) / 2;
      this.live = this.from + (this.to - this.from) * e;
    }
    return this.live;
  }
}

// Smart pivot: a camera pinned by geometry tilts its view through a bias instead of pulling in further.
export class SmartPivot {
  readonly bias = new Channel();

  private release(): void { this.bias.arm(0, HOME_SPEED); }

  // Drag routing. Returns the pitch delta the integrator should apply, or null on a pure-pivot frame.
  route(dPitch: number, dYaw: number, pitch: number, translating: boolean, clipped: boolean): number | null {
    const verdict = !translating && pitch >= 0 && clipped;
    const displaced = !this.bias.inFlight && Math.abs(this.bias.live) >= CHANNEL_EPS;
    const verticalDrag = verdict && Math.abs(dPitch) > DY_MIN && Math.abs(dYaw) < DX_MAX;
    if (displaced || verticalDrag) {
      let b = this.bias.live + dPitch;
      if (pitch > 0) b = Math.min(b, PITCH_LIMIT - pitch); // one-sided: only up, only to the limit
      this.bias.snap(b);
      if (b >= 0 && pitch > 0) return null;                // the bias took the whole drag
    }
    this.release();
    return dPitch;
  }

  // Per frame, after the sweep: eases the bias home once the clip is gone.
  advance(pitch: number, translating: boolean, clipped: boolean, dt: number): void {
    const verdict = !translating && pitch >= 0 && clipped;
    if (verdict) this.bias.snap(this.bias.live);
    else if (Math.abs(this.bias.live) >= CHANNEL_EPS) this.release();
    this.bias.advance(dt);
  }
}

export interface Rig {
  yaw: number;           // radians, about Y
  pitch: number;         // radians, unbiased, positive up
  distance: number;      // orbit distance, from zoom
  collisionDist: number; // eased boom length the sweep allows
  clipped: boolean;      // last sweep hit
  smart: SmartPivot;
}

// Forward of Ry(yaw) * Rx(pitch) applied to -Z.
export function forward(yaw: number, pitch: number): Vec3 {
  return { x: -Math.cos(pitch) * Math.sin(yaw), y: Math.sin(pitch), z: -Math.cos(pitch) * Math.cos(yaw) };
}

// The sweep is a caller callback: returns the distance along boom to the first hit, or null.
export function seat(
  rig: Rig,
  dt: number,
  feet: Vec3,
  head: Vec3,
  pivotHeight: number,
  translating: boolean,
  sweep: (from: Vec3, boom: Vec3) => number | null,
): { eye: Vec3; viewPitch: number } {
  const bias = rig.smart.bias.live;                        // read before this frame's advance
  const pivot = { x: feet.x, y: feet.y + pivotHeight, z: feet.z };
  const fwd = forward(rig.yaw, rig.pitch);                 // the arm uses the unbiased pitch
  const seatPos = { x: pivot.x - fwd.x * rig.distance, y: pivot.y - fwd.y * rig.distance, z: pivot.z - fwd.z * rig.distance };
  const boom = { x: seatPos.x - head.x, y: seatPos.y - head.y, z: seatPos.z - head.z };
  const boomLen = Math.max(Math.hypot(boom.x, boom.y, boom.z), 1e-3);

  const hit = sweep(head, boom);
  rig.clipped = hit !== null;
  const open = hit ?? boomLen;
  if (open < rig.collisionDist) rig.collisionDist = open;                              // snap in
  else rig.collisionDist += (open - rig.collisionDist) * (1 - Math.exp(-RETURN_RATE * dt)); // ease out

  const frac = Math.min(Math.max(rig.collisionDist / boomLen, 0), 1);
  const eye = { x: head.x + boom.x * frac, y: head.y + boom.y * frac, z: head.z + boom.z * frac };

  rig.smart.advance(rig.pitch, translating, rig.clipped, dt);
  const armPitch = Math.min(Math.max(rig.pitch, -PITCH_LIMIT), PITCH_LIMIT);
  return { eye, viewPitch: armPitch + bias };              // the view takes the bias; the eye does not
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/qc017_benilla_clip_tilt.ts): exit 0.

## 5. Lands in

- TARGET `src/fight/camera.ts` (client, new). Parity-checklist row 11 (fight camera). The world camera has no row of its own; the note says so.
- Reuse tag: rewrite-from-idea (MIT OR Apache-2.0: adaptation allowed with attribution; written fresh, no code copied)
- Brief rule served: 1 (one engine: the camera is a client that reads the sweep result from the world and writes nothing back); rules 7-9 n/a

## 6. Gaps and risks

- The donor both pulls the eye in on a wall (camera.rs 1190-1199) and tilts the view (1162-1173, 915-923). Frankendom must pick one. The clip-tilt shot is the one the owner needs; the eye pull-in is still needed so the eye never sits inside geometry.
- The clip flag used for a drag is last frame's (camera.rs:915 passes `rig.clipped`, set by the previous sweep). That is one frame of lag on the first frame of a wall; acceptable, but the test should allow it.
- The sweep is a sphere of 0.3 against solids (collision.rs:41): it does not see thin geometry edges that are smaller than the sphere, and it is two-sided. Frankendom's zone collision must have the same radius or the shot will differ at a pillar.
- The eased collision distance is per camera, not per wall; a second wall behind the first is handled only by the next sweep (camera.rs 1192-1197). Fine for a shoulder camera, not proven for a crowded arena.
- The bias is one-sided: it only tilts up, and only while `pitch >= 0` (camera_dynamics.rs:198, 206-208). A camera looking down into a wall gets no tilt. Frankendom's over-the-shoulder shot looks down at the fighter often; this shape would not help there.
- The donor's numbers come from the World of Warcraft client binary (its comments cite addresses such as `0x511010`). The code is MIT/Apache, but Frankendom should choose its own numbers, and not cite the binary.
- The zoom glide (camera_zoom.rs:108-109) is a constant-speed glide at 8.33 yd/s, not an ease. Frankendom's zoom pulse in combat, if built, should not copy it without a reason.
- Not read: the look session start and end, the water corridor (`camera_water.rs`), `camera_shake.rs`, and the FollowRig. A grep of the camera files for lock-on and target framing found none (the `target/lock.rs` module is the GameObject door-lock chain, not a camera lock).


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: CLEAN.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** Nits: view/arm pitch is clamp(cam.pitch + terrain_tilt.pitch()) (camera.rs 1165), note and sketch say clamp(pitch) (ground tilt omitted but disclosed); SmoothChannel.arm also requires matching delay and factor memo for 'already arming' (camera_channel.rs 143-146), duration = gap/rate*factor (162) and angular channels rewrap live (133-141) - not in mechanism/sketch. All constants (0.3, 6.0, 89 deg, 90 deg/s, 0.05, 0.0, 0.001, 1.2, 8.33, 1.0, 50, 15), routing/advance logic, call sites (camera.rs 915, 1110, 1250; controller.rs 271, 328, 723), licence verified.

**Missed:** None important.
