# ioquake-ioq3 (camera, cell 14)

Donor: `/mnt/frankendom-donors/ioquake-ioq3/code/cgame/cg_view.c` | Licence: GPL-2.0-or-later (cg_view.c header: "either version 2 of the License, or (at your option) any later version"; the repo COPYING.txt is the GPL-2.0 text) | C | symbol `CG_OffsetThirdPersonView`

Checked: camera_scope world camera. `CG_OffsetThirdPersonView` is defined at cg_view.c 226-295 and read in full. Its only caller is `CG_CalcViewValues` (cg_view.c 679; grep over the whole code tree showed no other caller). Confidence: high on the order of operations and the constants read; medium on the per-frame loop, because `CG_ProcessSnapshots` and `CG_PredictPlayerState` were not read, and the predicted error that feeds the decay is set in cg_predict.c 533-570, which was not read in full. `CG_Trace` and the viewheight value were not read (not read).

Best transferable idea: When a sweep from the eye hits a wall behind a third-person camera, pull the camera in to the hit point, lift it a little, sweep once more, and keep the camera aimed at a focus point ahead of the character.
Decision (proposed): adapt - the pull-in-and-aim shape fixes the world camera's wall clipping, but the donor has no position smoothing and its side-angle yaw does not aim at the focus point, so Frankendom must add a frame-rate-independent lag and aim at the focus point directly.
Acceptance: In an open zone with a wall directly behind the hero, the world camera stops in front of the wall, rises by at most 32 units as it closes, keeps the hero's aim point centred in a 375-wide still mid-fight, and a client test asserts the camera origin is never behind a hit surface across 60 sampled poses.

## 1. Mechanism

- The loop: the engine calls the cgame render entry with `cl.serverTime` (`CL_CGameRendering`, cl_cgame.c 796; the call site in cl_scrn.c 518 was seen by grep only). `cl.serverTime` is `realtime + serverTimeDelta - timeNudge`, clamped to +/-30 ms of nudge and never allowed to run backwards (cl_cgame.c 1001, 1005). `CG_DrawActiveFrame` sets `cg.time = serverTime` (cg_view.c 764), processes snapshots, predicts the player (cg_view.c 801), decides third person (804), then calls `CG_CalcViewValues` once (808). So the camera is recomputed every rendered frame from the predicted eye. There is no fixed step and no accumulator for the camera.
- Third-person is chosen per frame: `cg.renderingThirdPerson` is true when `cg_thirdPerson` is set, or when health is 0 or less, and the player is not a spectator (cg_view.c 804-805). Inside `CG_CalcViewValues`, the third-person branch (677-679) replaces the first-person branch (682). The damage kick and bob (in `CG_OffsetFirstPersonView`, 316-) are first-person only. The blood blend is also first-person only (812).
- The third-person offset, in order (cg_view.c 226-295):
  1. Start at the eye: `vieworg` already includes `viewheight` (237). Build a focus point 512 units ahead of the eye along the look angles, with pitch clamped to 45 degrees (247-252).
  2. Start the camera position 8 units above the eye (254-256), then back it away along the view's forward and right vectors, built from half the look pitch (258): `range x cos(angle)` along forward, `range x sin(angle)` along right (262-265). Range is the cvar `cg_thirdPersonRange` (default 40, cg_main.c 262); angle is `cg_thirdPersonAngle` (default 0, cg_main.c 263).
  3. Collision: trace an 8 x 8 x 8 box (mins/maxs +/-4, line 231) from the eye to the camera position (271; the trace is skipped when `com_cameraMode` is nonzero, 270). If the trace hits (273), move the camera to the hit point, raise it by `(1 - fraction) x 32` (274-275), and trace once more from the eye (279-280). There is only one retry. If the second trace also hits, the camera stops at its end point, which may still be inside the wall (not checked in the code).
  4. Aim: the final view position replaces the camera origin (285). The pitch is set so the camera looks at the focus point: `-atan2(focus z, horizontal distance)`, with the horizontal distance floored at 1 (288-293). The yaw is the view yaw minus the side angle (294).
- Zoom: `CG_ZoomDown_f` and `CG_ZoomUp_f` set `cg.zoomed` and `cg.zoomTime = cg.time` (cg_view.c 443-457). `CG_CalcFov` lerps the FOV between `cg_fov` and `cg_zoomFov` over ZOOM_TIME (150 ms, cg_local.h 49) from that time (cg_view.c 504-516). Zoom also scales mouse sensitivity by `fov_y / 75` (545).
- Error decay: when `cg_errorDecay` (100 ms, cg_main.c 254) is greater than zero, the predicted error is added to the view origin with a weight that falls linearly from 1 to 0 over those 100 ms (664-671). This is the only smoothing the camera has. There is no lag, spring or damping on the camera position itself.
- Orbit: if `cg_cameraOrbit` is nonzero, the side angle is advanced by `cg_cameraOrbit` degrees once each time `cg.time` passes `nextOrbitTime` (657-660). The delay defaults to 50 ms (cg_main.c 304). It is cheat-flagged. The single-player win and lose console commands and a developer-only orbit toggle set it (cg_consolecmds.c 160-175, 424-430).

## 2. Key functions

- `CG_OffsetThirdPersonView`: `/mnt/frankendom-donors/ioquake-ioq3/code/cgame/cg_view.c` 226-295. The whole third-person pose: focus, back-off, one collision retry with lift, aim.
- `CG_CalcViewValues`: `/mnt/frankendom-donors/ioquake-ioq3/code/cgame/cg_view.c` 613-, the calls at 677-682 (choose third or first person), 664-671 (error decay), and `CG_CalcFov` at the end (693).
- `CG_CalcFov`: `/mnt/frankendom-donors/ioquake-ioq3/code/cgame/cg_view.c` 470-557. Zoom lerp, sensitivity scale, underwater warp.
- `CG_DrawActiveFrame`: `/mnt/frankendom-donors/ioquake-ioq3/code/cgame/cg_view.c` 761-, sets `cg.time` (764) and calls `CalcViewValues` (808).
- Client clock: `/mnt/frankendom-donors/ioquake-ioq3/code/client/cl_cgame.c` 990-1010 (serverTime derivation, timeNudge clamp, monotonic guard), 796 (render entry).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Camera placed behind the eye at a fixed range, with an optional side offset | Range 40 units default (cg_main.c 262); range 100 in the win/lose and orbit commands (cg_consolecmds.c 164, 175, 430) |
| Aim point ahead of the eye along the look direction, with the look pitch clamped | Focus 512 units (cg_view.c 225); pitch clamp 45 (247) |
| Camera pitch halved for the back-off direction | Factor 0.5 (258) |
| Camera lifted 8 units above the eye before the back-off | 8 units (256) |
| Box sweep from the eye to the camera; pull in to the hit; lift by the closeness; one retry | Box half-width 4 (231); lift 32 (275) |
| FOV lerp between base and zoom over a fixed time | Zoom time 150 ms (cg_local.h 49); cg_zoomfov 22.5 (cg_main.c 214); cg_fov 90 (cg_main.c 215) |
| Predicted-error decay, linear over a fixed window | 100 ms (cg_main.c 254) |
| Orbit: add a fixed angle at a fixed delay | cg_cameraOrbit default 0 (cg_main.c 303); delay 50 ms (304) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (focus point, back-off with half pitch, one sweep with a single lift-and-retry, aim pitch at the focus point, yaw minus side angle). It takes the eye as input (the donor adds `viewheight` first), takes the sweep as a callback (the donor calls `CG_Trace` with a box), and leaves out the cvar clamps, the cheat flags, `com_cameraMode`, the damage kick, bob, duck and land offsets, the step offset, error decay, orbit, the underwater warp, and the sensitivity scale. The zoom helper is the donor's lerp shape only; the donor reads `cg.time` directly. One known donor quirk is copied on purpose and flagged in section 6: the yaw is turned by the side angle after the pitch has been aimed at the unrotated focus point.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type Vec3 = [number, number, number];

export interface CamTuning {
  rangeUnits: number;        // back-off distance behind the eye (donor cvar default 40)
  sideAngleDeg: number;      // 0 = straight behind; non-zero swings the camera to one side (donor default 0)
  focusUnits: number;        // how far ahead of the eye the aim point sits (donor 512)
  focusPitchMaxDeg: number;  // clamp on look pitch when choosing the aim point (donor 45)
  hullHalf: number;          // half-width of the collision box (donor 4)
  liftMaxUnits: number;      // extra height added when pulled in close to a wall (donor 32)
}

export interface Pose { eye: Vec3; yawDeg: number; pitchDeg: number; }
export interface Camera { pos: Vec3; yawDeg: number; pitchDeg: number; }
export type Sweep = (from: Vec3, to: Vec3, half: number) => { end: Vec3; fraction: number };

const D2R = Math.PI / 180;

function forward(yawDeg: number, pitchDeg: number): Vec3 {
  const y = yawDeg * D2R;
  const p = pitchDeg * D2R;
  return [Math.cos(p) * Math.cos(y), Math.cos(p) * Math.sin(y), -Math.sin(p)];
}

function right(yawDeg: number): Vec3 {
  const y = yawDeg * D2R;
  return [Math.sin(y), -Math.cos(y), 0];
}

function add(a: Vec3, b: Vec3, s = 1): Vec3 {
  return [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

// Third-person pose, recomputed on every rendered frame from the predicted eye.
// No smoothing or lag of its own: the camera follows the eye exactly, apart from the wall pull-in.
export function thirdPersonCamera(p: Pose, t: CamTuning, sweep: Sweep): Camera {
  // 1. Aim point: ahead of the eye along the look direction, with the pitch clamped.
  const focusPitch = Math.min(p.pitchDeg, t.focusPitchMaxDeg);
  const focusPoint = add(p.eye, forward(p.yawDeg, focusPitch), t.focusUnits);

  // 2. Start 8 units above the eye and back away along the yaw, using half the look pitch.
  const orbit = t.sideAngleDeg * D2R;
  const f = forward(p.yawDeg, p.pitchDeg * 0.5);
  const r = right(p.yawDeg);
  let view = add(p.eye, [0, 0, 8]);
  view = add(view, f, -t.rangeUnits * Math.cos(orbit));
  view = add(view, r, -t.rangeUnits * Math.sin(orbit));

  // 3. Collision: sweep from the eye. On a hit, stop at the wall, lift by up to liftMax
  //    scaled by how close the wall is, and sweep once more (one retry only).
  const first = sweep(p.eye, view, t.hullHalf);
  if (first.fraction !== 1) {
    view = add(first.end, [0, 0, (1 - first.fraction) * t.liftMaxUnits]);
    view = sweep(p.eye, view, t.hullHalf).end;
  }

  // 4. Aim the camera pitch at the focus point; the yaw is turned back by the side angle.
  const d = sub(focusPoint, view);
  const focusDist = Math.max(Math.hypot(d[0], d[1]), 1);
  const pitchDeg = -Math.atan2(d[2], focusDist) / D2R;
  return { pos: view, yawDeg: p.yawDeg - t.sideAngleDeg, pitchDeg };
}

// FOV for zoom: a linear lerp between base and zoom FOV over zoomMs, from the moment the zoom key changed.
export interface Zoom { zoomed: boolean; zoomStartMs: number; }

export function zoomFovDeg(nowMs: number, z: Zoom, baseFov: number, zoomFov: number, zoomMs = 150): number {
  const f = (nowMs - z.zoomStartMs) / zoomMs;
  if (z.zoomed) return f > 1 ? zoomFov : baseFov + f * (zoomFov - baseFov);
  return f <= 1 ? zoomFov + f * (baseFov - zoomFov) : baseFov;
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, run on a copy with `export {}` at the end, passed with no errors.

## 5. Lands in

- TARGET `src/fight/camera.ts` (client only; the engine never reads it): the third-person pose and the zoom FOV. Parity-checklist row 11 (fight camera). Note that row 11 is the fight camera; the world camera has no row of its own in the addendum, so this is the nearest row and the owner should confirm it.
- today: the Frankendom camera code is not read in this pass (not read).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: camera is client-only (the engine does not read it); row 11 (fight camera); the world camera is the owner's priority, not the pit camera.

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not from the donor lines.
- No smoothing on the position. The donor follows the predicted eye exactly every frame, apart from the 100 ms prediction-error decay. A third-person camera in Frankendom needs its own frame-rate-independent lag (not in the donor); the donor gives no numbers for that.
- The yaw after a non-zero side angle is turned back by the angle, but the pitch was aimed at the unrotated focus point (294, after the aim at 288-293). With a non-zero side angle the screen centre is therefore not the focus point. This is read from the code, not run. Frankendom should aim the camera at the focus point directly if it uses a side offset for over-the-shoulder framing. The sketch copies the donor's version so the difference is visible.
- Collision is one retry with a fixed 32-unit lift. If the second trace hits, the camera can still end inside geometry (the code does not check). A Frankendom test should assert that the camera origin is never behind a hit surface.
- No lock-on, no framing of several enemies, no shake, no FOV change for fights. The donor has only a click-to-zoom FOV lerp. The many-on-one framing must be written from scratch.
- The donor's third-person and first-person paths are mutually exclusive by one flag. A Frankendom world camera that changes shape by state (fight vs explore) needs the same kind of single switch, with one place that decides.
- Tunable data: range and side angle are cvars marked cheat-protected (cg_main.c 262-263). Frankendom should expose them as zone data (per zone and per encounter), not as cheat-gated cvars. Focus distance, pitch clamp, hull and lift should stay engine constants.
- Pit camera: not applicable. This is a world camera note (camera_scope world).

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: camera is client-only; row 11; world camera (owner's priority)



## Checker findings (Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code.

**Errors / corrections:** CG_OffsetThirdPersonView 226-295 order, FOCUS_DISTANCE 512, pitch clamp 45, +8 lift, half pitch, range 40 / angle 0 defaults, 8x8x8 box, lift (1-fraction)*32, aim pitch via atan2, error decay 100 ms, orbit delay 50, ZOOM_TIME 150, timeNudge +/-30, GPL-2.0-or-later: verified. Errors: the claim that after the second trace the camera 'may still be inside the wall' is unsupported (line 280 copies trace.endpos, the second hit point, so it stops at the hit); the trace-skip cvar is cg_cameraMode (cvar name com_cameraMode), note says com_cameraMode only.

**Missed:** dead-player branch (cg_view.c 241-245): when health <= 0 the focus yaw and view yaw are forced to STAT_DEAD_YAW (look at killer) - not mentioned
