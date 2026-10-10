# orbitersim-orbiter (camera, cell 14)

Donor: `/mnt/frankendom-donors/orbitersim-orbiter/Src/Orbiter/Camera.cpp` | Licence: MIT (as read, `/mnt/frankendom-donors/orbitersim-orbiter/LICENSE`: "MIT License", "Copyright (c) 2000-2026 Martin Schweiger"; adaptation allowed, sketch still written clean-room) | C++ | symbols `Camera::Update`, `Camera::ShiftDist`, `Camera::SetRelPos`, `Camera::Drag`

Checked: camera_scope = world camera (third-person orbit/chase view of a target). Read in full: `Camera::Update` (969-1253, both the external branch and the cockpit branch), `SetRelPos` (679-701), `ShiftDist` and `ChangeDist` (519-541), `Drag` (544-556), `AddPhi`/`ShiftPhi`/`Rotate` (447-483, 503-510), `UpdateMouse` (134-167), `ProcessMouse` (93-132). Callers read: `Orbiter.cpp` 1798 (`EndTimeStep` calls `Update` once per frame), 2101-2119 (keyboard yaw), 2182-2183 (keyboard zoom), `TimeData.cpp` 28-42 (`BeginStep` sets `SysDT`). Not read: the caller of `Drag` at `Orbiter.cpp` 1327 (context only), the caller that passes `deltat` into `BeginStep`, `Camera::Read`/`Write`, the ground-observer mode, the external-control hook (`ECC`), and the near-plane block body (only its start is receipted, line 1207). Confidence: high on the orbit, zoom, drag and rate-limit numbers (all receipted); medium on the meaning of the zoom-step floor, which the donor comments as "move at least 1m/s" and whose units I did not verify.

## 1. Mechanism

- The chase view is an orbit around a target. The camera sits at yaw `ephi` and pitch `etheta` around the target, at distance `rdist` times the target's size (`Distance()`, Camera.cpp 431; `SetRelPos` builds `rpos` from column 3 of the rotation with length `-rdist*size`, 699-700). Nothing is smoothed in this mode: the yaw/pitch are set directly (`AddPhi` at 453 calls `SetRelPos` at once, with no limit of its own; the keyboard path limits the rate before it calls `ShiftPhi`, see the keyboard yaw line below). The donor's chase view has no lag and no collision test.
- Order of steps per frame: `Camera::Update` is called once per frame from `EndTimeStep` after the world has stepped (`Orbiter.cpp` 1798). It (a) reads the step `dt = td.SysDT` (971, variable step, no accumulator); (b) in the external branch, the `CAMERA_TARGETRELATIVE` case (1022-1023) puts the camera at `target->GRot() * rpos + target->GPos()`, so the view follows the target every frame; (c) if a drag offset exists, ages it: `t = t1 - tref_t0` (1087); after `dragT` seconds it clears the offset (1088); before that it scales the offset magnitude by `1 - u*u*(3 - 2u)` with `u = t/dragT` (1093), i.e. the offset is `tref_d0 x scale` (1096); (d) updates the near plane (1207 onward); (e) builds the view rotation.
- Zoom. `ShiftDist` (519) computes a step scale `max(1e-4, (rdist-1)/rdist)` (523) so steps shrink near the target surface. The donor then raises that scale to at least `1/target size` (524; the donor comment says "move at least 1m/s", target size in metres, and the shift is already scaled by the frame time), so the zoom does not stall near the target. The sketch includes this floor. A positive shift multiplies the distance by `1 + shift`; a negative shift multiplies by `max(1/rdist, 1/(1-shift))` (527-528), which keeps `rdist` at or above 1 target radius. `ChangeDist` (532) applies the factor with `SetRelPos(rdist*fact, ...)` (538). Callers: the mouse wheel (`ShiftDist(-zDelta*0.001)`, 125) and the keyboard (`ShiftDist(-td.SysDT)` for advance, Orbiter.cpp 2182).
- Yaw by mouse drag (external view): `ShiftPhi(dx * -0.005)` (160); `ShiftPhi` passes through to `AddPhi`, which adds half the shift (`ephi+dphi*0.5`, 453). Net: 0.0025 rad per pixel, applied at once.
- Yaw by keyboard (external view): `Orbiter.cpp` 2103-2105 set `cam_acc = 0.02`, `cam_vmax = SysDT x 1.0` and `max_dv = cam_vmax x cam_acc`. Each frame the requested step grows by `max_dv` up to `cam_vmax` (2111-2116), then `ShiftPhi(dphi)` is called (2119). Because the step is multiplied by `SysDT`, full speed is about 0.5 rad/s, but the ramp to full speed takes 1/0.02 = 50 frames, whatever the frame time. The ramp is counted in frames, not seconds.
- In-ship (cockpit) look, for contrast: the requested rate is `input x vmax` (480). Near a panel limit the rate is cut to `(remaining angle) x dfac` with `dfac = 2 amax / vmax = 8` (1109, 1159). When `rot_smooth` is set, the change in rate per second is capped at `amax` (1169-1170). The external keyboard yaw is also rate-limited (the frame ramp above); the smooth-and-cap rate shaping with panel limits is the cockpit's.
- Drag offset: `Drag(gshift)` (544) adds a shift to a stored offset, records the start time and the offset length, and sets `rdist` from the current distance (`tref_r0/target->Size()`, 552). The offset then decays over 3 s (`dragT`, 40) with the smoothstep curve above. It is a settle-back, not a lag.
- Tick: `Update` runs once per rendered frame. The step is whatever `BeginStep` was given (`TimeData.cpp` 41). No fixed step, no accumulator in this file.

## 2. Key functions

- `Camera::Update`: `/mnt/frankendom-donors/orbitersim-orbiter/Src/Orbiter/Camera.cpp` 969-1253. External branch 1019-1105 (target-relative case 1022-1023; drag decay 1086-1103); cockpit branch from 1106 (ends before the near-plane block at 1207; rate caps 1159-1170; the recentre state machine is not described in detail).
- `Camera::SetRelPos`: `/mnt/frankendom-donors/orbitersim-orbiter/Src/Orbiter/Camera.cpp` 679-701. Turns (distance, yaw, pitch) into the camera offset.
- `Camera::ShiftDist` and `Camera::ChangeDist`: `/mnt/frankendom-donors/orbitersim-orbiter/Src/Orbiter/Camera.cpp` 519-530 (step scale 523-524, factor 527-528) and 532-542 (apply, `SetRelPos` at 538).
- `Camera::Drag`: `/mnt/frankendom-donors/orbitersim-orbiter/Src/Orbiter/Camera.cpp` 544-556. Stores the offset, its start time, and the length to restore.
- `Camera::ProcessMouse` and `Camera::UpdateMouse`: `/mnt/frankendom-donors/orbitersim-orbiter/Src/Orbiter/Camera.cpp` 93-132 and 134-167. Wheel zoom (125); drag yaw (160).
- Keyboard camera input: `/mnt/frankendom-donors/orbitersim-orbiter/Src/Orbiter/Orbiter.cpp` from 2099 (`KbdInputImmediate_System`); lines 2101-2119 and 2182-2183 read in detail.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Look rate capped at a maximum, and the change of rate capped per second (rate-limited, dt-based) | `vmax = 2.0` rad/s (theirs, Camera.cpp 41); `amax = 8.0` rad/s^2 (theirs, 42) |
| Rate falls to zero as the view nears a limit | `dfac = 2*amax/vmax = 8` (theirs, 1109); applied at 1159 |
| Settle-back of a drag offset, smoothstep shape, zero after the time | `dragT = 3.0` s (theirs, 40); shape `1 - u*u*(3-2u)` (1093) |
| Zoom step shrinks near the target surface, floor at 1 target radius | Step scale `(rdist-1)/rdist` with floor `1e-4` (523); inward factor floor keeps `rdist >= 1` (528) |
| Zoom step scaled by the frame's dt in keyboard zoom | `td.SysDT` (Orbiter.cpp 2182) |
| Mouse yaw per pixel | `0.005` x 0.5 (160, 453) = 0.0025 rad per pixel |
| Keyboard ramp to full yaw speed | `cam_acc = 0.02` per frame, so 50 frames (Orbiter.cpp 2103) |
| Default chase distance | `rdist = 4.0` target radii (Camera.cpp 52; the line is 13 characters, so no receipt) |

## 4. TypeScript sketch

simplified: the sketch keeps three of the donor's ideas as functions: the rate cap with slow-down near a limit (the donor applies it to the in-ship view only; the sketch applies it to an orbit camera, which the donor does not do), the smoothstep settle of a drag offset, and the zoom step that shrinks near the surface (with the donor's `1/target size` floor). It omits the cockpit recentre state machine; the keyboard frame ramp; the optional `rot_smooth` switch (the cap is always on here); the planet and near-plane logic; the eye offset in cockpit mode; the external-control hook; and the `normangle` wrap. The orbit position formula matches the donor's algebra (column 3 of the rotation times `-rdist*size`).

```ts
// Licence: MIT (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
const VMAX = 2.0;                 // rad/s, look-rate cap
const AMAX = 8.0;                 // rad/s^2, look-acceleration cap
const DECEL = (2 * AMAX) / VMAX;  // 8: near a limit the rate falls to (remaining angle x DECEL)
const DRAG_T = 3.0;               // s, a drag offset eases back to zero over this time

interface OrbitCam {
  phi: number;         // yaw around the target, rad
  theta: number;       // pitch around the target, rad
  vPhi: number;        // current yaw rate, rad/s
  vTheta: number;      // current pitch rate, rad/s
  rdist: number;       // distance in target radii
  targetSize: number;  // target radius, m
}

interface Limits { phiLo: number; phiHi: number; thetaLo: number; thetaHi: number; }

// Requested rate -> applied rate: slow down as the angle nears a limit, then cap the change in rate per second.
function shapeRate(want: number, current: number, angle: number, lo: number, hi: number, dt: number): number {
  let v = want;
  if (v > 0) v = Math.min(v, (hi - angle) * DECEL);
  else if (v < 0) v = Math.max(v, (lo - angle) * DECEL);
  const maxStep = AMAX * dt;
  if (v > current + maxStep) v = current + maxStep;
  else if (v < current - maxStep) v = current - maxStep;
  return v;
}

// One frame of look input (requested rates, rad/s). dt is this frame's seconds (variable step, no fixed tick).
function stepLook(cam: OrbitCam, wantPhi: number, wantTheta: number, dt: number, lim: Limits): void {
  cam.vPhi = shapeRate(wantPhi, cam.vPhi, cam.phi, lim.phiLo, lim.phiHi, dt);
  cam.vTheta = shapeRate(wantTheta, cam.vTheta, cam.theta, lim.thetaLo, lim.thetaHi, dt);
  cam.phi += cam.vPhi * dt;
  cam.theta += cam.vTheta * dt;
}

// Wheel or key zoom. shift > 0 pulls out, shift < 0 pushes in; the step shrinks near the target surface but never below 1/targetSize.
function zoom(cam: OrbitCam, shift: number): void {
  let scale = Math.max(1e-4, (cam.rdist - 1) / cam.rdist); // slow down near 1 target radius
  scale = Math.max(scale, 1 / cam.targetSize); // floor: move at least 1 m/s (shift is already x dt), so zoom cannot stall
  const s = shift * scale;
  const fact = s > 0 ? 1 + s : Math.max(1 / cam.rdist, 1 / (1 - s));
  cam.rdist *= fact; // inward zoom stops at 1 target radius
}

// Magnitude of a drag offset that started at d0 and is t seconds old: smoothstep-shaped ease to zero over DRAG_T.
function dragMagnitude(d0: number, t: number): number {
  if (t >= DRAG_T) return 0;
  const u = t / DRAG_T;
  return d0 * (1 - u * u * (3 - 2 * u));
}

// Camera position from the orbit angles (same algebra as the donor's SetRelPos: column 3 of the rotation, length -rdist x size).
function orbitPosition(cam: OrbitCam): [number, number, number] {
  const R = cam.rdist * cam.targetSize;
  const sp = Math.sin(cam.phi), cp = Math.cos(cam.phi);
  const st = Math.sin(cam.theta), ct = Math.cos(cam.theta);
  return [R * sp * ct, -R * st, -R * cp * ct];
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/qc008_orbit-camera.ts` (block plus `export {}`): passed.

## 5. Lands in

- TARGET `src/fight/camera.ts` (client only; the engine never reads it). Parity-checklist row 11 (fight camera). The owner's world-camera request maps to this row because the camera is client-only and row 11 covers the fight camera.
- Reuse tag: adapt-idea (MIT: code may be adapted; this sketch is clean-room)
- Brief rule served: camera is client-only, so the donor's camera values are client settings, not engine logic; follow distance is zone data.

Tunable values (client settings unless noted): look rate cap, look acceleration cap, near-limit slow-down factor, drag settle time, zoom floor, wheel step, mouse yaw per pixel. Zone data: the default follow distance, if zones need different framing.

## 6. Gaps and risks

- The donor's chase view is instant. It has no lag and no smoothing, so copying the orbit as the world camera would keep the over-the-shoulder problem the owner has with the current view. The transferable parts are the rate caps, the settle-back, and the zoom step, not the orbit itself.
- No collision pull-in was found in the code I read. The only clip handling is a dynamic near plane for planet surfaces (block from 1207, body not receipted). Frankendom needs its own wall pull-in (a ray from the target to the desired camera position, pull to the hit point); this donor does not supply one.
- No lock-on and no framing of several targets. The donor frames one target only. The many-on-one framing in Frankendom must come from elsewhere.
- Keyboard ramp is counted in frames (`cam_acc` per frame, Orbiter.cpp 2103-2105), so it is not frame-rate independent. Do not copy it; use seconds.
- The zoom floor `1/target->Size()` (524) mixes units; the comment says "move at least 1m/s". I did not verify the units, so the sketch uses the target radius as the floor instead.
- The cockpit caps (vmax, amax, dfac) are for first-person in-ship look. They transfer to the world camera only as a shape (rate cap and slow-down near a limit), not the values.
- Not read: the caller of `Drag` (Orbiter.cpp 1327, context), the caller that passes `deltat` into `BeginStep`, `Camera::Read`/`Write`, the ground-observer mode, the external-control hook, and the recentre state machine in detail.

Best transferable idea: Cap how fast the look rate can change (8 rad/s^2) and slow it as it nears a limit (remaining angle x 8), and ease any drag or pull-back offset to zero with a 3 s smoothstep, so camera moves ease in and out instead of snapping, all driven by the frame's real dt.
Decision (proposed): adapt - the donor's chase orbit is instant (no lag, no collision), so Frankendom's world camera should keep only the rate caps, the slow-down near a limit, and the smoothstep settle; the orbit and lag have to be designed for us.
Acceptance: Client unit test with variable dt: a full-rate look held 0.1 s then released gives a yaw rate that never exceeds 2 rad/s, changes by at most 8 rad/s^2 x dt per frame, and never changes sign after release; in play, a flick of the look stick eases to a stop with no snap.

Reuse tag: adapt-idea (MIT: code may be adapted; sketch clean-room)
Brief rule served: camera is client-only (engine never reads it); follow distance as zone data, the rest as client settings.



## Checker findings (Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code.

**Errors / corrections:** (1) Zoom floor: note says units of 'scale = max(scale, 1/target->Size())' not verified and drops it from the sketch; code and comment (Camera.cpp 524 'move at least 1m/s') make it clear: shift (x dt seconds) * scale is a fraction of rdist-in-radii per second, so floor = 1 m/s. Dropping it leaves the sketch zoom at ~1e-4 step near 1 radius, i.e. stalls, unlike the donor. (2) 'cockpit is the only rate-limited look' - external keyboard yaw is also rate-ramped (Orbiter.cpp 2103-2116), which the note itself describes as frame-based. Verified OK: dragT 3.0, vmax 2, amax 8, dfac 2*amax/vmax, rdist=4.0 line 52, ShiftDist/ChangeDist 519-541, Drag 544-556, SetRelPos algebra and the sketch orbitPosition, mouse yaw -0.005 and AddPhi 0.5 factor, wheel ShiftDist(-zDelta*0.001), Update SysDT, smoothstep 1-u^2(3-2u), MIT.

**Missed:** None important.
