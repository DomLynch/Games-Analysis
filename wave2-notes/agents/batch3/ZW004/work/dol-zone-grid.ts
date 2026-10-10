// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Pt { x: number; y: number; }
interface Obj { id: number; pos: Pt; }

const SIDE = 32;                  // cells per side of one zone window
const WINDOW = 65536;             // units covered by one zone window
const CELL = WINDOW / SIDE;       // 2048 units per cell

function sqMinDist(px: number, py: number, x0: number, x1: number, y0: number, y1: number): number {
  const dx = px < x0 ? x0 - px : px > x1 ? px - x1 : 0;
  const dy = py < y0 ? y0 - py : py > y1 ? py - y1 : 0;
  return dx * dx + dy * dy;
}

function sqMaxDist(px: number, py: number, x0: number, x1: number, y0: number, y1: number): number {
  const dx = Math.max(Math.abs(px - x0), Math.abs(px - x1));
  const dy = Math.max(Math.abs(py - y0), Math.abs(py - y1));
  return dx * dx + dy * dy;
}

class ZoneGrid {
  private readonly cells: Set<Obj>[] = Array.from({ length: SIDE * SIDE }, () => new Set<Obj>());
  private readonly where = new Map<Obj, number>();

  constructor(private readonly ox: number, private readonly oy: number) {}

  // -1 when the point is outside this zone window; such objects are not indexed here
  private cellOf(p: Pt): number {
    const dx = p.x - this.ox;
    const dy = p.y - this.oy;
    if (dx < 0 || dx >= WINDOW || dy < 0 || dy >= WINDOW) return -1;
    return Math.floor(dy / CELL) * SIDE + Math.floor(dx / CELL);
  }

  insert(o: Obj): void {
    const c = this.cellOf(o.pos);
    if (c < 0) return;
    this.cells[c].add(o);
    this.where.set(o, c);
  }

  remove(o: Obj): void {
    const c = this.where.get(o);
    if (c === undefined) return;
    this.cells[c].delete(o);
    this.where.delete(o);
  }

  // Re-file at once on every move, so a query never reads a stale cell.
  move(o: Obj, to: Pt): void {
    this.remove(o);
    o.pos = to;
    this.insert(o);
  }

  // Objects within `radius` (2D) of `center`.
  query(center: Pt, radius: number): Obj[] {
    const out: Obj[] = [];
    const r2 = radius * radius;
    const px = center.x - this.ox;
    const py = center.y - this.oy;
    const minCol = Math.max(0, Math.floor((px - radius) / CELL));
    const maxCol = Math.min(SIDE - 1, Math.floor((px + radius) / CELL));
    const minRow = Math.max(0, Math.floor((py - radius) / CELL));
    const maxRow = Math.min(SIDE - 1, Math.floor((py + radius) / CELL));

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const x0 = col * CELL, x1 = x0 + CELL;
        const y0 = row * CELL, y1 = y0 + CELL;
        if (sqMinDist(px, py, x0, x1, y0, y1) > r2) continue;   // cell wholly outside the circle
        const wholeCellIn = sqMaxDist(px, py, x0, x1, y0, y1) <= r2;
        for (const o of this.cells[row * SIDE + col]) {
          if (wholeCellIn) { out.push(o); continue; }
          const ex = o.pos.x - this.ox - px;
          const ey = o.pos.y - this.oy - py;
          if (ex * ex + ey * ey <= r2) out.push(o);
        }
      }
    }
    return out;
  }
}

export {};
