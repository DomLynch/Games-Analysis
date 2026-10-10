// Licence: GPL-3.0 (donor LICENSE). CLEAN-ROOM sketch written from the mechanism (fixed cell grid inside a zone,
// ring query with distance culls, queued cell moves applied once per tick, timer plus movement flag for relocation).
export interface Obj { id: number; x: number; y: number; z: number; cell: number | null; queued: boolean; }

const ZONE_SPAN = 65536;             // fixed zone extent in world units
const SIDE = 32;                     // cells per zone side
const CELL = ZONE_SPAN / SIDE;       // 2048 units per cell
const CELL_SHIFT = 11;               // log2(CELL)
const RELOCATION_MS = 2000;          // timer for objects that moved without a flag

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

export class ZoneGridSim {
  readonly cells: Set<Obj>[] = Array.from({ length: SIDE * SIDE }, () => new Set<Obj>());
  private queue: Obj[] = [];

  constructor(readonly xOff: number, readonly yOff: number) {}

  cellOf(x: number, y: number): number | null {
    const dx = x - this.xOff, dy = y - this.yOff;
    if (dx < 0 || dy < 0 || dx >= ZONE_SPAN || dy >= ZONE_SPAN) return null;
    return ((dy >> CELL_SHIFT) << 5) | (dx >> CELL_SHIFT);
  }

  // Objects within radius r in 3D. Every non-empty cell in the ring is culled by its nearest distance;
  // no cell skips the Z test (the donor skips it for cells fully inside the radius).
  near(x: number, y: number, z: number, r: number): Obj[] {
    const r2 = r * r;
    const ring = (r >> CELL_SHIFT) + 1;
    const cx = clamp((x - this.xOff) >> CELL_SHIFT, 0, SIDE - 1);
    const cy = clamp((y - this.yOff) >> CELL_SHIFT, 0, SIDE - 1);
    const out: Obj[] = [];
    for (let row = Math.max(0, cy - ring); row <= Math.min(SIDE - 1, cy + ring); row++) {
      for (let col = Math.max(0, cx - ring); col <= Math.min(SIDE - 1, cx + ring); col++) {
        const set = this.cells[(row << 5) | col];
        if (set.size === 0) continue;
        const left = this.xOff + col * CELL, top = this.yOff + row * CELL;
        const right = left + CELL, bottom = top + CELL;
        const ddx = Math.max(left - x, 0, x - right), ddy = Math.max(top - y, 0, y - bottom);
        if (ddx * ddx + ddy * ddy > r2) continue;
        for (const o of set) {
          const ox = x - o.x, oy = y - o.y, oz = z - o.z;
          if (ox * ox + oy * oy + oz * oz <= r2) out.push(o);
        }
      }
    }
    return out;
  }

  // Movement code only queues; the cell change happens in tick(). One pending move per object.
  requestRelocate(o: Obj): void {
    if (o.queued) return;
    o.queued = true;
    this.queue.push(o);
  }

  // Applied once per game tick. The destination is read from the object's current position when applied.
  tick(): void {
    for (const o of this.queue) {
      o.queued = false;
      const dest = this.cellOf(o.x, o.y);
      if (dest === o.cell) continue;
      if (o.cell !== null) this.cells[o.cell].delete(o);
      if (dest !== null) this.cells[dest].add(o);
      o.cell = dest;
    }
    this.queue = [];
  }
}

// Relocation check is due when movement flagged it, or when the 2 s timer has expired.
export class RelocationGate {
  private pending = false;
  private nextAt = 0;

  markMoved(): void { this.pending = true; }

  due(now: number): boolean {
    if (!this.pending && now < this.nextAt) return false;
    this.nextAt = now + RELOCATION_MS;
    this.pending = false;
    return true;
  }
}

export function checkRelocation(zone: ZoneGridSim, o: Obj): void {
  if (zone.cellOf(o.x, o.y) !== o.cell) zone.requestRelocate(o);
}

export {};
