# cookgreen-OpenMB (input-touch-controls, cell 2)

Donor: `/mnt/frankendom-donors/cookgreen-OpenMB/OpenMB/Game/Controller/CharacterController.cs` (main), with `OpenMB/Game/CameraHandler.cs`, `OpenMB/Core/InputKeyMouseManager.cs`, `OpenMB/Map/GameMap.cs`, `OpenMB/Core/KeyMapperManager.cs`, `OpenMB/Core/EngineManager.cs` | Licence: GPL-3.0 (`LICENSE` at the repo root is "GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007"; `OpenMB/_RESTRICTED-NOTE.txt` says "RESTRICTED (copyleft GPL-3.0). Shape/idea only, clean-room.") | C# (Mogre/Ogre bindings) | symbol `CharacterController.updateBody`

Checked: Read in full: `CharacterController.cs` 18-30 (constants), 199-220 (camera rig setup), 280-343 (update and key handlers), 373-421 (mouse handlers), 422-491 (body update: turn and move), 503-507 (jump), 569-602 (camera follow and goal update); `CameraHandler.cs` (all 195 lines); `InputKeyMouseManager.cs` (all 84 lines); `GameMap.cs` 160-170 and 509-575 (key routing, Ctrl chord); `KeyMapperManager.cs` 33-115 (KeyCollection and its equality); `EngineManager.cs` 346-372 (hotkey dispatch). Not read: `CharacterController.cs` 88-198, 233-279, 487-502, 507-568, 603-688 (animation blending, physics setup, attach logic); the physics `Move` implementation; `Character.cs` beyond the grep hits (392-408); `GameObjectController.cs`, `Player.cs`. Confidence: high on the movement path (`updateBody`, key axis, turn cap) and on the camera rig (`updateCamera`, `updateCameraGoal`); medium on the jump landing, because the landing snap uses the collision flags from `Move` that were not read. Grep for joystick, gamepad, touch, deadzone, lock-on and input buffer over the C#, header and markdown files found nothing: the donor is keyboard and mouse only. camera_scope: "world camera" for the orbit rig in section 1 (third-person follow); the free camera in CameraHandler is a debug or editor camera and is not used for play.

Best transferable idea: Turn the character toward the camera-relative input heading at a capped rate (500 degrees per second, damped to 0.2 in the air) and keep moving along the new heading every frame, so a phone player never gets a snap turn and the body never stops to face the stick.

Decision (proposed): adapt - take the capped heading turn and the camera-relative input map as the one movement intake in `src/fight/input.ts`; keep the turn cap and air damping as data fields, and fix the three defects listed in section 6 in the sketch. Why: a phone virtual stick needs a heading that turns smoothly and does not snap; the donor's rule gives that with two numbers. The orbit camera stays client-only.
Acceptance: A phone player who holds forward while facing 180 degrees away sees the body turn over at most 500 degrees per second (about 0.36 s for 180 degrees, derived from the cap) and advance 17 units per second during the turn; a server test asserts that the per-tick heading change is never more than 500 times the tick dt.

## 1. Mechanism

Order of operations, per frame, for the player body (`updateBody`, 422-485), with `updateCamera` (569-578) running after it when the character is controlled:

- (a) Key state: W sets the local z axis to -1, S to +1, A to -1 on x, D to +1 (302-305). Releasing a key zeroes an axis only when that key's sign matches (328-331). If the vector is not zero and the body is not blocking (426), the goal direction is built from the camera's own axes: `keyDirection.z * cameraNode.Orientation.ZAxis + keyDirection.x * cameraNode.Orientation.XAxis` (429-430), with y set to 0 and the result normalised (431-432). So the input is camera-relative, not body-relative.
- (b) Turn: `toGoal` is the rotation from the body's Z axis to the goal direction; `yawToGoal` is its yaw in degrees (434-437). The step is `yawAtSpeed = sign(yawToGoal) * dt * TURN_SPEED` (439), with TURN_SPEED 500 (23). While jumping (`CAT_JUMP_LOOP`), the step is multiplied by 0.2 (441). The applied yaw is clamped so it never passes the goal: between 0 and `yawAtSpeed` (444-445). The body is yawed by that amount (447).
- (c) Move: the step distance is `dt * RUN_SPEED` with RUN_SPEED 17 (450). The displacement is a local +Z vector of that length (451), rotated by the body's orientation (456), and passed to `physicsController.Move` (459). The body's y is kept and its x and z are taken from the physics actor (460-463). This happens every frame that keys are held, including frames where the turn has not finished, so the body moves while it turns.
- (d) Vertical: when the base animation is the jump loop, the body is moved up by `verticalVelocity * dt`, and `verticalVelocity -= GRAVITY * dt` (466-470), with GRAVITY 90 (26). A jump sets `verticalVelocity = JUMP_ACCEL` with JUMP_ACCEL 30 (505). Landing is tested as `pos.y <= CHAR_HEIGHT * lastPosition.y` (473), and on landing the y is set to `CHAR_HEIGHT * lastPosition.y` (476). `lastPosition` is set once, at setup (133), and never updated in the read code.

Camera rig (controlled character only), so the camera is a third-person orbit behind the body:

- The pivot sits at the body position plus up `CAM_HEIGHT` = 2 (572). The goal node is a child of the pivot at local (0, 0, 15) (203), so the goal is 15 units behind the pivot.
- Each frame the camera node moves toward the goal by `goalOffset * dt * 9` (574-575): a linear factor of 9 per second, scaled by dt. The camera always looks at the pivot (577).
- Mouse input: `updateCameraGoal(-0.05 * X.rel, -0.05 * Y.rel, -0.0005 * Z.rel)` (377). Yaw is applied on the world axis (582). Pitch is applied on the local axis only while `pivotPitch` stays inside the bound (585-590). The zoom moves the goal along its local z by `deltaZoom * dist` (592-599), where `dist` is a dot product of two world positions (592), and the zoom is applied only while `dist` stays inside the bounds 8 and 25 (596-598).

Input routing (for context): the game map sends keys to the player agent, or to the free camera when no agent exists (GameMap.cs 547-554). Left click in the free camera cycles the follow target through the agents with wrap (CameraHandler.cs 54-73).

Tick: the body and camera update run in `update(float deltaTime)` (280-297), which is a variable step: the turn and move steps are per-second rates multiplied by that dt. The caller of `update` was not read, so whether the engine uses a fixed step is (not read).

## 2. Key functions

- `updateBody` (turn, move, jump): `/mnt/frankendom-donors/cookgreen-OpenMB/OpenMB/Game/Controller/CharacterController.cs` 422-485.
- Key axis: same file 299-342 (`injectKeyDown` 299-324, `injectKeyUp` 326-342).
- Camera follow and goal: same file 569-601 (`updateCamera` 569-578, `updateCameraGoal` 580-601); rig setup 199-218.
- Constants: same file 20-26.
- Free camera (debug or editor): `/mnt/frankendom-donors/cookgreen-OpenMB/OpenMB/Game/CameraHandler.cs` 39-182.
- Ctrl chord latch: `/mnt/frankendom-donors/cookgreen-OpenMB/OpenMB/Core/InputKeyMouseManager.cs` 10-83 and `/mnt/frankendom-donors/cookgreen-OpenMB/OpenMB/Map/GameMap.cs` 509-571.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants (theirs) |
|---|---|
| Camera-relative input vector from two keys | Axes from W/S and A/D (CharacterController.cs 302-305); camera Z and X axes (429-430). |
| Turn toward the goal heading at a capped rate, never overshooting | TURN_SPEED 500 deg/s (23); clamp at 444-445. A 180-degree turn takes at least 0.36 s (180 / 500, derived). |
| Turn damping in the air | 0.2 while in the jump loop (441). |
| Move along the new heading every frame | RUN_SPEED 17 units/s (22, 450). |
| Jump and gravity | JUMP_ACCEL 30 (25, 505); GRAVITY 90 (26, 470). |
| Camera pivot height, goal offset | CAM_HEIGHT 2 (21, 572); goal offset (0, 0, 15) (203). |
| Camera ease toward goal | 9 per second, linear times dt (575). Overshoots when 9 * dt is above 1 (dt above about 0.111 s) and diverges when above 2 (dt above about 0.222 s). |
| Pitch limits | Upper 25 and lower -60 (585-586), in the donor's own units (degrees assumed; not confirmed). |
| Zoom limits | 8 and 25 (596-597), applied to a dot product (592). |
| Mouse sensitivity | 0.05 per pixel for yaw and pitch, 0.0005 per wheel step for zoom (377). |
| Free camera | 10 units per key event (CameraHandler.cs 115), divided by 10 per frame (181); mouse yaw 0.1 per pixel (46). |

## 4. TypeScript sketch

simplified: keeps the donor's turn order (cap by dt and air factor, never past the goal, then move along the new heading) and the camera-relative axis mapping. The axis function is my fix for the donor's per-key overwrite (defect 4 below), not donor code. It omits the jump and gravity, the physics collision move, the animation blending, the mouse and camera rig, the zoom and pitch limits, and the landing test. The heading convention (x = sin, z = cos, heading 0 along +z) is my choice. Typechecked on the VPS (`npx -p typescript tsc --noEmit --strict --target es2020`): exit 0.

```ts
// Licence: GPL-3.0 (donor, cookgreen OpenMB; _RESTRICTED-NOTE.txt). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
// Constants as in the donor (not copied verbatim): turn cap 500 deg/s, run speed 17 units/s,
// turn damping 0.2 while airborne. The donor's values are read from CharacterController.cs 22-23 and 441.
const TURN_SPEED_DEG = 500;
const RUN_SPEED = 17;
const AIR_TURN_FACTOR = 0.2;

// Wrap a heading into (-180, 180].
export function wrapDeg(a: number): number {
  let x = ((a % 360) + 360) % 360;
  if (x > 180) x -= 360;
  return x;
}

// One frame of heading: turn toward the goal heading by at most the cap, never past it.
export function stepHeading(headingDeg: number, goalDeg: number, dt: number, airborne: boolean): number {
  const toGoal = wrapDeg(goalDeg - headingDeg);
  if (toGoal === 0) return headingDeg;
  const cap = TURN_SPEED_DEG * dt * (airborne ? AIR_TURN_FACTOR : 1);
  const turn = Math.sign(toGoal) * Math.min(Math.abs(toGoal), cap);
  return wrapDeg(headingDeg + turn);
}

// Move along the (already turned) heading. Convention chosen here: heading 0 points along +z.
export function moveStep(x: number, z: number, headingDeg: number, dt: number): { x: number; z: number } {
  const r = (headingDeg * Math.PI) / 180;
  return { x: x + Math.sin(r) * RUN_SPEED * dt, z: z + Math.cos(r) * RUN_SPEED * dt };
}

// Fix for the donor's per-key overwrite (CharacterController.cs 302-331): derive the axis from the
// set of held keys each frame, so releasing one key does not zero a key that is still held.
// Opposite keys cancel. Mapping as in the donor: W = -z, S = +z, A = -x, D = +x.
export function axisFromHeld(held: Set<string>): { x: number; z: number } {
  const x = (held.has("D") ? 1 : 0) - (held.has("A") ? 1 : 0);
  const z = (held.has("S") ? 1 : 0) - (held.has("W") ? 1 : 0);
  return { x, z };
}

export {};
```

## 5. Lands in

- TARGET `src/fight/input.ts` (the one controls intake; heading step and held-key axis). Parity-checklist row 5 (controls/input). The heading step is engine code so that the server and the client run the same step.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: one engine (the heading step lives in the engine; touch and keyboard are clients); rules 7-9 n/a

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism, not from the donor lines.
- Server verification: the donor moves on the client (`physicsController.Move`, 459) with no server check in the read code. Frankendom must run `stepHeading` and the move step on the server with the same constants, and reject a per-tick heading change above 500 times the tick dt.
- Defect 1 (keep the idea): the camera ease is `goalOffset * dt * 9` (575), a linear factor. It overshoots above dt of about 0.111 s and diverges above about 0.222 s. Fix: factor = 1 - exp(-9 * dt), which stays between 0 and 1 for any dt.
- Defect 2 (keep the idea): the zoom bound is applied to a dot product of two world positions (592, 596-598), not to the distance from goal to pivot. Fix: dist = length(goalWorld - pivotWorld), and keep the 8 to 25 bounds on that distance.
- Defect 3 (keep the idea): the pitch check (585-586) blocks the whole step when the sum would pass the limit, so the camera stops up to one step short of the limit. Fix: clamp the step to the remaining travel, then apply it.
- Defect 4 (keep the idea): the key handlers overwrite one axis per key (302-305), and releasing a key zeroes its axis even when the opposite key is still held (328-331). Hold W, press S, release S: the z axis becomes 0 while W is still down. Fix: `axisFromHeld` in the sketch, computed from the held set each frame.
- Defect 5 (keep the idea, check first): the landing test and snap use `CHAR_HEIGHT * lastPosition.y` (473, 476), but the comment on CHAR_HEIGHT says it is a height above ground (20), and `lastPosition` is set once at setup (133). As read, the landing height is five times the spawn y. Fix: find ground by a downward cast or from the collision flags that `Move` already returns (`flag`, 459), then add a height offset to that ground y. Not run.
- Fragile, not a visible bug: `yawToGoal / Mogre.Math.Abs(yawToGoal)` (439) divides by zero when the body already faces the goal. It is harmless only because the yaw branches at 444-445 are skipped when `yawToGoal` is 0. Fix: compute the sign with a guard.
- No gamepad, touch, virtual stick, tap-to-move, lock-on or input buffer in this donor (grep, section Checked). Frankendom needs those from other donors, not from this one.
- Frankendom rulings: the orbit camera is client-only. The pitch and zoom limits and the ease constant are client tunables. The attack input body is commented out (413), so the donor has no active attack input to take.
- Landscape and portrait: not read; the donor is a desktop window.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: one engine (the heading step lives in the engine; touch and keyboard are clients); rules 7-9 n/a
