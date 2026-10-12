# amilich-isometric-city (rendering-performance, cell 1)

Donor: `/mnt/frankendom-donors/amilich-isometric-city/src/components/game/CanvasIsometricGrid.tsx` | Licence: MIT (LICENSE file: "MIT License", Copyright (c) 2025 amilich; code may be adapted) | TypeScript (React + canvas 2D) | symbols: static tile effect (968-1100, tile loop 1669-1690) and animated RAF loop (2396-2516); gates in `vehicleSystems.ts` 1316-1323 and `constants.ts` 51-85

Checked: Read in full: the static render effect setup (968-1032), the tile draw loop (1664-1690), the animated RAF loop and its skip logic (2396-2516), the resize and DPR code (929-958), the keyboard pan loop (618-640), `performanceUtils.ts` 95-243 (LOD table, tile bounds), `constants.ts` 51-85, `drawPedestrians.ts` 1-20 and 213-222, `vehicleSystems.ts` 905-907 and 1316-1379 (pedestrian gate, population target, spawn). Callers checked by grep in `src/`: `getLODLevel`, `LOD_LEVELS`, `getVisibleTileBounds`, `isTileVisible`, `FrameBudget`, `BatchRenderer`, `getVisibleChunks` have no caller outside `performanceUtils.ts` (dead code). Not read in full: `FrameBudget` body (299 class line only), chunk manager (345-445, grep hits only), `BatchRenderer` body (461, grep hits only). Not read: `gridToScreen` body (`utils.ts` 405, signature only), per-tile sprite draw bodies (1100-1660), the car/bus/train update bodies, `spawnPedestrian`, the road-density constant `PEDESTRIAN_ROAD_TILE_DENSITY`. Confidence: high on the culling and pacing rules (read end to end); medium on the exact per-frame cost (not measured). camera_scope: n/a (rendering, not camera).

## 1. Mechanism

- Static tile layer. A state change schedules one `requestAnimationFrame` render. Any pending frame is cancelled first (978-983). The view rectangle in world units is padded by one tile sideways and two tile heights top and bottom (1023-1026). That rectangle is turned into a range of diagonal sums `x + y`, because screen y is proportional to `x + y` (1029-1032). The loop walks sums from min to max, then x along each diagonal, back to front (1669-1672). A tile is skipped unless its screen box touches the padded view, with 4 tile heights allowed above the diamond for tall buildings (1677-1678).
- Animated layer. A second RAF loop (2396-2516) drives vehicles, pedestrians, planes, trains and smog. On phones the target frame is 33 ms and any RAF tick closer than that to the last drawn tick is dropped (2402, 2409, 2415). The entity timestep is clamped to 0.3 s (2413). When a phone is panning or pinching, entity updates are skipped (2419) and every animated canvas is cleared rather than drawn (2474-2480). On desktop, while panning at zoom below 0.5, boats, smog, helicopters and seaplanes are not drawn (2476, and the `!skipSmallElements` guards).
- Zoom density gates. Desktop and phone have separate thresholds: cars 0.4 / 0.45 (constants 67-68), pedestrians 0.5 / 0.55 (69-70). The constant `VEHICLE_FAR_ZOOM_THRESHOLD` = 0.25 is commented as "hide ALL vehicles/pedestrians" (73), but the code applies it as a floor, `Math.max(min zoom, 0.25)` (vehicleSystems 1321-1322). Because the per-type minimums are already 0.4 to 0.55, the floor changes nothing for cars or pedestrians as written. Below the pedestrian gate the list is emptied and the update returns (1323-1325). Population target: road tiles x density (density constant not read), clamped between a minimum (150 desktop, 20 phone) and the cap (560 desktop, 80 phone) (vehicleSystems 1356-1359). Spawns come in batches when a timer runs out; the batch is cut to the room left under the target (1362-1365), and the timer resets to 0.03 s desktop or 0.15 s phone (1369; constants 57-58). Pedestrian drawing drops to a simple form below zoom 0.55 and a medium form below 0.75 (drawPedestrians 13-14).
- Per-pedestrian cull after the zoom gate: a pedestrian is skipped if it is more than 50 px outside the view sideways or 60 px vertically (drawPedestrians 217-220).
- Backing store. The canvas CSS size is the container rect; the backing store is `rect x devicePixelRatio`, rounded, with no cap (929, 958).

## 2. Key functions

- Static tile effect: `/mnt/frankendom-donors/amilich-isometric-city/src/components/game/CanvasIsometricGrid.tsx` 968-1032 (throttle, pad, diagonal range), 1669-1678 (sum walk and tile cull).
- Animated RAF loop: `/mnt/frankendom-donors/amilich-isometric-city/src/components/game/CanvasIsometricGrid.tsx` 2396-2516 (frame gate 2402-2415, update skip 2419, draw skip 2474-2480, desktop small-element skip 2476).
- Resize and DPR: `/mnt/frankendom-donors/amilich-isometric-city/src/components/game/CanvasIsometricGrid.tsx` 929-958.
- Pedestrian zoom gate: `/mnt/frankendom-donors/amilich-isometric-city/src/components/game/vehicleSystems.ts` 1316-1323 (`updatePedestrians`; callers: the animated loop at 2419 onward).
- Pedestrian draw: `/mnt/frankendom-donors/amilich-isometric-city/src/components/game/drawPedestrians.ts` 76-120 (LOD by zoom), 213-222 (viewport cull). Callers: `vehicleSystems.ts` 1577 and 1612, and `CanvasIsometricGrid.tsx` 2494.
- Thresholds and caps: `/mnt/frankendom-donors/amilich-isometric-city/src/components/game/constants.ts` 51-85.
- Dead code: `/mnt/frankendom-donors/amilich-isometric-city/src/lib/performanceUtils.ts` 116-166 (`LOD_LEVELS`), 193-222 (`getVisibleTileBounds`), 299 (`FrameBudget` class line; body not read in full), 345-445 (chunk manager; grep hits only), 461 (`BatchRenderer` class line; body not read in full). No callers in `src/` outside this file.
- Population: `/mnt/frankendom-donors/amilich-isometric-city/src/components/game/vehicleSystems.ts` 1316-1379 (zoom clear, target clamp, batched spawn timer).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Phone frame gate: skip a tick under the budget | 33 ms phone, 16 ms desktop (theirs, 2402) |
| Entity timestep clamp, so a stall cannot jump the simulation | 0.3 s (theirs, 2413); the keyboard loop uses 0.05 s (theirs, 631) |
| Skip entity updates and moving sprites during a phone pan or pinch | Applies on phone only (theirs, 2419, 2474) |
| Zoom-gated ambient density | Cars 0.4 / 0.45, pedestrians 0.5 / 0.55 (theirs, constants 67-70); the 0.25 floor (73) is a no-op as written |
| Population target clamped to a range | Target = road tiles x density (not read), clamped to [150, 560] desktop and [20, 80] phone (theirs, vehicleSystems 1356-1359) |
| Hard cap on ambient count per device | 560 desktop, 80 phone (theirs, constants 51-52) |
| Spawn interval per device | 0.03 s desktop, 0.15 s phone (theirs, constants 57-58) |
| Detail tiers by zoom | 0.55 and 0.75 (theirs, drawPedestrians 13-14) |
| Canvas backing store scale | `devicePixelRatio`, uncapped (theirs, 958) |

## 4. TypeScript sketch

simplified: keeps the donor order: pad the view, convert it to a diagonal-sum range, walk diagonals back to front, cull each tile by its screen box with the 4-tile-height allowance, then gate phone frames and entity updates. It splits the donor's loop into two functions and passes `toScreen` in, because `gridToScreen` was not read. It omits the render cache and queue sorting, the depth insertion sort, the keyboard pan loop, the 3x-speed render throttle, the desktop small-element skip, the sprite draws, the pedestrian spawn batch size (not read), the population target and timer (not sketched), and the DPR cap (the sketch takes a DPR value from the caller and does not cap it). The zoom gate copies the donor's `max()` floor as written, and takes the donor's pedestrian values as parameters.

```ts
// Licence: MIT (donor). Shape of the donor's pacing and culling rules, re-written from the mechanism.
const TILE_W = 64;
const TILE_H = TILE_W * 0.6;

export interface View { left: number; top: number; right: number; bottom: number; } // world units

// Phone cap: a RAF tick is skipped when the last drawn tick is under the budget.
export interface Pacing { lastDrawMs: number; }
export function shouldDrawFrame(nowMs: number, st: Pacing, isMobile: boolean): boolean {
  const budgetMs = isMobile ? 33 : 16;
  if (isMobile && nowMs - st.lastDrawMs < budgetMs) return false;
  st.lastDrawMs = nowMs;
  return true;
}

// Moving entities and sprites stand still while a phone pans or pinches.
export function entitiesMove(isMobile: boolean, panning: boolean, pinching: boolean): boolean {
  return !(isMobile && (panning || pinching));
}

// Timestep for the entity loop, clamped so a stall cannot jump the simulation.
export function clampDelta(nowMs: number, lastMs: number): number {
  return Math.min((nowMs - lastMs) / 1000, 0.3);
}

// Pad the view: 1 tile left/right, 2 tile heights top/bottom (donor order).
export function padView(v: View): View {
  return { left: v.left - TILE_W, right: v.right + TILE_W, top: v.top - TILE_H * 2, bottom: v.bottom + TILE_H * 2 };
}

// Diagonal sums (x + y) that can reach the padded view. Screen y grows with x + y.
export function visibleSumRange(p: View, gridSize: number): [number, number] {
  const minSum = Math.max(0, Math.floor((p.top - TILE_H * 6) * 2 / TILE_H));
  const maxSum = Math.min(gridSize * 2 - 2, Math.ceil((p.bottom + TILE_H) * 2 / TILE_H));
  return [minSum, maxSum];
}

// Walk diagonals back to front; visit only tiles whose box touches the view.
export function forEachVisibleTile(
  gridSize: number,
  view: View,
  toScreen: (x: number, y: number) => { sx: number; sy: number },
  visit: (x: number, y: number) => void,
): void {
  const p = padView(view);
  const [minSum, maxSum] = visibleSumRange(p, gridSize);
  for (let sum = minSum; sum <= maxSum; sum++) {
    for (let x = Math.max(0, sum - gridSize + 1); x <= Math.min(sum, gridSize - 1); x++) {
      const y = sum - x;
      if (y < 0 || y >= gridSize) continue;
      const { sx, sy } = toScreen(x, y);
      // Tall tiles: keep a tile whose top is up to 4 tile heights above the view.
      if (sx + TILE_W < p.left || sx > p.right || sy + TILE_H * 4 < p.top || sy > p.bottom) continue;
      visit(x, y);
    }
  }
}

// Zoom density gate for ambient vehicles and pedestrians (values from donor constants).
export interface DensityRules { pedestrianMinZoom: number; hideAllBelow: number; pedestrianCap: number; }
export function pedestriansAllowed(zoom: number, r: DensityRules): boolean {
  return zoom >= Math.max(r.pedestrianMinZoom, r.hideAllBelow);
}
export function spawnRoom(current: number, r: DensityRules): number {
  return Math.max(0, r.pedestrianCap - current);
}

// Detail level for a pedestrian at this zoom (thresholds 0.55 and 0.75 in donor).
export function drawDetail(zoom: number): "simple" | "medium" | "full" {
  if (zoom < 0.55) return "simple";
  if (zoom < 0.75) return "medium";
  return "full";
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/amilich-isometric-city-sketch.ts`, exit 0.

## 5. Lands in

- TARGET `origins/client/render-budget.ts` (new client-only module: frame gate, view cull, ambient density gate; the engine never reads it). Parity-checklist row 16 (colour grade/quality). Note: the brief hint said row 12, but row 12 in the addendum is combat sound cues, so 16 is the closer fit for render budgets.
- Zone population caps for ambient life (the cap and spawn interval per zone) belong to row 23 when they become zone data; they are not part of this client module. The donor's population clamp and clear-on-zoom-out (vehicleSystems 1316-1379) is a row 23 finding in its own right; this note cites it only as the source of the clamp shape.
- Reuse tag: adapt-idea (MIT: code may be adapted; this note uses the shape only, the sketch is written from the mechanism)
- Brief rule served: 1 (one engine, client-only draw gates); rules 7-9 n/a

## 6. Gaps and risks

- One engine: the donor has no server. Ambient crowds and traffic here are not kills, so they stay out of the ledger. If an ambient NPC ever carries loot, threat or a hit, its cap and spawn rule must move into the engine (row 23).
- Server tick: the client pause must never pause the server tick. A phone player dragging the view must not stop the authoritative simulation. Keep the entity timestep out of anything the server or fight rules read.
- Zones as data: the donor writes caps and zoom thresholds as constants. Frankendom should move caps and spawn intervals into zone data, and keep zoom thresholds as engine constants (device rule).
- Server-verified kills and MAX_ATTACKERS = 3: fight-critical actors (the hero and up to three attackers) must never be in the skip set. The donor's rule skips all animated elements during a pan, so copying it as is would hide the attackers during a many-on-one fight.
- Timestep: the donor clamps the entity loop at 0.3 s, which is too large for fight timing. Fight timing needs a fixed step in the engine; this client clamp is for drawing only.
- Defects found, each kept as an idea with the fix:
  - Phone frame gate: the 33 ms threshold on RAF timestamps. At 60 Hz, two vsyncs are about 33.3 ms, so a small timing jitter can drop a frame and leave a 20 fps cadence (reasoning from the code; not measured). fix: skip only when elapsed is under the budget minus half a vsync (about 28 ms), or keep an accumulator.
  - Uncapped backing store: `devicePixelRatio` is used with no cap (929, 958). On a DPR 3 phone the fill is about nine times the CSS pixel area (reasoning; not measured). fix: `min(devicePixelRatio, 2)` on phones, CSS size unchanged.
  - Dead LOD table: `LOD_LEVELS` puts pedestrians on only at zoom 0.7 and above, but the live gates use 0.5 and 0.55 (constants 69-70). fix: delete the table, or make constants.ts the single source and derive the tiers from it.
  - No-op hide-all floor: the comment on `VEHICLE_FAR_ZOOM_THRESHOLD` (73) says hide everything below 0.25, but the code uses `max()` (vehicleSystems 1322), so it changes nothing for cars or pedestrians. fix: decide the intent; if hide-all is wanted, use `min()` or remove the constant, and put the per-type minimums in zone data.
  - Dead helpers: `FrameBudget`, `BatchRenderer`, the chunk manager and `getVisibleTileBounds` (approximate iso projection, self-described as an approximation) have no callers. fix: delete them, do not port them.
- Draw calls: each sprite is a separate `drawImage` (no batcher is used). Not measured. fix: measure on a phone before adding any batching.

## Reuse tag

adapt-idea (MIT, code may be adapted; this note keeps the shape only).

## Brief rule served

1 (one engine, client-only draw gates). Rule 7 and 8 do not apply; licence is MIT.

Best transferable idea: Gate ambient motion and new ambient spawns on phones while the player drags or pinches, keep fight-critical actors out of that gate, and cap ambient count per device from zone data.
Decision (proposed): adapt — The iso diagonal cull is specific to an isometric grid and does not transfer to Frankendom's 3D third-person world. What does transfer is the phone frame gate, the rule that ambient motion pauses during a touch pan or pinch (never for fight actors), and a zoom- or distance-gated ambient density with a hard cap per device, read from zone data.
Acceptance: On a phone, while the player drags the camera, ambient crowds and traffic stop moving and no new ones spawn; the frame cadence holds near 30 fps; the fighters and attackers stay drawn; a unit test asserts the ambient count never exceeds the zone's phone cap.
