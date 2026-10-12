# OpenRCT2-OpenRCT2 (city-map-design, cell 2)

Donor: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/world/Footpath.cpp` (path junction and connect pass; the list hint `src/openrct2/world/map_generator/PngTerrainGenerator.cpp` is a heightmap image loader and was read only to confirm that) | Licence: GPL version 3 (header text: "OpenRCT2 is licensed under the GNU General Public License version 3."; no "or later" wording in this file; licence.txt is the GPLv3 text) | C++ | symbol `FootpathConnectEdges`

Checked: Read end to end: `FootpathConnectEdges` (Footpath.cpp 724-778), `Loc6A6C85` (655-719), `Loc6A6D7E` (538-650; the map-edge, track, entrance and path branches), `Loc6A6F1F` (484-529), `Loc6A6FD2` (471-483), `FootpathReconnectQueueToPath` (393-431), `FootpathDisconnectQueueFromPath` (436-470), `FootpathConnectCorners` (210-292, the corner logic not traced to the bit level), neighbour list and sort (279-355). Callers checked (grep of whole donor): `FootpathConnectEdges` from FootpathPlaceAction.cpp 517, TrackPlaceAction.cpp 673, ParkEntrancePlaceAction.cpp 184, RideEntranceExitPlaceAction.cpp 233, TrackDesign.cpp 1267, ScenarioPatcher.cpp 540; I read only the footpath caller (517) in full. Second candidate read: `src/openrct2/world/map_generator/TreePlacement.cpp` (231 lines, read in full; a clumped-scatter rule, rejected as not a city layout). Not read: the minimap window (`src/openrct2-ui/windows/Map.cpp`, the topic's minimap), `FootpathUpdatePathWideFlags` (1333), landmark and signage code (a narrow grep found no signage code in the world, scenario and management folders; not searched further). Camera: not a camera cell. Confidence: high on the connect order, the priority numbers and the two-link cap; medium on the corner step (not traced).

Best transferable idea: a path tile joins its neighbours in a fixed priority order (entrance first, then a queue with a spare link, then a plain path), and a queue tile keeps at most two links, so a service line never grows into a junction.
Decision (proposed): adapt - the priority-then-cap rule is right for zone paths between hubs (a hub entrance joins first, a walkway never becomes a four-way crossing); the ride, queue-chain and park-entrance specifics are RCT2 park rules and are rejected.
Acceptance: a zone-authoring test lays out one hub entrance and four neighbouring plain-path tiles and asserts that the entrance link is made first and that a queue-type path tile never has more than two links after a rebuild; a second hub's queue beside the first is not joined to the first hub's ride.

## 1. Mechanism

Trigger: `FootpathConnectEdges` runs when a path, a ride track, a ride entrance or a park entrance is placed (FootpathPlaceAction.cpp 517 and five other callers). It is a one-shot command step, not a per-tick loop. Order of operations, as the code runs:

1. Query pass (734-737). For each of the four directions in `kAllDirections` (Location.hpp 473-478: 0, 1, 2, 3), `Loc6A6C85` runs with query = true. It first rejects a direction blocked by a wall (`WallInTheWay`, 655-661), an entrance that does not face the tile, a flat-ride track that does not connect to a path, and a sloped path that does not match the direction (655-719). Then `Loc6A6D7E` pushes a candidate for the element it finds on that side (the path, track or entrance branch returns after its push; typically one candidate per side, the multi-element case was not traced), with a priority number:
   - a ride entrance facing the tile: order 8 (630);
   - a map edge, in the scenario editor or sandbox only: order 7 (543-547);
   - a flat-ride track that connects to a path: order 1 (614);
   - a queue path with fewer than two links (test at 496): order 4 (499);
   - a queue path already at two links, when this tile is also a queue and the disconnect helper succeeds: order 3 (504-509);
   - a plain path: order 2 (517).
   The link count is the number of set bits in the tile's 4-bit edge mask (table `connected_path_count`, 80-89; rows 0b0000 to 0b1011 checked, all equal to the set-bit count; the rest not read).
2. Sort (739). Descending order, then ascending direction (`FootpathNeighbourCompare`, 293-308; the field read first is `order`, 295). The list holds at most eight items (289).
3. Queue filter (741-767), only when the tile being connected is a queue. Keep the ride of the first neighbour that has a ride. Drop neighbours of any other ride (756). Drop a neighbour that has a different non-null entrance of the same ride (762). Cap the list at two (767). Defect in the loop at 745-762 (see section 6).
4. Connect pass (771-772). Each remaining neighbour is applied in list order with `Loc6A6C85` (query = false). For a path neighbour the donor first calls `FootpathDisconnectQueueFromPath` on it with action 1, or 2 when ghost (523); that call acts only when the neighbour is a queue (438). For a path neighbour, `Loc6A6F1F` sets the neighbour's reverse edge bit (524). Then `Loc6A6FD2` sets the initiating tile's own edge bit toward the neighbour (478), for any accepted neighbour (also called from the track branch at 617 and the entrance branch). A queue neighbour pushes its ride chain (527).
5. Corners (776-777). If the initiating tile is a plain path, not a queue (215) and not sloped (217), `FootpathConnectCorners` sets corner bits when plain paths meet on the four sides. The bit-level result was not traced.

Reconnect helper (`FootpathReconnectQueueToPath`, 393-431), used when a full queue must give up a link: it only targets a neighbour that is a plain path (413). With action above zero it clears the queue's edge bit toward that neighbour (419) and the reverse bit on the neighbour (420, read, not receipted).

## 2. Key functions

- `FootpathConnectEdges`: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/world/Footpath.cpp` 724-778. The whole pipeline: query, sort, queue filter, connect, corners.
- Priority pushes: `Loc6A6D7E` 538-650 (orders 8, 7, 1 at 630, 547, 614), `Loc6A6F1F` 484-529 (orders 4, 3, 2 at 499, 509, 517; connect side effects 523-527).
- Queue filter and cap: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/world/Footpath.cpp` 745-767.
- Edge bit on the initiator: `Loc6A6FD2` 471-483 (set at 478).
- Sort: `FootpathNeighbourCompare` 293-308.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Collect candidates per side, each with a priority | Priorities 8 entrance, 7 map edge (sandbox), 4 queue with spare link, 3 queue steal, 2 plain path, 1 ride track (lines 630, 547, 499, 509, 517, 614) |
| Sort by priority, then direction | None (293-308) |
| Queue tiles keep at most two links | Cap 2 (767); spare-link test `< 2` (496) |
| Queue keeps one ride and one entrance | Rule on ride index and entrance index (756, 762) |
| Link count = set bits of the 4-bit edge mask | Table `connected_path_count` (80-89) |
| Neighbour list capacity | 8 entries (289) |
| No corner pass on queue or sloped tiles | Checks at 215 and 217 |

## 4. TypeScript sketch

simplified: the sketch follows the donor order (collect with priority numbers, sort, queue filter with cap 2, connect). It omits the wall checks, the sloped-path checks, the corner pass (`FootpathConnectCorners`), the queue chain push, the disconnect and reconnect side effects on a full queue neighbour (the steal is only a flag here), the reverse bit on a path neighbour (set on that neighbour's own tile), and the park-entrance special case. It reorders nothing, except that the queue filter builds a new list instead of removing items by index inside a counting loop (the donor's defect; fixed here).

```ts
// Clean-room sketch. Donor: OpenRCT2 (GPL version 3, file header). Written from the described mechanism, not a translation.
type Kind = "entrance" | "edge" | "track" | "queuePath" | "plainPath";
interface Probe { dir: number; kind: Kind; ride: number | null; entrance: number | null; queueEdges: number; canSteal: boolean }
interface Neighbour { order: number; dir: number; kind: Kind; ride: number | null; entrance: number | null }
interface Tile { isQueue: boolean; edges: number } // edges: 4-bit mask, one bit per side

// Priority numbers as the donor pushes them. Higher is connected first.
const ORDER = { entrance: 8, edge: 7, track: 1, queuePath: 4, steal: 3, plainPath: 2 } as const;

function popcount4(mask: number): number {
  return (mask & 1) + ((mask >> 1) & 1) + ((mask >> 2) & 1) + ((mask >> 3) & 1);
}

// Query pass: one candidate per probed side, with the donor's priority numbers.
function collect(probes: Probe[], initiatorIsQueue: boolean, sandbox: boolean): Neighbour[] {
  const out: Neighbour[] = [];
  for (const p of probes) {
    let order: number;
    if (p.kind === "edge") {
      if (!sandbox) continue;
      order = ORDER.edge;
    } else if (p.kind === "queuePath") {
      if (popcount4(p.queueEdges) < 2) order = ORDER.queuePath;
      else if (initiatorIsQueue && p.canSteal) order = ORDER.steal;
      else continue;
    } else if (p.kind === "entrance") {
      order = ORDER.entrance;
    } else if (p.kind === "track") {
      order = ORDER.track;
    } else {
      order = ORDER.plainPath;
    }
    out.push({ order, dir: p.dir, kind: p.kind, ride: p.ride, entrance: p.entrance });
  }
  return out;
}

// Higher order first; equal order goes to the lower direction first.
function sortNeighbours(list: Neighbour[]): Neighbour[] {
  return [...list].sort((a, b) => b.order - a.order || a.dir - b.dir);
}

// Queue tiles: keep the ride of the first ride-bearing neighbour, drop other rides and other entrances
// of that ride, then cap at two. Builds a new list (the donor removes by index inside a counting loop,
// which skips the item that moves into the removed slot; that is the defect fixed here).
function queueFilter(sorted: Neighbour[]): Neighbour[] {
  let ride: number | null = null;
  let entrance: number | null = null;
  const kept: Neighbour[] = [];
  for (const n of sorted) {
    if (n.ride !== null) {
      if (ride === null) {
        ride = n.ride;
        entrance = n.entrance;
      } else if (n.ride !== ride) {
        continue;
      } else if (n.entrance !== null && n.entrance !== entrance) {
        continue;
      }
    }
    kept.push(n);
  }
  return kept.slice(0, 2);
}

// Connect pass in list order. The initiating tile sets its edge bit toward every accepted neighbour
// (path, ride track, entrance, edge). The reverse bit on a path neighbour is set on that neighbour's own
// tile and is not modelled here. Queue side effects (disconnecting a full queue) are not modelled.
function connectEdges(tile: Tile, probes: Probe[], sandbox: boolean): { edges: number; links: Neighbour[] } {
  let list = sortNeighbours(collect(probes, tile.isQueue, sandbox));
  if (tile.isQueue) list = queueFilter(list);
  let edges = tile.edges;
  for (const n of list) edges |= 1 << n.dir;
  return { edges, links: list };
}

export {};
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (existing file; the path-junction rule would sit in a zone-authoring helper beside it, not yet created). Walk density along zone paths is what the addendum asks for under row 23; the junction rule itself is authoring-time.
- Parity-checklist row 23 (zone population: walk density along paths is part of it). No row covers path junctions by itself, so row 23 is the nearest row.
- Reuse tag: rewrite-from-idea (GPL version 3; clean-room only)
- Brief rule served: zones as data (Frankendom ruling). No combat rule is served by this note.

## 6. Gaps and risks

- GPL version 3 with no "or later" wording: clean-room only. The sketch was written from the described order; no donor lines were translated.
- The priorities and the cap are RCT2 park rules. Ride entrances, queue chains, park entrances and the steal branch do not transfer. Only the shape (priority, then per-tile cap, then a same-ride filter) transfers.
- Authoring time, not runtime. The server must not rebuild junctions during play; zone paths are data that the server reads and verifies.
- Defect (fix in the sketch): the queue filter at 745-762 removes items by index inside `for (size_t i = 0; i < neighbourList.count; i++)` and then the loop increments `i`, so the item that moves into a removed slot is not tested (756, 762). A neighbour from another ride can therefore survive if it sits directly after a removed one. Fix: build a new list (done in `queueFilter`).
- The steal branch (order 3) changes the neighbour's links through the reconnect helper (393-431). The sketch treats it as a flag (`canSteal`) and does not model the link change. A Frankendom version must decide which link a full hub path gives up, and test it.
- Corners and wide-path flags (`FootpathConnectCorners`, `FootpathUpdatePathWideFlags` at 1333) were not traced to the bit level; the corner step is named in the sketch's simplified line as omitted.
- Minimap (`src/openrct2-ui/windows/Map.cpp`) and landmark or signage code were not read in this pass, so this cell does not rate the minimap or signage topics.
- Half read: engine code (placement and connection rules, not the server or client half). No data table was read for this rule: the priority numbers are literals in the code.
- The sketch is only typechecked (VPS, `tsc --strict --target es2020`, exit 0). It was not run on a path grid.
