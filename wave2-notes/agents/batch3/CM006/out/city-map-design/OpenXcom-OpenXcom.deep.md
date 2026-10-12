# OpenXcom-OpenXcom (city-map-design, cell 1)

Donor: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Battlescape/BattlescapeGenerator.cpp` (generator), with `src/Mod/MapScript.cpp`, `src/Mod/RuleTerrain.cpp` and data `bin/standard/xcom1/mapScripts.rul` | Licence: GPL-3.0-or-later (`LICENSE.txt` is GPL v3; source headers say "either version 3 of the License, or (at your option) any later version") | C++ (YAML data) | symbol `BattlescapeGenerator::generateMap`

Checked: Read in full: `generateMap` (2008-2344, command loop 2045-2262 read closely), `selectPosition` (2542-2609), `addCraft` (2609-2647), `addLine` (2648-2716), `addBlock` (2717-2768), `MapScript::init`/`getGroupNumber`/`getBlockNumber`/`getNextBlock` (267-386), `RuleTerrain::getRandomMapBlock` (131-151), the parser fields in `MapScript.cpp` (rects, freqs, maxUses, conditionals, executionChances; 90-261), and the `xcom1` URBAN and DEFAULT scripts. Not read: `loadMAP`, `loadRMP`, `loadNodes`, `attachNodeLinks`, `drillModules`, the whole of `removeBlocks` (only its group test at 2915 read), `MiniMapView.cpp`. Only the first callers of `generateMap` were checked (called from `nextStage` at 437 and `run` at 604). Confidence high on order of operations and on the defects listed; the URBAN odds in section 1 are my arithmetic from the code, not measured. Camera scope: not applicable.

## 1. Mechanism

- A mission map is a grid of 10x10-tile cells (`_mapsize_x / 10`). A map script is an ordered list of commands, one list per terrain type (`mapScripts.rul`). Command types: `addBlock`, `addLine`, `fillArea`, `addCraft`, `addUFO`, `digTunnel`, `checkBlock`, `remove`, `resize`. Each command can carry a label, a chance percent (default 100), executions (default 1), conditionals, rects (allowed areas as x, y, w, h in cells; empty means the whole map), and a pool of blocks or groups with frequencies and use caps.
- Order for each command in `generateMap` (2045 onward): (a) a duplicate label throws; `success` for the label starts false (2053). (b) Conditionals are checked: a positive n means "run only if label n succeeded", a negative n means "run only if it failed" (2057 onward). A command that is skipped counts as failed. (c) A percent roll gates the command (2085). (d) `init()` copies the frequencies and use caps into temporary arrays (`MapScript.cpp` 267-284), so the caps are per command run. (e) Each execution draws a block and a legal anchor, then places it.
- Legal anchor (`selectPosition`, 2542): every anchor where the whole footprint is empty and lies inside the rects is collected (the emptiness test is at 2578), then one is picked uniformly (2596).
- Weighted pick with caps (`MapScript.cpp` 291-322 for groups, 329-356 for blocks): draw `pick` in `[0, sum of freq - 1]` (299), walk the entries subtracting frequency (318). An entry with a cap is decremented when chosen (306), and removed from the temporary pool when its last use is spent (308-313).
- addBlock (2717): the anchor cell gets the block, the other footprint cells get the `_dummy` marker, `_blocksToDo` drops by one per cell, and the south and east edges get drill marks (2746-2752).
- addLine (2648): a vertical road picks a column by calling `selectPosition` with a 1x1 footprint inside the rect (2677). It then checks each cell along the column: an empty cell or a cell of the other road type is allowed, anything else fails. Empty cells become a road of this type; a perpendicular road becomes a crossing block (2701). `direction: both` runs vertical first and runs horizontal only if vertical succeeded (2652).
- fillArea (2179-2194): repeatedly draws the next block from its pool and places it at a legal anchor. It stops when the pool is spent, or when a drawn block has no legal anchor (the `else` branch breaks out).
- After the script, any cell still unfilled throws "Map failed to fully generate." (2262-2264).
- Timing: one-shot generation at mission build, not a per-frame loop.

The city script, `URBAN` in `bin/standard/xcom1/mapScripts.rul` (lines 39-67):
1. `addCraft` (landing zone).
2. `addLine` vertical, label 1, `executionChances: 50`, rect `[1, 1, 4, 1]` (a 4-cell strip for the column choice).
3. `addLine` horizontal, label 2, `conditionals: -1` (only if label 1 failed), 50 percent, rect `[1, 1, 1, 4]`.
4. `addLine` both, `conditionals: [-1, -2]` (only if labels 1 and 2 both failed), rect `[1, 1, 4, 4]`.
5. `addBlock` size 2, executions 4: four 2x2 blocks, placed one at a time, each at a fresh legal anchor (the script names no blocks or groups, so the donor falls back to the default group, `MT_DEFAULT` at `MapScript.cpp` 295; its numeric value was not read).
6. `fillArea` with blocks `[3, 4, 10, 11, 12, 13, 14]` and frequencies `[3, 3, 2, 2, 2, 2, 2]`: the remaining cells get weighted 1x1 blocks.

Derived from the code (not measured): a vertical road alone comes out about 50 percent of the time, a horizontal road alone about 25 percent, and a cross (both) about 25 percent. The skipped-counts-as-failed rule is what makes the 25 percent case work.

## 2. Key functions

- `generateMap`: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Battlescape/BattlescapeGenerator.cpp` 2008-2344. The command loop, conditionals, chance roll, executions, the incomplete-map throw.
- `selectPosition`: same file, 2542-2609. Legal-anchor collection and the uniform pick.
- `addLine`: same file, 2648-2716. Column pick, road or crossing per cell.
- `addBlock`: same file, 2717-2768. Footprint check, footprint marking, drill marks.
- `MapScript::getGroupNumber` and `getBlockNumber`, weighted pick with caps: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Mod/MapScript.cpp` 291-322 and 329-356.
- `RuleTerrain::getRandomMapBlock`: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Mod/RuleTerrain.cpp` 131-151. Uniform among blocks of the right size and group.
- Data: `/mnt/frankendom-donors/OpenXcom-OpenXcom/bin/standard/xcom1/mapScripts.rul` 39-67 (URBAN).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Ordered command list with label and conditional gating (skipped = failed) | Labels 1 and 2; conditionals `-1` and `[-1, -2]` (rul 50, 56) |
| Percent roll per command | Default chance 100 (`MapScript.cpp` 30); URBAN road lines 50 (rul 45, 51) |
| Executions per command | Default 1 (`MapScript.cpp` 30); hub executions 4 (rul 62) |
| Legal anchor = whole footprint empty, pick uniformly | Cell size 10 tiles (`_sizeX * 10` at 367; `10, 10` in the addLine call at 2677) |
| Weighted pick with per-entry use caps, entry removed when spent | Frequencies `[3, 3, 2, 2, 2, 2, 2]` (rul 67); caps default -1 unlimited (`MapScript.cpp` 215) |
| Rect = allowed area | Rects `[1, 1, 4, 1]`, `[1, 1, 1, 4]`, `[1, 1, 4, 4]` (rul 47, 54, 59) |
| Crossing where two roads meet | The crossing tile type, `MT_CROSSING` (2701) |
| Fill until full, stop when nothing fits | Pool contents (rul 66) |

## 4. TypeScript sketch

simplified: The sketch keeps the donor order: label check, conditionals, the percent roll, a per-run copy of the caps, then the executions. It keeps the weighted pick with caps, the uniform legal anchor, and road lines with crossings. It changes three things on purpose: (1) the overlap check tests every row of the footprint (the donor's loop at 2724 skips the last row); (2) a fill keeps going when one drawn block has no room, skipping only blocks that cannot fit, where the donor stops at the first block that does not fit; (3) a road line picks its column uniformly among usable columns (the donor first picks an empty cell, so columns with more empty cells are chosen more often). It omits: `both` lines (the sketch does not implement the both-axis command), `checkBlock`, `digTunnel`, `addCraft`, `addUFO`, `resize`, tile and map-data loading, the drill map, node links, the group test for crossing blocks (donor's crossing-group membership not read), and the "map failed to fully generate" throw. The percent roll is `rand(0, 99) < chance`; the donor's `RNG::percent` exact form was not read.

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Rand = (lo: number, hi: number) => number; // inclusive integers; seeded by the caller
type Rect = { x: number; y: number; w: number; h: number }; // grid cells; one cell = one zone block

interface PoolEntry { id: string; w: number; h: number; freq: number; maxUses: number } // maxUses < 0 = unlimited
interface Command {
  kind: "addBlock" | "addLine" | "fillArea";
  axis?: "vertical" | "horizontal"; // addLine only
  label: number;                    // 0 = unlabelled
  chance: number;                   // percent 0-100 that the command runs at all
  executions: number;               // attempts for addBlock
  conditionals: number[];           // +n: run only if label n succeeded; -n: only if it failed
  rects: Rect[];                    // empty = whole grid
  pool: PoolEntry[];                // empty for addLine
}
interface Grid { w: number; h: number; cells: (string | null)[][] } // null = empty; "dummy" = footprint cell

// Weighted pick. An entry with a use cap drops out of the pool once the cap is spent.
function pickEntry(pool: PoolEntry[], rand: Rand): PoolEntry | null {
  const live = pool.filter(p => p.maxUses !== 0);
  const total = live.reduce((s, p) => s + p.freq, 0);
  if (total <= 0) return null;
  let pick = rand(0, total - 1);
  for (const p of live) {
    if (pick < p.freq) {
      if (p.maxUses > 0) p.maxUses -= 1;
      return p;
    }
    pick -= p.freq;
  }
  return null;
}

// True when the whole w x h footprint at (x, y) is empty. Checks every row, including the last.
function fits(g: Grid, x: number, y: number, w: number, h: number): boolean {
  if (x < 0 || y < 0 || x + w > g.w || y + h > g.h) return false;
  for (let i = x; i < x + w; i++)
    for (let j = y; j < y + h; j++)
      if (g.cells[i][j] !== null) return false;
  return true;
}

// Every legal anchor for a w x h footprint inside the rects (whole grid when none given).
function anchors(g: Grid, rects: Rect[], w: number, h: number): [number, number][] {
  const areas: Rect[] = rects.length > 0 ? rects : [{ x: 0, y: 0, w: g.w, h: g.h }];
  const seen = new Set<string>();
  const out: [number, number][] = [];
  for (const r of areas)
    for (let x = r.x; x + w <= r.x + r.w; x++)
      for (let y = r.y; y + h <= r.y + r.h; y++) {
        const key = x + "," + y;
        if (seen.has(key) || !fits(g, x, y, w, h)) continue;
        seen.add(key);
        out.push([x, y]);
      }
  return out;
}

// Stamp one block. The anchor cell holds the block id; the other footprint cells are marked "dummy".
function place(g: Grid, x: number, y: number, id: string, w: number, h: number): boolean {
  if (!fits(g, x, y, w, h)) return false;
  for (let i = x; i < x + w; i++)
    for (let j = y; j < y + h; j++) g.cells[i][j] = i === x && j === y ? id : "dummy";
  return true;
}

// Place up to `executions` blocks, one at a time, each at a uniformly chosen legal anchor.
function runAddBlock(g: Grid, cmd: Command, rand: Rand, pool: PoolEntry[]): boolean {
  let ok = false;
  for (let e = 0; e < cmd.executions; e++) {
    const entry = pickEntry(pool, rand);
    if (!entry) continue;
    const spots = anchors(g, cmd.rects, entry.w, entry.h);
    if (spots.length === 0) continue;
    const [x, y] = spots[rand(0, spots.length - 1)];
    ok = place(g, x, y, entry.id, entry.w, entry.h) || ok;
  }
  return ok;
}

// Keep filling until the pool is spent or nothing left in it fits. Entries that cannot fit now are
// skipped, so one large pick does not stop the fill (donor stops at the first pick that does not fit).
function runFillArea(g: Grid, cmd: Command, rand: Rand, pool: PoolEntry[]): boolean {
  let ok = false;
  for (;;) {
    const usable = pool.filter(p => p.maxUses !== 0 && anchors(g, cmd.rects, p.w, p.h).length > 0);
    const entry = pickEntry(usable, rand);
    if (!entry) break;
    const spots = anchors(g, cmd.rects, entry.w, entry.h);
    const [x, y] = spots[rand(0, spots.length - 1)];
    ok = place(g, x, y, entry.id, entry.w, entry.h) || ok;
  }
  return ok;
}

// Draw one full-length road in a column (vertical) or row (horizontal) picked from the rects.
// A line may cross the other road type (the cell becomes "cross"); anything else blocks it.
function runLine(g: Grid, cmd: Command, rand: Rand): boolean {
  const vertical = cmd.axis === "vertical";
  const span = vertical ? g.h : g.w;
  const across = vertical ? g.w : g.h;
  const mine = vertical ? "road-ns" : "road-ew";
  const theirs = vertical ? "road-ew" : "road-ns";
  const at = (k: number, t: number): [number, number] => (vertical ? [k, t] : [t, k]);

  const lines: number[] = [];
  for (const r of cmd.rects) {
    const from = vertical ? r.x : r.y;
    const to = vertical ? r.x + r.w : r.y + r.h;
    for (let k = from; k < to && k < across; k++) if (!lines.includes(k)) lines.push(k);
  }
  const usable = lines.filter(k => {
    for (let t = 0; t < span; t++) {
      const [x, y] = at(k, t);
      const c = g.cells[x][y];
      if (c !== null && c !== theirs) return false;
    }
    return true;
  });
  if (usable.length === 0) return false;
  const k = usable[rand(0, usable.length - 1)]; // uniform over usable lines
  for (let t = 0; t < span; t++) {
    const [x, y] = at(k, t);
    g.cells[x][y] = g.cells[x][y] === null ? mine : "cross";
  }
  return true;
}

// Run a script in order. A command skipped by its chance roll or its conditionals counts as failed.
export function runScript(g: Grid, cmds: Command[], rand: Rand): Map<number, boolean> {
  const done = new Map<number, boolean>();
  for (const cmd of cmds) {
    if (cmd.label > 0 && done.has(cmd.label)) throw new Error("duplicate label " + cmd.label);
    if (cmd.label > 0) done.set(cmd.label, false);
    const gated = cmd.conditionals.every(c => {
      const n = Math.abs(c);
      if (!done.has(n)) throw new Error("conditional names a label not defined earlier: " + n);
      return c > 0 ? done.get(n) === true : done.get(n) === false;
    });
    let success = false;
    if (gated && rand(0, 99) < cmd.chance) {
      const pool = cmd.pool.map(p => ({ ...p })); // use caps are per command run
      success = cmd.kind === "addLine" ? runLine(g, cmd, rand)
        : cmd.kind === "addBlock" ? runAddBlock(g, cmd, rand, pool)
        : runFillArea(g, cmd, rand, pool);
    }
    if (cmd.label > 0) done.set(cmd.label, success);
  }
  return done;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (copied to /tmp), exit 0.

## 5. Lands in

- TARGET `origins/zones/city-layout.ts` (proposed new module; I did not open the Frankendom repo, so the path is a proposal). It is the zone-data step that places hubs, landmarks and roads on a zone grid; the spawn step is separate.
- Parity row 23 (zone population). The layout step only decides where hubs and landmarks go. Spawn caps, respawn and despawn stay in `origins/server/world-spawns.ts` under the same row.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: zones as data (the script is a data list per zone type, not code), one runtime; rules 7-9 n/a.

Best transferable idea: a zone layout is an ordered list of data commands (place a hub, draw a road, fill the rest) with labels, conditionals, chances and use caps, so a designer can change a town's shape without touching code.

Decision (proposed): adapt - take the command grammar as zone data; fix the donor's overlap check (2724), the fill stop (2183-2190) and the road column bias (2677); reject the tile, MCD and node loaders, which Frankendom does not use.
Acceptance: a server test with a fixed seed builds a 5x5 zone with exactly four 2x2 hubs and no overlapping footprints across 1000 seeds; road outcomes come out near 50 / 25 / 25 percent (vertical, horizontal, cross); the same seed gives the same layout on the server, and the client renders the server layout without re-rolling.

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism, not translated from the donor lines.
- Determinism: the donor uses `RNG::generate` and `RNG::percent`. Whether the seed is fixed per mission was not read. Frankendom needs the layout decided on the server from a zone seed, or shipped as data; a client must not re-roll it.
Donor defects, kept idea and fixed (each with its fix):
- Overlap check skips the last footprint row (`addBlock` 2724: `yd != ySize`); a multi-row block can overlap when `addBlock` is called without `selectPosition`, and a 1x1 block is never checked. fix: check every row, bounds-checked (sketch `fits`).
- `checkBlock` group test dereferences a cell with no null check (2206: `_blocks[x][y]->isInGroup`), a crash when the cell is empty (not run). fix: treat an empty cell as "not in group" before the test (checkBlock is not in the sketch).
- Road column pick is weighted by empty cells (2677 picks a random empty cell, then its column). fix: choose uniformly among usable columns (sketch `runLine`).
- A fill stops at the first drawn block that does not fit anywhere (2183-2190). fix: drop that entry for this command and keep filling (sketch `runFillArea`).
- Hub services: the donor places blocks with no notion of a service type. "One of each service per hub" is expressed here as a pool entry with `maxUses: 1`; the rule that a hub needs a specific set of services is not in the donor.
- Roads are cosmetic in the donor. A duel arena needs a walkable route; the donor's AI route nodes (`loadNodes`, `attachNodeLinks`) were not read, so walkability and patrol links are unknown.
- The Pit is a fixed arena (client only). This grammar is for open zones and does not apply to the Pit.
- Not read: `loadMAP`, `loadRMP`, `drillModules`, `removeBlocks` (except 2915), `MiniMapView.cpp`. The minimap part of the topic is not covered by this note.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
CLEAN
- Missed (informational, not an error): addLine (2648-2716) retries up to 20 times and ignores selectPosition's return value, so roadX/roadY can be stale when no cell is free; 'both' returns true even if the horizontal half fails.
