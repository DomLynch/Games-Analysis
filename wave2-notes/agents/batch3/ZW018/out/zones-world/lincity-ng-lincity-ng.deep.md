# lincity-ng-lincity-ng (zones-world, cell 2)

Donor: `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity/init_game.cpp` (function `new_setup_river`, 629-719) | Licence: GPL-2.0-or-later (`src/lincity/world.cpp` header, lines 11-14: "either version 2 of the License, or (at your option) any later version"; `COPYING.txt` is GPL version 2) | C++ | symbol `new_setup_river`

Checked: `new_setup_river` read in full (init_game.cpp 629-719), with `set_river_tile` (721-727), its one caller at 605, the sea and border steps after it (608-626), and the caller of `new_setup_river_ground` at 268. Candidates opened: `src/lincity/world.cpp` (border and edge helpers 298-317, read; the hint file is the tile container, not zones), `src/lincity/engine.cpp` (`do_pollution` border rule 68-80, read in part), `src/lincity/init_game.cpp` (above). Grep for spawn, entry point or arrival in `src/lincity` returned no hits, and no streaming, transition or zone-population code exists in this donor. Not read: `new_setup_river_ground` (308-595, the aridity and altitude inputs), the `setup_land` switch in full, the caller of `do_pollution`, and the seed call at init_game.cpp 395 (context not read). Confidence: high on the river walk and the lake backtrack; low that this is the mechanism the zones-world topic meant (the donor is a city builder and has no zones, spawns or transitions in the sense the topic uses). Topic fit is loose, and I say so here rather than downgrading the mechanism.

Best transferable idea: Generate a water or boundary feature by a priority-flood walk from a random start to the map edge, sometimes taking the runner-up tile with a weighted chance, then fill the basins it passes through as lakes.

Decision (proposed): reject - Frankendom's zones are authored data on one runtime with server-verified positions; a random carver at runtime would be a second source of truth unless its seed and output were frozen into zone data, and no fight, zone or spawn ruling needs procedural rivers. At most it fits as an offline map-authoring helper, which is not a combat or zone mechanic.

Acceptance: Not a play feature. If it were built as an offline authoring helper, a test would run the carver twice with one seed and get the same river tiles, and assert that every river ends on a border tile or on an existing river.

## 1. Mechanism

- Count: `r = 5 + binomial(10, 0.5)` (init_game.cpp 630), so r is 5 to 15; the number of river walks is `c = (100 - global_aridity/4) * r * len * len / 1000000` (631), integer arithmetic. The aridity input comes from the caller (268, 605), not read further.
- Each walk starts at a uniformly random tile (637-640). The frontier is a priority queue ordered so the LOWEST altitude is on top (644-648). The start tile is pushed twice so that a runner-up exists (650). `level` starts at the start tile's altitude minus one (651).
- Each step: pop the lowest unvisited frontier tile as `next` (659-662); the runner-up is the next lowest unvisited tile (664-668). `d1 = level - next.alt` and `d2 = level - runnerUp.alt` (671-672).
- Weighted tie-break: if `d2 >= 0`, the walk takes the runner-up with probability `!d1 ? .5 : d2/(d1+d2)` (673-674; the swap is 676-678). Because the heap puts the lowest tile first, `d2 <= d1` always, so this probability is at most 0.5 (my reasoning from the heap order, not a donor comment).
- Stop: when `next` is on the map border or is already river or lake (684-690). The border test is `x == 0 || y == 0 || x == len-1 || y == len-1` (world.cpp 303-306).
- Carve: `set_river_tile` sets type 0, group `GROUP_WATER`, flags `FLAG_IS_RIVER` and `FLAG_HAS_UNDERGROUND_WATER`, and `water_alt` = altitude (694; 721-727). Then `level = t.altitude` (697), and the unvisited neighbours north, south, east and west go on the frontier (700-702).
- Lake backtrack: after the walk, the river tiles are visited from the outlet back to the start (707). A tile at or below the level reached so far is raised to that level and flagged `FLAG_IS_LAKE` (709-711); otherwise the level is updated to the tile's altitude (713-714).
- After all walks: sea level is capped at `alt_max/3` (608-609); visible tiles below sea level become sea and river (611-615); invisible border tiles next to river become river (618-626). This is the caller's job, after line 605.
- Border pollution, a second boundary rule in the same donor: in `do_pollution`, a polluted tile on the map border has its pollution divided by 64 (engine.cpp 77-79, comment at 70). The caller of `do_pollution` was not read, so I do not know how often this runs.

## 2. Key functions

- `new_setup_river`: `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity/init_game.cpp` 629-719 (count, random starts, the walk, the lake backtrack).
- `set_river_tile`: `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity/init_game.cpp` 721-727 (what a river tile is).
- Border test: `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity/world.cpp` 303-306 (`Map::is_border`).
- Border pollution sink: `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity/engine.cpp` 68-80 (`World::do_pollution`, partial read).
- Caller: `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity/init_game.cpp` 605 (the only call of `new_setup_river` found by grep in `src`).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Lowest-first priority walk from a random start to the edge | Start tile uniform over the map (theirs, init_game.cpp 637-640) |
| Runner-up tie-break with a weight from descent | Chance `d2/(d1+d2)`, 0.5 when d1 is 0 (theirs, init_game.cpp 673-674); at most 0.5 by heap order (my reasoning) |
| Count of walks from a random base scaled by area and a map input | `r` = 5 + binomial(10, 0.5), so 5 to 15 (theirs, init_game.cpp 630); `c` formula at 631 |
| Stop at an edge or an existing water tile | Map edge = outer ring (theirs, world.cpp 303-306) |
| Lake level raised while walking back upstream | No constant: the rule is "at or below the level reached so far" (theirs, init_game.cpp 709-714) |
| Sea level cap relative to peak altitude | `alt_max/3` (theirs, init_game.cpp 608-609) |
| Edge sink for a field | Divide by 64 at the border (theirs, engine.cpp 78) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order (lowest unvisited next, runner-up from the frontier, the weighted swap, the border and water stop before the tile is marked, carve, level update, neighbours, then the lake backtrack). It differs in three ways: the frontier is a plain array scanned for its minimum rather than a heap, so visited entries stay in the array instead of being popped; an empty frontier ends the walk instead of the donor's undefined behaviour; and the river-tile fields (water_alt, flags, group), the sea flood, the border water fix, and the pollution rule are omitted. `riverCount` takes the binomial draw as an argument.

```ts
// Licence: GPL-2.0-or-later (donor world.cpp header). Clean-room sketch written from the described mechanism; not a translation.
interface Cell { alt: number; river: boolean; lake: boolean }
interface Grid { len: number; cells: Cell[] } // flat, index = y * len + x

function neighbours(g: Grid, i: number): number[] {
  const x = i % g.len;
  const y = Math.floor(i / g.len);
  const out: number[] = [];
  if (y > 0) out.push(i - g.len);
  if (y < g.len - 1) out.push(i + g.len);
  if (x < g.len - 1) out.push(i + 1);
  if (x > 0) out.push(i - 1);
  return out;
}

function onBorder(g: Grid, i: number): boolean {
  const x = i % g.len;
  const y = Math.floor(i / g.len);
  return x === 0 || y === 0 || x === g.len - 1 || y === g.len - 1;
}

// Lowest-altitude unvisited frontier entry, by index into the frontier array.
function lowestIndex(frontier: number[], g: Grid, visited: Set<number>): number {
  let best = -1;
  for (let k = 0; k < frontier.length; k++) {
    if (visited.has(frontier[k])) continue;
    if (best < 0 || g.cells[frontier[k]].alt < g.cells[frontier[best]].alt) best = k;
  }
  return best;
}

// Number of river walks for one map: r = 5 + binomial(10, 0.5) is drawn by the caller and passed in.
export function riverCount(globalAridity: number, r: number, len: number): number {
  return Math.floor(((100 - Math.floor(globalAridity / 4)) * r * len * len) / 1000000);
}

// One river: start at a tile, always take the lowest unvisited frontier tile, sometimes the runner-up
// (chance d2 / (d1 + d2), at most 0.5), stop on the map border or on water. Then raise the tiles
// below the outlet's level into lakes while walking back upstream.
export function carveRiver(g: Grid, start: number, rand: () => number): number[] {
  const visited = new Set<number>();
  const frontier: number[] = [start, start]; // pushed twice so a runner-up exists
  const path: number[] = [];
  let level = g.cells[start].alt - 1;

  for (;;) {
    const ni = lowestIndex(frontier, g, visited);
    if (ni < 0) break; // no unvisited frontier left (the donor has no guard for this)
    let next = frontier.splice(ni, 1)[0];
    const ri = lowestIndex(frontier, g, visited);
    const runnerUp = ri < 0 ? -1 : frontier[ri];
    const d1 = level - g.cells[next].alt;
    const d2 = runnerUp < 0 ? -1 : level - g.cells[runnerUp].alt;
    if (runnerUp >= 0 && d2 >= 0 && rand() < (d1 === 0 ? 0.5 : d2 / (d1 + d2))) {
      frontier.splice(ri, 1);
      frontier.push(next);
      next = runnerUp;
    }
    if (onBorder(g, next) || g.cells[next].river) break;
    visited.add(next);
    g.cells[next].river = true;
    path.push(next);
    level = g.cells[next].alt;
    for (const q of neighbours(g, next)) if (!visited.has(q)) frontier.push(q);
  }

  // Backtrack from the outlet: a tile at or below the level reached so far is raised to it and marked lake.
  let lakeLevel = Number.NEGATIVE_INFINITY;
  for (let k = path.length - 1; k >= 0; k--) {
    const c = g.cells[path[k]];
    if (c.alt <= lakeLevel) {
      c.alt = lakeLevel;
      c.lake = true;
    } else {
      lakeLevel = c.alt;
    }
  }
  return path;
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file with `export {};` appended: passed.

## 5. Lands in

- No runtime target. Frankendom zones are authored data, so a river carver has nowhere to run in play. If built at all: an offline authoring helper, `origins/tools/river-carver.ts` (proposed name, not checked against the Frankendom repo, which was not read).
- Parity row: none of rows 1-23 fits. Row 23 (zone population) is the nearest zone row, and it is a stretch: this mechanism carves terrain, it does not place or respawn anything.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later: clean-room, shape only).
- Brief rule served: none of the addendum rulings is served at runtime; the offline option only touches "zones as data".

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch follows the described walk and is not a line-by-line translation.
- Randomness: the donor draws from a shared RNG (`BasicUrbg`), and a seed call exists at init_game.cpp 395 (context not read). Frankendom would need a fixed seed stored in zone data for any reproducibility.
- Empty frontier: the donor calls `edge.top()` after popping, which is undefined on an empty heap (init_game.cpp 660-668). The walk ends at the first border or water tile, so it probably cannot run dry, but I did not prove it.
- Runner-up chance at most 0.5 is from heap order (my reasoning), not a donor comment.
- Lake backtrack changes the terrain height of tiles (init_game.cpp 710). In Frankendom that would change authored zone geometry, which is outside the zone data rules.
- Not a zone population, spawn, streaming or transition mechanism. The topic match is loose and the decision is reject; the note is STRONG because the mechanism is real, read end to end, and self-contained, not because it fits our rulings.
- Border pollution divide-by-64 (engine.cpp 78): the caller of `do_pollution` was not read, so its rate is unknown.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later, clean-room)
Brief rule served: none at runtime; offline authoring only touches zones as data

## Checker findings

- Verdict: CLEAN
- Corrected: nothing to correct
- Missed: none significant
