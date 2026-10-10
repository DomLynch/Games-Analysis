// Licence: GPL-3.0 with EA additional terms (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Vec2 = { x: number; y: number };
interface Rect2 { w: number; h: number; }
interface MapBounds { minX: number; minY: number; maxX: number; maxY: number; }

// Keep a view origin inside the map. shifted reports whether it had to move (donor Confine_Rect returns nonzero).
function clampOrigin(o: Vec2, view: Rect2, map: MapBounds): { origin: Vec2; shifted: boolean } {
  const cx = Math.min(Math.max(o.x, map.minX), Math.max(map.minX, map.maxX - view.w));
  const cy = Math.min(Math.max(o.y, map.minY), Math.max(map.minY, map.maxY - view.h));
  return { origin: { x: cx, y: cy }, shifted: cx !== o.x || cy !== o.y };
}

// Frame the mean of the group's centres: the view centre goes on the mean, then the origin is clamped.
function frameGroup(points: Vec2[], view: Rect2, map: MapBounds): { origin: Vec2; shifted: boolean } {
  if (points.length === 0) return { origin: { x: map.minX, y: map.minY }, shifted: false };
  let sx = 0;
  let sy = 0;
  for (const p of points) { sx += p.x; sy += p.y; }
  const mean = { x: sx / points.length, y: sy / points.length };
  return clampOrigin({ x: mean.x - view.w / 2, y: mean.y - view.h / 2 }, view, map);
}

// One keyboard step: a fixed distance in a direction, stopped at the map edge.
function keyScroll(origin: Vec2, dir: Vec2, step: number, view: Rect2, map: MapBounds): { origin: Vec2; shifted: boolean } {
  return clampOrigin({ x: origin.x + dir.x * step, y: origin.y + dir.y * step }, view, map);
}

// Easing toward the target. Not in the donor, which snaps to the desired position at redraw.
function easeToward(cur: Vec2, target: Vec2, dtMs: number, halfLifeMs: number): Vec2 {
  const k = 1 - Math.pow(0.5, dtMs / halfLifeMs);
  return { x: cur.x + (target.x - cur.x) * k, y: cur.y + (target.y - cur.y) * k };
}
export {};
