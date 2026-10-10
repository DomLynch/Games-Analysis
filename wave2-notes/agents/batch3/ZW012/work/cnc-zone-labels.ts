// Licence: GPL-3.0 with EA additional terms (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Grid {
  w: number;
  h: number;
  passable(x: number, y: number): boolean;
}

export interface Cell { x: number; y: number; }

const MAX_REGION_ID = 255; // one byte per cell in the donor; the sketch refuses to overflow it

// Connected-region labels for one movement class. 0 = not passable / not labelled yet.
// Rebuild from scratch whenever a blocking object (wall, bridge, door) changes.
export function labelRegions(g: Grid): Uint8Array {
  const zone = new Uint8Array(g.w * g.h);
  let next = 1;
  for (let i = 0; i < g.w * g.h; i++) {
    if (zone[i] !== 0 || !g.passable(i % g.w, Math.floor(i / g.w))) continue;
    if (next > MAX_REGION_ID) throw new Error("too many regions for one-byte labels");
    const stack: number[] = [i];
    zone[i] = next;
    while (stack.length > 0) {
      const c = stack.pop() as number;
      const cx = c % g.w;
      const cy = Math.floor(c / g.w);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= g.w || ny >= g.h) continue;
          const n = ny * g.w + nx;
          if (zone[n] !== 0 || !g.passable(nx, ny)) continue;
          zone[n] = next;
          stack.push(n);
        }
      }
    }
    next++;
  }
  return zone;
}

// Nearest passable cell in the same region as `from`. Rings grow outward; the first ring with
// candidates supplies up to 10 of them; the pick is keyed on the tick so server and clients agree.
export function nearbyLegalCell(
  g: Grid,
  zone: Uint8Array,
  from: Cell,
  tick: number,
  locationMod = 0,
): Cell | null {
  const regionOf = (x: number, y: number): number =>
    x < 0 || y < 0 || x >= g.w || y >= g.h ? 0 : zone[y * g.w + x];
  const want = regionOf(from.x, from.y);
  if (want === 0) return null;

  const cands: Cell[] = [];
  const maxRadius = Math.max(g.w, g.h);
  for (let r = 0; r < maxRadius && cands.length < 10; r++) {
    for (let dy = -r; dy <= r && cands.length < 10; dy++) {
      for (let dx = -r; dx <= r && cands.length < 10; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; // ring r only
        const x = from.x + dx;
        const y = from.y + dy;
        if (regionOf(x, y) === want) cands.push({ x, y });
      }
    }
    if (cands.length > 0) break;
  }
  if (cands.length === 0) return null;
  return cands[(tick + locationMod) % cands.length];
}

export {};
