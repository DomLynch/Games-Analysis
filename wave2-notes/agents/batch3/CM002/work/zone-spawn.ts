// Licence: GPL-3.0 (donor, Cytopia). Clean-room sketch of the described mechanism, not a translation of the donor lines.
export {};

type ZoneType = 'RESIDENTIAL' | 'INDUSTRIAL' | 'COMMERCIAL' | 'AGRICULTURAL';
type Density = 'LOW' | 'MEDIUM' | 'HIGH';

interface Pt { x: number; y: number; }

interface ZoneCell { p: Pt; occupied: boolean; }

interface ZoneArea {
  type: ZoneType;
  density: Density;
  cells: ZoneCell[];   // contiguous cells of one zone type and density
  powered: boolean;    // set from the power grid, zone data is not needed here
}

interface Rng {
  int(lo: number, hi: number): number; // inclusive
}

// Catalogue built once from the tile data: only sizes that have at least one building for this zone and density.
interface Catalogue {
  sizesFor(type: ZoneType, density: Density): number[]; // ascending, distinct
  pick(type: ZoneType, density: Density, size: number, rnd: Rng): string | null;
}

// Returns true if the game accepted the placement (the game refuses blocked footprints).
type PlaceFn = (id: string, origin: Pt, size: number) => boolean;

const CAP_PER_TICK = 5;

function cellAt(area: ZoneArea, p: Pt): ZoneCell | undefined {
  return area.cells.find((c) => c.p.x === p.x && c.p.y === p.y);
}

// Footprint of an n x n building anchored at origin: down and left of it, as the donor's rectangle does.
function squareCells(origin: Pt, n: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      out.push({ x: origin.x - i, y: origin.y + j });
    }
  }
  return out;
}

// Fix: every cell of the square must be a free member of this area.
// The donor's size search tests only the origin's row and column.
function squareFits(area: ZoneArea, origin: Pt, n: number): boolean {
  return squareCells(origin, n).every((p) => {
    const c = cellAt(area, p);
    return c !== undefined && !c.occupied;
  });
}

// Squares nest (a k-square lies inside a (k+1)-square), so the first failure ends the search.
function largestFit(area: ZoneArea, origin: Pt, maxN: number): number {
  let best = 0;
  for (let k = 1; k <= maxN; k++) {
    if (!squareFits(area, origin, k)) break;
    best = k;
  }
  return best;
}

function shuffle<T>(xs: T[], rnd: Rng): void {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = rnd.int(0, i);
    const tmp = xs[i];
    xs[i] = xs[j];
    xs[j] = tmp;
  }
}

// One growth tick for one area (donor ZoneArea::spawnBuildings, with fixes).
// Returns how many buildings were placed this tick.
export function spawnTick(area: ZoneArea, cat: Catalogue, rnd: Rng, place: PlaceFn): number {
  if (!area.powered) return 0;
  shuffle(area.cells, rnd);
  let placed = 0;
  for (const cell of area.cells) {
    if (placed >= CAP_PER_TICK) break;
    if (cell.occupied) continue;
    const sizes = cat.sizesFor(area.type, area.density);
    if (sizes.length === 0) break;
    const fits = largestFit(area, cell.p, sizes[sizes.length - 1]);
    const options = sizes.filter((n) => n <= fits);
    if (options.length === 0) continue; // nothing fits here: not a failed attempt
    const n = options[rnd.int(0, options.length - 1)];
    const id = cat.pick(area.type, area.density, n, rnd);
    if (id === null) continue;
    if (!place(id, cell.p, n)) continue; // refused by the game: not counted toward the cap
    // Occupy at once, so the next candidate in this same tick sees the footprint as taken.
    for (const p of squareCells(cell.p, n)) {
      const c = cellAt(area, p);
      if (c) c.occupied = true;
    }
    placed++;
  }
  return placed;
}
