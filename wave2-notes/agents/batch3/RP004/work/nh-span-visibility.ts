// Licence: NetHack General Public License (donor, copyleft). Clean-room shape written from the described mechanism; not a translation.
// clean-room
export interface Grid {
  cols: number;
  rows: number;
  blocks(x: number, y: number): boolean;
}

// Per-cell clear-run extents on the same row, precomputed once per level.
export interface RunTable {
  cols: number;
  left: Int32Array;   // first column of the clear run containing (x, y)
  right: Int32Array;  // last column of that run
}

export function buildRunTable(g: Grid): RunTable {
  const left = new Int32Array(g.cols * g.rows);
  const right = new Int32Array(g.cols * g.rows);
  for (let y = 0; y < g.rows; y++) {
    for (let x = 0; x < g.cols; x++) {
      let l = x;
      while (l > 0 && !g.blocks(l - 1, y)) l--;
      let r = x;
      while (r < g.cols - 1 && !g.blocks(r + 1, y)) r++;
      left[y * g.cols + x] = l;
      right[y * g.cols + x] = r;
    }
  }
  return { cols: g.cols, left, right };
}

export interface Span { lo: number; hi: number; }   // visible columns on one row, inclusive

// Sweep outward from the hero's row, one row at a time, keeping one span per row.
// Simplified: no slope or corner test, so it over-reveals around corners.
export function sweepSpans(g: Grid, t: RunTable, hx: number, hy: number, range: number): (Span | null)[] {
  const spans: (Span | null)[] = Array.from({ length: g.rows }, () => null);
  const here = hy * g.cols + hx;
  spans[hy] = { lo: t.left[here], hi: t.right[here] };
  for (const step of [1, -1]) {
    let prev = spans[hy] as Span;
    for (let y = hy + step; y >= 0 && y < g.rows && Math.abs(y - hy) <= range; y += step) {
      let lo = Infinity;
      let hi = -Infinity;
      for (let x = prev.lo; x <= prev.hi; x++) {
        if (g.blocks(x, y)) {            // a wall next to a visible span is itself seen
          lo = Math.min(lo, x);
          hi = Math.max(hi, x);
          continue;
        }
        const i = y * g.cols + x;
        lo = Math.min(lo, t.left[i]);
        hi = Math.max(hi, t.right[i]);
      }
      if (lo > hi) break;                // nothing new on this row: stop outward
      spans[y] = { lo, hi };
      prev = spans[y] as Span;
    }
  }
  return spans;
}

// Glyph buffer with per-row dirty bounds; only changed cells inside the bounds are drawn.
export interface Screen {
  cols: number;
  rows: number;
  glyph: Int32Array;
  changed: Uint8Array;
  dirtyLo: Int32Array;   // per row; lo > hi means clean
  dirtyHi: Int32Array;
}

export function createScreen(cols: number, rows: number): Screen {
  return {
    cols,
    rows,
    glyph: new Int32Array(cols * rows),
    changed: new Uint8Array(cols * rows),
    dirtyLo: new Int32Array(rows).fill(cols),
    dirtyHi: new Int32Array(rows).fill(-1),
  };
}

export function setGlyph(s: Screen, x: number, y: number, g: number): void {
  const i = y * s.cols + x;
  if (s.glyph[i] === g) return;
  s.glyph[i] = g;
  s.changed[i] = 1;
  if (s.dirtyLo[y] > x) s.dirtyLo[y] = x;
  if (s.dirtyHi[y] < x) s.dirtyHi[y] = x;
}

// Draw the changed cells, then clean the bounds. Returns the number of draw calls.
export function flush(s: Screen, draw: (x: number, y: number, glyph: number) => void): number {
  let drawn = 0;
  for (let y = 0; y < s.rows; y++) {
    for (let x = s.dirtyLo[y]; x <= s.dirtyHi[y]; x++) {
      const i = y * s.cols + x;
      if (s.changed[i] === 1) {
        draw(x, y, s.glyph[i]);
        s.changed[i] = 0;
        drawn += 1;
      }
    }
    s.dirtyLo[y] = s.cols;
    s.dirtyHi[y] = -1;
  }
  return drawn;
}

export {};
