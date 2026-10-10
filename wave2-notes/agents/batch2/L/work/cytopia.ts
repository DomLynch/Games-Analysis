// Licence: GPL-3.0 (donor, license.txt). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Pt { x: number; y: number }

class StepCamera {
  offset: Pt = { x: 0, y: 0 };  // world->screen shift, in screen pixels at the current zoom
  zoom = 1;
  canMove = true;
  canScale = true;
  private pinchAcc = 0;
  private centre: Pt = { x: 0, y: 0 }; // logical point kept in the middle of the screen

  constructor(
    private screen: Pt,
    private tile: Pt,                       // world unit size at zoom 1
    private toScreen: (p: Pt, zoom: number) => Pt, // world -> screen pixels, no offset
    private fromScreen: (p: Pt, offset: Pt, zoom: number) => Pt,
    private inBounds: (p: Pt) => boolean,
    private onViewChanged: () => void,      // e.g. recompute the visible set
    private minZoom = 0.5, private maxZoom = 4, private zoomStep = 0.5,
    private pinchThreshold = 0.25,
  ) {}

  centreOn(p: Pt): void {
    if (!this.inBounds(p)) return;         // out-of-bounds targets are ignored, camera stays
    this.centre = p;
    const s = this.toScreen(p, this.zoom);
    this.offset = {
      x: Math.trunc(s.x + this.tile.x * this.zoom * 0.5 - this.screen.x * 0.5 - this.tile.x * this.zoom * 0.75),
      y: Math.trunc(s.y + this.tile.y * this.zoom * 0.25 - this.screen.y * 0.5 - this.tile.y * this.zoom),
    };
    this.onViewChanged();
  }

  zoomIn(): void { this.stepZoom(+this.zoomStep, this.zoom < this.maxZoom); }
  zoomOut(): void { this.stepZoom(-this.zoomStep, this.zoom > this.minZoom); }

  private stepZoom(delta: number, allowed: boolean): void {
    if (!this.canScale || !allowed) return;
    this.zoom += delta;
    this.centreOn(this.centre);            // zoom is always about the stored centre
  }

  // Pinch deltas accumulate; only a full threshold crossing moves one discrete zoom step.
  pinch(delta: number, at: Pt): void {
    this.pinchAcc += delta;
    if (this.pinchAcc > this.pinchThreshold) {
      this.pinchAcc = 0;
      if (this.zoom < this.maxZoom) this.centreOn(at);
      this.zoomIn();
    } else if (this.pinchAcc < -this.pinchThreshold) {
      this.pinchAcc = 0;
      if (this.zoom > this.minZoom) this.centreOn(at);
      this.zoomOut();
    }
  }

  pan(dx: number, dy: number): void {
    if (!this.canMove) return;
    this.offset = { x: this.offset.x - dx, y: this.offset.y - dy };
    this.onViewChanged();
    this.centre = this.fromScreen({ x: this.screen.x / 2, y: this.screen.y / 2 }, this.offset, this.zoom);
  }

  // Key pan: clamp is tested BEFORE the move, so one step can overshoot; drag pan() has no clamp.
  keyPanUp(): void {
    if (this.offset.y > -2 * this.screen.y * this.zoom) this.pan(0, this.screen.y / 16);
  }

  // A modal menu locks both pan and zoom; closing the last one unlocks.
  setModalOpen(open: boolean): void { this.canMove = !open; this.canScale = !open; }
}
export {};
