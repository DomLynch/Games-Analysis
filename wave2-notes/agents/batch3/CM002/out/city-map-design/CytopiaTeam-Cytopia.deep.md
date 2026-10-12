# CytopiaTeam-Cytopia (city-map-design, cell 2)

Donor: `/mnt/frankendom-donors/CytopiaTeam-Cytopia/src/game/ZoneArea.cxx` (with `src/game/ZoneManager.cxx`, `src/engine/TileManager.cxx`, `src/engine/map/MapFunctions.cxx`, `src/engine/GameObjects/MapNode.cxx`) | Licence: GPL-3.0 (`license.txt` lines 1-2: "GNU GENERAL PUBLIC LICENSE", "Version 3, 29 June 2007") | C++ | symbol `ZoneArea::spawnBuildings`

Checked: Hint `INFERRED` gave no file. Searched the donor for road, zone, minimap, landmark, signage and service words: no minimap, landmark or signage code exists in `src/`; the zone spawn path is the city-building mechanism here. Read in full: `game/ZoneManager.cxx` (273 lines), `game/ZoneArea.cxx` (154 lines). Read in the ranges cited: `engine/TileManager.cxx` 30-44, 47-58, 73-103, 405-427, 480; `engine/map/MapFunctions.cxx` 265-320, 378-460; `engine/GameObjects/MapNode.cxx` 50-100, 150-253; `engine/basics/PointFunctions.cxx` 156-171; `engine/basics/tileData.hxx` 50-70; `services/GameClock.hxx` 62-74 (declaration only, the body was not read). Data: `data/resources/data/TileData.json` read with python on the VPS (counts only; the loader may drop entries, not checked). Callers: `ZoneArea::spawnBuildings` is called only from `ZoneManager::spawnBuildings` (ZoneManager.cxx 101); `ZoneManager::update` and `spawnBuildings` run from one real-time clock task (ZoneManager.cxx 16-23). Not read: `Randomizer::shuffle` and `choose` bodies (assumed uniform), `PowerManager`/`PowerGrid` (power level source), `isPlacableOnSlope`, the view side (`Sprite.cxx`). `crimeLevel` is loaded (TileManager.cxx 390) but has no consumer in `src/`. Confidence: high on the spawn tick, the cap, the size draw and the refusal path; medium on the randomness (Randomizer not read). Camera scope: not applicable.

Best transferable idea: A powered zone grows by at most five buildings per tick, each one the largest square that fits and a random size drawn only from sizes that have a building for that zone and density.
Decision (proposed): adapt - the tick, power gate and per-tick cap suit a zone director in Frankendom, but the donor's size draw, uncounted refusals and row-and-column-only fit test must be fixed first, and the real-time clock replaced with the server tick.
Acceptance: In a zone with power and free ground, the server adds at most five buildings per server tick, never on an occupied cell, and a server test with a fixed seed fails if any attempted size has no catalogue building for that zone and density.

## 1. Mechanism

- Zone areas. A zone is a contiguous set of cells that share one zone type and one density. A new zone cell joins an adjacent area of the same type and density, or starts one; two areas that touch are merged (ZoneManager.cxx 113-114, 128-152). Each area keeps a power flag from the grid it touches (ZoneManager.cxx 204-215).
- Tick. One real-time clock task, delay 1 s, period 1 s (ZoneManager.cxx 16-23), runs `update()` then `spawnBuildings()` (19-20). `update()` applies queued vacate, occupy, add and remove events (28-80). A placed building queues its cells as occupied for the next tick (MapFunctions.cxx 445 emits a signal; ZoneManager.cxx 249 queues it), so occupancy is one tick late.
- Gate. `spawnBuildings` runs only on areas that are vacant and powered (ZoneManager.cxx 88).
- Batch. Up to five placements per area per call (ZoneArea.cxx 29, 39, 55). The node list is shuffled first (32). Occupied nodes are skipped (43).
- Largest square. For the chosen origin cell, `getMaximumTileSize` grows the width while the row through the origin is zone cells, and the height while the column through the origin is zone cells (ZoneArea.cxx 65-102). It does not test the other cells of the square.
- Size and tile. A random square size is drawn uniformly from every square size that is in the loaded tile data and no larger than that maximum (TileManager.cxx 80-91; the set is filled at 480). A random tile is then drawn among tiles with that zone, that density (agricultural ignores density, 36) and that exact size (`getAllTileIDsForZone`, 30-44). No match returns nothing (98).
- Placement. `setTileID` (MapFunctions.cxx 378) refuses the whole footprint if any cell refuses (388; for buildings every cell must accept, 281-288 of the same file). A building cannot go over an existing non-overplacable building or onto a road (MapNode.cxx 198-210; a non-empty layer falls through to the refusal at 246-252). Accepted placements write the tile id on every footprint cell, referencing the origin (MapFunctions.cxx 409-430, with the dead branch at 423), then emit the signal (445).
- Footprint shape. A size-n building covers the cells down and left of its origin: x - i, y + j for i and j below n (TileManager.cxx 57-61).
- Data. `TileData.json` holds 827 tile entries, 563 of them RCI zone buildings (computed with python on the VPS). By zone type: residential 395, commercial 121, industrial 40, agricultural 7. Square sizes 1 to 8 appear in the data. Some (zone, density, size) combinations have no building. Counting square RCI tiles only (the donor's filter): commercial LOW has no size 5 or above; commercial MEDIUM has no size 4 or above; residential HIGH has none at 6, 7 or 8.

## 2. Key functions

- `ZoneArea::spawnBuildings`: `/mnt/frankendom-donors/CytopiaTeam-Cytopia/src/game/ZoneArea.cxx` 27-57. Shuffle, cap of five, largest square, random tile, place, count.
- `ZoneArea::getMaximumTileSize`: `/mnt/frankendom-donors/CytopiaTeam-Cytopia/src/game/ZoneArea.cxx` 65-104. Row and column growth test.
- `ZoneManager::spawnBuildings` and the clock task: `/mnt/frankendom-donors/CytopiaTeam-Cytopia/src/game/ZoneManager.cxx` 16-23, 83-103. Power and vacancy gate.
- `ZoneManager::update` and `updatePlacedNodes`: `/mnt/frankendom-donors/CytopiaTeam-Cytopia/src/game/ZoneManager.cxx` 26-80, 245-258. Deferred occupancy.
- `TileManager::getRandomTileIDForZoneWithRandomSize`: `/mnt/frankendom-donors/CytopiaTeam-Cytopia/src/engine/TileManager.cxx` 73-103. Size draw and tile draw.
- `MapFunctions::setTileID`: `/mnt/frankendom-donors/CytopiaTeam-Cytopia/src/engine/map/MapFunctions.cxx` 378-460. Refusal and write.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor numbers (where it lives) |
|---|---|
| Zone growth tick, one real-time task | 1 s delay, 1 s period (ZoneManager.cxx 16-23). |
| Per-tick placement cap per area | 5 (ZoneArea.cxx 29). |
| Power gate for growth | Grid level above 0 (ZoneManager.cxx 209-211). |
| Largest fitting square from an origin | Strip test on the origin row and column (ZoneArea.cxx 71-96). |
| Square size and tile draw | Uniform over all data sizes that fit (TileManager.cxx 80-91); uniform tile among matches (102). |
| Footprint offset | Down and left of origin, size n (TileManager.cxx 57-61). |
| Zone density | Three levels LOW, MEDIUM, HIGH (tileData.hxx 57-61); agricultural ignores it (TileManager.cxx 36). |
| Zone type | Four types (tileData.hxx 55). |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (shuffle, skip occupied, largest fit, draw a size, draw a tile, place, count). It changes three things on purpose: the size is drawn only from sizes with a building for this zone and density; the fit test checks every cell of the square (the donor checks the origin row and column); the cap counts only accepted placements and occupies the footprint at once. It omits the real-time clock and the deferred update queue (the server tick replaces both), zone merging, vacancy on demolish, power levels and the water flag, the agricultural density exception (the catalogue handles it), the dead occupied and free counters, and the game's refusal rules (the `place` callback stands for them).

```ts
// Licence: GPL-3.0 (donor, Cytopia). Clean-room sketch of the described mechanism, not a translation of the donor lines.
export {};

type ZoneType = 'RESIDENTIAL' | 'INDUSTRIAL' | 'COMMERCIAL' | 'AGRICULTURAL';
type Density = 'LOW' | 'MEDIUM' | 'HIGH';

interface Pt { x: number; y: number; }

interface ZoneCell { p: Pt; occupied: boolean; }

interface ZoneArea {
  type: ZoneType;
  density: Density;
  cells: ZoneCell[];   // contiguous cells of one zone type and density
  powered: boolean;    // set from the power grid, zone data is not needed here
}

interface Rng {
  int(lo: number, hi: number): number; // inclusive
}

// Catalogue built once from the tile data: only sizes that have at least one building for this zone and density.
interface Catalogue {
  sizesFor(type: ZoneType, density: Density): number[]; // ascending, distinct
  pick(type: ZoneType, density: Density, size: number, rnd: Rng): string | null;
}

// Returns true if the game accepted the placement (the game refuses blocked footprints).
type PlaceFn = (id: string, origin: Pt, size: number) => boolean;

const CAP_PER_TICK = 5;

function cellAt(area: ZoneArea, p: Pt): ZoneCell | undefined {
  return area.cells.find((c) => c.p.x === p.x && c.p.y === p.y);
}

// Footprint of an n x n building anchored at origin: down and left of it, as the donor's rectangle does.
function squareCells(origin: Pt, n: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      out.push({ x: origin.x - i, y: origin.y + j });
    }
  }
  return out;
}

// Fix: every cell of the square must be a free member of this area.
// The donor's size search tests only the origin's row and column.
function squareFits(area: ZoneArea, origin: Pt, n: number): boolean {
  return squareCells(origin, n).every((p) => {
    const c = cellAt(area, p);
    return c !== undefined && !c.occupied;
  });
}

// Squares nest (a k-square lies inside a (k+1)-square), so the first failure ends the search.
function largestFit(area: ZoneArea, origin: Pt, maxN: number): number {
  let best = 0;
  for (let k = 1; k <= maxN; k++) {
    if (!squareFits(area, origin, k)) break;
    best = k;
  }
  return best;
}

function shuffle<T>(xs: T[], rnd: Rng): void {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = rnd.int(0, i);
    const tmp = xs[i];
    xs[i] = xs[j];
    xs[j] = tmp;
  }
}

// One growth tick for one area (donor ZoneArea::spawnBuildings, with fixes).
// Returns how many buildings were placed this tick.
export function spawnTick(area: ZoneArea, cat: Catalogue, rnd: Rng, place: PlaceFn): number {
  if (!area.powered) return 0;
  shuffle(area.cells, rnd);
  let placed = 0;
  for (const cell of area.cells) {
    if (placed >= CAP_PER_TICK) break;
    if (cell.occupied) continue;
    const sizes = cat.sizesFor(area.type, area.density);
    if (sizes.length === 0) break;
    const fits = largestFit(area, cell.p, sizes[sizes.length - 1]);
    const options = sizes.filter((n) => n <= fits);
    if (options.length === 0) continue; // nothing fits here: not a failed attempt
    const n = options[rnd.int(0, options.length - 1)];
    const id = cat.pick(area.type, area.density, n, rnd);
    if (id === null) continue;
    if (!place(id, cell.p, n)) continue; // refused by the game: not counted toward the cap
    // Occupy at once, so the next candidate in this same tick sees the footprint as taken.
    for (const p of squareCells(cell.p, n)) {
      const c = cellAt(area, p);
      if (c) c.occupied = true;
    }
    placed++;
  }
  return placed;
}
```

## 5. Lands in

- TARGET `origins/world/zone-growth.ts` (proposed new module, not in the repo yet): the zone director. It ticks on the server tick and decides which zone cells get a building; the client only draws the result. Shape only, no code reused.
- Parity-checklist row 23 (zone population: spawn caps, respawn, despawn with a grace timer). The five-per-tick cap and the power gate are the caps and the gate for zone growth; the same director also owns the zone's cap data.
- Reuse tag: rewrite-from-idea (GPL-3.0: clean-room, shape only)
- Brief rule served: zones as data (the catalogue and the cap are per-zone data); keep the idea, fix the defect (2026-10-10 rule); one runtime (the director is one loop, not a client timer).

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the described steps.
- Defect 1, size drawn from sizes with no building (TileManager.cxx 80-91, 480; `getAllTileIDsForZone` 35-38). The data shows gaps (commercial LOW: no size 5 or above; commercial MEDIUM: no size 4 or 5; residential HIGH: none at 6-8). Where the largest fit is 5, a commercial LOW zone draws size 5 about one time in five, finds no building, and the donor still counts that as one of the five slots (ZoneArea.cxx 54-55). Fix: build the size list per (zone, density) from the catalogue at load (sketch `sizesFor`) and draw only from it.
- Defect 2, refused placements count toward the cap (ZoneArea.cxx 54-55; `setTileID` returns bool at MapFunctions.cxx 378, the result is ignored). Fix: count only accepted placements (sketch `placed++` after `place`).
- Defect 3, occupancy one tick late (ZoneManager.cxx 45-55, 249; ZoneArea.cxx 37-43). Within a batch the flags are stale and the game refuses the overlap (MapNode.cxx 246-252), so no overlap results, but the batch wastes tries. Fix: occupy the footprint as it is placed (sketch).
- Defect 4, the size search checks only the origin row and column (ZoneArea.cxx 71-96). The rest of the square is not checked against the zone, and the game does not check the zone layer for buildings (MapNode.cxx 198-252), so a building can reach past the zone onto free ground. Whether that is intended is not stated in the code; confirm before keeping the donor rule. The sketch checks every cell.
- Defect 5, dead branch: `if ((!targetCoordinates.size()) == 1)` (MapFunctions.cxx 423) is always false. Today it has no visible effect for a 1x1 building (both branches write the same origin). Fix: `size() === 1`, or delete the branch.
- Defect 6, unused counters `occupied` and `free` (ZoneManager.cxx 90-96). Delete them.
- Real-time clock (ZoneManager.cxx 16-23) ties growth to wall time. Frankendom must use the server tick count (fixed step), never wall time, so a zone grows the same way on a slow and a fast machine.
- Data note: `crimeLevel` (tileData.hxx 165; TileManager.cxx 390) is loaded but nothing reads it in `src/`. Do not copy a field with no consumer.
- Not read: `Randomizer` (shuffle and choose are assumed uniform), `PowerManager` (the source of the power level), and the loader beyond the zone keys, so the count of 827 entries may differ from what the game loads.
- Minimap and landmarks: none found in `src/` (searched). The city-map topic's minimap, landmark and signage parts are not covered by this donor.


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
Errors: None found. Verified: ZoneArea.cxx cap 5 (29), shuffle (32), skip occupied (43), counter increments regardless of setTileID result (54-55); getMaximumTileSize 65-104 row/column test; ZoneManager 1s/1s task (16-23), vacant+powered gate (88), unused counters (90-96); TileManager size draw 80-91, tile filter 30-44, footprint x-i,y+j 57-61, tileSizeCombinations insert at 480; setTileID bool 378, dead branch 423; MapNode 198-252; crimeLevel only loaded (TileManager 390, tileData.hxx 165); GPL-3.0 license.txt; TileData.json 827 entries, 563 RCI, R395/C121/I40/A7; commercial LOW max square 4, MEDIUM max 3, residential HIGH max 5 all match.
Missed: "Not a defect in the note but unmentioned: ZoneArea::spawnBuildings passes an empty id to setTileID when no tile matched (value_or("""")), which returns false at MapFunctions 383 (harmless); ZoneManager::spawnBuildings loop 85-103 only guards on isVacant, never re-checks after merge. Nothing important missed."
