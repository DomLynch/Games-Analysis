// Licence: GPL-2.0 (donor). clean-room sketch written from the described mechanism (best-short-side-fit rectangle packing, one vertex array, one draw call per frame), not a translation of the donor lines.
// clean-room

export interface Rect { x: number; y: number; w: number; h: number; } // half-open: covers [x, x+w) and [y, y+h)

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

function inside(outer: Rect, inner: Rect): boolean {
  return inner.x >= outer.x && inner.y >= outer.y &&
    inner.x + inner.w <= outer.x + outer.w && inner.y + inner.h <= outer.y + outer.h;
}

export interface Placement { rect: Rect; rotated: boolean; }

export class RectAtlas<T> {
  private free: Rect[];
  readonly placed: Array<{ rect: Rect; value: T }> = [];

  // allowRotate defaults to false. When it is true, the caller must rotate the pixels too (Placement.rotated).
  constructor(readonly width: number, readonly height: number, private readonly allowRotate = false) {
    this.free = [{ x: 0, y: 0, w: width, h: height }];
  }

  // Best short-side fit: the free slot whose leftover short side is smallest wins; ties go to the smaller long side.
  private findPosition(w: number, h: number): Placement | undefined {
    const candidates: Array<[number, number, boolean]> = [[w, h, false]];
    if (this.allowRotate && w !== h) candidates.push([h, w, true]);
    let best: Placement | undefined;
    let bestShort = Infinity;
    let bestLong = Infinity;
    for (const f of this.free) {
      for (const [cw, ch, rotated] of candidates) {
        if (cw > f.w || ch > f.h) continue;
        const dx = f.w - cw;
        const dy = f.h - ch;
        const shortSide = Math.min(dx, dy);
        const longSide = Math.max(dx, dy);
        if (shortSide < bestShort || (shortSide === bestShort && longSide < bestLong)) {
          bestShort = shortSide;
          bestLong = longSide;
          best = { rect: { x: f.x, y: f.y, w: cw, h: ch }, rotated };
        }
      }
    }
    return best;
  }

  // Cut every free slot that the new piece touches into up to four leftovers, then drop slots that sit inside another slot.
  private split(p: Rect): void {
    const next: Rect[] = [];
    for (const f of this.free) {
      if (!overlaps(f, p)) { next.push(f); continue; }
      if (p.x > f.x) next.push({ x: f.x, y: f.y, w: p.x - f.x, h: f.h });
      if (p.x + p.w < f.x + f.w) next.push({ x: p.x + p.w, y: f.y, w: f.x + f.w - (p.x + p.w), h: f.h });
      if (p.y > f.y) next.push({ x: f.x, y: f.y, w: f.w, h: p.y - f.y });
      if (p.y + p.h < f.y + f.h) next.push({ x: f.x, y: p.y + p.h, w: f.w, h: f.y + f.h - (p.y + p.h) });
    }
    this.free = next.filter((a, i) =>
      !next.some((b, j) => i !== j && inside(b, a) && (!inside(a, b) || j < i)));
  }

  insert(w: number, h: number, value: T): Placement | undefined {
    const pos = this.findPosition(w, h);
    if (!pos) return undefined;
    this.split(pos.rect);
    this.placed.push({ rect: pos.rect, value });
    return pos;
  }
}

// One frame of gear-like sprites: one vertex array, one draw call, one texture bound.
export interface SpriteEntry { x: number; y: number; w: number; h: number; sprite: number; }
export type UvRect = readonly [number, number, number, number]; // u0, v0, u1, v1 in [0, 1]

export class QuadBatch {
  private readonly verts: Float32Array; // 6 vertices x 4 floats (x, y, u, v) per quad
  constructor(readonly maxQuads: number) {
    this.verts = new Float32Array(maxQuads * 6 * 4);
  }

  get vertices(): Float32Array { return this.verts; }

  // Writes up to maxQuads entries and returns the vertex count to draw. Entries beyond the cap are dropped.
  build(entries: readonly SpriteEntry[], uvs: readonly UvRect[]): number {
    const n = Math.min(entries.length, this.maxQuads);
    let o = 0;
    for (let i = 0; i < n; i++) {
      const e = entries[i];
      const [u0, v0, u1, v1] = uvs[e.sprite];
      const x0 = e.x - e.w / 2, x1 = e.x + e.w / 2;
      const y0 = e.y - e.h / 2, y1 = e.y + e.h / 2;
      o = this.put(o, x0, y0, u0, v0);
      o = this.put(o, x1, y0, u1, v0);
      o = this.put(o, x0, y1, u0, v1);
      o = this.put(o, x1, y0, u1, v0);
      o = this.put(o, x1, y1, u1, v1);
      o = this.put(o, x0, y1, u0, v1);
    }
    return n * 6;
  }

  private put(o: number, x: number, y: number, u: number, v: number): number {
    this.verts[o] = x;
    this.verts[o + 1] = y;
    this.verts[o + 2] = u;
    this.verts[o + 3] = v;
    return o + 4;
  }
}

export {};
