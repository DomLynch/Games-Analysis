// Licence: LGPL-2.1-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Vec3 { x: number; y: number; z: number; }
interface Plot { id: number; min: Vec3; max: Vec3; owner: string; }

function sortCorners(a: Vec3, b: Vec3): [Vec3, Vec3] {
  return [
    { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), z: Math.min(a.z, b.z) },
    { x: Math.max(a.x, b.x), y: Math.max(a.y, b.y), z: Math.max(a.z, b.z) },
  ];
}

// Inclusive on both corners, like the donor containment macro.
function containsPoint(p: Plot, v: Vec3): boolean {
  return p.min.x <= v.x && v.x <= p.max.x &&
         p.min.y <= v.y && v.y <= p.max.y &&
         p.min.z <= v.z && v.z <= p.max.z;
}

// Two boxes overlap unless one lies entirely beyond the other on some axis.
function overlaps(p: Plot, min: Vec3, max: Vec3): boolean {
  return !(min.x > p.max.x || max.x < p.min.x) &&
         !(min.y > p.max.y || max.y < p.min.y) &&
         !(min.z > p.max.z || max.z < p.min.z);
}

export class PlotIndex {
  private readonly blockSize: number;
  private plots = new Map<number, Plot>();
  private cache = new Map<string, Plot[]>(); // block key -> plots overlapping that block cube
  private nextId = 1;

  constructor(blockSize = 64) {
    this.blockSize = Math.max(blockSize, 16); // donor clamps the cache radius to at least 16
  }

  insert(a: Vec3, b: Vec3, owner: string): number | null {
    const [min, max] = sortCorners(a, b);
    // Our rule, not in the donor: a plot may not overlap another plot.
    if (this.overlapping(min, max).length > 0) return null;
    const id = this.nextId++;
    this.plots.set(id, { id, min, max, owner });
    this.cache.clear(); // any write drops the whole point cache
    return id;
  }

  remove(id: number): boolean {
    const hit = this.plots.delete(id);
    if (hit) this.cache.clear();
    return hit;
  }

  // Exact box test over every plot. Used for placement; no sampling, so a one-node plot cannot be skipped.
  overlapping(a: Vec3, b: Vec3): Plot[] {
    const [min, max] = sortCorners(a, b);
    return [...this.plots.values()].filter(p => overlaps(p, min, max));
  }

  // Point query: the cache holds plots overlapping the whole block cube, then exact containment filters them.
  plotsAt(v: Vec3): Plot[] {
    const bs = this.blockSize;
    const bx = Math.floor(v.x / bs), by = Math.floor(v.y / bs), bz = Math.floor(v.z / bs);
    const key = `${bx},${by},${bz}`;
    let list = this.cache.get(key);
    if (!list) {
      const lo: Vec3 = { x: bx * bs, y: by * bs, z: bz * bs };
      const hi: Vec3 = { x: lo.x + bs - 1, y: lo.y + bs - 1, z: lo.z + bs - 1 };
      list = this.overlapping(lo, hi);
      this.cache.set(key, list);
    }
    return list.filter(p => containsPoint(p, v));
  }
}

export {};
