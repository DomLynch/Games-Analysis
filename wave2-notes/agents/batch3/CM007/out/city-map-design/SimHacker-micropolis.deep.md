# SimHacker-micropolis (city-map-design, cell 2)

Donor: `/mnt/frankendom-donors/SimHacker-micropolis/MicropolisCore/src/MicropolisEngine/src/connect.cpp` (with `zone.cpp`, `simulate.cpp`, `micropolis.h`) | Licence: GNU GPL version 3 or later, with additional terms under GPL section 7 (no SimCity or Electronic Arts trademark rights) (per the connect.cpp header lines 10-11 and map_type.h line 21) | C++ | symbol `Micropolis::fixSingle` / `fixZone` / `zonePlop` / `buildHouse`

Checked: Read in full: `connect.cpp` 66-80 (RoadTable), 105-108 (neutralizeRoad), 122-200 (connectTile dispatch), 260-276 (layRoad costs), 554-634 (fixZone and the road branch of fixSingle); `zone.cpp` 79-102 (doZone dispatch), 352-382 (zonePlop), 445-491 (buildHouse), 500-523 (evalLot), 534-600 (doResidential up to the immigration branch), 710-716 (resPlop), 722-741 (evalRes); `simulate.cpp` 636-653 (valve update). Not read: the rail and wire branches of fixSingle (636 onward), the sprite art, setZonePower, the caller of the valve update, RES_VALVE_RANGE. Callers: fixZone is called only from connect.cpp 171-191 (grep over MicropolisEngine/src/*.cpp). buildHouse is called only from zone.cpp 613 (grep). zonePlop has 9 call sites (grep); only resPlop (715) was read in context. evalLot callers were not grepped; buildHouse is the one read. Confidence: high on the road mask, the re-derive step and the 3x3 stamp; medium on what the lot test was meant to count (see defect 1). Camera: not applicable.

Best transferable idea: A road tile's shape is a 4-bit neighbour mask looked up in a 16-entry table, and every road edit re-derives the edited tile and its four neighbours; a 3x3 building is stamped as nine base-plus-offset tiles.
Decision (proposed): adapt - take the mask-to-shape lookup and the re-derive-after-edit rule for the Frankendom town grid, with our own tile sheet, one neighbour rule for all four directions, and a lot score that counts roads only (the donor's lot test counts other tiles too; see section 6).
Acceptance: A player lays a road beside an existing road and it joins on the same frame; a T-junction shows the T piece; a house goes on the free 3x3 block that touches the most roads. A test asserts that after each placeRoad every road tile's shape equals shapeFor(mask of its four neighbours) and that a stamped block holds nine distinct ids base..base+8.

## 1. Mechanism

- A town is one map array of tile ids. One road command runs `connectTile`: it lays the road (`layRoad`), then calls `fixZone` on the same tile (connect.cpp 180-181). Laying road on clear dirt costs 10 (line 262); river, edge and channel tiles cost 50 (line 275). Auto-bulldoze costs 1 (line 152) only when `autoBulldoze` is on and the tile has BULLBIT and is rubble/tree/non-bridge terrain (140-158); it is a conditional cost, not part of a normal road lay.
- `fixZone` (554-571) re-derives the edited tile first, then the tile to the north (y-1), east (x+1), south (y+1) and west (x-1), each only if in bounds. Every road edit therefore repairs its neighbours.
- `fixSingle` (582-634), for a road-type tile, builds a 4-bit mask: bit 1 for the north neighbour, 2 east, 4 south, 8 west (598, 608, 618, 628). A neighbour counts when it is a road id, or the matching rail or powered-road id, with per-direction exclusions (597, 607, 617, 627). It then writes `RoadTable[mask] | BULLBIT | BURNBIT` (632). Before the test, `neutralizeRoad` (105-108) folds ids 64 to 207 into the 16-id block 64-79 by keeping the low 4 bits, so flag bits do not change the comparison.
- `RoadTable` (76-80) has 16 entries. Index 15, all four neighbours, maps to `INTERSECTION` (80). Index 0 maps to `ROADS` (77). The other 14 entries are table values (names only; art not read).
- Building grammar, zone centre: `zonePlop(pos, base)` (352-382) first refuses if any of the nine footprint tiles has an id from FLOOD (48) up to ROADBASE (64), which by the enum covers flood, radiation and fire tiles (first loop of the function; not receipted line by line). Otherwise it writes `base + offset` into the in-bounds tiles only (the donor's own `@bug` at 350: partial on-map construction at the edge; see defect 5) (ring order from line 355, write at 378, offset increments at 381) and sets the centre's zone and bulldoze bits. `resPlop` (710-715) picks `base = ((value * 4 + den) * 9) + RZB - 4`: 4 land-value classes times 4 densities, each a nine-tile set. Empty residential centre is `FREEZ` = 244 (micropolis.h 532).
- Lot choice for a single house: `buildHouse` (445-491) scans the eight ring tiles around the centre (448), calls `evalLot` on each (460), keeps the highest score, and on a tie replaces the pick with a 1-in-8 draw (473). It writes one house tile (489). `evalLot` (500-523) returns -1 if the tile is not clear (509-510), else starts at 1 (513) and adds 1 for each 4-neighbour that is not DIRT and has id at or below LASTROAD = 206 (521; micropolis.h 484).
- Growth gate (`doResidential`, 534-600): an empty centre (`FREEZ`) is always evaluated; a built zone only on a 1-in-8 draw (563). `zscore = resValve + evalRes(...)` (after the 563 gate). Immigration needs zscore above -350 (572) and a comparison of zscore - 26380 against a random signed value. An empty tile with population below 8 gets `buildHouse` from `doResIn` (613). `evalRes` (722-741) returns -3000 when traffic is negative; otherwise land value minus pollution, floored at 0, times 32, capped at 6000 (736), minus 3000 (739).
- Demand valve (simulate.cpp 642-653): residential ratio is clamped to `resRatioMax` (642), then overwritten by line 644 (defect 2 below), then taxed (648), then added to `resValve` and clamped to `RES_VALVE_RANGE` (653).

## 2. Key functions

- `fixZone`: `/mnt/frankendom-donors/SimHacker-micropolis/MicropolisCore/src/MicropolisEngine/src/connect.cpp` 554-571. Re-derives the tile and its four neighbours.
- `fixSingle` road branch: same file 582-634. Four neighbour bits, table lookup at 632.
- `connectTile` road case: same file 179-181. Lay then fix.
- `zonePlop`: `/mnt/frankendom-donors/SimHacker-micropolis/MicropolisCore/src/MicropolisEngine/src/zone.cpp` 352-382. Refuse-or-stamp nine tiles.
- `buildHouse` and `evalLot`: same file 445-491 and 500-523. Ring scan, neighbour road score, 1-in-8 tie break.
- `doResidential` and `evalRes`: same file 534-600 and 722-741. Growth gate and land-value scale.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Road shape = 4-bit neighbour mask into a 16-entry table | 16 entries (connect.cpp 76); bits N=1, E=2, S=4, W=8 (598, 608, 618, 628) |
| Re-derive the edited tile and its 4 neighbours after one edit | 5 tiles (connect.cpp 554-571) |
| Building = 3x3 block of nine base+offset tiles | 9 tiles (zone.cpp 355); 16 variants = 4 values x 4 densities (714) |
| Lot score = 1 plus adjacent count, occupied = -1 | base 1 (513); -1 (510); count over non-DIRT ids up to 206 (521) |
| Tie break on best candidate | 1 in 8 (zone.cpp 473) |
| Road cost by tile type | 10 clear (262); 50 water and edges (275); 1 auto-bulldoze, only if autoBulldoze on and tile has BULLBIT (140-158) |
| Growth gate on a built zone | 1 in 8 draw (563); immigration above zscore -350 (572) |
| Land value to demand score | x32, cap 6000, minus 3000 (736, 739) |
| Valve clamp | `RES_VALVE_RANGE` (simulate.cpp 653; value not read) |

## 4. TypeScript sketch

simplified: the sketch is clean-room. It uses one rule for all four directions (the donor's per-direction exclusions are dropped), one `road` kind (no rail, wire, power or bridge ids), an injected 16-entry `shapeFor` (no donor table values or sprite names), an injected `blocked` test for stamping, and an injected rng for the tie break. It omits costs, bulldoze, burn flags, the growth valve, zone power and the 3x3 land-value variants.

```ts
// Licence of donor: GNU GPL v3 or later, with additional terms (GPL s.7). This sketch is clean-room:
// written from the described rule (4-bit neighbour mask, 3x3 stamp, neighbour lot score).
// No donor table values, tile ids or sprite names are copied; shapeFor is injected.

type Kind = 'none' | 'road' | 'building' | 'water';

interface Cell {
  kind: Kind;
  shape: number; // our own tile id, derived for roads, stamped for buildings
}

// Neighbour order used for the mask: bit 1 = north (y-1), bit 2 = east (x+1), bit 4 = south (y+1), bit 8 = west (x-1).
const NEIGH4: ReadonlyArray<readonly [number, number]> = [[0, -1], [1, 0], [0, 1], [-1, 0]];

// Ring of 9 tiles for a 3x3 stamp (row-major, centre at index 4).
const RING9: ReadonlyArray<readonly [number, number]> = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0], [0, 0], [1, 0],
  [-1, 1], [0, 1], [1, 1],
];

// Eight ring tiles around a centre (no centre tile).
const RING8: ReadonlyArray<readonly [number, number]> = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0], [1, 0],
  [-1, 1], [0, 1], [1, 1],
];

class TownGrid {
  readonly cells: Cell[];

  constructor(
    readonly w: number,
    readonly h: number,
    private readonly shapeFor: (mask: number) => number, // 16 entries, supplied by the art pipeline
  ) {
    this.cells = Array.from({ length: w * h }, () => ({ kind: 'none' as Kind, shape: 0 }));
  }

  at(x: number, y: number): Cell | undefined {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return undefined;
    return this.cells[y * this.w + x];
  }

  // One rule for all four directions (the donor's per-direction exclusions are replaced).
  mask(x: number, y: number): number {
    let m = 0;
    NEIGH4.forEach(([dx, dy], bit) => {
      const n = this.at(x + dx, y + dy);
      if (n && n.kind === 'road') m |= 1 << bit;
    });
    return m;
  }

  derive(x: number, y: number): void {
    const c = this.at(x, y);
    if (!c || c.kind !== 'road') return;
    c.shape = this.shapeFor(this.mask(x, y));
  }

  // One edit: change the tile, then re-derive it and its four in-bounds neighbours.
  placeRoad(x: number, y: number): boolean {
    const c = this.at(x, y);
    if (!c || c.kind !== 'none') return false;
    c.kind = 'road';
    this.derive(x, y);
    for (const [dx, dy] of NEIGH4) this.derive(x + dx, y + dy);
    return true;
  }
}

// Stamp a 3x3 block with nine ids base..base+8. All-or-nothing: refuses if any tile is off-map or blocked
// (fixes the donor's partial edge stamp).
function stampBlock(
  g: TownGrid,
  cx: number,
  cy: number,
  baseId: number,
  blocked: (c: Cell) => boolean,
): boolean {
  for (const [dx, dy] of RING9) {
    const c = g.at(cx + dx, cy + dy);
    if (!c || blocked(c)) return false;
  }
  RING9.forEach(([dx, dy], i) => {
    const c = g.at(cx + dx, cy + dy);
    if (c) {
      c.kind = 'building';
      c.shape = baseId + i;
    }
  });
  return true;
}

// Lot score for one tile: -1 if occupied; else 1 plus one per adjacent ROAD (not any non-clear tile).
function lotScore(g: TownGrid, x: number, y: number): number {
  const c = g.at(x, y);
  if (!c || c.kind !== 'none') return -1;
  let score = 1;
  for (const [dx, dy] of NEIGH4) {
    const n = g.at(x + dx, y + dy);
    if (n && n.kind === 'road') score++;
  }
  return score;
}

// Pick the best of the 8 ring tiles around a centre. A later tie replaces the pick with chance 1/8.
function pickLot(
  g: TownGrid,
  cx: number,
  cy: number,
  rng: () => number,
): [number, number] | null {
  let best = 0;
  let pick: [number, number] | null = null;
  for (const [dx, dy] of RING8) {
    const s = lotScore(g, cx + dx, cy + dy);
    if (s <= 0) continue;
    if (s > best) {
      best = s;
      pick = [cx + dx, cy + dy];
    } else if (s === best && rng() < 1 / 8) {
      pick = [cx + dx, cy + dy];
    }
  }
  return pick;
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/cm007-tsc/town-grid.ts with `export {};` appended) exited 0.

## 5. Lands in

- TARGET `origins/world/town-grid.ts` (new): the zone grid as data (tile kinds), the client-side shape derive, and the 3x3 stamp for building blocks. The server reads the same grid only where coverage needs it.
- Parity-checklist row 23 (zone population: coverage and spawn logic in `origins/server/world-spawns.ts`). The road shapes are client drawing, so no server row applies to them.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later with additional terms; clean-room only, shape not code).
- Brief rule served: zones as data (one grid per zone, shapes derived, no sprite ids in zone files); one engine for layout (one grid used by client and server).

## 6. Gaps and risks

- Licence: GPL v3 or later with GPL section 7 terms (no SimCity or EA trademark rights). Clean-room only. The sketch copies no table values, tile ids or sprite names.
- Defect 1, lot test counts too much: `evalLot` (521) adds one for any 4-neighbour that is not DIRT and has id at or below LASTROAD (206). By the enum in micropolis.h (lines 404-484), that includes water (2-20), trees (21-43), rubble (44-47), flood, fire (56-63) and the 80-206 range. The comment says "look for road". Fix: count road kinds only (the sketch does).
- Defect 2, copy-paste overwrite in the valve (simulate.cpp 642-644): line 642 clamps `resRatio`, then line 644 writes `resRatio = min(indRatio, indRatioMax)`, so the residential clamp is lost and the industrial one is applied to the wrong variable. Fix: `indRatio = min(indRatio, indRatioMax)`, keep the residential clamp. Not in this note's sketch; flagged for the growth lane.
- Defect 3, asymmetric neighbour exclusions: north and south exclude `ROADBASE` (597, 617) but east and west do not; east and west exclude `VBRIDGE` (607, 627) but north and south do not. The intent was not read. Fix: one table for all four directions (the sketch does this).
- Defect 4, the `@bug` comment (zone.cpp 462) says score is never 0: occupied tiles return -1 (510), which never beats a best of 0, so the effect is harmless. Fix: return 0 for occupied and skip it explicitly.
- Defect 5, partial stamp at the map edge: `zonePlop` (zone.cpp 350 `@bug`, 378) checks only in-bounds tiles for FLOOD..ROADBASE and then writes only in-bounds tiles, so an edge block is stamped partially. Fix: refuse the whole stamp if any of the nine tiles is off-map (the sketch's `stampBlock` now does, so the acceptance test of nine distinct ids holds).
- Missed mechanism: `doResidential` forces `zscore = -500` when the zone has no power (zone.cpp 568-570), which blocks immigration; the symmetric emigration branch (585-589, `zscore < 350` and `zscore + 26380` below a signed draw) calls `doResOut`; `doResIn` returns early when pollution > 128 (604). Frankendom: unpowered or polluted zones stop growing and may shrink.
- Risk: the tie break and the growth gate use a global random draw (getRandom16). For a server-verified world, the layout rng must be seeded per zone, or two clients will derive different towns. Frankendom rule: one ledger, server-verified.
- Risk: each built zone draws 1-in-8 when doResidential runs (563). How often the caller runs it was not read. Frankendom row 23 needs a per-tick budget; the layout code should not sit on that path.
- Not applicable: MAX_ATTACKERS = 3 and the fight camera. The grid does not decide attackers, and the road shapes are ground drawing the camera does not read.
- Not read: the rail, wire and power branches of `fixSingle` (636-734), art names beyond the table, `setZonePower`, the valve's caller and `RES_VALVE_RANGE`.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- Sketch `stampBlock` copied the donor's partial-edge-stamp `@bug` (zone.cpp 350); note listed no such defect.
- Auto-bulldoze cost 1 (connect.cpp 152) was stated as unconditional; it needs autoBulldoze on and BULLBIT (140-158).
- Missed: zonePlop partial stamp (350, 378); unpowered zone forces zscore -500 (568-570) and emigration branch (585-589); doResIn pollution>128 gate (604).

Fixed 2026-10-12: auto-bulldoze cost stated as conditional; stampBlock made all-or-nothing and defect 5 added; missed power/emigration/pollution mechanism added as a line in section 6.
