export {};

// clean-room sketch of a dirty-rectangle tile layer: changes coalesce into one rect per frame,
// only that rect is rebuilt, and the GPU receives one contiguous float range.
type UV = { left: number; top: number; right: number; bottom: number };
type Rect = { left: number; top: number; right: number; bottom: number }; // half-open, cell units

const FLOATS_PER_CELL = 16; // 4 corners x (x, y, u, v)

function isEmptyRect(r: Rect): boolean {
  return r.right <= r.left || r.bottom <= r.top;
}

class TileLayer {
  private dirty: Rect = { left: 0, top: 0, right: 0, bottom: 0 };
  private fullUpdate = false;
  private readonly verts: Float32Array;

  constructor(
    private readonly cols: number,
    private readonly rows: number,
    private readonly cellW: number,
    private readonly cellH: number,
    private readonly data: Int32Array,                 // tile id per cell
    private readonly uvOf: (tile: number) => UV | undefined,
    private readonly needsRender: (pos: number) => boolean,
  ) {
    this.verts = new Float32Array(cols * rows * FLOATS_PER_CELL);
  }

  // Many changes in one frame coalesce into one bounding rect.
  markCell(cell: number): void {
    const x = cell % this.cols;
    const y = Math.floor(cell / this.cols);
    if (isEmptyRect(this.dirty)) {
      this.dirty = { left: x, top: y, right: x + 1, bottom: y + 1 };
    } else {
      this.dirty.left = Math.min(this.dirty.left, x);
      this.dirty.right = Math.max(this.dirty.right, x + 1);
      this.dirty.top = Math.min(this.dirty.top, y);
      this.dirty.bottom = Math.max(this.dirty.bottom, y + 1);
    }
  }

  // Forces a full rebuild and full re-upload on the next flush.
  markAll(): void {
    this.dirty = { left: 0, top: 0, right: this.cols, bottom: this.rows };
    this.fullUpdate = true;
  }

  // Called once per frame before drawing. Rebuilds only the dirty rect and reports the upload range.
  flush(upload: (full: boolean, startFloat: number, endFloat: number) => void): void {
    if (isEmptyRect(this.dirty)) return;
    const r = this.dirty;
    let first = -1;
    let last = -1;

    for (let y = r.top; y < r.bottom; y++) {
      for (let x = r.left; x < r.right; x++) {
        const pos = y * this.cols + x;
        if (first === -1) first = pos;
        last = pos + 1;
        const o = pos * FLOATS_PER_CELL;
        const uv = this.uvOf(this.data[pos]);
        if (this.needsRender(pos) && uv !== undefined) {
          const x1 = x * this.cellW, y1 = y * this.cellH;
          const x2 = x1 + this.cellW, y2 = y1 + this.cellH;
          this.verts.set(
            [x1, y1, uv.left, uv.top, x2, y1, uv.right, uv.top,
             x2, y2, uv.right, uv.bottom, x1, y2, uv.left, uv.bottom],
            o,
          );
        } else {
          // zero-size quad at the origin: still submitted, no visible pixels
          this.verts.fill(0, o, o + FLOATS_PER_CELL);
        }
      }
    }

    const full = this.fullUpdate;
    this.fullUpdate = false;
    this.dirty = { left: 0, top: 0, right: 0, bottom: 0 };
    if (full) upload(true, 0, this.verts.length);
    else upload(false, first * FLOATS_PER_CELL, last * FLOATS_PER_CELL);
  }

  // The whole layer is one draw call; hidden cells are not culled.
  quadCount(): number {
    return this.cols * this.rows;
  }
}

// usage shape (not run in the donor): one layer, several dirty cells, one flush per frame
const cols = 4, rows = 3;
const data = new Int32Array(cols * rows).fill(0);
const layer = new TileLayer(cols, rows, 16, 16, data,
  (t) => (t >= 0 ? { left: 0, top: 0, right: 1, bottom: 1 } : undefined),
  (pos) => data[pos] >= 0);
layer.markCell(1);
layer.markCell(6);
layer.flush((full, s, e) => { void full; void s; void e; });
