// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Kind = 'water' | 'road' | 'clear' | 'action' | 'blocked'; // blocked = castle, hero or monster tile

interface Cell {
  kind: Kind;
  open: boolean; // passable from every side; closed objects take a monster from one side only
}

// Own small xorshift32 generator, seeded per period so the plan can be replayed on the server.
class Rng {
  private s: number;
  constructor(seed: number) {
    this.s = (seed >>> 0) || 1;
  }
  next(): number {
    let x = this.s;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.s = x >>> 0;
    return this.s / 4294967296;
  }
  int(lo: number, hi: number): number {
    return lo + Math.floor(this.next() * (hi - lo + 1)); // inclusive
  }
  shuffle<T>(a: T[]): void {
    for (let i = a.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
  }
}

function square(i: number, w: number, h: number, r: number): number[] {
  const x0 = i % w;
  const y0 = Math.floor(i / w);
  const out: number[] = [];
  for (let y = y0 - r; y <= y0 + r; y++) {
    for (let x = x0 - r; x <= x0 + r; x++) {
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const n = y * w + x;
      if (n !== i) out.push(n);
    }
  }
  return out;
}

function isClear(c: Cell): boolean {
  return c.kind === 'road' || c.kind === 'clear';
}

function emptyNeighbours(cells: Cell[], i: number, w: number, h: number): number {
  return square(i, w, h, 1).filter((n) => isClear(cells[n])).length;
}

// Picks a clear neighbour at random. A closed object only takes a monster from the far side
// (the donor's index rule, copied as is; it does not check geometry).
function pickNeighbour(cells: Cell[], i: number, w: number, h: number, open: boolean, rng: Rng): number {
  const options = square(i, w, h, 1).filter((n) => {
    if (!open && n < i + w - 2) return false;
    return isClear(cells[n]);
  });
  if (options.length === 0) return -1;
  return options[rng.int(0, options.length - 1)];
}

export interface Plan {
  spawns: number[]; // tile indexes that get a stack
  count: number;    // planned stacks before tile caps
}

// One monthly plan: candidate tiles by tier, a seeded count, an 85/10/5 split, capped per tier.
function monthlyPlan(cells: Cell[], w: number, seed: number): Plan {
  const h = cells.length / w;
  const rng = new Rng(seed);
  const excluded = new Set<number>();
  const taken = new Set<number>(); // Frankendom addition: no tile is picked twice
  cells.forEach((c, i) => {
    if (c.kind === 'blocked') excluded.add(i);
  });

  const primary: number[] = [];
  const road: number[] = [];
  const clear: number[] = [];

  const nearExcluded = (i: number, r: number): boolean => square(i, w, h, r).some((n) => excluded.has(n));

  cells.forEach((c, i) => {
    if (c.kind === 'water' || excluded.has(i)) return;

    if (c.kind === 'action') {
      if (nearExcluded(i, 3)) return;
      const t = pickNeighbour(cells, i, w, h, c.open, rng);
      if (t >= 0 && !taken.has(t)) {
        primary.push(t);
        taken.add(t);
        excluded.add(i);
      }
    } else if (c.kind === 'road') {
      if (nearExcluded(i, 4)) return;
      if (emptyNeighbours(cells, i, w, h) < 2) return;
      const t = pickNeighbour(cells, i, w, h, true, rng);
      if (t >= 0 && !taken.has(t)) {
        road.push(t);
        taken.add(t);
        excluded.add(i);
      }
    } else if (c.kind === 'clear') {
      if (nearExcluded(i, 4)) return;
      if (emptyNeighbours(cells, i, w, h) < 4) return;
      const t = pickNeighbour(cells, i, w, h, true, rng);
      if (t >= 0 && !taken.has(t)) {
        clear.push(t);
        taken.add(t);
        excluded.add(i);
      }
    }
  });

  rng.shuffle(primary);
  rng.shuffle(road);
  rng.shuffle(clear);

  // Base count: a third of the primary candidates, floored at tiles/360; otherwise 75-125% of the base.
  const base = Math.floor(primary.length / 3);
  const floor = Math.floor(cells.length / 360);
  const count = base < floor ? floor : rng.int(Math.floor((base * 75) / 100), Math.floor((base * 125) / 100));

  // Each tier is capped by its own candidates; a short tier is not made up from another.
  const nPrimary = Math.min(Math.floor((count * 85) / 100), primary.length);
  const nRoad = Math.min(Math.floor((count * 10) / 100), road.length);
  const nClear = Math.min(Math.floor((count * 5) / 100), clear.length);

  return {
    spawns: [...primary.slice(0, nPrimary), ...road.slice(0, nRoad), ...clear.slice(0, nClear)],
    count,
  };
}

// Weekly growth of one neutral stack. Expected growth is count / 7 per week.
function weeklyGrowth(count: number, cap: number, rng: Rng): number {
  if (count <= 0 || count >= cap) return count;
  const bonus = rng.int(1, 7) <= count % 7 ? 1 : 0;
  const growth = Math.min(Math.floor(count / 7) + bonus, cap - count);
  return count + growth;
}

// Usage with a small map, so the file exercises the types.
const demo: Cell[] = Array.from({ length: 100 }, (_, i) => ({
  kind: i % 9 === 0 ? 'action' : i % 13 === 0 ? 'road' : 'clear',
  open: i % 2 === 0,
}));
const plan = monthlyPlan(demo, 10, 12345);
const grown = weeklyGrowth(10, 4000, new Rng(7));
