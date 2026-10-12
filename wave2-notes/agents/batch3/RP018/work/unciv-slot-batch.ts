// Licence: CC0-1.0 (donor file header and LICENSE-TextureArraySpriteBatch). clean-room sketch written from the described mechanism, not a translation of the donor lines.

export interface Tex { id: number; }

// Sprite batch with a small table of texture slots (one per texture unit). Each sprite carries its slot index.
// The batch is drawn when it is full, or when a new texture needs a slot and the table is full.
export class SlotBatch {
  private slots: (Tex | null)[];
  private hits: number[];          // per slot, counted per sprite (fix: the donor counts runs of one texture)
  private used = 0;
  private pending = 0;
  flushes = 0;

  constructor(
    private units: number,
    private maxSprites: number,
    private draw: (count: number, bound: (Tex | null)[]) => void,
  ) {
    if (maxSprites > 8191) throw new Error("max 8191 sprites per batch (32767 indices / 4)");
    this.slots = new Array<Tex | null>(units).fill(null);
    this.hits = new Array<number>(units).fill(0);
  }

  begin(): void {
    this.slots.fill(null);
    this.hits.fill(0);
    this.used = 0;
    this.pending = 0;
    this.flushes = 0;
  }

  flush(): void {
    if (this.pending === 0) return;
    this.draw(this.pending, this.slots);
    this.pending = 0;
    this.flushes++;
  }

  // Adds one sprite and returns the texture slot to write into its vertices.
  addSprite(tex: Tex): number {
    if (this.pending >= this.maxSprites) this.flush();   // capacity flush, checked per sprite
    let slot = this.slots.indexOf(tex);
    if (slot < 0) {
      if (this.used < this.units) {
        slot = this.used++;
        this.slots[slot] = tex;
        this.hits[slot] = 0;
      } else {
        this.flush();                        // pending sprites still point at the slot being reused
        slot = this.evict();
        this.slots[slot] = tex;
        this.hits[slot] = this.average();    // a fair (average) chance, as in the donor
      }
    }
    this.hits[slot]++;
    this.pending++;
    return slot;
  }

  // Least used slot (the last one on ties, as the donor), then every count is halved (fix: old bursts age out).
  private evict(): number {
    let slot = 0;
    for (let i = 1; i < this.units; i++) if (this.hits[i] <= this.hits[slot]) slot = i;
    for (let i = 0; i < this.units; i++) this.hits[i] >>= 1;
    return slot;
  }

  private average(): number {
    return Math.floor(this.hits.reduce((a, b) => a + b, 0) / this.units);
  }
}

export {};
