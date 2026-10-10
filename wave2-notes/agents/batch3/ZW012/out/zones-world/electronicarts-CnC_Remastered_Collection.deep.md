# electronicarts-CnC_Remastered_Collection (zones-world, cell 1)

Donor: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/REDALERT/MAP.CPP` (symbols `MapClass::Zone_Reset`, `MapClass::Zone_Span`, `MapClass::Nearby_Location`, read with `CellClass::Is_Clear_To_Move` in `CELL.CPP`) | Licence: GPL v3 with EA additional terms under Section 7 (LICENSE.md line 1 and REGION.H header lines 5-7) | C++ | symbol `Zone_Reset`

Checked: The hint file `REGION.H` (56 lines) is a per-region AI threat counter (`class RegionClass`, REGION.H 39-49), not zone layout, so it is not the topic. The real mechanism is `MAP.CPP` Zone_Reset (1498-1567), Zone_Span (1593-1667), Nearby_Location (1696-1783) and `CELL.CPP` Is_Clear_To_Move (2889-2963), all read end to end. Zone_Reset callers: every grep site was listed; read in full: CELL.CPP 1783/1785 (inside Reduce_Wall, 1732) and HOUSE.CPP 4474/4476 (inside Sell_Wall, 4409); read in part: SCENARIO.CPP 605 (inside Fill_In_Data 588); not read: SCENARIO.CPP 743, MAP.CPP 1911/1995/2059 (in Destroy_Bridge_At 1867), OVERLAY.CPP 183, TERRAIN.CPP 508, INFANTRY.CPP 791/866. Nearby_Location callers: FOOT.CPP 332 read in full; FOOT.CPP 958/1281/1284/1352/1357 seen in grep only (not read). The global `Frame` counter is used but its definition was not read. Confidence: high on the labelling and rebuild order; medium on how the other callers use the zone gate. camera_scope: not a camera cell.

Best transferable idea: Label the connected regions of a zone once, rebuild the labels only when a wall or gate state changes, and make every placement search accept only cells in the anchor's region.
Decision (proposed): adapt — placement legality is a real rule for spawns and drops in a fast browser game (no spawn behind a sealed wall), but Frankendom needs region labels built from its zone geometry and rebuilt on blocker change, not the donor's per-cell byte array with four movement classes.
Acceptance: A server test seals a pocket with a wall; a spawn requested inside the pocket lands only in the pocket's region; after the wall is destroyed the labels are rebuilt and the next spawn can land outside it.

## 1. Mechanism

- The map is split into connected regions per movement class. Each cell stores one region number per class (CELL.H 115). Two cells share a number when they are connected through passable terrain. The comment says it is "terrain consideration only" (CELL.H 108-109). There are four classes: normal, crusher, destroyer, water (DEFINES.H 679-682).
- Build (Zone_Reset, MAP.CPP 1498-1567): (a) zero the number for each selected class over all cells (1505); (b) for each selected class, walk the cells in index order and call Zone_Span from each one (1524 for the normal class). Each time Zone_Span fills something, the next region number is used (zone starts at 1, 1522). So a region number is the order in which its lowest-index cell is reached.
- Flood fill (Zone_Span, MAP.CPP 1593-1667): from a cell, scan left and right along its row while each cell is unlabelled and clear for the class; label that span; then recurse into the rows above and below, one cell wider at each end so that diagonals count (1662-1663). Clear means `Is_Clear_To_Move(SPEED_TRACK or SPEED_FLOAT for water, ignoreinfantry=true, ignorevehicles=true, zone=-1, check)` (1614, 1639). So labels are built with infantry and vehicle occupancy masked out (CELL.CPP 2916, and the 0x5F mask at the next line; the meaning of the surviving bit was not read). Return value = cells filled, 0 if the start cell is not a fresh clear cell (1622).
- Query (Is_Clear_To_Move, CELL.CPP 2889-2963): winged locomotion returns true before any zone test (2896). If a zone was given (2904), the cell's label for the class must equal it (2905). Then occupancy bits are optionally masked, then walls: a wall blocks unless the class is destroyer, or crusher on a crushable wall, which counts as clear land (2940, 2948). Last, a zero ground cost for the locomotion blocks (2955).
- Nearby search (Nearby_Location, MAP.CPP 1696-1783): scan rings of growing radius around the cell (1716). In each ring test top row, bottom row, left column, right column, and keep cells that are on the radar, pass Is_Clear_To_Move with the given zone, and are not flagged (when asked). Stop when 10 candidates are collected (1698) or after the first ring that has any (1776). Return `topten[(Frame + locationmod) % count]` (1780), or 0 if none. The pick depends on the frame counter, not a random number.
- Caller pattern: FOOT.CPP 332 asks for a nearby cell in the unit's own zone (`Map[Coord].Zones[MZone]`) when the next cell cannot be entered and the goal is farther than a check distance. It uses the alternative only if it lies within the current distance to the goal (the comparison at FOOT.CPP 333). Because the search is zone-filtered, the alternative is always in a region the unit can reach.
- Rebuild triggers: wall break in Reduce_Wall (CELL.CPP 1783/1785), wall sold (HOUSE.CPP 4474/4476), bridge destroyed (MAP.CPP Destroy_Bridge_At, 1911/1995/2059), bridge template replaced in an infantry-driven branch (INFANTRY.CPP 791/866; branch read in part), overlay placed (OVERLAY.CPP 183), terrain AI step (TERRAIN.CPP 508, body not read), and scenario load (SCENARIO.CPP 605 and 743, both with MZONEF_ALL). Each rebuild walks the whole map (the comment warns: "This is a time consuming routine. Call it as infrequently as possible.", MAP.CPP 1491).
- Tick: no per-frame loop. Zone_Reset is synchronous and called on events. The only time-based part is the Frame-keyed pick in Nearby_Location.

## 2. Key functions

- `MapClass::Zone_Reset`: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/REDALERT/MAP.CPP` 1498-1567. Clears the chosen class bytes, then labels each class in index order.
- `MapClass::Zone_Span`: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/REDALERT/MAP.CPP` 1593-1667. One span fill plus recursion into the rows above and below.
- `MapClass::Nearby_Location`: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/REDALERT/MAP.CPP` 1696-1783. Ring search with a zone filter, then a frame-keyed pick.
- `CellClass::Is_Clear_To_Move`: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/REDALERT/CELL.CPP` 2889-2963. Zone equality gate, then occupancy, walls, ground cost.
- Caller: `FOOT.CPP` 325-340 region (zone-scoped alternate cell, line 332).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Connected-region labels built by flood fill, rebuilt when a blocker changes | Four movement classes (DEFINES.H 679-682); 8-connected neighbours (MAP.CPP 1574) |
| Searches only accept cells with the same region label as the origin | Region byte is `unsigned char` (CELL.H 115), so 255 regions at most; Zone_Reset has no bound check (MAP.CPP 1498-1567) |
| Nearest-legal-cell search: ring by ring, first ring with candidates wins | Candidate cap 10 (MAP.CPP 1698); ring bound `MAP_CELL_W` (1716) |
| Deterministic pick among candidates | `(Frame + locationmod) % count` (1780); `Frame` is the game's frame counter (definition not read) |
| Walls block unless the mover can destroy or crush them | Crushable-wall rule (CELL.CPP 2940, 2948) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's outcome (same connected components, numbered by lowest-index cell, same zone gate, same ten-candidate cap, same pick by tick) but changes the mechanics. It uses an iterative 8-neighbour fill instead of the donor's recursive row spans. It has one movement class (no crusher, destroyer, or water classes), no walls, no occupancy, no radar or flag checks, and no locomotion cost table. Its ring order is Chebyshev rings scanned row by row, not the donor's top, bottom, left, right order. It adds a bound check on the region count (the donor has none). The `locationmod` default is 0. The file typechecks on the VPS with `tsc --strict --target es2020` (exit 0).

```ts
// Licence: GPL-3.0 with EA additional terms (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Grid {
  w: number;
  h: number;
  passable(x: number, y: number): boolean;
}

export interface Cell { x: number; y: number; }

const MAX_REGION_ID = 255; // one byte per cell in the donor; the sketch refuses to overflow it

// Connected-region labels for one movement class. 0 = not passable / not labelled yet.
// Rebuild from scratch whenever a blocking object (wall, bridge, door) changes.
export function labelRegions(g: Grid): Uint8Array {
  const zone = new Uint8Array(g.w * g.h);
  let next = 1;
  for (let i = 0; i < g.w * g.h; i++) {
    if (zone[i] !== 0 || !g.passable(i % g.w, Math.floor(i / g.w))) continue;
    if (next > MAX_REGION_ID) throw new Error("too many regions for one-byte labels");
    const stack: number[] = [i];
    zone[i] = next;
    while (stack.length > 0) {
      const c = stack.pop() as number;
      const cx = c % g.w;
      const cy = Math.floor(c / g.w);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= g.w || ny >= g.h) continue;
          const n = ny * g.w + nx;
          if (zone[n] !== 0 || !g.passable(nx, ny)) continue;
          zone[n] = next;
          stack.push(n);
        }
      }
    }
    next++;
  }
  return zone;
}

// Nearest passable cell in the same region as `from`. Rings grow outward; the first ring with
// candidates supplies up to 10 of them; the pick is keyed on the tick so server and clients agree.
export function nearbyLegalCell(
  g: Grid,
  zone: Uint8Array,
  from: Cell,
  tick: number,
  locationMod = 0,
): Cell | null {
  const regionOf = (x: number, y: number): number =>
    x < 0 || y < 0 || x >= g.w || y >= g.h ? 0 : zone[y * g.w + x];
  const want = regionOf(from.x, from.y);
  if (want === 0) return null;

  const cands: Cell[] = [];
  const maxRadius = Math.max(g.w, g.h);
  for (let r = 0; r < maxRadius && cands.length < 10; r++) {
    for (let dy = -r; dy <= r && cands.length < 10; dy++) {
      for (let dx = -r; dx <= r && cands.length < 10; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; // ring r only
        const x = from.x + dx;
        const y = from.y + dy;
        if (regionOf(x, y) === want) cands.push({ x, y });
      }
    }
    if (cands.length > 0) break;
  }
  if (cands.length === 0) return null;
  return cands[(tick + locationMod) % cands.length];
}

export {};
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population: where a spawn may land, the placement step). The region labels would be built from zone geometry whenever a blocker changes, one per movement class Frankendom uses (probably one). The Frankendom zone file format was not read (not read).
- Parity-checklist row 23 (zone population). The fit is partial: this donor mechanism is placement legality (a spawn or drop must sit in the same region as its anchor). Spawn caps, respawn timers and despawn grace are not in this cell; the donor does not show them. If the row needs a sub-line, use "server tick: fixed step" (row 18 / post-K item 3): the frame-keyed pick only agrees between server and clients if the tick is fixed.
- Reuse tag: rewrite-from-idea (GPL v3 with EA additional terms; clean-room only)
- Brief rule served: zones as data (labels derived by the engine from zone geometry, not authored per cell); one engine (one placement rule for every zone); server-verified placement (pick keyed on the tick, not on client state).

## 6. Gaps and risks

- Licence: GPL v3 with EA additional terms. Clean-room only. The sketch is written from the described mechanism and was not translated line by line.
- Labels are terrain only at build time (occupancy masked for infantry and vehicles, CELL.CPP 2916). Units and doors are then checked at query time. Frankendom must decide whether a closed door is a blocker that triggers a rebuild, or a query-time check. The donor does not give a rule for it.
- Rebuild cost: each trigger relabels the whole map (MAP.CPP 1491 warns about it). Frankendom zones are smaller, but a per-zone rebuild is still needed when a gate or wall state changes, and it should not run per tick.
- Region-count overflow: the label byte is `unsigned char` and Zone_Reset does not check for it (CELL.H 115; MAP.CPP 1498-1567). A 256th region would wrap to 0, which means "unlabelled". Whether any real map gets there was not checked. The sketch throws instead.
- Recursive fill (donor) can go deep on large open maps. The sketch is iterative. Frankendom should not port the recursion.
- The donor's query returns 0 when no candidate exists (MAP.CPP 1782). Callers must test for it (FOOT.CPP 332 does, `cell2 != 0`). The sketch returns null.
- The frame-keyed pick is only deterministic if every client and the server share the same frame counter. Frankendom has a server-verified tick, so it can use it. Do not use the client's animation frame.
- Winged movers skip the zone test (CELL.CPP 2896). Frankendom has no flyers in this ruling; drop that branch.
- Not read: the body of Destroy_Bridge_At (1867-), Fill_In_Data and Post_Load_Game beyond the reset call, the other Zone_Reset callers listed above, the other FOOT.CPP callers, and the definition of `Frame`.
