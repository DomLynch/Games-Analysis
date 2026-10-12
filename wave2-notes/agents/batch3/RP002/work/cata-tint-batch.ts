// Licence: CC-BY-SA 3.0 (donor, copyleft). Clean-room sketch of the batching rule only, written from the described order of steps.
// clean-room
interface Rect { x: number; y: number; w: number; h: number }
interface TintTile { id: number; bounds: Rect; color: string; fitsTile: boolean }
type Op =
  | { kind: "flat"; id: number }
  | { kind: "batch"; color: string; ids: number[]; union: Rect };
interface Open { color: string; ids: number[]; union: Rect; sumArea: number }

const UNION_CAP = 2; // a batch's union box may grow to at most 2x the summed area of its members

function unionOf(a: Rect, b: Rect): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const right = Math.max(a.x + a.w, b.x + b.w);
  const bottom = Math.max(a.y + a.h, b.y + b.h);
  return { x, y, w: right - x, h: bottom - y };
}

function toOp(o: Open): Op {
  return { kind: "batch", color: o.color, ids: o.ids, union: o.union };
}

// One row's tinted tiles, in draw order, become draw ops.
// A tile that fits its own footprint is a flat fill: it closes the open batch first, then is drawn alone.
// A colour change, or a union box past the cap, also closes the open batch.
function planTintOps(tiles: TintTile[]): Op[] {
  const ops: Op[] = [];
  let open: Open | null = null;
  for (const t of tiles) {
    if (t.fitsTile) {
      if (open !== null) { ops.push(toOp(open)); open = null; }
      ops.push({ kind: "flat", id: t.id });
      continue;
    }
    const area = t.bounds.w * t.bounds.h;
    if (open !== null && open.color !== t.color) { ops.push(toOp(open)); open = null; }
    if (open !== null && open.ids.length > 0) {
      const u = unionOf(open.union, t.bounds);
      if (u.w * u.h > (open.sumArea + area) * UNION_CAP) { ops.push(toOp(open)); open = null; }
    }
    if (open === null) open = { color: t.color, ids: [], union: t.bounds, sumArea: 0 };
    open.union = open.ids.length > 0 ? unionOf(open.union, t.bounds) : t.bounds;
    open.sumArea += area;
    open.ids.push(t.id);
  }
  if (open !== null) ops.push(toOp(open));
  return ops;
}
