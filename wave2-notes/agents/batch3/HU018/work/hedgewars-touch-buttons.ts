// Licence: GPL-2.0 (donor uTouch.pas header: "version 2 of the License"). Clean-room: written from the described mechanism, not a translation of the donor lines.
export interface Widget {
  id: string;
  hit: (x: number, y: number) => boolean;  // hit test in screen units
  down: () => void;                        // press command, e.g. "+attack"
  up: () => void;                          // release command, e.g. "-attack"
}

export interface Finger {
  id: number;
  x: number;
  y: number;
  startX: number;
  startY: number;
  startMs: number;
  moved: boolean;
  pressed: Widget | null;                  // the widget THIS finger pressed
}

// Donor clickTime = 200 with RealTicks (unit of RealTicks not read; taken as ms here).
export const CLICK_MS = 200;
// Donor fingerHasMoved: distance from the touch-down point greater than 30.
export const SLOP_PX = 30;

export function touchDown(f: Finger, widgets: Widget[], x: number, y: number, nowMs: number): void {
  f.x = x; f.y = y;
  f.startX = x; f.startY = y; f.startMs = nowMs;
  f.moved = false;
  const w = widgets.find(item => item.hit(x, y)) ?? null;
  f.pressed = w;
  if (w) w.down();
}

export function touchMove(f: Finger, x: number, y: number): void {
  f.x = x; f.y = y;
  if (Math.hypot(x - f.startX, y - f.startY) > SLOP_PX) f.moved = true;
}

// Returns 'tap', 'long' or null. Click classification runs first (donor order), then the release.
// The release goes to the widget this finger pressed, even if the finger has slid off it.
export function touchUp(f: Finger, nowMs: number): 'tap' | 'long' | null {
  let result: 'tap' | 'long' | null = null;
  if (!f.moved) result = nowMs - f.startMs < CLICK_MS ? 'tap' : 'long';
  if (f.pressed) {
    f.pressed.up();
    f.pressed = null;
  }
  return result;
}
export {};
