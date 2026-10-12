# OpenRCT2-OpenRCT2 (rendering-performance, cell 17)

Donor: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/drawing/InvalidationGrid.h` (with `InvalidationGrid.cpp`) | Licence: GPL-3.0 (`/mnt/frankendom-donors/OpenRCT2-OpenRCT2/licence.txt` line 2: "Version 3, 29 June 2007"; the two files carry no per-file licence header, so "or later" is not confirmed) | C++ | symbol `InvalidationGrid::traverseDirtyCells`

Checked: The hint file `X8DrawingEngine.cpp` is the engine wrapper; the mechanism lives in `InvalidationGrid.h` (1-127) and `InvalidationGrid.cpp` (1-92), both read in full. Also read: `X8DrawingEngine.cpp` 138-210 and 280-366, `NewDrawing.cpp` 62-74 and 147-154, `UiContext.cpp` 847-862. Callers: `DrawingEngineResize` has one caller (grep, `UiContext.cpp` 853) and I read it. `GfxSetDirtyBlocks` is called from many places; I read only the one in `NewDrawing.cpp` 152 and did not count the rest. `OpenGLDrawingEngine.cpp` uses the same grid (grep only, 225-288 not read). Not read: `WindowDrawAll` and its clip logic, the weather drawer, and the paint-session culling under `src/openrct2/paint`. Confidence: high on the grid mechanics and merge order; medium on whether every caller invalidates the right rectangle. Camera: not a camera cell (camera_scope not applicable).

Best transferable idea: Track screen damage as a grid of 128 px blocks, redraw only the merged dirty rectangles, and scan only the bounding box of changed blocks, so an unchanged HUD costs nothing per frame.

Decision (proposed): adapt - take the block grid and the rectangle merge for the client HUD layer only; the 3D fight view moves every frame, so it is not a dirty-rect candidate.
Acceptance: A unit test on the grid (no GPU) asserts that a health change on one HUD bar emits only the rectangles covering that bar, and that a frame with no HUD change emits zero rectangles; in play, a 60 s idle fight at 375 wide repaints the HUD layer only when a value changes.

## 1. Mechanism

- A grid of one byte per block: `_blocks` holds one `uint8_t` per block (`InvalidationGrid.h` 17), blocks are 128 px (`X8DrawingEngine.cpp` 343), and the column and row counts are `width / block + 1` and `height / block + 1` (`InvalidationGrid.cpp` 32-33). The grid is rebuilt every time the buffer is configured (`X8DrawingEngine.cpp` 329).
- `invalidate(left, top, right, bottom)` (`InvalidationGrid.cpp` 48-90): clamp the rectangle to the screen (51-54); return if it is empty (56-57); convert it to a block range with right and bottom exclusive (`(right - 1) / blockWidth`, 63-66); clamp that range to the grid (69-72); widen the dirty bounding box (78-81); set each covered row's bytes to 0xFF (85-89).
- `traverseDirtyCells` (`InvalidationGrid.h` 41-124): scan rows and columns only inside the dirty bounding box (49-52). For each dirty block (60): extend a horizontal run to the right (68-72). Then extend downwards: for each row below, count how many dirty blocks from the same column are still covered, up to the current width; stop at the first row with none (77-86); the width narrows to that count (87). Clear every block in the resulting rectangle (93-100). Emit the rectangle, clamped to the screen, only if its top-left is on screen (102-113). Advance by the merged width (116). After the scan, reset the bounding box (120-123).
- Paint order in `X8DrawingEngine::PaintWindows` (188-203): unless a force redraw is set (190), draw the dirty blocks, update the viewports, and draw the dirty blocks again (199, 201). The comment (197-198) gives the reason: a panned viewport copies pixels, so the dirty pixels must be clean first.
- Tick: none. Work happens only when the paint runs; its cost is the dirty bounding box, not the screen.
- Numbers: 128 px blocks (343), one byte per block, one extra column and row (32-33). The draw callback draws the windows inside the rectangle (`X8DrawingEngine.cpp` 361).

## 2. Key functions

- `InvalidationGrid::traverseDirtyCells`: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/drawing/InvalidationGrid.h` 41-124. Bounding-box scan, horizontal and vertical merge, clear, emit, reset.
- `InvalidationGrid::invalidate`: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/drawing/InvalidationGrid.cpp` 48-90. Clamp, block range, bounding box, mark.
- `InvalidationGrid::reset`: same file, 28-46. Rebuilds the grid and clears every block and the bounding box.
- `X8DrawingEngine::PaintWindows`: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/drawing/X8DrawingEngine.cpp` 188-203. Draw dirty, update viewports, draw dirty again.
- `X8DrawingEngine::ConfigureDirtyGrid`: same file, 341-347. Sets 128 px blocks and resets the grid.
- Callers: `X8DrawingEngine::Invalidate` (163) forwards to the grid; `NewDrawing.cpp` 152 is the caller I read, through `GfxSetDirtyBlocks`.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Damage as a block grid, one byte per block | 128 px blocks (theirs, `X8DrawingEngine.cpp` 343) |
| Scan only the dirty bounding box | None (mechanism) |
| Horizontal run, then extend downward while the width is covered | None (mechanism); the width narrows row by row |
| Clear the rectangle before the callback runs (98 before 112) | None (mechanism) |
| Redraw dirty before and after moving viewports | None (mechanism) |
| Off-screen blocks are cleared but not emitted | None (mechanism) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order: clamp, empty check, block range, bounding box, mark on invalidate; horizontal run, downward extension with width narrowing, clear, emit on screen, advance, reset the bounding box on traverse. It omits the screen-size types, the window draw callback and the second draw pass, the light-FX buffer, and the accessors. It replaces the donor's empty-grid trick (an inverted clamp range) with an explicit `highRow < 0` return. The constructor replaces `reset`, so a resize means building a new grid.

```ts
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
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/openrct2-dirty-grid.ts`).

## 5. Lands in

- TARGET `src/fight/hud-dirty.ts` (new, client-only: the damage tracker for the HUD canvas layer; the engine in `src/fight` never imports it). Parity-checklist row 14 (HUD).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only, shape not code)
- Brief rule served: 7 (licence: GPL clean-room, shape only); addendum rule: HUD is client-only.

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch was written from the mechanism, not from the donor lines.
- Not for the 3D fight view. A third-person camera moves every frame, so the whole view is dirty every frame and a dirty-rectangle pass there is wasted work. Limit the idea to the HUD canvas.
- Overhead, not a bug: the vertical merge can narrow a row, and the leftover columns of the first row are then emitted later as a separate rectangle. The cover is still correct, but it costs one more draw. The test should count emitted rectangles per frame.
- Resize drops pending dirty blocks, because `reset` clears them. The only caller I read (`UiContext.cpp` 853-862) calls `GfxInvalidateScreen` straight after the resize, so the donor is safe. Frankendom must keep the same rule: a resize means a full invalidate.
- A missing invalidate shows stale HUD text, and the donor has no check for it. Frankendom fix: each HUD value carries a version number, and the HUD marks its rectangle when the version changes; a test asserts this for each bar and label.
- Block size is fixed at 128 px in the donor. On phones the HUD should set it from the device scale; the donor does not show that. Engine constant here.
