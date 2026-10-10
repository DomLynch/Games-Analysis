# CytopiaTeam-Cytopia (zones-world, cell 1)

Donor: `/mnt/frankendom-donors/CytopiaTeam-Cytopia/src/game/ZoneArea.cxx` | Licence: GPL-3.0 (`license.txt`: "GNU GENERAL PUBLIC LICENSE", "Version 3, 29 June 2007"; no licence line in ZoneArea.cxx or ZoneManager.cxx) | C++ | symbol `ZoneArea::spawnBuildings`

Checked: symbol `ZoneArea::spawnBuildings` (ZoneArea.cxx 27-57) read in full, with its caller `ZoneManager::spawnBuildings` (ZoneManager.cxx 83-104) and the 1 s real-time task that calls both (ZoneManager.cxx 16-23). Also read in full: ZoneArea.cxx, ZoneArea.hxx 1-134, ZoneManager.cxx 1-273, TileManager.cxx 25-105, MapFunctions.cxx 378-453 (setTileID), MapNode.cxx 150-247 (placement). Not read: the body of `Randomizer::shuffle`, MapGrid templates beyond `isMemberOf`/`isNeighbor`, PointFunctions::getArea beyond 156-169 (read). Other callers of `loadGame` were not traced. Confidence: high on the spawn loop and its order; high on the fit-test finding (read, not run); medium on the reload finding (read, not run). camera_scope: n/a (not a camera cell).

Best transferable idea: a per-zone spawn table keyed by zone kind, density and footprint, with a per-tick cap that counts only successful placements and a presence gate per zone (the donor's gate is power).
Decision (proposed): adapt - take the per-zone table filter and the per-tick cap; drop building footprints and the power gate (ours is server-side presence); fix the donor's attempt counting and edge-only fit test. Row 23 is a partial fit: the donor builds on zone cells and has no despawn, respawn or grace timer.
Acceptance: a server test with cap 5 and a 1 s tick: a zone with a player in range gains at most 5 spawns per tick, a zone with no player in range gains none, and a tick whose first picks land on occupied cells still gains up to 5 (failed picks do not use the cap).

## 1. Mechanism

- Driver: a `GameClock` real-time task with delay 1 s and period 1 s (ZoneManager.cxx 16-23). Each run calls `update()` then `spawnBuildings()` and returns false (not cancelled). The task is re-queued at `now + period` (GameClock.cxx 12-15), so the interval is measured from when each run happens, not from a fixed schedule. It is wall-clock time, not a fixed step.
- `ZoneManager::update()` (26-81) applies queued changes in this order: vacate (28-43), occupy (45-60), add new zone cells (62-70), remove (72-80). Occupancy arrives by signal: `updatePlacedNodes` (245-259) queues a node in `m_nodesToOccupy` when the node has both a building and a zone tile (247-249). A building placed in one tick therefore shows as occupied only on the next tick.
- `ZoneManager::spawnBuildings()` (83-104) runs for each zone area that is `isVacant()` and `hasPowerSupply()` (88). The occupied/free counters (90-100) are computed and never read.
- `ZoneArea::spawnBuildings()` (27-57): shuffle the area's nodes (32). Walk them; stop when the count reaches 5 (29, 39). Skip nodes flagged occupied (43). For each other node: get the largest square footprint at that node (49); pick a random square size up to that maximum and a random tile for the zone's kind and density at that size (51; TileManager.cxx 73-102); call `setTileID` (54); increment the count (55) whatever the result.
- Fit test, `ZoneArea::getMaximumTileSize` (65-104): grows width and height by one per step while the origin's row (71, 77-84) and column (72, 85-92) are inside the area. Only those two strips are tested (see section 6).
- Placement, `MapFunctions::setTileID` (378-453): returns false for a bad tile or empty footprint (383-386) and when the area check fails (388-389). For a building, `MapNode::isPlacementAllowed` refuses a node that already holds a building tile: only overplacable buildings pass the BUILDINGS case (MapNode.cxx 198-201), a layer with a tile already present is refused (246), and the function ends in `return false` (end of function, "every case that is not handled is false"). On success it sets the tile and emits `signalSetTileID` for each covered node (445).
- Zone areas: `addZoneNodeToArea` (ZoneManager.cxx 124-154) joins a new cell to the one area it touches with the same kind and density; no neighbour starts a new area; several neighbours merge into one. Removing a cell rebuilds its area and replaces it with the pieces if it splits (168-196). Each area keeps a box (ZoneArea.cxx 20-21), grown by one on edge adds (119).
- Tile data lists the zone kinds and densities a building may use (tileData.hxx 170, 172). Kinds: RESIDENTIAL, INDUSTRIAL, COMMERCIAL, AGRICULTURAL (55). Densities: LOW, MEDIUM, HIGH (57-61). Agricultural ignores density (TileManager.cxx 36).

## 2. Key functions

- `ZoneArea::spawnBuildings`: `/mnt/frankendom-donors/CytopiaTeam-Cytopia/src/game/ZoneArea.cxx` 27-57 (cap 29; loop 32-56; placement call 54; count 55).
- `ZoneArea::getMaximumTileSize`: `/mnt/frankendom-donors/CytopiaTeam-Cytopia/src/game/ZoneArea.cxx` 65-104 (strips 71-72).
- `ZoneManager::spawnBuildings`: `/mnt/frankendom-donors/CytopiaTeam-Cytopia/src/game/ZoneManager.cxx` 83-104 (gate 88; call 101).
- `ZoneManager` real-time task and `update`: `/mnt/frankendom-donors/CytopiaTeam-Cytopia/src/game/ZoneManager.cxx` 16-23 and 26-81.
- `TileManager::getRandomTileIDForZoneWithRandomSize`: `/mnt/frankendom-donors/CytopiaTeam-Cytopia/src/engine/TileManager.cxx` 73-102 (square filter 83; random size 91; empty result 96).
- `TileManager::getAllTileIDsForZone`: `/mnt/frankendom-donors/CytopiaTeam-Cytopia/src/engine/TileManager.cxx` 30-45 (zone type 35; size 38).
- `MapFunctions::setTileID`: `/mnt/frankendom-donors/CytopiaTeam-Cytopia/src/engine/map/MapFunctions.cxx` 378-453.
- `ZoneManager::addZoneNodeToArea` and `removeZoneNode`: `/mnt/frankendom-donors/CytopiaTeam-Cytopia/src/game/ZoneManager.cxx` 124-154 and 168-196.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Per-zone, per-tick cap on spawn calls | 5 per zone area per tick (theirs, ZoneArea.cxx 29). The cap counts attempts, not placements (55). |
| Fixed tick period | 1 s wall-clock (theirs, ZoneManager.cxx 23) |
| Spawn table keyed by zone kind, density and footprint | 4 kinds (tileData.hxx 55), 3 densities (57-61), square footprints only (TileManager.cxx 83) |
| Footprint: random square size up to the zone's fit | Fit is capped by zone membership of the origin row and column only (ZoneArea.cxx 71-72); no fixed maximum in the code |
| Zone box margin | 1 at creation (ZoneArea.cxx 20-21), +1 per edge add (119) |
| Presence gate | Power supply (ZoneManager.cxx 88), not presence |

## 4. TypeScript sketch

simplified: keeps the donor's order: 1 s tick, zone gate, shuffled free cells, largest fit (capped), random size and tile from the zone's table, cap on placements. It changes these donor behaviours on purpose: (a) the cap counts only real placements (the donor counts every attempt, ZoneArea.cxx 55); (b) the fit test checks every footprint cell, not only the origin row and column (donor 71-72); (c) covered cells are taken at once, so one tick cannot place overlapping footprints (the donor flags occupancy only on the next tick, ZoneManager.cxx 245-259); (d) a size is chosen only among sizes that have a table entry (the donor picks any square size up to the max and can end with no tile, TileManager.cxx 91-96); (e) a server presence gate replaces power. It omits: the queued vacate, occupy, add and remove updates; zone merge and split; the tick driver; ground decoration and flora or power-line clearing (MapFunctions.cxx 402-407); the unused counters (ZoneManager.cxx 90-100). `MAX_SIZE = 3` is a sketch value, not a donor number.

```ts
// Licence: GPL-3.0 (donor, CytopiaTeam-Cytopia). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Kind = "residential" | "industrial" | "commercial" | "agricultural";
type Density = "low" | "medium" | "high";

interface Tile { id: string; kind: Kind; density: Density; size: number; } // size = square footprint side
interface Cell { x: number; y: number; free: boolean; }
interface Zone { kind: Kind; density: Density; present: boolean; cells: Map<string, Cell>; }
interface Placement { x: number; y: number; size: number; tileId: string; }

const SPAWN_CAP_PER_TICK = 5; // donor: amountOfBuildingsToSpawn = 5 (ZoneArea.cxx:29)
const MAX_SIZE = 3;

const key = (x: number, y: number): string => `${x},${y}`;

// Footprint of a square of side `size` placed at origin (x, y): extends to -x and +y, as in the donor's cell formula.
function footprint(x: number, y: number, size: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < size; i++) for (let j = 0; j < size; j++) out.push(key(x - i, y + j));
  return out;
}

// Largest square whose every cell is a free cell of the zone. Unlike the donor (origin row and column only), every footprint cell is tested.
function largestFit(zone: Zone, x: number, y: number, maxSize: number): number {
  let size = 1;
  while (size < maxSize) {
    const next = size + 1;
    const fits = footprint(x, y, next).every((k) => zone.cells.get(k)?.free === true);
    if (!fits) break;
    size = next;
  }
  return size;
}

// Spawn table: the tiles this zone may use at one footprint size. Empty means no spawn at that size.
function spawnTable(tiles: Tile[], zone: Zone, size: number): Tile[] {
  return tiles.filter((t) => t.kind === zone.kind && t.density === zone.density && t.size === size);
}

function shuffle<T>(a: T[], rnd: () => number): void {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
}

// One 1-second tick for one zone. Only real placements count toward the cap; covered cells are taken at once.
function spawnTick(zone: Zone, tiles: Tile[], rnd: () => number): Placement[] {
  if (!zone.present) return []; // presence gate (donor: power supply)
  const out: Placement[] = [];
  const free = [...zone.cells.values()].filter((c) => c.free);
  shuffle(free, rnd);
  for (const c of free) {
    if (out.length >= SPAWN_CAP_PER_TICK) break;
    if (!c.free) continue; // covered by an earlier placement this tick
    const fit = largestFit(zone, c.x, c.y, MAX_SIZE);
    const sizes = Array.from({ length: fit }, (_, i) => i + 1).filter((s) => spawnTable(tiles, zone, s).length > 0);
    if (sizes.length === 0) continue; // nothing to place here; does not use the cap
    const size = sizes[Math.floor(rnd() * sizes.length)];
    const options = spawnTable(tiles, zone, size);
    const tile = options[Math.floor(rnd() * options.length)];
    for (const k of footprint(c.x, c.y, size)) {
      const cell = zone.cells.get(k);
      if (cell) cell.free = false;
    }
    out.push({ x: c.x, y: c.y, size, tileId: tile.id });
  }
  return out;
}

export {};
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population engine logic; the numbers are zone data fields). Parity-checklist row 23 (zone population). Row 23 is the closest row: it fits the cap, the tick and the per-zone table. The donor builds on zone cells and has no creature despawn, respawn or grace timer, so those parts of row 23 have no donor here.
- today: not read (Frankendom's current files were not inspected; the path is taken from the addendum).
- Reuse tag: adapt-from-idea (GPL-3.0; clean-room only, shape not code)
- Brief rule served: zones as data (zone tables are data; the spawn decision is engine logic); one engine; parity row 23.

## 6. Gaps and risks

- GPL-3.0 is copyleft: clean-room only. The sketch is written from the mechanism, not translated.
- The donor counts failed picks against the cap (ZoneArea.cxx 39, 55). After a load this bites: `ZoneManager::reset` (261-273) queues every zone cell with `occupied` at its default false (ZoneArea.hxx 13), and `Game::loadGame` calls `resetManagers` (Game.cxx 211-213). Built cells then look vacant, the attempts hit cells that `isPlacementAllowed` refuses (MapNode.cxx 246), and the cap is spent. This is inference from the code, not run. For Frankendom: derive occupancy from the one ledger, never from a flag a load can desync; the acceptance test must cover a restart with existing spawns.
- The fit test checks only the origin's row and column (ZoneArea.cxx 71-72, 77-92; `getArea` PointFunctions.cxx 156-169). For a 2x2 footprint at (x, y), the cell (x-1, y+1) is never tested. Frankendom must test every footprint cell; for creatures a footprint of 1 may be the honest choice.
- Same-tick overlap: covered cells are not flagged until the next tick (ZoneManager.cxx 245-259, 46-60). Frankendom must mark synchronously.
- The gate is power, not presence. Ours is a server-side presence check per zone, not per tile.
- The donor is wall-clock (`addRealTimeClockTask`, ZoneManager.cxx 16-23), not fixed-step. Frankendom's spawn tick must be the server tick (row 18 / post-K item 3, sub-line "server tick: fixed step, input intake, per-tick NPC budget"); the 1 s becomes N server ticks, not a timer.
- Dead branch: MapFunctions.cxx 423 `if ((!targetCoordinates.size()) == 1)` cannot be true after the early return at 383-386, so line 429 sets the tile on the origin for every covered cell. Do not model footprint data on it.
- The donor is build-out, not population: no despawn, no respawn, no grace timer. Row 23 expects those; this donor does not supply them.
- Adjacency-based zone merge and split (ZoneManager.cxx 124-196) is a lot of code for what Frankendom needs, because zones are authored data rather than player-drawn areas. Only the table, the cap and the fit rule transfer.
