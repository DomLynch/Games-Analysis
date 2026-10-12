# veloren-veloren (rendering-performance, cell 3)

Donor: `/mnt/frankendom-donors/veloren-veloren/voxygen/src/mesh/greedy.rs` (with its caller `voxygen/src/mesh/terrain.rs`) | Licence: GPL version 3 (LICENSE file text, "Version 3, 29 June 2007"; greedy.rs and terrain.rs carry no licence header, so "or later" is not stated in what I read) | Rust | symbol `greedy_mesh_cross_section` (+ `greedy_mesh`, `GreedyMesh::push`)

Checked: Read in full: greedy.rs 1-68 (config struct and its comments), 316-420 (GreedyMesh and push, partial), 416-520 (greedy_mesh, the x and y axis passes), 602-662 (greedy_mesh_cross_section, the merge), 664-738 (add_to_atlas), 739-800 (draw_texels, first part only), 851-879 (create_quad_greedy). terrain.rs 23-30 (FaceKind), 370-380 (chunk size and cross dims), 395-396 (should_draw), 434-470 (push call and opaque quad path, partial). Callers: `greedy.push` at terrain.rs 442 and segment.rs (greedy_size_cross set at 55, 152, 299, 381; the segment pushes at 73, 177, 319, 404 not read). Candidates opened for the hint: greedy.rs was the hint; I also opened terrain.rs and segment.rs. Not read: `should_draw_greedy` (its body; the returned face flags are taken from the trait bound at greedy.rs 452), the AO and light closures, the rest of draw_texels (after line 800), the vertex format, and any culling or LOD code. The terrain scene culling (voxygen/src/scene/terrain/mod.rs) and the LOD terrain (voxygen/src/scene/lod.rs) were located by grep but NOT read; they are the next candidates for a culling or LOD note. Confidence high on the greedy merge; medium on the atlas bake (partial read).

Best transferable idea: Merge touching faces that share the same material and the same must-not-merge flags into one rectangle per row-run, so a flat zone floor or a wall becomes a few quads instead of one per tile.
Decision (proposed): adapt - take the merge for static zone geometry; key it on material plus the water/fluid flag and the face direction; reject the per-quad texel atlas bake for now (it exists to keep per-voxel light inside a merged face, and a browser zone can carry light as vertex data if it needs it; not checked against our renderer).
Acceptance: A flat 20 by 20 floor of one material is one quad in the zone mesh (a client test counts quads and asserts 1), and a shoreline cell is never merged into a land quad (the test asserts the water flag keeps them apart).

## 1. Mechanism

- Per chunk, `terrain.rs` builds a `GreedyMesh` and pushes one `GreedyConfig` (terrain.rs 442). The config supplies the chunk origin, the greedy size, the cross sizes, the per-voxel light, AO and opacity functions, the face rule `should_draw`, and the quad callback (greedy.rs 12-67).
- Chunk size is capped: x and y at most 32, z at most 16384 (terrain.rs 370). The cross sizes for vertical planes are one less than the chunk on x and y (terrain.rs 377; greedy.rs 24-32 explains that vertical faces at a chunk border would otherwise be emitted twice).
- `greedy_mesh` runs three axis passes (x at greedy.rs 460-461, y at 501-502, z at 542-543), each calling `greedy_mesh_cross_section`. I read the x and y bodies in full (460-520); the z body was not read, but it uses the same call shape. Each pass hands the face rule the 3D position and the face direction.
- Per pass, `greedy_mesh_cross_section` (greedy.rs 602-662), in order:
  (a) For each plane d from 0 to dims.z inclusive (613), build a mask of dims.x by dims.y entries. Each entry is the face's `Option<(faces_forward, meta)>` from the rule (615-620).
  (b) Scan rows j from 0 (622). At the first set cell i, take the width: the run of cells to the right whose entry equals this one (627-631). Stop at the first different entry (630).
  (c) Take the height: extend to row j+1, j+2, ... while the whole run of width cells in that row matches (635-642). The first row that fails ends the height.
  (d) Emit one quad at (i, j, d) with width x height (645). Clear the emitted cells in the mask (647-653).
  (e) Continue the scan at i = i + width (654-655). Unset cells are skipped by one (656-657).
- Merge key: the entry is `(bool, meta)` with the meta compared by equality (greedy.rs 452 and the `M: PartialEq` bound at 377 and 602). Terrain's meta is `FaceKind`: `Opaque(bool)`, where the bool says the face looks onto water, or `Fluid` (terrain.rs 23-29). So a face facing water never merges with one that does not (the rule written at greedy.rs 52-54).
- Per quad, the atlas: `add_to_atlas` allocates a rectangle of (width+1) by (height+1) texels, one per corner (greedy.rs 680). The atlas grows by doubling up to the maximum size (706-709). If it is full at the maximum, the code panics (697-702). The texels are filled later by `draw_texels` (739-800, first part read). The part read calls the opacity function on the neighbouring voxels for each texel (797-800); how the light and AO values are combined from those calls is not read.

Order of operations per chunk: for each axis, for each plane, build the mask; scan rows; grow width; grow height; emit; clear; continue. Then allocate and fill the atlas for the emitted quads.

## 2. Key functions

- `greedy_mesh_cross_section`: `/mnt/frankendom-donors/veloren-veloren/voxygen/src/mesh/greedy.rs` 602-662. The merge: mask, width run, height run, emit, clear.
- `greedy_mesh` (x and y passes read; z pass starts at 542, body not read): `/mnt/frankendom-donors/veloren-veloren/voxygen/src/mesh/greedy.rs` 416-545. Sets up the cross sections for each axis and forwards each quad to the atlas.
- `add_to_atlas`: `/mnt/frankendom-donors/veloren-veloren/voxygen/src/mesh/greedy.rs` 664-730. Corner-texel rectangle, grow by doubling, panic at max.
- Chunk caller: `/mnt/frankendom-donors/veloren-veloren/voxygen/src/mesh/terrain.rs` 370-377 (size cap and cross sizes) and 442-470 (push and opaque quad path).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Row-run then height-run rectangle merge (greedy meshing) | None; the merge is a fixed rule (greedy.rs 627-645). |
| Merge key includes flags that must not merge | Water flag in FaceKind::Opaque(bool) (terrain.rs 25-26). |
| Max chunk bounds | x and y at most 32, z at most 16384 (terrain.rs 370). |
| Cross planes one less on x and y | Minus 1 (terrain.rs 377). |
| Corner-texel rectangle per quad | (width+1) by (height+1) (greedy.rs 680). |
| Atlas growth | Doubling, capped at max size (greedy.rs 707). |

## 4. TypeScript sketch

simplified: the sketch is one plane with one number key (material and flags folded together). It omits the three axis passes, the plane loop (dims.z+1 planes), the face direction bit that the donor keeps in its key, the chunk cross-size rule, the corner-texel atlas and the texel bake, and the AO and light callbacks. It keeps the donor's scan order exactly (row by row, width run, height run, clear, step by the width). The demo output below was checked by running the compiled sketch on the VPS: `[{0,0,2,2,1},{2,0,1,3,2},{3,2,1,1,2}]`, which matches a hand trace of the same mask.

```ts
// Licence: GPL-3.0 (donor, LICENSE file; greedy.rs has no licence header). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Greedy rectangle merge for one plane of faces: a face is a key (material plus flags) or null. Equal-key faces that touch merge into one quad.
interface Quad { x: number; y: number; w: number; h: number; key: number; }

function rowMatches(m: (number | null)[], nx: number, row: number, i: number, w: number, key: number): boolean {
  for (let k = i; k < i + w; k++) {
    if (m[row * nx + k] !== key) return false;
  }
  return true;
}

function greedyPlane(mask: (number | null)[], nx: number, ny: number): Quad[] {
  const m = mask.slice(); // work copy; cells are cleared as quads are emitted
  const out: Quad[] = [];
  for (let j = 0; j < ny; j++) {
    let i = 0;
    while (i < nx) {
      const key = m[j * nx + i];
      if (key === null) { i += 1; continue; }
      let w = 1;
      while (i + w < nx && m[j * nx + i + w] === key) w += 1;
      let h = 1;
      while (j + h < ny && rowMatches(m, nx, j + h, i, w, key)) h += 1;
      out.push({ x: i, y: j, w, h, key });
      for (let l = j; l < j + h; l++) {
        for (let k = i; k < i + w; k++) m[l * nx + k] = null;
      }
      i += w;
    }
  }
  return out;
}

const demo = [1, 1, 2, null, 1, 1, 2, null, null, null, 2, 2];
console.log(JSON.stringify(greedyPlane(demo, 4, 3)));
```

## 5. Lands in

- TARGET `origins/client/render/zone-mesh.ts` (proposed new file; path not checked against the repo). Static zone geometry only (floors, walls, rock faces). Client-only: the engine never reads the mesh, so no src/fight change. Hit tests use the zone's gameplay data, not this mesh (rule to enforce; see section 6).
- Parity-checklist row 16 (colour grade / quality): this is a draw-cost and visual-quality lever. No row covers static zone geometry; 16 is the nearest. Lead may want a row for zone meshing.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: zones as data (the mask comes from zone tiles, so the merge is data-driven); camera/HUD client-only ruling; rules 7-9 n/a

## 6. Gaps and risks

- Defect (donor): the comment at greedy.rs 687-691 says that when an atlas allocation fails at the maximum size "we choose to just skip the geometry and log a warning, rather than panicking", but the code panics (697-702). Fix: return without the quad and log, as the comment says, so one bad chunk cannot crash the client. The sketch has no atlas, so it does not carry this defect.
- Merge key discipline: the donor keys merges on material, direction and the water flag (greedy.rs 52-54). Frankendom must add its own must-not-merge flags to the key (for example: zone boundary, Pit edge, lit versus shadowed band if those become per-face). A key that is too broad produces faces that are too large and light wrong; too narrow gives back the draw calls.
- Chunk seam: the cross size minus one (terrain.rs 377) avoids duplicate vertical faces at chunk borders only if the neighbour chunk emits the boundary. Frankendom's chunk and zone seams need a test.
- Per-quad texel atlas: reject for now. It adds an atlas, a texel fill and a size budget (greedy.rs 680-709) to keep per-voxel light; a browser zone can take light from vertex data if the renderer needs it. Not checked against our renderer.
- The mask is rebuilt per plane by calling the face rule for every cell (greedy.rs 615-620). That is fine per chunk but costs time if zone tiles are re-meshed often; build once per zone change, not per frame.
- Not read: `should_draw_greedy`, the AO and light closures, the rest of draw_texels, the vertex format, segment.rs meshes, and the terrain scene culling and LOD (voxygen/src/scene/terrain/mod.rs, voxygen/src/scene/lod.rs), which are the next note for the culling and LOD topic.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN. Verified: greedy_mesh_cross_section 602-662 as described, merge key Option<(bool,M)>, three axis passes, FaceKind, chunk cap assert, add_to_atlas 664-730 including the panic at 697-702 contradicting the comment at 687-691 (real defect), config comments, LICENSE v3; sketch demo output traces correctly by hand.
- Missed: none.
