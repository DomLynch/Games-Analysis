// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Tile {
  x: number;
  y: number;
  visible: boolean;
  built: boolean;      // a construction stands here
  reporting: boolean;  // the tile reports a construction that is not standing
  footprint: number;   // tiles wide, from the construction group
  colour: number;      // packed colour from the construction group
}

export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  colour: number;
}

export class MinimapModel {
  private dirty = true;     // donor: mFullRefresh
  private cache: Rect[] = []; // stands in for the render-target texture
  anchorX = 1;              // top-left map tile shown by the minimap
  anchorY = 1;

  constructor(
    readonly mapLen: number,   // the map is mapLen x mapLen tiles
    readonly viewW: number,    // minimap size in pixels
    readonly viewH: number,
    readonly tilePx: number,   // pixels per tile (from the layout file; value not read)
  ) {}

  // Called when the map changed (world flag at a GUI tick, or on a new month).
  markDirty(): void {
    this.dirty = true;
  }

  // Rebuild the cache only when dirty; one rectangle per visible tile.
  private refresh(tiles: Tile[]): void {
    this.cache = [];
    for (const t of tiles) {
      if (!t.visible) continue;
      if (t.reporting && !t.built) continue;
      this.cache.push({
        x0: t.x - 1,
        y0: t.y - 1,
        x1: t.x - 1 + t.footprint,
        y1: t.y - 1 + t.footprint,
        colour: t.colour,
      });
    }
    this.dirty = false;
  }

  // Draw path: rebuild if dirty, then paint the cache.
  draw(tiles: Tile[], paint: (r: Rect) => void): void {
    if (this.dirty) this.refresh(tiles);
    for (const r of this.cache) paint(r);
  }

  // Centre the minimap on the main view's visible corners, then clamp.
  centreOn(ulx: number, uly: number, lrx: number, lry: number): void {
    this.anchorX = (ulx + lrx - this.viewW / this.tilePx) / 2;
    this.anchorY = (uly + lry - this.viewH / this.tilePx) / 2;
    this.clamp();
  }

  // Keep the window inside the map. Fix: the x upper bound is compared with the x bound
  // (the donor compares anchor.x with the y bound on one line, so a non-square minimap is not clamped).
  clamp(): void {
    const minX = 1;
    const minY = 1;
    const maxX = this.mapLen - 1 - this.viewW / this.tilePx;
    const maxY = this.mapLen - 1 - this.viewH / this.tilePx;
    this.anchorX = minX > maxX ? (minX + maxX) / 2 : Math.min(Math.max(this.anchorX, minX), maxX);
    this.anchorY = minY > maxY ? (minY + maxY) / 2 : Math.min(Math.max(this.anchorY, minY), maxY);
  }

  // Left click on the minimap: the tile under the pointer becomes the main view's target.
  tileAt(px: number, py: number, border: number): { x: number; y: number } {
    return {
      x: Math.floor((px - border) / this.tilePx + this.anchorX),
      y: Math.floor((py - border) / this.tilePx + this.anchorY),
    };
  }
}

export {};
