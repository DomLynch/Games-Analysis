# opentibiabr-otclient (camera, cell 14)

Donor: `/mnt/frankendom-donors/opentibiabr-otclient/src/client/mapview.cpp` | Licence: MIT (`LICENSE` line 1: "OTClient is made available under the MIT License") | C++ with Lua bindings | symbol `MapView::getCameraPosition`

Checked: The list hint (`uimap.h`) is only a thin wrapper that forwards to MapView. The real camera is in `mapview.cpp` (follow, custom position, drag move, draw offset, viewport), `creature.cpp` (walk offset, step timing, per-frame updates), `localplayer.cpp` (predicted steps) and `map.cpp` (notify). Read end to end for the camera path: high confidence on the 2D mechanism. Not read: where `Creature::m_position` is written (the step does not set it in `Creature::walk`), the input handler that calls `MapView::move`, the `m_walkTimer` clock type, and `DrawPool::FPS60` (value). This is a 2D tile camera. camera_scope: world camera (follow in the open map); the pit/arena camera is not in this donor.

## 1. Mechanism

- The camera is a `MapView` (one per map widget). Its tile is `getCameraPosition()` (mapview.cpp 1034): the followed creature's tile while following, otherwise a free custom tile.
- Following needs two things (mapview.h 63): a followed creature and the `m_follow` flag. `followCreature` (mapview.cpp 737-754) marks the creature as camera-following, clears `m_lastCameraPosition` and sets `m_follow = true`. `setCameraPosition` (756-765) clears the mark, sets `m_follow = false` and drops the followed creature, so the camera is free and no longer moves with the character.
- The visual glide is the walk offset, not the tile. The creature's tile is the step's destination (inferred: `updateWalkingTile` tests the tile under `getPosition()` plus the offset). `Creature::walk` (512-540) records from/to, restarts `m_walkTimer` (527) and calls `nextWalkUpdate`. `updateWalk` (808-830) computes pixels walked = elapsed ticks / ticks-per-pixel, capped at one tile (810-812). `updateWalkOffset` (727-739) turns that into a pixel offset that starts one whole tile back (opposite to travel) and falls to zero. `terminateWalk` resets it to zero (852). The map view adds this offset to its draw origin while following (mapview.cpp 836-837), so the picture slides from the previous tile to the new one over the step.
- Update cadence. `nextWalkUpdate` (805): if the creature is camera-following it reschedules through the dispatcher's `addEvent` (run on the next dispatch, not a timed schedule); otherwise it reschedules at `m_stepCache.walkDuration`. When the offset changes for a followed creature, `updateWalk` calls `Map::notificateCameraMove` (823-824; map.cpp 109-117), which calls `MapView::onCameraMove` (mapview.cpp 542-548). That refreshes the map-position info and sets the viewport for the walk direction.
- Viewport (aware-range) widening, `updateViewportDirectionCache` (mapview.cpp 991-1032). Each direction has its own rectangle. Walking North or South adds one tile to top and bottom (1003-1004); East or West adds one tile to right and left; a diagonal adds one on all four sides. The idle case (`InvalidDirection`, 1023-1026) takes one off left and right. The widening is symmetric about the walk axis, not forward-only. `updateViewport` (mapview.h 189) copies the chosen rectangle into `m_viewport`, which the tile visibility check uses.
- Free-look. `MapView::move` (804-830) adds whole tiles to `m_customCameraPosition` (812) and keeps the sub-tile remainder in `m_moveOffset`. The remainder is drawn only when not following (mapview.cpp 837-838). Callers of `move` were not read.
- Predicted steps (the input side the camera follows). `LocalPlayer::canWalk` (localplayer.cpp 38-63): if the server reports a walk-max-steps value above zero, new steps are refused once the predicted queue is larger than that value (49-50); otherwise the position must equal the server position. `preWalk` (81-89) appends a predicted step and starts it with `Creature::walk`. `LocalPlayer::walk` (65-79), the server confirmation: if the new server position equals the front of the predicted queue, that step is popped; otherwise the queue is cleared and a normal server walk starts. `registerAdjustInvalidPosEvent` (106-113) clears the queue after min(max(step duration, ping) + 100, 1000) ms if nothing confirms it.
- Timing. The donor has no fixed simulation tick on the client. Step timing uses the walk timer's elapsed time (clock), and the followed creature is re-driven through the dispatcher rather than a timed schedule. The server beat only rounds the step duration (1140-1141). The followed local player gets +10 ms per queued predicted step, at least one (1156-1158), so even with an empty queue its step is 10 ms longer. The glide in `updateWalk` (810) reads `getStepDuration(true)`, which includes that term, so the camera glide of the followed local player is lengthened by it (and by the queue size). The "+10" branch is inside `getStepDuration` (1114-1162), whose other callers were not all read.

## 2. Key functions

- `MapView::getCameraPosition` (mapview.cpp 1034): following tile or custom tile.
- `MapView::followCreature` (mapview.cpp 737-754) and `MapView::setCameraPosition` (756-765): the only two functions in `mapview.cpp` that set `m_follow` (checked by grep of that file; other files not searched, and callers of these two not all read).
- `MapView::calcFramebufferSource` (from line 832; end not read): adds the walk offset while following, or the free-look remainder otherwise (836-838).
- `MapView::onCameraMove` (mapview.cpp 542-548) and `MapView::updateViewportDirectionCache` (991-1032).
- `Creature::updateWalk` (creature.cpp 808-830), `Creature::updateWalkOffset` (727-739), `Creature::terminateWalk` (832-860), `Creature::nextWalkUpdate` (788-806), `Creature::getStepDuration` (1114-1162), `Creature::walk` (512-540).
- `LocalPlayer::canWalk` (localplayer.cpp 38-63), `LocalPlayer::walk` (65-79), `LocalPlayer::preWalk` (81-89), `LocalPlayer::registerAdjustInvalidPosEvent` (106-113).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Step duration = 1000 x ground speed / creature speed (ms); returns 0 when speed < 1 (1116-1117); with the new speed law (`hasSpeedFormula()`) the divisor is the cached calculated step speed instead of speed (1136-1137) | `1000` (theirs, creature.cpp 1135; division at 1138) |
| Default ground speed when the tile has none | `150` (theirs, creature.cpp 1129) |
| Round step duration up to the server beat | Only for client 860 or the forced formula (theirs, 1140-1141) |
| Glide progress = elapsed time / ticks per pixel, capped at one tile | Tile size in pixels (`g_gameConfig.getSpriteSize()`, value not read) |
| Timer cap for updates of non-followed creatures | `DrawPool::FPS60` (theirs, creature.cpp 1146; value not read) |
| Predicted-step queue drop timeout | `100` pad and `1000` cap in ms (theirs, localplayer.cpp 112) |
| Predicted-step queue cap | `g_game.getWalkMaxSteps()` (server value, game.h 488; value not read) |
| Input backlog slows the followed step | `10` ms per queued step, minimum one (theirs, creature.cpp 1158) |
| Viewport widening per walk axis | `1` tile on both sides of the axis (theirs, mapview.cpp 1003-1004) |

## 4. TypeScript sketch

simplified: the sketch keeps the core shape: the camera's focus is the logical position, and it lags behind by the unfinished part of the step, measured by clock time. It omits the predicted-step queue and reconciliation, the new-speed-law divisor (the sketch always divides by speed; the donor uses the cached calculated step speed when `hasSpeedFormula()` is true, 1136-1137), the 10 ms per queued step term that also lengthens the followed player's glide (1156-1159), the `canWalk` dead, walk-lock and step-rate checks, the 10 ms per queued step penalty, the server-beat rounding, the diagonal speed factor, the walk-direction viewport widening, the free-look custom position and the pixel grid. It also swaps the donor's pixel offset for a vector lerp on the ground plane (world units). The shoulder offset and the rig are not in the donor and are not in the sketch.
```ts
// Licence: MIT (donor, OTClient). Clean-room sketch of the shape only: the camera target is the logical position, and the displayed focus lags it by the unfinished part of the step.
interface Vec2 { x: number; z: number; }

interface Step {
  from: Vec2;           // previous logical position (world units)
  to: Vec2;             // logical position, set when the step starts
  durationMs: number;   // full step duration
  startedAtMs: number;  // clock time when the step started
}

// Step duration as in the donor for the old speed law: 1000 * groundSpeed / speed, with 150 used when the tile has no ground speed.
// Donor guard: a speed below 1 gives 0. (With the new speed law the donor divides by a cached calculated speed instead; not modelled.)
function stepDurationMs(speed: number, groundSpeed: number): number {
  if (speed < 1) return 0;
  const g = groundSpeed === 0 ? 150 : groundSpeed;
  return (1000 * g) / speed;
}

// Focus used by the camera rig. At the start of a step it sits on the previous tile; it reaches the logical tile at the end.
function focusPosition(step: Step | null, logical: Vec2, nowMs: number): Vec2 {
  if (step === null) return logical;
  const raw = (nowMs - step.startedAtMs) / step.durationMs;
  const t = Math.min(1, Math.max(0, raw));  // frame-rate independent: uses clock time, not frames
  const behind = 1 - t;
  return {
    x: step.to.x + (step.from.x - step.to.x) * behind,
    z: step.to.z + (step.from.z - step.to.z) * behind,
  };
}

export {};
```

## 5. Lands in

- TARGET `src/fight/camera.ts` (new, client-only): the follow focus and the step glide. The engine never reads it. Parity-checklist row 11 (fight camera). Gap: there is no parity row for the world camera; this target and row are the nearest fit and Lead should decide the world-camera row.
- Reuse tag: adapt-allowed (MIT; the shape may be adapted, cite OTClient; this sketch is our own)
- Brief rule served: 1 (client-only camera reads engine state; the engine never reads the camera)
- Best transferable idea: Drive the world camera's focus from the character's logical position and let it lag by the unfinished part of the current step (measured by clock time), so it eases between tiles instead of snapping, and never moves the character.
- Decision (proposed): adapt - take the glide-over-the-step shape for the third-person world focus (a time-based lag from the previous tile to the new one over the step's own duration, with the target set when the step starts on the client), but do not take the 10 ms per queued input rule (it changes movement timing with the input backlog, which breaks one-engine timing) and do not take the walk-direction viewport widening (visibility of zone content belongs to zone data and the server).
- Acceptance: A player holds forward in a zone: the third-person focus eases over the step duration from the previous tile to the new one, reaches the tile at the end, and does not jump when the server confirms a matching move. A test asserts focus at 0%, 50% and 100% of a step equals the from point, the midpoint and the to point.

## 6. Gaps and risks

- The donor is a 2D tile grid. The pixel walk offset is one tile wide and only moves on one axis per step, so the 3D shoulder rig, collision pull-in, lock-on framing and FOV changes are all absent. Only the glide shape transfers.
- The donor's camera follows the predicted position, and the server confirms or rejects it after the fact (`LocalPlayer::walk`). Frankendom's rulings are server-verified: the camera may show predicted motion but must never change state or kill results, and a rejected prediction must snap the focus back, which the donor does by clearing the queue.
- The "+10 ms per queued step" timing belongs to input handling; in Frankendom it would make the fight step length depend on client input backlog. Reject for the fight (one engine) and keep camera timing out of the duel step.
- The viewport widening is a client render-range rule. Under zones as data, what the client renders is decided by zone data and what the server sends, so the widening must not be used to reveal content the server withheld.
- Clock source for the glide is not read (`m_walkTimer` type). Frankendom should use one clock for the focus lag and the server step, or the lag drifts on slow frames.
- Not read: the write site of `Creature::m_position`, the input handler that calls `MapView::move`, and the callers of `getStepDuration`. Any claim about those is absent from this note.

Reuse tag: adapt-allowed (MIT)
Brief rule served: 1 (client-only camera; engine never reads it); parity row 11


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** Step duration is stated and sketched as 1000*groundSpeed/speed, but Creature::getStepDuration 1136-1138 divides by m_calculatedStepSpeed instead when hasSpeedFormula() (new speed law), and returns 0 when speed<1 (1116-1117); the sketch ('as in the donor') divides by speed with no guard. Also the glide uses getStepDuration(true), which includes the +10ms*queued-steps term for the followed local player (1156-1159), so the glide is lengthened by it (note mentions +10 but not its effect on updateWalk 810). Verified: getCameraPosition 1034, followCreature 737-754, setCameraPosition 756-765, mapview.h:63 isFollowingCreature, nextWalkUpdate 805 addEvent vs scheduleEvent, updateWalk 808-830 (cap at sprite size 812, notificate 823-824), updateWalkOffset 727-739, terminateWalk offset reset 852, walk 512-540 (timer 527), viewport cache 991-1032 (N/S top+bottom, E/W left+right, diagonal all four, idle -1 left/right), onCameraMove 542-548, calcFramebufferSource 836-838, move 804-830, canWalk 38-63, walk 65-79, preWalk 81-89, adjust event 106-113 formula, 150 default (1129), FPS60=1000/60 (value not read by note), MIT line 1.

**Missed:** LocalPlayer::canWalk also returns false when dead or walk-locked and finally rate-limits on m_walkTimer.ticksElapsed() >= getStepDuration() (62); pixel-quantised integer walkedPixels with max() for paralyze (815)
