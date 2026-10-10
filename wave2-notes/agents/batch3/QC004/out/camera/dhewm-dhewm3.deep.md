# dhewm-dhewm3 (camera, cell 14)

Donor: `/mnt/frankendom-donors/dhewm-dhewm3/neo/game/Player.cpp` | Licence: GPL-3.0-or-later (as read: Player.cpp header, "Doom 3 GPL Source Code ... version 3 of the License, or (at your option) any later version"; root COPYING.txt is GPL version 3) | C++ | symbol `idPlayer::OffsetThirdPersonView` | camera_scope: world camera

Checked: camera_scope = world camera (a third-person follow camera behind the player in the game world). The list's hint file `framework/Common.cpp` is not the game camera: its only camera hit is a tool-editor comment at line 2557. The real code is `idPlayer::OffsetThirdPersonView` (Player.cpp 7166-7233, read in full), called from `idPlayer::CalculateRenderView` (7327-7380, read from the start of the function to the end of the camera-select block at 7380; the rest of that function was not read). `idPlayer::Think` (6209) was read only at the two calls (6341, 6344); its caller was not read. The expansion copy `neo/d3xp/Player.cpp` has a body identical to `neo/game/Player.cpp` for `OffsetThirdPersonView` (diff check). Cvars read at `game/gamesys/SysCvar.cpp` 265-269. Confidence: high on the mechanism (every line of the function read); medium on the "centred on screen" point in section 1, which is my derivation from the signs in the code and was not run.

## 1. Mechanism

- `idPlayer::Think` calls `CalculateFirstPersonView` (6341) and then `CalculateRenderView` (6344). The caller of `Think` (which runs it once per tic, the tic rate being 60 per second, `UsercmdGen.h` 40) was not read. `CalculateRenderView` chooses the view: a camera entity or private camera wins (7351-7357); else, if `g_stopTime`, the first-person origin is used (7359-7367); else if `pm_thirdPerson` is set, it calls `OffsetThirdPersonView(pm_thirdPersonAngle, pm_thirdPersonRange, pm_thirdPersonHeight, pm_thirdPersonClip)` (7368-7369); else if `pm_thirdPersonDeath` is set (dead), it calls `OffsetThirdPersonView(0, 20 + range, 0, false)` with a pull-back that grows to 120 (7370-7372); else first person (7373-7379).
- `OffsetThirdPersonView` order of operations, all from the current frame (no state is kept between calls; the function writes only `renderView` and its locals):
  (a) Start from `viewAngles` and the eye origin from `GetViewPos` (7181-7182). `GetViewPos` adds eye position, view bob, and the nodal offsets (7268-7275).
  (b) If `angle` is non-zero, pitch is set to 0 (7184-7186). Pitch is clamped to 45 (7188-7190) so the camera does not look too far overhead.
  (c) Aim point: `focusPoint = origin + forward(angles) * 512`, raised by `height` (7192-7193). This uses the clamped, unhalved pitch.
  (d) Camera spot: start at the origin raised by `8 + height` (7194-7195). Then push it back along the forward axis by `range * cos(angle)` and sideways along the left axis by `range * sin(angle)` (7197-7202). The offset axis uses half the pitch (7197), so the camera moves along a flatter direction when the player looks down. `angle` is therefore an orbit around the player: 0 is directly behind.
  (e) Clip, only if `clip` is on (7204-7218): a box trace (8 x 8 x 8, MASK_SOLID, ignoring the player) from the origin to the spot. On a hit, the spot becomes the hit point, raised by `(1 - fraction) * 32` (7210-7211). A second trace from the origin to that raised spot runs, and the spot becomes its end point (7215-7216), so a low ceiling does not keep the camera inside.
  (f) Aim: vector from the spot to the focus point; horizontal distance floored at 1 (7221-7224); camera pitch = -atan2(dz, horizontal distance) (7227); camera yaw = viewAngles.yaw - angle (7228). The result is written to `renderView->vieworg` and the view axis (7230-7231).
- Derived (not run): with the orbit sign in step (d) and the yaw turn in step (f), the camera's horizontal look direction is the player's direction from the camera, so the player stays centred horizontally when `angle` is non-zero. The vertical framing comes from the focus point and is not exact.
- No smoothing: the function computes the spot and aim from the current origin and angles each call. Nothing is interpolated or damped in the lines read. Whether the renderer interpolates between tics was not read.
- Input: the camera uses the player's look angles (`viewAngles`) directly. There is no separate camera input, drag or free-look in these lines.

## 2. Key functions

- `idPlayer::OffsetThirdPersonView`: `/mnt/frankendom-donors/dhewm-dhewm3/neo/game/Player.cpp` 7169-7233. Orbit and focus 7181-7202; clip 7204-7218; aim and output 7221-7231.
- `idPlayer::CalculateRenderView`: same file, 7327-7380 (camera selection at 7351-7379; third-person call at 7368-7369; death pull-back at 7370-7372).
- `idPlayer::Think`: same file, 6209; calls at 6341 and 6344.
- Constants: `THIRD_PERSON_FOCUS_DISTANCE = 512.0f`, `/mnt/frankendom-donors/dhewm-dhewm3/neo/game/Player.h` 61.
- Cvars (CVAR_NETWORKSYNC): `/mnt/frankendom-donors/dhewm-dhewm3/neo/game/gamesys/SysCvar.cpp` 265-268 (range 80, height 0, angle 0, clip 1).
- Tick: `USERCMD_HZ = 60`, `/mnt/frankendom-donors/dhewm-dhewm3/neo/framework/UsercmdGen.h` 40.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Orbit camera: spot = origin + back x cos(a) + side x sin(a) at fixed radius | Radius `pm_thirdPersonRange` 80 units (theirs, SysCvar.cpp 265); orbit angle default 0 (theirs, 267) |
| Height offset on the spot and on the aim point | `pm_thirdPersonHeight` 0 (theirs, 266); eye lift 8 units (theirs, Player.cpp 7195) |
| Aim point ahead of the player, pitch from camera to it | Focus distance 512 units (theirs, Player.h 61) |
| Pitch clamp for looking down | 45 degrees (theirs, Player.cpp 7189); offset axis uses half pitch (theirs, 7197) |
| Sweep-and-pull-in against walls, with a lift on hit | Probe box half size 4 units (theirs, 7207); lift 32 units x (1 - fraction) (theirs, 7211); a second sweep (7215) |
| Aim pitch floor on horizontal distance | Floor 1 unit (theirs, 7224) |
| Clip on/off | `pm_thirdPersonClip` default 1 (theirs, SysCvar.cpp 268) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: pitch rules for orbiting and the clamp, the aim point, the spot with the half-pitch offset axis, the clip sweep with lift and second sweep, then the aim and yaw turn. It assumes z is up, so it drops the donor's gravity axis (`physicsObj.GetGravityAxis`), takes the eye origin as an input (so it drops view bob, kick and the nodal offsets), and does not model the death pull-back (7370-7372), the `g_stopTime` and camera-entity branches, the `viewID` flags, or the donor's `renderView` writes. The sweep is a callback, not the engine's trace.

```ts
// Licence: GPL-3.0-or-later (donor header). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface V3 { x: number; y: number; z: number; }
interface Sweep { fraction: number; endpos: V3; }
// Sweep a small box from `from` to `to` against solid world geometry. fraction 1 = nothing hit.
type SweepFn = (from: V3, to: V3, halfSize: number) => Sweep;

interface ThirdPersonParams {
  range: number;      // camera distance behind the player (units)
  height: number;     // camera height offset (units)
  angleDeg: number;   // orbit angle: 0 = directly behind, 180 = in front
  clip: boolean;      // pull the camera in when a wall is between it and the player
}

const FOCUS_DISTANCE = 512;  // aim point this far ahead of the player
const PITCH_MAX_DEG = 45;    // do not look too far over the head
const CLIP_HALF_SIZE = 4;    // 8 x 8 x 8 probe box
const CLIP_LIFT = 32;        // units of lift when the camera was pulled in

const rad = (deg: number): number => (deg * Math.PI) / 180;
const deg = (r: number): number => (r * 180) / Math.PI;

// Forward and left unit vectors (z up). Pitch is positive looking down, as in the donor.
function forwardOf(yawDeg: number, pitchDeg: number): V3 {
  const y = rad(yawDeg), p = rad(pitchDeg);
  return { x: Math.cos(p) * Math.cos(y), y: Math.cos(p) * Math.sin(y), z: -Math.sin(p) };
}
function leftOf(yawDeg: number): V3 {
  const y = rad(yawDeg);
  return { x: -Math.sin(y), y: Math.cos(y), z: 0 };
}

function thirdPersonView(origin: V3, yawDeg: number, pitchDeg: number, p: ThirdPersonParams, sweep: SweepFn) {
  // Orbit: pitch is ignored while orbiting. Pitch is clamped to look-down limit.
  let pitch = p.angleDeg !== 0 ? 0 : pitchDeg;
  if (pitch > PITCH_MAX_DEG) pitch = PITCH_MAX_DEG;

  // Aim point ahead of the player, raised by the height offset.
  const f = forwardOf(yawDeg, pitch);
  const focus: V3 = { x: origin.x + f.x * FOCUS_DISTANCE, y: origin.y + f.y * FOCUS_DISTANCE, z: origin.z + f.z * FOCUS_DISTANCE + p.height };

  // Desired camera spot: behind and beside the player on a circle of radius `range`.
  // The offset axis uses half the pitch, so the camera does not drop far when looking down.
  let view: V3 = { x: origin.x, y: origin.y, z: origin.z + 8 + p.height };
  const fo = forwardOf(yawDeg, pitch * 0.5);
  const le = leftOf(yawDeg);
  const a = rad(p.angleDeg);
  view = { x: view.x - p.range * Math.cos(a) * fo.x + p.range * Math.sin(a) * le.x,
           y: view.y - p.range * Math.cos(a) * fo.y + p.range * Math.sin(a) * le.y,
           z: view.z - p.range * Math.cos(a) * fo.z + p.range * Math.sin(a) * le.z };

  // Clip: sweep from the player to the spot. On a hit, stop at the hit point, lift by how deep it was,
  // then sweep again from the player so a low ceiling or tunnel does not keep the camera inside.
  if (p.clip) {
    let hit = sweep(origin, view, CLIP_HALF_SIZE);
    if (hit.fraction !== 1) {
      view = { x: hit.endpos.x, y: hit.endpos.y, z: hit.endpos.z + (1 - hit.fraction) * CLIP_LIFT };
      hit = sweep(origin, view, CLIP_HALF_SIZE);
      view = hit.endpos;
    }
  }

  // Aim: pitch from the camera to the focus point (horizontal distance floored at 1), yaw turned back by the orbit angle.
  const dx = focus.x - view.x, dy = focus.y - view.y, dz = focus.z - view.z;
  const focusDist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
  return { vieworg: view, yawDeg: yawDeg - p.angleDeg, pitchDeg: -deg(Math.atan2(dz, focusDist)) };
}
```

## 5. Lands in

- TARGET `origins/client/world-camera.ts` (proposed new client file; the Frankendom repo was not checked for an existing camera module). The camera is client-only (ruling); the server never reads it.
- Parity row 11 (fight camera). Row 11 is the fight camera; there is no checklist row for the world camera (see section 6).
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: camera is client-only; zones as data (range, height and clip are per-zone settings, not constants in the function)


Best transferable idea: Place a third-person camera on a circle behind the player, sweep from the player to that spot so the camera is pulled in to the wall with a small lift, and aim at a point ahead of the player.


Decision (proposed): adapt - take the orbit spot, the wall pull-in with lift, the look-down clamp and the aim point. Change it by adding frame-rate-independent smoothing (the donor has none) and by using Frankendom's own up axis instead of the donor's gravity axis.


Acceptance: With a wall 20 units behind the hero and the camera set 40 units behind, a client unit test with a stub sweep that returns fraction 0.5 asserts that the spot is the hit point raised by 16 units (0.5 x 32), that it is swept again from the hero, and that the aim points at the focus point 512 units ahead.

## 6. Gaps and risks

- No smoothing: the donor's camera is recomputed from the current origin and angles each call with no damping. A third-person camera needs a frame-rate-independent lag on top; none is in the donor.
- Sweep and geometry: the clip depends on a box sweep against the world's solid collision (MASK_SOLID). Frankendom's zones are data, so the sweep needs the zone's collision geometry on the client. How `TraceBounds` behaves when the start point is already inside solid was not read.
- The one-sided pull-in only handles the case where the spot is behind a wall. It does not push the camera out if the player's own origin is inside geometry (not read).
- Settings are CVAR_NETWORKSYNC in the donor, so camera settings are shared over the network. Frankendom's camera is client-only (ruling), so range, height and clip should be client settings or zone data, never server state.
- Up axis: the donor uses the physics gravity axis (7198, 7231). Frankendom must supply its own up axis; the sketch assumes z up.
- Death pull-back (7370-7372) is a separate effect that grows the range toward 120; it is not in the sketch.
- Parity: row 11 is the fight camera. The world camera has no checklist row, so Lead should add one before this lands. Same flag as the Card-Forge note.
- Licence GPL-3.0-or-later: clean-room, shape only. The sketch is written from the described mechanism.
