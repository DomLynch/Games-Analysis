// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Pt = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number };
type Tile = { walkable: boolean; swimmable: boolean; road: boolean; noRoad: boolean; height: number };
type Slot = { x: number; y: number; w: number; h: number; door: Pt; service: string | null };

// Donor get(lo, hi): uniform integer in [lo, hi), so hi is never returned.
function pick(rand: () => number, lo: number, hi: number): number {
  return lo + Math.floor(rand() * (hi - lo));
}

// Places buildings one at a time along one street band (donor Buildings with align = true).
// services[i] goes to the i-th building placed (donor insideMakers[i]); the rest stay empty rooms.
function layoutTown(rand: () => number, area: Rect, minB: number, maxB: number,
                    services: string[], attempts: number = 10000): Slot[] | null {
  const count = pick(rand, minB, maxB);
  const street = area.y + Math.floor(area.h / 2) - 2 + pick(rand, 0, 5);
  const taken = new Set<number>();
  const cell = (x: number, y: number): number => y * 4096 + x;
  const out: Slot[] = [];
  for (let i = 0; i < count; i++) {
    let slot: Slot | null = null;
    for (let t = 0; t < attempts && slot === null; t++) {
      const w = pick(rand, 3, 7);
      const h = pick(rand, 3, 7);
      const north = rand() < 0.5;
      const x = area.x + 1 + pick(rand, 0, area.w - w - 2);
      const y = north ? street - h - 1 : street + 2;
      if (y < area.y || y + h >= area.y + area.h) continue;
      // footprint plus a one-tile gap must be free
      let clash = false;
      for (let dy = -1; dy <= h + 1 && !clash; dy++)
        for (let dx = -1; dx <= w + 1 && !clash; dx++)
          if (taken.has(cell(x + dx, y + dy))) clash = true;
      if (clash) continue;
      for (let dy = 0; dy <= h; dy++)
        for (let dx = 0; dx <= w; dx++) taken.add(cell(x + dx, y + dy));
      // door on the wall that faces the street
      const door = { x: x + pick(rand, 1, w), y: north ? y + h : y };
      slot = { x, y, w, h, door, service: i < services.length ? services[i] : null };
    }
    if (slot === null) {
      if (i < minB) return null; // below the minimum the whole town is rejected
      break;                     // above the minimum, keep what fitted
    }
    out.push(slot);
  }
  return out;
}

// Donor Roads cost: unroutable = Infinity, water = 10 (bridge), existing road = 1, other ground = 1 + (1 + height)^2.
function roadCost(t: Tile): number {
  if ((!t.walkable && !t.swimmable) || t.noRoad) return Infinity;
  if (!t.walkable && t.swimmable) return 10;
  if (t.road) return 1;
  return 1 + (1 + t.height) ** 2;
}

// A* between two hub points with a Manhattan heuristic; endpoints cost 1 as in the donor.
function route(grid: Tile[][], start: Pt, goal: Pt): Pt[] | null {
  const H = grid.length;
  const W = grid[0].length;
  const id = (p: Pt): number => p.y * W + p.x;
  const manhattan = (p: Pt): number => Math.abs(p.x - goal.x) + Math.abs(p.y - goal.y);
  const best = new Map<number, number>([[id(start), 0]]);
  const came = new Map<number, Pt>();
  const open: { p: Pt; f: number }[] = [{ p: start, f: manhattan(start) }];
  while (open.length > 0) {
    open.sort((a, b) => a.f - b.f);
    const { p } = open.shift() as { p: Pt; f: number };
    if (p.x === goal.x && p.y === goal.y) {
      const path: Pt[] = [p];
      let cur = p;
      for (let c = came.get(id(cur)); c !== undefined; c = came.get(id(cur))) {
        path.push(c);
        cur = c;
      }
      return path.reverse();
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const q = { x: p.x + dx, y: p.y + dy };
      if (q.x < 0 || q.y < 0 || q.x >= W || q.y >= H) continue;
      const isEnd = (q.x === start.x && q.y === start.y) || (q.x === goal.x && q.y === goal.y);
      const step = isEnd ? 1 : roadCost(grid[q.y][q.x]);
      if (!isFinite(step)) continue;
      const g = (best.get(id(p)) ?? 0) + step;
      if (g < (best.get(id(q)) ?? Infinity)) {
        best.set(id(q), g);
        came.set(id(q), p);
        open.push({ p: q, f: g + manhattan(q) });
      }
    }
  }
  return null;
}

// Donor Roads: hub points sorted in raster order, each joined to the previous one (a chain).
function connectHubs(grid: Tile[][], hubs: Pt[]): void {
  const sorted = [...hubs].sort((a, b) => a.y - b.y || a.x - b.x);
  for (let i = 1; i < sorted.length; i++) {
    const path = route(grid, sorted[i - 1], sorted[i]);
    if (path === null) throw new Error("no road between hubs"); // donor failGen()
    for (const p of path) grid[p.y][p.x].road = true;
  }
}

export {};
