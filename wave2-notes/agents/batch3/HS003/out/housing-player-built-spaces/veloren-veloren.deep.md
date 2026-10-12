# veloren-veloren (housing-player-built-spaces, cell 2)

Donor: `/mnt/frankendom-donors/veloren-veloren/world/src/site/tile.rs` | Licence: GPL-3.0 (LICENSE file, "Version 3, 29 June 2007"; no per-file SPDX read) | Rust | symbol `Tiles::grow_aabr`

Checked: Symbol `grow_aabr` is at `world/src/site/tile.rs` 76-143 (read in full). Read also: `tile.rs` 1-8 (imports), 60-74 (`find_near`), `world/src/site/mod.rs` 455-541 (`find_aabr`, `find_roadside_aabr`, `find_rural_aabr`), and six call sites: `mod.rs` 1185-1187 (myrmidon house), 1368 (guard tower), 1550-1554 (airship dock), 2529-2531 (farm field). Not read: the other roughly 20 call sites of the two finders, `common::spiral::Spiral2d` (the spiral order, not read), the `Plot`/`PlotKind` build code. Confidence: high on the grow rule and the area guard; the spiral order is "(not read)". camera_scope: not a camera cell.

Important scope note: Veloren has NO player housing. `common/src/terrain/map.rs` 96-98 mentions "player housing" only as a map-scale argument. Every "plot" in this donor is a procedurally generated NPC site plot (towns, camps, farms). What transfers is the placement and size-limit mechanism, not any owner, upkeep or storage rule.

## 1. Mechanism

- Placement starts from a search point, not from a free choice. `find_roadside_aabr` (`mod.rs` 485-516) picks a random plaza or road path node, offsets it by a random direction rounded per axis, and calls `find_aabr`. `find_rural_aabr` (518-541) starts at a random plaza and offsets by `dir x min_dims x 0.75 + 10` tiles (`mod.rs` 535-536).
- `find_aabr` (`mod.rs` 455-483) searches outward with `find_near` (`tile.rs` 63-74: a spiral over the first `((70/6)*2+1)^2` offsets, that is 23 x 23 cells, radius 11 tiles). At each candidate it needs a cardinal neighbour that is a road (`mod.rs` 465). That neighbour is the door; the candidate tile itself becomes the seed for growth. Growth failure skips the candidate and the spiral continues.
- `grow_aabr` (`tile.rs` 76-143) grows a rectangle from the seed. It starts as a 1x1 box (82-85). Seed must be empty (87-89). Then it loops over side indices `i = 0, 1, 2, ...`:
  - stop if four sides in a row were refused (`i - last_growth >= 4`, 93);
  - stop if the predicted area after this side would exceed the range end (94-101): predicted = current area + (height if `i` is even, else width);
  - otherwise the side used is `(i + |centre.sum()|) % 4` (105): 0 = east, 1 = south, 2 = west, 3 = north, each only if the new edge tiles are all empty (106-128). A successful side resets `last_growth = i`.
- Acceptance (135-141): area >= range start, width >= min_dims.w, height >= min_dims.h. Otherwise the box is returned as `Err`.
- Because growth only enters empty tiles and the road neighbour is not empty, the road tile never falls inside the grown box. The seed therefore sits on the box wall, facing the door direction. This is the invariant that makes "door faces the road" true by construction.
- Size limits are per call site. Myrmidon house: size = `round(9 + rand^5 x 1.5)` (`mod.rs` 1185), area in `9..(size+1)^2`, min dims `size` square, 32 attempts (1186-1187). Guard tower: range `4..4` (start 4, end 4), min 2x2, 10 attempts (1368). Airship dock: range `81..82` (the comment says it is meant to be exactly 81), min 9x9 (1554). Farm field: size = `round(3 + rand^5 x 6)` (2529), area `6..(size+1)^2`, min `size` square, 32 attempts (2531).
- Tick: none. Placement runs once at world generation.

## 2. Key functions

- `Tiles::grow_aabr`: `/mnt/frankendom-donors/veloren-veloren/world/src/site/tile.rs` 76-143. The growth rule, area cap and side minimums.
- `Tiles::find_near`: `/mnt/frankendom-donors/veloren-veloren/world/src/site/tile.rs` 63-74. Spiral search with a fixed cell budget.
- `Site::find_aabr`: `/mnt/frankendom-donors/veloren-veloren/world/src/site/mod.rs` 455-483. Door-next-to-road rule, then grow per candidate.
- `Site::find_roadside_aabr` / `find_rural_aabr`: `/mnt/frankendom-donors/veloren-veloren/world/src/site/mod.rs` 485-516 and 518-541. The two search-point choices.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Rectangle grows from a seed into empty tiles, one side at a time, rotating sides, stops after 4 refused sides | Refusals = 4 (`tile.rs` 93) |
| Area cap checked before each growth | Cap = range end (`tile.rs` 100), used as an inclusive bound (defect 2) |
| Accept if area >= min and each side >= min | Per call site: 9..(size+1)^2 (`mod.rs` 1187), 81..82 (1554), 6..(size+1)^2 (2531) |
| Door = road neighbour, seed on the wall | Cardinal neighbour is_road (`mod.rs` 465) |
| Spiral search budget | MAX_SEARCH_RADIUS_BLOCKS 70 (`tile.rs` 68), TILE_SIZE 6 (`tile.rs` 6), so radius 11 tiles |
| Rural offset from plaza | 0.75 x min dims + 10 tiles (`mod.rs` 536) |
| Search-point choice | Coin flip plaza vs road (`mod.rs` 494) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order: seed empty check, side rotation from |x+y|, the stop after four refused sides, the area cap before each growth, and the final area and side test. It fixes two defects (listed in section 6): the edge length comes from the side that grows, and the cap is exclusive. It omits the donor's extra corner tile in each side check (the donor also tests one tile past the edge, which is conservative), and it scans a square in row order in `findLot` instead of the donor's Spiral2d order, so the first hit can differ. It omits the plaza and road search-point choice, the hard altitude lookup, the caller retry counts, and the rural offset.

```ts
// Licence: GPL-3.0 (donor, LICENSE). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Cell { x: number; y: number; }
type Test = (c: Cell) => boolean;
// Max corner exclusive, like the donor Aabr: size = max - min.
interface Rect { minX: number; minY: number; maxX: number; maxY: number; }
interface MinSide { w: number; h: number; }

const w = (r: Rect): number => r.maxX - r.minX;
const h = (r: Rect): number => r.maxY - r.minY;

// Sides 0 and 2 add a column of height h; sides 1 and 3 add a row of width w.
function newEdgeFree(r: Rect, side: number, isEmpty: Test): boolean {
  const edge: Cell[] = [];
  if (side === 0) for (let y = r.minY; y < r.maxY; y++) edge.push({ x: r.maxX, y });
  else if (side === 1) for (let x = r.minX; x < r.maxX; x++) edge.push({ x, y: r.maxY });
  else if (side === 2) for (let y = r.minY; y < r.maxY; y++) edge.push({ x: r.minX - 1, y });
  else for (let x = r.minX; x < r.maxX; x++) edge.push({ x, y: r.minY - 1 });
  return edge.every(isEmpty);
}

function grow(r: Rect, side: number): Rect {
  switch (side) {
    case 0: return { ...r, maxX: r.maxX + 1 };
    case 1: return { ...r, maxY: r.maxY + 1 };
    case 2: return { ...r, minX: r.minX - 1 };
    default: return { ...r, minY: r.minY - 1 };
  }
}

// Grow one rectangle from a seed tile into empty tiles only.
// Returns null when the seed is not empty or the result misses the area or side minimums.
export function growRect(seed: Cell, isEmpty: Test, minArea: number, maxArea: number, minSide: MinSide): Rect | null {
  if (!isEmpty(seed)) return null;
  let rect: Rect = { minX: seed.x, minY: seed.y, maxX: seed.x + 1, maxY: seed.y + 1 };
  const offset = Math.abs(seed.x + seed.y); // donor: |centre.sum()| starts the side rotation
  let lastGrowth = 0;
  for (let i = 0; i - lastGrowth < 4; i++) { // stop after four refused sides in a row
    const side = (i + offset) % 4;
    // Fixed: the edge length comes from the side that will actually grow (the donor used the parity of i).
    const edge = side % 2 === 0 ? h(rect) : w(rect);
    if (w(rect) * h(rect) + edge >= maxArea) break; // maxArea is exclusive
    if (newEdgeFree(rect, side, isEmpty)) {
      rect = grow(rect, side);
      lastGrowth = i;
    }
  }
  const area = w(rect) * h(rect);
  return area >= minArea && w(rect) >= minSide.w && h(rect) >= minSide.h ? rect : null;
}

// Search a square around a point for a seed that touches a road; the road side is the door.
export function findLot(
  near: Cell, radius: number, isRoad: Test, isEmpty: Test,
  minArea: number, maxArea: number, minSide: MinSide,
): { rect: Rect; door: Cell; doorDir: number } | null {
  const dirs: Cell[] = [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }];
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const seed: Cell = { x: near.x + dx, y: near.y + dy };
      const doorDir = dirs.findIndex(d => isRoad({ x: seed.x + d.x, y: seed.y + d.y }));
      if (doorDir < 0) continue;
      const rect = growRect(seed, isEmpty, minArea, maxArea, minSide);
      if (rect) return { rect, door: seed, doorDir };
    }
  }
  return null;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/hs003-veloren-lot-grow.ts`, copy of `work/veloren-lot-grow.ts`). The local tsc is not installed on the Mac, so the Mac hook could not check it.

## 5. Lands in

- TARGET `origins/server/plot-placement.ts` (proposed path, not checked against the Frankendom repo): a server function that grows a player lot from a chosen seed beside a road or plaza; the client proposes the seed, the server runs the grow and refuses with a reason.
- Parity-checklist row: 23 (zone population, per the task hint). The addendum has no housing row; the lead should confirm this is the right row.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room, shape only)
- Brief rule served: zones as data (the area and side minimums are zone data, not constants); server-verified placement. Rules 7-9 n/a.

## 6. Gaps and risks

- No player housing in this donor (`common/src/terrain/map.rs` 96-98). No owner, rent, upkeep, eviction, storage, vendors, guild halls, permissions or instancing. Those have to come from elsewhere.
- Defect 1 (edge length from the wrong side): `tile.rs` 95 picks height or width from `i % 2`, but the side is `(i + |sum|) % 4` (105). When `|centre.sum()|` is odd, the parity is swapped: a non-square lot can overshoot the area cap by up to |w - h|. fix: pick the edge from the side that grows, as the sketch does (side 0 or 2 adds height).
- Defect 2 (cap treated as inclusive): `area_range` is a Rust range, exclusive at the end, but the guard breaks only when the predicted area is greater than `end` (`tile.rs` 100). Area equal to `end` is therefore accepted, which the range says it must not be. Example: `6..(size+1)^2` (`mod.rs` 2531) allows area 16 for size 3. fix: break when the predicted area is >= end, as the sketch does.
- Defect 3 (naming): `MAX_SEARCH_RADIUS_BLOCKS` is in blocks, and the cell count divides by `TILE_SIZE` as an integer (`tile.rs` 68-69), so the search reaches about 11 tiles (about 66 blocks), not 70 (the spiral's shape is "(not read)"). This is consistent, but the name hides it. fix: name the constant in tiles.
- The growth stops at the first 4 refused sides, not at the best shape; a lot can end narrow when a neighbour blocks one side early. Frankendom should accept this (it is simple and predictable) and set min sides so that a narrow lot is refused, not accepted.
- The search is first-hit, not best-fit. For player lots, a phone player will expect the lot they pointed at, so the seed must be the player's point, not the donor's spiral.
- The donor places lots at world generation with 32 retries. Player placement is one request, so the server must return a reason on the first refusal, not retry silently.
- Cost: `find_near` runs `grow_aabr` on up to 529 seeds, each growth loop bounded by the area cap. Fine at generation time; a live server should cap the seed count per request.
- Not read: `Spiral2d`, the rtsim architect rule (`rtsim/src/rule/architect.rs`), and most of the 20 other call sites.

Best transferable idea: place a lot by growing a rectangle from a seed tile into empty space, with the door on the road, and reject it with a reason when it misses the area or side minimums.

Decision (proposed): adapt - take the grow-from-seed rule and the area and side minimums, with defects 1 and 2 fixed and the seed chosen by the player, not searched. Not a copy of the NPC town placement.
Acceptance: the server places a 9x9 lot next to a road with its door on the road; a 5x3 lot at a seed with odd |x+y| never exceeds the area cap; a seed that cannot reach the minimum side is refused with a reason the phone shows.


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
Errors: All checked claims hold: grow_aabr at tile.rs 76-143, i-last_growth>=4 stop, area guard uses i%2 vs side (i+|sum|)%4 (defect 1 real), guard is '> area_range.end' (defect 2 real, 16 allowed for size 3), acceptance test at end, find_near 70/6*2+1 squared = 529 cells, find_aabr needs CARDINALS road neighbour, myrmidon/guard tower/airship/farm parameters and attempt counts all match mod.rs lines, rural offset dir*min_dims*0.75+10, map.rs line 96 is the only 'player housing' hit in the tree (no-housing claim true), GPL-3 licence. Tiny omission: plaza search point is root_tile + dir.round*(plot size+1), note says only 'offsets by random direction'.
Missed: Tiles::grow_organic (tile.rs 145+) is a second growth rule (random-walk blob, area_range.end cap) next to grow_aabr; not mentioned.
