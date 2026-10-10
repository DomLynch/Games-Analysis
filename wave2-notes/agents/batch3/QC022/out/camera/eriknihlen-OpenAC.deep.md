# eriknihlen-OpenAC (camera, cell 14)

Donor: `/mnt/frankendom-donors/eriknihlen-OpenAC/src/AcDream.App/Rendering/RetailChaseCamera.cs` | Licence: MIT (LICENSE line 1 "MIT License"; grant text at line 5) | C# | class `RetailChaseCamera`

Checked: camera_scope world camera. Read in full: `RetailChaseCamera.cs` (637 lines), `ChaseCamera.cs` (the legacy path, 221 lines), `CameraDiagnostics.cs` (Core), `PhysicsCameraCollisionProbe.cs`, `CameraFrameController.cs`, `CameraController.cs`. Read the input and target callers: `CameraPointerInputController.cs` (288, 458-476), `CombatCameraTargetSource.cs`, `WorldSelectionQuery.cs` (505-510). Grep for shoulder, shake, recentre, impact and combat FOV in the camera code found nothing (the only FOV setter is the game-FOV setting). Not read: `PhysicsEngine.ResolveWithTransition` and `AdjustPosition` (so I cannot confirm the sweep resolves the way the comments say), `controller.PresentedDeltaSeconds`, the default mouse `Sensitivity`, `RetailFieldOfView`, and the camera tests. Confidence: high on the pose, damping and call order; medium on the wall sweep's real behaviour.

Best transferable idea: Damp the eye toward the wanted boom spot, but start each step from the wall-clamped eye, and fade the player's body when the eye is within 0.45 m of the pivot.
Decision (proposed): adapt - the donor centres the boom on the player with no shoulder offset, so the over-the-shoulder view has to be added; keep the damped pull-in, the wall sweep and the near-wall fade, and do not copy the donor's raw numbers.
Acceptance: In a zone the character walks into a wall and the camera stops at the wall while the wanted eye stays on the boom line; a client test asserts the published eye is closer to the pivot than the boom length, and body translucency is 1 when the eye is within 0.20 m of the pivot.

## 1. Mechanism

- One camera object turns a pivot, a boom and a damper into the eye and look-at point. Inputs per frame: player position, player yaw, velocity, contact state and the contact plane normal, the frame delta, the player's cell, the player's entity id and an optional tracked target point. Output: `Position`, `View`, and `PlayerTranslucency`. The engine never reads any of this (client only).
- Driver: `CameraFrameController.Tick` calls `retail?.Update(...)` (`CameraFrameController.cs` 130-139), after input adjustments (76-93, 113-114) and only if the player frame is presented (116-117). The delta is `controller.PresentedDeltaSeconds` (123, passed at 136). Not read: how often `Tick` runs relative to rendering.
- Order of steps inside `Update` (`RetailChaseCamera.cs` 93-180):
  (a) Pivot = player position + `PivotHeight` (1.5), line 104.
  (b) Heading. If a lock-on point exists, heading = normalised pivot-to-target (125, 481). Otherwise heading = player facing (126-131), optionally tilted onto the ground normal (see below).
  (c) Target pose (133-139). Head view uses `ComputeInHeadPose`. Look-down and map use `ComputeTargetDirectionPose`. The normal orbit uses `ComputeDesiredPose`: boom forward = frame forward turned by the yaw offset (499-500), eye = pivot - boomForward x (distance x cos pitch) + up x (distance x sin pitch) (504), look-at = eye toward the pivot.
  (d) Damping (141-158). First frame: snap to the target. After that, translation lerps from the last published eye with alpha = clamp(0.45 x dt x 10) (151-153, 591); the forward vector lerps the same way with the rotation stiffness and is renormalised (152-154). Then a convergence park (156-157, 602-603): if both eye and forward are within a tiny epsilon of the published values, the eye is held exactly.
  (e) Wall pull-in (160-173). If `CollideCamera` and a probe exist (162), `SweepEye(pivot, soughtEye, ...)` returns the swept eye (164). The published eye is the swept eye (165, 173). The sought eye is overwritten by the swept eye only when the probe reports cell 0 (167-169), which is the fallback path. The next frame's lerp starts from the swept (published) eye (153, 173).
  (f) Translucency (178-179): distance from published eye to pivot, mapped linearly to 0..1 between 0.45 m (0) and 0.20 m (1) (629-635).
- The probe (`PhysicsCameraCollisionProbe.cs`): sphere radius 0.3 (8). Cell 0 returns the player position at once (16). Otherwise both ends of the sweep are lowered by the radius (26, 42), a single sphere with no step-up and no step-down (33, 35), and the player's own entity is skipped (40). If the sweep is not Ok, it tries `AdjustPosition` at the desired eye (46), and failing that returns the player position (50). Outdoors, an eye under water is lifted to the surface plus radius (`KeepAboveWater`, lines 60-66).
- Input between frames (not part of `Update`):
  - Mouse orbit while the right button is held (`CameraPointerInputController.cs` 458-470): yaw += -sign x filtered dx x sensitivity x 0.0667 x 8 degrees; pitch likewise from dy. Derived: about sensitivity x 0.0093 rad per pixel.
  - Keys (`CameraFrameController.cs` 76-93): each held frame adds `CameraAdjustmentSpeed` (40) x dt as an adjustment. Derived at 60 fps: about 0.67 adjustment units per frame, so about 5.3 degrees of orbit or pitch per frame (about 320 degrees per second), and a distance scale of 1 + 8 x dt per frame.
  - Wheel (`CameraPointerInputController.cs` 288): `AdjustDistance(-direction x 0.8)`, so one tick scales the distance by 0.84 or 1.16 (217).
  - Limits: a shrink is refused at or below 0.5 (222, 25). A write is refused unless |x| and |y| are under 10 and z is between -1.8 and 450 (26-28, 401-410). Derived: with yaw 0 the boom can reach about 10 m / cos(pitch). Some setters (defaults, look-down, map at 450) write the boom directly without these checks (291-300, 329-343).
  - Mouse filter (414-422, 607-625): if the previous sample on the same axis is within 0.25 s, output = 0.75 x raw + 0.25 x previous; otherwise output = raw. It uses the wall clock (`_clock.NowSeconds`, `CameraPointerInputController.cs` 467).
- Head view: the rotate command does not move the eye. It is collected (258-261) and handed to the character as a turn of 8 degrees per step (272-280, `CameraFrameController.cs` 113-114).
- Slope alignment (108-118, 435-466): the heading is projected onto the ground normal (when on contact) or onto a plane derived from averaged velocity (when airborne). It runs only when `AlignToSlope` is set (13), the view is not look-down or map, and either head view or no tracked target with the orbit within 1 m of side offset (473). The velocity ring holds five samples (79, 117-118). Quirk: the tilt is skipped unless both averaged X and Y components are above 2e-4 (443-444), so pure X or pure Y motion gives no tilt.
- Tick: the camera is driven by the presented frame delta, not a fixed step. The damping alpha is linear in dt, so it is only approximately frame-rate independent (see section 6). The mouse filter uses wall-clock seconds.

## 2. Key functions

- `RetailChaseCamera.Update`: `/mnt/frankendom-donors/eriknihlen-OpenAC/src/AcDream.App/Rendering/RetailChaseCamera.cs` 93-180. The whole pipeline in one place.
- `RetailChaseCamera.ComputeDesiredPose` (orbit eye): same file, 487-507.
- `RetailChaseCamera.ComputeDampingAlpha` and `ApplyConvergenceSnap`: same file, 589-605.
- `RetailChaseCamera.FilterMouseAxis`: same file, 607-625.
- `RetailChaseCamera.ComputeHeading` (slope tilt): same file, 427-467. `IsOrbitWithinAlignmentThreshold` at 470-474.
- `PhysicsCameraCollisionProbe.SweepEye`: `/mnt/frankendom-donors/eriknihlen-OpenAC/src/AcDream.App/Rendering/PhysicsCameraCollisionProbe.cs` 14-51.
- Legacy `ChaseCamera.Update`: `/mnt/frankendom-donors/eriknihlen-OpenAC/src/AcDream.App/Rendering/ChaseCamera.cs` 53-110, with no damping and no sweep; it is the fallback when `UseRetailChaseCamera` is off (`CameraController.cs` 24-26).
- Lock-on source: `CombatCameraTargetSource.cs` 32-41, `WorldSelectionQuery.cs` 505-510.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Boom pose: eye = pivot - back x cos(pitch) + up x sin(pitch) | Default distance 2.61, pitch 0.291 rad, pivot height 1.5 (theirs, RetailChaseCamera.cs 48, 50, 54; 2.61 is sqrt(2.5^2 + 0.75^2), derived from 10-11) |
| Frame-rate-aware lerp toward the wanted eye | Stiffness 0.45 for translation and rotation (theirs, CameraDiagnostics.cs 18, 20); alpha = stiffness x dt x 10, clamped (591) |
| Snap-to-rest when close enough | Epsilon 0.0004 on eye, 0.0002 on forward (derived from 75-76) |
| Wall pull-in: sweep a sphere from the pivot | Sphere radius 0.3 (theirs, PhysicsCameraCollisionProbe.cs 8) |
| Fade the body as the eye nears the pivot | Near 0.20, far 0.45 (theirs, RetailChaseCamera.cs 629-630) |
| Orbit by a fixed angle per input unit | 8 degrees per unit (theirs, 24); key speed 40 per second (theirs, CameraDiagnostics.cs 24); wheel 0.8 per tick (theirs, CameraPointerInputController.cs 288); scale 0.2 per unit (theirs, 23) |
| Mouse smoothing over a short window | Window 0.25 s (theirs, CameraDiagnostics.cs 22); weight 0.5 (theirs, CameraPointerInputController.cs 463-466) |
| Refuse writes that leave the valid range | Horizontal 10, vertical -1.8 to 450, minimum shrink 0.5 (theirs, RetailChaseCamera.cs 25-28) |
| Lock-on: face the target from the pivot | Target point is the entity position plus 0.5 up along its rotation (theirs, WorldSelectionQuery.cs 508-509) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (boom pose, then a damped lerp from the last published eye, then an injected wall sweep, then translucency). It omits the convergence park, the separate forward damper (here the look-at is the pivot plus the shoulder, not a damped forward), the head and look-down poses, the slope tilt and velocity ring, the mouse low-pass filter, the distance and pitch limits, the sweep's fallbacks and the water clamp. It adds a shoulder offset that is NOT in the donor, which is the over-the-shoulder view the owner asked for. The shoulder is a sketch addition, untested.

```ts
// Licence: MIT (donor, OpenAC). Clean-room sketch written from the described mechanism, not a line translation.
type V3 = { x: number; y: number; z: number };

const add = (a: V3, b: V3): V3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const sub = (a: V3, b: V3): V3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const mul = (a: V3, k: number): V3 => ({ x: a.x * k, y: a.y * k, z: a.z * k });
const lerp = (a: V3, b: V3, t: number): V3 => add(a, mul(sub(b, a), t));
const len = (a: V3): number => Math.hypot(a.x, a.y, a.z);
const norm = (a: V3): V3 => {
  const l = len(a);
  return l > 1e-9 ? mul(a, 1 / l) : { x: 1, y: 0, z: 0 };
};

export interface FollowTuning {
  boomDistance: number;     // metres from pivot to eye at rest (donor default 2.61)
  boomPitch: number;        // radians above horizontal (donor default 0.291)
  pivotHeight: number;      // metres above the player origin (donor default 1.5)
  shoulderOffset: number;   // metres right of the boom axis (NOT in donor; added for over-the-shoulder)
  stiffness: number;        // donor 0.45 for translation
  nearFade: number;         // metres: body fully translucent at or inside this (donor 0.20)
  farFade: number;          // metres: body fully opaque at or beyond this (donor 0.45)
}

// Injected wall test: returns the eye after a sphere sweep from the pivot toward the wanted eye.
export type WallSweep = (pivot: V3, wantedEye: V3) => V3;

export interface CameraFrame { eye: V3; lookAt: V3; bodyTranslucency: number; }

export class FollowCamera {
  private published: V3 | null = null;

  constructor(private readonly tune: FollowTuning, private readonly sweep: WallSweep | null) {}

  // dt in seconds. target: a single lock-on point (world coords) or null. yawOrbit: mouse/keys orbit in radians.
  update(player: V3, facing: V3, dt: number, target: V3 | null, yawOrbit: number): CameraFrame {
    const pivot = add(player, { x: 0, y: 0, z: this.tune.pivotHeight });

    // Lock-on replaces the facing with the direction from the pivot to the target.
    const fwd = norm(target ? sub(target, pivot) : facing);
    const right = { x: fwd.y, y: -fwd.x, z: 0 };          // forward x up (z-up frame)
    const boom = norm(add(mul(fwd, Math.cos(yawOrbit)), mul(right, -Math.sin(yawOrbit))));

    const horizontal = this.tune.boomDistance * Math.cos(this.tune.boomPitch);
    const vertical = this.tune.boomDistance * Math.sin(this.tune.boomPitch);
    const wanted = add(
      add(sub(pivot, mul(boom, horizontal)), { x: 0, y: 0, z: vertical }),
      mul(right, this.tune.shoulderOffset),
    );

    // Damp the eye toward the wanted spot. The step starts from the last PUBLISHED eye,
    // which is already pulled in by the wall sweep.
    const alpha = Math.min(1, Math.max(0, this.tune.stiffness * dt * 10));
    const sought = this.published === null ? wanted : lerp(this.published, wanted, alpha);

    const eye = this.sweep ? this.sweep(pivot, sought) : sought;
    this.published = eye;

    const lookAt = add(pivot, mul(right, this.tune.shoulderOffset));
    const d = len(sub(eye, pivot));
    const { nearFade, farFade } = this.tune;
    const bodyTranslucency = d >= farFade ? 0 : d <= nearFade ? 1 : 1 - (nearFade - d) / (nearFade - farFade);
    return { eye, lookAt, bodyTranslucency };
  }
}

export {};
```

## 5. Lands in

- TARGET `src/fight/camera.ts` (client-only third-person world camera; a new module, not checked against the Frankendom tree). Parity-checklist row 11 (fight camera). Row 11 is worded for the fight camera; the owner's world-camera request may need its own sub-line. Flagged for Lead.
- Reuse tag: adapt-with-notice (MIT: code may be adapted; keep the MIT notice; sketch written from the mechanism).
- Brief rule served: camera is client-only (the engine never reads it); every number above is a tunable client value, so it is data, not an engine constant; no pit camera is involved (the donor has none).

## 6. Gaps and risks

- Over-the-shoulder is NOT in the donor. The boom orbits the player's centre pivot (`RetailChaseCamera.cs` 104, 504) and no camera file has a lateral term (grep for shoulder found nothing). The owner's main ask is therefore not supplied by this donor; the sketch's shoulder offset is our addition and is untested.
- Lock-on frames one target only: `GetCombatCameraTargetPoint(selected)` (`CombatCameraTargetSource.cs` 41), gated on the "Keep in View" option and a targeted-attack mode (34-36). No framing rule for several enemies. Frankendom's many-on-one fight (MAX_ATTACKERS = 3) needs a framing rule that is designed, not copied.
- No combat zoom or FOV change, no shake, no impact punch, no recentring behind the character in the camera code. Do not claim any of these from this donor. The FOV is set only from the game-FOV setting (`CameraController.cs` 82, 103).
- Frame-rate: damping is alpha = 4.5 x dt per frame (derived). That is approximately exponential with a time constant of about 0.22 s for small dt, but it is not exact, and alpha reaches 1 (a hard snap) at dt of about 0.22 s or more (derived from 591-594). Frankendom should clamp dt and say what a long hitch does.
- Mouse filter, Y axis is unfiltered. Line 419 says "force within-window path for the Y axis", but the shadow timestamp is one second behind, so the Y call always takes the out-of-window branch (616-617) and returns raw input (derived; no test read). Do not copy this trick; if smoothing is wanted, filter both axes explicitly.
- Wall fallbacks: if the probe has no cell it returns the player's position (`PhysicsCameraCollisionProbe.cs` 16), and a failed sweep also falls to the player position (50). That puts the eye inside the character, a visible jump. Frankendom should keep the last valid eye instead.
- Sweep internals not read: `PhysicsEngine.ResolveWithTransition` and `AdjustPosition` are not read, so the claim that the sweep stops at walls rests on the call and its fallbacks only.
- Legacy path (`ChaseCamera.cs`): it has no damping and no sweep, but it does keep the camera height pinned while the player is airborne and rising, and follows only falls (62-70, 108). That jump-bob fix is a small idea worth taking; `RetailChaseCamera` does not have it. Frankendom should choose one.
- Key-driven orbit and zoom are fast (derived: about 320 degrees per second and 1 + 8 x dt per frame at 60 fps). Check them on a phone before adopting the numbers.
- Client-only: server kills and damage are unaffected. Lock-on depends on a client setting and selection (`CombatCameraTargetSource.cs` 34-36).
- Not run: no build, no visual check, no test read. Everything above is from reading the code.
