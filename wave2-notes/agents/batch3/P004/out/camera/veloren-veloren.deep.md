# veloren-veloren (camera, cell 2)

Donor: `/mnt/frankendom-donors/veloren-veloren/voxygen/src/scene/camera.rs` | Licence: GPL-3.0 (`/mnt/frankendom-donors/veloren-veloren/LICENSE` lines 1-2: "GNU GENERAL PUBLIC LICENSE", "Version 3, 29 June 2007") | Rust | symbol `Camera::update` (with `compute_dependents_near` and `zoom_switch`)

Checked: `camera.rs` lines 1-69 and 314-805 read in full (70-313 are projection helpers, not read). Callers read: `scene/mod.rs` 759 (`update`), 762 (`compute_dependents`), 430 and 448-460 (rotate and zoom input); `session/mod.rs` 2249 calls `scene.maintain` each frame unless paused, and 1625 passes `clock.game_dt()` into the session's `tick`. Time sources read: `common/state/src/state.rs` 870-877 (game time advances by dt times time scale; `DeltaTime` is capped at `MAX_DELTA_TIME` = 1.0 s). Not read: `Lerp::lerp` (vek), the `terrain.ray` implementation, the client clock's `game_dt`. Confidence: high on the camera logic and constants (each has a receipt); medium on the real frame rate the clock delivers.

## 1. Mechanism

- Third-person orbit camera about a focus point. Its state: target and current distance, target and current yaw and pitch, focus, mode (first or third person), fov, fixate. Each frame `scene/mod.rs` 759 calls `update`, then 762 `compute_dependents` builds the view.
- Input (`rotate_by`, camera.rs 517-525): the mouse delta is multiplied by `fixate` (aim zoom, line 518), yaw wraps modulo 2 pi, and pitch is clamped to about +/- (pi/2 - 0.001) (522).
- Zoom input (`scene/mod.rs` 448-460): the step is `delta * (0.05 + distance * 0.01)`, so zoom steps grow with distance. Zooming in (`delta < 0`) divides that step by `(1 - delta * 0.01)` (448-452), so the distance travelled in and out is symmetric; zooming out uses the plain step. `zoom_switch` (551-572): in third person the target distance moves by the step; if it would fall under `MIN_THIRD_PERSON * scale` (2.35 times the player's scale, 554-557) the mode becomes first person; zooming out of first person returns to third person at 2.35 times scale (563-565). The result is capped by the zoom cap.
- Collision (`compute_dependents`, 356-373): if the target distance is under 20 (368) use the near policy, else the far policy.
  - Near policy (375-443): a fan of rays from the focus to the four padded frustum corners plus one ray behind the camera (392-421). Each ray that hits an opaque voxel gives `min(hit, target distance)`; a ray that hits nothing keeps the current distance. The smallest value wins. If that is under 2 (426), switch to the far policy. Otherwise, if the current distance is at least the collision distance, the current distance drops to it at once (429-430), and the view uses that distance.
  - Far policy (445-470): one ray from the camera position back to the focus, with the opposite stop test to the near policy. `compute_dependents` passes `block.is_opaque()` as the `is_transparent` argument (357); the near rays stop at the first opaque voxel (`until(is_transparent)`, 412), but the far ray stops at the first NON-opaque voxel (`until(|b| !is_transparent(b))`, 457). A stop gives `min(dist - d - 0.03, dist)` for this frame's view (460), so it detects a camera that sits inside solid terrain (d is how far the ray travels before leaving the solid); in open air the ray stops at once with d = 0 and the view is `dist - 0.03`. No stop leaves `dist`. It does not write `self.dist`.
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
| Zoom step grows with distance (zoom in divided by 1 - delta x 0.01 so in and out match); first-person switch below a scaled minimum | Step 0.05 + 0.01 times distance and divisor 0.01 (scene/mod.rs 448-460); minimum 2.35 times the player scale (554) |
| Limit pitch | Margin 0.0001 when set (65), 0.001 when rotated (522). The two margins differ |
| Fixate scales input and FOV | Input times fixate (518); effective FOV is fov times fixate (701) |

## 4. TypeScript sketch

simplified: keeps the donor's order: input (wrap yaw, clamp pitch, scale by fixate), zoom with the first-person switch, per-frame easing (distance, then orientation), then the view distance from a fan of corner rays with a back ray (stop at the first opaque voxel), the snap-in rule and the far policy (its own ray stops at the first non-opaque voxel, so the terrain interface has two queries). It models the wheel step including the zoom-in divisor. It omits fixate easing (599-605), the view matrix and frustum, the projection, fov and focus easing, freefly mode, the `get_mode` display trick, the corner padding formula (the caller passes padded corners), and the scene's viewpoint offsets. It uses one pitch margin (the donor uses 0.0001 on set and 0.001 on rotate). It clamps the ease factors to 1 (the donor's `Lerp::lerp` was not read, so whether it clamps is unknown). The far policy returns the view distance without storing it, as the donor does. The sketch typechecks on the VPS with `npx -p typescript tsc --noEmit --strict --target es2020`, exit 0.

```ts
// Licence of donor: GPL-3.0. clean-room sketch written from the described mechanism, not a translation of the donor lines.
export {};

interface Vec3 { x: number; y: number; z: number; }
type Mode = "first" | "third";

// Rays into the voxel grid, each giving the distance along the ray to its stop voxel, or undefined for none.
// firstOpaque stops at the first opaque voxel (near policy); firstClear stops at the first non-opaque voxel (far policy).
interface Terrain {
  firstOpaque(from: Vec3, to: Vec3, maxSteps: number): number | undefined;
  firstClear(from: Vec3, to: Vec3, maxSteps: number): number | undefined;
}

const TAU = 2 * Math.PI;
const LERP_ORI_RATE = 15;   // orientation eases at this rate times dt (seconds)
const INTERP_TIME = 0.1;    // distance eases over this many seconds
const NEAR_LIMIT = 20;      // corner-fan (near) policy only below this target distance
const FAR_LIMIT = 2;        // a fan result closer than this switches to the far policy
const MIN_ZOOM = 0.1;
const MIN_THIRD = 2.35;     // third person starts at this distance times the player scale
const PITCH_LIMIT = Math.PI / 2 - 0.0001;
const MAX_STEPS = 500;

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const clamp01 = (t: number): number => Math.min(1, Math.max(0, t));
const wrap = (a: number): number => ((a % TAU) + TAU) % TAU;

// Shortest-arc easing of an angle: pick the 2*pi wrap of b that is closest to a, then lerp.
function lerpAngle(a: number, b: number, rate: number): number {
  let best = 0;
  for (const o of [-TAU, 0, TAU]) {
    if (Math.abs(a - (b + o)) < Math.abs(a - (b + best))) best = o;
  }
  return lerp(a, b + best, clamp01(rate));
}

export class OrbitCamera {
  dist = 10;
  tgtDist = 10;
  yaw = 0;
  pitch = 0;
  tgtYaw = 0;
  tgtPitch = 0;
  focus: Vec3 = { x: 0, y: 0, z: 10 };
  mode: Mode = "third";
  private lastTime: number | undefined;

  forward(): Vec3 {
    return {
      x: Math.sin(this.yaw) * Math.cos(this.pitch),
      y: Math.cos(this.yaw) * Math.cos(this.pitch),
      z: -Math.sin(this.pitch),
    };
  }

  // Input: rotation is scaled by fixate (aim zoom); yaw wraps, pitch stops short of straight up or down.
  rotateBy(dYaw: number, dPitch: number, fixate: number): void {
    this.tgtYaw = wrap(this.tgtYaw + dYaw * fixate);
    this.tgtPitch = Math.min(PITCH_LIMIT, Math.max(-PITCH_LIMIT, this.tgtPitch + dPitch * fixate));
  }

  setMode(m: Mode): void {
    if (m === this.mode) return;
    this.mode = m;
    this.tgtDist = m === "third" ? Math.max(2, this.tgtDist + 5) : MIN_ZOOM;
  }

  // Raw wheel delta to zoom step: the step grows with distance; zooming in (delta < 0) is divided by
  // (1 - delta * 0.01) so a zoom in and a zoom out of the same wheel size cover the same distance.
  wheelStep(delta: number): number {
    const step = delta * (0.05 + this.dist * 0.01);
    return delta < 0 ? step / (1 - delta * 0.01) : step;
  }

  // Wheel zoom. Third person: the target distance moves by delta and drops to first person below
  // MIN_THIRD * scale. Zooming out of first person returns to third at MIN_THIRD * scale.
  zoom(delta: number, cap: number, scale: number): void {
    if (delta > 0 || this.mode !== "first") {
      const t = this.tgtDist + delta;
      if (this.mode === "third") {
        if (t < MIN_THIRD * scale) this.setMode("first");
        else this.tgtDist = t;
      } else {
        this.setMode("third");
        this.tgtDist = MIN_THIRD * scale;
      }
    }
    this.tgtDist = Math.min(this.tgtDist, cap);
  }

  // Per-frame easing. Distance eases over the change in game time; orientation eases over dt
  // when smoothing is on, and snaps otherwise.
  update(time: number, dt: number, smoothing: boolean): void {
    const delta = this.lastTime === undefined ? 0 : time - this.lastTime;
    this.lastTime = time;
    if (Math.abs(this.dist - this.tgtDist) > 0.01) {
      this.dist = lerp(this.dist, this.tgtDist, clamp01(0.65 * delta / INTERP_TIME));
    }
    if (smoothing) {
      this.yaw = wrap(lerpAngle(this.yaw, this.tgtYaw, LERP_ORI_RATE * dt));
      this.pitch = lerp(this.pitch, this.tgtPitch, clamp01(LERP_ORI_RATE * dt));
    } else {
      this.yaw = this.tgtYaw;
      this.pitch = this.tgtPitch;
    }
  }

  // Far policy: a single ray from the camera position back to the focus that stops at the first NON-opaque
  // voxel (opposite of the near rays). It fires when the camera sits inside solid terrain; in open air it
  // stops at once (d = 0) and the view is dist - 0.03. Does not change this.dist.
  private farView(terrain: Terrain): number {
    const fwd = this.forward();
    const start = { x: this.focus.x - fwd.x * this.dist, y: this.focus.y - fwd.y * this.dist, z: this.focus.z - fwd.z * this.dist };
    const hit = terrain.firstClear(start, this.focus, MAX_STEPS);
    if (hit === undefined) return this.dist;
    return Math.max(0, Math.min(this.dist - hit - 0.03, this.dist));
  }

  // Returns the distance the view uses this frame. `corners` are the view-frustum corners, already
  // padded by the caller (the donor's padding formula is omitted here).
  computeView(terrain: Terrain, corners: Vec3[]): number {
    if (this.tgtDist >= NEAR_LIMIT) return this.farView(terrain);
    const fwd = this.forward();
    const behind: Vec3 = {
      x: this.focus.x - fwd.x * (this.dist + 0.5),
      y: this.focus.y - fwd.y * (this.dist + 0.5),
      z: this.focus.z - fwd.z * (this.dist + 0.5),
    };
    let best = Infinity;
    for (const p of [...corners, behind]) {
      const hit = terrain.firstOpaque(this.focus, p, MAX_STEPS);
      const d = hit === undefined ? this.dist : Math.min(hit, this.tgtDist);
      best = Math.min(best, Math.max(0, d));
    }
    if (best < FAR_LIMIT) return this.farView(terrain);
    // A collision pulls the current distance in at once; update() eases it back out.
    if (this.dist >= best) this.dist = best;
    return best;
  }
}
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
- Not read: `Lerp::lerp`, `terrain.ray`, the client clock behind `game_dt`, camera.rs 70-313 (projection code), and the viewpoint offsets in scene/mod.rs 684-709 (only 710-716 read).




## Checker findings (Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code.

**Errors / corrections:** (1) Zoom step: note says step = delta*(0.05+dist*0.01); scene/mod.rs 448-460 divides by (1 - delta*0.01) when delta<0 (zoom in) to keep in/out symmetric; the note omits this asymmetric branch. (2) Far policy predicate is inverted relative to near: compute_dependents passes block.is_opaque() as 'is_transparent'; near casts .until(is_transparent) (stops at opaque), far casts .until(|b| !is_transparent(b)) from camera to focus (stops at first NON-opaque voxel, i.e. detects the camera being inside solid and returns dist - d - 0.03). The sketch's farView uses the same firstHit(opaque) as the near path, so its far policy is semantically wrong; note describes it only as 'a hit'. (3) update() also eases fixate (599-605), not listed. Verified OK: constants 8-16, CLIPPING_MODE_RANGE 2..20 (15, 368, 426), near fan 375-443 (0.6 padding 404, +0.5 behind 406, max_iter 500, snap 429-430), far 460 (-0.03), rotate_by 517-525 (0.001 margin) vs clamp_and_modulate 65 (0.0001), zoom_switch 551-572 (2.35*scale), set_mode 720-735, update 580-638 (0.65*delta/interp, orientation 15*dt), lerp_angle 799-805, get_effective_fov 701, state.rs MAX_DELTA_TIME=1.0 at 57/877, GPL-3.0.

**Missed:** Zoom asymmetry (see above) and the inverted far-ray predicate.
