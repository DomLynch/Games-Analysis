# amilich-isometric-city (city-map-design, cell 3)

Donor: `/mnt/frankendom-donors/amilich-isometric-city/src/lib/simulation.ts` | Licence: MIT (LICENSE, Copyright 2025 amilich: code may be adapted) | TypeScript | symbol `calculateServiceCoverage`

Checked: The list's hint file `src/components/game/MiniMap.tsx` was read in full (229 lines). It is the minimap, not the service mechanism; it is a secondary find (section 6). The real mechanism is in `src/lib/simulation.ts`: `withRange` and `SERVICE_CONFIG` (1224-1238, read), the three service constants (1250-1252, read), `calculateServiceCoverage` (from 1255, read in full to its return), `upgradeServiceBuilding` (from 1351, read to its return), and the service term of `evolveBuilding` (1650-1669, read; the rest of that function not read). Not read: the road and zone placement grammar in `generateRandomAdvancedCity` (from 3217), footprint scoring in `placeBuilding` (2675-2771 area, not read in full), the build costs in `TOOL_INFO` (not read), `src/games/isocity/types/services.ts` (not read), `src/lib/cityManager.ts` (grep only). The topic's landmarks, signage and road grammars are NOT covered by this note. Confidence: high on the coverage formula and the upgrade rule (both read end to end); medium on how the target level is used later in the simulation (only the formula was read).

## 1. Mechanism

- Service hubs are placed one at a time as normal buildings. The service kinds are police, fire, health and education (`SERVICE_CONFIG`, 1233-1238). Each kind has a base range in grid tiles: police 13, fire 18, health 24, school 11 (education), university 19 (education). Power plant and water tower are boolean coverage (1310) and are not in the disc table.
- A coverage pass (1255) first collects the service buildings, skipping any still under construction (1270) and any abandoned one (1275). Then, for each one: effective range = base range x (1 + (level - 1) x 0.2) (1292), floored to whole tiles (1293), squared (1294). Order of steps inside the disc: (a) the square of the bounding box is clamped to the grid; (b) a tile is in the disc only if its squared distance is at most the squared range (1335); (c) its coverage value is `max(0, (1 - distance / range) x 100)` (1338), so 100 at the hub's tile and 0 at the range edge; (d) the value is added to the tile's current value for that service kind, capped at 100 (1339). Overlapping hubs sum, with the cap.
- Upgrade (1351): refuse if the level is at the cap of 5 (1362), if under construction or abandoned, if the base cost is missing, or if money is short. Cost = base cost x 2^level (1377), so a level 1 to 2 upgrade costs twice the base price, and level 2 to 3 costs four times. On success the level goes up by one, money is taken, and coverage is recomputed for the whole grid (1393).
- Use of the result: `evolveBuilding` takes the average of the four kinds at a tile (1650-1655), then target level = min(5, max(1, floor(landValue / 24 + serviceAvg / 28 + age / 60 + demand boost))) (1668-1669). So service coverage raises the level a zone building grows to.

## 2. Key functions

- `calculateServiceCoverage`: `/mnt/frankendom-donors/amilich-isometric-city/src/lib/simulation.ts` from 1255. Collect, range scaling, falloff disc, capped sum.
- `upgradeServiceBuilding`: same file from 1351. Level cap, cost doubling, money check, whole-grid recompute.
- `SERVICE_CONFIG`, `withRange`: same file 1224-1238. Range table.
- `evolveBuilding` (service term only): same file 1650-1669.
- Secondary (not a note): `components/game/MiniMap.tsx` 59-69 (140 px canvas, re-render every 10 ticks or on a grid change).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Linear falloff disc: 100 at the centre, 0 at the edge | Formula at 1338 |
| Range grows with level | +0.2 per level above 1 (1251); level 1 is 100 percent, level 5 is 180 percent (comment at 1251) |
| Floored range, squared disc test | Floor (1293); squared range (1294); test at 1335 |
| Sum of overlapping sources, capped | Cap 100 per service kind (1339) |
| Level cap | 5 (1250, 1362) |
| Upgrade cost doubles with each level | Base 2 (1252, 1377); base cost from `TOOL_INFO` (not read) |
| Service term in a growth target | Average of four kinds (1650); divisor 28 (1669); landValue divisor 24 (1669); age divisor 60 (1669) |
| Range per service kind | police 13, fire 18, health 24, school 11, university 19 (1234-1238) |

## 4. TypeScript sketch

simplified: the sketch keeps the disc shape, the falloff formula, the level scaling, the floored range, the sum with a per-kind cap, the upgrade cap and cost doubling, and the target-level formula. It omits the power and water boolean coverage, the separate bounding-box scan optimisation, the tile grid objects and their mutation (the sketch uses plain buildings), the money state (passed as a number), the `TOOL_INFO` base costs (passed in), the demand term (passed in as a number), and the copy of the whole grid on upgrade. It changes one thing on purpose: the upgrade does not recompute the whole grid here (the caller must recompute the coverage; the donor does it inside the upgrade, at 1393). The sketch is written from the mechanism; MIT allows adaptation, and no line is copied.

```ts
// Licence: MIT (donor LICENSE, 2025 amilich): code may be adapted. This sketch is written from the described mechanism, not copied from the donor lines.
const MAX_LEVEL = 5;               // service building level cap (donor: SERVICE_MAX_LEVEL 5)
const RANGE_PER_LEVEL = 0.2;       // +20% range per level above 1 (donor: SERVICE_RANGE_INCREASE_PER_LEVEL 0.2)
const UPGRADE_COST_BASE = 2;       // upgrade cost = base cost * 2^level (donor: SERVICE_UPGRADE_COST_BASE 2)
const COVERAGE_CAP = 100;          // per service kind, summed coverage is capped at this value

type ServiceKind = "police" | "fire" | "health" | "education";
interface ServiceDef { kind: ServiceKind; range: number; }
interface PlacedBuilding { kind: string; x: number; y: number; level: number; built: boolean; abandoned: boolean; }
type CoverageGrid = number[][];
type Coverage = Record<ServiceKind, CoverageGrid>;

// Range is in grid tiles. The donor's power plant and water tower are boolean coverage and are not in this table.
const DEFS: Record<string, ServiceDef> = {
  police_station: { kind: "police", range: 13 },
  fire_station: { kind: "fire", range: 18 },
  hospital: { kind: "health", range: 24 },
  school: { kind: "education", range: 11 },
  university: { kind: "education", range: 19 },
};

function emptyGrid(size: number): CoverageGrid {
  return Array.from({ length: size }, () => new Array<number>(size).fill(0));
}

// Level 1 gives the base range; each level above adds 20 percent; the result is floored to whole tiles.
function effectiveRange(base: number, level: number): number {
  return Math.floor(base * (1 + (level - 1) * RANGE_PER_LEVEL));
}

// Each built, non-abandoned service adds a linear falloff disc: 100 at its tile, 0 at its range edge.
// Overlapping discs sum, capped at COVERAGE_CAP for each service kind.
function computeCoverage(size: number, buildings: PlacedBuilding[]): Coverage {
  const cov: Coverage = { police: emptyGrid(size), fire: emptyGrid(size), health: emptyGrid(size), education: emptyGrid(size) };
  for (const b of buildings) {
    if (!b.built || b.abandoned) continue;
    const def = DEFS[b.kind];
    if (!def) continue;
    const r = effectiveRange(def.range, b.level);
    const r2 = r * r;
    const grid = cov[def.kind];
    for (let y = Math.max(0, b.y - r); y <= Math.min(size - 1, b.y + r); y++) {
      for (let x = Math.max(0, b.x - r); x <= Math.min(size - 1, b.x + r); x++) {
        const dx = x - b.x;
        const dy = y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > r2) continue;
        const d = Math.sqrt(d2);
        const add = Math.max(0, (1 - d / r) * 100);
        grid[y][x] = Math.min(COVERAGE_CAP, grid[y][x] + add);
      }
    }
  }
  return cov;
}

// Upgrade one service building if it is built, not abandoned, below the cap, and affordable.
// The caller recomputes coverage afterwards (the donor recomputes the whole grid).
function tryUpgrade(b: PlacedBuilding, baseCost: number, money: number): { level: number; cost: number } | null {
  if (!b.built || b.abandoned || b.level >= MAX_LEVEL) return null;
  const cost = baseCost * Math.pow(UPGRADE_COST_BASE, b.level);
  if (money < cost) return null;
  b.level += 1;
  return { level: b.level, cost };
}

// Target building level from land value, average service coverage at a tile, age and a demand boost.
function targetLevel(landValue: number, serviceAvg: number, age: number, demandBoost: number): number {
  return Math.min(5, Math.max(1, Math.floor(landValue / 24 + serviceAvg / 28 + age / 60 + demandBoost)));
}

export {};
```

## 5. Lands in

- TARGET `origins/world/town-services.ts` (new, proposed path): service hubs placed one at a time in a zone, each with a range and a level; the coverage map is derived state computed on the server (one ledger), and any client overlay is HUD only.
- Parity row 23 (zone population): service coverage sets how far a zone's buildings can grow (the target-level term at 1668-1669), which is the population side of the zone.
- Reuse tag: adapt-from-idea (MIT: adaptation allowed; this sketch is written from the mechanism)
- Brief rule served: zones as data (ranges and level caps per hub kind are zone data); one ledger (coverage and upgrades are server-side state, money is the same ledger)

## 6. Gaps and risks

- The whole-grid recompute on upgrade (1393) and the full-grid copy on upgrade (the map over every tile at the top of `upgradeServiceBuilding`) make each upgrade cost O(grid). Fix: recompute only the upgraded hub's disc (the sketch returns the upgrade and leaves the recompute to the caller).
- Build costs are not in the box (`TOOL_INFO`, not read), so the base price for each hub is unknown. The doubling rule is confirmed; the base numbers are not.
- The disc is in grid tiles. Frankendom's zones are not a uniform grid; a zone needs a tile grid or a distance check on world coordinates before this shape fits.
- The donor combines school and university into one education kind (1237-1238). Frankendom would need to decide whether they are separate services.
- Power and water in the donor are boolean (1310). A Frankendom hub that gates an effect on a boolean needs a different rule, not the falloff.
- The donor's cap is per kind (100). A cap that is too low removes the value of stacking hubs; the test in the acceptance line checks overlap.
- Frankendom rulings: coverage and upgrades must be server-verified (money and level change on the server), and the coverage readout is a client overlay only. The donor does both in one process.
- Secondary find, not a note: `components/game/MiniMap.tsx` (read in full) draws the whole grid on a 140 px canvas at scale 140 / grid size (59-69). It re-renders every 10 ticks or when the grid changes (69), caches the raster, and redraws only the viewport outline when its effect runs (viewport, tick or grid change). The viewport corners are converted from iso screen space back to grid space with an inverse iso transform. This belongs under row 14 (HUD), not row 23, and is not written up as a separate note (one note per cell).
- Landmarks, signage and road or building grammars (the rest of the topic) are NOT covered; `generateRandomAdvancedCity` (from 3217) and `placeBuilding` footprint scoring were not read and need their own cell.

Best transferable idea: each built service hub adds a linear-falloff coverage disc whose range grows 20 percent per level, discs sum with a cap of 100 per service kind, and each upgrade costs twice the last.

Decision (proposed): adapt — take the falloff disc, the level-scaled range and the doubling upgrade cost, with the zone data as per-hub ranges; reject the whole-grid recompute on each upgrade and recompute only the upgraded disc (efficiency defect fixed).
Acceptance: in a test town, placing a second guard post changes the guard coverage readout only inside its range (100 at its tile, falling linearly to 0 at the range edge, capped at 100 where discs overlap); upgrading it to level 2 extends its range by 20 percent and costs twice the base price; a server test asserts the readout on three sample tiles.

Reuse tag: adapt-from-idea (MIT; adaptation allowed; sketch written from the mechanism)
Brief rule served: zones as data; one ledger (service levels and money are server state)
