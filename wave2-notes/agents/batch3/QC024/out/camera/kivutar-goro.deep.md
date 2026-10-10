# kivutar-goro (camera, cell 14)

Donor: `/mnt/frankendom-donors/kivutar-goro/game/camera.go` | Licence: MIT (LICENSE line 1 "MIT License", line 3 "Copyright (c) 2026 Jean-André Santoni") | Go | symbol `followCamera.Update`

Checked: `followCamera.Update` (game/camera.go 46-67) and its helpers were read in full; game/camera.go was read whole (1-353). Frame driver read: `app/app.go` 89-92 (Game.Update) and `WorldMode.Update` (game/world.go 645; camera step at 730, rotation input at 870, zoom input at 1157). Projection read: game/scene_projection.go 1-60 and 100-260. Per-map table read: res/manager.go 60-74 and 286-382. Shake sources read: db/effects.go 720-721, 1048-1050, 1389-1391, 1673; game/effects.go 1558-1562. Callers: `Update` is called from world.go:730 on the main path of `WorldMode.Update` (earlier returns in that function skip it; the gates were not read in full), from world.go:1429 (same-map warp), and from camera.go:142 (only if not yet initialised). `ResetRotation` (camera.go:132) has no production caller (only a test at world_mode_render_test.go:272). Not read: `actorRenderPosition`, the body of `terrainHeightAt` past its nil check (scene_projection.go 257-260), `touchDistance` (input/input.go:336, one line only), `drawLockOnTargetEffect` (game/effects_func.go:194), the engine's own scheduler for `Game.Update`. camera_scope: world camera. Confidence: high for the follow, zoom, pitch, yaw and shake mechanism; high for the absence of collision and of combat framing (grep over game/ and res/).

## 1. Mechanism

- A third-person orbit camera that centres the look target on the player and orbits it. There is no shoulder offset. Each frame the camera eases a follow point toward the player's position and eases its zoom distance toward a target. The eye sits on a ring around that point at a yaw (user-controlled), an elevation from pitch, and a distance from zoom.
- Order inside one world update (line order in `WorldMode.Update`): (a) `m.camera.Update(ctx, now)` at world.go:730 advances the follow point and zoom using the time since the last step; (b) `updateCameraRotation` at world.go:870 reads right-drag (yaw, or pitch with Shift); (c) `updateCameraZoom` at world.go:1157 reads wheel and pinch into the zoom target, skipped when the pointer is blocked. Rotation writes a direct yaw or pitch value that the projection reads when it next runs. Zoom writes a target, so the easing picks it up on the next frame's step.
- Follow step (camera.go 58-65): `delta` is wall-clock time since the last step (`time.Now()` at world.go:646). `lerp = min(delta_ms x 0.006, 1)` (camera.go 73, 0 if delta <= 0). Position moves `(target - pos) x lerp` on each axis. Zoom uses `zoomLerp = min(lerp x 2, 1)` (camera.go 129). The first step after init snaps (camera.go 48-57). The lerp is linear in elapsed time, not exponential, so it is approximately frame-rate independent. Computed from the formula (not measured): after 1 s the remaining gap is 0.0018 of the start at 60 fps and 0.0022 at 144 fps, against 0.0025 for an exact exponential with the same rate. A gap of 167 ms or more gives lerp 1 and a snap.
- Projection (camera.go 140-155, scene_projection.go 167-188): the eye is `target + (sin(yaw) x h, sin(p) x d, -cos(yaw) x h)` where `d = zoom x 0.5` and `h = cos(p) x d`. Pitch is folded: `if pitch > 180 { pitch -= 180 }` (scene_projection.go 170-171), so the default 230 gives 50 degrees of elevation and the clamp range 205 to 245 gives 25 to 65 degrees. Perspective: FOV 15 degrees, near 1, far 1000 (scene_projection.go 187). Target axes map as (x, height z, depth y) (176).
- Shake (camera.go 167-192): a shake offset is added to the follow point, so eye and look target move together (the whole rig translates). Amplitude `0.18 x (1 - progress)`, linear decay over the duration, `sin(2pi x 120 x s)` on x and `cos(2pi x 150 x s)` on y, where `s` is elapsed seconds. A shake starts at `effect start + CameraShakeDelay` (game/effects.go 1562). Durations in the effect table: 200 ms (db/effects.go 1050, explosion), 650 ms (1391, earthquake), 132 ms delay (1673).
- Input: right-drag yaw is `-(dx / screen width) x 720` degrees, added without smoothing and wrapped to -180..180 (camera.go 297-302, 77). Shift + right-drag changes pitch by `dy x 0.3` and clamps to 205..245 (camera.go 202, 84). Wheel: each frame with a nonzero `WheelY` moves the zoom target by 15 units toward closer or farther, using only the sign (camera.go 308-313, 105). Pinch: target multiplied by `exp(-delta / 240)` (camera.go 315-320). Zoom target clamp 65.0 to 165.0 (camera.go 330-335).
- Per-map overrides (camera.go 146-153, 240-295; res/manager.go 332-382): a table `data/viewpointtable.txt` keyed by map name. If the table entry has `MinLongitude == MaxLongitude` (res/manager.go 73) the yaw is set to minus the table's initial longitude (camera.go 241-242) and pitch is fixed at 230 (camera.go 152-154). Indoor maps with no such entry get yaw -45 (camera.go 244-246) and the same pitch lock. Indoor maps lock rotation too (camera.go 257). If `DistanceScope <= 0` the wheel is ignored and the projection zoom is `InitialDistance` if that is above 0, else 125 (camera.go 275-279; cameraZoomLockedForMap at 291-292). The table also has MinDistance and latitude fields, which are parsed but not read by camera.go.
- Not present: no collision or wall pull-in (grep over game/ and res/ for collision, clip, wall, occlu, obstacle found nothing in camera code); no lock-on framing (lock-on is a visual effect, effects_func.go 194); no FOV or zoom change in combat (the 15-degree FOV is a constant, scene_projection.go 26); no automatic recentring (yaw persists across `ResetTracking`, camera.go 37).

## 2. Key functions

- `followCamera.Update`: `/mnt/frankendom-donors/kivutar-goro/game/camera.go` 46-67. Follow and zoom easing, the first-step snap.
- `cameraFollowLerp`: `/mnt/frankendom-donors/kivutar-goro/game/camera.go` 69-74. Elapsed ms x 0.006, capped at 1.
- `cameraZoomLerp`: `/mnt/frankendom-donors/kivutar-goro/game/camera.go` 125-130. Twice the follow lerp, capped at 1.
- `WorldMode.updateCameraRotation` and `updateCameraZoom`: `/mnt/frankendom-donors/kivutar-goro/game/camera.go` 194-226. Input to yaw, pitch and zoom target.
- `followCamera.ProjectionWithOffset`: `/mnt/frankendom-donors/kivutar-goro/game/camera.go` 140-156. Rig to projection, with locked-map overrides. `sceneProjection` (166) is the entry used by movement.go:82, companion_ai.go:140, homunculus.go:23, friends.go:65 and world.go:1175/1182/1579/1629 (callers seen by grep; their bodies not read).
- `sceneCameraMatrixWithYawPitchZoom`: `/mnt/frankendom-donors/kivutar-goro/game/scene_projection.go` 167-188. Eye, look-at and perspective.
- `cameraShakeOffset` and `startCameraShake`: `/mnt/frankendom-donors/kivutar-goro/game/camera.go` 171-192. Decaying two-axis shake.
- `startWorldEffectCameraShake`: `/mnt/frankendom-donors/kivutar-goro/game/effects.go` 1558-1563. Effect spec to shake start.
- `loadCameraViewPoints`: `/mnt/frankendom-donors/kivutar-goro/res/manager.go` 332-382. Per-map table.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Follow point eases toward target at a rate per elapsed millisecond, capped at 1 | 0.006 per ms (theirs, camera.go 14) |
| Zoom eases at twice the follow rate | Ratio 2 (theirs, camera.go 129) |
| Eye distance is zoom x 0.5; zoom clamped to a range | Zoom 65.0 to 165.0; default 125 (theirs, camera.go 17-18; scene_projection.go 25); distance 32.5 to 82.5 units, default 62.5 |
| Elevation from a clamped pitch, folded above 180 | Pitch 205.0 to 245.0 (theirs, camera.go 19-20) = 25 to 65 degrees; default 230 = 50 degrees (scene_projection.go 23) |
| Wheel adds a fixed step per frame, by sign | Step 15 units (theirs, camera.go 15) |
| Pinch scales the zoom target exponentially | Scale 240 (theirs, camera.go 16); the pinch unit is from input/input.go 338 only, and `touchDistance` was not read |
| Drag to pitch and yaw | Pitch 0.3 per pixel (theirs, camera.go 21); yaw 720 degrees per full screen width (theirs, camera.go 301) |
| Shake decays linearly and translates the rig | Amplitude 0.18 units (theirs, camera.go 189); 120 Hz x, 150 Hz y (camera.go 191); 200 ms explosion, 650 ms earthquake (db/effects.go 1050, 1391); 132 ms delay (db/effects.go 1673) |
| Zone camera override table | Keys: min and max longitude, initial distance, distance scope (theirs, res/manager.go 373-377); min distance and latitudes parsed, not read |
| FOV | 15 degrees (theirs, scene_projection.go 26) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order inside one step: follow easing, then zoom easing from the same frame's lerp, then the eye computed from the rig. Input functions are separate and take effect on the next step, as in the donor. It omits: the zoom-lock and pointer-blocked gates in the caller, the indoor and view-table overrides (yaw lock, fixed distance, initial distance), the ResetTracking carry-over, the Shift-gating of pitch drag, the order of wheel then pinch within one frame (the donor applies both in the same frame, wheel first), the perspective matrix, and the effect scheduling of shakes. It adds no shoulder offset and no wall pull-in, because the donor has neither.

```ts
// Licence: MIT (donor LICENSE). Clean-room sketch of the mechanism described in the note, not a line-by-line translation.
// clean-room
export const CAM = {
  followLerpPerMs: 0.006,
  zoomLerpRatio: 2,
  minZoom: 65,
  maxZoom: 165,
  defaultZoom: 125,
  wheelZoomStep: 15,
  pinchScale: 240,
  minPitch: 205,
  maxPitch: 245,
  defaultPitch: 230,
  pitchDragPerPx: 0.3,
  yawDragPerFullWidth: 720,
} as const;

export interface Rig {
  x: number; // follow point, first horizontal axis
  y: number; // follow point, second horizontal axis (depth)
  z: number; // follow point, height
  zoom: number; // current zoom (eye distance is zoom * 0.5)
  zoomTarget: number; // 0 = unset
  yaw: number; // degrees, user offset
  pitch: number; // degrees, 0 = unset
  initialised: boolean;
  lastMs: number;
}

export interface Point3 { x: number; y: number; z: number; }

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

function targetZoom(r: Rig): number {
  if (!(r.zoomTarget > 0) || !Number.isFinite(r.zoomTarget)) {
    return r.zoom > 0 && Number.isFinite(r.zoom) ? clamp(r.zoom, CAM.minZoom, CAM.maxZoom) : CAM.defaultZoom;
  }
  return clamp(r.zoomTarget, CAM.minZoom, CAM.maxZoom);
}

function currentZoom(r: Rig): number {
  return r.zoom > 0 && Number.isFinite(r.zoom) ? clamp(r.zoom, CAM.minZoom, CAM.maxZoom) : targetZoom(r);
}

function currentPitch(r: Rig): number {
  return r.pitch === 0 || !Number.isFinite(r.pitch) ? CAM.defaultPitch : clamp(r.pitch, CAM.minPitch, CAM.maxPitch);
}

function normaliseYaw(y: number): number {
  let v = y % 360;
  if (v <= -180) v += 360;
  if (v > 180) v -= 360;
  return v;
}

// Frame-rate-dependent by design in the donor: lerp = elapsed ms x rate, capped at 1.
export function followLerp(deltaMs: number): number {
  if (deltaMs <= 0) return 0;
  return Math.min(deltaMs * CAM.followLerpPerMs, 1);
}

// One follow step per frame. Position eases toward the target; zoom eases at twice the rate.
export function step(r: Rig, t: Point3, nowMs: number): void {
  if (!r.initialised) {
    r.x = t.x;
    r.y = t.y;
    r.z = t.z;
    r.zoom = targetZoom(r);
    r.lastMs = nowMs;
    r.initialised = true;
    return;
  }
  const lerp = followLerp(nowMs - r.lastMs);
  r.lastMs = nowMs;
  r.x += (t.x - r.x) * lerp;
  r.y += (t.y - r.y) * lerp;
  r.z += (t.z - r.z) * lerp;
  const zoomLerp = lerp <= 0 ? 0 : Math.min(lerp * CAM.zoomLerpRatio, 1);
  r.zoom += (targetZoom(r) - currentZoom(r)) * zoomLerp;
}

// Wheel: a frame with any nonzero WheelY moves the zoom target by 15 units; only the sign matters.
export function wheelZoom(r: Rig, wheelY: number): void {
  if (wheelY === 0 || !Number.isFinite(wheelY)) return;
  r.zoomTarget = clamp(targetZoom(r) - Math.sign(wheelY) * CAM.wheelZoomStep, CAM.minZoom, CAM.maxZoom);
}

// Pinch: exponential factor on the zoom target.
export function pinchZoom(r: Rig, pinchDelta: number): void {
  if (pinchDelta === 0 || !Number.isFinite(pinchDelta)) return;
  const factor = Math.exp(-pinchDelta / CAM.pinchScale);
  r.zoomTarget = clamp(targetZoom(r) * factor, CAM.minZoom, CAM.maxZoom);
}

// Right-drag: yaw, no smoothing. A full-width drag is 720 degrees.
export function yawDrag(r: Rig, dxPx: number, screenWidthPx: number): void {
  if (dxPx === 0 || screenWidthPx <= 0) return;
  r.yaw = normaliseYaw(r.yaw - (dxPx / screenWidthPx) * CAM.yawDragPerFullWidth);
}

// Shift + right-drag: pitch, clamped.
export function pitchDrag(r: Rig, dyPx: number): void {
  if (dyPx === 0) return;
  r.pitch = clamp(currentPitch(r) + dyPx * CAM.pitchDragPerPx, CAM.minPitch, CAM.maxPitch);
}

// Eye and look target. Pitch above 180 is folded down, so 230 means 50 degrees of elevation.
// The shake offset moves the follow point, so eye and target shift together.
export function eyeAndTarget(r: Rig, shakeX = 0, shakeY = 0): { eye: Point3; target: Point3 } {
  const distance = currentZoom(r) * 0.5;
  let pitch = currentPitch(r);
  if (pitch > 180) pitch -= 180;
  const p = (pitch * Math.PI) / 180;
  const yaw = (r.yaw * Math.PI) / 180;
  const horizontal = Math.cos(p) * distance;
  const target: Point3 = { x: r.x + shakeX, y: r.z, z: r.y + shakeY };
  const eye: Point3 = {
    x: target.x + Math.sin(yaw) * horizontal,
    y: target.y + Math.sin(p) * distance,
    z: target.z - Math.cos(yaw) * horizontal,
  };
  return { eye, target };
}

// Shake: sine on two axes, linear decay over the duration, starting at startMs.
export function shakeOffset(startMs: number, durationMs: number, nowMs: number): [number, number] {
  if (durationMs <= 0 || nowMs < startMs || nowMs >= startMs + durationMs) return [0, 0];
  const progress = clamp((nowMs - startMs) / durationMs, 0, 1);
  const amplitude = 0.18 * (1 - progress);
  const s = (nowMs - startMs) / 1000;
  return [Math.sin(s * 120 * 2 * Math.PI) * amplitude, Math.cos(s * 150 * 2 * Math.PI) * amplitude];
}

export {};
```

## 5. Lands in

- TARGET `src/fight/camera.ts` (proposed new client module for the world follow camera; the camera is client-only and the engine never reads it). Parity-checklist row 11 (fight camera), the nearest row; the world camera is not a fight camera, so Lead may want its own row.
- Tunables go in zone data where the donor keeps them per map: initial distance, zone yaw lock, distance scope (donor res/manager.go 373-377). The engine constants (follow rate, zoom range, pitch range, wheel step, shake) stay in code.
- Reuse tag: adapt (MIT, Copyright (c) 2026 Jean-André Santoni; code may be adapted, keep the notice if any code is copied; this sketch is clean-room)
- Brief rule served: camera is client-only and reads no server state; tunables as data (rule 11 typecheck; rule 7 licence read)

## 6. Gaps and risks

- Over-the-shoulder: the donor centres the look target on the player and has no lateral offset (projection at camera.go 155 uses the follow point directly). The shoulder offset the owner wants is not here and must be added (a lateral offset applied to both eye and look target).
- Wall pull-in: none in the donor (grep found no collision code in game/ or res/). The eye can go through geometry. Frankendom must add a collision pass (cast from the look target to the eye, pull the eye in on a hit); this is our design, not adopted from the donor.
- Follow target: the donor follows `actorRenderPosition` (camera.go 232; the function was not read, so whether it interpolates is unknown), not server state. This is right for a client camera; the server never reads it, so it does not touch the one-ledger or server-verified kill rules.
- Frame-rate: the follow lerp is linear in elapsed ms, so it is approximately, not exactly, frame-rate independent (numbers in section 1). If adopted, use `1 - exp(-rate x dt)`. That is our change, not the donor's.
- Lock-on and many-enemy framing: none in the donor. Lock-on is a visual effect (effects_func.go 194). Framing up to MAX_ATTACKERS = 3 targets is not covered by this donor and needs its own design.
- Combat zoom: the donor changes zoom only from the player's wheel or pinch and from map overrides. There is no zoom pulse on hits. Shake is the only hit feedback.
- Shake: 120 Hz and 150 Hz sines are sampled once per frame, so at typical frame rates the visible pattern depends on the frame rate (reasoned from sampling, not measured). Keep shake short and capped if adopted (durations 200 to 650 ms in the donor).
- Recentring: the donor never recentres yaw in play (`ResetRotation` has only a test caller). Frankendom's world camera needs an explicit recentre-behind-the-hero rule, which is not here.
- Pit camera: the donor's indoor and locked-yaw path is the closest thing to a fixed arena view. Do not change the Pit camera; this note is for the world camera only.
- Not read: `actorRenderPosition`; the body of `terrainHeightAt` past its nil check; `touchDistance`; the engine scheduler for `Game.Update`. The pinch unit is therefore not confirmed.

Reuse tag: adapt (MIT; cite the donor when adapting)
Brief rule served: camera is client-only and reads no server state; tunables as data; rule 11 typecheck run on the sketch

Best transferable idea: a follow rig that eases its position at a per-millisecond rate and its zoom at twice that rate, with clamped zoom and pitch, gives a smooth third-person orbit whose numbers can sit in data.
Decision (proposed): adapt — take the follow easing, the zoom and pitch clamps, the orbit maths and the decaying shake; add the shoulder offset and the wall pull-in ourselves, because this donor has neither and the owner's complaint is about the over-the-shoulder view.
Acceptance: in a zone the hero sits off-centre (the shoulder offset), the wheel changes distance in 15-unit steps within 65 to 165, a heavy blow shakes the view for 200 ms with decaying amplitude, and when a wall lies between the eye and the hero the eye slides in so the wall never fills the view (a client test asserts the eye distance drops below the set distance when a blocked ray is placed).
