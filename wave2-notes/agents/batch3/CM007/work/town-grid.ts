// Licence of donor: GNU GPL v3 or later, with additional terms (GPL s.7). This sketch is clean-room:
// written from the described rule (4-bit neighbour mask, 3x3 stamp, neighbour lot score).
// No donor table values, tile ids or sprite names are copied; shapeFor is injected.

type Kind = 'none' | 'road' | 'building' | 'water';

interface Cell {
  kind: Kind;
  shape: number; // our own tile id, derived for roads, stamped for buildings
}

// Neighbour order used for the mask: bit 1 = north (y-1), bit 2 = east (x+1), bit 4 = south (y+1), bit 8 = west (x-1).
const NEIGH4: ReadonlyArray<readonly [number, number]> = [[0, -1], [1, 0], [0, 1], [-1, 0]];

// Ring of 9 tiles for a 3x3 stamp (row-major, centre at index 4).
const RING9: ReadonlyArray<readonly [number, number]> = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0], [0, 0], [1, 0],
  [-1, 1], [0, 1], [1, 1],
];

// Eight ring tiles around a centre (no centre tile).
const RING8: ReadonlyArray<readonly [number, number]> = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0], [1, 0],
  [-1, 1], [0, 1], [1, 1],
];

class TownGrid {
  readonly cells: Cell[];

  constructor(
    readonly w: number,
    readonly h: number,
    private readonly shapeFor: (mask: number) => number, // 16 entries, supplied by the art pipeline
  ) {
    this.cells = Array.from({ length: w * h }, () => ({ kind: 'none' as Kind, shape: 0 }));
  }

  at(x: number, y: number): Cell | undefined {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return undefined;
    return this.cells[y * this.w + x];
  }

  // One rule for all four directions (the donor's per-direction exclusions are replaced).
  mask(x: number, y: number): number {
    let m = 0;
    NEIGH4.forEach(([dx, dy], bit) => {
      const n = this.at(x + dx, y + dy);
      if (n && n.kind === 'road') m |= 1 << bit;
    });
    return m;
  }

  derive(x: number, y: number): void {
    const c = this.at(x, y);
    if (!c || c.kind !== 'road') return;
    c.shape = this.shapeFor(this.mask(x, y));
  }

  // One edit: change the tile, then re-derive it and its four in-bounds neighbours.
  placeRoad(x: number, y: number): boolean {
    const c = this.at(x, y);
    if (!c || c.kind !== 'none') return false;
    c.kind = 'road';
    this.derive(x, y);
    for (const [dx, dy] of NEIGH4) this.derive(x + dx, y + dy);
    return true;
  }
}

// Stamp a 3x3 block with nine ids base..base+8. Refuses if any in-bounds tile is blocked.
function stampBlock(
  g: TownGrid,
  cx: number,
  cy: number,
  baseId: number,
  blocked: (c: Cell) => boolean,
): boolean {
  for (const [dx, dy] of RING9) {
    const c = g.at(cx + dx, cy + dy);
    if (c && blocked(c)) return false;
  }
  RING9.forEach(([dx, dy], i) => {
    const c = g.at(cx + dx, cy + dy);
    if (c) {
      c.kind = 'building';
      c.shape = baseId + i;
    }
  });
  return true;
}

// Lot score for one tile: -1 if occupied; else 1 plus one per adjacent ROAD (not any non-clear tile).
function lotScore(g: TownGrid, x: number, y: number): number {
  const c = g.at(x, y);
  if (!c || c.kind !== 'none') return -1;
  let score = 1;
  for (const [dx, dy] of NEIGH4) {
    const n = g.at(x + dx, y + dy);
    if (n && n.kind === 'road') score++;
  }
  return score;
}

// Pick the best of the 8 ring tiles around a centre. A later tie replaces the pick with chance 1/8.
function pickLot(
  g: TownGrid,
  cx: number,
  cy: number,
  rng: () => number,
): [number, number] | null {
  let best = 0;
  let pick: [number, number] | null = null;
  for (const [dx, dy] of RING8) {
    const s = lotScore(g, cx + dx, cy + dy);
    if (s <= 0) continue;
    if (s > best) {
      best = s;
      pick = [cx + dx, cy + dy];
    } else if (s === best && rng() < 1 / 8) {
      pick = [cx + dx, cy + dy];
    }
  }
  return pick;
}

export {};
