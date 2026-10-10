// Licence: GPL-3.0 (donor). Clean-room sketch from the described mechanism (grid footprints, first fit, overlap test), not a translation of the donor lines.
interface Footprint { w: number; h: number; }
interface Placed extends Footprint { id: string; x: number; y: number; }
interface Grid { cols: number; rows: number; items: Placed[]; } // cols and rows are CELL counts

// Half-open cell rectangles: [x, x+w) x [y, y+h). Touching edges do not overlap.
function overlaps(x: number, y: number, fp: Footprint, b: Placed): boolean {
  return x < b.x + b.w && x + fp.w > b.x && y < b.y + b.h && y + fp.h > b.y;
}

function canFit(g: Grid, x: number, y: number, fp: Footprint): boolean {
  if (x < 0 || y < 0) return false;
  if (x + fp.w > g.cols || y + fp.h > g.rows) return false; // bounds in cells
  return !g.items.some((it) => overlaps(x, y, fp, it));
}

// First fit in row-major order (top-left first), as the donor's add() scans.
function firstFit(g: Grid, fp: Footprint): { x: number; y: number } | null {
  for (let y = 0; y < g.rows; y++) {
    for (let x = 0; x < g.cols; x++) {
      if (canFit(g, x, y, fp)) return { x, y };
    }
  }
  return null;
}

// All-or-nothing: place every item on a working copy; return the new grid only if all fit.
function addAll(
  g: Grid,
  batch: { id: string; fp: Footprint }[],
): { ok: true; grid: Grid } | { ok: false; failedId: string } {
  const work: Grid = { cols: g.cols, rows: g.rows, items: [...g.items] };
  for (const b of batch) {
    const at = firstFit(work, b.fp);
    if (!at) return { ok: false, failedId: b.id };
    work.items.push({ id: b.id, x: at.x, y: at.y, w: b.fp.w, h: b.fp.h });
  }
  return { ok: true, grid: work };
}

// The item whose footprint covers cell (x, y), or null.
function cellItem(g: Grid, x: number, y: number): Placed | null {
  return g.items.find((it) => x >= it.x && x < it.x + it.w && y >= it.y && y < it.y + it.h) ?? null;
}

// Move = lift the item, then place it at the target. Works on copies, so a refused move leaves the grid untouched.
// simplified: the donor has no move path (its Set and Remove have no callers in d2game/d2player); this function is added to show the atomic form.
function moveItem(g: Grid, id: string, to: { x: number; y: number }): Grid | null {
  const it = g.items.find((p) => p.id === id);
  if (!it) return null;
  const lifted: Grid = { cols: g.cols, rows: g.rows, items: g.items.filter((p) => p.id !== id) };
  if (!canFit(lifted, to.x, to.y, it)) return null;
  return { ...lifted, items: [...lifted.items, { ...it, x: to.x, y: to.y }] };
}

export {};
