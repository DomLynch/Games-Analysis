# miki151-keeperrl (city-map-design, cell 1)

Donor: `/mnt/frankendom-donors/miki151-keeperrl/level_maker.cpp` | Licence: GPL-2.0-or-later (level_maker.cpp and shortest_path.cpp headers say "either version 2 ... or (at your option) any later version"; the repo's LICENSE and COPYING.txt are GPL v2 text) | C++ | symbol `Buildings::make` (class at 919), with `Roads::make` (1494) and `village()` (2018)

Checked: read in full: class Buildings and make (919-1038), class Roads (1494-1540), village() (2018-2040), cottage() (2042-2057, its Buildings call), the village call sites (2820-2830), getSize for SMALL_VILLAGE (2204-2212), util.cpp RandomGen get and roll (31-46, 80-82), shortest_path.cpp init head (74-130). Not read: the rest of ShortestPath::init after line 130, failGen() and the level retry logic, ShopMaker, getElderRoom, the VILLAGE footprint size (falls to another branch of getSize, not read), minimap_gui.cpp past the render head. Callers: grep finds seven Buildings constructions (2009, 2030, 2053, 2080, 2094, 2105, 2415). I read the village (2030) and cottage (2053) ones in full; the other five are seen in grep only (not read). The align = true rules below describe only the 2030 caller. Roads is added once, in the map-wide pipeline (2974). Confidence: high on placement order and road costs; medium on the A* internals (read only the search head). camera_scope: n/a.

Best transferable idea: place a town's buildings one at a time along one street band, with a retry budget, a minimum count, and each hub service bound to the building with the same index, then join the hubs with a cost-weighted A* road.

Decision (proposed): adapt. Keep the street band and the index-bound service slots (they make a readable town from small data); change the road joining from a raster-order chain to nearest-neighbour or a spanning tree, and fix roll(1) (it is always true). Reject nothing here.

Acceptance: in a zone town a player sees every service door open onto one street band, one tile away; a server test asserts that a 15 x 15 zone with count 3 places exactly 3 buildings, each door touches the band, and the first service maker lands in the first building placed.

## 1. Mechanism

- A town is a rectangle (15 x 15 for SMALL_VILLAGE, 2210). village() (2018) builds: a blob of outside floor (2022), then Buildings(minRooms, maxRooms, 3, 7, ..., align = true, insideMakers) (2030), then furniture in empty rooms (2032), outside features on the street band (2036), stairs, and inhabitants (2038).
- Buildings::make (964-1025), one building at a time:
  (a) Count: numBuildings = get(minBuildings, maxBuildings) (960). get excludes the max (util.cpp 45), so SMALL_VILLAGE (3, 4) always gets 3 (2825).
  (b) Street row: alignHeight = height / 2 - 2 + get(5) (957), so the street sits two rows either side of the middle.
  (c) Size and side: w and h from get(3, 7) (values 3 to 6); buildingRow = get(2), a random 0 or 1, picks the row above the street (py = street - h - 1) or below it (py = street + 2) (967 and 969; the row choice is applied at 979). x is random inside the area.
  (d) Fit: the footprint plus a one-tile gap (spaceBetween = 1, 954) must not touch a filled tile. Up to 10000 tries per building (964). If no fit and i is below minBuildings, the level fails (993-994). If no fit and i is at or above the minimum, the loop stops and keeps what fitted.
  (e) Build: perimeter tiles get wall furniture, interior tiles get the ROOM attribute, and one door is placed on the street-facing wall (1011-1014): y = py + buildingRow * h, x random away from the corners for wide buildings.
  (f) Services: building i runs insideMakers[i] (1021-1022); buildings past the list become EMPTY_ROOM (1024-1025). The constructor has `CHECK(insideMakers.size() <= minBuildings)` (936), but the member init has already `std::move()`d the parameter, so the CHECK reads the moved-from (empty) vector and never fires; the intended guard is not enforced (donor defect, keep the idea and enforce it on load). In village() the list is the elder room first (2025), then one ShopMaker per shop list (2026-2027), then stockpiles.
- After the loop: the middle third of the street rows gets BUILDINGS_CENTER (1027-1029), the band where outside features may go. The middle tile of the street row becomes a ROAD with CONNECT_ROAD (1031-1035) only when `roadConnection` is true (village passes `!info.dontBuildRoad`).
- Roads (1494): the map-wide maker (2974) runs after the settlements exist. It collects every CONNECT_ROAD tile in raster order (1522-1525), then for each consecutive pair (1528-1530) runs a ShortestPath search (1531-1534). Costs (getValue, 1503-1511): NO_ROAD or unwalkable and not a cut-through = infinity; water = a bridge at cost 10 (1507-1508); existing road or bridge = 1 (1509-1510); other ground = 1 + (1 + height)^2 (1511). Path tiles then get ROAD or BRIDGE furniture (1535-1540).
- The search is a priority queue ordered by cost so far plus the heuristic (shortest_path.cpp 117, 120). The heuristic is the Manhattan distance to the other endpoint (1533). Neighbours are tried in random order (1534).

## 2. Key functions

- `Buildings::make`: `/mnt/frankendom-donors/miki151-keeperrl/level_maker.cpp` 919-1038 (class and make). Placement loop 957-1025; door 1011-1015; street point 1032-1035.
- `Buildings` constructor CHECK: `/mnt/frankendom-donors/miki151-keeperrl/level_maker.cpp` 936.
- `village`: `/mnt/frankendom-donors/miki151-keeperrl/level_maker.cpp` 2018-2040 (service list 2023-2029, Buildings call 2030, outside features 2034-2036).
- `cottage` (second caller, align = false, 1 to 2 buildings): `/mnt/frankendom-donors/miki151-keeperrl/level_maker.cpp` 2042-2057 (call at 2053).
- `Roads::make` and `getValue`: `/mnt/frankendom-donors/miki151-keeperrl/level_maker.cpp` 1494-1540.
- `RandomGen::get`, `roll`: `/mnt/frankendom-donors/miki151-keeperrl/util.cpp` 31-46 and 80-82.
- `ShortestPath` search head: `/mnt/frankendom-donors/miki151-keeperrl/shortest_path.cpp` 74-130 (partial).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Count drawn from [min, max) (max excluded) | SMALL_VILLAGE 3, 4 so always 3 (2825); VILLAGE 4, 8 so 4 to 7 (2827) |
| Footprint side in [3, 7) | 3, 7 (2030) |
| One-tile gap between buildings | spaceBetween = 1 (954) |
| Street row = centre - 2 + [0, 5) | `height / 2 - 2`, `get(5)` (957) |
| Retry budget per building | 10000 (964) |
| Minimum count guard | failGen below minBuildings (993) |
| Service i goes to building i | CHECK service count <= minBuildings (936), dead because it reads the moved-from vector |
| Outside feature chance on the street band | 0.2 (2036) |
| Road cost: unroutable, water, road, ground | infinity (1506); bridge 10 (the value is on 1508, a bare `return 10;` line is under 15 characters so there is no receipt for it); road 1 (1510); ground 1 + (1 + h)^2 (1511) |
| SMALL_VILLAGE footprint | 15 x 15 (2210) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (street row, then each building: size, side, fit test with a one-tile gap, door on the street-facing wall, then services by index, then A* road joins in raster order). It omits: the donor's corner rule for doors on buildings of width 4 or more (the sketch picks a plain offset), the ROOM and wall furniture, the BUILDINGS_CENTER band, the ROAD_CUT_THRU attribute, the neighbour-order shuffle, the ShortestPath caching and reverse search, the failGen retry at level scope, and the cottage path (align = false). The sketch also replaces the donor's `roll(1)` nextw attempt with nothing (see section 6). Typechecked on the VPS with tsc --strict, exit 0.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Pt = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number };
type Tile = { walkable: boolean; swimmable: boolean; road: boolean; noRoad: boolean; height: number };
type Slot = { x: number; y: number; w: number; h: number; door: Pt; service: string | null };

// Donor get(lo, hi): uniform integer in [lo, hi), so hi is never returned.
function pick(rand: () => number, lo: number, hi: number): number {
  return lo + Math.floor(rand() * (hi - lo));
}

// Places buildings one at a time along one street band (donor Buildings with align = true).
// services[i] goes to the i-th building placed (donor insideMakers[i]); the rest stay empty rooms.
function layoutTown(rand: () => number, area: Rect, minB: number, maxB: number,
                    services: string[], attempts: number = 10000): Slot[] | null {
  const count = pick(rand, minB, maxB);
  const street = area.y + Math.floor(area.h / 2) - 2 + pick(rand, 0, 5);
  const taken = new Set<number>();
  const cell = (x: number, y: number): number => y * 4096 + x;
  const out: Slot[] = [];
  for (let i = 0; i < count; i++) {
    let slot: Slot | null = null;
    for (let t = 0; t < attempts && slot === null; t++) {
      const w = pick(rand, 3, 7);
      const h = pick(rand, 3, 7);
      const north = rand() < 0.5;
      const x = area.x + 1 + pick(rand, 0, area.w - w - 2);
      const y = north ? street - h - 1 : street + 2;
      if (y < area.y || y + h >= area.y + area.h) continue;
      // footprint plus a one-tile gap must be free
      let clash = false;
      for (let dy = -1; dy <= h + 1 && !clash; dy++)
        for (let dx = -1; dx <= w + 1 && !clash; dx++)
          if (taken.has(cell(x + dx, y + dy))) clash = true;
      if (clash) continue;
      for (let dy = 0; dy <= h; dy++)
        for (let dx = 0; dx <= w; dx++) taken.add(cell(x + dx, y + dy));
      // door on the wall that faces the street
      const door = { x: x + pick(rand, 1, w), y: north ? y + h : y };
      slot = { x, y, w, h, door, service: i < services.length ? services[i] : null };
    }
    if (slot === null) {
      if (i < minB) return null; // below the minimum the whole town is rejected
      break;                     // above the minimum, keep what fitted
    }
    out.push(slot);
  }
  return out;
}

// Donor Roads cost: unroutable = Infinity, water = 10 (bridge), existing road = 1, other ground = 1 + (1 + height)^2.
function roadCost(t: Tile): number {
  if ((!t.walkable && !t.swimmable) || t.noRoad) return Infinity;
  if (!t.walkable && t.swimmable) return 10;
  if (t.road) return 1;
  return 1 + (1 + t.height) ** 2;
}

// A* between two hub points with a Manhattan heuristic; endpoints cost 1 as in the donor.
function route(grid: Tile[][], start: Pt, goal: Pt): Pt[] | null {
  const H = grid.length;
  const W = grid[0].length;
  const id = (p: Pt): number => p.y * W + p.x;
  const manhattan = (p: Pt): number => Math.abs(p.x - goal.x) + Math.abs(p.y - goal.y);
  const best = new Map<number, number>([[id(start), 0]]);
  const came = new Map<number, Pt>();
  const open: { p: Pt; f: number }[] = [{ p: start, f: manhattan(start) }];
  while (open.length > 0) {
    open.sort((a, b) => a.f - b.f);
    const { p } = open.shift() as { p: Pt; f: number };
    if (p.x === goal.x && p.y === goal.y) {
      const path: Pt[] = [p];
      let cur = p;
      for (let c = came.get(id(cur)); c !== undefined; c = came.get(id(cur))) {
        path.push(c);
        cur = c;
      }
      return path.reverse();
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const q = { x: p.x + dx, y: p.y + dy };
      if (q.x < 0 || q.y < 0 || q.x >= W || q.y >= H) continue;
      const isEnd = (q.x === start.x && q.y === start.y) || (q.x === goal.x && q.y === goal.y);
      const step = isEnd ? 1 : roadCost(grid[q.y][q.x]);
      if (!isFinite(step)) continue;
      const g = (best.get(id(p)) ?? 0) + step;
      if (g < (best.get(id(q)) ?? Infinity)) {
        best.set(id(q), g);
        came.set(id(q), p);
        open.push({ p: q, f: g + manhattan(q) });
      }
    }
  }
  return null;
}

// Donor Roads: hub points sorted in raster order, each joined to the previous one (a chain).
function connectHubs(grid: Tile[][], hubs: Pt[]): void {
  const sorted = [...hubs].sort((a, b) => a.y - b.y || a.x - b.x);
  for (let i = 1; i < sorted.length; i++) {
    const path = route(grid, sorted[i - 1], sorted[i]);
    if (path === null) throw new Error("no road between hubs"); // donor failGen()
    for (const p of path) grid[p.y][p.x].road = true;
  }
}
```

## 5. Lands in

- TARGET `origins/world/town-layout.ts` (new, proposed): the zone-side generator that places a town's buildings, service slots and roads, run by the engine so the client only draws the result. It is not in src/fight.
- Parity row 23 (zone population). This is the nearest row. Town layout is not population itself, so this is a stretch: Lead to confirm the row or add a town-layout row.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one engine: the layout is generated on the server, the client draws it); zones as data (the counts, sizes, street offset and road weights are zone fields).

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not translated.
- Defect, always-true roll: `roll(1)` is `get(1) == 0` (util.cpp 81), and get(1) is always 0, so the branch at 998 always runs. The intent was a chance. fix: use a real chance (for example a 50% chance) or delete the branch.
- Defect, adjacent attempt: the "next building beside this one" attempt (998-999, then 964-1000) shares a wall column, and the one-tile-gap test rejects it when the rows overlap. It is a wasted try only when the new building lands on the same side as the previous one (with align the two rows differ, so it is not wasted in most cases). This is from reading, not from a run. fix: remove it, or allow a shared wall on purpose and test it.
- Defect, exclusive max: `get(min, max)` never returns max (util.cpp 45). SMALL_VILLAGE (3, 4) always gets exactly 3 buildings. fix: write zone data as an inclusive range and convert once in the loader.
- Defect, raster-order chain: Roads joins hub points in scan order (1528-1530), so one hub can be joined to a far one and roads can cross. fix: join each hub to its nearest already-connected hub (or build a spanning tree over the hubs).
- Defect, cost of retries: 10000 tries per building (964), each test is a box scan of about (w+3)(h+3) tiles. Worst case is slow; the cost was not measured (not run). fix: lower the budget (for example 200) and report the failure to the zone loader.
- Defect, failure is all-or-nothing: a missing road or a short town calls failGen (1537; 993-994). The retry is in code not read. fix: retry per zone with a fixed seed and log it.
- Service rule: the donor intends service count <= minBuildings (936) but the CHECK never fires (moved-from vector). Frankendom should enforce this when the zone data loads, not during generation.
- Frankendom rulings: the town is zone data (counts, sizes, street offset, road weights as data fields). The engine owns placement; the client never decides where a shop or hub sits. Shop items and prices stay in the one ledger, not in the layout code. Hub services are server-side; a client may only read the result.
- Not transferred: the donor's room furniture, stockpiles and lake or mountain features are game-specific.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: 1 (one engine); zones as data

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- CHECK(insideMakers.size() <= minBuildings) at 936 runs after the member init std::move()d the parameter, so it reads an empty vector and never fires; note presented it as a working guard.
- ROAD tile at 1031-1035 is placed only when roadConnection is true; note stated it unconditionally.
- 'Wasted try in most cases' for the nextw adjacency attempt (971-973) was overstated.

Fixed 2026-10-12: CHECK described as dead (idea kept, enforce on zone load), road tile made conditional, adjacency claim softened. Sketch unchanged (it has no CHECK), no typecheck needed.
