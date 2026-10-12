# graememcc-micropolisJS (city-map-design, cell 20)

Donor: `/mnt/frankendom-donors/graememcc-micropolisJS/src/emergencyServices.js` | Licence: GNU GPL v3 with additional terms under GPL Section 7 (file header: "released under the GNU GPL v3, with some additional terms"; LICENSE: "under the GNU General Public License V3"; the additional terms are trademark and indemnity terms, and name the MICROPOLIS and SimCity marks) | JavaScript (ES modules, some TypeScript helper files) | symbol `handleService`

Checked: The hint file `src/blockMap.ts` (122 lines, read in full) is only the coarse grid container; it is the wrong file for the mechanism. The real mechanism is `handleService` in `src/emergencyServices.js` (51 lines, read in full), with the coverage pass `fireAnalysis` and `smoothMap` in `src/blockMapUtils.js` (39-67, 316-365, 469-477), the scan and cycle wiring in `src/simulation.js` (221-226, 292-299, 362-389), the budget effect in `src/budget.js` (31-35, 212-229) and the road link check in `src/traffic.js` (83-98). Candidates opened: 6 source files (blockMap.ts, emergencyServices.js, blockMapUtils.js, simulation.js, budget.js, traffic.js) plus LICENSE, and a grep for `fireEffect|policeEffect|fireStationMap|smoothMap|speedFireAnalysis`. Read but not expanded: the map scanner's dispatch that calls the handler (not read), `map.getTile(x, y).isPowered()` (not read), `TileUtils.isDriveable` (not read), the head of the cycle switch that calls the phase functions (not read), and one consumer line `src/miscTiles.js:55`. Confidence: high on the service effect, the penalties, the smoothing stencil and the schedule; medium on the police read path, which I found inconsistent and did not resolve for intent. Scope: a city service-coverage field, not a camera; camera_scope not applicable.

Best transferable idea: each service drops an effect into a coarse grid (halved when unpowered, halved again when no road touches it), and a few neighbour-averaging passes turn a handful of hubs into a smooth coverage field that drives the minimap and the fire-spread chance (miscTiles.js 55-58). The advisor warnings read the budget effect, not this field.
Decision (proposed): adapt - take the coverage field shape (per-hub effect with power and road penalties, coarse cells, a fixed number of smoothing passes, rebuilt each scan; a warn-under-70-percent-of-max rule is Frankendom's own idea to build, since the donor's version is dead code, see the Advisor warning line) and fix the edge divisor; do not copy the police buffer order.
Acceptance: a server unit test: before smoothing, a hub with power and road link puts 1000 in its cell (budget max); unpowered gives 500; unlinked gives 500; both missing gives 250; a corner cell whose two in-bounds neighbours hold 100 each smooths to 50 (the donor gives 25); the minimap tint (client only) reads the same field.

## 1. Mechanism

- Registration: `EmergencyServices.registerHandlers` binds one handler per station type to the map scanner, police to `POLICESTATION` and fire to `FIRESTATION` (emergencyServices.js 39-40, 45-46). The scanner's dispatch that calls them is not read.
- Per station found (`handleService`, 17-36): (a) the census count for that type goes up by one (19). (b) The effect starts as the budget effect for that type (21; `budget.fireEffect` or `budget.policeEffect`). (c) If the station tile is not powered, the effect is halved with `Math.floor` (22, 24-25; the comment at 23 says unpowered buildings are half as effective). (d) If no driveable tile is among the 12 perimeter offsets, the effect is halved again (28-30; `findPerimeterRoad` is traffic.js 83-98, loop of 12 at 84, driveable test at 89). (e) The effect is added to the coarse cell under the station (32-34). Coarse cells are 8 world tiles per side (`new BlockMap(..., 8)`, simulation.js 77 and 86; block index is `floor(world / blockSize)`, blockMap.ts 116).
- The fire station map is cleared at each census clear (simulation.js 224), so each scan rebuilds the field from the stations present.
- Budget effect: `fireEffect` starts at `MAX_FIRESTATION_EFFECT` = 1000 (budget.js 35) and is recomputed in the budget function (its caller was not read) by `Math.floor(this.fireEffect * this.fireSpend / this.fireMaintenanceBudget)` (budget.js 224-225), so a station is worth less when its funding is cut.
- Field smoothing (`fireAnalysis`, blockMapUtils.js 470-477): three calls of `smoothMap` with the neighbour style, passing between the station map and the effect map, so the result is in `fireStationEffectMap` after the third call (474-476). The neighbour style (`smoothMap`, 39-67, style branch at 56-58): `edges` is the sum of the in-bounds 4-neighbours (44-54); the new cell is `floor((centre + floor(sum / 4)) / 2)` (57-58). Each pass moves influence about one cell, so three passes spread a station's value roughly three cells (inference from the stencil, not measured).
- Schedule: the boot scan runs `fireAnalysis` once after the full map scan (simulation.js 292-298). In the running cycle, a phase runs `fireAnalysis` when `simCycle % speedFireAnalysis[speedIndex] === 0` (384-385), with divisors `[1, 10, 20]` by speed index (306). The driver of the phase switch was not read.
- Advisor warning: in its message slot, the game warns when `fireEffect < floor(7 * MAX / 10)` and population is over 20 (simulation.js 521-522). The police check is the same shape (526-527). Donor defect (checker, verified): simulation.js 521 and 526 read `budget.MAX_FIRE_STATION_EFFECT` / `MAX_POLICE_STATION_EFFECT`, but budget.js 34-35 defines `MAX_FIRESTATION_EFFECT` / `MAX_POLICESTATION_EFFECT`; the operand is undefined, `Math.floor` gives NaN, the comparison is false and the warning can never fire. Keep the idea (warn under 70 percent of max), fix the name. It compares the budget effect (`fireEffect`), not the smoothed field. The real consumer of the smoothed fire field is miscTiles.js 55-58: a fire's extinguish rate is 1 when the field value is over 100 (2 over 20), else 10.
- Police path: `crimeScan` (blockMapUtils.js 321-365) smooths the police station map three times (328-330), and for each developed block subtracts the police value from a crime score (355), then clamps to 0-250 (358). The three-pass result is in `policeStationEffectMap`, but line 355 reads `policeStationMap`, which holds the two-pass result (see section 6).

## 2. Key functions

- `handleService` (closure over census key, budget key, map key): `/mnt/frankendom-donors/graememcc-micropolisJS/src/emergencyServices.js` 17-36. The whole station effect: count, budget, power halving, road halving, add to cell.
- `fireAnalysis`: `/mnt/frankendom-donors/graememcc-micropolisJS/src/blockMapUtils.js` 470-477. Three smoothing passes into the fire effect map.
- `smoothMap`: `/mnt/frankendom-donors/graememcc-micropolisJS/src/blockMapUtils.js` 39-67. Neighbour-average style (56-58) and the five-cell style (59-64, used for pollution and density, not the service path).
- `crimeScan` (police side): `/mnt/frankendom-donors/graememcc-micropolisJS/src/blockMapUtils.js` 321-365.
- Budget effect: `/mnt/frankendom-donors/graememcc-micropolisJS/src/budget.js` 212-229 (per-type effect from spend ratio).
- Scan and schedule: `/mnt/frankendom-donors/graememcc-micropolisJS/src/simulation.js` 221-226 (clear), 292-299 (boot scan), 362-389 (phase cases, partial), 306 (speed table), 521-527 (advisor).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Per-hub effect = budget effect, halved if unpowered, halved again if unlinked to roads | Full effect 1000 (theirs, budget.js 35); unpowered divisor 2 (theirs, emergencyServices.js 25); no-road divisor 2 (theirs, 29-30) |
| Coarse cells, rebuilt each scan | Cell size 8 world tiles (theirs, simulation.js 77 and 86) |
| Field spread by a fixed number of neighbour passes | 3 passes (theirs, blockMapUtils.js 474-476 and 328-330) |
| Neighbour average: half of (centre + average of neighbours) | Divisor 4 always (theirs, 57); this is the edge defect in section 6 |
| Five-cell average (not the service path) | Shift by 2 = divide by 4 on a five-cell sum (theirs, 60) |
| Warn when a service runs under a fraction of max | 7/10 of max, and population over 20 (theirs, simulation.js 521) |
| Scan cadence by speed | Divisors 1, 10, 20 (theirs, simulation.js 306) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: each station's effect (funding value, halved if unpowered, halved again if no road link), added into a coarse cell, cells rebuilt each scan, then the same number of neighbour-averaging passes. It changes two things on purpose: the neighbour average divides by the neighbours that exist (the donor always divides by 4), and it returns one field rather than alternating two buffers. It omits the census count, the map scanner dispatch, the power and driveable checks (their bodies were not read, so the sketch takes them as booleans), the cycle schedule, the advisor warning, the police branch and the crime subtraction. The sketch is not a translation of the donor lines.

```ts
// Licence: GPL v3 with additional terms (donor, Section 7). clean-room sketch written from the described mechanism, not a translation of the donor lines. The donor trademark is not used.
// clean-room
export interface Service {
  x: number;              // world tile
  y: number;
  budgetEffect: number;   // per-service effect from the budget (donor budget.js 225)
  powered: boolean;
  roadAdjacent: boolean;  // a driveable tile among the 12 perimeter offsets (donor traffic.js 84-89)
}

export const BLOCK = 8;     // world tiles per coverage cell (donor simulation.js 77 passes 8)
export const PASSES = 3;    // smoothing passes for the fire coverage field (donor blockMapUtils.js 474-476)

// Effect one service adds to its cell: halved if unpowered, halved again if no road touches it.
export function serviceEffect(s: Service): number {
  let e = s.budgetEffect;
  if (!s.powered) e = Math.floor(e / 2);
  if (!s.roadAdjacent) e = Math.floor(e / 2);
  return e;
}

export function emptyGrid(w: number, h: number): number[][] {
  return Array.from({ length: w }, () => new Array<number>(h).fill(0));
}

// One smoothing pass: the cell's value averaged with its existing neighbours.
// Fix: the neighbour average divides by the neighbours that exist, not always by 4 (donor divides by 4 at edges).
export function smoothNeighbours(src: number[][]): number[][] {
  const w = src.length;
  const h = w > 0 ? src[0].length : 0;
  const dst = emptyGrid(w, h);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let sum = 0;
      let n = 0;
      if (x > 0) { sum += src[x - 1][y]; n++; }
      if (x < w - 1) { sum += src[x + 1][y]; n++; }
      if (y > 0) { sum += src[x][y - 1]; n++; }
      if (y < h - 1) { sum += src[x][y + 1]; n++; }
      const avg = n > 0 ? Math.floor(sum / n) : 0;
      dst[x][y] = Math.floor((src[x][y] + avg) / 2);
    }
  }
  return dst;
}

// Coverage field for one service type: rebuilt from scratch each scan, then spread by PASSES smoothing passes.
export function coverageField(services: Service[], worldW: number, worldH: number): number[][] {
  let grid = emptyGrid(Math.ceil(worldW / BLOCK), Math.ceil(worldH / BLOCK));
  for (const s of services) {
    grid[Math.floor(s.x / BLOCK)][Math.floor(s.y / BLOCK)] += serviceEffect(s);
  }
  for (let i = 0; i < PASSES; i++) {
    grid = smoothNeighbours(grid);
  }
  return grid;
}
```

Typecheck: copied to the VPS as /tmp/cm015-micropolis-coverage.ts and `npx -p typescript tsc --noEmit --strict --target es2020` exited 0 with no output. The file already contains exports, so no `export {}` was needed.

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone service coverage: a hub's coverage field computed on the server from zone data, power and road link; the minimap reads it on the client). Parity-checklist row 23 (zone population: coverage is one of the zone data fields in row 23).
- Reuse tag: rewrite-from-idea (GPL v3 with additional terms; clean-room only; no donor name or marks used)
- Brief rule served: zones as data on one runtime (the coverage constants are zone data; the server owns the field); row 23 coverage as zone data

## 6. Gaps and risks

- GPL v3 with additional terms: clean-room only. The additional terms also restrict the MICROPOLIS and SimCity names; Frankendom code must not use them.
- Defect (edge divisor, kept idea): the neighbour average always divides by 4 (blockMapUtils.js 57), so a cell at the map edge or a corner gets less than its in-bounds neighbours give. Fix (in the sketch): divide by the number of neighbours that exist. Acceptance test in the header covers it.
- Defect (overshoot, not the service path): the five-cell smoother divides a five-cell sum by 4 (blockMapUtils.js 60), so the field grows under smoothing. Fix: divide by the number of cells summed. This is for pollution and density (277-278 and 448-450), not for Frankendom's service field, so it is listed for completeness only.
- Inconsistency (police): `crimeScan` smooths three times into `policeStationEffectMap` (328-330) but scores crime from `policeStationMap` (355), which holds the two-pass result. The fire side reads its three-pass buffer (`fireStationEffectMap`, read by miscTiles.js 55). The intent was not found in the code read; a fix must choose one buffer and document it. Do not copy the police order.
- Ownership: the donor recomputes the effect from budget each scan with no record per service. Frankendom needs a server-owned value per hub (one ledger, server-verified), so the field is derived from that record, not from a scan.
- The donor's power and road checks are functions this sketch takes as booleans; `isPowered` and `isDriveable` bodies were not read. Frankendom must define its own checks before this is built.
- Cost: the field is rebuilt every scan and smoothed three times over the whole map. Frankendom must run it on the server's slow cadence and inside its per-tick budget (the donor's speed divisors show the shape), not on every fight tick. Keep MAX_ATTACKERS = 3 for duels; a coverage ring is a zone service, not an attacker slot.
- The advisor warning is a UI message in the donor. Frankendom's equivalent is a client hint computed from the server field; the engine never reads the minimap.
- Cell size 8 is a donor choice; Frankendom zones need their own cell size as zone data, and the field's resolution sets how precise a minimap tint can be.

Reuse tag: rewrite-from-idea (GPL v3 with additional terms; clean-room only)
Brief rule served: zones as data on one runtime; row 23 coverage as zone data; engine owns the field, client reads it

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- The 70 percent advisor warning was presented as a working rule to adopt, but simulation.js 521/526 use undefined MAX_FIRE_STATION_EFFECT / MAX_POLICE_STATION_EFFECT (budget.js 34-35 defines MAX_FIRESTATION_EFFECT / MAX_POLICESTATION_EFFECT), so it never fires.
- 'Field drives the advisor warnings' was false: the warning reads the budget effect, not the smoothed field.
- Missed: the real consumer of the smoothed fire field is miscTiles.js 55-58 (extinguish rate).
Fixed 2026-10-12: summary, Decision and Advisor warning line corrected; defect recorded with the idea kept (fix the constant name). Sketch unchanged, no typecheck needed.
