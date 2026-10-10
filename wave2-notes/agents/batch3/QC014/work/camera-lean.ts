// clean-room sketch of the cursor-lean step (donor: Camera.cs 189-224, BSD-2-Clause). Written from the described shape, not copied.
const MAX_LEAN_PX = 250;     // cap at zoom 1
const MIN_SPEED = 0.01;      // per-frame floor, as in the donor
const TIME_FACTOR = 5;       // approach speed per second, multiplied by dt

const outQuad = (t: number): number => 1 - (1 - t) * (1 - t);
const outQuart = (t: number): number => 1 - Math.pow(1 - t, 4);

interface V2 { x: number; y: number; }

interface LookInput {
  mouse: V2;          // cursor in view pixels, origin at view top-left
  viewW: number;      // view width in pixels (sets the origin)
  viewH: number;      // view height in pixels
  zoom: number;       // donor Camera.Zoom; the scale is 1 / zoom
  looking: boolean;   // look key held
  backwards: boolean; // look-backwards variant
  dt: number;         // seconds since last frame
}

// Returns the new lean in pixels; the caller applies it after the zoom scale, subtracted from the view.
function stepLean(lean: V2, i: LookInput): V2 {
  const origin: V2 = { x: i.viewW * 0.5, y: i.viewH * 0.5 };
  let target: V2 = { x: 0, y: 0 };

  if (i.looking) {
    let m: V2 = { x: i.mouse.x, y: i.mouse.y };
    if (i.backwards) {
      m = { x: 2 * origin.x - m.x, y: 2 * origin.y - m.y };
    }
    const dx = m.x - origin.x;
    const dy = m.y - origin.y;
    const len = Math.hypot(dx, dy);
    if (len > 0) {
      const frac = Math.min(len / (i.viewH / 2), 1);
      const mag = (outQuad(frac) * MAX_LEAN_PX) / i.zoom;
      target = { x: (dx / len) * mag, y: (dy / len) * mag };
    }
  }

  const dist = Math.hypot(target.x - lean.x, target.y - lean.y);
  if (dist > 1) {
    const speed = Math.min(1, Math.max(outQuart(dist / MAX_LEAN_PX) * i.dt * TIME_FACTOR, MIN_SPEED));
    return { x: lean.x + (target.x - lean.x) * speed, y: lean.y + (target.y - lean.y) * speed };
  }
  return target;
}

export {};
