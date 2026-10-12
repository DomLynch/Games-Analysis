// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Shelf {
  y: number;       // top row of the shelf
  height: number;  // height set by the first glyph that opened the shelf (plus padding)
  used: number;    // width already taken on this shelf (plus padding)
}

export class ShelfAtlas {
  private readonly shelves: Shelf[] = [];
  private readonly entries = new Map<string, Rect>();
  private dirty: { x0: number; y0: number; x1: number; y1: number } | null = null;

  constructor(
    readonly width = 1024,
    readonly height = 1024,
    private readonly pad = 1, // one pixel on the right and bottom of each glyph
  ) {}

  // Returns the rectangle for `key`, packing the glyph if it is new. Throws when the atlas is full.
  get(key: string, w: number, h: number): Rect {
    const hit = this.entries.get(key);
    if (hit) return hit;

    const rw = w + this.pad;
    const rh = h + this.pad;
    if (rw > this.width) throw new Error(`glyph ${key} is wider than the atlas`); // fail at once, open no shelf for it

    // first fit: shelves in creation order, the first one with height and width to spare
    let shelf = this.shelves.find((s) => rh <= s.height && this.width - s.used >= rw);
    if (!shelf) {
      const last = this.shelves[this.shelves.length - 1];
      const top = last ? last.y + last.height : 0;
      if (top + rh > this.height) throw new Error("atlas is full"); // the donor tests with a strict > here
      shelf = { y: top, height: rh, used: 0 };
      this.shelves.push(shelf);
    }

    const rect: Rect = { x: shelf.used, y: shelf.y, w, h };
    shelf.used += rw;
    this.entries.set(key, rect);
    this.markDirty(rect);
    return rect;
  }

  // Once per frame, before drawing: the changed rectangle to upload, or null when nothing changed.
  // The caller uploads only these rows (with a row length), not the whole texture.
  takeDirty(): { x0: number; y0: number; x1: number; y1: number } | null {
    const d = this.dirty;
    this.dirty = null;
    return d;
  }

  private markDirty(r: Rect): void {
    const x1 = r.x + r.w;
    const y1 = r.y + r.h;
    if (!this.dirty) {
      this.dirty = { x0: r.x, y0: r.y, x1, y1 };
    } else {
      this.dirty = {
        x0: Math.min(this.dirty.x0, r.x),
        y0: Math.min(this.dirty.y0, r.y),
        x1: Math.max(this.dirty.x1, x1),
        y1: Math.max(this.dirty.y1, y1),
      };
    }
  }
}

export {};
