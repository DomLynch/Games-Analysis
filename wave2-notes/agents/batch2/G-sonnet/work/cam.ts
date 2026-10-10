interface CamSettings {
  fixedDtMs: number;      // fixed step, donor default 10
  scrollSpeed: number;    // manual pan, px per second at zoom 1 (donor 1200)
  zoomSpeed: number;      // donor 100: fraction per step = dt * zoomSpeed / 10000
  minZoom: number;
  maxZoom: number;
}

interface Rect { l: number; t: number; r: number; b: number; }

class FollowCamera {
  x = 0; y = 0;             // top-left of the view in world px
  zoom = 1; targetZoom = 1;
  private zoomAnchor = { x: 0.5, y: 0.5 }; // fraction of the screen that stays put
  private autoActive = false;
  private autoCanStop = false;
  private autoSpeed = 0;
  private autoOx = 0; private autoOy = 0;   // remaining distance to travel
  private accumMs = 0;
  manualX = 0; manualY = 0;                  // -1, 0, 1 per axis from input
  bounds: Rect | null = null;

  constructor(private s: CamSettings, public screenW: number, public screenH: number) {}

  // Retarget: add the remaining offset so a new target during a glide is not lost.
  scrollTo(dx: number, dy: number, speed: number, canStop: boolean): void {
    if (!this.autoActive) { this.autoActive = true; this.autoOx = 0; this.autoOy = 0; }
    this.autoCanStop = canStop; this.autoSpeed = speed;
    this.autoOx += dx; this.autoOy += dy;
  }

  setZoomTarget(z: number, anchorX: number, anchorY: number): void {
    this.targetZoom = z; this.zoomAnchor = { x: anchorX, y: anchorY };
  }

  // Called once per render frame with real elapsed ms; runs 0..10 fixed steps.
  update(frameMs: number): void {
    this.accumMs += frameMs;
    const step = this.s.fixedDtMs;
    if (this.accumMs >= step) {
      this.accumMs = Math.min(this.accumMs, step * 10) - step; // donor: cap, then take one step
      this.processZoom(step);
      this.processScroll(step);
    }
  }

  private processScroll(dt: number): void {
    const manual = this.manualX !== 0 || this.manualY !== 0;
    if (manual && this.autoCanStop) this.autoActive = false;
    let sx = 0, sy = 0;
    if (this.autoActive) {
      const k = (this.autoSpeed / 10000) * dt;   // fraction of remaining distance per step
      sx = this.autoOx * k; sy = this.autoOy * k;
      this.autoOx -= sx; this.autoOy -= sy;
      if (Math.hypot(this.autoOx, this.autoOy) < 0.001) this.autoActive = false;
    } else {
      if (!manual) return;
      const px = (this.s.scrollSpeed / 1000 / this.zoom) * dt;
      sx = this.manualX * px; sy = this.manualY * px;
    }
    this.scrollBy(sx, sy);
  }

  private processZoom(dt: number): void {
    if (this.zoom === this.targetZoom) return;
    const target = Math.min(this.s.maxZoom, Math.max(this.minZoom(), this.targetZoom));
    this.targetZoom = target;
    let next = this.zoom + (target - this.zoom) * (dt * this.s.zoomSpeed / 10000);
    if (Math.abs(next - target) < 0.001) next = target;
    this.setZoom(next);
  }

  private setZoom(z: number): void {
    const oldW = this.screenW / this.zoom, oldH = this.screenH / this.zoom;
    this.zoom = z;
    const dw = this.screenW / z - oldW, dh = this.screenH / z - oldH;
    this.scrollBy(-dw * this.zoomAnchor.x, -dh * this.zoomAnchor.y);
  }

  private minZoom(): number {
    if (!this.bounds) return this.s.minZoom;
    const w = this.bounds.r - this.bounds.l, h = this.bounds.b - this.bounds.t;
    return Math.min(this.s.maxZoom, Math.max(this.s.minZoom, this.screenW / w * 1.1, this.screenH / h * 1.1));
  }

  private scrollBy(dx: number, dy: number): void {
    this.x += dx; this.y += dy;
    const b = this.bounds;
    if (!b) return;
    const vw = this.screenW / this.zoom, vh = this.screenH / this.zoom;
    if (this.x < b.l) this.x = b.l;
    if (this.y < b.t) this.y = b.t;
    if (this.x + vw > b.r) this.x = b.r - vw;
    if (this.y + vh > b.b) this.y = b.b - vh;
  }
}
export {};
