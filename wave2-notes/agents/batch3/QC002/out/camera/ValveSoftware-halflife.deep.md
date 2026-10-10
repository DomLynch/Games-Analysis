# ValveSoftware-halflife (camera, cell 14)

Donor: `/mnt/frankendom-donors/ValveSoftware-halflife/cl_dll/in_camera.cpp` | Licence: as read: Half Life 1 SDK LICENSE (Valve Corp.: free use to develop a modified Valve game; distribution only for free; restricted class, so clean-room, shape only) | C++ | symbol `CAM_Think` (with `MoveToward`; consumer `V_CalcNormalRefdef` in `cl_dll/view.cpp`)

Checked: camera scope is world camera (third-person follow in single-player levels; the code refuses it in multiplayer, in_camera.cpp:437-441, so it is not a pit camera). Opened and read: cl_dll/in_camera.cpp (whole file, 631 lines: constants 28-37, MoveToward 98-134, CAM_Think 153-414, CAM_ToThirdPerson 432-456, CAM_Init 470-505, CAM_ClearStates 507-534, mouse-move starts 536-608, CL_CameraOffset 626-631), cl_dll/view.cpp (V_CalcNormalRefdef 487-815 at the parts that matter: bob and origin 518-528, third-person offset 617-635, view-angle swap 791-809; V_Move 1756-1800), cl_dll/hud_update.cpp (25-42), cl_dll/camera.h (whole, 24 lines), cl_dll/cdll_int.cpp (grep), cl_dll/inputw32.cpp (grep), cl_dll/hud.cpp (706-709). Candidate files opened: cl_dll/camera.h (the list hint; a header only, it declares cam_ofs and the entry points, the mechanism is in in_camera.cpp), cl_dll/in_camera.cpp, cl_dll/view.cpp, cl_dll/hud_update.cpp; the dmc and ricochet folders carry copies of the same files (not compared). Callers: `CAM_Think` is exported at cdll_int.cpp:376; the engine calls it, but the call frequency is not read (engine not in this donor). `CL_CameraOffset` is called by view.cpp:624. `V_Move` is called by inputw32.cpp:623. Confidence: high for what the camera code computes and in what order (read end to end); high that its collision branch is not compiled (`LATER` is not defined in cl_dll, common or engine, by grep); moderate on how the engine drives the frame (not read). Not read: `V_CalcShake` and `V_ApplyShake` internals (called at view.cpp:527-528), `V_CalcBob`, `AngleVectors`, the engine's projection from `in_fov`, the aim path that uses cl_viewangles, `gHUD.GetSensitivity` source (hud.cpp:706-709 returns m_flMouseSensitivity; its set-side not read), `abs()` overload in MoveToward (in_camera.cpp:102, not verified).
Best transferable idea: Keep the camera as data (ideal yaw, pitch and distance per zone) that player input writes and a per-frame ease chases toward ideal plus the character's facing, with a yaw clamp that keeps the camera out of the character's front, and a zoom-in reset to directly behind.
Decision (proposed): adapt - it is the only real third-person mechanism in this donor set and its ideal-plus-ease split with a rear-half clamp is what the world camera lacks; but it orbits to look at the character rather than framing over the shoulder, has no wall pull-in (its collision code is compiled out), and steps per frame, so Frankendom must add a shoulder offset, a real pull-in and dt-based easing before adopting it.
Acceptance: In a zone with the default preset, a 90-degree turn of the character is trailed by the camera and settled to within 1 degree in under half a second, and releasing the look key leaves the camera where the player left it (client test).

## 1. Mechanism

- A third-person orbit camera. Three pieces of state persist between frames: the ideal offset (`cam_idealyaw`, `cam_idealpitch`, `cam_idealdist`, written by the player's input), the eased offset (`cam_ofs`, what the renderer reads), and the mode flag (`cam_thirdperson`). The offset yaw and pitch are relative to the character's view; the eased values are stored as absolute angles (ideal plus view).
- Order of steps inside one call of `CAM_Think` (in_camera.cpp:153). The engine calls it once per client frame (export at cdll_int.cpp:376; the frequency is not read), so every step below is per call, not per second.
  (a) Mode commands (168-181). `thirdperson` is refused when more than one client is connected (437-441; a debug build skips the check). Entering third person sets the eased offset yaw and pitch to the view angles and the eased distance to 30 (450-452), so the camera starts behind the character and eases out to the ideal.
  (b) If not in third person, return (183-184).
  (c) Load the ideal into working angles and distance (194-196). Defaults are yaw 90, pitch 0, distance 64 (494-496).
  (d) Mouse move, only while `+cammousemove` or `+camdistance` is held (`cam_mousemove`, set at 541-547). Yaw changes by 0.25 degrees per pixel of cursor offset from the window centre per call, when the cursor is right of centre (216), with the yaw capped at `c_maxyaw` 135 (214-222); left is the mirror with `c_minyaw` -135 (227-236). Pitch works the same way between `c_minpitch` 0 and `c_maxpitch` 90 (244-262). The code asks for a re-centre after each move (278), but `SDL_SetCursorPos` is an empty stub in this file (92-94), so nothing is reset: a held offset keeps turning the camera every call.
  (e) Keys (283-306). Pitch up and down, and yaw left and right, each change by 2.5 degrees per call while held, with no clamp (284, 289). Zoom in reduces distance by 1 per call; if the distance drops under 30, pitch and yaw are set to 0 (directly behind) and distance to 30 (295-301). Zoom out adds 1 per call (306).
  (f) Store the ideal back from the working angles (362-364); the collision check that would refuse a blocked ideal (338-359, 391-410) is inside `#ifdef LATER` and is not compiled.
  (g) Ease toward ideal plus view. Copy the eased state into the working angles (368). Yaw and pitch targets are `ideal + view` (381, 384; a snap-to branch at 372-377 jumps straight there). `MoveToward` (98-134) does this per call: if the gap is over 180 degrees it first adds or subtracts 360 (the short way round); if the gap is over 1 degree it moves a quarter of the gap, otherwise it snaps; the result is wrapped to 0-360. Distance eases the same way with a snap window of 2 units (386-389).
  (h) Store the eased offset (411-413). `CL_CameraOffset` returns it to the renderer (626-630).
- Renderer side (`V_CalcNormalRefdef`, view.cpp). The eye point is simorg plus bob plus view height (521-523); view angles are the client's view (525); the engine shake is applied to the eye and the view angles (527-528). Then, for third person, the eye moves back by the eased distance along the eased offset direction (617-635): `vieworg += -ofs[2] * forward(ofs)`. The rendered view angles are replaced by the offset angles (791-793), and the character's model pitch is set to the offset pitch divided by -3 (803-809).
- Result: the camera sits `dist` away from the eye point, in the direction of the offset, and looks back along the offset at that point. With the default yaw 90 the camera is 90 degrees off the character's facing: it is at the side and the character is centred in frame. A yaw offset of 0 puts it directly behind.

## 2. Key functions

- `CAM_Think`: `/mnt/frankendom-donors/ValveSoftware-halflife/cl_dll/in_camera.cpp` 153-414 (mode commands, mouse, keys, zoom, ideal write-back, eased copy, store).
- `MoveToward`: `/mnt/frankendom-donors/ValveSoftware-halflife/cl_dll/in_camera.cpp` 98-134 (360 wrap, quarter-gap ease, one-degree snap, 0-360 wrap).
- `CAM_ToThirdPerson` and `CAM_ClearStates`: `/mnt/frankendom-donors/ValveSoftware-halflife/cl_dll/in_camera.cpp` 432-456 and 507-534 (single-player gate; entry from view; reset on exit).
- `CL_CameraOffset`: `/mnt/frankendom-donors/ValveSoftware-halflife/cl_dll/in_camera.cpp` 626-631 (hands the eased offset to the renderer).
- Consumer, `V_CalcNormalRefdef`: `/mnt/frankendom-donors/ValveSoftware-halflife/cl_dll/view.cpp` 518-528 (bob, eye, shake), 617-635 (third-person offset of the eye), 791-809 (view-angle swap and model pitch).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Ideal offset written by input, eased copy chases ideal plus facing | Ideal yaw 90, pitch 0, distance 64 (in_camera.cpp:494-496); ease is a quarter of the gap per call (113, 120, 389) |
| Shortest-way angle ease with a snap window | Snap within 1 degree (112, 119); wrap by 360 when the gap is over 180 (102-108) |
| Distance ease with its own snap window | Snap within 2 units (386); distance range 30 minimum (31, 504) to 200 maximum (503) |
| Orbit clamp that keeps the camera out of the character's front | Mouse yaw clamped to +/-135 (36-37, 501-502); keys not clamped (288-291) |
| Pitch range for the mouse | 0 to 90 (34-35, 499-500); keys not clamped (283-286) |
| Keyboard turn of the orbit | 2.5 degrees per call (29, 284, 289) |
| Keyboard zoom | 1.0 units per call (28, 295, 306) |
| Mouse orbit gain | 0.5 times (offset / 2), i.e. 0.25 degrees per pixel per call (32, 216) |
| Zoom-in reset | Under 30 units: pitch 0, yaw 0, distance 30 (297-301) |
| Derived at 60 calls per second | Keyboard orbit 150 degrees per second; quarter ease reaches a 90 degree gap within 1 degree in about 16 calls (about 0.27 s) |

## 4. TypeScript sketch

simplified: the sketch converts every per-call step to dt, assuming 60 calls per second (`1 - 0.75^(60 dt)` replaces the quarter ease; key and mouse steps are multiplied by `60 dt`). It applies keys before the mouse, while the donor applies the mouse first (in_camera.cpp:200-280 before 283-306). Its zoom reset sets the ideal directly, where the donor sets the working angles that are then written back in the same call (298-301, 362-364); the result is the same. It keeps the donor's unclamped keys and the mouse-only clamp. It omits the multiplayer gate, the snap-to branch, the `cam_contain` branch (compiled out), the distance-only mouse path, the roll zeroing, the model pitch scaling, the engine shake and bob, the view-angle swap, and the cvar plumbing. The Quake forward convention is assumed (AngleVectors not read). The eased pitch is not clamped, as in the donor.

```ts
// Licence: Half Life 1 SDK LICENSE (Valve). Restricted: clean-room, shape only. Written from the described mechanism, not a translation.
// Client-only camera. Nothing here touches health, hits, spawns or server state.
// Donor runs its eases once per client tick; this sketch converts them to dt, assuming 60 ticks per second.
type Angles = { yaw: number; pitch: number };
type Vec3 = { x: number; y: number; z: number };

const TICKS_PER_SEC = 60;
const EASE_PER_TICK = 0.25;      // donor divides the gap by 4 each tick
const ANGLE_SNAP_DEG = 1.0;      // donor snaps when within one degree
const DIST_SNAP = 2.0;           // donor snaps the distance when within 2 units
const MIN_DIST = 30;             // CAM_MIN_DIST
const YAW_LIMIT_MOUSE = 135;     // clamp for mouse orbit only (keys are not clamped in the donor)
const PITCH_MIN = 0;
const PITCH_MAX = 90;
const KEY_YAW_PER_TICK = 2.5;    // degrees per tick while held
const KEY_DIST_PER_TICK = 1.0;   // units per tick while held
const MOUSE_YAW_PER_PX_TICK = 0.25; // donor: 0.5 * (offset / 2) per tick

interface Preset {
  idealYaw: number;      // offset from the player's view yaw; default 90 (zone data)
  idealPitch: number;    // offset from the view pitch; default 0 (zone data)
  idealDist: number;     // default 64 (zone data)
}

interface CamState {
  ofsYaw: number;        // eased yaw offset, absolute (ideal + view), wrapped to [0, 360)
  ofsPitch: number;
  ofsDist: number;
}

const wrap360 = (a: number): number => ((a % 360) + 360) % 360;

// Shortest signed difference between two angles, in (-180, 180].
function angleGap(cur: number, goal: number): number {
  let d = wrap360(goal - cur);
  if (d > 180) d -= 360;
  return d;
}

// Frame-rate aware ease: the donor's per-tick quarter step becomes 1 - 0.75^(ticks elapsed).
function easeAngle(cur: number, goal: number, dtSec: number): number {
  const gap = angleGap(cur, goal);
  if (Math.abs(gap) <= ANGLE_SNAP_DEG) return wrap360(goal);
  const k = 1 - Math.pow(1 - EASE_PER_TICK, dtSec * TICKS_PER_SEC);
  return wrap360(cur + gap * k);
}

function easeDist(cur: number, goal: number, dtSec: number): number {
  const gap = goal - cur;
  if (Math.abs(gap) < DIST_SNAP) return goal;
  const k = 1 - Math.pow(1 - EASE_PER_TICK, dtSec * TICKS_PER_SEC);
  return cur + gap * k;
}

// Player input writes the ideal (it persists after release). Keys and mouse are one path.
function applyManualInput(
  p: Preset,
  keys: { yawLeft: boolean; yawRight: boolean; pitchUp: boolean; pitchDown: boolean; zoomIn: boolean; zoomOut: boolean },
  mouse: { held: boolean; dxFromCentre: number; dyFromCentre: number },
  dtSec: number,
): void {
  const ticks = dtSec * TICKS_PER_SEC;
  if (keys.pitchUp) p.idealPitch += KEY_YAW_PER_TICK * ticks;        // donor: no pitch clamp on keys
  else if (keys.pitchDown) p.idealPitch -= KEY_YAW_PER_TICK * ticks;
  if (keys.yawLeft) p.idealYaw -= KEY_YAW_PER_TICK * ticks;          // donor: no yaw clamp on keys
  else if (keys.yawRight) p.idealYaw += KEY_YAW_PER_TICK * ticks;

  if (mouse.held) {
    p.idealYaw = Math.min(Math.max(p.idealYaw + MOUSE_YAW_PER_PX_TICK * mouse.dxFromCentre * ticks, -YAW_LIMIT_MOUSE), YAW_LIMIT_MOUSE);
    p.idealPitch = Math.min(Math.max(p.idealPitch + MOUSE_YAW_PER_PX_TICK * mouse.dyFromCentre * ticks, PITCH_MIN), PITCH_MAX);
  }
}

// Zoom keys move the ideal distance. Zooming in past the minimum resets the offset to directly behind.
function applyZoom(p: Preset, keys: { zoomIn: boolean; zoomOut: boolean }, dtSec: number): void {
  const ticks = dtSec * TICKS_PER_SEC;
  if (keys.zoomIn) {
    p.idealDist -= KEY_DIST_PER_TICK * ticks;
    if (p.idealDist < MIN_DIST) {
      p.idealPitch = 0;
      p.idealYaw = 0;
      p.idealDist = MIN_DIST;
    }
  } else if (keys.zoomOut) {
    p.idealDist += KEY_DIST_PER_TICK * ticks;
  }
}

// One frame: ease the eased offset toward ideal + view, then place the camera behind the eye point.
function tickThirdPerson(
  p: Preset,
  st: CamState,
  view: Angles,              // player's aim angles (not changed by the camera)
  eye: Vec3,                 // eye point, after this frame's physics and any shake
  dtSec: number,
): { camPos: Vec3; look: Angles } {
  st.ofsYaw = easeAngle(st.ofsYaw, p.idealYaw + view.yaw, dtSec);
  st.ofsPitch = easeAngle(st.ofsPitch, p.idealPitch + view.pitch, dtSec);   // no clamp here, as in the donor
  st.ofsDist = easeDist(st.ofsDist, p.idealDist, dtSec);

  // Quake-style forward for the offset angles (pitch positive looks down); AngleVectors not read in the donor.
  const yr = (st.ofsYaw * Math.PI) / 180;
  const pr = (st.ofsPitch * Math.PI) / 180;
  const fwd: Vec3 = { x: Math.cos(yr) * Math.cos(pr), y: Math.sin(yr) * Math.cos(pr), z: -Math.sin(pr) };
  const camPos: Vec3 = { x: eye.x - st.ofsDist * fwd.x, y: eye.y - st.ofsDist * fwd.y, z: eye.z - st.ofsDist * fwd.z };
  return { camPos, look: { yaw: st.ofsYaw, pitch: st.ofsPitch } }; // camera looks back along the offset, at the eye point
}
```

## 5. Lands in

- TARGET `src/fight/camera.ts` (proposed client-only world camera module; the camera never enters the engine). The Frankendom repo was not read, so whether the file exists is not verified.
- Parity-checklist row 11 (fight camera). Not a server-tick row: the camera reads the character and never sends or receives server state.
- Reuse tag: rewrite-from-idea (Valve SDK licence, restricted: clean-room, shape only; the sketch is written from the described mechanism)
- Brief rule served: 1 (one engine: the camera only reads the character; it never changes outcomes). Rules 7-9 n/a: client-only.

## 6. Gaps and risks

- It orbits and looks at the character; it does not frame over the shoulder. The camera is placed on the offset circle and aimed back at the eye point (view.cpp:625-633 and 791-793), so the character is always centred. A true over-the-shoulder rig (translate sideways from the character, then look along the view) is not in this code. Setting the ideal yaw to a small value gives a rear-quarter orbit, not a shoulder.
- No wall protection. The only collision idea is the `cam_contain` branch (186-192, 338-359, 391-410), which is inside `#ifdef LATER`; LATER is not defined in cl_dll, common or engine, so the shipped camera passes through walls. The compiled-out rule refuses a blocked move and keeps the last clear ideal (350-355); it does not pull the camera in. Frankendom needs a real pull-in (a ray from the eye toward the camera, then closer when blocked), which this donor does not provide.
- Frame-count based. Every ease and step is per call (`CAM_Think` at in_camera.cpp:153), so a camera at 30 frames per second turns and eases at half the speed of one at 60. Frankendom must step by dt (the sketch does).
- Orbit clamp only on the mouse. Keys can orbit the camera through any angle (288-291); the mouse stops at +/-135 (214-234). Frankendom should pick one rule; the sketch mirrors the donor so the difference stays visible.
- Held mouse keeps turning. Because the cursor is never re-centred here (stub at 92-94), a held offset turns the camera every call. A real build must re-centre or use relative mouse motion.
- Recentring is not automatic. The ideal stays where the player left it. The only resets are the zoom-in reset (297-301) and the toggle (450-452). The owner's recentre-behind rule needs an explicit trigger in Frankendom.
- Aim versus camera. The rendered view angles are replaced by the offset angles (793), and the character's model pitch is slaved to them (803-809). How firing and aim use `cl_viewangles` was not read; Frankendom must keep the attack ray on the character's aim, not on the orbit.
- No lock-on, no framing for several enemies, no combat FOV, no zoom pulse. The only FOV value in this camera code is server-supplied: `in_fov = cdata->fov` (hud_update.cpp:40). It feeds `CalcFov` only in `V_Move` (view.cpp:1769-1781), a mouse-to-ray pick, so the projection FOV is in the engine (not read).
- Shake is available. The engine shake is applied to the eye and view angles before the offset (view.cpp:527-528), so an orbit rides a shake. Its amount and its internals were not read.
- Unused code, for the record: `cam_old_mouse_x` and `cam_old_mouse_y` are assigned but never read in this file (12 assignments; in_camera.cpp:72 declares them); `MoveToward` ignores its `maxspeed` argument (98), so `CAM_ANGLE_SPEED` does nothing (30, 381, 384); `MAX_ANGLE_DIFF` and `PITCH_MIN` are defined and unused (33, 35).
- Third person is refused with more than one client (437-441), and the `#ifdef LATER` blocks never compile; treat it as a reference for the shape, not as a tested shipped rule.

Reuse tag: rewrite-from-idea (Valve SDK licence: clean-room, shape only)
Brief rule served: 1 (one engine; camera is client-only and never changes outcomes)
