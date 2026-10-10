# latentcollapse-RustDAoC (camera, cell 14)

Donor: `/mnt/frankendom-donors/latentcollapse-RustDAoC/crates/caer-render/src/bin/rustdaoc.rs` | Licence: GPL-3.0-or-later (`Cargo.toml` line 16 `license = "GPL-3.0-or-later"`; the LICENSE file is GPL v3; rustdaoc.rs has no per-file licence header) | Rust | symbol `follow_camera`

Checked: camera_scope: world camera. Symbol `follow_camera` is at rustdaoc.rs 4343-4367 and was read in full; its callers are the live frame (5365) and the screenshot path (6990, not read beyond the call). Read also: `camera_yaw` 4339-4341, `apply_turn` 964-998, `update_movement` 4374-4400, the mouse drag branch 7951-8002, the right-button branch 3418-3421, `apply_wheel` 3442-3445, the constants 446-468, the per-frame dt and update 4848 and 5299, and the client-ini wiring 2355-2359. Also read: `clientini.rs` lines 1-60 and `caer-render/src/camera.rs` whole (that file is the free-fly inspector camera, not the game camera). Confidence: high on the orbit maths and the input rules, because I read the whole path end to end. Not read: `mesh.walk_height_at` (only its call sites for the player's z), the server position path, and `preworld_camera.rs` (a character-creation stage camera, not a fight camera). Verified by arithmetic, not by running: the flat-ground floor at distance 500 (see section 3).

Best transferable idea: Place the eye on a sphere around a chest-height look-at point, with yaw taken from the character's facing plus a free orbit offset, so the camera sits behind the character by default and a drag swings it without moving the character.
Decision (proposed): adapt - the orbit geometry, the pinned-turn compensation and the wheel-set distance fit our third-person world camera, but the donor has no collision, no damping and no shoulder offset, so we must add those before this beats the current over-the-shoulder view.
Acceptance: In an open zone, a player running along a wall or up a slope sees the camera pull in to the wall instead of showing the inside of geometry, and a client unit test asserts the eye stays at the set distance from the focus at every pitch and above the feet at the pitch floor on flat ground.

## 1. Mechanism

Order of work per redraw frame. `dt` is wall-clock time since the last frame, capped at 0.1 s (4848). `update_movement(dt, now)` runs (5299): keyboard turn first, then look-key pitch, then movement, so movement uses the new facing (4375-4398). Then `follow_camera` builds the camera from the final state (5365). The camera keeps no state of its own: it is rebuilt from the player's position and three values, `cam_orbit` (radians), `orbit_pitch` (radians) and `cam_dist` (world units).

- Look-at point: the player's position with 60 added to z (4349; constant at 450). This is roughly chest height, not the feet.
- Yaw: `camera_yaw = pi/2 - heading_rad + cam_orbit` (4340). With `cam_orbit` 0 the eye sits directly behind the facing.
- Eye: a true sphere of radius `cam_dist` around the look-at point. Horizontal offset `cam_dist * cos(pitch)` along the yaw, vertical offset `cam_dist * sin(pitch)` (4358-4362). The camera aims at the look-at point and the far plane is pushed to 300000 (4364-4365).
- Keyboard turn (`apply_turn`): heading moves at 1024 units per second (813, 973). Not pinned and snapback on (default true, 2196), the orbit is set to 0, so the camera returns behind. Pinned (right button held), the orbit absorbs the heading change: `cam_orbit + delta * TAU/4096`, where delta is the quantised shortest-way heading change (988). The comment starting at 959 says both callers go through this one function, so the test runs the code the client runs.
- Mouse left drag: orbit += dx * 0.005 radians per pixel (7954, 7997), wrapped to one turn. Mouse right drag: sets the orbit to 0 on every motion event (7978) and turns the character by -dx * 0.005 turn units (7972-7978). Releasing the right button with snapback on also sets the orbit to 0 (3420-3421). The reset key sets orbit 0 and pitch to start (7811-7812).
- Pitch: drag adds dy * 0.005 (8001); look keys add +/-0.9 rad/s * dt (478, 4398). Both clamp to -0.11 .. 1.30 rad (467-468). Start pitch is read from the client's `tilt` at runtime (2358, 0.267 rad fallback at 454).
- Distance: wheel multiplies by 1.1^(-notches) and clamps to 50 .. 3000 (3444). Start distance is read from the client's `distance` at runtime (2359, fallback 500 at 446).

## 2. Key functions

- `follow_camera`: `/mnt/frankendom-donors/latentcollapse-RustDAoC/crates/caer-render/src/bin/rustdaoc.rs` 4343-4367. The whole camera: look-at point, sphere eye, aim, far plane.
- `camera_yaw`: same file 4339-4341. Facing plus orbit.
- `apply_turn`: same file 964-998. Keyboard turn with pinned compensation and snapback; a free function so the test runs the real code.
- `update_movement`: same file 4374-4400 (first part). The order of turn, pitch keys and movement.
- Mouse drag handler: same file 7951-8002 (the drag branch). Left drag orbits, right drag turns and resets the orbit.
- Wheel: same file 3442-3445.
- Client ini: `/mnt/frankendom-donors/latentcollapse-RustDAoC/crates/caer-assets/src/clientini.rs` 36-47 (`CameraDefaults`: distance, height, tilt, angle).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Eye on a sphere around a look-at point; distance and pitch set the eye, not the other way round | Look-at height 60 units above the feet (theirs, 450) |
| Yaw = facing + free orbit; orbit 0 means directly behind | Start distance 500 units from the client ini (theirs, 2359; fallback 446) |
| Wheel scales distance by a fixed ratio per notch and clamps | Ratio 1.1 per notch; clamp 50 to 3000 units (theirs, 3444) |
| Pitch clamped to a floor and ceiling | Floor -0.11 rad, ceiling 1.30 rad, start 0.267 rad (theirs, 454, 467-468) |
| Floor where the eye stays above the feet on flat ground: asin(-look-at height / distance) | asin(-60/500) is about -0.120 rad (theirs, 464; the donor comment says the same). Their floor -0.11 is just above it, so the eye is about 5.1 units above the feet at that pitch on flat ground (my arithmetic, not run). |
| Turn absorbed by the orbit while a button is held | Turn rate 1024 heading units per second, 4096 per turn (theirs, 813) |
| Frame dt capped so a stall does not jump the camera | Cap 0.1 s (theirs, 4848) |
| Mouse sensitivity in radians per pixel | 0.005 rad per pixel (theirs, 7954) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order and formulas: yaw from facing plus orbit, the eye on a sphere around a look-at point, pitch and distance clamps, the pinned turn compensation, the snapback, the wheel zoom and the drag rules. It omits the render-space mirror and origin offset, the far plane, the look-key pitch step (the config field is not used by any function), the camera-to-cursor pick ray, the F3 snapback toggle, the recorder, and the u16 heading truncation on the mouse path (the mouse step stays a float; the keyboard path floors, as the donor's cast does). It adds nothing the donor lacks: no collision, no damping, no shoulder offset.

```ts
@@SKETCH@@
```

## 5. Lands in

- TARGET `src/fight/camera.ts` (new, client-only pure module: eye, turn and drag rules; the engine never reads it). Parity-checklist row 11 (fight camera). The world camera has no row of its own in the addendum list; this note asks Lead to decide whether row 11 covers the world camera.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only; no code copied)
- Brief rule served: camera is client-only (the donor's camera is client-only too, and it never touches kills, ledger or MAX_ATTACKERS = 3); zones as data (the distance start can differ per zone, see JSON)

## 6. Gaps and risks

- Licence: GPL-3.0-or-later. The sketch is written from the mechanism, not translated; the donor's source stays out of our tree.
- No collision. `follow_camera` reads no terrain and no walls. The only protection is the fixed pitch floor, which is right for flat ground only. My reading (inference from `follow_camera`, not tested): on a rise behind the camera, or against a wall, the eye can end up under or inside geometry. Our camera needs a pull-in against terrain and walls, which the donor does not give us.
- No damping. The camera is a pure function of the player pose, so it moves with the character each frame. A frame-rate-independent lag is ours to add; we should adapt, not copy the snap.
- No shoulder offset. The look-at point is on the character's centreline, so the character sits centred. The owner's over-the-shoulder request needs a lateral offset that this donor does not have.
- No lock-on or target framing, no FOV change in combat, no impact shake. I searched rustdaoc.rs and the crates for shake, fov, lock-on and framing terms and found no such code for the follow camera. The only FOV in camera.rs is the fixed 60 degree vertical default (18) and the pre-world stage's horizontal 60 (a different camera).
- Two right-button rules. With the right button held, keyboard turns pin the view in world space (988); mouse right-drag resets the orbit to behind on every motion event (7978). Frankendom must pick one. The donor's comment at 7971-7972 says the snap back is what DAoC does.
- The client ini `height` is parsed and only logged (428-430). The donor uses its own look-at height of 60 instead. Do not read the ini height as the look point.
- The numbers are tuned to DAoC's scale, where a character is about 70 units tall (the comment at 448). Our character scale differs, so every number is a data field with a default, not a constant.
- Not verified: no test run and no screenshot. The donor's tests cover distance constancy (8657) and pitch limits only.

