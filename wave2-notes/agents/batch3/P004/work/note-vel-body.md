# veloren-veloren (camera, cell 2)

Donor: `/mnt/frankendom-donors/veloren-veloren/voxygen/src/scene/camera.rs` | Licence: GPL-3.0 (`/mnt/frankendom-donors/veloren-veloren/LICENSE` lines 1-2: "GNU GENERAL PUBLIC LICENSE", "Version 3, 29 June 2007") | Rust | symbol `Camera::update` (with `compute_dependents_near` and `zoom_switch`)

Checked: `camera.rs` lines 1-69 and 314-805 read in full (70-313 are projection helpers, not read). Callers read: `scene/mod.rs` 759 (`update`), 762 (`compute_dependents`), 430 and 448-460 (rotate and zoom input); `session/mod.rs` 2249 calls `scene.maintain` each frame unless paused, and 1625 passes `clock.game_dt()` into the client tick. Time sources read: `common/state/src/state.rs` 870-877 (game time advances by dt times time scale; `DeltaTime` is capped at `MAX_DELTA_TIME` = 1.0 s). Not read: `Lerp::lerp` (vek), the `terrain.ray` implementation, the client clock's `game_dt`. Confidence: high on the camera logic and constants (each has a receipt); medium on the real frame rate the clock delivers.

## 1. Mechanism

- Third-person orbit camera about a focus point. Its state: target and current distance, target and current yaw and pitch, focus, mode (first or third person), fov, fixate. Each frame `scene/mod.rs` 759 calls `update`, then 762 `compute_dependents` builds the view.
- Input (`rotate_by`, camera.rs 517-525): the mouse delta is multiplied by `fixate` (aim zoom, line 518), yaw wraps modulo 2 pi, and pitch is clamped to about +/- (pi/2 - 0.001) (522).
- Zoom input (`scene/mod.rs` 450, 456): the step is `delta * (0.05 + distance * 0.01)`, so zoom steps grow with distance. `zoom_switch` (551-572): in third person the target distance moves by the step; if it would fall under `MIN_THIRD_PERSON * scale` (2.35 times the player's scale, 554-557) the mode becomes first person; zooming out of first person returns to third person at 2.35 times scale (563-565). The result is capped by the zoom cap.
- Collision (`compute_dependents`, 356-373): if the target distance is under 20 (368) use the near policy, else the far policy.
  - Near policy (375-443): a fan of rays from the focus to the four padded frustum corners plus one ray behind the camera (392-421). Each ray that hits an opaque voxel gives `min(hit, target distance)`; a ray that hits nothing keeps the current distance. The smallest value wins. If that is under 2 (426), switch to the far policy. Otherwise, if the current distance is at least the collision distance, the current distance drops to it at once (429-430), and the view uses that distance.
  - Far policy (445-470): one ray from the camera position back to the focus; a hit gives `min(dist - d - 0.03, dist)` for this frame's view (460). It does not write `self.dist`.
- Easing (`update`, 580-638): distance and fov ease toward their targets with factor `0.65 * delta / interp_time` (587), where `delta` is the change in the game time value (582) and `interp_time` is 0.1 s in both modes (11-12, 649-655). Focus eases toward its target at `delta / interp_time`, twice as fast in first person (607-619). Orientation eases at `LERP_ORI_RATE * dt` (15 per second, 630-632) with the wrap-aware `lerp_angle` (799-805), or snaps when smoothing is off (634-635), then goes through `clamp_and_modulate` (637).
- The source comment at 581 says the timing is "horribly frame time dependent".
- The view matrix (472-500): translate back by `dist`, then the orientation rotations, then a translation by the focus fraction. The far-plane and near-plane constants are at 8-9.

Best transferable idea: Clamp the camera distance to the nearest terrain hit from the focus, snapping in on a hit and easing back out, with a wrap-aware angle ease and a zoom that drops to first person under a minimum scaled by the player's size.

Reuse tag: rewrite-from-idea (GPL-3.0: clean-room only)

Brief rule served: one engine, client-only camera (the camera is a client concern; the fight camera is parity row 11)

## 2. Key functions

- `Camera::update`: `/mnt/frankendom-donors/veloren-veloren/voxygen/src/scene/camera.rs` 580-638. Eases distance, fov, focus and orientation each frame.
- `Camera::compute_dependents_near`: `/mnt/frankendom-donors/veloren-veloren/voxygen/src/scene/camera.rs` 375-443. Fan-of-rays terrain clip with the snap-in rule.
- `Camera::compute_dependents_far`: `/mnt/frankendom-donors/veloren-veloren/voxygen/src/scene/camera.rs` 445-470. Single back-ray clip, view only.
- `Camera::zoom_switch`: `/mnt/frankendom-donors/veloren-veloren/voxygen/src/scene/camera.rs` 551-572. Wheel zoom with the first-person switch.
- `Camera::rotate_by`: `/mnt/frankendom-donors/veloren-veloren/voxygen/src/scene/camera.rs` 517-525. Input rotation scaled by fixate.
- `lerp_angle`: `/mnt/frankendom-donors/veloren-veloren/voxygen/src/scene/camera.rs` 799-805. Shortest-arc angle ease.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Clamp the view to the nearest opaque hit from the focus, snap in, ease out | Max ray steps 500 (411, 456); the padding 0.6 on the corners (404); the back-ray offset 0.5 (406); the far pull-in margin 0.03 (460) |
| Switch to a close-range policy below a distance | Policy switch band 2 to 20 (15, 368, 426) |
| Ease a value over the frame time with a fixed interp time | Interp time 0.1 s for both modes (11-12); factor 0.65 (587) |
| Ease an angle the short way round | Orientation rate 15 per second (14, 630) |
| Zoom step grows with distance; first-person switch below a scaled minimum | Step 0.05 + 0.01 times distance (450); minimum 2.35 times the player scale (554) |
| Limit pitch | Margin 0.0001 when set (65), 0.001 when rotated (522). The two margins differ |
| Fixate scales input and FOV | Input times fixate (518); effective FOV is fov times fixate (701) |

## 4. TypeScript sketch

simplified: keeps the donor's order: input (wrap yaw, clamp pitch, scale by fixate), zoom with the first-person switch, per-frame easing (distance, then orientation), then the view distance from a fan of corner rays with a back ray, the snap-in rule and the far policy. It omits the view matrix and frustum, the projection, fov and focus easing, freefly mode, the `get_mode` display trick, the corner padding formula (the caller passes padded corners), and the scene's viewpoint offsets. It uses one pitch margin (the donor uses 0.0001 on set and 0.001 on rotate). It clamps the ease factors to 1 (the donor's `Lerp::lerp` was not read, so whether it clamps is unknown). The far policy returns the view distance without storing it, as the donor does. The sketch typechecks on the VPS with `npx -p typescript tsc --noEmit --strict --target es2020`, exit 0.

```ts
@@CODE@@
```

## 5. Lands in

- TARGET `src/fight/camera.ts` (client-only fight camera; the engine does not depend on it). Parity-checklist row 11 (fight camera). The donor's camera is a general orbit camera with no fight framing, so the framing rule for up to MAX_ATTACKERS = 3 attackers must be designed on top of it.
- Reuse tag: rewrite-from-idea (GPL-3.0: clean-room only)
- Brief rule served: one engine with a client-only camera (the camera reads state, never writes it); zones as data for the camera constants (min third-person distance, interp time, pitch limit)

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the described mechanism, not translated.
- Two clocks: distance and fov use the change in game time (`Time` advances by dt times time scale and is not capped, state.rs 870), while orientation uses `DeltaTime`, which is capped at 1.0 s (state.rs 876-877). Frankendom's camera must pick one clock and say which.
- Overshoot risk: the distance factor is `0.65 * delta / 0.1`, which passes 1 when delta is above about 0.154 s (camera.rs 587). The orientation factor `15 * dt` passes 1 when dt is above about 0.067 s (630). Whether the donor clamps depends on `Lerp::lerp`, which was not read. The sketch clamps; Frankendom must test low frame rates.
- Snap-in and ease-out: collisions snap the distance in at once (429-430) but the far policy never stores its result (445-470). A fight camera that snaps in on a wall hit can jolt during a duel; Frankendom must decide whether to snap, ease or both.
- Ray cost: up to five rays of up to 500 steps per frame (392-421, 411). No timing was measured.
- No fight framing: the donor follows one focus point and has no rule for framing several attackers. MAX_ATTACKERS = 3 needs a framing rule the donor does not supply.
- Scaled first-person switch: the threshold scales with the player's size (554). Frankendom's hero and creature scale must be zone or catalogue data, not a constant.
- Not read: `Lerp::lerp`, `terrain.ray`, the client clock behind `game_dt`, camera.rs 70-313 (projection code), and the viewpoint offsets in scene/mod.rs 684-716 beyond the tilt line.
