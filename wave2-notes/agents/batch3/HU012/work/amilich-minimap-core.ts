// Licence: MIT (donor, amilich-isometric-city LICENSE). Adapted shape; the isometric projection is replaced by a flat map.
// Minimap core: pure math, no DOM. Shape: viewport quad from the inverse projection, click-to-cell with clamp,
// centre-on-cell clamped to map bounds, and a base-layer redraw test on a monotonic tick.

export interface Pt { x: number; y: number }
export interface View { offset: Pt; zoom: number; canvasW: number; canvasH: number }
export interface Bounds { minX: number; maxX: number; minY: number; maxY: number }
export interface RedrawMemo { lastTick: number; lastGrid: unknown }

// Inverse of the iso projection: screen px -> fractional grid coordinate (no half-tile centre offset).
export function screenToGrid(sx: number, sy: number, v: View, tileW: number, tileH: number): Pt {
  const ax = (sx - v.offset.x) / v.zoom;
  const ay = (sy - v.offset.y) / v.zoom;
  return {
    x: (ax / (tileW / 2) + ay / (tileH / 2)) / 2,
    y: (ay / (tileH / 2) - ax / (tileW / 2)) / 2,
  };
}

// The four canvas corners as a quad in grid units; drawn on top of the base layer every sync.
export function viewQuad(v: View, tileW: number, tileH: number): Pt[] {
  const corners: Pt[] = [
    { x: 0, y: 0 },
    { x: v.canvasW, y: 0 },
    { x: v.canvasW, y: v.canvasH },
    { x: 0, y: v.canvasH },
  ];
  return corners.map(c => screenToGrid(c.x, c.y, v, tileW, tileH));
}

// Grid units -> minimap pixels for a square map of mapPx pixels and gridSize cells per side.
export function gridToMini(p: Pt, mapPx: number, gridSize: number): Pt {
  const s = mapPx / gridSize;
  return { x: p.x * s, y: p.y * s };
}

// Minimap pixel -> whole grid cell, clamped to the grid.
export function miniToCell(px: number, py: number, mapPx: number, gridSize: number): Pt {
  const s = mapPx / gridSize;
  const clamp = (n: number): number => Math.max(0, Math.min(gridSize - 1, n));
  return { x: clamp(Math.floor(px / s)), y: clamp(Math.floor(py / s)) };
}

// Camera offset that centres a cell on the canvas, then clamped to the map bounds (instant, not animated).
export function centreOffset(cell: Pt, zoom: number, canvasW: number, canvasH: number,
                             tileW: number, tileH: number, b: Bounds): Pt {
  const sx = (cell.x - cell.y) * (tileW / 2);
  const sy = (cell.x + cell.y) * (tileH / 2);
  const x = canvasW / 2 - sx * zoom;
  const y = canvasH / 2 - sy * zoom;
  return {
    x: Math.max(b.minX, Math.min(b.maxX, x)),
    y: Math.max(b.minY, Math.min(b.maxY, y)),
  };
}

// Base-layer redraw test. Redraw on first frame, when the grid reference changes, or when
// totalTick has advanced by everyTicks. totalTick must be monotonic (the donor's sub-day tick wraps at 30).
export function needsBaseRedraw(memo: RedrawMemo, totalTick: number, grid: unknown, everyTicks: number): boolean {
  const due = memo.lastTick < 0 || totalTick - memo.lastTick >= everyTicks || grid !== memo.lastGrid;
  if (due) {
    memo.lastTick = totalTick;
    memo.lastGrid = grid;
  }
  return due;
}

export {};
