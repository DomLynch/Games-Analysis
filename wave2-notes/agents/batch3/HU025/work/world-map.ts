// Licence: Apache-2.0 (donor LICENSE, Version 2.0). Adapted shape, rewritten in TypeScript for Frankendom.
// Client-only map view: zone bounds come from zone data; the engine never reads the view.

export interface Pt { x: number; y: number; }
export interface MapView { x: number; y: number; width: number; height: number; } // map units
export interface MapBounds { width: number; height: number; }                    // zone size, map units

// Own helper (the donor's clamp() was not read): keeps the view inside the zone and above a minimum size.
function clampTo(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

// Mirror of the donor clampViewport (app.js 462-474): min 240 x 170 map px, never outside the zone.
export function clampView(v: MapView, b: MapBounds, minW = 240, minH = 170): MapView {
  const width = clampTo(v.width, minW, b.width);
  const height = clampTo(v.height, minH, b.height);
  return {
    x: clampTo(v.x, 0, Math.max(0, b.width - width)),
    y: clampTo(v.y, 0, Math.max(0, b.height - height)),
    width,
    height,
  };
}

// Meet-fit scale of a view in a rectangle (donor mapViewport.js 7). Screen px per map unit.
export function fitScale(view: MapView, rectW: number, rectH: number): number {
  return Math.max(0.0001, Math.min(rectW / view.width, rectH / view.height));
}

// Wheel zoom anchored at the cursor. deltaPx is the wheel delta in px (donor: exp(clamp(delta, -100, 100) * 0.002)).
export function zoomAt(v: MapView, focus: Pt, deltaPx: number, b: MapBounds): MapView {
  const k = Math.exp(clampTo(deltaPx, -100, 100) * 0.002);
  const width = v.width * k;
  const height = v.height * k;
  const rx = (focus.x - v.x) / v.width; // same fraction before and after, so the focus point stays put
  const ry = (focus.y - v.y) / v.height;
  return clampView({ x: focus.x - width * rx, y: focus.y - height * ry, width, height }, b);
}

// Drag pan from the drag-start snapshot (donor app.js 4024-4026): no drift between move events.
export function panFrom(start: MapView, startPx: Pt, nowPx: Pt, scale: number, b: MapBounds): MapView {
  const dx = (nowPx.x - startPx.x) / scale;
  const dy = (nowPx.y - startPx.y) / scale;
  return clampView({ ...start, x: start.x - dx, y: start.y - dy }, b);
}

// Follow view centred on an anchor. Width capped at 2200 map units (donor mapControls.js 96).
export function followView(anchor: Pt, viewW: number, rectW: number, rectH: number, b: MapBounds, maxW = 2200): MapView {
  const aspect = Math.max(0.5, rectW / Math.max(1, rectH));
  const width = Math.min(viewW, maxW);
  const height = width / aspect;
  return clampView({ x: anchor.x - width / 2, y: anchor.y - height / 2, width, height }, b);
}

export interface Item<T> { item: T; point: Pt; }
export interface Cluster<T> { members: Item<T>[]; point: Pt; size: number; }

// Grid clustering in map units (donor mapClusters.js). cell and margin are screen px divided by the scale.
// Cells are keyed by floor(point / cell); the cluster point is the mean of its members; small clusters first.
export function cluster<T>(items: Item<T>[], cell: number, view: MapView, margin: number): Cluster<T>[] {
  const size = Math.max(1, cell);
  const cells = new Map<string, { members: Item<T>[]; sx: number; sy: number }>();
  for (const it of items) {
    const p = it.point;
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    if (p.x < view.x - margin || p.x > view.x + view.width + margin) continue;
    if (p.y < view.y - margin || p.y > view.y + view.height + margin) continue;
    const key = `${Math.floor(p.x / size)}:${Math.floor(p.y / size)}`;
    let c = cells.get(key);
    if (!c) {
      c = { members: [], sx: 0, sy: 0 };
      cells.set(key, c);
    }
    c.members.push(it);
    c.sx += p.x;
    c.sy += p.y;
  }
  return [...cells.values()]
    .map((c) => ({
      members: c.members,
      point: { x: c.sx / c.members.length, y: c.sy / c.members.length },
      size: c.members.length,
    }))
    .sort((a, b) => a.size - b.size);
}

// Badge radius in screen px for a cluster of n (donor app.js 2206: clamp(12 + log2(n) * 1.05, 14, 21)).
export function clusterRadiusPx(n: number): number {
  return clampTo(12 + Math.log2(n) * 1.05, 14, 21);
}
