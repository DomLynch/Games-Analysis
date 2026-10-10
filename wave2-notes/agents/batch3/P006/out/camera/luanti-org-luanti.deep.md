# luanti-org-luanti (camera, cell 14)

Donor: `/mnt/frankendom-donors/luanti-org-luanti/src/client/camera.cpp` | Licence: LGPL-2.1-or-later (camera.cpp line 2 SPDX header; `COPYING.LESSER` present) | C++ | symbol `Camera::update`

Checked: Read `Camera::update` (312-574) in full, `Camera::step` (118-203), `Camera::addArmInertia` (226-296) and the stairstep and FOV blocks in full. Read the frame loop `Game::run` (512-592) and `Game::updateCamera` (2570-2590). Only one caller of `Camera::update` was found by grep (`game.cpp` 2589). Not read: `camera.h`, `Camera::drawNametags` (657-737), `getFrustumCullPlanes` (754-765), the third-front mirror branch beyond line 419 (read only as the single `*= -1` line). Confidence high on the third-person pull-in (every line 413-461 read). Three lines the note relies on are under the 15-character quote minimum, so they are cited by line only, with no receipt: `camera.cpp` 421 (`my_cp.Y += 2;`), 428 (`if (i > 12)`) and `game.cpp` 582 (`dtime = 0.0f;`). The hint file `builtin/game/features.lua` is a feature-flag table, not the camera; the real code is `src/client/camera.cpp`. Licence is LGPL-2.1-or-later, which the brief does not list as permissive, so this is treated as shape-only, clean-room.

## 1. Mechanism

- Trigger: once per rendered frame. `Game::run` (`game.cpp` 519) takes `dtime` from the FPS limiter, so the step is variable. On pause `dtime` is set to 0 (582) but the camera still updates. `updateCamera` (game.cpp 2589-2590) calls `camera->update(player, dtime, ...)` then `camera->step(dtime)`. In `Game::run` the camera update comes after `step(dtime)` (584, `Game::step` at `game.cpp` 2114, body not read) and before the render (589), so the camera uses the position from the same frame.
- Order inside `Camera::update`: (a) stairstep smoothing on the player node's Y (328-342); (b) eye offset and tilt on the head node (354-378); (c) view-bobbing offset applied to the relative camera position (386-403); (d) head transform gives the absolute eye position and view direction (406-411); (e) third-person pull-in (413-453); (f) camera node position and target (455-461); (g) FOV (463-500); (h) wielded tool position, arm inertia and digging animation (505-544); (i) bobbing state from speed (556-573).
- Third-person pull-in (413-453). Runs only when the mode is not first person (414). The march starts from the eye position `m_camera_position` with +2 raw units added to Y (421). It then steps backwards along the view direction in 1-unit steps (`BS` is 10 units per node, so 0.1 node) for i from 10 to 27 (425). X and Z always move back by `i` (426-427). Y moves with the pitch only from i = 13 on (428-429); for i = 10, 11, 12 Y keeps the +2 lift. Each step samples the node at that point (432-434). The first node whose `walkable` flag is set stops the march (437-443).
- On a hit: the camera moves half a node forward along the view direction (438-440), and if it is still more than 2 nodes above the player position, Y is clamped to player Y + 2 nodes (447-448). With no hit, the camera stays at the last sample, which is 27 units (2.7 nodes) back.
- Stairstep smoothing (328-342). When the player moves up by more than 0.01 and no more than the step height in one step, and is on the ground, the smoothing flag is set (332-336). While it is set, the camera's Y is blended back to the old Y with `t = exp(-23 * frametime)` (340-341). So the camera rises over a few frames instead of jumping up a stair. The flag clears when the upward motion is outside that range.
- Mouse-look smoothing (`game.cpp` 562-577): with `camera_smoothing` (or cinematic) > 0, the yaw and pitch are moved toward the target by `damp(a, b, lambda)` with `lambda = dtime / smoothing`. `damp` is `lerp(a, b, 1 - exp(-lambda))` (`numeric.h` 445; `irrMath.h` 123 gives `lerp` as `a*(1-t) + b*t`).

## 2. Key functions

- `Camera::update` (312-574): the whole per-frame camera pipeline, in the order above.
- Third-person pull-in block (413-453): `/mnt/frankendom-donors/luanti-org-luanti/src/client/camera.cpp` lines 413-453.
- Stairstep smoothing block (328-342): `/mnt/frankendom-donors/luanti-org-luanti/src/client/camera.cpp` lines 328-342.
- `damp` (`/mnt/frankendom-donors/luanti-org-luanti/src/util/numeric.h` 444-446) and the damped mouse look (`/mnt/frankendom-donors/luanti-org-luanti/src/client/game.cpp` 562-577).
- `Game::updateCamera` (`game.cpp` 2570-2590): the single caller found.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| March from the eye back along the view ray in fixed small steps; stop at the first solid sample; back off half a step toward the eye | Step 1 unit, range 10 to 27 units, i.e. 1 to 2.7 nodes with BS = 10 (theirs, `constants.h` 61 `#define BS 10.0f`; `camera.cpp` 425) |
| Height follows pitch only after the first few steps, so the near part of the march keeps a fixed lift | Lift +2 raw units (421); pitch threshold step 13 (428) |
| On collision, cap the camera height at a fixed offset above the player | Cap at player Y + 2 nodes (447) |
| Exponential blend of a step-up back to the old height | Rate 23 per second: `exp(-23 * frametime)` (340) |
| Frame-rate-aware exponential smoothing | `lambda = dtime / smoothing time` (game.cpp 566); `1 - exp(-lambda)` (numeric.h 445) |

## 4. TypeScript sketch

simplified: the sketch keeps the third-person pull-in (fixed-step march back along the view ray, stop at the first walkable sample, half-node back-off, height clamp) and the `damp` helper. It takes `isWalkable` as a callback in world units instead of reading a node map with `floatToInt(..., BS)`. It omits the third-front mirror (`camera.cpp` 418-419), the view-bobbing offset applied to the eye before the march (386-403), the stairstep smoothing (328-342), the FOV, wield and arm-inertia code, and the donor's `player_position` clamp is taken as a feet height (not verified that the donor's player position is the feet).

```ts
// clean-room: written from the described mechanism, not a translation of the donor lines
type V3 = { x: number; y: number; z: number };

const UNIT = 10;        // units per node (donor BS)
const LIFT = 2;         // raw units added above the eye before the march
const PITCH_FROM = 13;  // march step from which Y follows the view pitch

// Third-person camera: march back from the eye along the view ray in 1-unit steps,
// stop short of the first walkable sample, then clamp height near the feet.
export function thirdPersonCamera(
  eye: V3, dir: V3, feetY: number, isWalkable: (p: V3) => boolean,
): V3 {
  const cam: V3 = { x: eye.x, y: eye.y + LIFT, z: eye.z };
  let hit = false;
  for (let i = UNIT; i <= UNIT * 2.75; i++) {
    cam.x = eye.x - dir.x * i;
    cam.z = eye.z - dir.z * i;
    if (i > PITCH_FROM) cam.y = eye.y - dir.y * i;
    if (isWalkable(cam)) {
      cam.x += dir.x * (UNIT / 2);
      cam.y += dir.y * (UNIT / 2);
      cam.z += dir.z * (UNIT / 2);
      hit = true;
      break;
    }
  }
  if (hit && cam.y > feetY + UNIT * 2) cam.y = feetY + UNIT * 2;
  return cam;
}

// Exponential smoothing toward a target; lambda = dt / smoothing time.
export function damp(a: number, b: number, lambda: number): number {
  return a + (b - a) * (1 - Math.exp(-lambda));
}
```

Typecheck: `work/luanti/camera-pullin.ts` (with `export {};`) passed `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/camera.ts` (proposed module; fight camera is client-only). Parity-checklist row 11 (fight camera). The third-person eye point and the pull-in are view state only.
- today: Frankendom's current camera file was not checked in this pass (no repo access in this task). The donor's own camera is `src/client/camera.cpp`.
- Reuse tag: rewrite-from-idea (LGPL-2.1-or-later; shape only, clean-room)
- Brief rule served: camera and HUD are client-only (ruling). The pull-in is a render rule and never decides whether a hit lands.

Best transferable idea: Keep the fight camera out of walls with a fixed-step march back along the view ray that stops at the first solid sample, instead of per-wall geometry.

## 6. Gaps and risks

- LGPL-2.1-or-later is not on the brief's permissive list. Shape only: the sketch is written from the described mechanism, not translated from the donor lines.
- Camera-ray hit tests must never decide a kill. Frankendom's kills are server-verified, so the camera's collision result can only move the view, never the ledger.
- The march samples single points on a node grid with a walkable flag. Frankendom's arenas and zones are data, so the fight camera needs the same wall data as a client query from the zone or Pit geometry. The data shape is not defined here.
- The pull-in frames one eye point against one view direction. Framing up to MAX_ATTACKERS = 3 attackers is not covered by this mechanism; that needs its own rule (not read in this donor).
- Stairstep smoothing and mouse damp are separate effects. A fight camera that follows a hit-stop or knockback should not reuse the stairstep blend without a test, because the donor applies it only to upward player steps.
- Frame timing: `dtime` is variable (FPS limiter, `game.cpp` 519). The damp and the stairstep blend are frame-rate-aware, but the march itself is a per-frame check. If Frankendom runs the camera on a fixed tick, the same check must run on the render frame, not the tick.
- Not read: the nametag and frustum helpers, and `camera.h`. Nothing in this note depends on them.



## Checker findings (Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code.

**Errors / corrections:** Sketch-omission text says view-bobbing offset is 'applied to the eye before the march (386-403)'; real code applies bobbing only when m_camera_mode < CAMERA_MODE_THIRD (camera.cpp 387-388), so it never precedes the third-person march. All other claims verified: licence SPDX line 2, march loop 425-429 (10..27, i>12), hit back-off BS/2 438-440, Y clamp 447-448, stairstep exp(-23 dt) 340, damp numeric.h 444-446, game.cpp 519/566/582/584/589/2589-2590, BS=10 constants.h 61

**Missed:** none significant
