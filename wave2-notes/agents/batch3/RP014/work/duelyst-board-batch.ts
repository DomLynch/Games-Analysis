// Licence: CC0-1.0 (donor repo, package.json and LICENSE). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Quality = 0 | 1;   // 0 = LOW: the batch is tilted directly; 1 = HIGH: the batch is drawn offscreen, then composited once with the tilt
interface Tile { id: number; x: number; y: number; }
interface Gfx {
  clearPass(): void;
  drawBatch(tiles: Tile[]): void;          // one draw call for every board tile
  compositeWithTilt(): void;               // one textured quad from the offscreen pass, tilt applied once
  drawBatchTilted(tiles: Tile[]): void;    // LOW path: the batch carries the tilt itself
}

// Static board tiles are kept in one batch list, not drawn as separate nodes.
class BoardBatch {
  private tiles: Tile[] = [];
  constructor(private gfx: Gfx, private quality: Quality) {}

  add(t: Tile): void {
    this.tiles.push(t);
  }

  setQuality(q: Quality): void {
    this.quality = q;
  }

  // Called once per frame. Nothing is cached: HIGH re-draws the whole batch every frame.
  frame(): void {
    if (this.tiles.length === 0) return;   // donor: skip when the batch has no quads
    if (this.quality === 1) {
      this.gfx.clearPass();
      this.gfx.drawBatch(this.tiles);
      this.gfx.compositeWithTilt();
    } else {
      this.gfx.drawBatchTilted(this.tiles);
    }
  }
}

export {};
