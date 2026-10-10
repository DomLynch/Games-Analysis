# Sziadan-open-midgard (camera, cell 14)

Donor: `/mnt/frankendom-donors/Sziadan-open-midgard/src/gamemode/View.cpp` (class `CView`, `CView::InterpolateViewInfo`, `CView::BuildViewMatrix`) | Licence: GPL-3.0 (LICENSE line 1 "GNU GENERAL PUBLIC LICENSE", line 2 "Version 3, 29 June 2007"; clean-room, shape only) | C++ | class `CView`

Checked: camera_scope world camera. Read: `gamemode/View.h` (84 lines, whole); `gamemode/View.cpp` constants (16-24, 19-23 comment), default constraints (157-172), constructor and setters (451-565), hover-free input path (530-565), `ClampLongitude` and the clamps (729-756), `InterpolateViewInfo` (758-804), `BuildViewMatrix` (806-828), `OnCalcViewInfo` (857-882); `gamemode/GameMode.cpp` constants (93-95, 127-148), `OnUpdate` call site (9601-9714), view creation (7274-7287), `ConfigureCameraForMap` (2619-2674) and `SaveCameraStateForMap` (2604-2617); `render/Prim.cpp` rotation helpers (115-135); `world/World.cpp` `C3dAttr::GetHeight` (4284-4300). Not read: which code drives `OnUpdate` (so frame rate is not established), the sign convention of `GetHeight` (see section 6), the reference sub-step loop the comment cites, the viewpoint data source, and `ScreenToAttrCell` (hover only). No shake, FOV, collision or lock-on framing found (grep of `View.cpp` and `View.h`). Confidence: high on the interpolation, the constraints and the input mapping; medium on the terrain clamp's direction.

Best transferable idea: Keep the drawn camera and the wanted camera as two separate states, move the drawn one toward the wanted one by a fixed share each step, and put every zone's camera limits (distance, latitude, locked yaw) in a small data table.
Decision (proposed): adapt - the zone limit table and the wanted-versus-drawn split fit "zones as data" and the world camera, but the per-call factor must become dt-based, and the terrain floor needs a margin; do not copy the per-call step.
Acceptance: A client test runs the same orbit at 60 Hz and 30 Hz for one simulated second and asserts the eye positions agree within 1 percent; an indoor zone test asserts a drag leaves the yaw unchanged and a wheel step never takes the distance outside the zone's min and max.

## 1. Mechanism

- One `CView` holds two poses: `m_dest` (written by input and by the zone setup) and `m_cur` (drawn). Each update: set `m_dest.at` to the player position (857-859), move `m_cur` toward `m_dest` (860), build the view matrix (861).
- Inputs only write `m_dest`. Drag adds 0.4 x dx to longitude and -0.3 x dy to latitude (545-548), each clamped (535-543). The wheel adds `notches x -60` to distance (551-558), where notches is wheelDelta divided by WHEEL_DELTA, clamped to the zone's distance range (530-533). Reset sends longitude and latitude back to the zone defaults (561-565).
- Each step (`InterpolateViewInfo` 758-804). First call: `m_cur = m_dest` (764-772). Later calls: longitude moves by 10 percent of the shortest-arc error (782, 788), latitude (798), distance (799) and the look-at point (795-797) each move by 10 percent of their error. Then the state is clamped (800). Longitude is pinned to the default when the zone locks it (729-732).
- Matrix (`BuildViewMatrix` 806-828). Rotation = X rotation by latitude, then Y rotation by longitude (810-811). Eye = look-at + (-distance) times the rotation's third row (813-816). Terrain floor: if the terrain height at the eye's x and z is smaller than the eye's y, the eye's y is set to the terrain height (818-823). The view is a look-at from the eye to `m_cur.at` with up = (0,1,0) (825).
- Per-zone setup (`ConfigureCameraForMap` 2619-2674): indoor and outdoor differ in distance range, latitude range and locked yaw (below). Viewpoint records override the same fields (2644-2666). On leaving a map the current target latitude and distance are saved per indoor or outdoor kind (2604-2617, 2611-2615). The save is called at 9368, just before `m_view` is deleted (9369), and the next map starts from the saved values.
- Frame order (`CGameMode::OnUpdate` 9601-9714): packet intake (bounded at 64 or 128 per frame, 9613-9628), world-step accumulator (9636-9647, step 24 ms, at most 8 steps; only the loading branch was read, 9649-9660), `EnsureRealView` (9699), held-move pumps (9702-9706), then `m_view->OnCalcViewInfo()` (9712). The camera therefore uses the player's position after this frame's pumps.
- Tick: the camera update runs once per `OnUpdate` call, not inside the 24 ms world-step loop (as far as read). The step factor is per call, not per second.

## 2. Key functions

- `CView::InterpolateViewInfo`: `/mnt/frankendom-donors/Sziadan-open-midgard/src/gamemode/View.cpp` 758-804. The lerp of longitude, latitude, distance and look-at.
- `CView::BuildViewMatrix`: same file, 806-828. The eye from rotation and distance, the terrain floor, the look-at matrix.
- `CView::OnCalcViewInfo`: same file, 857-882. Target, interpolate, build.
- `CView::ClampLongitude`: same file, 729-745. The lock and the span rules.
- Input: `CView::RotateByDrag` (545-549), `CView::ZoomByWheel` (551-559), `CView::AddDistance` (530-533).
- Zone setup: `ConfigureCameraForMap` in `/mnt/frankendom-donors/Sziadan-open-midgard/src/gamemode/GameMode.cpp` 2619-2674; saved state `SaveCameraStateForMap` 2604-2617.
- Frame call: `CGameMode::OnUpdate` in the same file, 9601-9714.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Wanted pose and drawn pose; drawn moves a fixed share toward wanted each step | Share 0.1 per call (theirs, View.cpp 24; comment 19-23 says it mirrors a reference sub-step) |
| Shortest-arc yaw follow | Applies to longitude when not locked (782, 788) |
| Input writes the wanted pose only, then clamps | Drag 0.4 per pixel longitude, -0.3 per pixel latitude (theirs, View.cpp 16-17); wheel -60 per notch (theirs, 18) |
| Zone limits as data | Indoor distance 150 to 420, latitude -55 to -35, locked yaw at 45 (theirs, GameMode.cpp 127-128, 131-132, 2638-2639). Outdoor distance 150 to 700, latitude -65 to -25, yaw 0 (theirs, 127, 130, 133-134, 2638) |
| Remember the orbit per zone kind | Outdoor default distance 500, latitude -45 (theirs, GameMode.cpp 129, 145-146); indoor default 420 max, latitude -45 (theirs, 128, 147-148) |
| Terrain floor on the eye | No margin; eye set to terrain height when the test passes (theirs, View.cpp 818-823) |
| Fixed-tick world steps for actors | 24 ms per step, at most 8 steps per update (theirs, GameMode.cpp 93, 95, 9640-9645); not used by the camera as far as read |

## 4. TypeScript sketch

simplified: keeps the donor order (drag and wheel write only the wanted pose; one step toward it with shortest-arc longitude; eye from longitude, latitude and distance; ground floor). It changes the donor's per-call 0.1 into a 60 Hz-corrected share so the step is dt-based. It uses a y-up frame, which the donor's sign convention does not settle (section 6). It omits the ground margin, the saved per-map camera, the viewpoint overrides, and the hover code. The zone limits are an input, not the donor's table.

```ts
// Licence: GPL-3.0 (donor). Clean-room sketch of the shape only (destination/current orbit with zone limits), written from the described mechanism.
type Vec3 = { x: number; y: number; z: number };

const DEG = Math.PI / 180;
const DRAG_LON_DEG_PER_PX = 0.4;   // donor kDragLongitudePerPixel
const DRAG_LAT_DEG_PER_PX = -0.3;  // donor kDragLatitudePerPixel
const WHEEL_DIST_PER_NOTCH = -60;  // donor kWheelDistancePerNotch
const CATCH_UP_PER_60HZ = 0.1;     // donor: 0.1 per call; here corrected to a 60 Hz rate

export interface ZoneLimits {
  minDistance: number;
  maxDistance: number;
  defaultDistance: number;
  minLat: number;   // degrees, negative looks down
  maxLat: number;
  defaultLat: number;
  defaultLon: number;
  lockLon: boolean; // indoor zones lock the yaw
}

interface Pose { lon: number; lat: number; dist: number; at: Vec3; }

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const wrap180 = (d: number): number => ((d + 540) % 360) - 180;
const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  z: a.z + (b.z - a.z) * t,
});

export class ZoneOrbitCamera {
  private dest: Pose;
  private cur: Pose;
  private primed = false;

  constructor(private readonly zone: ZoneLimits, private readonly groundAt: (x: number, z: number) => number) {
    const base: Pose = {
      lon: zone.defaultLon,
      lat: clamp(zone.defaultLat, zone.minLat, zone.maxLat),
      dist: clamp(zone.defaultDistance, zone.minDistance, zone.maxDistance),
      at: { x: 0, y: 0, z: 0 },
    };
    this.dest = { ...base, at: { ...base.at } };
    this.cur = { ...base, at: { ...base.at } };
  }

  // Mouse drag and wheel write only the destination; the view follows in update().
  drag(dxPx: number, dyPx: number): void {
    this.dest.lon = this.zone.lockLon ? this.zone.defaultLon : this.dest.lon + dxPx * DRAG_LON_DEG_PER_PX;
    this.dest.lat = clamp(this.dest.lat + dyPx * DRAG_LAT_DEG_PER_PX, this.zone.minLat, this.zone.maxLat);
  }

  wheel(notches: number): void {
    this.dest.dist = clamp(this.dest.dist + notches * WHEEL_DIST_PER_NOTCH, this.zone.minDistance, this.zone.maxDistance);
  }

  // dt in seconds. Returns the eye and look-at point for this frame.
  update(player: Vec3, dt: number): { eye: Vec3; lookAt: Vec3 } {
    this.dest.at = { ...player };
    if (!this.primed) {
      this.cur = { ...this.dest, at: { ...player } };
      this.primed = true;
    }
    const a = 1 - Math.pow(1 - CATCH_UP_PER_60HZ, Math.max(0, dt) * 60);

    // Longitude moves the short way round; a locked zone keeps its fixed yaw.
    this.cur.lon = this.zone.lockLon
      ? this.zone.defaultLon
      : this.cur.lon + wrap180(this.dest.lon - this.cur.lon) * a;
    this.cur.lat = clamp(this.cur.lat + (this.dest.lat - this.cur.lat) * a, this.zone.minLat, this.zone.maxLat);
    this.cur.dist = clamp(
      this.cur.dist + (this.dest.dist - this.cur.dist) * a,
      this.zone.minDistance,
      this.zone.maxDistance,
    );
    this.cur.at = lerp3(this.cur.at, this.dest.at, a);

    // Eye in a y-up frame: a negative latitude puts the eye above the look-at point.
    const lat = this.cur.lat * DEG;
    const lon = this.cur.lon * DEG;
    const d = this.cur.dist;
    const eye: Vec3 = {
      x: this.cur.at.x - Math.cos(lat) * Math.sin(lon) * d,
      y: this.cur.at.y - Math.sin(lat) * d,
      z: this.cur.at.z - Math.cos(lat) * Math.cos(lon) * d,
    };

    // Ground floor: lift the eye to the ground when the ground is above it (no margin, as in the donor).
    const ground = this.groundAt(eye.x, eye.z);
    if (ground > eye.y) eye.y = ground;

    return { eye, lookAt: this.cur.at };
  }
}

export {};
```

## 5. Lands in

- TARGET `src/fight/camera.ts` (client-only world camera; new module, not checked against the Frankendom tree). Zone limits (distance range, latitude range, locked yaw per zone) belong in zone data, not in the module. Parity-checklist row 11 (fight camera). Row 11 is worded for the fight camera; the owner's world-camera request may need its own sub-line. Flagged for Lead.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room, shape only; no line-by-line translation).
- Brief rule served: camera is client-only (the engine never reads it); zone limits are zone data; the step is dt-based so the view does not depend on frame rate.

## 6. Gaps and risks

- Not an over-the-shoulder view. The look-at point is the player's position (`ResolveTargetPosition` 714-727; `m_dest.at` at 859), not a head point, and the boom has no lateral term (814-816). The owner's shoulder request is not supplied by this donor.
- The only collision is one terrain-height sample at the eye's x and z (819-821). No walls, buildings or objects are tested. Indoor zones rely on the maximum distance of 420 and on the locked yaw instead.
- Frame-dependent smoothing. The share is 0.1 per call (View.cpp 788-799), so the settling time depends on how often `OnUpdate` runs (driver not read). Derived: at 60 calls per second, a 0.9 share per call is about 9.5 calls (0.16 s) to 1/e; at 30 calls per second, about 0.32 s. The donor's comment (19-23) says the reference applies the step per sub-step; this code calls the step once per `OnCalcViewInfo`, and the reference loop was not read.
- Terrain floor direction is unsettled. `m_up` is (0,1,0) (View.cpp 455), and with the default latitude of -45 to -55 the eye's y is smaller than the look-at point's y (derived from 810-816: eye.y = at.y + distance x sin(latitude), with a negative latitude). The floor test treats a smaller y as higher. If the world is y-down (height grows downward), the test is a true floor under the camera. If it is y-up, the same test would drag an elevated eye down to ground level. Check `GetHeight` and the projection before copying the test.
- The floor is instant (no damping, no margin) and can snap the eye when the ground rises under the camera.
- No target framing. The locked-target marker (GameMode.cpp 107-119) is a visual, not a camera input. The camera follows only the player. No many-enemy framing, no combat zoom, no FOV change, no shake (grep of `View.cpp` and `View.h`).
- Keep: the zone limit table (indoor 150-420 distance, -55 to -35 latitude, locked yaw; outdoor 150-700, -65 to -25) and the saved per-zone orbit (2604-2617). These map directly to Frankendom zone data.
- Client only. Server kills and damage are unaffected.
- Not run: no build, no visual check. Everything above is from reading the code.
