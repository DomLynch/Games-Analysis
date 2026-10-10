# Kelsidavis-WoWee (camera, cell 14)

Donor: `/mnt/frankendom-donors/Kelsidavis-WoWee/src/rendering/camera_controller.cpp` (with `include/rendering/camera_controller.hpp` for constants, `src/rendering/camera.cpp` for yaw/pitch to forward) | Licence: "MIT License (with Additional Restriction)": MIT, but the software may not be used, in whole or part, as the basis for or a component of any commercial video game (LICENSE; NOTICE says the restriction was added 2026-07-21) | C++ | symbol `CameraController::updateOrbitCamera`

Checked: camera_scope: world camera. Read in full: `updateOrbitCamera` (cpp 1986-2440), the one caller `updateThirdPersonCamera` (cpp 2503-2516) and its only caller (cpp 3160-3161), the frame setup `update()` dt lines (cpp 2715-2720, 3139-3164), the wheel handler (cpp 3719-3734), the mouse drag handler (cpp 3327-3369), `raymarchTerrainCameraLimit` (cpp 205-244), `triggerShake` (cpp 270-282) and the shake/sway block (cpp 3296-3324), the header constants and pivot functions (hpp 420-585 read by grep and sed; 506-540 read). `camera.cpp` 32-38 (forward from yaw/pitch). Not read: `moveFollowedCharacter` (cpp 345), `groundFollowedCharacter` (cpp 1368), the taxi branch (cpp 2723-2800 in part), the player-hide code (cpp 2437-2502), the intro/idle orbit start (cpp 190-204, 2840-2860 read only in part). Confidence: high on the orbit, collision and smoothing numbers (all receipted); medium on the movement side (how the character follows the camera) because I read only the axes lines. Callers: `updateOrbitCamera` has one caller (cpp 2515); `triggerShake` has one caller (`src/core/application.cpp:2260`, seen by grep, not read); `processMouseWheel` has two (`application.cpp:1542`, `gamepad_controls.cpp:150`). The licence is not plain MIT; read as restricted.

Best transferable idea: a third-person camera that is pulled in by walls with a fast pull-in, a slow give-back, a zoom debt that is repaid only after a clear spell, and a small yaw step-around before pulling in at all.
Decision (proposed): adapt - the pivot here is centred on the character, which is not the over-the-shoulder shot the owner wants, so Frankendom keeps the collision and smoothing shape and adds a lateral shoulder offset to the pivot; the donor's 88 degree pitch clamp is too loose for a follow camera and is not copied.
Acceptance: a player backs into a wall in a zone: the camera slides in within about 0.1 s, does not jitter on a slope, eases back out over about 0.4 s once clear, and a client test asserts that after the pull-in the rendered camera distance is never past the wall limit.

## 1. Mechanism

- Frame order (cpp 2715-2720, 3139-3164): `update(deltaTime)` clamps only the physics step (`physicsDeltaTime = min(deltaTime, 1/30 s)`, cpp 2720, kMaxPhysicsDelta cpp 35). The camera gets the raw `deltaTime` (cpp 3161). The third-person branch first moves and grounds the character (cpp 2505-2506), then calls `updateOrbitCamera(deltaTime, f, targetPos)` (cpp 2515). The camera is therefore computed after the character each frame, once per frame; it is not a fixed-step loop.
- Pivot (cpp 2061): the look point is the character's position plus a height `followedPivotHeight() + mountedOffset + pivotLift`, with no x/y offset. `followedPivotHeight` scales the head bone height (or the character height) by a setting, clamped 0.2-3.0 (hpp 510-517). Default setting 1.6 (hpp 553). The pivot lift is a terrain-clearance raise, re-queried every 3 frames or when the character moves 0.5 or the distance changes 0.5 (cpp 1992-2054).
- Direction (cpp 2064): `camDir = -forward3D`, the camera sits behind the look direction; the pitch (clamped -88 to 88, cpp 3366) raises or lowers it around the pivot.
- Zoom (cpp 2067-2068): `currentDistance` eases toward `userTargetDistance` at rate 15/s (hpp 476). The wheel sets the target: step = max(target x 0.15, 0.3), clamped to [0.5, 22 x factor] (cpp 3726-3733, hpp 447-448). Indoors the target is capped at 6 (cpp 2093-2094, hpp 474).
- Wall collision (cpp 2119-2136): one raycast from the pivot along `camDir` up to `currentDistance` against WMO bounding boxes. The raw limit is the hit minus 0.32 (sphere) minus 0.22 (epsilon), floor 0.5 (cpp 2133, hpp 580-581). Doodads (M2) are not in this camera's collision; the character's own sweep uses them (not read in detail).
- Step-around (cpp 2152-2183): when the raw limit is more than 0.5 short of the current distance and also short of the wanted distance, two rays at +/-14 degrees about world Z are tried; the one that buys more than 1.0 unit wins. The yaw is eased in with tau 0.12 s and back out with tau 0.30 s.
- Terrain limit (cpp 2192-2201, 205-244): a heightfield march along `camDir`, coarse steps of about 1.25 units (4-24 steps), then 4 bisections, with clearance 0.40 (= 0.32 + 0.08, cpp 213). The result is smoothed with tau 0.18 s going in and 0.45 s coming out, then `min` with the wall limit. Skipped inside an interior WMO.
- Smoothed limit (cpp 2207-2224): pull-in tau 0.06 s, recover tau 0.40 s. While the mouse is held or a turn key is down and the raw limit is closer, it snaps to the raw limit at once (cpp 2216-2217).
- Zoom debt (cpp 2243-2267): `bite = userTarget - smoothedLimit`. If bite > 0.1, the wanted distance is pulled toward the limit by `bite x (1 - exp(-dt/1.0))` and the amount taken goes into `collisionZoomDebt_`; the clear timer resets. Otherwise the clear timer runs, and after 1.0 s clear the debt is given back at tau 2.5 s. The player's own wheel input clears the debt (cpp 3723-3724).
- Placement (cpp 2282-2290): `actualDist = min(currentDistance, collisionDistance)`; `actualCam = pivot + camDir x actualDist`. Under MIN_DISTANCE + 0.1 the camera is put at the pivot (first person, cpp 2286-2288).
- Position follow (cpp 2352-2359): `camLerp = 1` while the button is held (1:1 drag) and smooth follow is off; otherwise `1 - exp(-camSmoothSpeed x dt)`, with camSmoothSpeed 30 by default (hpp 477-478). So the camera lags the pivot by about 1/30 s when not rotating, and does not lag while dragging. A user setting `smoothCameraFollow_` (default off, hpp 482) keeps the lerp during drag.
- Floor (cpp 2363-2431): floor clearance 0.35 above terrain or WMO floor (cpp 2363, 2428-2429), and never below the pivot's feet plane plus 0.15 (cpp 2433). Then `setPosition` (cpp 2435).
- Shake (cpp 270-282, 3296-3311): `triggerShake` multiplies the magnitude by a user setting (cpp 273), then keeps the stronger of the old and new shake. Each frame the camera position gets an offset: 3 sinusoids, amplitude = magnitude x envelope, envelope 1 until 70% of the duration then falling linearly to 0 (cpp 3301-3307). This is added after the smoothed position.
- Mouse (cpp 3347-3368, 3359-3366): a drag only starts rotating after the net offset passes a click dead-zone; yaw -= xrel x 0.2 deg/px, pitch += yrel x 0.2 x (-1 unless inverted), pitch clamped -88..88 (hpp 422, 584-585).
- Facing (cpp 3034-3040): the character turns to the camera yaw only while the right button, autorun, the touch steer or swimming with input is active; otherwise movement goes along `facingYaw`, which is separate from the camera yaw. So the camera orbits without turning the character, unless one of those modes is on.

## 2. Key functions

- `CameraController::updateOrbitCamera`: `/mnt/frankendom-donors/Kelsidavis-WoWee/src/rendering/camera_controller.cpp` 1986-2440. The whole orbit: pivot, zoom, wall limit with step-around, terrain limit, zoom debt, placement, water nudge (not summarised), position follow, floor clearance. One caller (cpp 2515).
- `CameraController::updateThirdPersonCamera`: cpp 2503-2516. Moves and grounds the character first, then the orbit.
- `CameraController::update`: cpp 2715-2720 (dt split), 3159-3164 (mode switch), 3296-3324 (shake and sway after the position).
- `CameraController::processMouseMotion`: cpp 3327-3369. 1:1 yaw and pitch, dead-zone before rotation starts.
- `CameraController::processMouseWheel`: cpp 3719-3734. Zoom step, distance clamp, debt clear.
- `CameraController::raymarchTerrainCameraLimit`: cpp 205-244. The terrain march.
- `CameraController::triggerShake`: cpp 270-282. The shake trigger, stronger overrides weaker.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Wall pull-in with fast in, slow out smoothing | 0.06 s in, 0.40 s out (cpp 2219) |
| Zoom debt: collision takes zoom, given back after a clear spell | Settle 1.0 s (cpp 2260), give-back 2.5 s (cpp 2261), pull-in 1.0 s (cpp 2249) |
| Step around a blocker before pulling in | +/-14 degrees (cpp 2149), gain 1.0 (cpp 2150); ease 0.12 s / 0.30 s (cpp 2173) |
| Clearance from a sphere, not a point | Radius 0.32 + epsilon 0.22 (hpp 580-581; cpp 2133); terrain clearance 0.40 (cpp 213) |
| Terrain limit eased separately from walls | 0.18 s in, 0.45 s out (cpp 2198) |
| Exponential follow, 1:1 while dragging | Follow 30/s by default (hpp 477-478; cpp 2357-2358) |
| Zoom ease | 15/s (hpp 476, cpp 2067) |
| Distance clamp and step | Min 0.5 (hpp 447); max 22 x factor (hpp 448; cpp 3731); step 0.15 of distance, min 0.3 (cpp 3726); indoor cap 6 (hpp 474) |
| Pitch clamp | -88 to +88 degrees (hpp 584-585) |
| Shake envelope and stronger-wins rule | Fade starts at 70% of duration (cpp 3301); user scale (cpp 273) |

## 4. TypeScript sketch

simplified: the sketch keeps the wall limit, the +/-14 degree step-around, the asymmetric limit smoothing with the snap while rotating, the zoom debt, the placement and the 1:1 or 30/s follow with the floor clamp. It omits: the terrain march and its own smoothing (the caller would pass a combined limit), the pivot height and terrain lift, the first-person branch under 0.6, the interior WMO cap, the water nudge, the shake and sway, the barber and taxi branches, and the M2 doodad case. The sketch reorders nothing relative to the donor except that it writes the placement distance as `min(dist, limit)`, which is the donor's `min(currentDistance, collisionDistance)` with collisionDistance equal to the smoothed limit. `wallLimit` is assumed to return the hit minus radius and epsilon with a floor of 0.5, or `maxDist` when clear, as the donor does.

```ts
// Licence: restricted (WoWee source is "MIT with Additional Restriction": no commercial game use). Clean-room sketch of the mechanism; not a translation.
// clean-room
export {};

type Vec3 = { x: number; y: number; z: number };

export interface OrbitState {
  dist: number;          // eased distance actually in use
  want: number;          // the player's chosen distance (wheel), reduced by collision
  debt: number;          // zoom taken by collision, given back later
  clearSec: number;      // seconds with nothing in the way
  limit: number;         // collision limit, smoothed asymmetrically
  deflectDeg: number;    // current step-around angle
  cam: Vec3;             // smoothed camera position
  initialised: boolean;  // limit seeded
  camInit: boolean;      // camera seeded
}

export interface OrbitIn {
  dt: number;                                  // raw frame seconds
  pivot: Vec3;                                 // point on the character
  dir: Vec3;                                   // unit vector pivot -> camera
  rotating: boolean;                           // drag or turn key held
  wallLimit(dir: Vec3, maxDist: number): number; // static walls; maxDist when clear
  floorAt(x: number, y: number): number | null;  // ground under the camera
}

const ZOOM_TAU = 15;      // 1/s, zoom eases toward the wanted distance
const CAM_FOLLOW = 30;    // 1/s, camera position follows the pivot
const MIN_DIST = 0.5;
const FLOOR_CLEAR = 0.35;
const DEFLECT_MAX = 14 * Math.PI / 180;
const DEFLECT_GAIN = 1.0;

const rotZ = (d: Vec3, a: number): Vec3 => ({
  x: d.x * Math.cos(a) - d.y * Math.sin(a),
  y: d.x * Math.sin(a) + d.y * Math.cos(a),
  z: d.z,
});
const norm = (d: Vec3): Vec3 => {
  const l = Math.hypot(d.x, d.y, d.z);
  return { x: d.x / l, y: d.y / l, z: d.z / l };
};
const ease = (dt: number, tau: number) => 1 - Math.exp(-dt / tau);

export function stepOrbit(s: OrbitState, i: OrbitIn): Vec3 {
  // 1. zoom eases toward what the player wants
  s.dist += (s.want - s.dist) * ease(i.dt, 1 / ZOOM_TAU);

  // 2. collision: raw wall limit, then a yaw step-around when blocked
  let dir = i.dir;
  let raw = i.wallLimit(dir, s.dist);
  let deflectTarget = 0;
  if (raw < s.dist - 0.5 && raw < s.want) {
    let best = raw;
    for (const a of [DEFLECT_MAX, -DEFLECT_MAX]) {
      const t = i.wallLimit(norm(rotZ(i.dir, a)), s.dist);
      if (t > best + DEFLECT_GAIN) { best = t; deflectTarget = a; }
    }
    raw = best;
  }
  // ease into and out of the step-around
  s.deflectDeg += (deflectTarget - s.deflectDeg) * ease(i.dt, deflectTarget !== 0 ? 0.12 : 0.30);
  if (Math.abs(s.deflectDeg) > 0.0009) dir = norm(rotZ(i.dir, s.deflectDeg));

  // 3. asymmetric smoothing of the limit: snap in while rotating, fast in, slow out
  if (!s.initialised) { s.limit = raw; s.initialised = true; }
  if (raw < s.limit && i.rotating) {
    s.limit = raw;
  } else {
    s.limit += (raw - s.limit) * ease(i.dt, raw < s.limit ? 0.06 : 0.40);
  }

  // 4. collision takes the zoom in with it, and gives it back after a clear spell
  const bite = s.want - s.limit;
  if (bite > 0.1) {
    s.clearSec = 0;
    const pulled = Math.max(s.want - bite * ease(i.dt, 1.0), MIN_DIST);
    s.debt += s.want - pulled;
    s.want = pulled;
  } else {
    s.clearSec += i.dt;
    if (s.clearSec > 1.0 && s.debt > 0.001) {
      const give = s.debt * ease(i.dt, 2.5);
      s.want += give;
      s.debt -= give;
    }
  }

  // 5. place the camera at the nearer of distance and limit
  const actual = Math.min(s.dist, s.limit);
  const target: Vec3 = {
    x: i.pivot.x + dir.x * actual,
    y: i.pivot.y + dir.y * actual,
    z: i.pivot.z + dir.z * actual,
  };

  // 6. position follows: 1:1 while rotating, otherwise exponential at 30/s
  if (!s.camInit) { s.cam = target; s.camInit = true; }
  const k = i.rotating ? 1 : ease(i.dt, 1 / CAM_FOLLOW);
  s.cam = {
    x: s.cam.x + (target.x - s.cam.x) * k,
    y: s.cam.y + (target.y - s.cam.y) * k,
    z: s.cam.z + (target.z - s.cam.z) * k,
  };

  // 7. never under the ground, never below the feet plane
  const g = i.floorAt(s.cam.x, s.cam.y);
  if (g !== null && s.cam.z < g + FLOOR_CLEAR) s.cam.z = g + FLOOR_CLEAR;
  s.cam.z = Math.max(s.cam.z, i.pivot.z + 0.15);
  return s.cam;
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/qc017_wowee_orbit.ts): exit 0.

## 5. Lands in

- TARGET `src/fight/camera.ts` (new client module, the fight/world camera; the engine never reads it). Parity-checklist row 11 (fight camera). The owner's world camera has no row of its own; this is the closest row, and the note says so.
- Reuse tag: rewrite-from-idea (MIT with commercial-game restriction; clean-room, shape only, no code)
- Brief rule served: 1 (one engine: the camera is a client that reads the engine's state and never writes to it); rules 7-9 n/a

## 6. Gaps and risks

- Licence: MIT with a restriction against commercial game use. Frankendom is a game product, so this is clean-room shape only. The sketch is written from the described mechanism.
- Centred pivot: the donor has no lateral offset (cpp 2061). The owner's over-the-shoulder view needs an offset added to the pivot, and the wall logic must then be checked from the offset point, not the centre. This donor does not show that case.
- No lock-on, no multi-target framing, no combat FOV change in the camera files read (grep for lock-on, shoulder and FOV found none in `camera_controller.cpp`; `setFov` callers are the renderer and settings only). Frankendom's MAX_ATTACKERS = 3 many-on-one framing has nothing to copy here.
- Collision is against WMO bounding boxes and the terrain heightfield only. M2 doodads are not part of the camera's wall test (cpp 2119-2201). A rock or tree in a zone would not push the camera in; this is a gap if zones use doodads.
- The camera uses the raw frame `deltaTime` (cpp 3161), not the 1/30 s clamp used by physics. The exponential maths is frame-rate independent, but a long hitch becomes one large step (alpha near 1). Clamp the dt for the camera too, to match physics.
- Camera values are client settings or client constants, not zone data. Mouse sensitivity, camera stiffness and max distance factor are user settings; the rest are constants of the class. None belong in the zone data, and none are authoritative (the engine never reads the camera).
- Duplication: the wall-sweep is written three times in the donor (walking, swimming, free-fly); this camera's logic is in one function, which is the shape to keep.
- Not read: the first-person branch details (cpp 2286-2288 only read as one line), `moveFollowedCharacter`, `groundFollowedCharacter`, the taxi branch in full.
