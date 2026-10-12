// Licence: MIT (donor, Copyright (c) 2026 Andrii Tsapko). Shape adapted; this sketch is written from the described mechanism.
interface Anchor { id: number; name: string; x: number; y: number; }
interface TileGrid { originX: number; originY: number; width: number; height: number; cells: number[]; }

// Tile lookup: 2^15 world units per tile, then one array index. -1 or off-grid means no region.
function tileRegion(grid: TileGrid, x: number, y: number): number | null {
  const rX = (x >> 15) + grid.originX;
  const rY = (y >> 15) + grid.originY;
  if (rX < 0 || rX >= grid.width || rY < 0 || rY >= grid.height) return null;
  const id = grid.cells[rY * grid.width + rX];
  return id < 0 ? null : id;
}

// Nearest anchor within a radius, Z ignored; exact distance ties go to the lowest id.
function nearestAnchor(anchors: Anchor[], x: number, y: number, radius: number): Anchor | null {
  const limit2 = radius * radius;
  let best: Anchor | null = null;
  let bestD2 = Number.POSITIVE_INFINITY;
  for (const a of anchors) {
    const dx = a.x - x;
    const dy = a.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2) {
      bestD2 = d2;
      best = a;
    } else if (d2 === bestD2 && best !== null && a.id < best.id) {
      best = a;
    }
  }
  return best !== null && bestD2 <= limit2 ? best : null;
}

// Most frequent region over an NPC's spawn points; ties go to the lowest region id.
function primaryRegion(spawns: { x: number; y: number }[], grid: TileGrid): number | null {
  const counts = new Map<number, number>();
  for (const s of spawns) {
    const id = tileRegion(grid, s.x, s.y);
    if (id === null) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  let best: number | null = null;
  let bestCount = -1;
  for (const [id, count] of counts) {
    if (count > bestCount || (count === bestCount && best !== null && id < best)) {
      best = id;
      bestCount = count;
    }
  }
  return best;
}

export {};
