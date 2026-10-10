// Licence: MIT (donor, amilich, 2025). Code may be adapted with attribution; this sketch is written from the mechanism.
interface View { offset: { x: number; y: number }; zoom: number; }
interface Bounds { minX: number; maxX: number; minY: number; maxY: number; }

const ZOOM_MIN = 0.3, ZOOM_MAX = 5;
const PAD = 100;             // screen px of over-scroll kept inside the canvas
const WHEEL_BASE = 0.05;     // zoom step at zoom 1, scaled by max(0.5, zoom)
const KEY_PAN_PX_PER_S = 520;
const DRAG_THRESHOLD_PX = 6;

// Scroll bounds for the current zoom. Map edges are in world units, so the limits scale with zoom.
function mapBounds(gridN: number, tileW: number, tileH: number, zoom: number, canvasW: number, canvasH: number): Bounds {
  const left = -(gridN - 1) * tileW / 2;
  const right = (gridN - 1) * tileW / 2;
  const bottom = (gridN - 1) * tileH;
  return {
    minX: PAD - right * zoom,
    maxX: canvasW - PAD - left * zoom,
    minY: PAD - bottom * zoom,
    maxY: canvasH - PAD,       // top edge is world y = 0
  };
}

function clampOffset(o: { x: number; y: number }, b: Bounds): { x: number; y: number } {
  return { x: Math.max(b.minX, Math.min(b.maxX, o.x)), y: Math.max(b.minY, Math.min(b.maxY, o.y)) };
}

// Wheel zoom about the cursor: the world point under the cursor stays under it, then the result is clamped.
function wheelZoom(v: View, deltaY: number, mx: number, my: number, bounds: (z: number) => Bounds): View {
  const step = WHEEL_BASE * Math.max(0.5, v.zoom);
  const z = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, v.zoom + (deltaY > 0 ? -step : step)));
  if (z === v.zoom) return v;
  const wx = (mx - v.offset.x) / v.zoom;
  const wy = (my - v.offset.y) / v.zoom;
  const raw = { x: mx - wx * z, y: my - wy * z };
  return { zoom: z, offset: clampOffset(raw, bounds(z)) };
}

// Keyboard pan: a fixed screen-pixel speed per second, with the frame step capped at 50 ms, then clamped.
function keyPan(v: View, dirX: number, dirY: number, frameSec: number, bounds: (z: number) => Bounds): View {
  const dt = Math.min(frameSec, 0.05);
  const raw = { x: v.offset.x + dirX * KEY_PAN_PX_PER_S * dt, y: v.offset.y + dirY * KEY_PAN_PX_PER_S * dt };
  return { zoom: v.zoom, offset: clampOffset(raw, bounds(v.zoom)) };
}

// A press becomes a pan only after the pointer has moved past the threshold on either axis.
function panStarted(startX: number, startY: number, x: number, y: number): boolean {
  return Math.abs(x - startX) >= DRAG_THRESHOLD_PX || Math.abs(y - startY) >= DRAG_THRESHOLD_PX;
}
export {}
