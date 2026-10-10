// Licence: GPL-3.0 (donor). clean-room sketch of the shape of a zoom-and-pan map view, written from the described mechanism, not a translation.
// clean-room
interface MapView { zoom: number; panX: number; panY: number; }

const ZOOM_MIN = 0.25; // full-map clamp (donor MinimapFragment.java lines 84, 124)
const ZOOM_MAX = 10;   // full-map clamp (donor MinimapFragment.java lines 84, 124)

function clampZoom(z: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
}

// Mouse wheel: each tick changes zoom by 10 percent of the current zoom (donor line 124: amountY / 10 * zoom).
function wheelZoom(v: MapView, wheelTicks: number): void {
  v.zoom = clampZoom(v.zoom - (wheelTicks / 10) * v.zoom);
}

// Pinch: zoom = the zoom captured when the pinch began, times finger distance now over distance at start.
// The caller passes startZoom captured at gesture start, so a wheel zoom in between cannot leave a stale value (donor defect, see note section 6).
function pinchZoom(v: MapView, startZoom: number, startDist: number, dist: number): void {
  v.zoom = clampZoom((dist / startDist) * startZoom);
}

// Drag: screen pixels divided by zoom, so one finger move covers the same map distance at any zoom (donor line 90).
function dragPan(v: MapView, dxPx: number, dyPx: number): void {
  v.panX += dxPx / v.zoom;
  v.panY += dyPx / v.zoom;
}

// Open the map centred on a point given as fractions 0..1 of the map (donor lines 176-177 use the player, or the camera when dead).
// baseSize is px per tile at zoom 1; mapTilesW is map width in tiles; ratio is height over width.
// Donor form: size = baseSize * zoom * W, panX = (size/2 - fracX * size) / zoom. The zoom term cancels algebraically.
function centreOn(v: MapView, fracX: number, fracY: number, baseSize: number, mapTilesW: number, ratio: number): void {
  const size = baseSize * v.zoom * mapTilesW;
  v.panX = (size / 2 - fracX * size) / v.zoom;
  v.panY = (size * ratio / 2 - fracY * size * ratio) / v.zoom;
}

// Draw centre of the map on screen (donor line 52 uses w/2 + panx * zoom).
function mapCentreOnScreen(v: MapView, screenW: number, screenH: number): { x: number; y: number } {
  return { x: screenW / 2 + v.panX * v.zoom, y: screenH / 2 + v.panY * v.zoom };
}

// Pan target clamp: the point is kept inside the map plus half a tile on each side (donor line 156).
function clampTarget(x: number, y: number, worldW: number, worldH: number, tile: number): { x: number; y: number } {
  return {
    x: Math.min(worldW + tile / 2, Math.max(-tile / 2, x)),
    y: Math.min(worldH + tile / 2, Math.max(-tile / 2, y)),
  };
}

export {};
