# STJr-SRB2 (camera, cell 14)

Donor: `/mnt/frankendom-donors/STJr-SRB2/src/p_user.c` (`P_MoveChaseCamera`, `P_ResetCamera`; also `src/p_mobj.c` `P_CameraThinker`, `src/p_map.c` `P_TryCameraMove` and `P_SlideCameraMove`) | Licence: GPL-2.0 (the `LICENSE` file is "GNU GENERAL PUBLIC LICENSE Version 2, June 1991"; the `p_user.c` header says "terms of the GNU General Public License, version 2"; the three source files read (p_user.c, p_mobj.c, p_map.c) say version 2 with no "or later" wording; the rest of the tree was not searched) | C | symbol `P_MoveChaseCamera`

Checked: camera_scope: world camera. `P_MoveChaseCamera` (p_user.c 9944 to 10627) read in full; `P_ResetCamera` (9897-9942) read in full; `P_CameraThinker` (p_mobj.c 3501-3575) read in full. `P_SlideCameraMove` (p_map.c 3554-3646) read except lines 3575-3600 (not read). `P_TryCameraMove` (p_map.c 2491-2530) read only at the start (not read: the rest of its collision loop). Callers: the `P_MoveChaseCamera` call sites at p_user.c 12690 (dead player) and 13130 (alive player) read; the branch condition around 13120 that guards the alive-player call was not read. `P_Ticker` loop at p_tick.c 798-808 read; `P_PreTicker` call at p_tick.c 961 seen, not read in full. Confidence: high on the chase-follow order and the numbers in `P_MoveChaseCamera`; medium on the slide and the collision internals. Not read: the `elevator` override of camera distance in p_floor.c (1516-1533, grep only), `CV_UpdateCamDist` consumers beyond the one function, and `P_CameraGetFloorZ` and the 3D-floor helpers.

## 1. Mechanism

- A third-person chase camera that stays behind the player on the player's facing line, not over a shoulder. In standard control style the camera is centred behind the player at distance `camdist` and height `camheight` above the player's eye line. The only sideways offset is the `CS_SIMPLE` shift (p_user.c 10154-10156), which slides the camera by a fraction of `cv_cam_shiftfacing` depending on how far the player faces away from the camera.
- The camera is a separate object (`camera_t`) with its own position, momentum and aiming. It is not the player. Each tic, `P_MoveChaseCamera` (p_user.c 9944) does this, in order:
  1. Calls `P_CameraThinker` (10051). That applies the momentum stored on the camera by the previous call: it tries to move the camera by `(momx, momy)` with `P_TryCameraMove` (p_mobj.c 3513). If the move is blocked and there is no sight from the camera to the player, it resets the camera to the player's back (3522-3523). If blocked with sight, it slides along the wall (3528) and resets if the momentum length did not change (3530-3533). Then it integrates z (3551) and clamps z to the floor (3556) and ceiling (3571).
  2. Reads the live cvars for the camera (10056-10074): `camspeed` = `cv_cam_speed` (default 0.3), `camdist` = `cv_cam_dist` times `mo->scale`, `camheight` = `cv_cam_height` times `mo->scale` and times `player->camerascale`.
  3. Picks the camera yaw target. Standard style: `focusangle` = the local input angle `localangle` (10037), plus `cam_rotate` (10122). If `cam_still` (or a reset, or death) is set, the yaw is held at `thiscam->angle` (10090-10091).
  4. Computes the ideal spot: `x = mo.x - cos(angle) * distxy`, `y` likewise (10252-10253), `z = mo.z + pviewheight + camheight + distz` (10302). `pviewheight` is `41/48` of the player height (10302 uses it).
  5. Ceiling pull-down: if the camera top would go above the ceiling, `z = ceiling - camera height - 11` (scaled by `mo->scale`) (10460). A crushed camera (sector shorter than the camera) triggers a reset (10443).
  6. Velocity for the next tic: `momx = (x - cam.x) * camspeed`, `momy` likewise, `momz = (z - cam.z) * camspeed` (10545, 10546, 10555). This is a proportional ease: each tic the camera closes `camspeed` of the gap. The move is applied at the start of the next call (step 1 above).
  7. Yaw: the camera turns to face a point 64 units in front of the player (`dist = FixedMul(64 << FRACBITS, mo->scale)` at 10506; `thiscam->angle = R_PointToAngle2(...)` at 10519), only when not `camstill` and not paused.
  8. Pitch: the aim angle toward the look point is clipped with `G_ClipAimingPitch` (10575) and then eased by one eighth of the gap per tic (`thiscam->aiming -= (dist>>3)` at 10577). This runs only in 2D or when not `camstill` (10573).
  9. Translucency: in single-player without splitscreen, the player's `MF2_SHADOW` flag is set when the camera is within 48 units of the player (10594-10597), so the player does not block the view.
- Reset: `P_ResetCamera` (9897) places the camera at `player.x - cos(angle) * radius`, at height `mo.z + 41/48 height` (9909, 9914), sets the camera body to radius 20 and height 16 (9938-9939), and then loops `P_MoveChaseCamera(..., true)` up to `2*TICRATE` times (9941) to settle it. This is the snap used when the camera is blocked and cannot see the player.
- Tick: `P_PlayerAfterThink` runs once per tic for each player (called from `P_Ticker` at p_tick.c 806; also from `P_PreTicker` at 961, not read in full). The alive-player camera call is at p_user.c 13130, inside a branch guarded by `if (server || addedtogame)` (13129). So the camera state is part of the tic loop, not a client-only render step.
- View: at the end of the tic `R_SetupFrame` stores the view (p_tick.c 884-909, "Ensures view interpolation is T-1 to T"). Each rendered frame `R_SetupFrame` runs again (r_main.c 1511). `R_InterpolateView` lerps `viewx`, `viewy`, `viewz` between the two stored states with `frac` (r_fps.c 198-200). So the chase camera is simulated at the tic rate (35 per second) and drawn at the render rate by interpolation.
- Shake: a hit (p_user.c 9236-9238) sets `quake.intensity = 8*scale`, `quake.time = 8`, and the radius. `P_Ticker` counts `quake.time` down by one each tic (p_tick.c 859-860). In `R_SetupFrame` (r_main.c 1149-1171) the shake base is `intensity/2` (1151), reduced by the distance to the epicenter as `ir *= 1 - dist/radius` (1168), and the offset is a fresh random value in `[-ir, ir]` each time the function runs (1171). The intensity itself does not decay over time; the shake stops abruptly when `quake.time` reaches zero.
- FOV: `fov = cv_fov + player->fovadd` (r_main.c 942). `fovadd` is zero unless `cv_fovchange` is on (p_user.c 8866; default "Off" at r_main.c 165). When on, `fovadd` = speed minus 20 units (8869, 8877), with speed capped to `normalspeed - 5` (8873). So the FOV widens with running speed above 20 donor speed units.

## 2. Key functions

- `P_MoveChaseCamera`: `/mnt/frankendom-donors/STJr-SRB2/src/p_user.c` 9944-10627. Per-tic camera target, yaw, pitch, ideal spot, ceiling pull, velocity. Calls `P_CameraThinker` at 10051 first.
- `P_ResetCamera`: `/mnt/frankendom-donors/STJr-SRB2/src/p_user.c` 9897-9942. Snap behind the player; repeats `P_MoveChaseCamera` until it settles.
- `P_CameraThinker`: `/mnt/frankendom-donors/STJr-SRB2/src/p_mobj.c` 3501-3575. Applies the stored momentum, handles a blocked move (reset if no sight, else slide), integrates z, clamps floor and ceiling.
- `P_TryCameraMove`: `/mnt/frankendom-donors/STJr-SRB2/src/p_map.c` 2491-(end not read). Single-step camera move with a noclip shortcut; the steps are `MAXTRYMOVE` long (2524).
- `P_SlideCameraMove`: `/mnt/frankendom-donors/STJr-SRB2/src/p_map.c` 3554-3646. Traces the three leading corners of the camera box against lines, moves to the wall, then slides the rest of the momentum along it (3634-3644); gives up after three hits and steps.
- Per-tic call site: `/mnt/frankendom-donors/STJr-SRB2/src/p_tick.c` 806 (inside `P_Ticker` from 715).
- Interpolation: `/mnt/frankendom-donors/STJr-SRB2/src/r_fps.c` 172-200.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants (units: map units, `FRACUNIT` = 1; scaled by `mo->scale`) |
|---|---|
| Ideal spot behind the player on its facing, above the eye line | Standard distance 192 (`cam_dist`, p_user.c 9855); standard height 40 (`cam_height`, 9866). Simple style 256 (9859) and 60 (9870). The live cvar starts at 160 (`cam_curdist`, 9833) and is overwritten from the saved value by `CV_UpdateCamDist` (9876-9880). |
| Ease toward the ideal spot, closing a fraction per tic | Fraction 0.3 (`cam_speed`, 9836). Velocity = gap x fraction (10545-10555). Applied on the next tic. |
| Camera body for wall and ceiling tests | Radius 20 (10017, scaled), height 16 (9939). |
| Pull under a ceiling | Gap 11 under the ceiling (10460, scaled). |
| Look-ahead point for yaw | 64 units in front of the player (10506). |
| Pitch | Clip to +/- (ANGLE_90 - 1) (`G_ClipAimingPitch`, g_game.c 843 and p_user.c 10575); ease by 1/8 of the gap per tic (10577). |
| Player fade near camera | 48 units, single player only (10594). |
| Reset when blocked with no sight | Reset when blocked and `P_CheckSight` fails (p_mobj.c 3522); reset when the slide leaves the momentum length unchanged (3530). |
| Reset settle loop | 2 x `TICRATE` tries (9941). |
| Hit shake | Intensity 8 (p_user.c 9236, scaled by the inflictor), half of it is the base (r_main.c 1151), duration 8 tics (9237), countdown per tic (p_tick.c 859-860). |
| Shake falloff | Outside the radius: zero; inside: `base * (1 - dist/radius)` (r_main.c 1168). |
| Speed FOV | Threshold 20 units (p_user.c 8869), speed capped at `normalspeed - 5` (8873), on only with `fovchange` (r_main.c 165 default Off). |

## 4. TypeScript sketch

simplified: one call per tick. It omits the wall slide (the donor slides along the wall; the sketch stops), the pitch easing (10573-10577), the `CS_SIMPLE` side shift, the 3D-floor and polyobject ceiling checks, the grounded-only slope rule, the single-player fade, the hit shake and the FOV change. It reorders nothing else except that the yaw uses the position after the move in the same call. Step 1 (apply last tic's momentum) and the reset are kept, since they are the part a third-person camera needs for "never sits in a wall".

```ts
// Licence: GPL-2.0 (donor LICENSE file). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
// camera_scope: world camera
export interface Vec3 { x: number; y: number; z: number; }

// yaw in radians; eyeZ = eye height above pos.z
export interface Hero { pos: Vec3; yaw: number; eyeZ: number; }

// Tuning values are zone or client data, not engine constants.
export interface CamTuning {
  dist: number;       // units behind the hero (donor standard default 192)
  height: number;     // units above the hero's eye line (donor standard default 40)
  speed: number;      // fraction of the gap closed per tick (donor default 0.3)
  camHeight: number;  // camera body height for the ceiling and wall tests (donor 16)
  ceilPad: number;    // gap kept under a ceiling (donor 11)
  lookAhead: number;  // aim point in front of the hero (donor 64)
}

export interface ChaseCam { pos: Vec3; mom: Vec3; yaw: number; }

export interface CamWorld {
  canOccupy(p: Vec3, bodyH: number): boolean; // true if a camera body fits at p
  ceilingAt(x: number, y: number): number;    // ceiling height at x, y
  hasSight(a: Vec3, b: Vec3): boolean;        // unobstructed line from a to b
}

// simplified: one call per tick. Omits the wall slide (donor stops and reports instead), the pitch easing, the CS_SIMPLE side shift, 3D floor and polyobject checks, the grounded-only slope rule, the quake shake and the FOV change. The yaw uses the position after the move in this same call.
export function tickChaseCam(
  cam: ChaseCam,
  hero: Hero,
  t: CamTuning,
  w: CamWorld,
  reset: (c: ChaseCam) => void,
): void {
  // 1. Apply the momentum computed on the previous tick.
  const next: Vec3 = { x: cam.pos.x + cam.mom.x, y: cam.pos.y + cam.mom.y, z: cam.pos.z + cam.mom.z };
  if (cam.mom.x !== 0 || cam.mom.y !== 0 || cam.mom.z !== 0) {
    if (w.canOccupy(next, t.camHeight)) {
      cam.pos = next;
    } else if (!w.hasSight(cam.pos, hero.pos)) {
      reset(cam); // no sight to the hero: snap behind
      return;
    } else {
      cam.mom = { x: 0, y: 0, z: 0 }; // stop at the wall
    }
  }

  // 2. Ideal spot: behind the hero on its yaw, above the eye line.
  const bx = Math.cos(hero.yaw);
  const by = Math.sin(hero.yaw);
  const ideal: Vec3 = {
    x: hero.pos.x - bx * t.dist,
    y: hero.pos.y - by * t.dist,
    z: hero.pos.z + hero.eyeZ + t.height,
  };

  // 3. Pull under a ceiling so the camera stays in the room.
  const ceil = w.ceilingAt(ideal.x, ideal.y);
  if (ideal.z + t.camHeight > ceil) ideal.z = ceil - t.camHeight - t.ceilPad;

  // 4. Ease toward the ideal spot. The move is applied on the next tick.
  cam.mom = {
    x: (ideal.x - cam.pos.x) * t.speed,
    y: (ideal.y - cam.pos.y) * t.speed,
    z: (ideal.z - cam.pos.z) * t.speed,
  };

  // 5. Yaw looks from the camera at a point in front of the hero.
  const lx = hero.pos.x + bx * t.lookAhead;
  const ly = hero.pos.y + by * t.lookAhead;
  cam.yaw = Math.atan2(ly - cam.pos.y, lx - cam.pos.x);
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (file `/tmp/QC003_stj_worldcam.ts`) exit 0.

## 5. Lands in

- TARGET `src/fight/camera.ts` (proposed client-only module; this reader did not read the Frankendom file). Holds the world third-person follow only: no engine state, no server write. The Pit camera stays frozen and is not touched.
- Parity-checklist row 11 (fight camera). Note: no row covers the world camera; row 11 is the nearest and the owner ruling on the world camera should set its own row.
- today: not read (Frankendom camera location not read by this reader).
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
- Brief rule served: 1 (one engine; the camera is client-only, so the engine never reads it); rules 7-9 n/a
- Best transferable idea: a chase camera that eases a fraction of the gap to an ideal spot each tick, applies that velocity on the next tick, pulls under ceilings, and snaps behind the hero when it is blocked with no line of sight.
- Decision (proposed): adapt — take the ease, ceiling pull and sight-reset shape into the client camera, but not the donor's placement in the tic loop or its centred-behind framing; the owner's over-the-shoulder ask needs a lateral offset this donor does not give in standard style, so the lateral offset is an added value, not a copied one.
- Acceptance: a player walks the hero past a wall: the world camera never sits inside wall bounds in a headless test (camera pos checked each tic), eases behind the hero within about 10 ticks at speed 0.3, and snaps behind when it has no sight to the hero.

## 6. Gaps and risks

- Placement: the donor runs the camera in the tic loop (p_tick.c 806, p_user.c 13129-13130 under `server || addedtogame`), so the server holds camera state. Frankendom's ruling says the camera is client-only. Copy the shape, not the placement.
- Standard style has no over-the-shoulder offset: the camera sits on the facing line, centred. The only lateral shift is the `CS_SIMPLE` shift (p_user.c 10154-10156). The owner's complaint is about the over-the-shoulder view, so this donor does not solve it on its own.
- Frame-rate: the ease is per tic (fixed 35 Hz, `camspeed` as a fraction per tic). Frankendom's client needs its own dt-based ease (for example `1 - (1 - speed)^(dt*60)`) if it runs at render rate; the donor does not show that.
- Snap on reset: `P_ResetCamera` teleports the camera behind the player (9909-9941). A snap is visible. Frankendom needs a rule for how long a snap may last and whether it is allowed in the middle of a fight.
- Collision: the donor's wall slide is used with a three-corner trace (p_map.c 3554-3646, not fully read between 3575 and 3600). This sketch stops at the wall. A real build needs the slide or it will stick on corners.
- Shake: amplitude does not decay with time; it is random each render call (r_main.c 1171) and stops when `quake.time` ends. Frankendom should express the shake as data (intensity, duration, radius) with a decay it chooses, not copy the abrupt stop.
- FOV change: speed-based and off by default (r_main.c 165). The threshold 20 is in donor units; Frankendom should express it as a data field with a default, not a constant.
- Lock-on and many-enemy framing: not found in the camera code read. A grep for `lockon` in the donor found only reticle sprite states in `src/info.c` (3468-3476), which were not read further. So the donor gives no target-framing rule for a many-on-one fight.
- The donor's 3D-floor and polyobject ceiling checks (p_user.c 10330-10440) and the grounded-only slope rule (10212) are not in the sketch and were not tested.
- Zone data: `dist`, `height` and `speed` are tuning values. The donor changes distance per elevator (p_floor.c 1516-1533, grep only), so per-zone distance is a real pattern, but it was not read in full.



## Checker findings (Sonnet 5.5 medium, 2026-10-10)
**Verdict: CLEAN.** Independent check against the donor code.

**Errors / corrections:** All checked lines/constants hold (cam_dist 192/160 live, height 40, speed 0.3, radius 20/height 16, 41/48 eye, 64 lookahead, 11 ceiling gap, 48 fade, pitch >>3, shake 8/8 and ir*(1-dist/radius), momentum applied next tic, reset conditions, licence GPL-2). Only omissions, none contradicting.

**Missed:** (1) CS_SIMPLE shift is also added into momentum (p_user.c 10557-10558: momx += FixedMul(shiftx,camspeed)); (2) in 2D levels mom is the full gap, no ease (10537-10542); (3) P_CameraThinker has a third reset path: camera floor-clamped above player+height+camheight+16 resets (p_mobj.c 3563-3567); (4) death-pit rule: no downward z momentum (10548-10553).
