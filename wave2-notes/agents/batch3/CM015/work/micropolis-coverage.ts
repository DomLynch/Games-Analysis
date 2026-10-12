// Licence: GPL v3 with additional terms (donor, Section 7). clean-room sketch written from the described mechanism, not a translation of the donor lines. The donor trademark is not used.
// clean-room
export interface Service {
  x: number;              // world tile
  y: number;
  budgetEffect: number;   // per-service effect from the budget (donor budget.js 225)
  powered: boolean;
  roadAdjacent: boolean;  // a driveable tile among the 12 perimeter offsets (donor traffic.js 84-89)
}

export const BLOCK = 8;     // world tiles per coverage cell (donor simulation.js 77 passes 8)
export const PASSES = 3;    // smoothing passes for the fire coverage field (donor blockMapUtils.js 474-476)

// Effect one service adds to its cell: halved if unpowered, halved again if no road touches it.
export function serviceEffect(s: Service): number {
  let e = s.budgetEffect;
  if (!s.powered) e = Math.floor(e / 2);
  if (!s.roadAdjacent) e = Math.floor(e / 2);
  return e;
}

export function emptyGrid(w: number, h: number): number[][] {
  return Array.from({ length: w }, () => new Array<number>(h).fill(0));
}

// One smoothing pass: the cell's value averaged with its existing neighbours.
// Fix: the neighbour average divides by the neighbours that exist, not always by 4 (donor divides by 4 at edges).
export function smoothNeighbours(src: number[][]): number[][] {
  const w = src.length;
  const h = w > 0 ? src[0].length : 0;
  const dst = emptyGrid(w, h);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let sum = 0;
      let n = 0;
      if (x > 0) { sum += src[x - 1][y]; n++; }
      if (x < w - 1) { sum += src[x + 1][y]; n++; }
      if (y > 0) { sum += src[x][y - 1]; n++; }
      if (y < h - 1) { sum += src[x][y + 1]; n++; }
      const avg = n > 0 ? Math.floor(sum / n) : 0;
      dst[x][y] = Math.floor((src[x][y] + avg) / 2);
    }
  }
  return dst;
}

// Coverage field for one service type: rebuilt from scratch each scan, then spread by PASSES smoothing passes.
export function coverageField(services: Service[], worldW: number, worldH: number): number[][] {
  let grid = emptyGrid(Math.ceil(worldW / BLOCK), Math.ceil(worldH / BLOCK));
  for (const s of services) {
    grid[Math.floor(s.x / BLOCK)][Math.floor(s.y / BLOCK)] += serviceEffect(s);
  }
  for (let i = 0; i < PASSES; i++) {
    grid = smoothNeighbours(grid);
  }
  return grid;
}
