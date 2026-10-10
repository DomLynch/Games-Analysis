# daeken-OpenEQ (camera, cell 14)

Donor: `/mnt/frankendom-donors/daeken-OpenEQ/crates/openeq/src/main.rs` (with `crates/openeq-assets/src/collision.rs`, `crates/openeq/src/live.rs`, `crates/openeq-render/src/scene.rs`) | Licence: MIT OR Apache-2.0 (workspace `Cargo.toml` line 14, `license = "MIT OR Apache-2.0"`; no LICENSE file in the tree, `find -iname "*licen*"` empty) | Rust | symbol `view_camera`

Checked: camera_scope: world camera. Opened and read `view_camera` (main.rs 2336-2356) in full; `update_camera` (499-610) for yaw, pitch, eye and the movement forward vector; the render call sites (1654-1658); `clip_camera` (collision.rs 249-270), `segment_hit` (144-160), the candidate lookup (752-764) and the two camera tests (973-1008); `Camera` (scene.rs 817-835); `camera_position` (live.rs 1999-2019) and the own-actor placement in `actor_states_with_terrain` (live.rs 2088-2131). Confidence: high on the third-person mechanism (read end to end). Medium-high on "no smoothing, no shoulder offset, no lock-on, no zoom": grep over `openeq/src` and `openeq-render/src` for shoulder, shake, lock-on, recentre, zoom, smooth, damp, lerp found nothing for the camera, but I did not read every file. Not read: `doors.collision_world` and the door platform code, `Triangle` construction, `movement.rs` `step_in_world`, the server side of `camera_position`, `targeting.rs` beyond its click pick. Nothing was executed; the donor's own tests were read, not run.

Best transferable idea: the view camera is the eye point pushed 18 units back along the same look vector movement uses, then pulled in to the nearest solid hit on that segment with a fixed clearance, so the wall never shows behind the hero.
Decision (proposed): adapt - take the eye-centred pull-in (one ray, nearest hit, clearance) and reject the donor's instant snap; the donor has no shoulder offset and no damping, so Frankendom adds both as client-only data.
Acceptance: a client unit test puts a wall 5 units behind the hero and asserts the view point stops at least `clearance` short of the first hit; in play the wall is never drawn between the hero and the camera, and the camera does not jump when the wall crosses the line (needs the added damping, which is our proposal, not the donor's).

## 1. Mechanism

- The third-person camera is not a separate rig. Each render frame it is computed from the player's eye (`runtime.camera.position`) and the same `yaw` and `pitch` that movement uses. The offset is 18 units back along the negative look direction: x `-sin(yaw)cos(pitch)*18`, y `-cos(yaw)cos(pitch)*18`, z `-sin(pitch)*18` (2340-2342). The look direction is the same vector movement uses for forward (595, 597). Positive pitch looks up, so the camera drops when the player looks up.
- Order of operations per frame, from the Bevy schedules:
  (a) Update, chained: input handlers, cursor capture, then `update_camera` (328, 336). `update_camera` changes yaw and pitch only while the cursor is captured and controls are allowed (537). Yaw += mouse x times 0.0035 (545). Pitch -= mouse y times 0.0035, clamped to plus or minus (pi/2 - 0.01) (546-548). Then WASD moves the eye; collision works on a feet point (`feet` = eye z minus 6, 607-610, then the `move_player` and `step_in_world` calls; the end of that path was not read).
  (b) Last: `render_frame` (342, 1555). It copies the true camera (1654), builds the view camera (1655), and then sends the true eye to the server with `camera_position` (1658). That send uses `camera.position[2] - 3.` (live.rs 2012) and an animation flag of 12 when moving (2015). The view camera never goes to the server.
  (c) `view_camera` (2336): when `third_person` is on (2338), it takes `focus` = eye (2344) and `desired` = focus plus the 18-unit offset (2339-2345). It clips from focus to desired against the zone collision with padding 0.35 (2346-2347). It then clips again against the door collision world, from focus to the already-clipped point, with the same padding (2351-2352). With no zone collision it uses `desired` unclipped (2346, `map_or`).
  (d) `clip_camera` (collision.rs 249): it tests every candidate triangle on the segment with `segment_hit` (266), keeps the smallest hit parameter t (267), and returns focus plus delta times `max(0, t - padding/distance)` (268). `segment_hit` is double-sided (143-160): a triangle blocks from either side, including ceilings and slopes (doc, 245-246). The candidate lookup walks the XY cells the segment's box covers (752-764) and falls back to every triangle when the box covers more than 4096 cells (757).
  (e) The own character is drawn at the true eye minus 3 (`live.rs` 2113-2119), with heading from the true camera yaw (2130), not the pulled-in view. Click picking also calls `view_camera` (main.rs 2437); I did not read the whole pick call, so I cannot say the pick ray is identical to the drawn view.
- The view has no time term. Nothing in `view_camera` depends on the frame time, so the pulled-in distance is recomputed from scratch each frame and snaps when geometry crosses the line. Grep for smooth, damp, lerp in `main.rs`, `live.rs`, `movement.rs` and `targeting.rs` (the only lerp is for geometry, targeting.rs 33) found no camera smoothing.
- Toggle: F9 flips `third_person` (1121-1122). Zone reset sets it off (142).

## 2. Key functions

- `view_camera`: `/mnt/frankendom-donors/daeken-OpenEQ/crates/openeq/src/main.rs` 2336-2356. The offset, the focus, the static clip, the door clip.
- `clip_camera`: `/mnt/frankendom-donors/daeken-OpenEQ/crates/openeq-assets/src/collision.rs` 249-270. Nearest-hit segment clip with padding, returns the focus when the hit is at zero distance.
- `segment_hit`: `/mnt/frankendom-donors/daeken-OpenEQ/crates/openeq-assets/src/collision.rs` 144-160. Double-sided segment/triangle test in Moller-Trumbore form (u, v, t from cross products), returns t in 0..=1.
- `update_camera`: `/mnt/frankendom-donors/daeken-OpenEQ/crates/openeq/src/main.rs` 499-610 (mouse look and eye movement; the rest of the movement path, 611 on, was not read in full).
- `render_frame` call sites: `/mnt/frankendom-donors/daeken-OpenEQ/crates/openeq/src/main.rs` 1654-1658.
- Tests: `/mnt/frankendom-donors/daeken-OpenEQ/crates/openeq-assets/src/collision.rs` 973-1008 (floor from either side; nearest diagonal wall without sliding; huge padding returns the focus when a hit exists). Not run.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant | Unit | Where |
|---|---|---|---|
| Camera sits behind the eye along the look vector | 18 (main.rs 2340-2342) | units | zone data candidate (per-zone distance) |
| Focus is the eye, not the body | eye (2344); feet = eye - 6 (610) | units | engine constant |
| Pull-in clearance from the first hit | 0.35 (2347, 2352) | units | engine constant |
| Mouse look sensitivity | 0.0035 per mouse unit (33, 545-546) | ratio | player setting |
| Pitch clamp | +/- (pi/2 - 0.01) (547-548) | none (radians) | engine constant |
| Own body held 3 under the eye | 3 (live.rs 2117) | units | engine constant |
| Default vertical field of view | 70 degrees (scene.rs 832; whether the renderer reads it per frame was not checked) | none (degrees) | engine constant |
| Nearest-hit ray, both sides of triangles | none (structure) | none | engine constant |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (desired offset from the eye along the look vector, then one nearest-hit clip with clearance). It omits the second clip against the door world (the caller can pass a combined `firstHit`), the finite-number guards, the candidate grid (the caller supplies `firstHit`), the static-versus-door split, the own-body placement and the server send, and the movement code. `clampPitch` mirrors the donor's clamp in `update_camera`, not in `view_camera`. The sketch adds no smoothing; the donor has none.

```ts
// Licence: MIT OR Apache-2.0 (donor, Cargo.toml line 14). Shape adapted; written fresh in TypeScript.
export interface Vec3 { x: number; y: number; z: number; }

export interface OrbitView {
  yaw: number;           // radians; 0 looks along +Y
  pitch: number;         // radians; positive looks up
}

export interface ViewTuning {
  distance: number;      // units behind the eye (donor constant: 18)
  clearance: number;     // units kept clear of the first hit (donor constant: 0.35)
}

// Returns the parameter t in 0..1 of the first solid hit on from->to, or null if the segment is clear.
export type FirstHit = (from: Vec3, to: Vec3) => number | null;

const PITCH_LIMIT = Math.PI / 2 - 0.01;

export function clampPitch(pitch: number): number {
  return Math.min(PITCH_LIMIT, Math.max(-PITCH_LIMIT, pitch));
}

// Third-person view: the eye minus the look direction, pulled in to the first hit on the way.
export function thirdPersonView(eye: Vec3, look: OrbitView, tune: ViewTuning, firstHit: FirstHit): Vec3 {
  const cp = Math.cos(look.pitch);
  const sp = Math.sin(look.pitch);
  const desired: Vec3 = {
    x: eye.x - Math.sin(look.yaw) * cp * tune.distance,
    y: eye.y - Math.cos(look.yaw) * cp * tune.distance,
    z: eye.z - sp * tune.distance,
  };
  const length = Math.hypot(desired.x - eye.x, desired.y - eye.y, desired.z - eye.z);
  if (length <= 1e-7) return eye;
  const t = firstHit(eye, desired);
  const fraction = t === null ? 1 : Math.max(0, t - tune.clearance / length);
  return {
    x: eye.x + (desired.x - eye.x) * fraction,
    y: eye.y + (desired.y - eye.y) * fraction,
    z: eye.z + (desired.z - eye.z) * fraction,
  };
}
export {};
```

## 5. Lands in

- TARGET `src/fight/worldCamera.ts` (new, client-only; the engine never reads it): `thirdPersonView` plus a `firstHit` callback wired to the zone collision. Parity-checklist row 11 (fight camera).
- today: Frankendom's current world camera was not read in this pass.
- Reuse tag: adapt-allowed (MIT OR Apache-2.0; code may be adapted; keep the notice if any text is copied; this sketch is a fresh rewrite of the idea)
- Brief rule served: 11 (fight camera, client-only); the camera is not a server input.

## 6. Gaps and risks

- The donor does not answer the over-the-shoulder ask. Focus is on the centreline at eye height; there is no lateral offset, no shoulder side, no lock-on, no framing of several enemies, no FOV change in combat, no shake and no recentring. Grep for shoulder, shake, lock-on, recentre, zoom and fov changes in `openeq/src` and `openeq-render/src` found none for the camera. Those must be designed in Frankendom; the donor only supplies the pull-in.
- No damping. The pulled-in distance snaps. Our fix must be frame-rate independent smoothing on the pulled-in distance only, and it must never let the smoothed point cross the clearance. This is our addition, not the donor's.
- Client-only ruling: the donor sends the true eye to the server each frame (live.rs 2012) and never the pulled-in view. Frankendom must keep that split: the camera pull-in must not change the hero position the server uses for kills, hits or the one ledger.
- The ray starts at the eye. If the eye is inside geometry (a corridor edge, a ceiling beam), the hit is at zero and the camera collapses to the focus (collision.rs 245-248 says it does not depenetrate the focus). A designer will see a camera stuck inside a doorway.
- Pitch can reach almost plus or minus 90 degrees (546-548). The clip stops the camera at the floor, but there is no designer-set minimum or maximum pitch.
- Distance 18 and clearance 0.35 are hard-coded. Frankendom should make the distance zone data (tight zones want a shorter boom) and keep clearance an engine constant.
- The Pit camera is out of scope (this is the open-zone camera). The arena view should not change because of this.
- Candidate lookup falls back to every triangle when the segment box is large (collision.rs 757). A big zone can make the camera clip cost O(triangles) per frame; measure before adopting.


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: CLEAN.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** No errors found. Verified view_camera 2336-2356 (18 offset, 0.35 padding, door clip from focus to clipped point), clip_camera 249-270, segment_hit 144-160, candidates 752-764 (4096 at 757), update_camera pitch clamp 546-548 / 0.0035 (line 33) / feet=eye-6 (610), forward vector 595-597, schedule 328-342 (Update chain then Last render_frame), 1654-1658 order, live.rs 2012-2015 / 2117 / 2130, scene.rs fov 70deg 832, F9 1121-1122, reset 142, pick 2437, MIT OR Apache-2.0 Cargo.toml 14. Sketch matches donor math.

**Missed:** None material.
