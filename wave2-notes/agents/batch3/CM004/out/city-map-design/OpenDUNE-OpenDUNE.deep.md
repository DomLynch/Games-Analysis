# OpenDUNE-OpenDUNE (city-map-design, cell 2)

Donor: `/mnt/frankendom-donors/OpenDUNE-OpenDUNE/src/structure.c` | Licence: GNU GPL v2 (COPYING, "Version 2, June 1991" text; per-file headers read do not state "or later") | C | symbol `Structure_IsValidBuildLocation`

Checked: The hinted file `src/map.h` was read in full; it is declarations only (the real code is in `map.c` and `structure.c`). Read in full: `Structure_IsValidBuildLocation` (structure.c 734-813), `Structure_CheckAvailableConcrete` (1375-1411), `Structure_AI_PickNextToBuild` (1980-2040), `Map_UpdateMinimapPosition` (map.c 235-319). Read in part: `Structure_Place` (442-560, slab branch and the hit-point penalty), `GameLoop_Structure` call site (300-330; the function starts at line 53 and I read only the call site inside it, so the exact tick frequency is (not read)), `Map_IsValidPosition` (map.c 320-340), `Map_GetLandscapeType` (map.c 541-569), layout tables (table/structureinfo.c 1244-1262 and 1300-1322). Candidates opened: map.h, map.c, structure.c, table/structureinfo.c, table/landscapeinfo.c (grep), unit.c (grep). Callers: `Structure_IsValidBuildLocation` has callers in structure.c (456, 484, 506, 530), gui/widget_click.c:99 and map.c:104 (selection state); I looked at the structure.c ones only in passing (the 484 and 506 calls are the slab loops). `Structure_CheckAvailableConcrete` has one caller (structure.c:1596, read). `Structure_AI_PickNextToBuild` has one caller (structure.c:317, read). Confidence high on placement and the AI pick; not read: `Map_CreateLandscape` (map.c 1441-1682, procedural terrain), `Structure_ConnectWall` (walls, structure.c 1136), `Structure_FindFreePosition` (structure.c 1253). camera_scope: not a camera topic.

## 1. Mechanism

- A building is a footprint of 1x1 to 3x3 tiles (7 layouts) anchored on a packed tile (64 tiles per row). The footprint offsets are in `g_table_structure_layoutTiles`; the neighbour ring (8 neighbours of a 1x1 tile, diagonals included, so not edge-only) is in `g_table_structure_layoutTilesAround`.
- `Structure_IsValidBuildLocation(position, type)` returns one number: 0 (invalid), 1 (valid, every footprint tile on slab), or -n (valid, n footprint tiles still need a slab). Order of checks, one footprint tile at a time, break on the first failure:
  (a) the tile is on the map (`Map_IsValidPosition`, line 761);
  (b) the terrain allows it: a `notOnConcrete` building needs `isValidForStructure2`, every other building needs `isValidForStructure` (lines 755-773);
  (c) no unit or object is on the tile (780);
  (d) a building that is not `notOnConcrete` counts every tile that is not already a concrete slab as a needed slab (776).
- Growth rule (lines 788-811, skipped for the construction yard and in the strict-validation mode): after the footprint passes, the function scans the ring tiles and accepts the placement only if one ring tile holds a building of the player's house (798, compared to `g_playerHouseID`, not to the placing owner), or a concrete slab or wall of the player's house (804-805). The growth rule is player-only; AI placement does not use it. The sketch generalises it to any owner. If no ring tile qualifies, the placement is invalid (return 0 at 812). So a hub can only grow from its own edge.
- Return (813): 1 if no slab is needed, otherwise -neededSlabs.
- Slabs are laid by `Structure_Place` (442-): a slab building builds concrete on each footprint tile that the same validity check allows, with a second pass for 2x2 slabs (the donor marks this as a "Dirt hack" for footprint tiles outside the building area). A normal building placed with a negative return loses hit points: `hitpoints -= (hpMax / 2) * tilesWithoutSlab / tileCount` (554), and it is flagged to degrade (556). A building built fully on slab does not degrade in the enhanced mode (560, guarded).
- Slab availability: `Structure_CheckAvailableConcrete` (1375-1411) scans anchors 0..4095 and returns true if some anchor has every footprint tile on the owner's concrete. Its caller (1596) shows a hint (1598, `GUI_DisplayHint(STR_THERE_ISNT_ENOUGH_OPEN_CONCRETE...`) when concrete is short, and lets the player go ahead. It warns; it does not block.
- AI build order: `Structure_AI_PickNextToBuild` (1980-2040) is called from the structure loop (317) when the house is AI-controlled and not the player's house, has credits, the structure is allocated, it is a factory, its countdown is 0 and it is not linked. It returns one type per call. A construction yard uses its five-slot rebuild queue (1993-2000) and takes the first slot whose type is buildable. Before the loop, a High-Tech factory strips Carryall from the buildable set and a Heavy Vehicle factory strips Harvester and MCV (2006-2024). Any other factory loops over all unit types: each buildable type is set as the candidate with a 1-in-4 random roll (2030; the first buildable type is always taken as candidate even without the roll), and a later type replaces the candidate only if its `priorityBuild` is strictly higher (2033).

## 2. Key functions

- `Structure_IsValidBuildLocation`: `/mnt/frankendom-donors/OpenDUNE-OpenDUNE/src/structure.c` 734-813. Order: map bound, terrain, occupancy, slab count, growth rule, return.
- `Structure_CheckAvailableConcrete`: `/mnt/frankendom-donors/OpenDUNE-OpenDUNE/src/structure.c` 1375-1411. Scan of 4096 anchors (1387) with `i + offset` and no bound check (1392).
- `Structure_AI_PickNextToBuild`: `/mnt/frankendom-donors/OpenDUNE-OpenDUNE/src/structure.c` 1980-2040. Construction-yard queue (1993-2000); factory pick (2030-2033).
- `Structure_Place` slab branch and penalty: `/mnt/frankendom-donors/OpenDUNE-OpenDUNE/src/structure.c` 442-560 (penalty at 554-556).
- `Map_UpdateMinimapPosition`: `/mnt/frankendom-donors/OpenDUNE-OpenDUNE/src/map.c` 235-319 (minimap window at 288-291; viewport border table at 238).
- Layout tables: `/mnt/frankendom-donors/OpenDUNE-OpenDUNE/src/table/structureinfo.c` 1250 (footprints) and 1305 (ring offsets).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Placement needs an owned neighbour tile (hub grows one building at a time; donor checks the player's house only) | Ring of 8 incl. diagonals (1x1), up to 16 slots (theirs, structureinfo.c 1306; loop 788 over 16) |
| Missing slab is a count; the return value is the count, negative | Return convention 0 / 1 / -n (theirs, structure.c 812-813) |
| Hit-point penalty proportional to the share of tiles without slab, integer math | Half of hit points at full penalty: `(hpMax / 2) * missing / tileCount` (theirs, structure.c 554) |
| Random 1-in-4 candidate roll, then priority | `% 4` (theirs, structure.c 2030); `priorityBuild` from the unit table (2033) |
| Construction-yard queue of five rebuild slots | Five slots (theirs, structure.c 1994) |
| Map grid for placement and minimap | 64 x 64 tiles, `g_map[64 * 64]` (theirs, map.h 71; structure.h 74 gives 7 layouts) |
| Minimap window: viewport 15 x 10 tiles, screen origin 256 px, 136 px, per-scale pixel step (mapScale + 1) | theirs, map.c 238 (border), 288-291 (window) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order (map bound, terrain, occupancy, slab count, growth rule, return convention) and the hit-point penalty, plus the AI pick. It omits: the terrain tables themselves (okPlain and okStrict are inputs), the strict-validation mode and the debug-scenario branch, the layout enumeration (footprint and ring are passed in), the slab-laying code in `Structure_Place`, wall connection, the construction-yard branch of the AI pick, and the minimap. Three places differ from the donor, marked "fix" in the code: the ring tile gets a map bound check (the donor does not), the slab scan is bounded to the map (the donor's 4096-anchor scan does not bound `i + offset`), and the random roll is taken first (the donor lets a later higher-priority type overwrite it).

```ts
// Licence: GPL-2.0 (donor COPYING, version 2 text). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Cell {
  okPlain: boolean;      // terrain allows a footprint tile of a normal building
  okStrict: boolean;     // terrain allows a footprint tile of a notOnConcrete building
  concrete: boolean;     // a laid slab
  wall: boolean;
  structure: number | null; // owner id of a building covering this tile
  owner: number;         // owner of a slab or wall tile
  occupied: boolean;     // a unit or other object sits here
}

interface Grid { w: number; h: number; cells: Cell[] } // flat, index = y * w + x

interface BuildingType {
  footprint: number[];   // tile offsets from the anchor (donor: layoutTiles)
  ring: number[];        // neighbour offsets incl. diagonals (donor: layoutTilesAround)
  notOnConcrete: boolean;
  isYard: boolean;       // the construction yard is exempt from the adjacency rule
  hpMax: number;
}

function inMap(g: Grid, p: number): boolean {
  return p >= 0 && p < g.w * g.h;
}

// Donor convention: 0 = invalid, 1 = valid on slabs, -n = valid with n footprint tiles still needing a slab.
function buildCheck(g: Grid, at: number, owner: number, t: BuildingType): number {
  let needSlabs = 0;
  for (const off of t.footprint) {
    const p = at + off;
    if (!inMap(g, p)) return 0;
    const c = g.cells[p];
    if (c.occupied) return 0;
    if (t.notOnConcrete ? !c.okStrict : !c.okPlain) return 0;
    if (!t.notOnConcrete && !c.concrete) needSlabs++;
  }
  if (!t.isYard) {
    // Growth rule: some ring tile must hold one of the owner's buildings, slabs or walls.
    let touches = false;
    for (const off of t.ring) {
      const q = at + off;
      if (!inMap(g, q)) continue;           // fix: the donor reads ring tiles without a map check
      const c = g.cells[q];
      if (c.structure === owner) { touches = true; break; }
      if ((c.concrete || c.wall) && c.owner === owner) { touches = true; break; }
    }
    if (!touches) return 0;
  }
  return needSlabs === 0 ? 1 : -needSlabs;
}

// Donor: Structure_CheckAvailableConcrete. True if some anchor has every footprint tile on the owner's slab.
// Fix: the donor scans 4096 anchors and does not bound-check i + offset; this version does.
function hasSlabSpot(g: Grid, owner: number, t: BuildingType): boolean {
  for (let a = 0; a < g.w * g.h; a++) {
    let full = true;
    for (const off of t.footprint) {
      const p = a + off;
      if (!inMap(g, p) || !g.cells[p].concrete || g.cells[p].owner !== owner) { full = false; break; }
    }
    if (full) return true;
  }
  return false;
}

// Donor: a building with missing slabs loses hit points in proportion to the share of footprint tiles without a slab.
// Donor order is (hpMax / 2) * tilesWithout / tileCount, integer math. slabCount is the donor's return value (negative = missing).
function hpAfterPlacement(t: BuildingType, slabCount: number, tileCount: number): number {
  const missing = -slabCount;
  if (missing <= 0) return t.hpMax;
  return t.hpMax - Math.floor(Math.floor(t.hpMax / 2) * missing / tileCount);
}

// Donor: Structure_AI_PickNextToBuild. Fix: the donor's 1-in-4 random pick is overwritten by any later
// higher-priority item, so priority can undo the randomness. Here the random roll is taken first.
function pickNext(buildable: number[], priority: (type: number) => number, rand: () => number): number | undefined {
  if (buildable.length === 0) return undefined;
  if (rand() < 0.25) return buildable[Math.floor(rand() * buildable.length)];
  let best = buildable[0];
  for (const t of buildable) {
    if (priority(t) > priority(best)) best = t; // earliest wins ties
  }
  return best;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file copied to /tmp/opendune-building-grammar.ts).

## 5. Lands in

- TARGET `origins/server/world-hubs.ts` (new, zone-data validator and placement rule, beside `origins/server/world-spawns.ts`). Server-side, because kills and zone layout are server-verified and the client should not decide where a hub stands.
- Parity row 23 (zone population and content as zone data). Honest caveat: no parity row covers hub or town layout. Row 23 is the nearest, because the services are zone content on the same data layer. Lead should confirm or add a row.
- today: nothing in Frankendom places hub services (not read in this pass).
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only, shape and formula only)
- Brief rule served: 23 (zones are data on one runtime); rule 1 (one engine) for the validator living on the server, not in the client

## 6. Gaps and risks

- GPL-2.0: clean-room only. The sketch is written from the mechanism.
- Defect, idea kept: ring tiles are read with no map bound check. `Map_GetLandscapeType` (map.c 541-569) indexes `g_map[packed]` directly, and the ring offsets (structureinfo.c 1306) include -1 and -64. On a row edge a ring tile wraps into the neighbouring row, so a hub at the edge can count a tile on the far side as its own. Fix: check `Map_IsValidPosition` on each ring tile (done in the sketch).
- Defect, idea kept: the concrete scan (structure.c 1387-1392) runs 4096 anchors with `i + offset` and no bound check. The donor's own comment at 1393 says "This can overflow". Fix: bounded scan (done).
- Defect, idea kept: the AI pick (2030-2033) takes a random 1-in-4 roll, but any later type with a strictly higher `priorityBuild` overwrites it, so priority can undo the randomness. Fix: roll first, then priority (done in the sketch). This changes the AI's build mix, so tune it on a test zone.
- Frankendom rulings: the validator runs on the server when a zone loads (zones as data; one runtime). Hub services are authored zone data, not player builds in the fight. The slab cost is a durability penalty, not a currency; it does not touch the one ledger.
- Not transferable as is: the hit-point penalty for missing slab is a build-quality idea for a city builder. It is only useful if Frankendom has built hubs that wear down. Keep it as a data field, default off.
- The minimap part (map.c 235-319) is a second idea: a fixed viewport border of 15 x 10 tiles, drawn and cleared by a border table, with pixel origin constants. The ModernUO note (cell 1) already covers the minimap projection, so this is a corroborating source, not a second design.
- Not read: `Map_CreateLandscape` (procedural terrain and spice, map.c 1441-1682); `Structure_ConnectWall` (walls, structure.c 1136); `Structure_FindFreePosition` (structure.c 1253); the full `GameLoop_Structure` frequency (structure.c 53).

Best transferable idea: A new hub building may only be placed where one of its neighbouring tiles (diagonals count) already belongs to your hub, and each footprint tile without a paid slab costs a share of the building's durability, so the layout grows outward one building at a time.

Decision (proposed): adapt — keep the growth rule, the slab-count return and the durability penalty as a server-side zone-data validator; fix the ring map-bounds check, the bounded slab scan and the roll-first AI pick; reject the donor's unbounded anchor scan as shipped.

Acceptance: A zone file that places a service with no neighbouring hub tile fails load with the named tile; a service on bare ground loads with its missing-slab count shown and its durability reduced by `(hpMax / 2) * missing / tileCount`; a server test asserts that an edge tile does not count a neighbour from the previous row.


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
- Verdict: MINOR
- structure.c:798/805 compare houseID to g_playerHouseID (player's house), not 'same owner'; growth rule is player-only.
- Ring tiles are 8 neighbours incl. diagonals, not edge-only.
- Missed: AI pick strips Carryall (High-Tech) and Harvester/MCV (Heavy Vehicle) before the loop (2006-2024); first buildable type is always the candidate even without the 1-in-4 roll.

Fixed 2026-10-12: growth rule now says player's house and player-only; ring described as 8 neighbours with diagonals (prose, table, sketch comment, best idea, acceptance); added the AI strip and first-candidate lines. Sketch code unchanged (comment only), no typecheck needed.
