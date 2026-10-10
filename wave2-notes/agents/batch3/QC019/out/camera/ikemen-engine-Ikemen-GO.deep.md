# ikemen-engine-Ikemen-GO (camera, cell 14)

Donor: `/mnt/frankendom-donors/ikemen-engine-Ikemen-GO/src/camera.go` (fight view), fed by `/mnt/frankendom-donors/ikemen-engine-Ikemen-GO/src/char.go` (`track`) and called from `/mnt/frankendom-donors/ikemen-engine-Ikemen-GO/src/system.go` (`action`) | Licence: MIT (`LICENCE.txt` line 3: "Copyright (c) 2016 Suehiro"; the MIT grant is in the same file) | Go | symbol `Camera.action`

Checked: camera_scope: pit camera. Reason: the fight view is a side-on camera that only makes sense inside a bounded stage (it reads stage left/right bounds and screen edges). The owner's world-relevant parts are the multi-target framing (section 1, step 1) and the logic-speed normalisation; they are carried into the world-camera acceptance in section 5, but the donor view itself is the arena view. Read in full: `Camera.action` (camera.go 337-621), `reduceZoomSpeed`, `keepScreenEdge`, `keepStageEdge`, `hardLimit`, `reduceYScrollSpeed`, `boundY`, `zoomEnabled` (camera.go 623-720), `Update` and `setScreenPos` (278-286, 229-240), `ResetTracking` and `SaveRestoreTracking` (218-276), the Camera and stageCamera structs (5-128), defaults (77-97), `Reset` (129-199, read; the autoZoom branch read), `track` (char.go 12778-12840), the tick call (system.go 2829-2940), `addFrameTime` (system.go 2654-2671), `gameLogicSpeed` (system.go 4459-4463). Not read: the stage-file section name and parser around stage.go 1265-1330 (keys read by name only), the Y-tension branch only in part (not traced to the end), and the render side (camera position to draw transform, char.go 183-187). Confidence: high on the fight-view order of operations and the constants read; medium on the tick call order (read in system.go, not traced through `charUpdate`).

## 1. Mechanism

- Per logic tick (not per render frame), in `System.action` (system.go 2829): (a) `ResetTracking` clears the extremes (2835; camera.go 218-227); (b) each character runs `update` then `track` (char.go 14063-14067), and `track` records, for characters with the move-camera flags, the left/right edge of their hit box and their x velocity into `leftest`/`rightest`/`leftestvel`/`rightestvel` (char.go 12789-12819), and the highest/lowest y (12826-12829) and front/back z; (c) `Camera.action` runs (2929) and returns the new view x, y and scale; (d) `Camera.Update` applies the scale and screen position (2940; camera.go 278-285).
- Inside `Camera.action` for the fight view (camera.go 337-621), in order:
  1. Step 1, framing targets (camera.go 358 onward). `tension` = 50 px scaled by the local scale (default 50, camera.go 85). If the leftmost tracked edge is inside the view's left edge plus tension (368), the target left becomes `leftest - tension` (not less than the stage's minimum left), and the target right keeps the view width, but not less than `rightest + tension` (369-371). The right side is symmetric (372-376). So the view moves only when a tracked fighter gets within `tension` of an edge. This is the many-fighter framing: the extremes are over every tracked character, not a pair.
  2. Optional autocenter (362-364) and the Y-tension branch (only when `ytensionenable`; not traced fully).
  3. Fit-to-width zoom-out (the block under the `< c.zoomout` test, read): if the required width exceeds the zoom-out limit, the excess is split between the two sides.
  4. Zoom-in gate (camera.go 415 onward): zoom-in is allowed only when the fit passes and `zoomindelaytime` has counted down. After a failed fit the counter is set to `zoomindelay` (the counter is set in several places; one receipt used).
  5. Target centre and scale (`targetX`, `targetScale`) from the target edges and `zoomin`.
  6. Z offset (depth) and the Y branch (the non-tension Y: 0.85/0.15 mix for 3 iterations toward `highest + floortension` scaled by `verticalfollow`, camera.go 487 onward; read in part).
  7. Step 2, edge smoothing (camera.go 544 onward): `logicScale = 60 / gameLogicSpeed` (544). Each edge moves toward its target by `0.05 * logicScale * tensionvel` of the gap per iteration, 3 iterations, with a fixed snap step `gameWidth/3200 * logicScale * tensionvel` (551-556). Then a speed floor (577-583): a small positive move is raised to the rightmost fighter's edge velocity (capped at the target), and a small negative move to the leftmost fighter's velocity.
  8. Step 3, zoom (584, 645, and the edge limits at 662 and 678 onward): new scale = min(gameWidth / width, zoomin); the change is a fraction `zoominspeed` or `zoomoutspeed` per tick when that fraction is below 1 (645-651). `keepScreenEdge` keeps the extremes off the screen edge by the stage margins; `keepStageEdge` (678) clamps to the stage bounds; `hardLimit` (690) clamps to the bounds and the zoom limits.
  9. Centre and Y scroll: `newX = centre of the new edges`; Y moves by `yscrollspeed` of the change (705); `boundY` (708) clamps to the stage's high and low bounds.
  10. Z: blend toward the z target, `blend = clamp(0.05 * ztensionvel, 0, 1)`, 3 iterations with a snap (595 onward); `newY += newZ`.
- Follow view (camera.go 608) centres on one character; free view uses a stored position. Neither is the fight view.
- Rate: the logic tick runs at `60 + GameSpeed * GameSpeedStep` per second (system.go 4460), and `addFrameTime` advances `tickCountF` by `nextAddTime` each render frame and bumps `tickCount` when the integer part passes (system.go 2664-2667). So the camera is fixed-step per logic tick with an accumulator; the render side may interpolate between ticks (system.go 2634-2648, optional), not read in detail.
- Tracking fallback: if no character tracked an edge this tick, the previous value is restored (`SaveRestoreTracking`, camera.go 241-276, read). Without this the camera would jump to the default bounds.

## 2. Key functions

- `Camera.action`: `/mnt/frankendom-donors/ikemen-engine-Ikemen-GO/src/camera.go` 337-621. Framing, zoom gate, edge smoothing, zoom, centre, Y and Z (steps 1-10 above).
- `reduceZoomSpeed`, `keepScreenEdge`, `keepStageEdge`, `hardLimit`: camera.go 623 onward (read). Zoom fraction, screen-edge margin, stage clamp.
- `Camera.Update`: camera.go 278-285. Scale and screen position from the action result.
- `Char.track`: `/mnt/frankendom-donors/ikemen-engine-Ikemen-GO/src/char.go` 12778-12840. Feeds the extremes (per character, flagged by move-camera).
- `System.action` camera section: `/mnt/frankendom-donors/ikemen-engine-Ikemen-GO/src/system.go` 2829-2940. Reset, character update and track, camera action, camera update.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Dead-zone framing: move the view only when the tracked extreme is inside the edge minus `tension`; the target keeps the view width | `tension` default 50 px at 320 wide, scaled by gameWidth/320 (theirs, camera.go 85 and 358); the stage file overrides it (stage.go 1273) |
| Edge smoothing: close 5% of the gap per logic tick, scaled by logic speed and a per-stage speed (1 by default, clamped 0..20) | 0.05 (theirs, camera.go 551); tensionvel default 1 (camera.go 77-97 block); clamp 0..20 (camera.go 167) |
| Snap step: a fixed minimum step per tick, so the view arrives instead of crawling | gameWidth/3200 (theirs, camera.go 556) |
| Leader speed floor: the view keeps pace with the fastest tracked edge | Uses the tracked velocities (char.go 12799-12813), no constant of its own |
| Zoom-in hold: after a failed fit, wait `zoomindelay` ticks before zooming in | default 0 (theirs, camera.go 89); stage override (stage.go 1327) |
| Zoom speed fraction per tick (1 = off) | default 1 for zoomin and zoomout speeds (theirs, camera.go 89) |
| Logic-speed normalisation: `60 / logic speed` multiplies the per-tick move | 60 (theirs, camera.go 544; system.go 4460 sets the logic speed as 60 + step) |
| Y smoothing mix | 0.85 / 0.15 (theirs, camera.go 487) |
| Z blend per tick | 0.05 (theirs, camera.go 595) |

## 4. TypeScript sketch

simplified: the sketch keeps the fight view's framing (step 1 with the donor's order and the width-keeping branch), the two-edge smoothing with the snap step and the leader speed floor, the zoom-in hold and the zoom speed fraction, in world units. It omits: the autocenter option, the Y-tension branch and the Y/Z smoothing (so there is no vertical follow), `keepScreenEdge` and `keepStageEdge` (the stage margins), the fit split between the two sides when zoomed out past the limit (the sketch clamps the scale instead), `reduceZoomSpeed`'s thresholds, `SaveRestoreTracking` (the sketch assumes tracked values are present), the pause and camerafreeze flags, and the follow and free views. The smoothing is a per-tick step with a three-iteration loop as in the donor, and the sketch's constants are named as data where the donor reads them from the stage file.

```ts
// Licence: MIT (donor, Ikemen GO). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Tracked { leftest: number; rightest: number; leftVel: number; rightVel: number; } // extremes of tracked fighters, world x
interface View { left: number; right: number; }
interface Bounds { minLeft: number; maxRight: number; zoomIn: number; zoomOut: number; }
interface ZoomGate { delayLeft: number; }

const TENSION = 50;          // zone data: dead-zone margin in world units (donor default 50 at 320 wide, times the local scale)
const TENSION_VEL = 1;       // zone data: smoothing speed, donor clamps it to 0..20
const SMOOTH = 0.05;         // engine: fraction of the gap closed per logic tick, times the logic scale and the speed
const SNAP_STEP = 0.2;       // engine: minimum step per tick in world units (donor: gameWidth / 3200)
const ZOOM_DELAY_TICKS = 0;  // zone data: ticks to hold before zooming in after a failed fit
const ZOOM_IN_SPEED = 1;     // zone data: fraction of a zoom-in step taken per tick; 1 = off
const ZOOM_OUT_SPEED = 1;    // zone data: fraction of a zoom-out step taken per tick; 1 = off

// Step 1: framing targets from the tracked extremes, with a dead zone of `tension` on each side.
function framingTarget(v: View, t: Tracked, b: Bounds, tension: number): View {
  let left = v.left;
  let right = v.right;
  if (t.leftest < left + tension) {
    const newLeft = Math.max(t.leftest - tension, b.minLeft);
    const diff = left - newLeft;
    left = newLeft;
    right = Math.max(v.right - diff, Math.min(t.rightest + tension, b.maxRight));
  } else if (t.rightest > right - tension) {
    const newRight = Math.min(t.rightest + tension, b.maxRight);
    const diff = right - newRight;
    right = newRight;
    left = Math.min(v.left - diff, Math.max(t.leftest - tension, b.minLeft));
  }
  return { left, right };
}

// Step 2: move one view edge toward its target; a small move is raised to the leading fighter's edge speed.
function stepEdge(oldEdge: number, target: number, posVel: number, negVel: number, lg: number, tv: number): number {
  let e = oldEdge;
  const snap = SNAP_STEP * lg * tv;
  for (let i = 0; i < 3; i++) {
    e = e + (target - e) * SMOOTH * lg * tv;
    const gap = target - e;
    if (Math.abs(gap) <= snap) e = target;
    else e += gap > 0 ? snap : -snap;
  }
  const d = e - oldEdge;
  if (d > 0 && d < posVel) e = Math.min(oldEdge + posVel, target);
  else if (d < 0 && d > negVel) e = Math.max(oldEdge + negVel, target);
  return e;
}

// Step 3: zoom toward the fit scale; a fraction of the change per tick when the speed is below 1.
function zoomStep(oldScale: number, fit: number, inSpeed: number, outSpeed: number): number {
  const speed = fit > oldScale ? inSpeed : outSpeed;
  if (speed < 0 || speed >= 1) return fit;
  return oldScale + speed * (fit - oldScale);
}

// One logic tick of the fight view: framing, edge smoothing, zoom gate, zoom step, centre.
function fightCameraTick(
  v: View, t: Tracked, b: Bounds, oldScale: number, gate: ZoomGate,
  gameWidth: number, logicSpeed: number,
): { view: View; scale: number } {
  const lg = 60 / logicSpeed;
  const target = framingTarget(v, t, b, TENSION);
  let left = stepEdge(v.left, target.left, t.rightVel, t.leftVel, lg, TENSION_VEL);
  let right = stepEdge(v.right, target.right, t.rightVel, t.leftVel, lg, TENSION_VEL);

  let fit = Math.min(gameWidth / (right - left), b.zoomIn);
  if (fit > oldScale) {
    if (gate.delayLeft > 0) { gate.delayLeft -= 1; fit = oldScale; }
  } else {
    gate.delayLeft = ZOOM_DELAY_TICKS;
  }
  const scale = Math.max(b.zoomOut, zoomStep(oldScale, fit, ZOOM_IN_SPEED, ZOOM_OUT_SPEED));
  left = Math.max(left, b.minLeft);
  right = Math.min(right, b.maxRight);
  return { view: { left, right }, scale };
}
```

## 5. Lands in

- TARGET `src/fight/camera.ts` (client-only world camera; the engine never reads it). The framing rule applies to the world camera only. The Pit camera is frozen and tuned, and this donor view is side-on: do not change the Pit with it. Parity-checklist row 11 (fight camera). Row 11 is the only row this lands in; the engine tick (row 18) is unchanged.
- Reuse tag: rewrite-from-idea (MIT; code may be adapted, this sketch is clean-room)
- Brief rule served: camera is client-only (the camera reads tracked fighter positions from the engine, never writes them); row 11; the logic-speed normalisation keeps camera speed the same on any tick rate (row 18 sub-line for the tick)
Best transferable idea: Frame the world camera on the extremes of all tracked enemies and the hero (a dead zone of a fixed margin on each side, so the view moves only when someone reaches the margin), and normalise its smoothing by the tick rate.
Decision (proposed): adapt - take the dead-zone framing over every tracked fighter for the world camera's many-on-one case (not the side-on edges, not the Pit); keep the tick-normalised smoothing.
Acceptance: client unit test on the world camera: with the hero and three enemies in a zone, after 60 ticks the view contains every tracked fighter inside the margin; a fighter that stays inside the dead zone does not move the view; the Pit camera output is unchanged (a frozen-snapshot test).

## 6. Gaps and risks

- The donor is a 2D side-on arena with stage bounds, so the framing and the zoom work in one dimension. The world camera is 3D and third-person: shoulder offset, pitch and yaw, collision pull-in and lock-on are all absent here and must come from elsewhere (not in this donor).
- Edge speed floor: the view keeps pace with the fastest tracked edge. In Frankendom a fast enemy leaving the frame would push the camera; a cap on the floor is needed (the donor has none). Not tested here.
- The donor's tension and zoom values are per stage (stage file keys, stage.go 1273-1327). In Frankendom these are zone data, but the Pit must keep its own frozen values.
- The Z smoothing and vertical follow are not carried over; the Y branch was only read in part.
- MIT: the code may be adapted; this note still uses a clean-room sketch and names the donor only for shape.
- Tick order: `ResetTracking`, character update and track, then the camera (system.go 2835, 14063-14067, 2929). The character update is read as running before the camera in `System.action` (system.go 2909-2929), but the exact path through `charUpdate` was not traced.
