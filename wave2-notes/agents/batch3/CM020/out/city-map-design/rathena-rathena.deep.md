# rathena-rathena (city-map-design, cell 2)

Donor: `/mnt/frankendom-donors/rathena-rathena/src/map/navi.cpp` | Licence: GNU General Public License version 3 (repo LICENSE, header read: "Version 3, 29 June 2007"; navi.cpp header "Licensed under GNU GPL"; copyleft: clean-room, shape only) | C++ | symbol `navi_path_search` (entry point `navi_create_lists`)

Checked: Hint was "INFERRED" (no file). Found by grep for minimap, navigation, landmark and town words; navi.cpp is the real mechanism. Read in full: src/map/navi.cpp (655 lines, 1-655) and src/map/navi.hpp (46 lines); constants from src/map/path.hpp lines 11-12 (grep, read at those lines); heuristic line 55 of path.cpp (grep only). LICENSE lines 1-2. Data half: npc/cities/ has 27 town scripts (ls); only the header of npc/cities/brasilis.txt was read (lines 1-12); NPC placement lines were not read. Not read: npc_event_runall and the script side that sets navi names and hidden flags; map_getcellp and the cell loader; the rest of path.cpp; the client Lua consumer (not in the donor). Confidence: high on the generator flow and the path search (read end to end); high that the segmented test is wrong by reading, but not run. camera_scope: n/a.

Best transferable idea: At build time, precompute for each zone the walk-step count from every visible service point to every arrival cell, plus a segmented flag, so the minimap can show "N steps to the bank" without a runtime search.

Decision (proposed): adapt — the per-zone step table is cheap, data-driven and fits zones-as-data and the HUD minimap; reject the Lua output format and the inadmissible heuristic; fix the segmented check before use.
Acceptance: On the HUD minimap, the nearest service in a test zone shows a step count within 1 step of a server-side walk search on the same grid, and a zone whose walls split its exits is flagged segmented and shows as two sheets.

## 1. Mechanism

- Offline. navi_create_lists (633-653) is run by the map-server generator, not by the game loop. It runs a script hook first (638), then writes four tables in this order: object lists (640), NPC distances (644), map distances (648). There is no tick.
- Object lists (423-514). For every map and every NPC: warps get ids from 13350 (460); other NPCs from 11984 (471). NPCs with class -1, hidden NPC or hidden warp classes, guild flags, or a script-set `navi.hidden` flag are skipped (466-469). Each warp into a map and each warp out of a map is recorded on both maps (462-463, 481-483). An NPC row carries a type code: 102 for shop and cash-shop NPCs, 101 otherwise (393). The visible name is the part of the internal name before `#` (384). Mob spawns are written with type 300 or 301 by whether the mob has MVP experience (`mexp`, 406).
- Map type (313-341). Returns 5002 when the map name contains "air" (318-319). Otherwise it is "segmented" when some pair of outbound warps cannot reach each other on foot (322-328), giving 5003 or, with a mob list, 5005 (334-338); default 5001 (340). The segmented test is defective (section 6).
- NPC distance table (545-574). For each map with NPCs and at least one arrival (555-562), for each NPC, run the A* walk from the NPC to the arrival cell of each warp into this map (warp_dest). Keep only reachable pairs, storing the step count (527-541).
- Map distance table (616-630). For each warp out of a map, run the walk from its arrival cell in the destination map to each warp out of that destination map, rows tagged "E" (603-610). The same-map "P" rows are commented out (594-601).
- A* core (154-283). Bounded grid (0..xs, 0..ys). Start is not checked for walkability (168). Goal must be walkable (173). Eight neighbours; a diagonal is allowed only when both orthogonal sides are open (212; 245-258). Cost 10 per orthogonal step, 14 per diagonal (path.hpp 11-12). Heuristic is 10 x Manhattan (63). Goal test when a node is popped (234). Path length is the number of parent links (267). Path is stored as direction codes in a fixed buffer (navi.hpp 36: 1024).
- Output is a set of Lua tables (write_header 298-300) written to .lub files under the client data folder (filePrefix, line 28; file names 424-427).

## 2. Key functions

- `navi_create_lists`: `/mnt/frankendom-donors/rathena-rathena/src/map/navi.cpp` 633-653 (ordering).
- `write_object_lists`: same file, 423-514 (ids, filters, type codes).
- `map_type`: same file, 313-341 (segmented test, defective).
- `write_npc_distance` and `write_npc_distances`: same file, 527-574 (NPC to arrival steps).
- `write_map_distance` and `write_map_distances`: same file, 592-630 (arrival to warp steps, E rows).
- `navi_path_search`: same file, 154-283 (A* core).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Walk-step search with no corner cutting (diagonal needs both sides open) | Costs 10 orthogonal and 14 diagonal (path.hpp 11-12, theirs) |
| Heuristic for A* | 10 x Manhattan (navi.cpp 63); the donor's own comment (62) calls it inadmissible and says the game client uses it |
| One table per point: steps to each reachable arrival, skip the rest | None (the table shape) |
| Pairwise reachability of exits gives a segmented flag | Map type codes 5001, 5002, 5003, 5005 (comment 306-310, theirs) |
| Stable ids for generated rows | Warp ids from 13350 (navi.cpp 460); NPC ids from 11984 (471) |
| Path buffer limit | 1024 (navi.hpp 36) |

## 4. TypeScript sketch

simplified: keeps the donor's no-corner-cutting rule, the walk search to a goal with its step count, the per-point arrival table and the segmented check. It omits the binary heap (a linear scan instead), the static node pool and its index check, the map type codes, the same-map and warp-out-to-warp-out tables, the skip rules per map, and the Lua output. It changes two things on purpose: the heuristic is octile (admissible for costs 10 and 14) instead of 10 x Manhattan, and the segmented check tests each exit pair on the same grid (the donor's container comparison is wrong, see section 6).

```ts
// Licence: GPL-3.0 (donor). Clean-room sketch of the shape only, written from the described mechanism, not a translation.

interface Cell { x: number; y: number; }
interface Grid { width: number; height: number; blocked(x: number, y: number): boolean; }
interface Exit { id: number; at: Cell; }      // cells where a walk leaves this zone
interface Arrival { id: number; at: Cell; }   // cells where a traveller lands in this zone
interface Point { id: number; at: Cell; hidden: boolean; } // NPCs and other service points
interface StepRow { targetId: number; steps: number; }

const MOVE_COST = 10;
const DIAGONAL_COST = 14;

// Walk-step search on the grid. A diagonal step needs both side cells open (no corner cutting).
// Returns the number of steps to the goal, or null when it is unreachable.
function walkSteps(g: Grid, from: Cell, to: Cell): number | null {
  if (from.x === to.x && from.y === to.y) return 0;
  if (to.x < 0 || to.y < 0 || to.x >= g.width || to.y >= g.height || g.blocked(to.x, to.y)) return null;

  // Octile estimate (admissible for these costs). The donor uses 10 x Manhattan, which can overshoot.
  const h = (x: number, y: number): number => {
    const dx = Math.abs(to.x - x);
    const dy = Math.abs(to.y - y);
    return MOVE_COST * Math.max(dx, dy) + (DIAGONAL_COST - MOVE_COST) * Math.min(dx, dy);
  };

  type Node = { x: number; y: number; g: number; steps: number };
  const key = (x: number, y: number): number => y * g.width + x;
  const best = new Map<number, number>();
  const open: Node[] = [{ x: from.x, y: from.y, g: 0, steps: 0 }];
  best.set(key(from.x, from.y), 0);

  const dirs: [number, number, number][] = [
    [1, 0, MOVE_COST], [-1, 0, MOVE_COST], [0, 1, MOVE_COST], [0, -1, MOVE_COST],
    [1, 1, DIAGONAL_COST], [1, -1, DIAGONAL_COST], [-1, 1, DIAGONAL_COST], [-1, -1, DIAGONAL_COST],
  ];

  while (open.length > 0) {
    // Linear scan for the lowest f = g + h.
    let bi = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i].g + h(open[i].x, open[i].y) < open[bi].g + h(open[bi].x, open[bi].y)) bi = i;
    }
    const cur = open.splice(bi, 1)[0];
    if (cur.x === to.x && cur.y === to.y) return cur.steps;

    for (const [dx, dy, cost] of dirs) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (nx < 0 || ny < 0 || nx >= g.width || ny >= g.height || g.blocked(nx, ny)) continue;
      if (dx !== 0 && dy !== 0 && (g.blocked(cur.x + dx, cur.y) || g.blocked(cur.x, cur.y + dy))) continue;
      const ng = cur.g + cost;
      const k = key(nx, ny);
      const prev = best.get(k);
      if (prev !== undefined && prev <= ng) continue;
      best.set(k, ng);
      open.push({ x: nx, y: ny, g: ng, steps: cur.steps + 1 });
    }
  }
  return null;
}

// Build-time table: for each visible point, the walk steps to each arrival cell of this zone.
function pointToArrivals(g: Grid, points: Point[], arrivals: Arrival[]): Map<number, StepRow[]> {
  const table = new Map<number, StepRow[]>();
  for (const p of points) {
    if (p.hidden) continue;
    const rows: StepRow[] = [];
    for (const a of arrivals) {
      const steps = walkSteps(g, p.at, a.at);
      if (steps !== null) rows.push({ targetId: a.id, steps });
    }
    table.set(p.id, rows);
  }
  return table;
}

// A zone is segmented when some pair of its exits cannot reach each other on foot.
function isSegmented(g: Grid, exits: Exit[]): boolean {
  for (const a of exits) {
    for (const b of exits) {
      if (a !== b && walkSteps(g, a.at, b.at) === null) return true;
    }
  }
  return false;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file /tmp/CM020-rathena-travel-table.ts: exit 0.

## 5. Lands in

- TARGET `origins/zones/travel-tables.ts` (new build step, not in src/fight): builds per-zone walk tables and the segmented flag from the zone's walk grid, written as zone data. Parity-checklist row 14 (HUD: minimap and world map), with the readout client-only.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: zones as data (the tables are generated from zone data, not hand-typed); HUD is client-only, the engine owns the numbers.

## 6. Gaps and risks

- Defect, keep the idea and fix it: map_type (navi.cpp 322-328). The inner search runs over `warps_outof` but its result is compared with `warps_into.end()`, and the outer search does the same. Comparing iterators of two different vectors is undefined behaviour, and in practice compares raw pointers, which are never equal across two buffers. So the predicate is true whenever a map has an outbound warp, and the map is marked segmented (5003 or 5005) almost everywhere. Read only; not run. fix: test each exit pair on the same grid (`isSegmented` in the sketch) and use the matching container.
- Defect: error path (navi.cpp 379) passes `nd->exname` to ShowError after finding `nd == nullptr`, a null dereference on the path meant to report the error. fix: log the id the caller has, not the NPC object.
- Risk: the heuristic (63) is inadmissible for diagonal routes; the donor's own comment (62) says so and says the client uses it. Step counts can be longer than the shortest walk. Keep the donor's numbers only if a client must match them; otherwise use the octile estimate in the sketch.
- Gap: the same-map ("P") table is commented out (594-601), so there is no point-to-point step table within one zone. A minimap needs one; add it in the new step.
- Gap: counts are walk steps only. Warps, transport NPCs and NPC bodies are not in the count; the cell test is a cell-type parameter (not read in detail).
- Gap: the output is Lua for the client. Frankendom should emit zone data read by the engine; reject the Lua format.
- Licence: GPL-3.0. Clean-room only; the sketch is written from the mechanism.
- Frankendom gap: the Pit has no zone minimap and is out of scope; the table builds from zone grids only.
- Data half: NPC placement is in npc/cities/*.txt (27 files) and other npc scripts; only one header was read.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: zones as data; HUD client-only (parity row 14)
