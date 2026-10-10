// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface V2 { x: number; y: number; }

// The view state: where the viewport sits in screen px, the zoom, and the "debt": how far the last clamp moved the view, in base units.
export interface ViewState { vp: V2; zoom: number; debt: V2; }

// Tile size already multiplied by zoom; w and h are the screen size of the view.
export interface Viewport { w: number; h: number; tileW: number; tileH: number; }

const add = (a: V2, b: V2): V2 => ({ x: a.x + b.x, y: a.y + b.y });
const scale = (a: V2, s: number): V2 => ({ x: a.x * s, y: a.y * s });

const MIN_ZOOM = 0.0312;
const MAX_ZOOM = 4;
const SNAP_TO_ONE = 0.01;

// The tile under the centre of the view (isometric projection).
function centreTile(s: ViewState, vw: Viewport): V2 {
  const c = add(s.vp, { x: vw.w / 2, y: vw.h / 2 });
  return { x: c.y / vw.tileH + c.x / vw.tileW, y: c.y / vw.tileH - c.x / vw.tileW };
}

// Keep the centre tile on the map (indices 1 .. len-1). If it leaves, re-centre on the clamped tile.
// Returns true when the view was moved. With keepDebt, the move is remembered so the next call can re-apply it.
export function constrain(s: ViewState, vw: Viewport, mapLen: number, keepDebt: boolean): boolean {
  if (keepDebt) s.vp = add(s.vp, scale(s.debt, s.zoom)); // re-apply the last clamp's debt first

  const c = centreTile(s, vw);
  let tx = c.x;
  let ty = c.y;
  let outside = false;
  if (tx < 1) { tx = 1; outside = true; } else if (tx > mapLen - 1) { tx = mapLen - 1; outside = true; }
  if (ty < 1) { ty = 1; outside = true; } else if (ty > mapLen - 1) { ty = mapLen - 1; outside = true; }

  if (!outside) {
    s.debt = { x: 0, y: 0 };
    return false;
  }
  const before = s.vp;
  const centre: V2 = { x: (tx - ty) * vw.tileW / 2, y: (tx + ty) * vw.tileH / 2 };
  s.vp = add(centre, { x: -vw.w / 2, y: -vw.h / 2 });
  s.debt = keepDebt ? scale(add(before, { x: -s.vp.x, y: -s.vp.y }), 1 / s.zoom) : { x: 0, y: 0 };
  return true;
}

// Wheel zoom: scale by factor, then move the view so the point under the mouse stays put.
export function zoomAt(s: ViewState, factor: number, mouse: V2, vw: Viewport, mapLen: number): void {
  let z = s.zoom * factor;
  if (z < MIN_ZOOM) z = MIN_ZOOM;
  if (z > MAX_ZOOM) z = MAX_ZOOM;
  if (Math.abs(z - 1) < SNAP_TO_ONE) z = 1;
  const f = z / s.zoom; // the clamped factor actually applied
  s.zoom = z;
  s.vp = add(scale(add(s.vp, mouse), f), scale(mouse, -1));
  constrain(s, { ...vw, tileW: vw.tileW * f, tileH: vw.tileH * f }, mapLen, true);
}

// Timed scroll: speed grows with sqrt(zoom); diagonals are normalised; holding shift multiplies by 4.
// dir components are -1, 0 or 1. elapsedSec is seconds since the last GUI tick.
export function scrollBy(s: ViewState, dir: V2, elapsedSec: number, shift: boolean, vw: Viewport, mapLen: number): void {
  if (dir.x === 0 && dir.y === 0) return;
  let amt = elapsedSec * 1000 * 0.5 * Math.sqrt(s.zoom);
  if (shift) amt *= 4;
  const r = vw.tileW / vw.tileH;
  const norm = Math.hypot(dir.x * Math.sqrt(r), dir.y);
  s.vp = add(s.vp, { x: dir.x * r * amt / norm, y: dir.y * amt / norm });
  constrain(s, vw, mapLen, false); // a key or edge scroll clears the debt
}
export {};
