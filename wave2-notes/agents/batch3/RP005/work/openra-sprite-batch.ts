// Licence: GPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Blend = "none" | "alpha" | "additive";

interface Span { start: number; count: number; blend: Blend; }

interface Submission { slots: number[]; spans: Span[]; quads: number; }

// One batch = one vertex buffer of quads. maxQuads is the vertex budget / 4; maxSlots is the texture-unit cap.
class SpriteBatch {
  readonly submitted: Submission[] = [];
  private quads = 0;
  private slots: number[] = [];
  private spans: Span[] = [];

  constructor(private readonly maxQuads: number, private readonly maxSlots: number) {}

  draw(atlas: number, blend: Blend): void {
    // 1. Budget: a full vertex buffer flushes before the new quad is written.
    if (this.quads + 1 > this.maxQuads) this.flush();

    // 2. Texture slot: a new atlas needs a free slot; if none is free, flush and start again.
    if (this.slots.indexOf(atlas) < 0) {
      if (this.slots.length >= this.maxSlots) this.flush();
      this.slots.push(atlas);
    }

    // 3. Blend run: a new span starts only when the blend mode changes; otherwise the span grows.
    const last = this.spans[this.spans.length - 1];
    if (last === undefined || last.blend !== blend) this.spans.push({ start: this.quads, count: 1, blend });
    else last.count++;
    this.quads++;
  }

  flush(): void {
    if (this.quads === 0) return;
    this.submitted.push({ slots: [...this.slots], spans: this.spans.map((s) => ({ ...s })), quads: this.quads });
    this.quads = 0;
    this.slots = [];
    this.spans = [];
  }
}

// Renderer owns which batch is live. Switching batches flushes the old one first, so the
// world batch and the UI batch never interleave inside one GPU buffer.
class Renderer {
  private current: SpriteBatch | null = null;

  drawSprite(batch: SpriteBatch, atlas: number, blend: Blend): void {
    if (this.current !== batch) {
      this.current?.flush();
      this.current = batch;
    }
    batch.draw(atlas, blend);
  }
}

// Donor values: 8192 vertices -> 2048 quads; 8 texture units.
const world = new SpriteBatch(8192 / 4, 8);
const ui = new SpriteBatch(8192 / 4, 8);
const r = new Renderer();
r.drawSprite(world, 0, "alpha");
r.drawSprite(world, 1, "alpha");
r.drawSprite(ui, 2, "alpha");
r.drawSprite(world, 0, "additive");
world.flush();
ui.flush();
export {};
