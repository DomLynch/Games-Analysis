# OpenRA-OpenRA (city-map-design, cell 1)

Donor: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/MapGenerator/Terraformer.cs` (shared placement code; the list hint `OpenRA.Mods.D2k/Traits/World/D2kMapGenerator.cs` is a Dune terrain generator and only calls the shared spawn chooser at 453) | Licence: GPL-3.0-or-later (Terraformer.cs header line 6: "either version 3 of the License, or (at your option) any later version"; COPYING is GPL v3) | C# | symbols `AddActorCluster`, `AddDistributedActors`, `DecorationPattern`, `BooleanBlur`

Checked: Read end to end: `AddActorCluster` (Terraformer.cs 921-963), `AddDistributedActors` (848-895), `DezoneActor` (274-293), `ChooseInZoneable` (726-742), `DecorationPattern` (2256-2330), `BooleanBlur` (MatrixUtils.cs 767-830; the sliding-window sums skimmed, the threshold and output rules read in full). Callers checked: `AddActorCluster` from ClassicMapGenerator.cs 797 and TSMapGenerator.cs 728 (D2k does not call it); `AddDistributedActors` from Classic 780, TS 711 and `AddActorCluster` 960; `DecorationPattern` from Classic 881 and TS 833. Not read: `ChebyshevRoom` body, `CellLayerUtils.OverCircle` body, `PaintActors`, the rest of the TS generator. Camera: not a camera cell. Confidence: high on the order of placement and on the pruning numbers; the cost of the O(N^2) brute-force sketch is not measured.

Best transferable idea: place hub services one at a time around a chosen centre, outermost cells first, each pick zeroing its own span so the next lands elsewhere, and prune any seed that has too few seed neighbours so no service stands alone.
Decision (proposed): adapt - the shape is right for zone authoring (hub services placed in a ring with reservations, no lonely landmark), but it must run once at authoring time and write zone data; the server tick never re-runs placement, and the donor's two defects are fixed in the sketch.
Acceptance: a server test (seeded) asserts that every generated hub has its services at least `inner` cells from the centre, that no service lies within the span radius of an earlier service, that every seed kept by the pruning has at least 5 of the 49 cells in its 7x7 box occupied, and that the same seed writes the same zone file twice.

## 1. Mechanism

Two placement paths in the same file. Both run at map generation time, once, on a grid of cells. Neither runs per frame.

**A. Hub cluster (`AddActorCluster`, expansions) (Terraformer.cs 921-963).**
1. Centre: `ChooseInZoneable(random, zoneable, maximumRadius + outerBorder)` (936-937) returns the free cell with the most room. Room is the Chebyshev distance to the nearest blocked cell (734), capped at the argument. Equal best cells are chosen at random (`FindRandomBest`, CellLayerUtils.cs, "If there are equally good best candidates, choose one at random").
2. Radius: `radius2 = room - outerBorder - 1` (938). Below `minimumRadius` the cluster is refused (939-940). Capped at `maximumRadius`. `radius1 = min(innerReservation, radius2)` (945). If radius1 < 1 the cluster is refused.
3. Weights: every cell inside radius2 and outside radius1 gets weight = squared distance from the centre in cells (951, 958). The inner disc gets 0. So the outside of the ring is preferred.
4. Placement (`AddDistributedActors`, 848-895): the cluster copies the zoneable grid (clusterZoneable). Loop for each target count:
   - Draw an actor type by weight (864). Its required space is `MaxSpan * 1024 / 1448 + 2` (866).
   - Cells whose room on clusterZoneable is below that get weight 0 (868-871).
   - Pick the best cell: `FindRandomBest` when `weighted` is false, `PickWeighted` when true (875-877).
   - If the best weight is 0, stop and return what was placed (879-880).
   - Zero the weight inside the actor's span disc (883-888).
   - Place the actor. Dezone its footprint and its reserve disc on the map zoneable (890). Dezone its footprint only on clusterZoneable (891).
   So each new actor goes to the outermost free cell that still fits its span, and the spacing inside the cluster comes from the span disc, not from the reserve.
5. Caller budget (Classic 794-809): per cluster the count is `min(remaining, random 1..MaximumResourceSpawnsPerExpansion)` (801). `remaining` is reduced by what was added (808). The loop stops when a cluster adds nothing (809). The per-map total is `MaximumExpansionResourceSpawns * perSymmetryEntityMultiplier / EntityBonusMax`, where the multiplier is zoneable area times `AreaEntityBonus` plus players times `PlayerCountEntityBonus` (751-753). `EntityBonusMax` is 1,000,000 in the D2k generator (D2kMapGenerator.cs 29); the Classic constant was not read.
6. Classic spawn resources (780-786) use `AddDistributedActors` with `weighted = false`, so the best cell is taken. Expansions (797-806) pass `weighted = true`, so the cell is drawn by weight.

**B. Village grammar (`DecorationPattern`, 2256-2330; used for civilian buildings).**
1. Reserved: cells next to unplayable space are excluded (2270-2274; read, not fully traced).
2. Noise: a white-noise field at `featureSize` (2276-2283) and a pink-noise density field (2285-2291). The density field keeps the top `density` share of cells (2293-2294). A cell is decorable if it is zoneable, playable, not reserved and inside the density mask (2300-2302). Non-decorable cells get noise -1024*1024 (2306).
3. Seeds: the top `totalDecorable * coverage / FractionMax` cells by noise are kept (2310-2313). With the TS value 125 that is about 12.5% of decorable cells.
4. Pruning (2315-2328, up to 8 passes; break when a pass changes nothing, 2321). Each pass blurs the seed set over a (2r+1)^2 box, with r = `CivilianBuildingDensityRadius` (3) and threshold (1000 - MinimumCivilianBuildingDensity) / 1000 = 910/1000 (2317-2320). In BooleanBlur, `trueThreshold = ceil(area * 910 / 1000)` and `falseThreshold = area - trueThreshold` (778-779). For r = 3, area = 49, so trueThreshold = 45 and falseThreshold = 4. A cell with count <= 4 becomes false, a cell with count >= 45 becomes true, and otherwise keeps its input (807-812). The result is ANDed into the seed set (2328). So a seed survives only if at least 5 of the 49 cells in its 7x7 box are seeds, and removal cascades over passes.

Tick: none. Both paths are one-shot generator code.

## 2. Key functions

- `AddActorCluster`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/MapGenerator/Terraformer.cs` 921-963. Centre by room, ring radii, outward weights, then calls `AddDistributedActors`.
- `AddDistributedActors`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/MapGenerator/Terraformer.cs` 848-895. One-at-a-time placement with span zeroing and two-grid dezoning. Defect at 864-880 (see section 6).
- `ChooseInZoneable`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/MapGenerator/Terraformer.cs` 726-742. Room layer capped by the argument.
- `DecorationPattern`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/MapGenerator/Terraformer.cs` 2256-2330. Seed selection and the lonely-cell pruning loop.
- `BooleanBlur` (hysteresis rule): `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/MapGenerator/MatrixUtils.cs` 767-830. Threshold, false/true/keep output, change count (defect at 814).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Hub centre = most room, capped at outer radius + border | Cap = maximumRadius + border (936-937) |
| Ring: inner reserve radius, outer radius, border | ExpansionInner 2, MinimumExpansionSize 2, MaximumExpansionSize 12, ExpansionBorder 1 (TS yaml 54-57, inside `Choice@hidden_defaults` at line 8) |
| Weight = squared distance, inner disc 0 | None (951, 958) |
| Place one item at a time, zero its span disc | Span is the actor's MaxSpan; reserve is ResourceSpawnReservation 8 (TS yaml 45) and SpawnReservation 16 (TS yaml 50), both cells |
| Stop when nothing fits | None (879-880) |
| Pass-based village pruning with hysteresis | Radius 3, minimum density 90 (so 910/1000), 8 passes (TS yaml 60-61; 2315; 2321) |
| Seed share of decorable cells | CivilianBuildings 125 per 1000 (TS yaml 58) |
| Density mask share of map | CivilianBuildingDensity 500 per 1000 (TS yaml 59) |
| Per-map entity budget scales with area and players | AreaEntityBonus and PlayerCountEntityBonus (752-753) |
| Fixed-point scale | FractionMax = 1000 (Terraformer.cs 31) |

## 4. TypeScript sketch

simplified: the sketch follows the donor order (centre, ring, outward weights, one-at-a-time placement with span zeroing and two-grid dezoning, then the pruning passes). It differs in four ways. (a) It uses brute-force Chebyshev room instead of the donor's distance transform, which is O(N^2) and not meant for real maps. (b) It draws the item type among the types that still have a legal cell (this is the defect fix; the donor draws first and can stop early). (c) It counts only seed removals as changes in the pruning pass (the donor also counts non-seed flips). (d) It omits symmetry projections, the walking-distance and noise fields, the per-map entity budget, and the reserved-cell step of DecorationPattern. The spacing margin `span + 2` is a stand-in for the donor's conversion from MaxSpan.

```ts
// Clean-room sketch. Donor: OpenRA (GPL-3.0-or-later). Written from the described mechanism, not a translation.
type Grid = boolean[][]; // true = still free for placement
type Rng = () => number;
type Pt = { x: number; y: number };
interface ItemType { name: string; span: number; reserve: number; weight: number } // radii in cells

// Chebyshev distance from (x, y) to the nearest blocked cell; the map edge counts as blocked.
function room(g: Grid, x: number, y: number): number {
  let best = Infinity;
  for (let j = 0; j < g.length; j++)
    for (let i = 0; i < g[0].length; i++)
      if (!g[j][i]) best = Math.min(best, Math.max(Math.abs(i - x), Math.abs(j - y)));
  const edge = Math.min(x + 1, y + 1, g[0].length - x, g.length - y);
  return Math.min(best, edge);
}

// Best value wins; equal best values tie-break at random. Caller passes a non-empty list.
function pickBest(cells: { x: number; y: number; v: number }[], rng: Rng): { cell: Pt; value: number } {
  let top = -Infinity;
  for (const c of cells) top = Math.max(top, c.v);
  const tied = cells.filter((c) => c.v === top);
  const pick = tied[Math.floor(rng() * tied.length)];
  return { cell: { x: pick.x, y: pick.y }, value: top };
}

// Step 1: cluster centre = free cell with the most room, room capped at maxR + border.
function chooseCentre(free: Grid, cap: number, rng: Rng): { cell: Pt; room: number } | null {
  const cells: { x: number; y: number; v: number }[] = [];
  for (let y = 0; y < free.length; y++)
    for (let x = 0; x < free[0].length; x++)
      if (free[y][x]) cells.push({ x, y, v: Math.min(cap, room(free, x, y)) });
  if (cells.length === 0) return null;
  const best = pickBest(cells, rng);
  return { cell: best.cell, room: best.value };
}

// Step 2: ring around the centre. Inner disc gets weight 0; outer cells get weight = squared distance,
// so later picks go to the outside of the cluster first.
function clusterDistribution(
  g: Grid, centre: Pt, roomCapped: number, inner: number, minR: number, maxR: number, border: number,
): number[][] | null {
  const r2 = roomCapped - border - 1;
  if (r2 < minR) return null;
  const outer = Math.min(r2, maxR);
  const r1 = Math.min(inner, outer);
  if (r1 < 1) return null;
  const dist: number[][] = g.map((row) => row.map(() => 0));
  for (let y = 0; y < g.length; y++)
    for (let x = 0; x < g[0].length; x++) {
      const d2 = (x - centre.x) ** 2 + (y - centre.y) ** 2;
      if (d2 <= outer * outer && d2 >= r1 * r1) dist[y][x] = d2;
    }
  return dist;
}

// Step 3: place one item at a time. Each pick: draw a type from the types that still have a legal cell
// (fix: the donor draws first and can stop the whole cluster), take the best cell, zero the span disc in
// the ring, dezone the footprint on the cluster grid, and dezone footprint + reserve disc on the map grid.
// Returns the placements; stops early when no type has a legal cell.
function placeOneAtATime(
  free: Grid, clusterFree: Grid, dist: number[][], count: number, types: ItemType[], rng: Rng,
): { type: ItemType; at: Pt }[] {
  const placed: { type: ItemType; at: Pt }[] = [];
  for (let n = 0; n < count; n++) {
    const options: { type: ItemType; cells: { x: number; y: number; v: number }[] }[] = [];
    for (const t of types) {
      const required = t.span + 2; // simplified stand-in for the donor's span-to-cells conversion
      const cells: { x: number; y: number; v: number }[] = [];
      for (let y = 0; y < dist.length; y++)
        for (let x = 0; x < dist[0].length; x++)
          if (dist[y][x] > 0 && room(clusterFree, x, y) >= required) cells.push({ x, y, v: dist[y][x] });
      if (cells.length > 0) options.push({ type: t, cells });
    }
    if (options.length === 0) return placed;
    const total = options.reduce((s, o) => s + o.type.weight, 0);
    let roll = rng() * total;
    let chosen = options[options.length - 1];
    for (const o of options) {
      if (roll < o.type.weight) { chosen = o; break; }
      roll -= o.type.weight;
    }
    const { cell } = pickBest(chosen.cells, rng);
    const t = chosen.type;
    placed.push({ type: t, at: cell });
    for (let y = 0; y < dist.length; y++)
      for (let x = 0; x < dist[0].length; x++)
        if ((x - cell.x) ** 2 + (y - cell.y) ** 2 <= t.span * t.span) dist[y][x] = 0;
    clusterFree[cell.y][cell.x] = false;
    for (let y = 0; y < free.length; y++)
      for (let x = 0; x < free[0].length; x++)
        if ((x - cell.x) ** 2 + (y - cell.y) ** 2 <= t.reserve * t.reserve) free[y][x] = false;
  }
  return placed;
}

// Step 4: village grammar. Seeds with too few seed neighbours are removed. Each pass uses hysteresis:
// a seed is dropped when <= falseNeed of its box is seed, kept when >= trueNeed, else unchanged.
// Only seed removals count as changes (fix: the donor also counts non-seed flips, so it runs more passes).
// Stops when a pass removes nothing, or after 8 passes.
function pruneLonely(seed: Grid, radius: number, minDensityPerThousand: number): Grid {
  const FRAC = 1000;
  const area = (2 * radius + 1) ** 2;
  const trueNeed = Math.ceil((area * (FRAC - minDensityPerThousand)) / FRAC);
  const falseNeed = area - trueNeed;
  let cur: Grid = seed.map((row) => row.slice());
  for (let pass = 0; pass < 8; pass++) {
    const H = cur.length;
    const W = cur[0].length;
    const blurred: Grid = [];
    let removed = 0;
    for (let y = 0; y < H; y++) {
      const outRow: boolean[] = [];
      for (let x = 0; x < W; x++) {
        let count = 0;
        for (let dy = -radius; dy <= radius; dy++)
          for (let dx = -radius; dx <= radius; dx++) {
            const yy = Math.min(H - 1, Math.max(0, y + dy));
            const xx = Math.min(W - 1, Math.max(0, x + dx));
            if (cur[yy][xx]) count++;
          }
        const out = count <= falseNeed ? false : count >= trueNeed ? true : cur[y][x];
        outRow.push(out);
        if (cur[y][x] && !out) removed++;
      }
      blurred.push(outRow);
    }
    if (removed === 0) break;
    cur = cur.map((row, y) => row.map((v, x) => v && blurred[y][x]));
  }
  return cur;
}

// Wiring: one cluster, centre to ring to one-at-a-time placement. Pruning is a separate pass on seeds.
function buildCluster(
  free: Grid,
  rng: Rng,
  p: { inner: number; minR: number; maxR: number; border: number; count: number; types: ItemType[] },
): { type: ItemType; at: Pt }[] {
  const centre = chooseCentre(free, p.maxR + p.border, rng);
  if (centre === null) return [];
  const dist = clusterDistribution(free, centre.cell, centre.room, p.inner, p.minR, p.maxR, p.border);
  if (dist === null) return [];
  const clusterFree: Grid = free.map((row) => row.slice());
  return placeOneAtATime(free, clusterFree, dist, p.count, p.types, rng);
}

export {};
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (existing file; the layout helper would be a new module beside it, not yet created). This is authoring-time zone layout: it writes zone data and the server only reads it. The addendum says the zone-population rules (caps, respawn, despawn) live in the same file; that file was not read in this pass.
- Parity-checklist row 23 (zone population: spawn caps, respawn, despawn). No checklist row covers zone layout by itself, so row 23 is the nearest row. The layout only writes zone data and does not change any row 1-22 behaviour.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: zones as data (Frankendom ruling). No combat rule is served by this note.

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch was written from the mechanism; no donor lines were translated.
- Authoring time, not runtime. Frankendom must not re-run placement inside the server tick or from player input. The output is zone data that the server reads and verifies.
- Determinism: the donor uses separate seeded random streams for expansions, decorations and buildings (Classic 485 creates `expansionRandom` from `random.Next()`). Frankendom should keep one seed per zone and derive separate streams, so that changing one layout step does not reshuffle the rest.
- Defect 1 (fix in the sketch): the donor draws the actor type before checking it fits (864-865). If the drawn type has no legal cell, the whole cluster stops at 879-880 even when a smaller type would fit. Fix: draw only among types that have a legal cell (done in `placeOneAtATime`).
- Defect 2 (fix in the sketch): BooleanBlur counts every output change, including non-seed cells that flip to true (814). The pruning loop therefore runs to its 8-pass cap when the seed set is already stable. Fix: count only seed removals (done in `pruneLonely`). The final set is the same because the result is ANDed with the seed set.
- Donor naming: the pruning field is called "minimum density" but the code enforces that a seed keeps at least 5 of 49 box cells (about 9%). Frankendom should name the field for what it does (for example `minSeedNeighbours`).
- Not verified: the donor's cell-level cost and the placement quality on real maps. The sketch is only typechecked (VPS, `tsc --strict --target es2020`, exit 0). It was not run on a map.
- Half read: authoring-time generator code (not the server or client half), plus the TS mod's `mods/ts/rules/map-generators.yaml` as the data table. The RA and Cnc generator YAML values were not compared.
- Frankendom's zone code was not read in this pass, so whether it already has a grid layout is not known (not read). Adopting this means adding an authoring tool and a validator; that is a scope decision for Lead, not an engine change.
