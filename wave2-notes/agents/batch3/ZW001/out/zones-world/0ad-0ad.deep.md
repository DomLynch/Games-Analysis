# 0ad-0ad (zones-world, cell 2)

Donor: `/mnt/frankendom-donors/0ad-0ad/source/simulation2/components/CCmpTerritoryManager.cpp` | Licence: GPL-2.0-or-later (per the file header, lines 3-16: "either version 2 of the License, or (at your option) any later version"; CCmpTerritoryInfluence.cpp carries the same header; LICENSE.txt not read) | C++ | symbol `CCmpTerritoryManager::CalculateTerritories` (with `Floodfill`, `CalculateCostGrid`, `GetOwner`, `IsConnected`, `CCmpTerritoryInfluence` weight/radius/root reads)

Checked: Read in full: `CalculateTerritories` (CCmpTerritoryManager.cpp 428-589), `Floodfill` (343-373), `CalculateCostGrid` (385-426), `GetOwner`, `GetNeighbours`, `IsConnected`, `GetTerritoryPercentage` (601-615, 734-799), `MakeDirty` and the message handlers (170-270), `Init` parameter reads (128-149). Read: `CCmpTerritoryInfluence.cpp` parameter reads (58-60) and value modifiers (76-101), `ICmpTerritoryManager.h` 44-60, `Grid.h` 160-168, `Pathfinding.h` 143, `territorymanager.xml` (mod/simulation/data), and the influence values in five templates (civic civil centre, storehouse, defensive wall, military base, military fortress). Not read: `graphics/TerritoryBoundary.cpp` (boundary lines; client-side), `UpdateBoundaryLines`, the decay manager (no CCmpTerritoryDecayManager.cpp under components), the ValueModificationManager internals, template inheritance (so the fortress weight is not stated). Toy check: I compiled the clean-room sketch on the VPS and ran it on a 40x3 grid (see section 4); the donor itself was not run. Confidence: high on the ownership algorithm and the falloff arithmetic; high on the connectivity pass; medium on the "reach" numbers in section 1, which are arithmetic on the code and match the toy run. camera_scope: not applicable (zones topic).

Best transferable idea: Zone ownership comes from weighted influence sources with a linear, terrain-cost-scaled falloff over a tile grid, the owner of each tile is the player whose summed weight is greatest, and only tiles connected to a root source count.
Decision (proposed): adapt - take the influence-falloff and max-weight owner shape for zone control, but store weight, radius and root as zone data, compute it on the server in integer math, and recompute only when a zone's sources change (never per tick); the donor's full-map recompute and its boundary drawing do not transfer as is.
Acceptance: Server test: on a 40x3 toy zone grid with one root of weight 10000 and radius 140 at tile 2, the owner is player 1 on tiles 0-19 and no owner beyond; an exact weight tie goes to the lower player id; an owned pocket not connected to its root is not counted. Player sees: a zone border that moves when a root is added or destroyed, and a cut-off pocket that stops counting toward the zone.

## 1. Mechanism

- Inputs. Each entity with a `TerritoryInfluence` component gives `Weight` (template value, u16), `Radius` (world units) and a `Root` flag (`CCmpTerritoryInfluence.cpp` 58-60). Weight and Radius can be changed at query time by the ValueModification system (CCmpTerritoryInfluence.cpp 85-101). The owner is the entity's Ownership (player id; Gaia 0 and ids above 31 are ignored, CCmpTerritoryManager.cpp 466-469). Position maps to a tile by floor division by 8 (`NAVCELLS_PER_TERRITORY_TILE` = 8, ICmpTerritoryManager.h 50; navcell = 1 world unit, Pathfinding.h 143).
- Cost grid (CalculateCostGrid, 385-426). Each tile takes the OR of its 8x8 navcells. A tile that fails the "default-terrain-only" passability check costs `ImpassableCost` (4, territorymanager.xml 3). A tile that is on the map but fails "unrestricted" costs 255 (off the world). Other tiles cost 1 and are counted as passable.
- Per-entity spread (CalculateTerritories, 491-552). For each player in ascending id order (the map is a `std::map`, 457-479), for each entity with weight > 0 and radius > 0: `fall = floor(weight * 8 / radius)` (the per-tile loss on a cost-1 tile, 502-504). Its origin tile gets the full weight. A flood runs from there over 8 neighbours. Stepping into neighbour n costs `fall * cost(n)`, and diagonal steps use `* 362 / 256` (about sqrt 2, 519-523). The step is taken only if the current tile's entity weight is greater than the neighbour's plus that cost (527-532), so each tile keeps the best weight this entity can reach. The tile's new weight is current minus cost (535), and it re-enters the queue each time it improves. There is no priority queue; the queue order does not change the result, only the number of re-visits.
- Player totals and owner (536-548). A tile's total for a player is the sum of the weights of all that player's entities that reach it (537-541), so several sources add up. The owner of a tile is whichever player's total is strictly greater than the best total so far (544-547). Because players are processed in ascending id order, an exact tie goes to the lower id.
- Connectivity (555-579). From each Root entity's tile, a second flood runs through tiles the same owner holds (572-574). Those tiles get the connected bit (0x20, ICmpTerritoryManager.h 53) and passable ones are counted per owner (575-576). A pocket of an owner's tiles that no root reaches keeps its owner but is not connected.
- Queries. `GetOwner` reads the owner bits of the nearest tile (745). `IsConnected` reads the connected bit (798). `GetNeighbours` floods over the player's territory and counts the other owners' border tiles, with a filter that drops unconnected ones (780). `GetTerritoryPercentage` returns connected passable tiles x100 divided by all passable tiles (612).
- Dirty and recompute. `MakeDirty` deletes the grid (266) and fires when an influence entity changes owner or position (235-237), when a TerritoryInfluence value is modified (194-195), when a player colour changes (182), or when terrain, obstruction or water changes (199-204, which also drops the cost grid at 203). The grid is rebuilt lazily on the next query. On the next update it broadcasts TerritoriesChanged once (207-213).
- Numbers that follow from the code (arithmetic, matching a toy run on the VPS). A civic centre (Weight 10000, Radius 140, Root true, templates civic_civil_centre 136-138) has fall 571 per tile, so on open ground it claims 17 tiles in a straight line (140 / 8 = 17.5). A storehouse (30000, 20) has fall 12000, reach 2 tiles. A defensive wall (65535, 20) has fall 26213, reach 2 tiles. A military base (40000, 50, template_structure_military.xml 25-26) has fall 6400, reach 6 tiles.

## 2. Key functions

- `CCmpTerritoryManager::CalculateTerritories`: `/mnt/frankendom-donors/0ad-0ad/source/simulation2/components/CCmpTerritoryManager.cpp` 428-589. Ownership pass (479-553), root connectivity pass (557-579), decay hook (582-588).
- `Floodfill`: `.../CCmpTerritoryManager.cpp` 343-373. A queue-based spread with a decider callback; the caller decides when to expand.
- `CCmpTerritoryManager::CalculateCostGrid`: `.../CCmpTerritoryManager.cpp` 385-426. Passability to tile cost.
- `CCmpTerritoryManager::MakeDirty`: `.../CCmpTerritoryManager.cpp` 264-270, with the message handlers at 170-238.
- `CCmpTerritoryInfluence` (`/mnt/frankendom-donors/0ad-0ad/source/simulation2/components/CCmpTerritoryInfluence.cpp`): parameter reads 58-60, modified reads 76-101.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Per-source linear falloff: fall = weight x 8 / radius, lost per tile | 8 navcells per tile (theirs, ICmpTerritoryManager.h 50); navcell 1 unit (theirs, Pathfinding.h 143) |
| Terrain-scaled falloff: a blocked tile costs more to cross | ImpassableCost 4 (theirs, territorymanager.xml 3); off-world 255 (theirs, CCmpTerritoryManager.cpp 418) |
| Diagonal step about sqrt 2 | 362 / 256 (theirs, CCmpTerritoryManager.cpp 522) |
| Owner = player with the largest summed weight, ties to lower id | Player ids 1-31 (theirs, ICmpTerritoryManager.h 52; owner check 468) |
| Only connected tiles count toward a player | Root flag per source (theirs, template civic centre 136); connected bit 0x20 (theirs, ICmpTerritoryManager.h 53) |
| Sources: weight and radius are data | civic centre 10000 / 140 (theirs, template civic centre 137-138); storehouse 30000 / 20 (theirs, template storehouse 72-73); wall 65535 / 20 (theirs, template defensive wall 36); military base 40000 / 50 (theirs, template military 25-26) |

## 4. TypeScript sketch

simplified: keeps the donor order: players ascending, each source spreads with the relaxation test and the cost-scaled falloff, the player total and the owner are updated on each improvement, then the root flood marks connected tiles. It takes the cost grid and the source list as inputs (no pathfinder, no navcell downsampling, no nearest-tile mapping: tile indices are given). It omits the connected-count percentage, the blinking and decay flags, the dirty-flag cache and message wiring, the boundary lines, the u16 and entity-count guards, and the Gaia rule beyond the owner range check. Ties and the first-write rule match the donor. The toy grid run on the VPS (40x3) gave: one civic-centre source at tile 2 owns tiles 0-19 (17 tiles to the right); with a second source of equal weight at tile 30, tile 16 is an exact tie and goes to player 1 (the lower id), and tile 17 goes to player 2.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface Influence {
  owner: number;   // player id; the donor ignores 0 and ids above 31
  tx: number;      // tile x of the entity (donor: nearest tile of its position)
  tz: number;      // tile z
  weight: number;  // template Weight (u16 in the donor)
  radius: number;  // template Radius, in world units (1 navcell = 1 unit)
  root: boolean;   // civic-centre style root: its owned, connected tiles are flagged
}

interface TileGrid {
  w: number;
  h: number;
  cost: number[];        // per tile: 1 passable, impassableCost on blocked tiles, 255 off the map
  impassableCost: number; // donor: 4, from territorymanager.xml
}

interface Ownership {
  owner: number[];                  // 0 = unclaimed
  connected: boolean[];             // reachable from a root of the same owner
  countByOwner: Map<number, number>; // connected passable tiles per owner
}

const NEIGHBOURS: ReadonlyArray<readonly [number, number]> = [
  [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1],
];
const TILE_NAVCELLS = 8; // donor NAVCELLS_PER_TERRITORY_TILE

function computeOwnership(g: TileGrid, infl: Influence[]): Ownership {
  const n = g.w * g.h;
  const owner: number[] = new Array<number>(n).fill(0);
  const best: number[] = new Array<number>(n).fill(0);

  const byPlayer = new Map<number, Influence[]>();
  for (const e of infl) {
    if (e.owner <= 0 || e.owner > 31 || e.weight === 0 || e.radius === 0) continue;
    const list = byPlayer.get(e.owner) ?? [];
    list.push(e);
    byPlayer.set(e.owner, list);
  }
  // Players in ascending id order, as the donor's std::map gives; equal totals keep the earlier owner.
  const players = [...byPlayer.keys()].sort((a, b) => a - b);

  for (const p of players) {
    const total: number[] = new Array<number>(n).fill(0); // summed weight of all of p's entities
    for (const e of byPlayer.get(p) ?? []) {
      const entity: number[] = new Array<number>(n).fill(0); // this entity's own weight per tile
      const fall = Math.floor((e.weight * TILE_NAVCELLS) / e.radius); // weight lost per tile of cost 1
      const origin = e.tz * g.w + e.tx;

      entity[origin] = e.weight;
      total[origin] += e.weight;
      if (total[origin] > best[origin]) { best[origin] = total[origin]; owner[origin] = p; }

      const queue: number[] = [origin];
      for (let head = 0; head < queue.length; head++) {
        const cur = queue[head];
        const cx = cur % g.w;
        const cz = Math.floor(cur / g.w);
        for (const [dx, dz] of NEIGHBOURS) {
          const nx = cx + dx;
          const nz = cz + dz;
          if (nx < 0 || nz < 0 || nx >= g.w || nz >= g.h) continue;
          const ni = nz * g.w + nx;
          const perTile = fall * g.cost[ni];
          const diagonal = dx !== 0 && dz !== 0;
          const falloff = diagonal ? Math.floor((perTile * 362) / 256) : perTile; // about sqrt(2) on diagonals
          // Expand only if this step improves the tile for this entity.
          if (entity[cur] <= entity[ni] + falloff) continue;
          const w = entity[cur] - falloff;
          const sum = w + total[ni] - entity[ni];
          total[ni] = sum;
          entity[ni] = w;
          if (sum > best[ni]) { best[ni] = sum; owner[ni] = p; }
          queue.push(ni);
        }
      }
    }
  }

  // Connectivity: flood from each root through tiles its own owner holds.
  const connected: boolean[] = new Array<boolean>(n).fill(false);
  const countByOwner = new Map<number, number>();
  const bump = (o: number): void => { countByOwner.set(o, (countByOwner.get(o) ?? 0) + 1); };
  for (const r of infl) {
    if (!r.root) continue;
    const start = r.tz * g.w + r.tx;
    const q: number[] = [];
    const mark = (i: number): void => {
      if (owner[i] !== r.owner || connected[i]) return;
      connected[i] = true;
      if (g.cost[i] < g.impassableCost) bump(r.owner);
      q.push(i);
    };
    mark(start);
    for (let head = 0; head < q.length; head++) {
      const cur = q[head];
      const cx = cur % g.w;
      const cz = Math.floor(cur / g.w);
      for (const [dx, dz] of NEIGHBOURS) {
        const nx = cx + dx;
        const nz = cz + dz;
        if (nx < 0 || nz < 0 || nx >= g.w || nz >= g.h) continue;
        mark(nz * g.w + nx);
      }
    }
  }

  return { owner, connected, countByOwner };
}
```

## 5. Lands in

- TARGET `origins/server/zone-control.ts` (new module, proposed; I did not read the Frankendom repo). Zone control is not zone population, so no parity row fits exactly. The closest is row 23 (zones: spawn caps, respawn, despawn), and I cite it only as the nearest zone row. Plainly: no parity row covers zone ownership.
- Server tick sub-line: recompute only when a zone's sources change (the donor's dirty rule), never per tick; this is the "server tick: fixed step" line under post-K item 3.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only; shape only, no line-by-line translation)
- Brief rule served: zones as data (weight, radius and root are zone data; the owner rule is engine logic); server-verified (integer math on tile indices, so a server test can assert it). Rules 7-9 n/a.

## 6. Gaps and risks

- Not population: this decides who holds a zone, not how many mobs spawn. Do not put it in the spawn module.
- Integer falloff: `fall = floor(weight x 8 / radius)` (CCmpTerritoryManager.cpp 502-504). If weight x 8 is less than radius, the falloff is 0 and the source floods every reachable tile at constant weight (arithmetic, not run). A zone authoring rule must keep weight x 8 >= radius.
- Summed weight: many weak sources can beat one strong source (545-547 with 537-541). That is a design choice, not a Frankendom ruling; decide it per zone, do not inherit it.
- Ties: the lower player id wins an exact tie (ascending order, strict >, 544). Frankendom must state its own tie rule and test it.
- Disconnected pockets: the owner is kept, but `IsConnected` returns false (798). One ledger: decide whether a disconnected pocket counts toward zone progress. The donor keeps both facts and leaves the choice to the caller.
- Full recompute: any influence change rebuilds the whole grid (`MakeDirty`, 264-270). Fine for small zones; for a large world, the rebuild should be scoped per zone, and never run per tick.
- Boundary lines are client-only (graphics/TerritoryBoundary.cpp, not read). The camera and HUD stay client; the server sends the owner grid only.
- Nothing here limits attackers: MAX_ATTACKERS = 3 is unrelated and must not be borrowed from this donor.
- The Pit is a fixed arena (row 22) and has no zone control; keep this module off the Pit client.
