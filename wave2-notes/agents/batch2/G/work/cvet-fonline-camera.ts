// Licence: MIT (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface V2 { x: number; y: number }
interface Bounds { minX: number; minY: number; maxX: number; maxY: number }

const ZOOM_MAX = 20;
const ZOOM_FLOOR = 0.05;
const NEAR = 0.001;

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t; // assumed form; donor lerp body not read
const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-6;

class FightCamera {
  scroll: V2 = { x: 0, y: 0 };      // world point at the top-left of the view
  pending: V2 = { x: 0, y: 0 };     // travel still owed to the current pan
  panning = false;
  panSpeed = 0;
  panCanStop = false;
  zoom = 1;
  zoomTarget = 1;
  zoomAnchor: V2 = { x: 0.5, y: 0.5 };
  zoomSpeed = 0;
  minZoom = ZOOM_FLOOR;
  scrollCheck = true;

  constructor(private screen: V2, private bounds: Bounds) {}

  // Donor ScrollToHex: cancel any pan in progress, then start a new one from the current scroll.
  scrollTo(target: V2, speed: number, canStop: boolean): void {
    this.panning = false;
    this.applyOffset({ x: target.x - this.scroll.x, y: target.y - this.scroll.y }, speed, canStop);
  }

  // Donor ApplyScrollOffset: start a pan if none runs, otherwise add to the travel still owed.
  applyOffset(delta: V2, speed: number, canStop: boolean): void {
    if (!this.panning) {
      this.panning = true;
      this.pending = { x: 0, y: 0 };
    }
    this.panSpeed = speed;
    this.panCanStop = canStop;
    this.pending = { x: this.pending.x + delta.x, y: this.pending.y + delta.y };
  }

  // Donor ProcessScroll (automatic branch): each frame move a fixed share of the owed travel; stop when under 0.001 is owed.
  stepPan(dt: number, manualInput: boolean): void {
    if (manualInput && this.panCanStop) {
      this.panning = false;
    }
    if (!this.panning) {
      return;
    }
    const share = (this.panSpeed / 10000) * dt;
    const step: V2 = { x: lerp(0, this.pending.x, share), y: lerp(0, this.pending.y, share) };
    this.pending = { x: this.pending.x - step.x, y: this.pending.y - step.y };
    this.instantScroll(step);
    if (Math.hypot(this.pending.x, this.pending.y) < NEAR) {
      this.panning = false;
    }
  }

  // Donor ChangeZoom: store the target and the anchor; the easing happens in stepZoom.
  changeZoom(target: number, anchor: V2): void {
    this.zoomAnchor = anchor;
    this.zoomTarget = target;
  }

  // Donor ProcessZoom: clamp the target, ease toward it, snap when within 0.001.
  stepZoom(dt: number): void {
    const init = this.zoom;
    if (near(init, this.zoomTarget)) {
      return;
    }
    const min = this.scrollCheck ? this.minZoom : ZOOM_FLOOR;
    const target = clamp(this.zoomTarget, min, ZOOM_MAX);
    this.zoomTarget = target;
    if (near(init, target)) {
      return;
    }
    if (init >= min && init <= ZOOM_MAX) {
      let next = lerp(init, target, dt * this.zoomSpeed / 10000);
      if (Math.abs(next - target) < NEAR) {
        next = target;
      }
      this.instantZoom(next, this.zoomAnchor);
    } else {
      this.instantZoom(target, this.zoomAnchor);
    }
  }

  // Donor InstantZoom: change the zoom, then move the scroll so the point under the anchor stays put.
  instantZoom(newZoom: number, anchor: V2): void {
    const init = this.zoom;
    this.zoom = newZoom;
    const dw = this.screen.x / newZoom - this.screen.x / init;
    const dh = this.screen.y / newZoom - this.screen.y / init;
    this.instantScroll({ x: -dw * anchor.x, y: -dh * anchor.y });
  }

  // Donor InstantScroll: add the move, then push the visible rectangle back inside the bounds.
  instantScroll(d: V2): void {
    this.scroll = { x: this.scroll.x + d.x, y: this.scroll.y + d.y };
    if (!this.scrollCheck) {
      return;
    }
    const lt = { x: this.scroll.x, y: this.scroll.y };
    const rb = { x: this.scroll.x + this.screen.x / this.zoom, y: this.scroll.y + this.screen.y / this.zoom };
    const b = this.bounds;
    if (lt.x - b.minX < 0) this.scroll.x -= lt.x - b.minX;
    if (lt.y - b.minY < 0) this.scroll.y -= lt.y - b.minY;
    if (rb.x - b.maxX >= 0) this.scroll.x -= rb.x - b.maxX + NEAR;
    if (rb.y - b.maxY >= 0) this.scroll.y -= rb.y - b.maxY + NEAR;
  }

  // Donor RefreshMinZoom: the smallest zoom that still fits the bounds, with a 1.1 bias, capped at ZOOM_MAX.
  refreshMinZoom(): void {
    const b = this.bounds;
    if (b.maxX <= b.minX || b.maxY <= b.minY) {
      this.minZoom = ZOOM_FLOOR;
      return;
    }
    const bias = 1.1;
    let min = Math.max(this.screen.x / (b.maxX - b.minX) * bias, this.screen.y / (b.maxY - b.minY) * bias);
    if (min > 1) {
      min = ZOOM_FLOOR; // donor rule for non-mapper mode; the mapper flag is not modelled here
    }
    this.minZoom = Math.min(min, ZOOM_MAX);
    if (this.scrollCheck) {
      this.zoomTarget = Math.max(this.minZoom, this.zoomTarget);
    }
  }
}
export {};
