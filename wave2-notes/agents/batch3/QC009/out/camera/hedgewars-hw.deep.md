# hedgewars-hw (camera, cell 14)

Donor: `/mnt/frankendom-donors/hedgewars-hw/hedgewars/uWorld.pas` | Licence: GPL-2.0, "version 2 of the License" as stated in the uWorld.pas and hwengine.pas headers (COPYING at `/mnt/frankendom-donors/hedgewars-hw/COPYING` is GPL version 2) | Pascal | symbol `MoveCamera`

Checked: Read in full `MoveCamera` (uWorld.pas 1943-2067), `ShakeCamera` (2143-2149) and the explosion caller (uVisualGearsHandlers.pas 846-858). Read `DrawWorld` zoom block and its call to `MoveCamera` (918-939), `CameraBounds` (881-916), `InitCameraBorders` (257-259), the main loop (hwengine.pas 72-77, 120-127, 320-330), the mouse-to-pivot path (uCursor.pas 25-57), the follow-target assignments (uCommandHandlers.pas 636-653 and 347; uGearsHedgehog.pas 916-922). Candidates opened and set aside: uIO.pas (remote cursor, 450-458), rust/lib-hedgewars-engine/src/render/camera.rs (position and zoom only, no follow), TargetPractice.lua and Racer.lua (re-centre by spawning a hidden gear). Not read: the zoom-wheel step bodies (uCommandHandlers.pas 739-767 read only by grep), the branch condition for the zoom range (uVariables.pas ~2753), the full Y bound in `MoveCamera` (2041-2050, not traced), and the Y-lead cases beyond line 1978. Camera scope: world camera (2D side view, the active hedgehog or projectile is followed). Confidence: high on the 2D follow, dead zone and handover logic (read end to end); the 3D transfer is shape only.

## 1. Mechanism

- State: `WorldDx`/`WorldDy` (the world-to-view offset), `CursorPoint` (where the look-ahead point sits in view space), `prevPoint` (last pass), and `FollowGear` (the thing being followed). `MoveCamera` runs once per `DrawWorld` call when the game is not paused, not AFK and not a recording (uWorld.pas 936-937). When paused it only clamps (938-939).
- Order of steps in one pass:
  (a) Manual input first. If the window has focus (1948), `uCursor.updatePosition()` (1949) adds the mouse delta to `CursorPoint` (uCursor.pas 55-56, Y is subtracted).
  (b) Auto-follow test. Follow runs only when `autoCameraOn`, not placing hogs, `FollowGear` exists, cursor hidden, ammo menu closed, not fast-scrolling, and not between targeted attacks (1953). If the manual movement this pass is more than 4 px (manhattan) (1954), the code clears `FollowGear`, copies `prevPoint`, and returns without moving the camera (1956-1958). This is the hand-over from input to auto-follow and back.
  (c) Target. `dstX = gear.X + sign(gear.dX) * z + WorldDx` (1962), where `z = round(200/zoom)` (1951). The target is the gear plus a look-ahead in its travel direction, so on screen the lead is about 200 px at any zoom (z times zoom is about 200).
  (d) Smoothing. `CursorPoint.X` moves 1/8 of the gap per pass: `(prevPoint.X * 7 + dstX) div 8` (1975; the world-wrap variant is at 1971). Y uses the same 7/8 blend (1979-1981), with the vertical look-ahead applied only when `|dY * z| >= 10` and not on phones or screens under 600 px high (1978).
  (e) Dead zone and push. `EdgesDist = cGearScrEdgesDist` (2023) when the cursor is hidden, or `cCursorEdgesDist` (2020) when it is shown. If the pivot passes the edge margin on the left (2029), `WorldDx` moves by the overshoot and the pivot is pinned to the margin (2031-2033). The right side is symmetric. Y bounds use a different expression (2041-2050) that I did not trace in full.
  (f) No follow target, or auto-camera off with the cursor hidden. The else branch (2054-2058) pans instead: `WorldDx` moves by the pivot's change and the pivot re-centres to (0, screen height / 2).
  (g) End of pass. `prevPoint = CursorPoint` (2064), then `CameraBounds()` clamps the offset (2067).
- `CameraBounds` (881-916) clamps `WorldDy` at the top, clamps `WorldDx` to the level width plus `cCamLimitX`/`cCamLimitBorderX`, centres when the level is narrower than the view (888-889), and keeps Y above a water bound (914-916).
- Zoom. `DrawWorld` moves `zoom` toward `ZoomValue` by `0.002 * Lag` per call, clamped to the target (920-933). `Lag` is milliseconds, so zoom is time-based. Mouse wheel binds call `zoomin`/`zoomout` (uInputHandler.pas 420-421).
- Shake. `ShakeCamera(amount)` returns at once if the cursor is shown (2145). Otherwise `amount = max(1, round(amount*zoom/2))` (2147) and both offsets get `-amount + random(1 + 2*amount)` (2148). The explosion visual calls it when `(Timer and 5) = 0` (851) with `amount = max(1, 13 - (Timer*15) div 250)` (853-854) and removes itself after `Timer > 250` (857).
- Loop. `hwengine.pas` 325-327: the loop calls `DoTimer(CurrTime - PrevTime)` only once at least `cTimerInterval` (8 ms, uVariables.pas 2732) has passed, else `SDL_Delay(1)`. `DoTimer` adds `Lag` to `RealTicks` (77) and calls `DrawWorld(Lag)` (125) then `DoGameTick(Lag)` (126). So this is a variable-cadence loop with a minimum step of 8 ms. The 7/8 blend runs once per pass, not once per millisecond.

## 2. Key functions

- `MoveCamera`: `/mnt/frankendom-donors/hedgewars-hw/hedgewars/uWorld.pas` 1943-2067. Pivot, look-ahead, blend, dead zone, pan, bounds.
- `CameraBounds`: `/mnt/frankendom-donors/hedgewars-hw/hedgewars/uWorld.pas` 881-916. Level-box clamp.
- `DrawWorld` (zoom easing and the `MoveCamera` call): `/mnt/frankendom-donors/hedgewars-hw/hedgewars/uWorld.pas` 918-939.
- `ShakeCamera`: `/mnt/frankendom-donors/hedgewars-hw/hedgewars/uWorld.pas` 2143-2149.
- Explosion shake caller: `/mnt/frankendom-donors/hedgewars-hw/hedgewars/uVisualGearsHandlers.pas` 846-858.
- Driving loop: `/mnt/frankendom-donors/hedgewars-hw/hedgewars/hwengine.pas` 72-77 and 120-127 and 320-330.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Look-ahead point fixed on screen, in the travel direction | `z = round(200/zoom)`: 200 px on screen (theirs, uWorld.pas 1951) |
| Pivot eases toward target, 1/8 of the gap per pass | 7 kept, 8 divisor (uWorld.pas 1975) |
| Vertical look-ahead only when moving vertically fast | threshold `_10` on `dY * z` (uWorld.pas 1978) |
| Dead zone: view moves only when pivot leaves the margin | `min(2 * cScreenHeight div 5, 2 * cScreenWidth div 5)` (uWorld.pas 259); the margin is subtracted from the half-width in the units CursorPoint uses, so its on-screen size depends on `cScaleFactor` (not traced) |
| Manual pan above a threshold turns auto-follow off | 4 px manhattan per pass (uWorld.pas 1954) |
| Manual-mode margin | `cCursorEdgesDist = 100` (uWorld.pas 135) |
| Pan without a target, then re-centre | pivot reset to (0, screen height / 2) (uWorld.pas 2057-2058) |
| Clamp to the level box plus margin | `cCamLimitX = 1920`, `cCamLimitY = 2048`, border variants 1920 / 2048 (uConsts.pas 228-232) |
| Zoom eases to target, per millisecond | 0.002 per ms (uWorld.pas 922, 929); default zoom 2.0 (uConsts.pas 225) |
| Zoom range | min 3.5 / max 0.5 in one branch (uVariables.pas 2755-2756), 3.0 / 1.0 in the other (2760-2761); the branch condition was not read |
| Explosion shake, decays with age | `max(1, 13 - (Timer*15) div 250)`, every `(Timer and 5) = 0` step, ends at Timer 250 (uVisualGearsHandlers.pas 851-857) |
| Loop cadence | `cTimerInterval = 8` ms (uVariables.pas 2732) |

## 4. TypeScript sketch

simplified: The sketch keeps the donor order: zoom easing, manual-pan hand-over, follow target with look-ahead, blend, dead-zone push, and the no-follow pan branch. It converts the donor's 1/8-per-pass blend to a time-based blend that assumes one donor pass per 8 ms, so it is an approximation of the donor's per-pass behaviour, not identical. It omits the CameraBounds level clamp and water bound, the donor's asymmetric Y edge (shs), the world-wrap branch, the phone and small-screen Y-lead rule (replaced by the speed threshold only), the cursor-visible and external-driven branches, the ammo-menu and targeted-attack suspensions, the IPC cursor send, and the mouse-wheel zoom step. Pascal `round` and JavaScript `Math.round` differ on exact .5 ties.

```ts
// Licence: GPL-2.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Vec2 = { x: number; y: number };

interface CamTuning {
  leadPx: number;        // screen-px look-ahead in the travel direction (donor: z = round(200/zoom))
  edge: number;          // dead-zone distance from the view edge, in view units (donor: cGearScrEdgesDist)
  blendPerStep: number;  // share of the gap closed per reference step (donor: 7/8 kept per call, so 1/8 closed)
  stepMs: number;        // reference step length in ms (donor: cTimerInterval = 8)
  breakPx: number;       // manual pan above this (manhattan px) hands control back to the player (donor: 4)
  zoomPerMs: number;     // zoom easing rate per ms (donor: 0.002)
}

interface Cam {
  off: Vec2;        // donor WorldDx/WorldDy: shift from world to view
  pivot: Vec2;      // donor CursorPoint: where the look-ahead point sits in view space
  prevPivot: Vec2;  // donor prevPoint
  follow: boolean;  // donor FollowGear != nil and autoCameraOn
  zoom: number;
  zoomTarget: number;
}

interface Hero { x: number; y: number; dx: number; dy: number; }

// One camera step. halfW/halfH are the half view size in world units at the current zoom.
function stepCam(cam: Cam, hero: Hero, manual: Vec2, dtMs: number,
                 halfW: number, halfH: number, t: CamTuning): void {
  const dz = t.zoomPerMs * dtMs;
  if (cam.zoom > cam.zoomTarget) cam.zoom = Math.max(cam.zoomTarget, cam.zoom - dz);
  else cam.zoom = Math.min(cam.zoomTarget, cam.zoom + dz);

  cam.pivot.x += manual.x;
  cam.pivot.y += manual.y;
  if (cam.follow && Math.abs(cam.pivot.x - cam.prevPivot.x) + Math.abs(cam.pivot.y - cam.prevPivot.y) > t.breakPx) {
    cam.follow = false;
    cam.prevPivot = { ...cam.pivot };
    return;
  }

  if (!cam.follow) {
    // no follow: pivot movement pans the world, then the pivot is re-centred
    cam.off.x -= cam.pivot.x - cam.prevPivot.x;
    cam.off.y -= cam.pivot.y - cam.prevPivot.y;
    cam.pivot = { x: 0, y: 0 };
  } else {
    const lead = t.leadPx / cam.zoom;
    const k = 1 - Math.pow(1 - t.blendPerStep, dtMs / t.stepMs);
    const dstX = hero.x + Math.sign(hero.dx) * lead + cam.off.x;
    cam.pivot.x += (dstX - cam.pivot.x) * k;
    const vLead = Math.abs(hero.dy * lead) < 10 ? 0 : Math.sign(hero.dy) * lead;
    const dstY = hero.y + vLead + cam.off.y;
    cam.pivot.y += (dstY - cam.pivot.y) * k;

    // dead zone: move the view only when the pivot leaves it
    const minX = -halfW + t.edge, maxX = halfW - t.edge;
    if (cam.pivot.x < minX) { cam.off.x += minX - cam.pivot.x; cam.pivot.x = minX; }
    else if (cam.pivot.x > maxX) { cam.off.x += maxX - cam.pivot.x; cam.pivot.x = maxX; }
    const minY = -halfH + t.edge, maxY = halfH - t.edge;
    if (cam.pivot.y < minY) { cam.off.y += minY - cam.pivot.y; cam.pivot.y = minY; }
    else if (cam.pivot.y > maxY) { cam.off.y += maxY - cam.pivot.y; cam.pivot.y = maxY; }
  }
  cam.prevPivot = { ...cam.pivot };
}

// Explosion shake: amount falls with the effect's age (donor doStepBigExplosionWork).
function shakeAmount(timer: number): number {
  return Math.max(1, 13 - Math.floor((timer * 15) / 250));
}

// Random offset on both axes per call (donor ShakeCamera). rnd returns [0, 1).
function shake(cam: Cam, amount: number, rnd: () => number): void {
  const a = Math.max(1, Math.round((amount * cam.zoom) / 2));
  cam.off.x += -a + Math.floor(rnd() * (1 + 2 * a));
  cam.off.y += -a + Math.floor(rnd() * (1 + 2 * a));
}
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file /tmp/QC009-hedgewars-hw-camera.ts, exit 0.

Best transferable idea: Keep a look-ahead point a fixed on-screen distance ahead of the hero, ease it toward its target by a fixed share each update, move the view only when that point leaves an edge dead zone, and let a manual pan above a small threshold hand control back to the player.
Decision (proposed): adapt - take the dead zone, the fixed-distance look-ahead and the manual-input hand-over, but make the smoothing time-based and add the pitch, yaw and wall pull-in a 3D third-person camera needs and this 2D camera does not have; this is the shape the owner's world camera is missing.
Acceptance: A player walks a hero across a zone: the view holds still while the hero stays inside the middle band, then eases so the hero sits about 200 px ahead of their facing side, and a manual drag larger than 4 px per frame turns auto-follow off until it is turned back on (a client test asserts the camera offset per frame on a fixed input trace; the server is not involved).

Reuse tag: rewrite-from-idea (GPL-2.0, version 2 only per the headers; clean-room only, shape and numbers as design data, no line translation)
Brief rule served: client-only camera (ruling); no server rule touched; rules 7-9 n/a. Camera scope: world camera.

## 5. Lands in

- TARGET `src/fight/camera.ts` (client-only follow, dead zone, look-ahead, zoom and shake; the engine never reads it).
- Parity-checklist row 11 (fight camera). Note for Lead: the addendum has no row for the world camera. Row 11 covers the fight camera, and the owner asks for the world camera to be fixed, so the world camera needs its own row or a sub-line under row 11.
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only).
- Brief rule served: client-only camera (ruling); rules 7-9 n/a.

## 6. Gaps and risks

- GPL-2.0 (version 2 only, per the source headers). Clean-room only: the sketch is written from the mechanism, and the donor numbers are design data.
- 2D, not 3D. The donor follows an x/y offset in a side view. A third-person camera needs yaw and pitch aim, pitch limits and collision pull-in, and this donor has none of them. What transfers: the dead zone, the fixed-distance look-ahead, the manual-input hand-over and the zoom easing. What does not: the offset model and the 2D bounds.
- Frame-rate dependence in the donor. The 7/8 blend runs once per `DrawWorld` pass, and the loop only passes every 8 ms or more (hwengine.pas 325-327). Follow speed therefore depends on loop cadence. Zoom is per millisecond (922, 929). Frankendom should use time-based smoothing for follow too; the sketch does.
- Hand-back to auto-follow is not fully mapped. `FollowGear` is set when a hedgehog is driven (uCommandHandlers.pas 347), on a direction change (uGearsHedgehog.pas 920), and when falling (uGearsHedgehog.pas ~1059, not read in full). The auto-camera toggle clears it (642). Other assignments exist in uGearsHedgehog.pas, uGearsHandlersMess.pas and uGearsHandlersRope.pas and were not read.
- One follow target. There is no multi-enemy framing, so the many-on-one framing rule for the fight camera is not in this donor. The Pit fight camera (row 11) needs a separate mechanism.
- No collision. The donor camera clamps to a level box (CameraBounds, 881-916) and never pulls in around walls, because the level is flat 2D. A 3D world camera needs its own wall pull-in.
- Shake is a random walk in the donor: each call adds a random offset with mean zero (2148). I did not trace whether the offset decays back to rest; only the explosion's amplitude decays (851-857).
- Client only. The donor sends the cursor point over IPC in manual mode (uWorld.pas 2017). Frankendom should not copy that; the camera stays client-side.
- Not read: the zoom-wheel step code (uCommandHandlers.pas 739-767, grep only), the zoom-range branch condition (uVariables.pas ~2753), and the full Y edge bounds (2041-2050).



## Checker findings (Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code.

**Errors / corrections:** 7/8 blend (1975), z=round(200/zoom) (1951), 4 px manhattan hand-over (1954), vertical lead _10 test (1978), cGearScrEdgesDist formula (259), zoom 0.002*Lag (920-933), shake maths (2147-2148) and explosion caller (851-854), cTimerInterval 8, cCamLimit constants, GPL v2-only header: verified. Small: step (a) is described as 'if window has focus (1948)' but the real guard is not(ExtDriven and cursor visible and no ammo menu and autoCam) and cHasFocus and GameState<>gsConfirm, and is compiled out under MOBILE; zoom range branch is just IFDEF MOBILE (uVariables 2750-2761), listed as 'not read'.

**Missed:** early exit when CursorPoint==prevPoint (CameraBounds only); ammo-menu branch clamps the pivot to AmmoRect; weWrap world-edge handling; manual pan branch also requires cHasFocus
