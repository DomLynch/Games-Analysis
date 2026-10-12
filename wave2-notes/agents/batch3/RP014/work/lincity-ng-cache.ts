// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Tile { x: number; y: number; }
interface Painter {
  createTarget(w: number, h: number): number;   // returns a target id
  pushTarget(id: number): void;
  popTarget(): void;
  drawTile(t: Tile): void;
  blit(id: number): void;
}
interface Window { x0: number; x1: number; y0: number; y1: number; }

// Tile window the view needs. ul/ur/ll are the tiles under three viewport corners.
// pad = the tallest prop in tiles, so a tall prop anchored just off-screen still draws.
function visibleWindow(ul: Tile, ur: Tile, ll: Tile, pad: number): Window {
  return { x0: ul.x - pad, x1: ur.x + pad, y0: ur.y - pad, y1: ll.y + pad };
}

class CachedLayer {
  private dirty = true;          // starts dirty so the first frame renders
  private target = -1;
  constructor(private painter: Painter, private w: number, private h: number) {}

  // Call on anything that changes the picture: pan, zoom, resize, a sim update, an animation tick.
  markDirty(): void { this.dirty = true; }

  draw(win: Window): void {
    if (this.dirty) {
      if (this.target < 0) this.target = this.painter.createTarget(this.w, this.h);
      this.painter.pushTarget(this.target);
      for (let y = win.y0; y <= win.y1; y++)
        for (let x = win.x0; x <= win.x1; x++) this.painter.drawTile({ x, y });
      this.painter.popTarget();
      this.dirty = false;
    }
    this.painter.blit(this.target);   // every frame: one blit of the cached target
  }
}

export {};
