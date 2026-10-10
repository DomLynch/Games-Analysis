// Licence: dual, GPL-2.0 or the "Angband licence" (donor, ui-output.c header). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Axis {
  offset: number;   // first world cell shown on this axis
  span: number;     // cells shown on this axis
  world: number;    // world size on this axis
}

export interface Cam { py: number; px: number; }

const MARGIN = 3;   // scroll when the player is this many cells from an edge

// Keep the view inside the world: min first, then max 0 (the donor's order).
function clampAxis(offset: number, world: number, span: number): number {
  return Math.max(0, Math.min(offset, world - span));
}

// One axis: recentre on the player when the player is not centred (option on, not running)
// or has come within MARGIN of an edge. Otherwise the view stays put.
function followAxis(a: Axis, p: number, centered: boolean, running: boolean): number {
  const half = Math.floor(a.span / 2);
  if (centered && !running && p !== a.offset + half) return p - half;
  if (p < a.offset + MARGIN || p >= a.offset + a.span - MARGIN) return p - half;
  return a.offset;
}

// The view that verify_panel would set: follow, then clamp both axes to the world.
export function verifyView(y: Axis, x: Axis, cam: Cam, centered: boolean, running: boolean): { y: number; x: number } {
  const wy = followAxis(y, cam.py, centered, running);
  const wx = followAxis(x, cam.px, centered, running);
  return {
    y: clampAxis(wy, y.world, y.span),
    x: clampAxis(wx, x.world, x.span),
  };
}

// Shift by half a screen in one direction (change_panel): the offset moves, then is clamped.
export function shiftView(y: Axis, x: Axis, dy: number, dx: number): { y: number; x: number } {
  const stepY = Math.trunc((dy * y.span) / 2);
  const stepX = Math.trunc((dx * x.span) / 2);
  return {
    y: clampAxis(y.offset + stepY, y.world, y.span),
    x: clampAxis(x.offset + stepX, x.world, x.span),
  };
}


export {};
