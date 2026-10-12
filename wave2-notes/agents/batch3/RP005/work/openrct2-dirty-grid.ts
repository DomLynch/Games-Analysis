// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
class DirtyGrid {
  private readonly cols: number;
  private readonly rows: number;
  private readonly blocks: Uint8Array;
  private lowRow = Infinity;
  private highRow = -1;
  private lowCol = Infinity;
  private highCol = -1;

  constructor(private readonly width: number, private readonly height: number, private readonly bw = 128, private readonly bh = 128) {
    this.cols = Math.floor(width / bw) + 1;
    this.rows = Math.floor(height / bh) + 1;
    this.blocks = new Uint8Array(this.cols * this.rows);
  }

  // Marks every block the rectangle touches, clamped to the screen. Right and bottom are exclusive.
  invalidate(left: number, top: number, right: number, bottom: number): void {
    left = Math.max(left, 0);
    top = Math.max(top, 0);
    right = Math.min(right, this.width);
    bottom = Math.min(bottom, this.height);
    if (left >= right || top >= bottom) return;

    const c0 = Math.max(Math.floor(left / this.bw), 0);
    const c1 = Math.min(Math.floor((right - 1) / this.bw), this.cols - 1);
    const r0 = Math.max(Math.floor(top / this.bh), 0);
    const r1 = Math.min(Math.floor((bottom - 1) / this.bh), this.rows - 1);
    if (c0 > c1 || r0 > r1) return;

    this.lowRow = Math.min(this.lowRow, r0);
    this.highRow = Math.max(this.highRow, r1);
    this.lowCol = Math.min(this.lowCol, c0);
    this.highCol = Math.max(this.highCol, c1);
    for (let r = r0; r <= r1; r++) this.blocks.fill(1, r * this.cols + c0, r * this.cols + c1 + 1);
  }

  // Emits merged dirty rectangles in row-major order and clears each one before it is emitted.
  traverse(emit: (left: number, top: number, right: number, bottom: number) => void): void {
    if (this.highRow < 0) return; // nothing dirty since the last traverse
    for (let row = this.lowRow; row <= this.highRow; row++) {
      let col = this.lowCol;
      while (col <= this.highCol) {
        if (this.blocks[row * this.cols + col] === 0) { col++; continue; }

        // Horizontal run in this row.
        let w = 1;
        while (col + w < this.cols && this.blocks[row * this.cols + col + w] !== 0) w++;

        // Vertical extension: each row below must cover the whole width; the width shrinks to what it covers.
        let h = 0;
        for (let dr = 1; row + dr <= this.highRow; dr++) {
          let valid = 0;
          while (valid < w && this.blocks[(row + dr) * this.cols + col + valid] !== 0) valid++;
          if (valid === 0) break;
          w = valid;
          h++;
        }

        for (let y = row; y <= row + h; y++) this.blocks.fill(0, y * this.cols + col, y * this.cols + col + w);

        if (col * this.bw < this.width && row * this.bh < this.height) {
          emit(col * this.bw, row * this.bh,
            Math.min((col + w) * this.bw, this.width), Math.min((row + h + 1) * this.bh, this.height));
        }
        col += w;
      }
    }
    this.lowRow = Infinity;
    this.highRow = -1;
    this.lowCol = Infinity;
    this.highCol = -1;
  }
}

// Demo values: a 640 x 480 screen with 128 px blocks.
const grid = new DirtyGrid(640, 480);
grid.invalidate(0, 0, 300, 200);
grid.invalidate(130, 0, 260, 200);
const out: number[][] = [];
grid.traverse((l, t, r, b) => out.push([l, t, r, b]));
export {};
