// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface WorldRect { x: number; y: number; w: number; h: number }

interface MinimapView {
  window: WorldRect;             // world area shown, in tiles
  imgW: number;                  // image size in px
  imgH: number;
  pins: { x: number; y: number }[]; // pins stored in image px
}

const MAX_USER_PINS = 50;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

// world tile -> image px (linear; Y uses imgH, the donor's line uses Width there)
function worldToImage(v: MinimapView, wx: number, wy: number): { x: number; y: number; onMap: boolean } {
  const x = Math.floor(((wx - v.window.x) * v.imgW) / v.window.w);
  const y = Math.floor(((wy - v.window.y) * v.imgH) / v.window.h);
  return { x, y, onMap: x >= 0 && y >= 0 && x < v.imgW && y < v.imgH };
}

// image px -> world tile (input clamped to the image first, as the donor's Validate does)
function imageToWorld(v: MinimapView, ix: number, iy: number): { x: number; y: number } {
  const cx = clamp(ix, 0, v.imgW - 1);
  const cy = clamp(iy, 0, v.imgH - 1);
  return {
    x: Math.floor((v.window.w * cx) / v.imgW) + v.window.x,
    y: Math.floor((v.window.h * cy) / v.imgH) + v.window.y,
  };
}

// World-space pin. The donor adds it with no bounds check; here an off-map point is refused.
function addWorldPin(v: MinimapView, wx: number, wy: number): boolean {
  if (v.pins.length >= MAX_USER_PINS) return false;
  const p = worldToImage(v, wx, wy);
  if (!p.onMap) return false;
  v.pins.push({ x: p.x, y: p.y });
  return true;
}

// The donor's RemovePin tests index > 0, so pin 0 cannot be removed. Fixed to >= 0.
function removePin(v: MinimapView, index: number): void {
  if (index >= 0 && index < v.pins.length) v.pins.splice(index, 1);
}

// Cartography-style zoom: the window half-width and image size grow with skill (CityMap rule).
function cityMapView(centreX: number, centreY: number, skill: number): MinimapView {
  const dist = Math.max(64 + Math.floor(skill * 4), 200);
  const size = clamp(32 + Math.floor(skill * 2), 200, 400);
  return {
    window: { x: centreX - dist, y: centreY - dist, w: dist * 2, h: dist * 2 },
    imgW: size,
    imgH: size,
    pins: [],
  };
}

export {};
