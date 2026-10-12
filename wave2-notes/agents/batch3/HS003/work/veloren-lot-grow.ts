// Licence: GPL-3.0 (donor, LICENSE). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Cell { x: number; y: number; }
type Test = (c: Cell) => boolean;
// Max corner exclusive, like the donor Aabr: size = max - min.
interface Rect { minX: number; minY: number; maxX: number; maxY: number; }
interface MinSide { w: number; h: number; }

const w = (r: Rect): number => r.maxX - r.minX;
const h = (r: Rect): number => r.maxY - r.minY;

// Sides 0 and 2 add a column of height h; sides 1 and 3 add a row of width w.
function newEdgeFree(r: Rect, side: number, isEmpty: Test): boolean {
  const edge: Cell[] = [];
  if (side === 0) for (let y = r.minY; y < r.maxY; y++) edge.push({ x: r.maxX, y });
  else if (side === 1) for (let x = r.minX; x < r.maxX; x++) edge.push({ x, y: r.maxY });
  else if (side === 2) for (let y = r.minY; y < r.maxY; y++) edge.push({ x: r.minX - 1, y });
  else for (let x = r.minX; x < r.maxX; x++) edge.push({ x, y: r.minY - 1 });
  return edge.every(isEmpty);
}

function grow(r: Rect, side: number): Rect {
  switch (side) {
    case 0: return { ...r, maxX: r.maxX + 1 };
    case 1: return { ...r, maxY: r.maxY + 1 };
    case 2: return { ...r, minX: r.minX - 1 };
    default: return { ...r, minY: r.minY - 1 };
  }
}

// Grow one rectangle from a seed tile into empty tiles only.
// Returns null when the seed is not empty or the result misses the area or side minimums.
export function growRect(seed: Cell, isEmpty: Test, minArea: number, maxArea: number, minSide: MinSide): Rect | null {
  if (!isEmpty(seed)) return null;
  let rect: Rect = { minX: seed.x, minY: seed.y, maxX: seed.x + 1, maxY: seed.y + 1 };
  const offset = Math.abs(seed.x + seed.y); // donor: |centre.sum()| starts the side rotation
  let lastGrowth = 0;
  for (let i = 0; i - lastGrowth < 4; i++) { // stop after four refused sides in a row
    const side = (i + offset) % 4;
    // Fixed: the edge length comes from the side that will actually grow (the donor used the parity of i).
    const edge = side % 2 === 0 ? h(rect) : w(rect);
    if (w(rect) * h(rect) + edge >= maxArea) break; // maxArea is exclusive
    if (newEdgeFree(rect, side, isEmpty)) {
      rect = grow(rect, side);
      lastGrowth = i;
    }
  }
  const area = w(rect) * h(rect);
  return area >= minArea && w(rect) >= minSide.w && h(rect) >= minSide.h ? rect : null;
}

// Search a square around a point for a seed that touches a road; the road side is the door.
export function findLot(
  near: Cell, radius: number, isRoad: Test, isEmpty: Test,
  minArea: number, maxArea: number, minSide: MinSide,
): { rect: Rect; door: Cell; doorDir: number } | null {
  const dirs: Cell[] = [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }];
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const seed: Cell = { x: near.x + dx, y: near.y + dy };
      const doorDir = dirs.findIndex(d => isRoad({ x: seed.x + d.x, y: seed.y + d.y }));
      if (doorDir < 0) continue;
      const rect = growRect(seed, isEmpty, minArea, maxArea, minSide);
      if (rect) return { rect, door: seed, doorDir };
    }
  }
  return null;
}

export {};
