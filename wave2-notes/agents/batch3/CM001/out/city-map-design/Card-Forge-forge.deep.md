# Card-Forge-forge (city-map-design, cell 3)

Donor: `/mnt/frankendom-donors/Card-Forge-forge/forge-gui-mobile/src/forge/adventure/world/World.java` (`generateNew`: point-of-interest placement 452-572, town and point roads 573-716, minimap 717-757) with `/mnt/frankendom-donors/Card-Forge-forge/forge-gui-mobile/src/forge/adventure/world/BiomeStructure.java` (structure tiling) and data `/mnt/frankendom-donors/Card-Forge-forge/forge-gui/res/adventure/common/world/points_of_interest.json` plus `/mnt/frankendom-donors/Card-Forge-forge/forge-gui/res/adventure/Innistrad/world/world.json` | Licence: GPL-3.0 (`/mnt/frankendom-donors/Card-Forge-forge/LICENSE` lines 1-2: "GNU GENERAL PUBLIC LICENSE / Version 3, 29 June 2007"). None of the five world Java files I checked (World.java, BiomeStructure.java, Model.java, OverlappingModel.java, SimpleTiledModel.java) has a licence header in its first 25 lines, so the repo licence applies; clean-room only | Java | symbols `World.generateNew`, `BiomeStructure.initialize`, `BiomeData.getPointsOfInterest`

Checked: opened World.java 340-365 (structure call site), 452-572 (POI placement), 573-716 (roads and terrain carving), 717-757 (minimap), 286-294 (`clearTerrain`), plus grep of 302-830 for the generation steps; BiomeStructure.java in full (142 lines); BiomeData.java 70-93 (POI list per biome and cave/dungeon ordering); PointOfInterestData.java field list; WorldData.java field list; Innistrad world.json (sizes, road distance, minimap); common points_of_interest.json (264 entries, counted with a python one-liner on the VPS, no writes). Not read: the biome noise and biome bit encoding (World.java 369-446 only grepped), `getBiome`, `highestBiome`, the terrain bit masks (`terrainMask`, `collisionBit`, `isStructureBit`), `PointOfInterest` and `getTilePosition`, `getNewTownName`, `OverlappingModel.run` and `SimpleTiledModel` (the WFC solver itself), `Model.java`, `createSmallPixmap`, `drawPixmapLater`, Gson loading of the POI JSON. The hint file World.java is the right file for this cell. Confidence: high on POI placement, the road rules and the carving (read end to end, including the defects); medium-high on the structure tiling defects (read as code, not run); medium on the minimap (read, not run). camera_scope: not a camera cell.

Best transferable idea: a world is laid out in order: landmarks are placed one at a time by rejection sampling inside their biome with a no-fly box around each one, then each town links to its nearest town within a maximum road distance, and every other landmark links to its nearest town; the minimap is drawn from the same placement with one marker per landmark type.
Decision (proposed): adapt - keep the one-at-a-time landmark placement with a spacing box, the nearest-town road rule with a distance cap, and the minimap markers, but run it from the zone seed on the server, put the counts, radii and caps in zone data, and fix the eight defects below.
Acceptance: given one seed, the server places the same towns, landmarks and roads in a zone; every town (including the last one listed) links to its nearest town within 1000 px; a server test fails if any landmark is missing without a rerun, and the minimap marker for each town is at its tile.

## 1. Mechanism

Order of operations in `World.generateNew(seed)` (World.java 302 onward):

1. Structures (343-365). For each biome that has structures, a `BiomeStructure` is built on its own future with the same seed (351-352). The structure bitmap is solved in blocks of at most 10 x 10 cells (`MAXIMUM_WAVEFUNCTIONSIZE = 10`, BiomeStructure.java 21). Each block is solved by an overlapping wave-function-collapse model, trying up to 10 seeds (73-74). The solver is not read.
2. Biomes (369-446). Each biome is a noise-and-distance blob around its start point (393-395). A tile belongs to a biome when `noise + dist < 1` (395). The biome gets one bit in `biomeMap` (401). Structures are stamped into the terrain (416-436).
3. Landmark placement (453-571). This is the core. Landmarks are placed one at a time, in biome order, and in each biome in the order of its list:
   - the player start is cleared with radius 10 (462),
   - for each landmark type, `count` copies are placed (473),
   - each copy gets up to 500 tries (474). A try draws `radius = sqrt(u/2 * radiusFactor)` and an angle (476-477), offsets the point by the biome's start point and offsets (478-486), and fails if it is off the map or outside its own biome (488-490),
   - the point is then tested against a list of no-fly boxes: each landmark owns an 8 x 8 tile box centred on it (537). A blocked point is meant to try the eight one-tile neighbours (503-522), but the flag used there is never reset, so in practice only the first neighbour can be taken (see defects). If nothing is free on the last try, the whole placement reruns from scratch (524-533),
   - an accepted landmark clears terrain in a radius of 3 (539), gets a minimap marker (542-551), and goes to `towns` if its type is `town` or `capital`, or to `notTowns` otherwise (554-565). Towns with no name get one from the biome (555-557).
4. Roads (573-716).
   - Towns: each town links to its nearest town within `maxRoadDistance` (580-604, 591). Only the nearest is drawn (604). The second-nearest is marked as used but not drawn (606-610).
   - Other landmarks: each links to its nearest town, with no distance cap (613-629).
   - Carving: a Bresenham line is cut from each link, clearing collision terrain (634-667 for landmark links, 671-711 for town links, which also mark the road biome bit and clear a 3 x 3 block around the start, 677-683).
5. Minimap (721-757). One pixmap at `miniMapTileSize` per tile (721). Each tile is painted with its road sprite, or its biome tile, or its structure sprite. Landmark markers were drawn earlier, at tile position times `miniMapTileSize` (545-551).
6. Sprites (784-815). Small rocks and trees are placed per biome: a tile gets a sprite with probability `density`, at most one sprite per tile (798, 808). Skipped on structure tiles (791) and road tiles (790).

Biome landmark list (BiomeData.java 70-93). A biome names its landmarks; the global list is filtered by name (76-82). Caves and dungeons are moved to the end of the list (85-92), so towns and castles are placed first and dungeons last.

Data (Innistrad/world/world.json and common points_of_interest.json). World: 700 x 700 tiles, `tileSize` 16 (pixels), `miniMapTileSize` 4, `noiseZoomBiome` 30, `maxRoadDistance` 1000 (pixels, see 3 below). The landmark table: 264 entries. Types: cave 105, dungeon 103, town 25, sidebossmoderate 9, capital 6, castle 6, sidebosseasy 6, sidebosshard 3, one with no type. `radiusFactor` is 0.8 for 248 entries, 0.01 for 5, 0.2 for 1, 0.4 for 1, 0.5 for 1, 5 for 1, and missing for 7 (248+5+1+1+1+1+7 = 264). Missing means the Java float default, 0.0 (inference from the field declaration; Gson loading not read), so those seven land on their biome start point on every try.

Tick: none. Generation runs once when the world is built. Per-frame code is not in these files.

## 2. Key functions

- `World.generateNew`: `/mnt/frankendom-donors/Card-Forge-forge/forge-gui-mobile/src/forge/adventure/world/World.java` 302-830 (grep for the steps; read 340-365, 452-757).
- Landmark placement loop: same file 452-572. Neighbour search 503-522. Rerun 524-533.
- Town and landmark roads: same file 573-669. Carving: same file 646-661 (landmark links, inside 634-667) and 671-711 (town links).
- `clearTerrain`: same file 286-294.
- `BiomeStructure.initialize`: `/mnt/frankendom-donors/Card-Forge-forge/forge-gui-mobile/src/forge/adventure/world/BiomeStructure.java` 55-106.
- `BiomeData.getPointsOfInterest`: `/mnt/frankendom-donors/Card-Forge-forge/forge-gui-mobile/src/forge/adventure/data/BiomeData.java` 70-93.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Landmark placed by rejection sampling in a disc, inside its own region | 500 tries (World.java 474); radius `sqrt(u/2 * radiusFactor)` (476) |
| No-fly box around each landmark, so landmarks keep their distance | 8 x 8 tiles centred on the point (537), i.e. 4 tiles each side |
| Nearest-town road with a distance cap; the cap is in pixels, and positions are in pixels (x multiplied by `tileSize`, 492-493) | `maxRoadDistance` 1000 (world.json line 15) = 62.5 tiles at `tileSize` 16 (world.json line 8) |
| Non-town landmarks link to the nearest town with no cap | none (613-629) |
| Clear terrain around a landmark so it sits on open ground | radius 3 (539); player start radius 10 (462) |
| Minimap is one pixel block per tile | `miniMapTileSize` 4 (world.json line 7) |
| Landmark list order (caves and dungeons last) | caves and dungeons moved to the end (BiomeData.java 85-92) |

## 4. TypeScript sketch

simplified: the sketch keeps the placement order (landmark list order, then `count` copies, 500 tries, one-tile neighbour search, rerun on failure), the no-fly box, the nearest-town road rule with a cap, the nearest-town rule with no cap for other landmarks, the Bresenham carve, and a seeded RNG. It fixes eight defects found in the donor (listed below the block) and does so on purpose, so the sketch does not reproduce the donor's behaviour in those eight places. It omits the biome noise and the biome bit map (the caller supplies `inBiome`), the WFC structures, the terrain bits and collision clearing (the caller clears in the `mark` callback), the 3 x 3 start clear for town roads, the minimap drawing and the sprites, the name generation, and the POI sprite and quest data. The `carve` function is written with `else if`, as the donor is, so roads step on one axis at a time.

```ts
// Licence: GPL-3.0 (donor, repo LICENSE). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Poi { name: string; kind: "town" | "capital" | "other"; x: number; y: number; }
export interface PoiSpec { name: string; kind: "town" | "capital" | "other"; count: number; radiusFactor: number; offsetX: number; offsetY: number; }
export interface Rect { x0: number; y0: number; x1: number; y1: number; }
export interface Link { from: Poi; to: Poi; }
export interface PlaceResult { pois: Poi[]; failedSpecs: string[]; reruns: number; }

// Seeded RNG (mulberry32) so the same seed gives the same world on server and client.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SPACING = 4;   // half-width of the no-fly box, in tiles (donor: an 8 x 8 rectangle centred on each point, World.java 537)
const TRIES = 500;   // donor: `counter < 500` (World.java 474)

function inRect(r: Rect, x: number, y: number): boolean {
  return x >= r.x0 && x < r.x1 && y >= r.y0 && y < r.y1;
}

function boxAt(x: number, y: number): Rect {
  return { x0: x - SPACING, y0: y - SPACING, x1: x + SPACING, y1: y + SPACING };
}

// Fix for the donor neighbour search (World.java 503-522): every offset is tested on its own. The donor
// sets one flag before the loops and never clears it, so after the first blocked offset nothing is accepted.
export function freeSpot(x: number, y: number, boxes: Rect[]): { x: number; y: number } | null {
  const offsets: [number, number][] = [[0, 0], [-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  for (const [dx, dy] of offsets) {
    const cx = x + dx;
    const cy = y + dy;
    if (!boxes.some(b => inRect(b, cx, cy))) return { x: cx, y: cy };
  }
  return null;
}

// Place POIs one at a time in list order. specs must already be in placement order (donor: caves and dungeons last, BiomeData.java 85-92).
// Each try draws a radius and an angle inside the biome; a try fails if it is off the map, outside the biome, or blocked.
// Donor behaviour kept: 500 tries per point, a rerun from scratch when a point cannot be placed.
// Fix: a point that fails all 500 tries (including out-of-biome tries) now counts as a failure and triggers a rerun; in the donor it is silently dropped.
export function placePois(
  specs: PoiSpec[],
  inBiome: (x: number, y: number) => boolean,
  start: { x: number; y: number },
  biomeW: number,
  biomeH: number,
  mapW: number,
  mapH: number,
  rnd: () => number,
  maxReruns: number,
): PlaceResult {
  let reruns = 0;
  for (;;) {
    const pois: Poi[] = [];
    const boxes: Rect[] = [];
    const failedSpecs: string[] = [];
    for (const spec of specs) {
      for (let i = 0; i < spec.count; i++) {
        let placed = false;
        for (let t = 0; t < TRIES && !placed; t++) {
          const r = Math.sqrt((rnd() / 2) * spec.radiusFactor);
          const th = rnd() * 2 * Math.PI;
          const x = Math.round(start.x + spec.offsetX * biomeW + r * Math.cos(th) * (biomeW / 2));
          const y = Math.round(start.y + spec.offsetY * biomeH + r * Math.sin(th) * (biomeH / 2));
          if (x < 0 || y <= 0 || x >= mapW || y >= mapH || !inBiome(x, y)) continue;
          const spot = freeSpot(x, y, boxes);
          if (spot === null) continue;
          boxes.push(boxAt(spot.x, spot.y));
          pois.push({ name: spec.name, kind: spec.kind, x: spot.x, y: spot.y });
          placed = true;
        }
        if (!placed) failedSpecs.push(spec.name);
      }
    }
    if (failedSpecs.length === 0 || reruns >= maxReruns) return { pois, failedSpecs, reruns };
    reruns++;
  }
}

function dist(a: Poi, b: Poi): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Each town links to its nearest town within maxRoad that is not already linked. Only drawn links are recorded
// (fix: the donor records a second-nearest edge as used without drawing it, World.java 606-610).
export function townRoads(towns: Poi[], maxRoad: number): Link[] {
  const links: Link[] = [];
  const linked = new Set<string>();
  const key = (i: number, j: number) => `${Math.min(i, j)}-${Math.max(i, j)}`;
  for (let i = 0; i < towns.length; i++) {   // fix: the donor loop stops one short (World.java 580)
    let best = -1;
    let bestD = Infinity;
    for (let j = 0; j < towns.length; j++) {
      if (i === j || linked.has(key(i, j))) continue;
      const d = dist(towns[i], towns[j]);
      if (d > maxRoad) continue;
      if (d < bestD) { bestD = d; best = j; }
    }
    if (best < 0) continue;
    linked.add(key(i, best));
    links.push({ from: towns[i], to: towns[best] });
  }
  return links;
}

// Every non-town point links to its nearest town with no distance cap (donor World.java 613-629).
export function poiRoads(others: Poi[], towns: Poi[]): Link[] {
  const links: Link[] = [];
  for (let i = 0; i < others.length; i++) {   // fix: the donor loop stops one short (World.java 613)
    let best = -1;
    let bestD = Infinity;
    for (let j = 0; j < towns.length; j++) {
      const d = dist(others[i], towns[j]);
      if (d < bestD) { bestD = d; best = j; }
    }
    if (best >= 0) links.push({ from: others[i], to: towns[best] });
  }
  return links;
}

// Bresenham line, one axis per step (the donor's else-if). Off-map tiles are skipped but the line still advances;
// the donor's `continue` leaves the position unchanged, so the line freezes at the edge (World.java 647-648).
export function carve(a: Poi, b: Poi, w: number, h: number, mark: (x: number, y: number) => void): void {
  let x = Math.round(a.x);
  let y = Math.round(a.y);
  const x1 = Math.round(b.x);
  const y1 = Math.round(b.y);
  const dx = Math.abs(x1 - x);
  const dy = Math.abs(y1 - y);
  const sx = x < x1 ? 1 : -1;
  const sy = y < y1 ? 1 : -1;
  let err = dx - dy;
  for (let step = 0; step <= dx + dy; step++) {   // each step reduces the remaining Manhattan distance by one
    if (x >= 0 && y >= 0 && x < w && y < h) mark(x, y);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    else if (e2 < dx) { err += dx; y += sy; }
  }
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/cm001-forge-poi.ts, which ends with `export {};`): exit 0.

Defects found in the donor, each with the fix (all reflected in the sketch):
- Neighbour search never resets (World.java 503-522). `noSolution` is set before the loops and never cleared; after the first blocked offset, every later offset is rejected, so the search effectively tries only offset (-1, -1). fix: test each offset on its own (`freeSpot`).
- Silent drop (World.java 474-534). A landmark that fails all 500 tries when every try is out of biome (line 489 `continue`) is dropped without a rerun; only a blocked last try reruns (524-533). fix: count every failure and rerun (`failedSpecs`, `placePois`).
- Last item skipped (World.java 580 and 613). Both loops stop at `size() - 1`, so the last town and the last landmark never get a road. fix: iterate all items.
- Reserved edge never drawn (World.java 606-610). The second-nearest town is marked as linked in `usedEdges` but the road is commented out (610), so the pair can never be linked later. fix: record only drawn links (`townRoads`).
- Carve freezes at the edge and has a fixed cap (World.java 646-648, 690-691). An off-map tile hits `continue` before the step, so the line stops moving; the cap is a fixed 1000 steps. fix: skip the mark, still step, and cap at the Manhattan length (`carve`).
- Structure tiling loop bound (BiomeStructure.java 69). The `my` loop tests `my < targetWidth` and steps by `min(targetHeight - my, 10)`. When `targetWidth > targetHeight`, `my` reaches `targetHeight`, the step becomes 0, and the loop never ends. For `targetWidth < targetHeight` the bottom rows are never filled. Not triggered for square structures; whether any shipped structure is non-square was not checked. fix: bound `my` by `targetHeight` and guard the step.
- Structure failure path (BiomeStructure.java 75-80). On a failed block, the code loops over all of `dataMap` but writes at `dataMap[mx + x][my + y]`, so any block with `mx > 0` or `my > 0` indexes past the array, and the function returns, leaving later blocks unset. fix: clear only the failed block and continue with the next one.
- Structure seed collisions (BiomeStructure.java 74). The seed is `seed + i * 5355 + mx * my`: every block in column `mx = 0` gets the same seed, and `(mx, my)` and `(my, mx)` collide. fix: mix `mx` and `my` separately into the seed.

## 5. Lands in

- TARGET `origins/zones/town-network.ts` (proposed new module; the zone loader calls it once per zone seed, with landmark counts, radii, the road cap and the list order read from zone data). Not in `src/fight/`.
- Parity-checklist row 23 (zone population: spawn caps, respawn, despawn; zone data fields). Landmark placement is zone content placed once, not population over time; no row covers layout, so row 23 is the nearest match and is approximate. Zone data fields to add: per landmark `count`, `radiusFactor`, `offsetX`, `offsetY`, `kind`; zone `maxRoadDistance` (1000 px in the donor); the no-fly half-width (4 tiles); the tries per landmark (500); the terrain clear radius (3).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: zones as data (landmarks, roads and the cap are zone data read by one runtime); row 23 for zone content placement; one seed gives one world on server and client; the minimap is client-only and reads the server's placement.

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism; no donor line is translated.
- Server-verified: the landmarks, roads and their rewards are server state. The client must draw the minimap from the server's placement, never place landmarks itself. The donor runs all of this in one client-side generator (World.generateNew); Frankendom must move the placement to the server.
- Determinism: the donor places landmarks with the world's `random` field (its class not read; it is reseeded at line 318), and runs the structure solvers on threads with a seed. Thread order and the shared random are not controlled in the read code. The sketch uses one seeded RNG for placement, but the WFC solver (not read) would need the same treatment before the server can use it.
- Reruns: the donor rerun clears terrain and the lists but keeps the random state moving, so a rerun is not reproducible from the seed alone unless the rerun count is stored. The sketch returns `reruns` for that reason.
- Landmarks with no `radiusFactor` (7 entries) resolve to the biome start point on every try (Java default 0; inference). Zone data should reject a zero radius.
- `maxRoadDistance` is in pixels in the donor. Frankendom zone data must state the unit (tiles) and convert once.
- The minimap in the donor is drawn for the whole map at generation time (721-757). A phone-width minimap needs a scaled or windowed version (not built here).
- Possible off-by-one at World.java 733 (`terrainIndex > biome.terrain.length`): the terrain bit encoding (not read) decides whether `>` or `>=` is right. Not confirmed; not counted as a defect.
- Services in towns (shops, inn, trader) are not placed here: they live in each town's TMX map (`PointOfInterestData.map`, world JSON). Not read.
- Landmarks, signage and the minimap beyond markers: the signage topic (names on the map) is only the town name (World.java 554-561); no road signs found in these files (not searched in depth).

- Added 2026-10-12 (checker, verified on VPS): `secondSmallestIndex` (World.java 595) is just the previous best candidate when a closer town is found, so it is not a true second-nearest; a town whose nearest is found first never gets a real second. `clearTerrain` (286-294) clears [-size, size) on both axes, so the cleared square is asymmetric (one more tile on the negative side). Sprite noise at 796 divides y by `invertedHeight`, which could be 0 (Infinity). Keep the ideas; in the sketch use a true second-nearest and a symmetric clear.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- radiusFactor tally omitted one 0.5 entry (real counts: 0.8x248, none x7, 0.01x5, 0.4, 5, 0.2, 0.5 = 264).
- Missed: secondSmallestIndex is not a true second-nearest; clearTerrain asymmetric; sprite noise divides by invertedHeight (can be 0).
Fixed 2026-10-12: tally now lists the 0.5 entry; added the three missed mechanisms as a short line.
