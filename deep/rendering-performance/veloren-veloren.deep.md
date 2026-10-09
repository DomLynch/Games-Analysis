# veloren-veloren (rendering-performance, cell 17)

Donor: /mnt/frankendom-donors/veloren-veloren/voxygen/src/mesh/greedy.rs | Licence: GPL-3 | Rust | symbol GreedyMesh / create_quad (line 319 is `pub struct GreedyMesh`; `create_quad` is at 881, its feeder `create_quad_greedy` at 851)

## 1. Mechanism
- Input: a voxel chunk, as a 3D grid of blocks. For each block face the mesher asks, through callbacks, whether a face should be drawn and what its material "meta" is.
- `GreedyMesh::push` (lines 377-393) calls `greedy_mesh` and stores the returned boxed continuation; `finalize` (404-411) allocates one blank atlas texture of the final `tex_size` and runs every stored continuation into it, so the texture is sized exactly once the whole atlas is known.
- `greedy_mesh` runs three passes, one per axis (x with u=y,v=z at line 460; y with u=z,v=x at 501; z with u=x,v=y at 542). Each pass calls `greedy_mesh_cross_section` with the plane count taken from `greedy_size_cross`; the cross-section visits `dims.z + 1` planes (`d` in 0..=dims.z) and recomputes the mask from `draw_face` at each plane.
- Inside a layer, a 2D mask holds `Option<M>` per cell. In `greedy_mesh` that M is `(faces_forward, meta)`, so faces pointing opposite ways never merge, and meta that differs (the config doc mentions a water-exposed bit) does not merge either. The sweep scans row by row. At a set cell it grows a rectangle to the right while the cell equals the starting value, then grows it downwards while every cell of the next row across that width equals it.
- Each finished rectangle is one quad. Its cells are cleared from the mask so they are not emitted twice.
- Each quad is placed in a texture atlas (`add_to_atlas`) and turned into a face with `create_quad_greedy`, which, when the face points backwards, swaps the two draw-dimension vectors and the two atlas dimension vectors and negates the normal. `add_to_atlas` asks the allocator for (width+1, height+1) texels; on failure it doubles the atlas (capped at `max_size`) and retries, and if already at `max_size` it panics (the comment above it says the geometry would be skipped with a warning, but the code panics). It also records a deferred todo-rect (position shifted back by the normal when facing forward, the uv axes, the atlas rectangle, the light-sample offset).
- The final stage (`draw_texels`, run from the boxed closure) walks each todo-rect and, per texel, averages light, AO and glow over the face cell plus its u- and v-neighbours and (only if either neighbour is see-through per `get_opacity`) the diagonal cell, divides by 4, then hands `make_face_texel` a light value (average times 31.5 as u8), a glow value (same scaling) and a one-bit AO flag (average above 0.7). Opacity only gates the diagonal sample; it is not written as a texel channel.
- Output: one `push_quad` callback per rectangle, plus the atlas texture from `finalize`. `create_quad` (881-901) turns one quad into four vertices through a `create_vertex` closure; it is a standalone pub function, and which caller wires it to the push callback is outside this file (not read). No server contact. Runs on the client during meshing.

## 2. Key functions
- `GreedyMesh` struct - /mnt/frankendom-donors/veloren-veloren/voxygen/src/mesh/greedy.rs lines 319-329 (impl 331-414: `new` 347-364 asserts the smaller max dimension is at least 4, `push` 377-393, `finalize` 404-411). Holds atlas, texture size, max size, suspended meshes.
- `greedy_mesh` - same file lines 416-598. Three axis passes plus the texel closure.
- `greedy_mesh_cross_section` - same file lines 602-662. The row and height merge on a 2D mask. This is the core algorithm.
- `add_to_atlas` - same file lines 664-730. Places each quad rectangle in the atlas allocator.
- `draw_texels` - same file lines 739-846. Deferred texel pass: light, glow and AO sampling per atlas texel.
- `create_quad_greedy` - same file lines 851-879. Adjusts origin, dimension and normal for face direction, then calls push.
- `create_quad` - same file lines 881-901. Builds the four vertices of one quad from atlas position, offsets and normal via a vertex-factory closure.
- `general_config` / `sprite_config` - same file lines 108-135. Guillotiere allocator options (alignment 1x1, small-size threshold 3, large-size threshold 8 in both).

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Greedy rectangle merge on a 2D mask, one layer at a time | (none in the algorithm itself) |
| Three axis passes so each face is emitted once | Axis order x, y, z with (u,v) = (y,z), (z,x), (x,y) (theirs, lines 460, 501, 542; any fixed order works) |
| Clear merged cells so no face is emitted twice | (none) |
| Atlas packing with a per-chunk max size, growing when full | max_size and atlas config (theirs; thresholds small 3 / large 8 at lines 113-114 and 127-128; allocator doubles from its start size up to max_size, add_to_atlas lines 706-709) |
| Texel data per face (AO, light, glow, opacity) | Light and glow scaled by 31.5 into u8, AO as a single bit at threshold 0.7 (theirs, lines 839-841); four-sample average, divide by 4 (line 820) |

## 4. TypeScript sketch
Sketch type: clean-room (GPL-3 donor). Written from the merge mechanism above, no lines translated.

simplified: the donor repeats this for x, y and z with a plane loop of dims.z+1 planes, rebuilds the mask per plane, merges only cells whose (faces_forward, meta) tuple is equal, and defers atlas placement and texel work; the sketch handles one pre-built layer, compares meta with `!==` (identity, fine for primitive meta), and has no direction flag, atlas, or texels.

```ts
// Licence: GPL-3 - clean-room sketch, no lines translated
// Greedy merge over a 2D layer: grow right while the cell matches, then grow down while full rows match.
type Cell<M> = M | null;

function mergeLayer<M>(
  w: number,
  h: number,
  cell: (x: number, y: number) => Cell<M>,
  emit: (x: number, y: number, rw: number, rh: number, meta: M) => void,
): void {
  const grid: Cell<M>[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) grid.push(cell(x, y));
  const at = (x: number, y: number): Cell<M> => grid[y * w + x];

  const rowMatches = (x0: number, y: number, n: number, meta: M): boolean => {
    for (let dx = 0; dx < n; dx++) if (at(x0 + dx, y) !== meta) return false;
    return true;
  };

  for (let y = 0; y < h; y++) {
    let x = 0;
    while (x < w) {
      const meta = at(x, y);
      if (meta === null) {
        x++;
        continue;
      }
      let rw = 1;
      while (x + rw < w && at(x + rw, y) === meta) rw++;
      let rh = 1;
      while (y + rh < h && rowMatches(x, y + rh, rw, meta)) rh++;
      emit(x, y, rw, rh, meta);
      for (let dy = 0; dy < rh; dy++) for (let dx = 0; dx < rw; dx++) grid[(y + dy) * w + x + dx] = null;
      x += rw;
    }
  }
}
```

## 5. Lands in
- Frankendom file(s): TARGET origins/zones/greedy-mesh.ts (new module, proposed path; zone terrain is data, so the mesher consumes the zone catalogue's voxel/tile layer). Today: no meshing module in src/ or src/fight/.
- Parity-checklist row: 16 (colour grade / quality) is the nearest row; no row covers zone meshing, so this is a feature-map item under "zones as data" (rendering performance). Not a fight item.
- Reuse tag: rewrite-from-idea (GPL-3 donor; the algorithm is standard and the sketch is clean-room)
- Brief rule served: (category default, not per-cell) 3 (warm up at zone entry); rules 7-9 n/a

## 6. Gaps and risks
- The donor mesher is tied to Veloren's voxel block model, its atlas allocator (guillotiere) and its texel and lighting formats. Frankendom would need its own meta type and face test.
- Atlas-based texel packing is a large part of this file. For Frankendom's pipeline, the simpler step is the merge itself; the atlas can come later if at all.
- Licence: GPL-3. Only the algorithm is described here; no lines are translated. Any Frankendom port must stay clean-room.
- Verified now: lines 1-80, 100-140, 300-901 of greedy.rs were opened, covering every function in section 2. Not read: lines 140-300 (GuillotiereTiled allocator internals) and the callers in terrain/figure meshing outside this file.
- Nothing here is server-related. Frankendom rulings: one engine, zones as data, server-verified kills, one ledger. Meshing is a client concern and must not feed any hit-test or kill decision (MAX_ATTACKERS = 3 does not interact).
