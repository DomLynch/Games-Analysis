# dkfans-keeperfx (camera, cell 14)

Donor: `/mnt/frankendom-donors/dkfans-keeperfx/src/local_camera.c` (camera helpers in `/mnt/frankendom-donors/dkfans-keeperfx/src/engine_camera.c`) | Licence: GPL-2.0-or-later (file headers: "either version 2 of the License, or (at your option) any later version"; the donor LICENSE file is GPL v2) | C | symbol `step_local_possession_camera`

Checked: camera_scope = world camera. Symbol `step_local_possession_camera` is defined at local_camera.c 661 and closes at 683 (read in full). Also opened in full: engine_camera.h, engine_camera.c, local_camera.c. Also opened: packets.c 395-545 and 1270-1340; player_instances.c 113-160, 425-451, 882-919; player_utils.c 1234-1262; front_input.c 3016-3020; game_loop.c 500-520; bflib_planar.c 80-180 (partial); bflib_math.c 575-605; engine_render.c 6744-6800 (partial, mappos use only). Only caller of `step_local_possession_camera` in the whole src tree: player_instances.c:449. Confidence: high on the arithmetic and the order of steps; low on on-screen placement (see section 6). NOT read: the isometric projection that turns the focus point into a screen position; the body of `user_zoom_min`; `get_creature_eye_height`; `first_person_horizontal_fov`; the caller of `process_players`.

Best transferable idea: a third-person follow camera can keep a focus point a fixed distance ahead of the hero, turn its yaw toward the hero's facing by a capped angle each tick, and move the focus by a capped distance each tick, so it never snaps.
Decision (proposed): adapt - the per-turn clamped follow (turn limit to facing, per-axis move limit, zoom-in while controlled) is the shape the world camera needs; not adopt, because the donor is a top-down isometric grid camera with no wall test and no lateral shoulder offset, which the owner's over-the-shoulder camera needs.
Acceptance: after a 180-degree turn of the hero in a world zone, the camera yaw reaches the hero's facing in a bounded number of steps, and a unit test asserts that no step changes yaw by more than the turn limit and no focus axis moves more than the move limit.

## 1. Mechanism

- This is the possession camera. When the player takes direct control of a creature in the isometric view, one function runs once per game turn and moves the local camera toward that creature.
- Gate: it runs only when the FrontView pref is off (player_instances.c 448-449). It writes only the local camera's `destination` pose (local_camera.c 666), not the canonical dungeon camera, so the engine and other players never read it. The donor's comment says so: "possession zoom applies to local camera only" (local_camera.c 660).
- Order of steps, as the code runs (local_camera.c 666-682):
  (a) Zoom in one step: `zoom_in_step` multiplies the zoom by 100/85 (integer division), forces at least +1, and caps at 30000 (667; engine_camera.c 143-148).
  (b) Yaw turns toward the creature's facing: the signed difference is computed and wrapped to the 2048-unit circle (669), clamped to plus or minus DEGREES_30 (170 units, about 30 degrees) (672), and added to the camera yaw (673).
  (c) Look-ahead point: `radius` = creature eye height plus creature z (675). The point is the creature position plus `radius` along the NEW yaw, using the planar helpers (676-677). The helpers take x = sin and y = -cos of the angle (bflib_planar.c 86-98).
  (d) The focus moves toward that point. The per-axis difference is clamped to plus or minus 128 units and added (678-679). No map-bounds clamp here.
  (e) Input velocity is cleared (680-682).
- Driver and timing: the step is the per-turn instance maintenance slot. `process_players` (player_utils.c 1255-1259) calls `process_player_instances`, which decrements `instance_remain_turns` and calls the maintenance callback once per turn (player_instances.c 882-897, 910-919). Between turns the renderer does not step the camera: `interpolate_local_cameras` lerps previous to destination by `interpolate_time` (local_camera.c 554-575), and `interpolate_time` is `process_turn_time` clamped to 0..1 (game_loop.c 512).

Other camera pieces in the same files (also read, transferable as shape):
- Pan speed by zoom: the input velocity is clamped (engine_camera.c 243-254) and halves each camera step with no input (451-452). The per-step pan rate is 2560000 / zoom (packets.c 410), times 3 when speeding up (413). Pan slows as the view gets closer, because a larger zoom value is closer (engine_camera.h 39-40).
- Zoom at the cursor: zoom steps are x85/100 out and x100/85 in (engine_camera.c 145, 153), and the focus shifts toward the anchor by `dx * (new - old) / new` (195).
- Move-to-point: each update moves by max(distance/8, 256) and snaps on arrival (engine_camera.c 474, 481-494). Used by map jumps and zoom-to-position (player_instances.c 147-149).
- Shake: a quake counter of 30 frames (power_specials.c 500) adds a random plus or minus 40 jitter at render time (local_camera.c 540-542). A jump offset along the iso yaw (local_camera.c 517-521) decays by 32 per update (engine_camera.c 508-509).
- First person: the eye height eases halfway to target each update (engine_camera.c 345), there is a head bob of 16 units while walking (331), and the eye is capped 64 units under the ceiling (370-371). Only the ceiling is checked. No wall test is made.

## 2. Key functions

- `step_local_possession_camera`: `/mnt/frankendom-donors/dkfans-keeperfx/src/local_camera.c` 661-683. The whole follow step.
- `update_local_cameras`: `/mnt/frankendom-donors/dkfans-keeperfx/src/local_camera.c` 408-523. Per-turn driver for the other camera modes; the step gate is `update_local_camera_time` (391-406), called from input at `/mnt/frankendom-donors/dkfans-keeperfx/src/front_input.c` 3020.
- `interpolate_local_cameras`: `/mnt/frankendom-donors/dkfans-keeperfx/src/local_camera.c` 554-589. Render-time lerp between turns.
- `view_process_camera_velocity`: `/mnt/frankendom-donors/dkfans-keeperfx/src/engine_camera.c` 426-466. Applies velocity, then halves the velocity when there is no input.
- `zoom_in_step` / `zoom_out_step`: `/mnt/frankendom-donors/dkfans-keeperfx/src/engine_camera.c` 143-157.
- `view_move_camera_to_position` and `view_set_camera_move_to_position`: `/mnt/frankendom-donors/dkfans-keeperfx/src/engine_camera.c` 468-494.
- `update_first_person_position`: `/mnt/frankendom-donors/dkfans-keeperfx/src/engine_camera.c` 326-408.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Zoom in: multiply by 100/85 (integer), at least +1, then cap | 100, 85 (engine_camera.c 145-148); possession cap 30000 (local_camera.c 667) |
| Possession zoom cap is above the normal zoom max, do not copy it | Normal max `CAMERA_ZOOM_MAX` 12000 (engine_camera.h 40) |
| Yaw turn per step | Plus or minus 170 units of 2048 per turn (`DEGREES_30`, globals.h 187; `ANGLE_MASK` 2047, globals.h 178), applied at local_camera.c 672 |
| Focus move per axis per step | Plus or minus 128 map units (local_camera.c 678-679) |
| Look-ahead distance | Eye height plus creature z (local_camera.c 675); the eye height function was not read |
| Input velocity halves with no input | Divide by 2 (engine_camera.c 452) |
| Input velocity limit | Clamp to the limit from the rate (engine_camera.c 247) |
| Pan rate | 2560000 / zoom, times 3 when speeding up (packets.c 410, 413) |
| Move-to step | max(distance / 8, 256) (engine_camera.c 474) |
| Shake jump decay | Minus 32 per update (engine_camera.c 509); quake 30 frames (power_specials.c 500); jitter plus or minus 40 (local_camera.c 541) |
| First-person eye ease | Halfway per update (engine_camera.c 345); head bob 16 (331); ceiling margin 64 (370-371) |
| Angle helpers | x = sin, y = -cos over 2048 units (bflib_planar.c 86, 97; table range bflib_math.c 583-587) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (zoom step, yaw turn clamp, look-ahead from the new yaw, per-axis move clamp, velocity clear). It omits the local-only pose and the render interpolation, the FrontView and map-screen gates, the instance countdown, the map-bounds clamp on the focus, the eye-height call (passed in as `eyeRadius`), the first-person camera, and the zoom minimum. It uses Math.sin and Math.cos where the donor uses its 2048-entry table, and it uses doubles where the donor uses 64-bit integers. The donor's `- y` helper is floor-then-negate, and the sketch mirrors that.

```ts
// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const ANGLE_FULL = 2048;   // angle units per full turn (donor ANGLE_MASK + 1)
const TURN_LIMIT = 170;    // max yaw change per step (donor DEGREES_30)
const MOVE_LIMIT = 128;    // max focus move per step, per axis (donor clamp of 128)
const ZOOM_CAP = 30000;    // zoom cap used while possessing (donor literal 30000)

export interface FollowCam {
  x: number;          // focus point, map units
  y: number;
  yaw: number;        // camera yaw, angle units
  zoom: number;
  velocityX: number;  // input velocity, cleared by the follow step
  velocityY: number;
}

export interface FollowTarget {
  x: number;          // controlled creature position
  y: number;
  facing: number;     // creature facing, angle units
  eyeRadius: number;  // eye height plus creature height, map units
}

function wrapAngle(a: number): number {
  return ((a % ANGLE_FULL) + ANGLE_FULL) % ANGLE_FULL;
}

// Shortest signed turn from `from` to `to`, in (-1024, 1024].
function signedTurn(from: number, to: number): number {
  let d = wrapAngle(to - from);
  if (d > ANGLE_FULL / 2) d -= ANGLE_FULL;
  return d;
}

function clampN(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

// Donor zoom_in_step: multiply by 100/85 (integer), force at least +1, then cap.
function zoomInStep(zoom: number, cap: number): number {
  let next = Math.floor((100 * zoom) / 85);
  if (next === zoom) next++;
  return Math.min(next, cap);
}

// Offset along a yaw: x uses sin, y uses -cos (angle 0 points to map north, y decreasing).
function offsetAlongYaw(yaw: number, distance: number): { dx: number; dy: number } {
  const r = (2 * Math.PI * yaw) / ANGLE_FULL;
  return { dx: Math.floor(distance * Math.sin(r)), dy: -Math.floor(distance * Math.cos(r)) };
}

// One follow step per game turn. Order as in the donor: zoom in, turn yaw toward the
// creature's facing (at most TURN_LIMIT), then move the focus toward the point eyeRadius
// along the new yaw, clamped per axis to MOVE_LIMIT. Input velocity is cleared.
export function followStep(cam: FollowCam, t: FollowTarget): void {
  cam.zoom = zoomInStep(cam.zoom, ZOOM_CAP);
  const turn = clampN(signedTurn(cam.yaw, t.facing), -TURN_LIMIT, TURN_LIMIT);
  cam.yaw = wrapAngle(cam.yaw + turn);
  const ahead = offsetAlongYaw(cam.yaw, t.eyeRadius);
  cam.x += clampN(t.x + ahead.dx - cam.x, -MOVE_LIMIT, MOVE_LIMIT);
  cam.y += clampN(t.y + ahead.dy - cam.y, -MOVE_LIMIT, MOVE_LIMIT);
  cam.velocityX = 0;
  cam.velocityY = 0;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/QC013-dkfans-follow.ts) exits 0 with no output.

## 5. Lands in

- TARGET `src/fight/camera.ts` (new module, client-only world follow camera). The engine never reads it. Parity-checklist row 11 (fight camera).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 11 (fight camera is client-only; the camera never affects a server verdict); ruling "camera/HUD/sound are client-only".

## 6. Gaps and risks

- No wall pull-in in any camera path. This matters most for the owner's ask. `project_point_to_wall_on_angle` (engine_camera.c 109-130) walks a ray to a solid wall, but it is called by ranged-attack code (thing_creature.c 3802, 3814; thing_traps.c 1345), not by the camera. In local_camera.c, engine_camera.c and packets.c (and their headers) the only solid test is inside that function (engine_camera.c 121). Frankendom needs collision from another source.
- Sign of the look-ahead is unverified. The comment says "move toward a point behind the creature's eyes" (local_camera.c 674). The arithmetic puts the focus at creature plus `radius` along the camera yaw, and the turn step sets that yaw to the creature's facing, so the point is ahead of the creature along its facing. Whether the creature then draws behind the screen centre depends on the isometric projection, which I did not trace. A Frankendom test must check this on screen before the sign is used.
- Possession zoom cap 30000 is well above the normal zoom max of 12000 (engine_camera.h 40). Do not copy the cap; use the normal max.
- The 30-degree-per-turn yaw limit is a game-turn rate. A 180-degree turn takes several turns. Whether that feels right is a designer choice, so it should be a data field, not a constant.
- No lock-on and no multi-target framing. A grep of the camera code for lock or target framing found none. Many-on-one framing has to come from elsewhere; this note does not supply it.
- No combat FOV change. `horizontal_fov` is set once per camera at init (local_camera.c 213-227) and the follow step does not change it. The source of `first_person_horizontal_fov` was not read.
- The donor's shake is render-only jitter for a fixed count (30 frames), not tied to damage. An impact camera for Frankendom should be a client shake keyed to a server-verified hit event.
- Client-only by design: the donor comment says the possession zoom applies to the local camera only (local_camera.c 660). This matches the ruling that the camera is client-only.
- Licence GPL-2.0-or-later: clean-room. The sketch is written from the arithmetic, not translated from the donor lines.
- Values a designer might want as tunable settings: the zoom minimum comes from a user preference (`user_zoom_min`, packets.c 516; body not read); the tilt limits and default (`CAMERA_TILT_*`, engine_camera.h 46-48) are config-clamped (config_settings.c 518).



## Checker findings (Sonnet 5.5 medium, 2026-10-10)
**Verdict: CLEAN.** Independent check against the donor code.

**Errors / corrections:** None in main claims. Verified local_camera.c 661-683 order (zoom_in_step 100/85 +1 cap 30000, yaw clamp DEGREES_30=170, radius=eye height+z, per-axis clamp 128, velocity clear), engine_camera.c 143-148/243-254/474, packets.c 410/413 (2560000/zoom, x3), bflib_planar.c 86-98, LICENSE GPL v2, quake 30 / +-40 jitter / -32 decay, wall-ray only in project_point_to_wall_on_angle. Nits: step also zeroes velocity_rotation (682); interpolation lerp factor is interpolate_time only if Ft_DeltaTime is on (local_camera.c ~561), not stated.

**Missed:** Step is gated by local_camera_follows_player() and not PVT_MapScreen at 662-664 (note mentions only FrontView gate).
