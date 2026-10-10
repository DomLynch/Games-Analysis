// Licence: GPL-2.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

const ZOOM_STEPS = [1, 2, 4, 6, 8]; // data: world units per map pixel; bigger number = further out
const BLINK_MS = 450;               // data: highlight blink interval
const REFRESH_MS = 930;             // data: periodic full refresh of the map

interface MapView {
  zoomIndex: number;
  scrollX: number; // world units, top-left of the map widget
  scrollY: number;
}

interface MainView {
  followTarget: string | null;
  destX: number;
  destY: number;
}

// Pixel -> world point under it, for the view's current zoom step.
function pixelToWorld(v: MapView, px: number, py: number): { x: number; y: number } {
  const z = ZOOM_STEPS[v.zoomIndex];
  return { x: v.scrollX + px * z, y: v.scrollY + py * z };
}

// Keep the centre of the widget on part of the world: scroll limited to [-half, worldSize - half].
function clampScroll(v: MapView, widgetW: number, widgetH: number, worldW: number, worldH: number): MapView {
  const z = ZOOM_STEPS[v.zoomIndex];
  const hx = (widgetW / 2) * z;
  const hy = (widgetH / 2) * z;
  return {
    zoomIndex: v.zoomIndex,
    scrollX: Math.min(Math.max(v.scrollX, -hx), worldW - hx),
    scrollY: Math.min(Math.max(v.scrollY, -hy), worldH - hy),
  };
}

// One zoom step, keeping the world point under the pointer fixed.
function zoomAt(v: MapView, zoomIn: boolean, px: number, py: number, widgetW: number, widgetH: number, worldW: number, worldH: number): MapView {
  const next = Math.min(Math.max(v.zoomIndex + (zoomIn ? -1 : 1), 0), ZOOM_STEPS.length - 1);
  if (next === v.zoomIndex) return v;
  const before = pixelToWorld(v, px, py);
  const after = pixelToWorld({ zoomIndex: next, scrollX: v.scrollX, scrollY: v.scrollY }, px, py);
  const moved: MapView = {
    zoomIndex: next,
    scrollX: v.scrollX + (before.x - after.x),
    scrollY: v.scrollY + (before.y - after.y),
  };
  return clampScroll(moved, widgetW, widgetH, worldW, worldH);
}

// Drag pans the map by a pixel delta, through the same clamp.
function panBy(v: MapView, dx: number, dy: number, widgetW: number, widgetH: number, worldW: number, worldH: number): MapView {
  const z = ZOOM_STEPS[v.zoomIndex];
  return clampScroll({ zoomIndex: v.zoomIndex, scrollX: v.scrollX + dx * z, scrollY: v.scrollY + dy * z }, widgetW, widgetH, worldW, worldH);
}

// Click on the map: any click cancels follow; returns false if the main view is already there.
// (Donor: ScrollMainWindowTo recentres the map on a no-op; the map's own click path does not.)
function clickMap(v: MapView, px: number, py: number, main: MainView): boolean {
  const p = pixelToWorld(v, px, py);
  main.followTarget = null;
  if (main.destX === p.x && main.destY === p.y) return false;
  main.destX = p.x;
  main.destY = p.y;
  return true;
}

// Recentre the map so the main view's centre sits in the middle of the widget.
function recentre(v: MapView, mainX: number, mainY: number, widgetW: number, widgetH: number, worldW: number, worldH: number): MapView {
  const z = ZOOM_STEPS[v.zoomIndex];
  return clampScroll({ zoomIndex: v.zoomIndex, scrollX: mainX - (widgetW / 2) * z, scrollY: mainY - (widgetH / 2) * z }, widgetW, widgetH, worldW, worldH);
}

export {};
