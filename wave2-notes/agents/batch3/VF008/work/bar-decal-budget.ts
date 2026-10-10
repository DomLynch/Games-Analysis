// Licence: GNU GPL v2 (donor widget header, gfx_decals_gl4.lua line 9). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

const CELL = 256;                  // donor areaResolution, in world units (elmos)
const CELL_AREA = CELL * CELL;     // donor cellArea
const MAX_LAYERS = 16;             // donor maxDecalLayersPerCell

// Lifetime in frames: alphaStart / alphaDecay, with the decay divided by the lifetime multiplier (donor 582, 607).
function lifetimeFrames(alphaStart: number, alphaDecay: number, lifeMult: number): number | null {
  const decay = alphaDecay / lifeMult;
  return decay > 0 ? Math.floor(alphaStart / decay) : null; // null: never expires on its own
}

interface DecalParams { radius: number; alphaStart: number; alphaDecay: number; }

// Explosion decal from a blast (donor 1287-1330). rand() returns 0..1; spread is the weapon radius variation.
function explosionDecal(baseRadius: number, spread: number, exploHeight: number, rand: () => number): DecalParams | null {
  const radius = baseRadius * (1 + (rand() - 0.5) * spread);
  if (exploHeight >= radius) return null;            // a blast above its radius leaves nothing
  const h = 1 - exploHeight / radius;                // height multiplier: airborne blasts are weaker
  const alpha = (1.5 + rand()) * h * h;
  return {
    radius,
    alphaStart: (0.72 + 0.38 * rand()) * alpha,
    alphaDecay: (0.2 + 0.3 * rand()) / (4 * radius), // bigger blast, slower fade
  };
}

interface CellState { order: number[]; area: Map<number, number>; total: number; }

// Per-cell overdraw budget with oldest-first eviction, and frame-bucketed expiry.
class DecalBudget {
  private cells = new Map<number, CellState>();
  private cellOf = new Map<number, number>();
  private expiring = new Map<number, number[]>();

  constructor(private readonly lifeMult: number) {}

  add(id: number, cellKey: number, width: number, length: number, spawnFrame: number,
      alphaStart: number, alphaDecay: number): void {
    const cell = this.cells.get(cellKey) ?? { order: [], area: new Map<number, number>(), total: 0 };
    this.cells.set(cellKey, cell);
    const area = Math.min(width * length, CELL_AREA); // a giant decal counts as one layer
    cell.area.set(id, area);
    cell.total += area;
    cell.order.push(id);
    this.cellOf.set(id, cellKey);

    const life = lifetimeFrames(alphaStart, alphaDecay, this.lifeMult);
    if (life !== null) {
      const at = spawnFrame + life;
      const bucket = this.expiring.get(at) ?? [];
      bucket.push(id);
      this.expiring.set(at, bucket);
    }

    while (cell.total > MAX_LAYERS * CELL_AREA && cell.order.length > 0) {
      this.remove(cell.order.shift() as number); // oldest first
    }
  }

  // Simplified: the donor keeps expired decals counted in the cell total until they are evicted (see note, gap 4).
  // Here expiry releases the area at once.
  tick(frame: number): void {
    const bucket = this.expiring.get(frame);
    if (bucket === undefined) return;
    for (const id of bucket) this.remove(id);
    this.expiring.delete(frame);
  }

  remove(id: number): void {
    const key = this.cellOf.get(id);
    if (key === undefined) return;
    const cell = this.cells.get(key);
    if (cell !== undefined) {
      cell.total = Math.max(0, cell.total - (cell.area.get(id) ?? 0));
      cell.area.delete(id);
    }
    this.cellOf.delete(id);
  }
}

export {};
