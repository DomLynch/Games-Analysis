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
