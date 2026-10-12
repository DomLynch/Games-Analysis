// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Part { name: string; tier: number; w: number; h: number; resource?: string; }
export interface Cell { x: number; y: number; empty: boolean; resource?: string; }
export interface Neighbour { dx: number; dy: number; ownBuilding: boolean; isWallOrMine: boolean; }

// Seeded RNG (mulberry32): the donor seeds Mathf.rand with the sector id (BaseGenerator.java line 49).
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Donor lines 53-57: chances and pass count rise with difficulty (0..1).
export function chances(difficulty: number): { resource: number; nonResource: number } {
  const base = 0.7 + (2.1 - 0.7) * difficulty;   // lerp(0.7, 2.1, difficulty)
  return { resource: 0.5 * base, nonResource: 0.002 * base };   // may exceed 1 at high difficulty (see defects)
}

export function passesFor(difficulty: number): number {
  return difficulty < 0.4 ? 1 : difficulty < 0.8 ? 3 : 5;
}

// Pick from a tier-sorted list by fraction (donor Seq.getFrac is not read; this helper is ours).
export function pickFrac<T>(sorted: T[], frac: number): T {
  const f = Math.min(1, Math.max(0, frac));
  return sorted[Math.min(sorted.length - 1, Math.floor(f * sorted.length))];
}

function shuffleInPlace<T>(xs: T[], rnd: () => number): T[] {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [xs[i], xs[j]] = [xs[j], xs[i]];
  }
  return xs;
}

// Donor lines 114-124: an empty tile becomes a wall when a neighbour direction lies within wallAngle
// of the spawn-to-tile direction and that neighbour is a team building that is not a wall or mine.
function angleDist(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

export function wallHere(tileDeg: number, neighbours: Neighbour[], wallAngle: number): boolean {
  return neighbours.some(n => {
    const dirDeg = (Math.atan2(n.dy, n.dx) * 180) / Math.PI;
    if (angleDist(dirDeg, tileDeg) > wallAngle) return false;
    return n.ownBuilding && !n.isWallOrMine;
  });
}

// One part at a time. The caller supplies taken(), which must cover existing blocks and the enemy-core
// exclusion radius. The pad of 1 tile around the footprint matches the donor's isTaken (line 288).
export function placeOne(
  part: Part,
  x: number,
  y: number,
  rnd: () => number,
  taken: (x: number, y: number, w: number, h: number, pad: number) => boolean,
  put: (part: Part, x: number, y: number, rot: number) => void,
): boolean {
  const rot = Math.floor(rnd() * 2) * 90;   // two rotations, as the donor's random.range(2) is used (range semantics not read)
  if (taken(x, y, part.w, part.h, 1)) return false;
  put(part, x, y, rot);
  return true;
}

// Base layout. Each pass walks the candidate cells in a seeded shuffle; a resource cell may take a
// resource-bound part; any other empty cell may take a free part with a small chance.
export function generateBase(
  cells: Cell[],
  parts: Part[],                          // no requirement, sorted by tier
  byResource: Map<string, Part[]>,        // needs a resource, sorted by tier
  difficulty: number,
  seed: number,
  taken: (x: number, y: number, w: number, h: number, pad: number) => boolean,
  put: (part: Part, x: number, y: number, rot: number) => void,
): number {
  const rnd = mulberry32(seed);
  const ch = chances(difficulty);
  let placed = 0;
  for (let pass = 0; pass < passesFor(difficulty); pass++) {
    shuffleInPlace(cells, rnd);   // fix: a fixed scan order lets the first cells claim the space
    for (const c of cells) {
      if (!c.empty) continue;
      if (c.resource !== undefined && rnd() < ch.resource) {
        const list = byResource.get(c.resource) ?? [];
        if (list.length === 0) continue;
        const part = pickFrac(list, difficulty + rnd() * 0.17);   // donor bracket range 0.17 (line 52)
        if (placeOne(part, c.x, c.y, rnd, taken, put)) placed++;
      } else if (rnd() < ch.nonResource) {
        const part = pickFrac(parts, rnd());
        if (placeOne(part, c.x, c.y, rnd, taken, put)) placed++;
      }
    }
  }
  return placed;
}

export {};
