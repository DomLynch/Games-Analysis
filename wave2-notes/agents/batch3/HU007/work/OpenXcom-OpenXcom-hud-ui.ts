// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

const DRAG_TIME_TOLERANCE_MS = 300; // data: donor default for a short press that counts as a click
const DRAG_PIXEL_TOLERANCE = 10;    // data: donor default; total motion that turns a press into a drag
const DRAG_DIVISOR = 4;             // data: pixels of pointer motion per cell of camera motion

interface Cam { x: number; y: number; }
interface Limits { minX: number; maxX: number; minY: number; maxY: number; }

class DragScroll {
  private anchor: Cam = { x: 0, y: 0 };
  private accX = 0;
  private accY = 0;
  private totalX = 0;
  private totalY = 0;
  private overThreshold = false;
  private startMs = 0;
  active = false;

  press(cam: Cam, nowMs: number): void {
    this.active = true;
    this.anchor = { x: cam.x, y: cam.y };
    this.accX = 0;
    this.accY = 0;
    this.totalX = 0;
    this.totalY = 0;
    this.overThreshold = false;
    this.startMs = nowMs;
  }

  // dx, dy: pointer motion since the last event (grab style: the map moves with the pointer).
  // A step that would leave the limits is rolled back in the accumulator, per axis, not clamped.
  move(dx: number, dy: number, lim: Limits): Cam {
    this.totalX += dx;
    this.totalY += dy;
    if (!this.overThreshold) {
      this.overThreshold = Math.abs(this.totalX) > DRAG_PIXEL_TOLERANCE || Math.abs(this.totalY) > DRAG_PIXEL_TOLERANCE;
    }
    this.accX -= dx;
    this.accY -= dy;
    let x = this.anchor.x + Math.trunc(this.accX / DRAG_DIVISOR);
    let y = this.anchor.y + Math.trunc(this.accY / DRAG_DIVISOR);
    if (x < lim.minX || x > lim.maxX) {
      this.accX += dx;
      x = this.anchor.x + Math.trunc(this.accX / DRAG_DIVISOR);
    }
    if (y < lim.minY || y > lim.maxY) {
      this.accY += dy;
      y = this.anchor.y + Math.trunc(this.accY / DRAG_DIVISOR);
    }
    return { x, y };
  }

  // Release: a press that never crossed the threshold and was short is a click, so the camera goes back
  // to where the press started. The caller then runs its own click action.
  release(nowMs: number): { wasClick: boolean; restore: Cam | null } {
    const wasClick = !this.overThreshold && nowMs - this.startMs <= DRAG_TIME_TOLERANCE_MS;
    this.active = false;
    return { wasClick, restore: wasClick ? { x: this.anchor.x, y: this.anchor.y } : null };
  }
}

export {};
