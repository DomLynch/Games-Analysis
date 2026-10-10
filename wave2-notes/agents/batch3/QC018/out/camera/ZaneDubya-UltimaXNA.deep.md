# ZaneDubya-UltimaXNA (camera, cell 14)

Donor: `/mnt/frankendom-donors/ZaneDubya-UltimaXNA/dev/Ultima/World/WorldViews/IsometricView.cs` (with `dev/Ultima/World/WorldView.cs`, `dev/Ultima/World/Entities/Mobiles/MobileMovement.cs`, `dev/Ultima/World/Entities/Mobiles/MovementSpeed.cs`, `dev/Ultima/World/Position3D.cs`) | Licence: GPL-3.0 (top-level `License.txt`, GNU GPL Version 3; most source headers say "version 3 of the License, or any later version"; a few say version 2 or later, e.g. `Position3D.cs` line 7) | C# (XNA) | symbol `CalculateViewport`

Checked: camera_scope: world camera. This donor is a FIXED-ANGLE ISOMETRIC view that is centred on the player; it has no yaw, pitch, zoom, collision or third-person rig. Confidence: medium. I read the viewport calculation end to end (IsometricView.cs 74-94 and 245-283) and the movement offset rule (MobileMovement.cs 151-240, with 1-60 for the fields); I read WorldView.cs 60-130 and MovementSpeed.cs 1-29 and Position3D.cs 1-80 in full. Only grep-level reads (not read in full): WorldModel.cs 204 and 217, EntityManager.cs 121, Mobile.cs 93, IsometricView.cs 152 (DrawEntities body), the game loop that calls Update and Draw (not read; I assume XNA's Update-then-Draw order). Nothing was executed. The verdict is STRONG on the target choice only; the projection itself does not transfer.

Best transferable idea: the camera target is the mover's drawn position (last whole cell plus the fraction of the current step, advanced by frame time), not the last whole cell, so the view glides continuously across a step.
Decision (proposed): adapt - take the drawn-position target and the frame-time progress with carry-over; reject the isometric projection (44 px tiles, 4 px per Z unit, altitude row offset) because a 3D third-person camera does not use it.
Acceptance: a client test samples the camera target every 16 ms across one 400 ms walk step and asserts it equals the hero's drawn position each sample, with no sample that jumps by more than one frame's share; in play the view has no stutter at cell edges.

## 1. Mechanism

- The view is a window on the player. Each draw, `WorldView.Draw` takes the player's `Position` as the centre (WorldView.cs 73) and passes it to the isometric renderer (124). `IsometricRenderer.Update` runs an under-entity check (92) and then `DrawEntities` with the same centre (93).
- `CalculateViewport` (IsometricView.cs 245-283) turns the centre into a window:
  (a) rows and columns: window height and width divided by the 44 px tile, plus overdraw (249-250).
  (b) altitude row: `firstZOffset = |(Z + Z_offset) / 11|` when Z > 0 (257). The first drawn tile is the centre minus the row count and that offset (260), with a diagonal correction (261-270). The donor's comments (254-255, 258) say the offset keeps lower tiles visible when the player is high, and that it lets tall objects draw before their ground tile is on screen.
  (c) screen offset: X gets the sub-tile term `(X_offset - Y_offset) * 22` subtracted (273); Y gets `(Z + Z_offset) * 4` added (278) and `(X_offset + Y_offset) * 22` subtracted (279), then the first-tile offset and the altitude row offset `firstZOffset * 44` (280-282).
- Mover (how the centre moves). `WorldModel.Update(totalMS, frameMS)` (204) calls `Entities.Update(frameMS)` (217); `EntityManager.Update` calls each entity's `Update(frameMS)` (121); `Mobile.Update` calls `m_movement.Update(frameMS)` (93). Inside `MobileMovement.Update` (151-240), the client entity first takes a queued move event: if it came from player input the move request is sent (173) and the goal cell is set at once (177), before any server reply (what the server answers, and how a correction is applied, was not read).
- Progress: while moving, `diff = frameMS / TimeToCompleteMove` (199) and `MoveSequence += diff` (201). The drawn offset is `(goal - current) * MoveSequence` (225-231), while the logical cell stays at the start of the step. When progress reaches 1 the cell is set to the goal, the offset is cleared and progress is reset to 0 in the same frame (234-236). The leftover time of that frame is dropped, not carried.
- Long moves (more than one cell away): the logical cell jumps in one update to within one cell of the goal on each axis (goal minus or plus 1, 205-222), so the drawn offset then covers the last cell only. Walking pacing for the local player uses `m_playerMobile_NextMoveInMS`, which counts down while moving (203) and is reset to 0 when a step completes (237-238); a move is also refused at zero stamina and a run is stripped below the minimum stamina (167-170).
- Step time: `TimeToCompleteMove` returns 400 ms for walking on foot (`(8/20)*1000`, MovementSpeed.cs 16) and 200 ms for running on foot (17); mounts use other values (18-19), not used here.
- The sub-tile fractions come from `Position3D`: `X_offset = Offset.X % 1`, `Y_offset = Offset.Y % 1`, `Z_offset = Offset.Z` (Position3D.cs 64-66).

## 2. Key functions

- `CalculateViewport`: `/mnt/frankendom-donors/ZaneDubya-UltimaXNA/dev/Ultima/World/WorldViews/IsometricView.cs` 245-283. The whole window: size, altitude row, first tile, screen offset.
- `IsometricRenderer.Update`: same file, 74-94. Order: under-entity check, then draw entities with the same centre and output offset.
- `WorldView.Draw`: `/mnt/frankendom-donors/ZaneDubya-UltimaXNA/dev/Ultima/World/WorldView.cs` 63-125 (player centre at 73; death fade and lighting code in between is not part of the camera).
- `MobileMovement.Update`: `/mnt/frankendom-donors/ZaneDubya-UltimaXNA/dev/Ultima/World/Entities/Mobiles/MobileMovement.cs` 151-240. Input queue, goal, progress, offset, snap.
- `MovementSpeed.TimeToCompleteMove`: `/mnt/frankendom-donors/ZaneDubya-UltimaXNA/dev/Ultima/World/Entities/Mobiles/MovementSpeed.cs` 21-27.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant | Unit | Where |
|---|---|---|---|
| Drawn position = cell + fraction of step | step progress 0..1 (MobileMovement 199-231) | ratio | engine constant |
| Walk step duration on foot | 400 ms (MovementSpeed 16) | ms | engine constant |
| Run step duration on foot | 200 ms (MovementSpeed 17) | ms | engine constant |
| Snap on arrival, leftover dropped | progress reset to 0 (MobileMovement 235-236) | none | engine constant (flaw to fix) |
| Isometric tile size | 44 px; half 22 px (IsometricView 29-30) | px | engine constant, iso only |
| Altitude lift on screen | 4 px per Z unit (IsometricView 278) | px | engine constant, iso only |
| Altitude row offset | Z / 11 rows (IsometricView 257) | count | engine constant, iso only |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's progress rule (progress += frame time over the step time) and the drawn position (from + (to - from) * progress). It changes one thing on purpose: the donor drops the leftover time when a step completes; the sketch does the same (to match the donor), and Section 6 says we should carry it. It omits the multi-cell catch-up (MobileMovement 205-222, a jump to within one cell of the goal), the NextMoveInMS pacing and the zero-stamina move refusal (155, 167-170, 203, 237-238), the client-side send of the move request (173), the under-entity check, overdraw, the isometric projection (44 px, Z times 4, the Z/11 row offset), and the integer casts in CalculateViewport. There is no view offset in the donor (the view is centred, offset zero); the sketch's `viewOffset` parameter is ours.

```ts
// Licence: GPL-3.0-or-later (donor License.txt; some headers GPL-2.0-or-later). Clean-room sketch of the idea, not a translation.
export interface Spot { x: number; y: number; z: number; }

// A step between two grid cells. progress runs 0..1 over stepMs (donor: 400 ms walking on foot).
export interface Step { from: Spot; to: Spot; progress: number; }

// Advance by elapsed frame time, as the donor does: progress += frameMs / stepMs.
// On completion the step snaps to the goal and the leftover time is dropped (donor does the same).
export function tick(step: Step, frameMs: number, stepMs: number): Step {
  const progress = step.progress + frameMs / stepMs;
  if (progress < 1) return { ...step, progress };
  return { from: step.to, to: step.to, progress: 0 };
}

// Drawn position of the mover: the cell it is leaving plus the fraction of the step covered.
export function drawnPosition(step: Step): Spot {
  const p = Math.min(Math.max(step.progress, 0), 1);
  return {
    x: step.from.x + (step.to.x - step.from.x) * p,
    y: step.from.y + (step.to.y - step.from.y) * p,
    z: step.from.z + (step.to.z - step.from.z) * p,
  };
}

// Camera target: always the drawn position plus a fixed view offset, never the last whole cell.
export function cameraTarget(step: Step, viewOffset: Spot): Spot {
  const d = drawnPosition(step);
  return { x: d.x + viewOffset.x, y: d.y + viewOffset.y, z: d.z + viewOffset.z };
}
export {};
```

## 5. Lands in

- TARGET `src/fight/worldCamera.ts` (new, client-only; the engine never reads it): the camera target is the hero's drawn position from the fight engine's step, plus the view offset. Parity-checklist row 11 (fight camera); the movement-progress part is the same client-side data that row 5 (controls) feeds.
- today: Frankendom's current world camera was not read in this pass.
- Reuse tag: adapt-allowed (GPL-3.0: clean-room only; shape only, no line-by-line translation; this sketch is a fresh rewrite of the idea)
- Brief rule served: 11 (fight camera, client-only); the camera never feeds the server.

## 6. Gaps and risks

- The donor does not answer the over-the-shoulder ask. It has no yaw, no pitch, no zoom, no collision, no lock-on, no shake and no FOV change. Grep for camera across the whole tree found nothing; `CreateLookAt` is absent, and the only projection is the 2D orthographic sprite batch (`SpriteBatch3D.cs` 73). The owner's world camera must be designed; this donor supplies only the target choice.
- Client prediction: the local player is moved before the server answers (MobileMovement 172-177). In Frankendom the server verifies. The camera may follow a predicted position, but it must snap to the server's position on a correction, and the donor's correction path was not read.
- Carry-over: the donor drops leftover time at a step end (MobileMovement 234-236). With variable frame time this makes the target lose up to one frame's worth of motion. Frankendom should carry the remainder into the next step.
- Altitude as screen pixels (IsometricView 278, times 4) is an iso projection detail. In 3D the camera should follow height in world units, with damping; do not copy the 4 px factor or the Z/11 row offset.
- Step times (400 and 200 ms) are the donor's movement rules, not zone data. Frankendom's hero step timing comes from the fight engine (checklist rows 1 and 4); the camera reads whatever the engine says is drawn.
- GPL-3.0: clean-room, shape only. Headers in some files say GPL-2.0-or-later (Position3D.cs line 7); the sketch is written fresh and copies nothing.
- Mounts (MovementSpeed 18-19) are not used by Frankendom and are left out.


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** Verified: CalculateViewport 245-283 incl. firstZOffset=|(Z+Z_offset)/11| when Z>0 (257), 44/22 tile consts (29-30), x/y offset lines 273-282, IsometricRenderer.Update 74-94, WorldView.Draw centre 73/124, MobileMovement progress 199-236, MovementSpeed 400/200 ms (16-17), Position3D 64-66, licence GPL3 / Position3D GPL2+. Error: 'Long moves (more than one cell away): the logical cell moves one cell toward the goal per update (205-223)'. Real code (205-222) sets the current cell to goal minus/plus 1 on each axis, i.e. it jumps to within one cell of the goal in one update, not one cell toward it. Also step end also resets m_playerMobile_NextMoveInMS = 0 (237-238) and walking pacing uses NextMoveInMS (155, 203), omitted.

**Missed:** Local-player movement is gated by stamina (167-170: no move at 0 stamina, running stripped below minimum); not camera-relevant but part of drawn-position rule. Step snap sets Offset to zero while the logical cell advances in the same frame.
