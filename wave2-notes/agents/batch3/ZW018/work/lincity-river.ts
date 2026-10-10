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
