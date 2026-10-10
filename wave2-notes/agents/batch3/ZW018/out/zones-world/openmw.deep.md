# openmw (zones-world, cell 3)

Donor: `/mnt/frankendom-donors/openmw/apps/openmw/mwworld/positioncellgrid.cpp` (function `terrainPreloadPositions`, 9-26; constant in `positioncellgrid.hpp` 20) with its caller `Scene::preloadCells` in `/mnt/frankendom-donors/openmw/apps/openmw/mwworld/scene.cpp` 1136-1168 | Licence: GPL-3.0 (`/mnt/frankendom-donors/openmw/LICENSE`, "GNU GENERAL PUBLIC LICENSE, Version 3, 29 June 2007"; header and full text not all read) | C++ | symbol `terrainPreloadPositions`

Checked: `terrainPreloadPositions` read in full (positioncellgrid.cpp 1-27, header 1-27). Its caller `Scene::preloadCells` read in full (scene.cpp 1136-1168). Also read: `Scene::gridCenterToBounds` and `Scene::getNewGridCenter` (scene.cpp 549-571), `Scene::playerMoved` (573-585), the constants (`components/misc/constants.hpp` 25-32), the defaults in `files/settings-default.cfg` (66, 68-69), the preload dedupe and abort in `CellPreloader::setTerrainPreloadPositions` and `abortTerrainPreloadExcept` (cellpreloader.cpp 381-413) and `contains` (35-50), the camera mode enum (`apps/openmw/mwrender/camera.hpp` 29-35), and the six tests in `apps/openmw_tests/mwworld/testpositioncellgrid.cpp` (read in full). Not read: `CellPreloader::preload` and its work queue, the expiry logic behind `preload cell expiry delay`, `preloadExteriorGrid`, `playerMoved`'s caller, `ESM::positionToExteriorCellLocation` and `indexToPosition` (the helpers that turn a position into a cell index and back; the sketch assumes floor and a centre passed in), and what the Static camera mode means in the camera code. Confidence: high on the grid recentre rule, the predicted-position lookahead, and the camera anchor; medium on the preload dedupe, since I read the function but not the queue it feeds.

Best transferable idea: Recentre the streamed zone block only when the player leaves the current block by half a cell plus a fixed margin, and prefetch around a position predicted one second ahead from last frame's movement, so a player standing near a border does not reload on every step.

Decision (proposed): adapt - the hysteresis recentre and the predicted-position prefetch fit a fast browser game where zones are data and the client streams them; the detached-camera anchor does not fit, because Frankendom's world camera is an attached third-person follow and the mechanism only adds an anchor for a static, detached camera, and the camera is client-only anyway.

Acceptance: Walking a player back and forth across a zone border by a few yards (no crossing) raises no zone-block load event after the first one; a sprint toward a border starts loading the next zone block before the player reaches it (prediction time 1 s, settings-default.cfg 69); a test asserts both on a fixture zone grid.

## 1. Mechanism

Order of operations in `Scene::preloadCells`, called with the frame time `dt` (scene.cpp 1136-1168):

1. Frame-time guard: return if `dt <= 1e-06` (1138).
2. Read the player position. `moved = playerPos - mLastPlayerPos` (1142-1144). Predict: `predictedPos = playerPos + moved / dt * mPredictionTime` (1145). `mPredictionTime` is `Settings::cells().mPredictionTime`, default 1 second (scene.cpp 900; settings-default.cfg 68-69).
3. If the player is outside (exterior cell), build the terrain preload list (1147-1153): `terrainPreloadPositions(predictedPos, playerPos, camera.getPosition(), camera.getMode() == Static, gridCenterToBounds(getNewGridCenter(predictedPos, nullptr)), worldspace)`. Note that this centre is recomputed from the predicted position with no hysteresis (the `nullptr` argument, scene.cpp 555-571 with no current centre), so the terrain list follows the predicted cell directly.
4. Inside `terrainPreloadPositions` (positioncellgrid.cpp 9-26): the primary anchor is always returned (12). If the camera is not detached, that is the whole list (13-14). If it is detached, take the 3D distance from player to camera (16). When that distance is at least 128 (`terrainPreloadMergeDistance`) and less than one cell (17), add a second anchor: the camera position snapped down to a 128-unit lattice on each axis (20-23). The comment at 19 says the snapping keeps an orbit's preload from restarting.
5. Store the last player position (1155); run the optional preloads (door destinations on the predicted position, the exterior grid around the predicted position, and fast-travel destinations) (1157-1165).
6. Hand the terrain list to the preloader (1167). `CellPreloader::setTerrainPreloadPositions` returns early when every new anchor is within 128 of an existing one with the same grid bounds (cellpreloader.cpp 400-401). If a preload is running and the bounds differ, it aborts the running load and clears the list (402-412).

Grid recentre with hysteresis, the real world grid (not the terrain list), in `getNewGridCenter` (scene.cpp 555-571) and `playerMoved` (573-585):

- If the grid already has a centre, measure the Chebyshev distance in x and y from the centre cell's world position to the player (563). The threshold is `cellSize / 2 + mCellLoadingThreshold` (565), where `mCellLoadingThreshold` is 1024 (scene.cpp 894). While the distance is within it, the old centre is kept (566-567).
- Otherwise the centre moves to the cell under the player (569-570). `playerMoved` only changes the grid when the returned centre differs (582-584).
- The grid bounds are the centre plus or minus `mHalfGridSize` cells, upper edge exclusive (549-552). `mHalfGridSize` is `Constants::CellGridRadius` = 1 (so 3 by 3 cells) for normal cells, or `ESM4CellGridRadius` = 2 (5 by 5) for ESM4 cells (scene.cpp 852; constants.hpp 29, 32).

Numbers: cell size 8192 units for normal cells, 4096 for ESM4 (constants.hpp 25-26). With cell size 8192 the recentre threshold is 4096 + 1024 = 5120 units (my arithmetic from the quoted values). The merge distance and the snapping lattice are both 128 (positioncellgrid.hpp 20; positioncellgrid.cpp 20).

The camera part, which matters for the world-camera question: the second anchor appears only when `camera.getMode() == MWRender::Camera::Mode::Static` (scene.cpp 1151). `Static` is enum value 0 (camera.hpp 31). The third-person follow mode is `ThirdPerson` (camera.hpp 33), which is not passed as detached. So for an attached third-person follow camera this mechanism adds no camera anchor at all. What `Static` means in the camera code was not read.

Tests (testpositioncellgrid.cpp 15-67) pin the rules: a camera within 128 of the player keeps one anchor (KeepsNearbyCamera, 15-23); an attached camera adds none (IgnoresAttachedCamera, 25-32); a detached camera 512 units up adds an anchor (AddsDetachedCamera, 34-42); two cameras 16 units apart within one 128 lattice cell give the same anchor (SnapsDetachedCamera, 44-57); a camera one cell away adds none (IgnoresDistantCamera, 59-67).

## 2. Key functions

- `terrainPreloadPositions`: `/mnt/frankendom-donors/openmw/apps/openmw/mwworld/positioncellgrid.cpp` 9-26 (primary anchor, detached-camera anchor with lattice snap).
- `Scene::preloadCells`: `/mnt/frankendom-donors/openmw/apps/openmw/mwworld/scene.cpp` 1136-1168 (dt guard, predicted position, terrain list, optional preloads, hand-off).
- `Scene::getNewGridCenter` and `Scene::gridCenterToBounds`: `/mnt/frankendom-donors/openmw/apps/openmw/mwworld/scene.cpp` 549-571 (hysteresis recentre; bounds from centre).
- `Scene::playerMoved`: `/mnt/frankendom-donors/openmw/apps/openmw/mwworld/scene.cpp` 573-585 (recentres only on change).
- `CellPreloader::setTerrainPreloadPositions` and `abortTerrainPreloadExcept`: `/mnt/frankendom-donors/openmw/apps/openmw/mwworld/cellpreloader.cpp` 381-413 (dedupe, abort on bounds change).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Recentre a streamed block only past half a cell plus a margin (hysteresis) | Margin 1024 units (theirs, scene.cpp 894); half cell from the 8192 cell size (theirs, constants.hpp 25); threshold 5120 units (my arithmetic) |
| Predict where the player will be from last frame's move, then prefetch there | 1 s prediction (theirs, settings-default.cfg 69, a player setting) |
| Block of cells around the centre | Radius 1 (3 by 3) normal; radius 2 (5 by 5) ESM4 (theirs, constants.hpp 29, 32) |
| Snapped anchor so a small orbit keeps one preload | Lattice 128 (theirs, positioncellgrid.cpp 20); merge distance 128 (theirs, positioncellgrid.hpp 20) |
| Detached-camera anchor only in a band of distance | Band from 128 to one cell (theirs, positioncellgrid.cpp 17); applies only in Static mode (theirs, scene.cpp 1151) |
| Dedupe a preload within a tolerance and abort on a grid change | Tolerance 128 (theirs, cellpreloader.cpp 400); abort on different bounds (theirs, cellpreloader.cpp 405-408) |
| Preload expiry | 5 s (theirs, settings-default.cfg 66; the code that uses it was not read) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order: grid recentre with hysteresis, then a predicted position from last frame's move, then the anchor list with the detached-camera branch snapped to 128 units, and the 128-unit same-anchor test with equal bounds. It omits the work queue, the in-flight abort path, the expiry delay, the door, exterior-grid and fast-travel preloads, the ESM4 radius and cell size, and the void reset. The cell index and centre helpers (`positionToExteriorCellLocation`, `indexToPosition`) were not read, so the sketch uses floor(x / cellSize) and takes the centre's world position as an argument. `predictedPos` returns the player position for `dt <= 1e-6`; the donor does that check at its caller (`preloadCells`, scene.cpp 1138) instead.

```ts
// Licence: GPL-3.0 (donor LICENSE, Version 3). Clean-room sketch of the mechanism, not a translation.
interface V3 { x: number; y: number; z: number }
interface Bounds { x0: number; y0: number; x1: number; y1: number }
interface Anchor { pos: V3; bounds: Bounds }
interface Centre { cx: number; cy: number }

const MERGE_DISTANCE = 128; // anchors closer than this (with equal bounds) count as one
const LOAD_THRESHOLD = 1024; // hysteresis added to half a cell before the grid recentres
const GRID_HALF = 1; // cells on each side of the centre cell

const len3 = (v: V3): number => Math.hypot(v.x, v.y, v.z);
const sub = (a: V3, b: V3): V3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const cellOf = (v: number, cellSize: number): number => Math.floor(v / cellSize);

// Centre cell -> preload bounds (half-open upper edge, like the donor's gridCenterToBounds).
export function gridBounds(c: Centre, half: number = GRID_HALF): Bounds {
  return { x0: c.cx - half, y0: c.cy - half, x1: c.cx + half + 1, y1: c.cy + half + 1 };
}

// Keep the current centre while the player stays within half a cell plus LOAD_THRESHOLD
// (Chebyshev, in x and y) of that centre's world position; otherwise recentre on the player's cell.
export function recentreGrid(player: V3, current: Centre, currentCentreWorld: { x: number; y: number }, cellSize: number): Centre {
  const dist = Math.max(Math.abs(currentCentreWorld.x - player.x), Math.abs(currentCentreWorld.y - player.y));
  if (dist <= Math.floor(cellSize / 2) + LOAD_THRESHOLD) return current;
  return { cx: cellOf(player.x, cellSize), cy: cellOf(player.y, cellSize) };
}

// Where the player will be, from last frame's movement, PREDICTION_TIME seconds ahead.
export function predictedPos(player: V3, last: V3, dt: number, predictionTime: number): V3 {
  if (dt <= 1e-6) return player;
  const moved = sub(player, last);
  const k = predictionTime / dt;
  return { x: player.x + moved.x * k, y: player.y + moved.y * k, z: player.z + moved.z * k };
}

// Preload targets: the primary position always; a detached (static) camera adds one anchor, snapped
// to a MERGE_DISTANCE lattice so a small orbit keeps the same anchor. Only when the camera is between
// MERGE_DISTANCE and one cell away from the player.
export function preloadAnchors(primary: V3, player: V3, camera: V3, cameraDetached: boolean, cellSize: number, bounds: Bounds): Anchor[] {
  const out: Anchor[] = [{ pos: primary, bounds }];
  if (!cameraDetached) return out;
  const d = len3(sub(camera, player));
  if (d >= MERGE_DISTANCE && d < cellSize) {
    const q = MERGE_DISTANCE;
    const snapped: V3 = {
      x: Math.floor(camera.x / q) * q,
      y: Math.floor(camera.y / q) * q,
      z: Math.floor(camera.z / q) * q,
    };
    out.push({ pos: snapped, bounds });
  }
  return out;
}

// Two anchors are the same preload when they are within MERGE_DISTANCE and cover the same cells.
export function sameAnchor(a: Anchor, b: Anchor): boolean {
  const d = sub(a.pos, b.pos);
  const sq = d.x * d.x + d.y * d.y + d.z * d.z;
  const same = a.bounds.x0 === b.bounds.x0 && a.bounds.y0 === b.bounds.y0 && a.bounds.x1 === b.bounds.x1 && a.bounds.y1 === b.bounds.y1;
  return sq < MERGE_DISTANCE * MERGE_DISTANCE && same;
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file with `export {};` appended: passed.

## 5. Lands in

- TARGET `origins/client/zone-stream.ts` (proposed client-side module; the Frankendom repo was not read, so this name is unverified). Streaming is client-side (the camera, HUD and sound are client-only, and zones are data on one runtime), so no server file is involved.
- Parity row: none of rows 1-23 fits streaming. Row 23 (zone population) is the nearest zone row, and it is a stretch: this mechanism decides which zone ground to load, not how many mobs live there.
- Reuse tag: rewrite-from-idea (GPL-3.0: clean-room, shape only).
- Brief rule served: zones as data on one runtime; the addendum's ruling that the camera, HUD and sound are client-only (this path is client-only too, so the server is not touched).

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch follows the described rules; it is not a line-by-line translation.
- Camera: the detached-camera anchor applies only in Static mode (scene.cpp 1151). An attached third-person follow camera gets no anchor from this code. For the owner's world-camera complaint, this mechanism does not help; the lever that does is the predicted position, which uses the player's movement, not the camera.
- The terrain list uses the predicted cell with no hysteresis (scene.cpp 1147-1152), while the real grid uses the hysteresis recentre in `playerMoved` (582-584). Two different centres can exist in one frame; a Frankendom port should pick one.
- The lattice snap is a floor on each axis (positioncellgrid.cpp 21-22). An orbit that crosses a 128-unit lattice line still gets a new anchor. The test (SnapsDetachedCamera) uses a 16-unit offset and only shows the small-orbit case.
- The donor's cell helpers were not read, so the sketch's floor-based cell index may not match the donor's exact rounding at negative coordinates.
- The preload queue, its abort and expiry logic (cellpreloader.cpp, not read beyond 381-413) decide how long a block stays resident. A Frankendom port needs an expiry rule too, or the cache will grow.
- Frankendom's one-engine and server-verified rules are not touched by this client path. No fight, kill or loot state depends on it.

Reuse tag: rewrite-from-idea (GPL-3.0, clean-room)
Brief rule served: zones as data on one runtime; camera and HUD client-only
