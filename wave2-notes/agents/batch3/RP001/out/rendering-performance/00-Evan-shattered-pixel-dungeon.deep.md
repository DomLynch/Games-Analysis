# 00-Evan-shattered-pixel-dungeon (rendering-performance, cell 17)

Donor: `/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/SPD-classes/src/main/java/com/watabou/noosa/Tilemap.java` | Licence: GPL-3.0-or-later (Tilemap.java header: "either version 3 of the License, or (at your option) any later version"; LICENSE.txt is GPL version 3) | Java | symbol `Tilemap.draw` / `Tilemap.updateVertices` (with `Vertexbuffer.updateVertices`, `NoosaScript.drawQuadSet`)

Checked: `Tilemap` (Tilemap.java 35-248) read in full; `Vertexbuffer` (glwrap/Vertexbuffer.java 30-123) read in full; `NoosaScript.drawQuadSet(Vertexbuffer,...)` (noosa/NoosaScript.java 129-145) read; `Rect.union(int,int)` (utils/Rect.java 111-127) read in full. Callers read: `DungeonTilemap.updateMapCell` (tiles/DungeonTilemap.java 59-74), `GameScene.updateMap()` and `GameScene.updateMap(int)` (scenes/GameScene.java 1391-1420). Camera: out of scope (not read as a camera topic). Hint file `Atlas.java` was opened: it is a UV-rect helper for a whole sheet and is not what Tilemap uses (Tilemap uses `TextureFilm`). Confidence high on the Tilemap draw path. Not read: `SmartTexture`, the body of the `NoosaScript` shader, `Camera.java`, `Gizmo.java`, the bodies of `Game.create`/`Game.resize` beyond the lines cited. Searched the whole donor Java for GL instancing, LOD, mipmaps and render-scale or quality tiers (grep, no hits for any of them).

## 1. Mechanism

- One `Tilemap` is one vertex buffer and one draw call. The buffer holds 16 floats per map cell (four corners, each x, y, u, v), built by `updateVertices` (Tilemap.java 115-191). The layer is drawn with `script.drawQuadSet( buffer, size, 0 )` (230), so every cell is submitted every frame, whether or not it is on screen.
- Changes are coalesced per frame. `updateMapCell(cell)` does `updated.union(...)` (107), which grows one pending rectangle in place (Rect.java 111-127) to cover every dirty cell since the last draw.
- Order of steps when a tile changes, as the code runs:
  (a) Game code calls `GameScene.updateMap(cell)`, which calls `updateMapCell` on each layer (GameScene.java 1406-1408).
  (b) `DungeonTilemap.updateMapCell` rebuilds the 3x3 neighbourhood of the cell's visual data (DungeonTilemap.java 61-63, because a stitched tile depends on its neighbours) and marks the two corner cells of that 3x3 as dirty, so the rectangle covers the neighbourhood (65-67).
  (c) At draw time, `draw()` checks `!updated.isEmpty()` (201). If the rectangle is non-empty it is copied to `updating` and cleared (`moveToUpdating`, Tilemap.java 111-112).
  (d) Only the cells in that rectangle are rebuilt (126-189). A rendered cell gets its 16 floats; a cell with no render or no uv gets 16 zeros (144-176). The first and one-past-last linear cell indices are recorded (135-138).
  (e) The vertex buffer is told about the range. If `fullUpdate` is set (after `updateMap()`, lines 101-104) the whole buffer is passed (206-207); otherwise the linear range `topLeftUpdating*16` to `bottomRightUpdating*16` is passed (210-211). `Vertexbuffer.updateVertices` merges this with any pending range by min start and max end (61-73).
  (f) The draw then calls `drawQuadSet(Vertexbuffer, ...)`, which calls `updateGLData()` (NoosaScript.java 135). That uploads the merged range with `glBufferSubData`, or with `glBufferData` when the range is the whole buffer (Vertexbuffer.java 81-85). Then one `glDrawElements` covers the whole set (NoosaScript.java 144).
- Culling: none per tile. Hidden tiles are zero-size quads that are still drawn. The donor says so on purpose: "This does result in the quad being drawn, but we are skipping all pixel-filling" (Tilemap.java 172-175). The visible-range fields (`camX`, `camY`, `camW`, `camH`, `topLeft`, `bottomRight`, `length`) exist only as comments (193-194). Per-visual culling exists only at group level: `Group.draw` skips a member when `isVisible()` is false (Group.java 75), and `isVisible` is an axis-aligned test against the camera scroll rectangle (Visual.java 275-296). It ignores rotation (280).
- Per-sprite path for comparison: `Image.draw` re-uploads only when `dirty` (Image.java 162-170) and issues one `script.drawQuad(buffer)` per sprite (183). `BitmapText` rebuilds its quads only when dirty (BitmapText.java 76-82) and draws a whole string in one `drawQuadSet` (95).
- Shader variant: `Tilemap` uses `NoosaScriptNoLighting` (Tilemap.java 235). Its `lighting()` is empty (NoosaScriptNoLighting.java 33-36), and its header says it is for "heavy pixel-fill based loads" where lighting is not needed (26-27). The header also warns that switching programs is expensive (29). `Script.use` changes program only when the class changes (Script.java 41-53).
- Frame pacing: `Game.update` clamps the frame delta to 0.2 s (Game.java 271) before it sets `Game.elapsed` (272). `Emitter` accumulates `time += Game.elapsed` and emits while `time > interval` (Emitter.java 123-124), so a long frame catches up on emissions up to the clamp.
- GPU memory and context loss: `Game.create` and `Game.resize` reload textures and vertex buffers when the GL version object changes (Game.java 112-116, 129-133). A scene switch calls `Vertexbuffer.clear()` (257).
- Not found in this donor (grep over all Java, plus reading the rendering files): instanced drawing, LOD, mipmaps, dynamic resolution, a quality-tier setting for rendering, a draw-call budget, and any frame-time budget.

## 2. Key functions

- `Tilemap.updateVertices`: `/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/SPD-classes/src/main/java/com/watabou/noosa/Tilemap.java` 115-191 (rebuilds only the pending rectangle; zero-size quad for hidden cells, 172-176).
- `Tilemap.draw`: same file, 196-232 (flush pending rectangle, choose full or partial upload, one `drawQuadSet`).
- `Tilemap.updateMapCell`: same file, 106-108 (union of the dirty cell into the pending rectangle).
- `Rect.union(int,int)`: `/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/SPD-classes/src/main/java/com/watabou/utils/Rect.java` 111-127 (in place; sets an empty rectangle to the one cell).
- `Vertexbuffer.updateVertices(buf, start, end)` and `updateGLData`: `/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/SPD-classes/src/main/java/com/watabou/glwrap/Vertexbuffer.java` 61-73 and 75-89.
- `NoosaScript.drawQuadSet(Vertexbuffer, length, offset)`: `/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/SPD-classes/src/main/java/com/watabou/noosa/NoosaScript.java` 129-145.
- `DungeonTilemap.updateMapCell` (3x3 and corner marks): `/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/tiles/DungeonTilemap.java` 59-74.
- `GameScene.updateMap(int)`: `/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/scenes/GameScene.java` 1406-1420 (fans the cell out to every layer, then to fog).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Many changes in one frame become one dirty rectangle (bounding box, grown in place) | None; the rectangle is whatever the changes span (Rect.java 111-127) |
| Only the dirty rectangle is rebuilt on the CPU | None (Tilemap.java 126) |
| One contiguous float range is uploaded per frame, not one upload per cell | 16 floats per cell (four corners x x,y,u,v; Tilemap.java 146-168 and the `* 16` at 211) |
| Stitched tiles also dirty their 3x3 neighbourhood | 3x3 (DungeonTilemap.java 61-63, `NEIGHBOURS9`) |
| Tile sheet is one texture cut into a grid | 16 px cell (DungeonTilemap.java 36, 41) |
| Hidden cell is a zero-size quad, not a culled one | None (Tilemap.java 172-176) |
| Index buffer built once for the largest quad set | Built for `Short.MAX_VALUE` quads (Quad.java 61) and the donor comment says "up to 32k quads" (Quad.java 59). Derived, not run: the indices are unsigned shorts (NoosaScript.java 144), and `(short)(ofs + 0)` (Quad.java 92) wraps past 65535, so quad 16384 and above in one draw point at vertices 0 onwards. The safe limit I derive is 16,384 quads per draw. |
| Frame delta clamp | 0.2 s (Game.java 271) |
| Map sizes read | CavesBossLevel 33 x 42 (CavesBossLevel.java 106-107); LastLevel 16 x 64 (LastLevel.java 125). Other levels not read. |

Worked numbers from the sketch test (run on the VPS, see section 4): a 4 x 3 map has 12 cells. One dirty cell uploads 16 floats (`16-32`). Two diagonal dirty cells (1 and 6) span a 2 x 2 block but upload `16-112` (96 floats, six cells): the linear range runs from cell 1 to cell 6 and so includes cells 3 and 4, which lie outside the block. Marking all cells uploads all 192 floats, as a full update. Two cells at opposite corners upload the whole 192.

For a phone-class GPU, a 33 x 42 layer is 1,386 quads, which is 2,772 triangles drawn once per frame. That is well inside what a phone GPU can draw, but I have not measured it on a phone (not run).

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (coalesce into one rectangle, rebuild only that rectangle, zero-fill hidden cells, then one range upload per flush). It omits the 3x3 neighbour expansion (that belongs to the caller), the `volatile`/`synchronized` state, the pending-range merge across several flushes that `Vertexbuffer` does (the sketch uploads once per flush and does not merge), the GL draw call and texture bind (the `upload` callback stands in), the context-loss reload, and the commented-out camera fields. The usage lines at the bottom are a demo and are not in the donor. The sketch is a clean-room rewrite from the described mechanism, not a translation of the donor lines (GPL-3.0-or-later).

```ts
// Licence: GPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
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
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS with `export {}` at the top of the file: exit 0. Behaviour: the same file plus a 4 x 3 test ran under `node --experimental-transform-types` on the VPS and printed `false:16-32 | false:16-112 | true:0-192 | false:0-192 quads 12`, matching the donor order in section 3 (node printed an ExperimentalWarning, not an error).

## 5. Lands in

- TARGET `src/client/render/zone-tiles.ts` (new, client-only). No `src/fight` module owns rendering, and the brief's `src/fight` path does not fit a render-only mechanism, so this is a named exception. It would hold the per-zone static layers (floor, fog, decals) as one batched layer per zone.
- Parity row 16 (colour grade/quality). Plainly: no row 1-23 is a render-cost row. Row 16 is the closest because it is the quality row, but this mechanism is a performance fit, not a colour fit.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: 1 (client-only rendering; the engine keeps state, the client only draws it); rules 7-9 n/a

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism. Do not copy the Java.
- Frankendom is Three.js, not this GL wrapper. The port is to a Three.js `BufferAttribute` with `addUpdateRange` (or per-zone instanced meshes), not a line port of `Vertexbuffer`. I have not checked the current Three.js API in this pass (not read).
- Rulings: state comes from the engine. A dirty mark must come from server-applied state (one ledger; kills are server-verified), never from a client guess. The donor marks dirty from game code it owns, and there is no server in the donor.
- Culling: the donor draws every cell and only zeroes hidden ones. For Frankendom, a zone's static layers should be culled by zone bounds (zone data) at layer level, not per cell. Measure on a phone before adopting either way (not run).
- The linear range uploads everything between the top-left and bottom-right cells (section 3 test). For tall, narrow dirty rectangles this costs more than the rectangle. Frankendom should upload per row or per chunk if its zones are large (not measured).
- The index limit: the donor's 32k comment does not hold for 16-bit indices; the derived safe limit is 16,384 quads per draw. Any Frankendom batch over that needs splitting. Zone sizes in Frankendom were not read in this pass.
- Donor has no quality tiers, no dynamic resolution, no LOD and no instancing. Those ideas are not in this donor; do not cite SPD for them.
- Nothing here is measured on a device. The phone budget in section 3 is arithmetic, not a frame timing.

Best transferable idea: coalesce all of a frame's dirty cells into one rectangle, rebuild only that rectangle, and upload one contiguous range to the GPU instead of one upload per cell.
Decision (proposed): adapt - the zone floor and fog layers are per-cell data that change a few cells at a time, so one range update per static layer per frame fits; port it to Three.js BufferAttribute update ranges, not as a line port, and take the 16,384-quad split rule from the 16-bit index limit (derived), not the donor's per-cell zero-quad choice, which costs GPU time on every hidden cell.
Acceptance: on a phone, opening a door repaints only the changed patch in that frame, and the GPU frame trace shows one sub-range upload per static layer per frame (a client test asserts two changes in one frame produce one flush with the merged range).

Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
Brief rule served: 1 (client-only rendering; the engine keeps state, the client only draws it); rules 7-9 n/a
