// Donor licence: Apache-2.0 (permissive; code may be adapted). This sketch is written from the described shape, not translated.
export interface Vec3 { x: number; y: number; z: number }

export interface Plate {
  id: number;
  pos: Vec3;          // entity position, used for the view-distance test
  head: Vec3;         // point above the head that the label is drawn at
  isLocal: boolean;
  hoverOrTarget: boolean;
}

// Local player and hover/target are always shown; others need distance and a camera check.
export function plateVisible(p: Plate, self: Vec3, viewDist: number, inView: (v: Vec3) => boolean): boolean {
  if (p.isLocal || p.hoverOrTarget) return true;
  const dx = p.pos.x - self.x, dy = p.pos.y - self.y, dz = p.pos.z - self.z;
  if (Math.sqrt(dx * dx + dy * dy + dz * dz) > viewDist) return false;
  return inView(p.head);
}

// Fix: reuse one hit list per tick instead of allocating a new array (donor allocates via SphereCastAll).
// Linear scan here; a spatial hash would replace it.
export class DiscoverBuffer {
  private hits: number[] = [];
  collect(entities: { id: number; pos: Vec3 }[], self: Vec3, radius: number): number[] {
    this.hits.length = 0;
    const r2 = radius * radius;
    for (const e of entities) {
      const dx = e.pos.x - self.x, dy = e.pos.y - self.y, dz = e.pos.z - self.z;
      if (dx * dx + dy * dy + dz * dz <= r2) this.hits.push(e.id);
    }
    return this.hits;
  }
}

// Pixel lock with hysteresis: keep the last pixel while the raw position stays inside the hold band.
export class PixelSnap {
  private last = new Map<number, { x: number; y: number }>();
  constructor(public hysteresisPx = 0.75) {}

  // depth: distance used for the near-target band (metres). Returns the pixel to draw at.
  snap(id: number, raw: number, axis: "x" | "y", depth: number): number {
    let hold = Math.max(0.51, this.hysteresisPx);
    if (depth > 0.01 && depth < 2.5) hold = Math.max(hold, 1.4 / Math.max(0.45, depth));
    const candidate = Math.round(raw);
    let s = this.last.get(id);
    // Fix: each axis is seeded on its own; the donor seeds both axes with the x value on first sight.
    if (s === undefined) { s = { x: NaN, y: NaN }; this.last.set(id, s); }
    const prev = axis === "x" ? s.x : s.y;
    const out = Number.isNaN(prev) || Math.abs(raw - prev) >= hold ? candidate : prev;
    if (axis === "x") s.x = out; else s.y = out;
    return out;
  }
  clear(id: number): void { this.last.delete(id); }
}

// One shared glyph batch per draw group: quads are written straight into a growing Float32Array
// (4 floats per vertex: x, y, depth, palette index), so there is no second scratch copy per frame.
export class GlyphBatch {
  private data = new Float32Array(0);
  private floats = 0;
  quadCount = 0;

  beginFrame(): void { this.floats = 0; this.quadCount = 0; }

  addQuad(x1: number, y1: number, x2: number, y2: number, depth: number, colour: number): void {
    x1 = Math.floor(x1); y1 = Math.floor(y1); x2 = Math.floor(x2); y2 = Math.floor(y2);
    if (x2 <= x1 || y2 <= y1) return;
    const need = this.floats + 16;
    if (need > this.data.length) this.grow(need);
    const corners = [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
    for (const [x, y] of corners) {
      this.data[this.floats++] = x;
      this.data[this.floats++] = y;
      this.data[this.floats++] = depth;
      this.data[this.floats++] = colour;
    }
    this.quadCount++;
  }

  // Capacity doubles from 1024 floats (256 vertices), so it is always a power of two.
  private grow(need: number): void {
    let cap = Math.max(1024, this.data.length);
    while (cap < need) cap *= 2;
    const next = new Float32Array(cap);
    next.set(this.data.subarray(0, this.floats));
    this.data = next;
  }

  // The GPU upload would take data.subarray(0, floats); the batch is empty if quadCount is 0.
  view(): Float32Array { return this.data.subarray(0, this.floats); }
}

// Draw-call budget: one call per non-empty batch. Text is one batch; bubbles are up to three.
export function drawCallCount(batches: GlyphBatch[]): number {
  return batches.filter((b) => b.quadCount > 0).length;
}
