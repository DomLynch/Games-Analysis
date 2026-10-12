# cuteshaun-lineage2-api (city-map-design, cell 3)

Donor: `/mnt/frankendom-donors/cuteshaun-lineage2-api/src/lib/data/indexes.ts` | Licence: MIT (LICENSE line 3: "Copyright (c) 2026 Andrii Tsapko"; line 5: "Permission is hereby granted, free of charge, to any person obtaining a copy") | TypeScript | symbols `resolveRegionForCoordinate`, `resolveLocationForCoordinate`, `computePrimaryRegion`

Checked: `resolveRegionForCoordinate` (indexes.ts 1519-1533) and its wrapper `resolveRegionForSpawn` (1541) read in full. `LOCATION_NEAREST_DISTANCE_THRESHOLD` (1564) and `resolveLocationForCoordinate` (1599-1627) read in full. `computePrimaryRegion` (src/lib/api/dto/spawn.ts 86-111) read in full. Grid builder `scripts/parse-regions.ts` 120-185 read (the row loop and the dense array). Type and DTO docs read: src/lib/types.ts 386-410, src/lib/api/dto/region.ts 1-35. Route `src/app/api/[chronicle]/regions/route.ts` read in full. Data half: `data/generated/interlude/regions.json` read with a one-off count (19 regions; grid origin 4 and 8, width 11, height 16; 176 cells, all mapped to a region id; not receipted because the JSON lines are too short for a receipt). Callers: `resolveRegionForCoordinate` is called by `resolveRegionForSpawn` (1541) and by spawn.ts 94 (grep); `resolveLocationForSpawn` is called from location.ts 155 and spawn.ts 58 (grep only, not read). Confidence: high on the lookups and the vote (read in full, receipted); medium on how the death-teleport use works in the game, because the teleport itself is not in this repo and the claim comes from the donor's own doc comments (region.ts 18-21). camera_scope: n/a (not a camera cell).

Best transferable idea: answer "which authored town is this point nearest, within a radius" with one squared-distance scan over the anchors, ties to the lowest id, and no answer outside the radius, instead of a blocky tile grid.

Decision (proposed): adapt - Frankendom's zones are already data on one runtime, so an anchor per town with a radius gives the respawn town after a death and the area label without a tile grid; reject the 2^15-unit square grid as the main lookup, because the donor's own doc says its boundaries are not zone polygons, and keep the grid only for a zone authored as tiles.

Acceptance: a player who dies in the open field respawns at the nearest town anchor within 10000 units of the death point, and the area label names that same town; a server test asserts that a point with no anchor in range returns no anchor, so the zone's default town is used.

## 1. Mechanism

- Two lookups over one dataset, plus one vote.
- Region lookup (`resolveRegionForCoordinate`). Given a world point (x, y), the tile column is `(x >> 15) + grid.originX` and the row is `(y >> 15) + grid.originY` (1527-1528). A tile is 2^15 = 32768 world units. Out-of-range tiles return null (1529-1530). The cell is read from a row-major array (1531). A cell of -1 returns null (1532). Otherwise the region id is looked up in the region table (1533). Z is not used. Pure function, no allocation.
- Nearest anchor (`resolveLocationForCoordinate`). The donor brute-forces over the hunting-location anchors (about 209 per its comment; the count was not checked). For each anchor it computes dx = z.x - x and dy = z.y - y (1615-1616) and the squared distance d2. It keeps the smallest d2 (1618-1619); an exact tie goes to the lower anchor id (1621-1622). The limit is LOCATION_NEAREST_DISTANCE_THRESHOLD squared (1611), and the anchor is returned only if bestDist2 is inside it (1626). Otherwise null. Radius 10000 (1564, a comment says it is tunable).
- Majority vote (`computePrimaryRegion`). For one NPC's spawn points, each spawn is resolved with the region lookup (spawn.ts 94). Null results are skipped. Counts are kept per region id. With no counted region the result is null (103). The winner is the highest count; a tie goes to the lowest region id (109).
- Order of operations for a point: tile, then cell, then null check (1527-1532). For a spawn list: resolve each, count, then pick the winner (86-111).
- Grid build (offline, `scripts/parse-regions.ts`). Each `<map>` row binds a (geoX, geoY) label to a region id. Labels are shifted to zero-based indices (135, 146). A dense width x height array is filled with -1, and each listed cell is stored at rY * width + rX (175, 180). The grid is shipped as `data/generated/interlude/regions.json`.
- Regions. The 19 Interlude regions are numbered 0 to 18 (the first is Talking Island Village, the last Primeval Isle, from the JSON). The type comment documents the same shift and origin (types.ts 404).
- Route. `GET /api/[chronicle]/regions` returns the whole region table with `total = limit = length`, one page (regions/route.ts).

## 2. Key functions

- `resolveRegionForCoordinate`: `/mnt/frankendom-donors/cuteshaun-lineage2-api/src/lib/data/indexes.ts` 1519-1533 (receipts 1519, 1527, 1528, 1531, 1532).
- `resolveLocationForCoordinate`: `/mnt/frankendom-donors/cuteshaun-lineage2-api/src/lib/data/indexes.ts` 1599-1627 (receipts 1599, 1611, 1615, 1618, 1621, 1626; threshold at 1564).
- `computePrimaryRegion`: `/mnt/frankendom-donors/cuteshaun-lineage2-api/src/lib/api/dto/spawn.ts` 86-111 (receipts 86, 94, 103, 109).
- Grid builder: `/mnt/frankendom-donors/cuteshaun-lineage2-api/scripts/parse-regions.ts` 175 and 180 (receipts).
- Doc comments: `/mnt/frankendom-donors/cuteshaun-lineage2-api/src/lib/types.ts` 404; `/mnt/frankendom-donors/cuteshaun-lineage2-api/src/lib/api/dto/region.ts` 19 and 21.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Point to tile: shift the world coordinate, add an origin, index a dense array | Shift 15 = 32768 units per tile (1527-1528); origin 4 and 8 for Interlude (types.ts 404; regions.json) |
| Unmapped or off-grid point resolves to nothing | -1 cell means unmapped (1532); the shipped Interlude grid has no -1 cells (176 of 176 mapped, from the one-off count) |
| Nearest anchor inside a radius; squared distance; ties to lowest id | Radius 10000 units (1564; the doc comment above it says "Tunable") |
| Majority over sample points; ties to lowest id | No constant; ties by region id (109) |
| Zone catalogue as a small static table | 19 regions, ids 0 to 18 (regions.json) |

## 4. TypeScript sketch

simplified: the sketch keeps the three lookups (point to tile region, nearest anchor inside a radius, majority over sample points) and their tie rules. It omits the 19-name table, the XML-to-grid build, the z argument, the route and DTO mapping, and the fallback that Frankendom needs (section 6 item 2). It returns null for an off-grid tile exactly as the donor does. The majority loop iterates a Map; the explicit id tie rule makes the result independent of insertion order.

```ts
// Licence: MIT (donor, Copyright (c) 2026 Andrii Tsapko). Shape adapted; this sketch is written from the described mechanism.
interface Anchor { id: number; name: string; x: number; y: number; }
interface TileGrid { originX: number; originY: number; width: number; height: number; cells: number[]; }

// Tile lookup: 2^15 world units per tile, then one array index. -1 or off-grid means no region.
function tileRegion(grid: TileGrid, x: number, y: number): number | null {
  const rX = (x >> 15) + grid.originX;
  const rY = (y >> 15) + grid.originY;
  if (rX < 0 || rX >= grid.width || rY < 0 || rY >= grid.height) return null;
  const id = grid.cells[rY * grid.width + rX];
  return id < 0 ? null : id;
}

// Nearest anchor within a radius, Z ignored; exact distance ties go to the lowest id.
function nearestAnchor(anchors: Anchor[], x: number, y: number, radius: number): Anchor | null {
  const limit2 = radius * radius;
  let best: Anchor | null = null;
  let bestD2 = Number.POSITIVE_INFINITY;
  for (const a of anchors) {
    const dx = a.x - x;
    const dy = a.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2) {
      bestD2 = d2;
      best = a;
    } else if (d2 === bestD2 && best !== null && a.id < best.id) {
      best = a;
    }
  }
  return best !== null && bestD2 <= limit2 ? best : null;
}

// Most frequent region over an NPC's spawn points; ties go to the lowest region id.
function primaryRegion(spawns: { x: number; y: number }[], grid: TileGrid): number | null {
  const counts = new Map<number, number>();
  for (const s of spawns) {
    const id = tileRegion(grid, s.x, s.y);
    if (id === null) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  let best: number | null = null;
  let bestCount = -1;
  for (const [id, count] of counts) {
    if (count > bestCount || (count === bestCount && best !== null && id < best)) {
      best = id;
      bestCount = count;
    }
  }
  return best;
}
```

## 5. Lands in

- TARGET `origins/server/town-anchor.ts` (new engine module: the respawn town for a death point and the area label for the HUD; proposed path, not checked against the Frankendom repo). Server-side for the respawn choice, so it can be tested on the server.
- Parity-checklist row 17 (death and respawn). This is player death to a town, not NPC respawn, so row 23 does not apply.
- Reuse tag: adapt-from-idea (MIT: code may be adapted; the sketch is written from the mechanism)
- Brief rule served: 1 (one engine; zones as data: anchors and radius come from zone data); the area label is client HUD only; rules 7-9 n/a

## 6. Gaps and risks

- MIT: adapting the code is allowed. The sketch was still written from the described mechanism.
- Frankendom has no tile grid. Zones are data on one runtime, so anchors are the natural shape. A tile grid is only worth it for a zone authored as tiles.
- Defects, with the fix for each (the idea is kept):
  1. Square boundaries. Tiles are 32768-unit squares, and the donor's own DTO says the grid is "NOT a precise biome/zone polygon" (region.ts 21). Fix: use the nearest anchor (the donor's location lookup does this), or an authored polygon for a zone that needs one.
  2. No fallback. A miss returns null (1530, 1532, 1626), so an off-grid point or a point beyond the radius has no respawn town. Fix: fall back to the nearest anchor within a larger radius, then to the zone's default town.
  3. The -1 branch is untested by the shipped data. Every cell of the Interlude grid is mapped (176 of 176, from the one-off count), so the null path never runs on real data. Fix: add a synthetic grid with -1 cells to the server test.
- Radius and anchor count. The radius is one constant (1564), and the lookup scans every anchor per call (about 209 by the donor's comment, not counted). That is cheap at this size. A Frankendom zone count that grows much larger needs a spatial index first.
- Derived extent (from the origin, width and height, not checked in game): x runs from -131072 to 229375 and y from -262144 to 262143 for this grid.
- Not read: the client that performs the teleport (not in this repo), the content of `huntingzones.json`, and the NPC spawn route (`src/app/api/[chronicle]/npcs/[id]/spawns/route.ts`), which I saw only through grep.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
- None. All verified.
