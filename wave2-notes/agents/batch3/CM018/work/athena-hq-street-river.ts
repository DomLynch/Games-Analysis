// Licence: MIT (donor: athena/generator/MapGenerator.tsx; LICENSE.md). Adapted in shape; written fresh from the described mechanism, not copied line by line.
type Pt = { x: number; y: number };
type Kind = 'plain' | 'street' | 'river' | 'bridge' | 'plot' | 'barracks' | 'factory' | 'house';
type Grid = { w: number; h: number; cells: Kind[] };

// 1-based coordinates, as in the donor (edges are x or y equal to 1 or the size).
const idx = (g: Grid, p: Pt): number => (p.y - 1) * g.w + (p.x - 1);
const inside = (g: Grid, p: Pt): boolean => p.x >= 1 && p.y >= 1 && p.x <= g.w && p.y <= g.h;
const onEdge = (g: Grid, p: Pt): boolean => p.x === 1 || p.y === 1 || p.x === g.w || p.y === g.h;
const kindAt = (g: Grid, p: Pt): Kind | null => (inside(g, p) ? g.cells[idx(g, p)] : null);
const put = (g: Grid, p: Pt, k: Kind): void => { g.cells[idx(g, p)] = k; };

// Inclusive integer range, the assumed meaning of the donor random(lo, hi).
const pickInt = (rand: () => number, lo: number, hi: number): number =>
  lo + Math.floor(rand() * (hi - lo + 1));

function shuffle<T>(rand: () => number, items: T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Pair of HQs: a random seed in the first 40 percent, scan forward, mirror the first valid tile with jitter.
function placeHqPair(g: Grid, rand: () => number): [Pt, Pt] | null {
  const length = g.w * g.h;
  const seed = Math.floor(rand() * (length / 2.5));
  for (let j = seed; j < length; j++) {
    const a: Pt = { x: (j % g.w) + 1, y: Math.floor(j / g.w) + 1 };
    const b: Pt = {
      x: g.w - a.x + 1 + pickInt(rand, -2, 2),
      y: g.h - a.y + 1 + pickInt(rand, -2, 2),
    };
    if (inside(g, b) && (b.x !== a.x || b.y !== a.y) && !onEdge(g, a) && !onEdge(g, b)) {
      return [a, b];
    }
  }
  return null;
}

// Breadth-first path over cells that pass ok (the target is always allowed).
function bfs(g: Grid, from: Pt, to: Pt, ok: (p: Pt) => boolean): Pt[] | null {
  const prev = new Map<number, Pt>();
  const seen = new Set<number>([idx(g, from)]);
  const queue: Pt[] = [from];
  while (queue.length > 0) {
    const p = queue.shift() as Pt;
    if (p.x === to.x && p.y === to.y) {
      const path: Pt[] = [p];
      let back = prev.get(idx(g, p));
      while (back !== undefined) {
        path.push(back);
        back = prev.get(idx(g, back));
      }
      return path.reverse();
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const q: Pt = { x: p.x + dx, y: p.y + dy };
      const isTarget = q.x === to.x && q.y === to.y;
      if (!inside(g, q) || seen.has(idx(g, q)) || !(isTarget || ok(q))) continue;
      seen.add(idx(g, q));
      prev.set(idx(g, q), p);
      queue.push(q);
    }
  }
  return null;
}

// Walk from p in direction (dx, dy) until the map edge.
function edgeFrom(g: Grid, p: Pt, dx: number, dy: number): Pt {
  let e = p;
  while (!onEdge(g, e)) e = { x: e.x + dx, y: e.y + dy };
  return e;
}

// Street between the HQs, a river crossing the middle of the street, bridges where they meet.
function buildRoad(g: Grid, hq1: Pt, hq2: Pt, rand: () => number): { bridges: Pt[]; barriers: Pt[] } {
  const none = { bridges: [] as Pt[], barriers: [] as Pt[] };
  const street = bfs(g, hq1, hq2, (p) => kindAt(g, p) === 'plain');
  if (street === null || street.length < 3) return none;
  street.forEach((p) => put(g, p, 'street'));

  // centre: middle of the street, off by one either way
  const center = street[Math.floor(street.length / 2) - 1 + pickInt(rand, 0, 1)];
  const sides = shuffle(
    rand,
    [
      { x: center.x, y: center.y - 1 },
      { x: center.x + 1, y: center.y },
      { x: center.x, y: center.y + 1 },
      { x: center.x - 1, y: center.y },
    ].filter((p) => inside(g, p) && kindAt(g, p) !== 'street'),
  );
  if (sides.length < 2) return none;

  // river: from the first two sides out to the map edge on the far side of each
  const [a, b] = sides;
  const edgeA = edgeFrom(g, a, a.x - center.x, a.y - center.y);
  const edgeB = edgeFrom(g, b, b.x - center.x, b.y - center.y);
  const notStreet = (p: Pt): boolean => kindAt(g, p) === 'plain';
  const pathA = bfs(g, edgeA, a, notStreet);
  const pathB = bfs(g, edgeB, b, notStreet);
  if (pathA === null || pathB === null) return none;
  [...pathA, ...pathB].forEach((p) => {
    if (kindAt(g, p) !== 'street') put(g, p, 'river');
  });

  // corners of the centre: keep two, reserve the other two as plots
  const corners = shuffle(
    rand,
    [
      { x: center.x - 1, y: center.y - 1 },
      { x: center.x + 1, y: center.y - 1 },
      { x: center.x - 1, y: center.y + 1 },
      { x: center.x + 1, y: center.y + 1 },
    ].filter((p) => inside(g, p) && kindAt(g, p) !== 'street' && kindAt(g, p) !== 'river'),
  );
  corners.slice(2).forEach((p) => put(g, p, 'plot'));

  // bridges where the street crosses the river; half get a barrier
  const bridges: Pt[] = [];
  const barriers: Pt[] = [];
  for (const p of street) {
    const up = kindAt(g, { x: p.x, y: p.y - 1 });
    const down = kindAt(g, { x: p.x, y: p.y + 1 });
    const left = kindAt(g, { x: p.x - 1, y: p.y });
    const right = kindAt(g, { x: p.x + 1, y: p.y });
    const crossesH = up === 'river' && down === 'river' && left === 'street' && right === 'street';
    const crossesV = left === 'river' && right === 'river' && up === 'street' && down === 'street';
    if (crossesH || crossesV) {
      put(g, p, 'bridge');
      bridges.push(p);
      if (rand() < 0.5) barriers.push(p);
    }
  }
  return { bridges, barriers };
}

// Each HQ gets up to eight plots in its ring; the first six get a building; at most two factory-type buildings.
function fillHub(g: Grid, hq: Pt, rand: () => number): void {
  const maxFactories = 2;
  const ring: Pt[] = [];
  for (let dy = -2; dy <= 2; dy++)
    for (let dx = -2; dx <= 2; dx++) {
      const d = Math.abs(dx) + Math.abs(dy);
      if (d === 2) ring.push({ x: hq.x + dx, y: hq.y + dy }); // tiles two steps from the HQ
    }
  const candidates = shuffle(rand, ring).filter(
    (p) => inside(g, p) && !onEdge(g, p) && kindAt(g, p) === 'plain',
  );
  let factories = 0;
  candidates.slice(0, 8).forEach((p, i) => {
    put(g, p, 'plot');
    const wantsFactory = rand() < 0.5;
    if (i > 5) return; // only the first six candidates get a building
    if (wantsFactory && factories < maxFactories) {
      // count the factory only once it is placed; the first one is a barracks
      put(g, p, factories === 0 || rand() < 0.5 ? 'barracks' : 'factory');
      factories++;
    } else {
      put(g, p, 'house');
    }
  });
}

export function generateTown(w: number, h: number, rand: () => number): Grid | null {
  const g: Grid = { w, h, cells: new Array<Kind>(w * h).fill('plain') };
  const pair = placeHqPair(g, rand);
  if (pair === null) return null;
  const [hq1, hq2] = pair;
  put(g, hq1, 'house');
  put(g, hq2, 'house');
  buildRoad(g, hq1, hq2, rand);
  fillHub(g, hq1, rand);
  fillHub(g, hq2, rand);
  return g;
}

export {};
