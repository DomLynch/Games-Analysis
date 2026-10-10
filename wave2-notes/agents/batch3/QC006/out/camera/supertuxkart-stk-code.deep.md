# supertuxkart-stk-code (camera, cell 14)

Donor: `/mnt/frankendom-donors/supertuxkart-stk-code/src/graphics/camera/camera_normal.cpp` | Licence: GPL-3.0-or-later (COPYING is GPL v3; source header "either version 3 of the License, or (at your option) any later version") | C++ | symbol `CameraNormal::update`

Checked: camera_scope: world camera (third-person chase camera behind the kart; the default). Read in full: `camera_normal.cpp` (1-589), `camera.cpp` (1-314). Also read: `world.cpp` 1125-1148 (update call site), `main_loop.cpp` 296-310 (dt cap), `user_config.hpp` 1035-1066 and 1085-1150 (defaults), `stk_config.cpp` 410-413 and `data/stk_config.xml` 273-281 (skid flag), `camera_debug.cpp` 92-140 (the hint file; debug presets, not the follow camera). `camera_end.cpp` and `camera_fps.cpp` only by grep. Not read: `SmoothNetworkBody` (kart smoothed transform), `Skidding::getVisualSkidRotation`, `Kart::isFlying`. Confidence: high on the order of operations and on the defaults; medium on how often `restart()` runs (only its constructor call, `camera_normal.cpp:77`, was checked).
Best transferable idea: Pull a third-person follow camera back as speed rises (floored at twice its rest distance) and ease its offset with a per-frame fraction dt / max(dt, T), so the lag is close to frame-rate independent.
Decision (proposed): adapt - take the speed-scaled pull-back, the 2x distance floor and the dt/T easing; do not take the dead side offset or the 33-degree drone preset as default; add the over-the-shoulder offset and wall pull-in ourselves, because STK's camera sits behind the kart's centre and does no collision.
Acceptance: At rest the camera sits 2.0 m behind and 0.85 m up and never closer; at sprint it eases to about 3.75 m and 1.25 m up over about 0.2 s, with no snap on a 50 ms frame hitch. A server-free client test asserts distance >= 2 x distance at speed 0 and that the offset after 1 s at 60 Hz and at 30 Hz differ by less than 5% of the gap.

## 1. Mechanism

- The loop: `World::update` calls every camera's `update(dt)` once per rendered frame (`world.cpp:1142`). The `dt` comes from `getLimitedDt`, which caps a non-networked frame at 3 substeps of 1/60 s = 50 ms (`main_loop.cpp:306-307`; the cap is skipped when networked, `main_loop.cpp:302`). So the camera is variable-step, with a hitch cap.
- `CameraNormal::update` (`camera_normal.cpp:323-370`), in order: (a) read `getCameraSettings` for the current mode; (b) if an explosion animation is running and not yet reset, freeze the position and only re-aim at the kart (`340-352`); (c) otherwise, if smoothing is on, set `m_last_smooth_mode` and call `moveCamera(dt, true, ...)` (`358`), then `positionCamera` (`361`); (d) if smoothing is off, `positionCamera` places the camera directly (`361`), then the smooth state is advanced with the last smooth mode's settings (`364-369`).
- `moveCamera` (smooth path), in order:
  1. If the kart is flying, set the camera to the kart origin plus (sin(heading) x -4, 0.5, cos(heading) x -4) and aim at the origin; return (`92-100`). No easing.
  2. Speed ratio = speed / engine max speed, floored at -0.12 (`112-114`).
  3. Pull-back: `camera_distance = -(2.8 + 5.6 x ratio)`, then multiplied by sqrt(position smoothing) (`117-118`). Clamp: if it is less negative than `2 x distance` (the configured distance is stored as a negative number, so `min_distance = -2 x distance`), set it to that (`119-121`). Height: `0.85 + ratio / 2.5`, with the pitch term `tan_up` zero at the default angle (`124`, `128`).
  4. Side and skid: the offset is `(camera_distance x sin(a/2), height, camera_distance x cos(a/2))`, where a = asin(visual skid factor) (`109-111`, `127-129`). So the camera swings sideways and pulls in slightly during a skid. The steering side term is zero: `m_rotation_range` is set to 0.4 and then to 0.0 in the constructor (`69-70`), and `getCameraSettings` multiplies it by the steer (`220`).
  5. Easing: `delta = dt / max(dt, position smoothing)` and `delta2 = dt / max(dt, rotation smoothing)`, both clamped to 0..1 (`131-135`).
  6. Placement uses the state from before this frame: `btt` has the kart's current origin, the previous smoothed rotation `q1`, and the previous offset is applied (`137-150`). Then the rotation advances: `m_kart_rotation = q1.slerp(q2, delta2)` (`145`), and the offset advances: `m_camera_offset += (wanted - m_camera_offset) x delta` (`151`).
  7. Look-at target: kart origin plus 0.5 up in the kart frame (`154`), applied in the smooth branch (`164-169`).
- `positionCamera` (`380-524`): in smooth mode it only sets the up vector (position and target are set only in the `!smoothing` branch, `487-491`). In non-smooth mode (the drone preset) it places the camera at the kart transform applied to (side, |distance| x tan_up + 0.75, distance) and aims at the kart plus 0.75 up (`473-491`). The up vector moves 4% per frame toward the kart's up (`509-511`), or straight up while flying (`513-514`).
- Restart: the constructor calls `restart()` (`77`), which starts the offset at z = -33 x sqrt(position smoothing), about -14.8 m at the default, with height 1.0 (`188-190`). The camera then eases in. Whether `restart()` runs at each race start was not checked.
- Presets (user config, not per zone): "standard" = distance 1.0, up angle 0 degrees, position smoothing 0.2, rotation smoothing 0.125 (`user_config.hpp:1086-1101`); "drone" = distance 2.6, up angle 33 degrees, both smoothing values 0.0 (`1132-1147`). Reverse view = 2.0 back, 5 degrees up, no smoothing (`1056-1061`, `camera_normal.cpp:234-241`). Closeup = half distance, 20 degrees, no smoothing (`252-261`). The options screen switches the preset values (`options_screen_display.cpp:452-475`).
- Skid follow flag: when `stk_config.m_camera_follow_skid` is set, the non-smooth path also rotates the basis by the visual skid rotation (`477-484`). That path runs only with smoothing off (drone, closeup and reverse presets), so the flag has no effect in the standard preset. `data/stk_config.xml:280` sets `camera-follow-skid="true"`, read at `stk_config.cpp:413`.

## 2. Key functions

- `CameraNormal::update`: `/mnt/frankendom-donors/supertuxkart-stk-code/src/graphics/camera/camera_normal.cpp` 323-370. Chooses between the freeze, the smooth path and the direct path.
- `CameraNormal::moveCamera`: same file, 87-174. The flying snap (92-100), the pull-back and height (114-129), the two easing fractions (131-135), the rotation slerp and offset lerp (137-151), the target (154-169).
- `CameraNormal::getCameraSettings`: same file, 202-317. Per-mode distance, up angle, smoothing flag and side term.
- `CameraNormal::positionCamera`: same file, 380-524. The direct placement (non-smooth), the up-vector blend, and the soccer/TV modes (398-469, not used by a normal race).
- `CameraNormal::restart`: same file, 177-192. Start offset.
- `Camera::setMode`, `Camera::reset`, `Camera::setInitialTransform`: `/mnt/frankendom-donors/supertuxkart-stk-code/src/graphics/camera/camera.cpp` 195-270. Mode switch from reverse or falling snaps the camera to (0, 1.6, -3); FOV is set at construction and in the initial transform (`141`, `269`).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Pull back with speed: behind = (a + b x ratio) x sqrt(smoothing), floored at 2 x rest distance | a = 2.8, b = 5.6, ratio floor -0.12 (theirs, `camera_normal.cpp:114, 117-118`). Derived by hand from the formula with defaults: the floor binds below ratio about 0.30; 2.0 m at rest, about 3.75 m at top speed. Not run. |
| Height rises slightly with speed | 0.85 + ratio / 2.5 (theirs, `camera_normal.cpp:128`): 0.85 at rest, 1.25 at top speed (derived). |
| Easing fraction dt / max(dt, T), so the per-frame step shrinks with T and is about exp(-t/T) over time | T = 0.2 position (theirs, `user_config.hpp:1046`), T = 0.125 rotation (`1051`). At 60 Hz the position fraction is 1/12 per frame (derived: (1/60) / 0.2). |
| Frame-time cap | 3 substeps of 1/60 s = 50 ms (theirs, `main_loop.cpp:306`), not applied when networked (`302`). |
| Look-at point above the origin | 0.5 (theirs, `camera_normal.cpp:154`). |
| Up-vector blend | 0.04 per frame (theirs, `camera_normal.cpp:509`). |
| Flying follow point | 4.0 back, 0.5 up, no easing (theirs, `camera_normal.cpp:94-96`). |
| Field of view | 80 degrees (theirs, `user_config.hpp:1066`), not changed during a normal race: FOV is set only at construction and in the initial transform (`camera.cpp:141, 269`). The end camera changes FOV (`camera_end.cpp:150`, grep only). |

## 4. TypeScript sketch

simplified: yaw only (no pitch or roll), so the quaternion slerp becomes a heading lerp with the same fraction; the visual skid factor is an input and drives the sideways swing as in the donor, while the steering side term (zero in the donor) is omitted; the skid follow flag for the non-smooth path, the up-vector blend, the flying snap, the explosion freeze, the reverse and closeup modes, the restart start offset and the soccer and TV modes are omitted. The order (place with the previous offset and heading, then advance state) follows the donor (`camera_normal.cpp:145-151`).

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface KartPose { x: number; y: number; z: number; heading: number; speed: number; skid: number; } // skid: visual skid factor, -1..1
interface ChaseState {
  offX: number; offY: number; offZ: number; // camera offset in the kart-local frame (units); -z is behind
  heading: number;                          // smoothed heading used for placement (rad)
}
interface ChaseParams {
  distance: number;   // rest distance behind the kart (zone data; donor default 1.0)
  smoothPos: number;  // position smoothing time constant, s (zone data; donor default 0.2)
  smoothRot: number;  // heading smoothing time constant, s (zone data; donor default 0.125)
  maxSpeed: number;   // engine max speed, same unit as kart.speed
}
interface CamPose { px: number; py: number; pz: number; tx: number; ty: number; tz: number; }

function lerpAngle(a: number, b: number, t: number): number {
  return a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;
}

function stepChaseCamera(st: ChaseState, kart: KartPose, dt: number, p: ChaseParams): CamPose {
  if (dt <= 0) throw new Error("dt must be positive");
  const ratio = Math.max(kart.speed / p.maxSpeed, -0.12);          // reverse speed floored at -0.12
  let behind = (2.8 + 5.6 * ratio) * Math.sqrt(p.smoothPos);        // pulls back as speed rises
  behind = Math.max(behind, 2 * p.distance);                        // never closer than 2 x distance
  const a = Math.asin(Math.max(-1, Math.min(1, kart.skid)));        // skid angle (donor: asinf of visual skid factor)
  const wantX = -behind * Math.sin(a / 2);                          // sideways swing during a skid
  const wantY = 0.85 + ratio / 2.5;                                 // height rises a little with speed
  const wantZ = -behind * Math.cos(a / 2);

  const d1 = dt / Math.max(dt, p.smoothPos);                        // position lerp fraction
  const d2 = dt / Math.max(dt, p.smoothRot);                        // heading lerp fraction

  // place with the PREVIOUS offset and heading, then advance the state
  const s = Math.sin(st.heading), c = Math.cos(st.heading);
  const px = kart.x + st.offX * c + st.offZ * s;
  const pz = kart.z - st.offX * s + st.offZ * c;
  const py = kart.y + st.offY;
  st.heading = lerpAngle(st.heading, kart.heading, d2);
  st.offX += (wantX - st.offX) * d1;
  st.offY += (wantY - st.offY) * d1;
  st.offZ += (wantZ - st.offZ) * d1;

  return { px, py, pz, tx: kart.x, ty: kart.y + 0.5, tz: kart.z };  // look at 0.5 above the kart origin
}
```

## 5. Lands in

- TARGET `origins/client/world-camera.ts` (new client module; the camera is client-only, so it is not in `src/fight/`). Parity-checklist row 11 (fight camera). Frankendom's world camera is the one the owner wants improved.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room, shape only)
- Brief rule served: camera is client-only and tunable (the engine never reads it); the world camera is over-the-shoulder today and is the target of this pass (owner ruling 2026-10-10). Pit camera unchanged.

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism, not translated.
- STK's camera is a behind-centre chase camera, not over-the-shoulder. Its steering side offset is zeroed in the donor (`camera_normal.cpp:70`); the only sideways motion is the skid swing (`111`, `127-129`). The shoulder offset the owner wants must be added by us and tested; this donor does not supply it.
- No wall collision in the donor. A grep of `src/graphics/camera` for collision or raycast matched only `camera_debug.cpp`. The pull-in against walls must be designed separately (not read in the donor).
- No lock-on, no multi-target framing, no combat zoom and no camera shake in the normal camera. A grep of the camera directory for lock or zoom found nothing; the only event behaviour is the explosion freeze (`340-352`). Shake: `kart.cpp:1462` is a debug macro only.
- Placement uses the previous frame's offset and rotation (`camera_normal.cpp:145-151`). A one-frame lag is part of the donor's feel; measure it on sprint before copying it.
- The speed ratio is the kart's speed over its engine max. Frankendom's hero has no such speed in a duel, so the pull-back belongs to the world camera only, and its max speed must come from zone or hero data.
- The drone preset (2.6 m, 33 degrees up, no smoothing) is a candidate overview mode, not a default. Do not make it the default.
- Frankendom rule: camera values are client settings, never gameplay. Expose them as data fields with defaults; the server never reads them.
- `m_position_speed` and `m_target_speed` are set in the constructor (`camera_normal.cpp:67-68`) and never read in the files checked; they are dead.

Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room, shape only)
Brief rule served: camera is client-only (rule for the world camera; owner ruling 2026-10-10)
