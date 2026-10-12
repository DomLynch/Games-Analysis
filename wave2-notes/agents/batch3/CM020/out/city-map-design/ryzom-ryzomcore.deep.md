# ryzom-ryzomcore (city-map-design, cell 3)

Donor: `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/client/src/interface_v3/group_compas.cpp` | Licence: GNU Affero General Public License version 3 (repo COPYING, "Version 3, 19 November 2007"; file header names the AGPL; copyleft: clean-room, shape only) | C++ | symbol `CGroupCompas::draw`

Checked: The hint file `nel/tools/3d/zone_painter/main.cpp` (2606 lines) was not opened. By its path it is a terrain-painting editor and is the wrong file for a runtime town layout; grep only. The real mechanism is the wayfinding compass, found by grep for minimap, landmark, town and road words. Read in full: `draw` (group_compas.cpp 252-448) and `updateCoords` (191-236). Read in part: header lines 1-10; `CCompassTarget` constructor (57-64); `setTarget` (486-508); `buildCompassTargetFromTeamMember` (557-579); `buildCompassTargetFromAnimalMember` (584-621); landmark sort predicate (648-651). Also `COMPASS_BLINK_TIME` (group_compas.h 36), `CompassMode` (main_loop.cpp 291), COPYING lines 1-2. Not read: `CGroupCompasMenu` landmark menu (625-1000), the position-tracker classes (`CTeammatePositionState`, `CAnimalPositionState`), `CCompassTarget::serial` (65-126), the user landmark struct (ryzom/client/src/continent.h 74-124), the world map UI (interface_v3/group_map.cpp, 4199 lines; grep only), the server side of the compass messages. camera_scope: n/a (not a camera cell; the compass reads the world camera direction in camera mode only). Confidence: high on the compass draw order and numbers (read end to end). Medium on target sources, since the tracker classes were not read.

Best transferable idea: Show one bearing arrow and a distance label to the current target, measured against a switchable reference (player facing or camera direction), where the target can be a live tracked point, a fixed point, or north.

Decision (proposed): adapt — the readout and the camera-or-facing switch fit a client-only HUD and the third-person camera; the (0,0) "no target" sentinel is replaced by null in our version.
Acceptance: With the compass in camera mode, a waypoint 100 m ahead reads "100 m - Waypoint" and the arrow points at it; orbiting the camera turns the arrow and turning the player does not; a waypoint at world (0,0) still shows.

## 1. Mechanism

Order of operations in `CGroupCompas::draw` (252-448), run every render frame (not a fixed step):

1. Reference heading (270-286). In camera mode (`_UseCameraObs._useCamera`, 271) the camera's projected forward is the matrix J axis (273); if its length is 0.01 or less, the K axis with z zeroed is used (274-277); the reference is atan2 of that vector (279-280). In facing mode the reference is atan2 of the entity's front (284-285). The mode is a client setting (`CompassMode`, main_loop.cpp 291).
2. Target position by type (288-352). North: user position plus (0, 1) (291). PosTracker: a live position read from the target's tracker each frame, stored in thousandths (296-300); if it reads (0,0), the target is replaced by North (303-307). Selection: the selected entity's position (312-323); no selection gives North (325-329). Home: the HOME_POINT database value, x in the high 32 bits and y in the low 32 bits (335-337), set only if not (0,0) (338-341), otherwise North (343-346). Default: the stored position (350).
3. Colour and blink (354-377). The colour comes from a per-type table (354). A new target blinks: the blend amount rises as 2 x time until half of COMPASS_BLINK_TIME (0.3 s, group_compas.h 36) and falls to 0 at the end (360-375). The blend uses the global time `TimeInSec`, so it is wall clock.
4. Arrow (381-391). Delta from user to target (388-389). Bearing is atan2(deltaY, deltaX) (390). Arrow rotation in degrees is (bearing minus reference) x 180 / Pi (391). The angle is not wrapped.
5. Distance label (393-431). Active only when a continent exists and it is not indoors (396-398). Distance is 2D Euclidean (402). Above 999 it prints kilometres with one decimal (409-412); otherwise metres with no decimals (414-418). The label is "distance - name" (419); for North it is the name only (421-424). The label is set only when it changes (425-429).
6. Tooltip (434-441) and container draw (447).

Server side (partly read). `setTarget` (486-504): if the previous target was dynamic (position tracker), it first sends `TARGET:COMPASS_NOT_DYNAMIC` once (488-500), then stores the target. Journal entries from the server add or remove compass entries (net_manager.cpp 2463-2485; not read beyond this).

## 2. Key functions

- `CGroupCompas::draw`: `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/client/src/interface_v3/group_compas.cpp` 252-448.
- `CGroupCompas::updateCoords`: same file, 191-236 (caches the arrow shape and text views).
- `CGroupCompas::setTarget`: same file, 486-504.
- `buildCompassTargetFromTeamMember`: same file, 557-579 (teammate tracker, built only when the entity id is non-zero and the name flag is set, 563).
- `buildCompassTargetFromAnimalMember`: same file, 584-621 (tracker only if the animal is spawned, 612).
- `UserLandMarksSortPredicate`: same file, 648-651 (landmark list sorted by lowercase title).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Bearing = atan2 of the delta; rotation = bearing minus reference | Degrees conversion 180 / Pi (group_compas.cpp 391) |
| Reference is camera direction or facing, chosen by a setting | Camera fallback threshold 0.01 on the J axis (274); camera mode 1 vs facing 0 (main_loop.cpp 291) |
| North pseudo-target one unit ahead on y | 1 unit (291) |
| Position target in thousandths | 0.001 scale (300, 340) |
| Sentinel (0,0) = no target | Literal 0 (303, 338) — defect, see section 6 |
| Distance label: metres below a threshold, kilometres above | Threshold 999 (409); km one decimal (411); m no decimals (416) |
| Blink blend: rise to half time, fall to zero | Blink time 0.3 s (group_compas.h 36); half split (367); peak blend 2 x 0.15 = 0.3 (derived) |

## 4. TypeScript sketch

simplified: keeps the donor's bearing and rotation rule, the camera-or-facing reference, the North pseudo-target, the metres and kilometres label and the blink curve. It omits the colour table and blend into the colour, the live tracker lookup (the caller passes the position), the Home and Selection cases, the indoor check, the tooltip and the server message. It changes one thing on purpose: "no target" is null, not the (0,0) sentinel.

```ts
// Licence: AGPL-3.0 (donor). Clean-room sketch of the shape only, written from the described mechanism, not a translation.

interface Vec2 { x: number; y: number; }
type Reference = 'facing' | 'camera';
interface Target { pos: Vec2 | null; name: string; } // pos null = no target, show north

const BLINK_TIME_S = 0.3;   // blink length for a new target
const KM_SWITCH_M = 999;    // above this distance the label switches to kilometres

// Arrow rotation in degrees (bearing to the target minus the reference heading) and the label.
// Facing mode uses the player's front; camera mode uses the camera's ground direction.
function compassReadout(
  player: Vec2,
  target: Target | null,
  mode: Reference,
  facingRad: number,
  cameraRad: number,
): { rotDeg: number; label: string } {
  const reference = mode === 'camera' ? cameraRad : facingRad;
  // No target: aim one unit ahead on y, the same as the donor's north pseudo-target.
  const aim: Vec2 = target !== null && target.pos !== null ? target.pos : { x: player.x, y: player.y + 1 };
  const dx = aim.x - player.x;
  const dy = aim.y - player.y;
  const rotDeg = ((Math.atan2(dy, dx) - reference) * 180) / Math.PI;

  if (!(target !== null && target.pos !== null)) return { rotDeg, label: 'North' };
  const dist = Math.hypot(dx, dy);
  const amount = dist > KM_SWITCH_M ? `${(dist / 1000).toFixed(1)} km` : `${dist.toFixed(0)} m`;
  return { rotDeg, label: `${amount} - ${target.name}` };
}

// Colour blend for a new-target blink. Rises to a peak at half time, then falls to 0 at BLINK_TIME_S.
// The peak is 0.3 (2 x 0.15), so the tint never reaches the full new colour; see section 6.
function blinkAmount(elapsedS: number): number {
  if (elapsedS >= BLINK_TIME_S) return 0;
  return elapsedS > BLINK_TIME_S * 0.5 ? 2 * (BLINK_TIME_S - elapsedS) : 2 * elapsedS;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file /tmp/CM020-ryzom-compass.ts: exit 0.

## 5. Lands in

- TARGET `origins/hud/compass.ts` (new client HUD module; the readout is client-only, the target positions come from server state). Parity-checklist row 14 (HUD: minimap and world map, wayfinding).
- Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
- Brief rule served: the camera and HUD are client-only (the reference heading comes from the client camera, the engine never reads it); target positions come from server state, not from the client.

## 6. Gaps and risks

- Defect, keep the idea and fix it: the "no target" sentinel is literal (0,0) for position trackers (group_compas.cpp 303-307) and for Home (338-346). A real waypoint at world (0,0) is shown as north. fix: use null for "no target" (sketch).
- Possible defect or design choice: the blink blend peaks at 0.3 (lines 369-375 scaled by 255), so the new-target tint is at most about 30 percent of the new colour. Not run; it may be intended. fix if a full flash is wanted: divide the blend by 0.3.
- Risk: the reference heading is the client camera's matrix (273). In Frankendom the camera is client-only, so the reference must come from the client camera; the engine must not read it.
- Risk: distance labels switch at 999 m and print "1.0 km" for 999.5 m. Harmless but noticed.
- Gap: the donor's arrow is a 3D shape. Frankendom's HUD may use 2D; the rotation rule is the same.
- Gap: the position trackers are client objects that read database values each frame. Frankendom's teammate or waypoint positions must come from server-verified state and be interpolated on the client; the tracker classes were not read, so their staleness rules are unknown.
- Not read (listed in Checked): the landmark menu and user landmark struct; the world map (group_map.cpp, 4199 lines), which is a separate candidate for a later cell.
- Licence: AGPL-3.0. Clean-room only; the sketch is written from the mechanism.

Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
Brief rule served: camera and HUD client-only; target positions from server state; parity row 14

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
- None. Verified draw, setTarget, tracker builders, blink and km derivations. Missed (minor, not claimed): selection branch mutates _Target.Name each frame (317-321); Default branch uses stored _Target.Pos (350).
