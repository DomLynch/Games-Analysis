# OpenXcom-OpenXcom (camera, cell 14)

Donor: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Battlescape/Camera.cpp` (with Camera.h, Map.cpp, ProjectileFlyBState.cpp, Engine/Timer.cpp, Engine/Game.cpp, Options.cpp) | Licence: GPL-3.0-or-later (Camera.cpp header: "version 3 of the License, or (at your option) any later version"; LICENSE.txt is GPL v3) | C++ | symbol `Camera::scrollXY` (projectile follow: `Map::drawTerrain`)

Checked: camera_scope: world camera. Read in full: Camera.h (1-111) and Camera.cpp (1-622). Callers and loop read: Map.cpp 98-110, 173-178, 183-198, 487-611, 1575-1582, 1737-1740; ProjectileFlyBState.cpp 300-305, 455-480, 495-560; Engine/Timer.h 51; Engine/Timer.cpp 51-137; Engine/Game.cpp 292-336; Engine/State.cpp 271-275; BattlescapeState.cpp 492-508, 561-572, 1489-1495; Options.cpp 102-103, 197, 288; Options.h 31. Confidence: high on the camera class and the projectile follow; medium on the frame cadence (I read the timer and the loop, but not every path from the state's think into the map). This is a top-down isometric tactical map that scrolls across a whole level, so the tag is world camera. The code has no shoulder offset, pitch, yaw, wall collision, lock-on, FOV or zoom change, and no shake.

## 1. Mechanism

The camera is a 2D view on an isometric map. Its state is `_mapOffset` (screen pixels, plus a level z). It moves in four ways.

- Edge and corner scroll (timer-driven). With the mouse in a 5 px band at a screen edge, the mouse scroll timer starts; within a 60 px corner zone the step is diagonal and the second axis moves at half speed (Camera.cpp 133-147, 172-206). The step is `battleScrollSpeed`, default 8 px (Options.cpp 102). Each timer tick calls `scrollXY` with the stored step (Camera.cpp 307-309; Map.cpp 173-176 drives the timers). `scrollXY` adds the step, then loops: convert the screen centre to map tiles, and if the centre is off the map, nudge the offset by 1 px on both axes and try again (Camera.cpp 326-348). Keyboard scroll uses the same path with its own timer (Camera.cpp 228-262, 315-317).
- Snap to a unit. `centerOnPosition` clamps the target to the map plus one tile (Camera.cpp 410-411), sets the offset so the target sits at the screen centre (414-415), and redraws. It does not ease. Callers grep-listed: BattlescapeState.cpp 533, 942, 998, 1017, 1182; BattlescapeGame.cpp 194, 315, 516, 1078, 1278; UnitWalkBState.cpp 170 (only 533 was read in full).
- Projectile follow, the "smooth camera" option (off by default, Options.cpp 197). `setProjectile` arms `_launch` when the option is on (Map.cpp 1578-1580). On the first draw of the flight, if the projectile starts off screen, the view centres on its start (Map.cpp 546-557). Then a latch. While not engaged, the camera does not move while the projectile is inside the view. When the projectile's screen point is outside the view (1 px margin, Map.cpp 558-563), `_smoothingEngaged` is set. While engaged, each projectile draw calls `jumpXY` by the difference between the view centre and the projectile's screen point (Map.cpp 566-569), so the projectile is held at the centre. The latch clears at impact (ProjectileFlyBState.cpp 505 and 557 call `resetCameraSmoothing`; Map.cpp 1737-1740). With the option off, the camera pages instead: each draw moves the view by one screen width or height until the projectile is back in view (Map.cpp 571-600).
- Level change. `up()` and `down()` shift the view by 3/5 of the sprite height per level (Camera.cpp 367-388). The projectile path switches level with the projectile (Map.cpp 536-545).

Note on the name: "smooth" is not easing. Engaged mode is a hard lock to the centre, applied on each draw.

Loop and cadence. The game loop calls the top state's `think()` once per pass (Game.cpp 295) and sleeps 1 ms per pass while running (Game.cpp 336). `BattlescapeState::think` runs the surfaces' think (which reaches `Map::think` and its scroll timers) only while the game timer runs and no popup is open (BattlescapeState.cpp 565-569; the surface loop is State.cpp 271-275). `Timer::think` compares wall-clock time with the interval. With frame skipping off (the default, Timer.h 51) it does one step per call, then resets its schedule to now if it is behind (Timer.cpp 117-135). So there is no catch-up after a stall: a hitch loses camera travel. The draw is separately capped by the FPS option, default 15 (Game.cpp 302; Options.cpp 288). The scroll step is a fixed number of pixels per timer tick, so the speed in pixels per second follows the tick rate, not elapsed time. At the 15 ms interval the cadence is at most about 66 steps per second, or about 533 px/s at speed 8 (computed from the constants, not measured).

## 2. Key functions

- `Camera::scrollXY`: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Battlescape/Camera.cpp` 326-348. Adds the step, then the centre-in-map correction loop.
- `Camera::mouseOver`: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Battlescape/Camera.cpp` 119-221. Edge band and corner zones, diagonal halving, timer start and stop.
- `Camera::centerOnPosition`: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Battlescape/Camera.cpp` 406-419. Clamp, then set the offset at once.
- `Map::drawTerrain` projectile block: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Battlescape/Map.cpp` 504-602. Launch centring, latch, lock, paging. This runs only when the map is redrawn (`Map::draw` returns early when not invalidated, Map.cpp 185-188).
- `Map::setProjectile` and `Map::resetCameraSmoothing`: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Battlescape/Map.cpp` 1575-1582 and 1737-1740.
- `Timer::think`: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Engine/Timer.cpp` 109-137.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Edge band starts a scroll; a corner zone makes it diagonal at half speed on the second axis | Band 5 px (Camera.h 47); corner zone 60 px (Camera.h 48); diagonal half step (Camera.cpp 140) |
| Scroll is a fixed step per timer tick, not per elapsed second | Interval 15 ms (Map.h 47); step = battleScrollSpeed default 8 px (Options.cpp 102) |
| Projectile latch: still while the subject is in view, lock once it leaves | Margin 1 px (Map.cpp 560-561); lock to the view centre (Map.cpp 568, half the width and visible height) |
| Release the latch at impact | ProjectileFlyBState.cpp 505, 557 |
| Level shift per z step | 3/5 of sprite height (Camera.cpp 372) |
| Clamp the centre to the map plus one tile | Camera.cpp 410-411 (-1 and map size) |
| Draw cap | FPS default 15 (Options.cpp 288) |

Theirs, not the mechanism: the 5 px band, 60 px corner zone, 8 px step, 15 ms interval and 15 FPS cap are all donor choices for a mouse-driven isometric map.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order (free while the subject is in view, latch on the first frame it is outside with a 1 px margin, release at impact). It omits the launch centring (Map.cpp 548-557), the paging jump used when smooth camera is off (Map.cpp 571-600), the view clamp (Camera.cpp 328-348) and the projectile itself. It changes the donor's engaged mode: the donor locks the subject at the centre at once (Map.cpp 566-569), while this sketch eases toward the centre with a half-life, which is not in the donor. Impact arrives as a boolean (donor: ProjectileFlyBState.cpp 500, 505, 557).

```ts
// Licence of donor: GPL-3.0-or-later. Clean-room sketch written from the described mechanism (latch, release on impact), not a translation of donor lines.
// Shape only. The damping is a Frankendom choice, not in the donor.
interface Vec2 { x: number; y: number }
interface ViewSize { w: number; h: number }
interface FollowCam { latched: boolean }

// Left and right and top and bottom test: a 1 px margin, as the donor does.
const LEAVE_MARGIN_PX = 1;
// Frankendom value (not in the donor, which locks at once). Tunable client data.
const RECENTRE_HALF_LIFE_MS = 120;

function outsideView(p: Vec2, v: ViewSize): boolean {
  return p.x < LEAVE_MARGIN_PX || p.x > v.w - LEAVE_MARGIN_PX
      || p.y < LEAVE_MARGIN_PX || p.y > v.h - LEAVE_MARGIN_PX;
}

// Called once per client frame with the subject's screen position.
// Returns the pan to apply to the view (the subject moves by minus this amount).
function updateProjectileFollow(
  cam: FollowCam, subject: Vec2, view: ViewSize, dtMs: number, impacted: boolean,
): Vec2 {
  if (impacted) { cam.latched = false; return { x: 0, y: 0 }; } // release at impact
  if (!cam.latched) {
    if (!outsideView(subject, view)) return { x: 0, y: 0 };      // free flight: no camera move
    cam.latched = true;                                          // leave the frame once: latch on
  }
  const target: Vec2 = { x: view.w / 2, y: view.h / 2 };
  const k = 1 - Math.pow(0.5, dtMs / RECENTRE_HALF_LIFE_MS);     // frame-rate independent blend
  return { x: (subject.x - target.x) * k, y: (subject.y - target.y) * k };
}

const cam: FollowCam = { latched: false };
const view: ViewSize = { w: 800, h: 600 };
const pan = updateProjectileFollow(cam, { x: 900, y: 300 }, view, 16, false);
void pan;
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/QC001-openxcom-latched-follow.ts`, exit 0.

## 5. Lands in

- TARGET `src/fight/camera.ts` (client-only world camera controller; the engine never reads the camera). Parity-checklist row 11 (fight camera).
- today: not checked in this pass (Frankendom's client camera code was not read).
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only, shape only)
- Brief rule served: client-only camera (the engine never reads it); row 11

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism, not from donor lines.
- Nothing here transfers to an over-the-shoulder camera: no shoulder offset, distance, pitch or yaw limits, wall pull-in, lock-on framing, FOV or zoom change, or shake. I read the whole Camera class and none of these are in it. For the owner's world camera, only the shape of the projectile follow transfers.
- "Smooth" is a misnomer. The engaged state is a hard lock applied on each draw (Map.cpp 566-569). Do not copy the lock. The damping in the sketch is ours and must be tuned as client data.
- The scroll is a fixed pixel step per timer tick with no catch-up after a stall (Timer.cpp 125-135). A world camera must scale its motion by elapsed time in the frame loop.
- The latch runs inside the draw path (`drawTerrain` runs only when the map is invalidated, Map.cpp 185-188). Our camera must update once per frame in the update loop, not in the draw. Whether the projectile step invalidates the map on every frame was not read (not read).
- Camera scroll pauses while a popup is open (BattlescapeState.cpp 567-569). A world camera that follows a shot must not pause for a dialog.
- Not read: the individual BattlescapeGame and UnitWalkBState callers of `centerOnPosition` (grep only); the keyboard binding handlers beyond Camera.cpp 228-302; the paging path's effect on the minimap (MiniMapView.cpp, not read). The donor has no pit or arena camera.
- Edge scroll is on by default (`SCROLL_AUTO`, Options.cpp 103). That is a mouse UX choice for a top-down map and should not be copied to a third-person camera.
- Client-only: the camera values in the sketch are client settings. The engine must not read them, and a server test cannot assert a camera. Acceptance is a client browser test.

Best transferable idea: a follow camera that stays still while a shot is in frame, latches onto it once it leaves the view, and releases at impact.
Decision (proposed): adapt — keep the shot-follow shape (still while in frame, follow once it leaves, release at impact) but ease instead of the donor's hard lock; reject the isometric edge scroll, the paging jump and the fixed-step scroll, which do not fit a third-person camera.
Acceptance: in an open zone a fired or thrown shot leaves the camera still while it is on screen; once it leaves the frame the camera eases it back toward centre (about 0.12 s half-life) and releases at impact. Client browser test only (no server assert: the camera is client-only).

Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only, shape only)
Brief rule served: client-only camera (the engine never reads it); parity row 11 (fight camera)
