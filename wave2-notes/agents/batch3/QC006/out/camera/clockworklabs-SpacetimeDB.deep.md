# clockworklabs-SpacetimeDB (camera, cell 14)

Donor: `/mnt/frankendom-donors/clockworklabs-SpacetimeDB/demo/Blackholio/client-godot/CameraController.cs` | Licence: Apache License 2.0 (`demo/Blackholio/LICENSE`, read: header and terms; the repo root has no LICENSE file, only `licenses/apache2.txt` and `licenses/BSL.txt`) | C# (Godot) | symbol `CameraController._Process`

Checked: camera_scope: world camera (a 2D top-down follow camera in an arena; the framing idea transfers to a 3D world camera, the 2D projection does not). Read in full: `CameraController.cs` (1-49), `PlayerController.cs` (1-150), `GameManager.cs` 160-180 (camera creation). Also `CircleController.cs` 93, 112, 122 and `EntityController.cs` 28-53 (by grep and partial read). Not read: the entity interpolation body in `EntityController` (the lerp is set up at 41-42 but the per-frame step was not opened), the `Entity` row (mass source), `HudController` death screen, and when a `PlayerController` is freed. Confidence: high on the camera maths (derived by hand from the code, not run); medium on whether the zero-piece zoom state happens in play (not run; PlayerController lifetime not read).
Best transferable idea: Frame a player's group by the mass-weighted centre of its pieces and widen the view from the group's size (one fixed step once it has more than one piece), so the camera tracks a many-part fight without a fixed zoom.
Decision (proposed): adapt - take the group centroid framing and the size-driven zoom with a fixed step per added attacker (cap 3 = MAX_ATTACKERS); reject the mass term (Frankendom has no mass) and reject the unclamped lerp (we clamp); frame the group the hero is fighting, not the hero's own pieces.
Acceptance: In a zone fight the camera holds one rest framing for the hero alone; with one, two and three attackers engaged the frame widens by a fixed step per attacker (no more than three), the centre moves to the weighted middle of hero and attackers, and a client test asserts zoom is monotone in attacker count and every follow or zoom fraction is clamped to 1.

## 1. Mechanism

- The loop: Godot calls `_Process(double delta)` once per rendered frame (`CameraController.cs:21`). `delta` is the raw frame time; this file has no cap and no fixed step. Input is separate: the local player sends its direction at most 20 times per second (`PlayerController.cs:8`, `134`).
- Order inside `_Process`:
  1. Target. If connected, a local player exists and `TryGetCenterOfMass` succeeds, the target is the centre of mass (`24-26`). Otherwise it is the world centre, `WorldSize x 0.5` (`30-31`).
  2. Position. `GlobalPosition` moves toward the target by a fraction `delta x 8` (`34`). Nothing clamps the fraction.
  3. Guard. If there is no local player, return and leave the zoom alone (`36-38`).
  4. Size. `size = 10 + min(10, TotalMass / 5) + min(pieces - 1, 1) x 30` (`46-48`).
  5. Desired zoom = `50 / max(size, 1)` (`42`).
  6. Zoom moves toward the desired zoom by a fraction `delta x 2` (`43`). Nothing clamps this fraction either.
- Centre of mass (`PlayerController.cs:71-98`): sum of each owned piece's `GlobalPosition` times its entity mass, divided by the total mass. Pieces with no entity row are skipped (`83-84`). If total mass is 0 or there are no pieces it returns false (`73-77`, `90-94`).
- Pieces register and deregister with the player (`CircleController.cs:93`, `112`, `122`; `PlayerController.cs:54-65`). When the last owned piece of the local player is removed, the death screen is shown (`61-63`).

## 2. Key functions

- `CameraController._Process`: `/mnt/frankendom-donors/clockworklabs-SpacetimeDB/demo/Blackholio/client-godot/CameraController.cs` 21-44. Target choice, position lerp, guard, zoom.
- `CameraController.CalculateCameraSize`: same file, 46-48. The size formula.
- `PlayerController.TryGetCenterOfMass`: `/mnt/frankendom-donors/clockworklabs-SpacetimeDB/demo/Blackholio/client-godot/PlayerController.cs` 71-98. Mass-weighted centre.
- `PlayerController.TotalMass` and `NumberOfOwnedCircles`: same file, 67-69 and 25.
- `PlayerController.OnCircleDeleted`: same file, 59-65. Death signal when the last piece goes.
- Camera creation: `/mnt/frankendom-donors/clockworklabs-SpacetimeDB/demo/Blackholio/client-godot/GameManager.cs` 178.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Frame the centre of the group, weighted by each member's size | Weight = piece mass (theirs, `PlayerController.cs:86`, `96`). Frankendom has no mass; the weight would be a per-fighter field if we adopt it. |
| Zoom = base radius / group size, floored at size 1 | Base radius 50 (theirs, `CameraController.cs:6`); floor 1 (`42`). Derived zoom: 5.0 for one piece at mass 0 (size 10), about 1.25 with two or more pieces at mass 0 (size 40), 1.0 at size 50. |
| Size grows with group mass, capped | Base 10 (`46`); mass term min(10, mass / 5) (`47`), cap reached at mass 50 (derived). |
| One fixed step once the group is more than one (not per member) | Step 30 once 2 or more pieces (theirs, `48`). For Frankendom this would be per attacker, capped at 3. |
| Follow and zoom by a per-second rate times delta | Follow 8.0 (theirs, `CameraController.cs:9`, `34`); zoom 2.0 (`12`, `43`). Not clamped. |

## 4. TypeScript sketch

simplified: the donor has no clamp on the follow or zoom fraction, so the sketch clamps both to 1 (`fPos`, `fZoom`); the donor has no guard for zero pieces, so the sketch skips the zoom when there are none (in the donor that state gives desired zoom 50, see section 6); the mass term is kept as in the donor because the sketch shows the donor's size rule; the sketch reads positions and masses as plain inputs (the donor reads them from server rows and visual nodes); the world-centre fallback is the donor's fallback (`30-31`).

```ts
// Licence: Apache-2.0 (donor demo/Blackholio/LICENSE). Adaptable; this sketch is written from the mechanism, not copied from the donor.
// clean-room
interface Piece { x: number; y: number; mass: number; }     // one owned piece: position and mass from the server row
interface CamState { x: number; y: number; zoom: number; }
interface CamParams {
  baseRadius: number;   // visible radius the zoom aims for (zone data; donor 50)
  followSpeed: number;  // position follow rate per second (donor 8.0)
  zoomSpeed: number;    // zoom follow rate per second (donor 2.0)
  baseSize: number;     // size with one small piece (donor 10)
  massCap: number;      // max size added from mass (donor 10)
  massDivisor: number;  // mass per unit of size (donor 5)
  splitStep: number;    // size added once you own 2+ pieces (donor 30)
  worldCenterX: number; // fallback target when there is no piece
  worldCenterY: number;
}

// Mass-weighted centre of the owned pieces, or null when there is nothing to frame.
function groupCentre(pieces: Piece[]): { x: number; y: number } | null {
  let sx = 0, sy = 0, total = 0;
  for (const p of pieces) { sx += p.x * p.mass; sy += p.y * p.mass; total += p.mass; }
  if (total <= 0) return null;
  return { x: sx / total, y: sy / total };
}

function stepGroupCamera(st: CamState, pieces: Piece[], dt: number, p: CamParams): CamState {
  const c = groupCentre(pieces);
  const tx = c ? c.x : p.worldCenterX;
  const ty = c ? c.y : p.worldCenterY;
  // Simplified: a fraction clamped to 1 (the donor does not clamp; see section 6).
  const fPos = Math.min(1, dt * p.followSpeed);
  st.x += (tx - st.x) * fPos;
  st.y += (ty - st.y) * fPos;

  // Zoom only when there is at least one piece (simplified: the donor has no such guard).
  if (pieces.length === 0) return st;
  const totalMass = pieces.reduce((sum, q) => sum + q.mass, 0);
  const size = p.baseSize
    + Math.min(p.massCap, totalMass / p.massDivisor)
    + Math.min(pieces.length - 1, 1) * p.splitStep;
  const desiredZoom = p.baseRadius / Math.max(size, 1);
  const fZoom = Math.min(1, dt * p.zoomSpeed);
  st.zoom += (desiredZoom - st.zoom) * fZoom;
  return st;
}
```

## 5. Lands in

- TARGET `origins/client/world-camera.ts` (client-only camera module, not `src/fight/`). Parity-checklist row 11 (fight camera).
- Reuse tag: rewrite-from-idea (Apache-2.0; code may be adapted, we rewrite from the mechanism)
- Brief rule served: camera is client-only, the server does not read zoom or size; the world camera is the owner's priority (2026-10-10). Pit camera untouched.

## 6. Gaps and risks

- The donor is 2D, top-down and frames the player's own pieces. The framing and the widening rule transfer to a 3D world camera; the projection and the mass weighting do not. Frankendom's version must frame the hero and the attackers it is fighting (MAX_ATTACKERS = 3). That enemy term is our design, not in the donor.
- Unclamped fractions: the donor's follow overshoots once `delta x 8` exceeds 1, that is a frame longer than 0.125 s (below 8 fps); the zoom overshoots once `delta x 2` exceeds 1, a frame longer than 0.5 s. Derived from the weights, not run. Frankendom must clamp (the sketch does).
- Zero-piece state, derived from the code and not run: with a local player and zero owned pieces, `Min(pieces - 1, 1)` is -1, so size = 10 - 30 = -20, clamped to 1, desired zoom = 50 (`CameraController.cs:42`, `48`). Whether a `PlayerController` outlives a death in play was not read (`PlayerController.cs:37-52` clears `Local` only when it leaves the tree). Frankendom rule: a dead or empty hero never drives the camera; the death screen owns it.
- The centre uses the visual `GlobalPosition` of each piece, not the server row (`PlayerController.cs:86`). The per-frame interpolation of those nodes was not read (`EntityController.cs:41-42` sets the lerp start and target; the per-frame step was not read). For Frankendom, frame the rendered hero and attackers and say so in the fight record.
- Steering is mouse offset from the screen centre over a third of the screen height (`PlayerController.cs:141-143`). That ties the input origin to the camera centre. Do not copy this into the third-person camera; the donor is top-down and the rule is a 2D convenience.
- Camera values are client-only tuning. Expose base radius, rates and step as data with defaults; the server never reads them.

Reuse tag: rewrite-from-idea (Apache-2.0; code may be adapted, we rewrite from the mechanism)
Brief rule served: camera is client-only (owner ruling 2026-10-10)
