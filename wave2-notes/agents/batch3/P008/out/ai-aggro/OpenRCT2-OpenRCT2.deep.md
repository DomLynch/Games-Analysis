# OpenRCT2-OpenRCT2 (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/entity/Staff.cpp` | Licence: GPL-3.0 (Staff.cpp header: "OpenRCT2 is licensed under the GNU General Public License version 3"; `licence.txt` is the GPLv3 text; "or later" not stated) | C++ | symbol `Staff::doHandymanPathFinding` (target search `Staff::handymanDirectionToNearestLitter`)

Checked: Read in full: `handymanDirectionToNearestLitter` (Staff.cpp 310-385), `isHandymanAlreadyServicingTile` (387-407), `doHandymanPathFinding` (495-585), `updatePatrollingFindSweeping` (1650-1673), the sweep step `updateSweeping` (1227-1240, the removal line and the call only), the patrol order in the state code (1883-1896, read as the call order). `Peep.cpp` 2262-2292 (who calls `doPathFinding` and when: on reaching a destination); `Peep.cpp` 212 and 224 seen by grep only (the update loop itself was not read). `MapLimits.h` 14 (`kCoordsXYStep = 32`). `Staff.cpp` 1761-1790 (start of `Staff::update`, read in part). Callers: `doPathFinding` has one caller (`Peep.cpp` 2284). Not read: `handymanDirectionRandSurface` and `handymanDirectionToUncutGrass` (only their call sites), `getValidPatrolDirections`, `isLocationInPatrol` (59-), `setDestination` tolerance semantics, `ScenarioRand` (the scenario generator's seeding), `kCoordsZStep`, the rest of `Staff::update` (the walking step), and the mechanic and security AI (`doMechanicPathFinding` 754-, `doMiscPathFinding`); security staff random-walk, no chase found in the code read.

Confidence: high on the litter target search and the junction decision (order, numbers and the two gates). Medium on the claim behaviour, which I read as occupancy-only from `isHandymanAlreadyServicingTile`. This donor is a park simulator: there are no enemies, no aggro, no threat and no flee. The note covers the only target-pursuit mechanism I found that works like "pick a target, chase it along the map, drop it when it is out of reach". Depth: full for the litter pursuit; the rest of the AI is not covered.

Best transferable idea: each step, a worker picks the nearest eligible target within a leash radius (distance with a height penalty), skips targets already claimed, and then takes the path edge toward it with a fixed probability, so the chase is steady without being perfectly greedy.

## 1. Mechanism

- Who and when. A handyman is a `Staff` with the sweeping order set. Its path decision runs when it reaches a destination with no pending action (`Peep.cpp` 2270-2284 calls `doPathFinding`), so a choice is made at each tile junction. `Staff::update` is called from the entity loop at `Peep.cpp` 224 (the loop itself was not read, so the tick rate is not stated).
- Step 1, same-tile pickup (`updatePatrollingFindSweeping`, 1650-1673). In patrol with the sweeping order (1652), if litter sits on the current tile within 16 height units (1659), and no other handyman is already sweeping that tile (1662), the handyman switches to sweeping and sets its destination on the litter (1665-1668). This runs before the grass and bin checks (1886-1893).
- Step 2, nearest litter while walking (`doHandymanPathFinding`, 495-585).
  - Phase gate (502): the litter lookup runs only when `((currentTicks + id) & 0xFFF) > 110`. So each handyman skips the lookup for 111 ticks out of every 4096, offset by its own id. This skips a short window; it does not spread the lookups out.
  - Scan (310-335): a 7 by 7 grid of tile cells, from x - 96 to x + 96 and y - 96 to y + 96 in steps of 32 (`kTileRadius` = 3 at 313, `kLookupRadius` = 96 at 314). For each litter, the distance is `|dx| + |dy| + 4 x |dz|` (326). The smallest one is kept (328-331); on a tie the litter scanned first is kept.
  - Cut-off and patrol (337-347): if the smallest distance is above 96, or no litter was found, there is no target. If the target tile is outside the handyman's patrol area (344), there is no target either. There is no fallback to the next-nearest litter.
  - Blocking check (349-383): the step toward the litter must not be blocked by an entrance or track element at the next height, checked on two tiles (the tile just before the litter along the direction of travel, and the handyman's next tile). Otherwise there is no target.
  - Junction choice (515-564). On surface (515), the litter direction is ignored and a surface helper picks the step. On a path, the path edges are the open edges that are also patrol-valid (526). If the litter direction is one of those edges (534), the handyman follows it with probability 0.9 (`0x1999` threshold, 540-541), or 0.1 on a queue path connected to a ride (`0xE666`). Otherwise it picks a random open edge (556-562). The reverse direction is removed only on the branch where no litter edge applies (549-553). The litter-edge branch can still pick the reverse on its random fallback.
  - Destination (570-584). The chosen tile must be valid; if not, the code re-rolls a surface direction until one is (572-576). The destination is the tile centre (`+16, +16`, 579) with tolerance 3.
- Order of operations per junction: phase gate, then the nearest-litter search, cut-off, patrol and blocking checks, then the grass fallback (508-511, only with the mowing order and a timeout of 12), then the surface or path choice, then the destination.
- Pick-up (`updateSweeping`, 1227-1240). When the sweep action reaches frame 8, the litter at that location is removed and the swept count goes up (1236-1237).

## 2. Key functions

- `Staff::handymanDirectionToNearestLitter`: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/entity/Staff.cpp` 310-385. Nearest litter in a 3-tile radius with height weight; patrol check; blocking check.
- `Staff::doHandymanPathFinding`: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/entity/Staff.cpp` 495-585. Phase gate, follow-or-random junction choice, destination.
- `isHandymanAlreadyServicingTile`: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/entity/Staff.cpp` 387-407. The claim check, which looks only at staff on that tile.
- `Staff::updatePatrollingFindSweeping`: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/entity/Staff.cpp` 1650-1673. Same-tile pickup.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Nearest eligible target within a leash radius, with a height penalty | Radius 3 tiles = 96 units (theirs, `Staff.cpp` 313-314; the 96-unit reading is confirmed by the comment at 1677); height weight 4 (theirs, 326); step 32 (theirs, `MapLimits.h` 14) |
| Nearest only; no fallback when it fails the patrol or blocking check | (mechanism; 337-357) |
| Steady pursuit: follow the target's edge with a fixed probability, else a random open edge | Follow probability 0.9 (theirs, `0x1999` at 540-541); 0.1 on a queue connected to a ride (theirs, `0xE666` at 540) |
| Reverse-direction avoidance only when not following the target | (mechanism; 549-553) |
| Skip claimed targets | Claim = another handyman sweeping on the same tile (theirs, 400-402, 1662) |
| Cheap skip of the scan on most ticks, staggered per worker | Skip window 111 of 4096 ticks (theirs, 502) |
| Pickup timing | Removal at animation frame 8 (theirs, `Staff.cpp` 1233-1236) |

## 4. TypeScript sketch

simplified: keeps the donor order for one junction decision: the phase gate, the nearest-only litter target within 96 units with the 4x height term, the patrol check (no fallback), the same-tile claim, and the path step (follow the target edge with probability `followP`, else a random open edge; the reverse is excluded only when not following). `followP` takes 0.9 or 0.1 as the donor does. It omits: the 7 by 7 tile-cell scan (the sketch scans the whole list; within the cut-off the nearest is the same, but the donor's cell-edge cases were not verified), the entrance and track blocking check on two tiles, the grass and bin fallbacks, the surface step (the sketch returns null and the caller must handle it; the donor's helper was not read), the destination tolerance, the sweep state machine and removal timing, and the donor's re-roll loop for invalid tiles (572-576).

```ts
// Licence: GPL-3.0 (donor; Staff.cpp header "licensed under the GNU General Public License version 3"; licence.txt is GPLv3). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Vec3 { x: number; y: number; z: number; }
interface Litter { at: Vec3; }
interface Worker { pos: Vec3; sweeping: boolean; }

const STEP = 32;                 // map step between tile positions
const CUT_OFF = 3 * STEP;        // 96 units: the nearest target must be within this weighted distance

// Nearest litter by Manhattan distance with a 4x height term. Returns null if none is within CUT_OFF
// or if the nearest one is outside the patrol area. There is no fallback to the next-nearest litter.
function nearestLitter(w: Worker, litter: Litter[], inPatrol: (p: Vec3) => boolean): Litter | null {
  let best: Litter | null = null;
  let bestD = Infinity;
  for (const l of litter) {
    const d = Math.abs(l.at.x - w.pos.x) + Math.abs(l.at.y - w.pos.y) + 4 * Math.abs(l.at.z - w.pos.z);
    if (d < bestD) { bestD = d; best = l; }
  }
  if (best === null || bestD > CUT_OFF) return null;
  return inPatrol(best.at) ? best : null;
}

// A litter spot is skipped when another worker is already sweeping on that same spot (occupancy only).
function isClaimed(l: Litter, workers: Worker[]): boolean {
  return workers.some(w => w.sweeping && w.pos.x === l.at.x && w.pos.y === l.at.y);
}

// The lookup runs only on most ticks: skipped when (tick + workerId) & 0xFFF is 0..110.
function lookupAllowed(tick: number, workerId: number): boolean {
  return ((tick + workerId) & 0xFFF) > 110;
}

// One junction decision. openEdges are direction indices 0..3 that are open path edges; reverse is the way back.
// Surface: the litter direction is ignored. Path: follow the litter edge with probability followP,
// otherwise a random open edge (the reverse is excluded only on the branch with no litter edge).
function pathStep(onSurface: boolean, openEdges: number[], litterDir: number | null, followP: number, reverse: number, rng: () => number): number | null {
  if (openEdges.length === 0) return null;
  if (onSurface) return null;     // donor uses a surface helper here (not read); caller handles it
  if (litterDir !== null && openEdges.indexOf(litterDir) >= 0) {
    if (rng() < followP) return litterDir;
    return openEdges[Math.floor(rng() * openEdges.length)];
  }
  const forward = openEdges.filter(d => d !== reverse);
  const pool = forward.length > 0 ? forward : openEdges;
  return pool[Math.floor(rng() * pool.length)];
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `work/openrct2-litter-pursuit.ts`, with `export {}`).

## 5. Lands in

- TARGET `src/fight/ai.ts` (proposed module): the target choice and chase step for an AI unit (enemy or fight NPC), which the engine owns. Parity-checklist row 4 (fight loop: aggro, chase, leash). The 96-unit cut-off maps to a leash radius; the claim maps to a per-target reservation.
- today: none read in Frankendom.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only, shape only)
- Brief rule served: one engine owns many-on-one target selection (Frankendom rulings, hate list and MAX_ATTACKERS = 3); licence rule 7 (GPL, clean-room)

## 6. Gaps and risks

- Licence: GPL-3.0. Clean-room only; the sketch is written from the mechanism.
- Nothing here is aggro or threat. The target is an inanimate litter item, so there is no hate list, no damage-based priority and no flee. Frankendom's hate list has to be built in the engine; this donor only shows the nearest-target and claim shapes.
- Claim is occupancy only (`isHandymanAlreadyServicingTile`, 400-402). A handyman walking toward the same litter is not seen, so two can both start sweeping it. Frankendom's MAX_ATTACKERS = 3 needs a real reservation per target, counted server-side, not a check on who stands on a tile.
- Nearest-only, no fallback (337-347): if the nearest target is outside the patrol or blocked, the donor takes no target at all. In a many-on-one fight the engine should fall back to the next eligible target, and the choice must be recorded.
- Randomness: the follow choice uses `ScenarioRand` (541, 560), the scenario generator (its seeding was not read). Frankendom's server tick must use its own seeded generator so a replayed fight (row 19) reproduces the same chase.
- The phase gate (502) skips a short window per entity; it is not a per-tick NPC budget. Post-K item 3 needs its own budget for NPC work per tick.
- Geometry: the two-tile entrance and track blocking check (349-383) and the tile cell scan belong to a tile map. Frankendom zones are data, not tiles in the fight, so these do not transfer; the leash radius should be zone data.
- The re-roll loop (572-576) has no bound in the code read; whether it can fail to terminate was not analysed. Frankendom's version must bound any retry.
- Pit as client: target choice and the claim are server-side. The client only shows the chase.
