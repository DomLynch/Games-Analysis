# PixelGuys-Cubyz (rendering-performance, cell 17)

Donor: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/renderer/mesh_storage.zig` | Licence: GPL-3.0 (repo `LICENSE` is the GPL v3 text; no "or later" statement found in the README or the walk file) | Zig | symbol `updateAndGetRenderChunks`

Checked: `updateAndGetRenderChunks` (mesh_storage.zig 547-709, read in full; it ends before `updateMeshes` at 710), `ChunkMeshNode` fields (24-31, read), `Frustum` and `Frustum.testAAB` (renderer.zig 862-891 read; the struct tail not read), the caller and the frame order (renderer.zig 205-258, 155-166, read), mesh upload budget (`updateMeshes`, mesh_storage.zig 710-727, read), frame cap loop (main.zig 466-483, read), settings (settings.zig 15, 23, 32, 34, 58, read), chunk constants (chunk.zig 11-12, 74, read). GPU side read for the parts that matter to the draw list: `chunk_meshing.zig` 213-268 and 404-440, `fillIndirectBuffer.comp` 59-111, `occlusionTestVertex.vert` 45-58 and `occlusionTestFragment.frag` 1-11 (read in full), `chunk_fragment.frag` lines 36-40 only (not read beyond the dither function head). Confidence: high on the CPU walk order (read end to end); medium on the GPU two-pass occlusion summary (read, not run). Not read: `createNewMeshes`, `freeOldMeshes`, `ChunkMesh.uploadData`, `chunk.Neighbor` helpers (`extractDirectionComponent`, `relPos`), `CircularBufferQueue` push semantics when full, the body of `passDitherTest` callers, `chunk_meshing.zig` face bucket source (`optionalList` caller). `camera_scope` not applicable (rendering cell; the frustum follows the camera matrix but does not change it).

## 1. Mechanism

- Per frame, the renderer builds a camera frustum from the camera matrix, with the camera at the origin (renderer.zig:213). The frustum has four side planes and no near or far plane (renderer.zig:867, comment "Who cares about the near/far plane anyways?").
- The chunk list is a hierarchical walk, not a scan of all chunks (mesh_storage.zig 575-705). Order of steps as the code runs:
  (a) Align the player position to the coarsest node that contains it (`lod = settings.highestLod`, lines 580-590). If that node has no mesh (`finishedMeshing`), the walk stops with nothing to draw (592-593, 601 has nothing to pop). This is a wait gate.
  (b) Pop nodes from a 1024-entry queue (577, 601). Only the coarsest nodes flood sideways: for a top-level node, each of the six neighbours is considered (613-617). A positive neighbour is skipped when its origin is not beyond the player along that axis (616); a negative neighbour is skipped when the current node starts ahead of the player along that axis (617). A neighbour is queued at the back only if it is not already active, has a mesh (625), and its box passes the frustum test (627-630).
  (c) For every popped node, if all eight finer children have meshes (`finishedMeshingHigherResolution == 0xff`, 635), the node is not drawn. Its eight children are tested one by one against the frustum (653) and the passing ones go to the front of the queue (657). Otherwise the node itself goes to the draw list (662).
  (d) For every drawn node, the six seams are checked against the next coarser level (667-687). A seam is marked when the coarser neighbour is not fully refined (681). A changed seam mask re-uploads that mesh (684-689).
  (e) Each drawn node with a mesh is queued for a mesh update if needed (693-697), and non-empty meshes form the output list (702-703).
- Result: each place in view is drawn at the coarsest level whose children are not all ready, and at the finest level once the children are ready. Boxes outside the four side planes are not drawn (there is no near or far test), and a coarse node is not replaced until its eight children are all meshed, so there are no holes while the finer data arrives.
- Draw side (GPU, read for the draw list only): the CPU list is split per LOD (renderer.zig:245-252; `chunk_meshing.zig` 213-217, transparent in descending LOD). Each LOD's chunks are drawn with one multi-draw indirect call (246, 267). A compute pass writes eight command slots per opaque chunk (223), culls face groups whose normal faces away from the player (`isVisible`, `fillIndirectBuffer.comp` 37-53, used at 86), and drops the optional face group (indices 7-13) for chunks whose box is farther than `lod0.5Distance` (84). A second, temporal pass draws chunks that were visible last frame, then runs bounding-box occlusion tests (249-252), then draws the chunks that the test marked visible this frame and that the first pass did not draw (257-267; `fillIndirectBuffer.comp` 82, 99-102). A chunk that contains the camera is always marked visible (`occlusionTestVertex.vert` 50-53). Read, not run.
- Frame budget: the mesh upload work after drawing is capped at 12 ms (renderer.zig:35, 165). `updateMeshes` checks the deadline after each upload and always does at least one (mesh_storage.zig 722; also 770 for the map pass).
- Frame cap (optional, `fpsCap` null by default, settings.zig:23): the sleep is the rest of the frame measured from the frame start (main.zig 470-477). On Windows targets under 20 ms, the code spin-waits instead of sleeping (473-475).
- Fade at the LOD edge: beyond `lodDistance` the opaque fragment passes (`chunk_fragment.frag` 38); in the 32 blocks before it, alpha is pulled toward 1 (39-40). The dither comparison after line 40 was not read.

## 2. Key functions

- Walk: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/renderer/mesh_storage.zig` 547-705 (`updateAndGetRenderChunks`).
- Node state: same file, 24-31 (`ChunkMeshNode`: `finishedMeshing`, `finishedMeshingHigherResolution` as a bitmask of eight children, `active`, `rendered`, `isNeighborLod`).
- Frustum: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/renderer.zig` 862-891 (`Frustum` planes at 867, `init` at 869, `testAAB` at 886-891).
- Caller and frame order: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/renderer.zig` 205-258 (frustum built at 213, walk at 237, per-LOD lists at 245-252, transparent at 293), and 155-166 (upload budget after the world draw).
- Per-LOD draw: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/renderer/chunk_meshing.zig` 213-268.
- Face groups for culling: same file, 404-440 (seven normal buckets then seven optional buckets).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Walk from the coarsest cell around the player; refine into eight children only when all are ready | Highest LOD 5 (theirs, settings.zig:15, 34); six LOD levels (0-5) |
| Child refinement tested against the view frustum | Chunk edge 32 blocks (theirs, chunk.zig:11-12); top cell edge 32 x 2^5 = 1024 blocks (arithmetic) |
| Frustum from the camera matrix, four side planes, sign test on box corners | No near or far plane (theirs, renderer.zig:867) |
| Queue capacity | 1024 entries (theirs, mesh_storage.zig:577); behaviour when full not read |
| LOD fade and optional-group cut | `lod0.5Distance` = 200 blocks (theirs, settings.zig:58); fade band 32 blocks (theirs, chunk_fragment.frag:39); optional group dropped beyond it (theirs, fillIndirectBuffer.comp:84) |
| Upload budget per frame | 12 ms (theirs, renderer.zig:35); at least one mesh per frame (mesh_storage.zig:722) |
| Draw-call count | Per LOD, two multi-draw calls for opaque and one for transparent, plus box-test draws (read from chunk_meshing.zig 235-267; arithmetic: at most six LODs, so at most about 30 draw calls for chunks, not measured) |
| Default render distance | 12 (theirs, settings.zig:32); units not read |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: start at the coarsest node around the player and draw nothing if it has no mesh; flood top-level neighbours on the far side of the player, each frustum tested; descend into the eight children only when all are meshed, testing each child; otherwise draw the node. It omits the seam masks and their re-upload (mesh_storage.zig 667-690), the mesh upload and empty-mesh filter (693-703), the GPU side (back-face and optional-group culling, the occlusion pass), the `active` flag as a separate field (the sketch uses a seen set), and the donor's choice of child order from the player's side (lines 637-657). The donor computes a base child from the player side and then flips bits, so the set of eight is the same either way; only processing order differs. The sketch uses a fixed child order. One more deviation: the donor tests each of the eight children against the frustum using the PARENT's box edge (`chunkSizeVector = chunkSize*pos.voxelSize`, mesh_storage.zig 611 and 653), a deliberately conservative over-size test that keeps a child whose real box is just outside the view, so no popping at the frustum edge; the sketch and its acceptance test use the child's own edge (`half`), an exact test. If edge popping shows up in Frankendom, pass the parent edge (`edge(n.lod)`) for the child test, as the donor does.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type V3 = [number, number, number];

// Camera-relative plane. The normal need not be unit length: the test is a sign test.
export interface Plane {
  pos: V3;
  norm: V3;
}

// False only when the box is entirely outside one of the planes (four side planes, no near or far).
export function boxInFrustum(planes: readonly Plane[], min: V3, size: number): boolean {
  for (const p of planes) {
    let d = (min[0] - p.pos[0]) * p.norm[0] + (min[1] - p.pos[1]) * p.norm[1] + (min[2] - p.pos[2]) * p.norm[2];
    // add the box corner that lies furthest along the normal
    d += size * (Math.max(0, p.norm[0]) + Math.max(0, p.norm[1]) + Math.max(0, p.norm[2]));
    if (d < 0) return false;
  }
  return true;
}

export interface Node {
  lod: number;        // 0 = finest; the edge doubles per level
  origin: V3;         // world min corner, aligned to its own edge length
  meshed: boolean;    // this node has a mesh ready
  childMask: number;  // bit i set when child i (eight octants at lod - 1) is meshed; 0xff = all ready
}

export interface NodeStore {
  get(origin: V3, lod: number): Node | undefined;
}

export const CHUNK = 32;   // blocks per chunk edge
export const TOP_LOD = 5;  // coarsest level

const edge = (lod: number): number => CHUNK * 2 ** lod;
const key = (n: Node): string => `${n.origin[0]},${n.origin[1]},${n.origin[2]}|${n.lod}`;
const relTo = (player: V3, o: V3): V3 => [o[0] - player[0], o[1] - player[1], o[2] - player[2]];

// Returns the nodes to draw this frame. Player and planes share one coordinate frame.
export function selectNodes(store: NodeStore, player: V3, planes: readonly Plane[]): Node[] {
  const topEdge = edge(TOP_LOD);
  const start: V3 = [
    Math.floor(player[0] / topEdge) * topEdge,
    Math.floor(player[1] / topEdge) * topEdge,
    Math.floor(player[2] / topEdge) * topEdge,
  ];
  const top = store.get(start, TOP_LOD);
  if (!top || !top.meshed) return []; // nothing is drawn until the coarsest node around the player is ready

  const queue: Node[] = [top];
  const seen = new Set<string>([key(top)]);
  const draw: Node[] = [];

  while (queue.length > 0) {
    const n = queue.shift() as Node;

    if (n.lod === TOP_LOD) {
      // flood to top-level neighbours, only on the far side of the player along each axis
      for (let axis = 0; axis < 3; axis++) {
        for (const sign of [1, -1]) {
          const rel = n.origin[axis] - player[axis];
          if (sign > 0 && rel + topEdge <= 0) continue;
          if (sign < 0 && rel > 0) continue;
          const o: V3 = [n.origin[0], n.origin[1], n.origin[2]];
          o[axis] += sign * topEdge;
          const nb = store.get(o, TOP_LOD);
          if (nb && nb.meshed && !seen.has(key(nb)) && boxInFrustum(planes, relTo(player, o), topEdge)) {
            seen.add(key(nb));
            queue.push(nb);
          }
        }
      }
    }

    if (n.lod > 0 && n.childMask === 0xff) {
      // all eight finer children are ready: replace this node by the children that are in view
      const half = edge(n.lod - 1);
      for (let i = 0; i < 8; i++) {
        const o: V3 = [
          n.origin[0] + (i & 1) * half,
          n.origin[1] + ((i >> 1) & 1) * half,
          n.origin[2] + ((i >> 2) & 1) * half,
        ];
        const child = store.get(o, n.lod - 1);
        if (child && !seen.has(key(child)) && boxInFrustum(planes, relTo(player, o), half)) {
          seen.add(key(child));
          queue.unshift(child); // children go to the front, as the donor pushes them to the front
        }
      }
    } else {
      draw.push(n); // children not all ready: draw this node at its own level
    }
  }
  return draw;
}

export {};
```

## 5. Lands in

- TARGET `origins/client/zone-lod.ts` (new; client-only draw selection for zone tiles and props, if zones carry a tile or chunk hierarchy; the engine never reads it). Parity-checklist row 16 (colour grade and quality): the LOD distance and the upload budget are quality settings. Row 11 (fight camera) is the alternative if the frustum is driven by the third-person camera; this note does not change the camera.
- The hint row 12 (combat sound cues) does not fit; it is not used.
- Reuse tag: adapt-idea (GPL-3.0; clean-room, shape only; no lines copied)
- Brief rule served: the licence rule (GPL-3.0, clean-room, shape only); client-only draw selection, zones as data (the LOD distance and budget are data fields).

## 6. Gaps and risks

- Voxel-specific: the donor's chunks are voxel meshes. Frankendom zones are data; whether a zone has a tile hierarchy is not checked here. The walk applies only if zone pieces can be grouped into a hierarchy of cells with readiness flags.
- Ready-gated refinement: a coarse node stays until all eight children are ready (mesh_storage.zig:635). That avoids holes but makes a late child delay the detail. The donor's answer for cracks is the seam mask (667-690), and its answer for popping is a dither fade in the fragment shader (chunk_fragment.frag:38-39, read only as far as the dither head). Frankendom needs one of these; the sketch does not include either.
- One wait gate: if the coarsest node around the player has no mesh, the walk draws nothing (mesh_storage.zig:592-593). For a zone this means a blank world for the frame. Frankendom should draw the cheap far layer in that case.
- Queue overflow: the walk queue has 1024 entries (577). What the queue does when full is not read (`CircularBufferQueue` not read). A zone walk needs a bound and a log line.
- Frame budget: the upload budget is 12 ms with one mesh always allowed (renderer.zig:35; mesh_storage.zig:722). One large upload can overshoot the budget by its full cost. A browser client should use the same budget idea, but measure per upload.
- Frame cap: the donor sleeps the rest of the frame measured from its start (main.zig 470-477) and spin-waits on Windows under 20 ms (473-475). A browser client uses requestAnimationFrame; this part does not transfer.
- GPU-only parts not adopted: indirect multi-draw, compute-built command lists and occlusion boxes (chunk_meshing.zig 246, 249-257; fillIndirectBuffer.comp 60-111). They need GL or Vulkan features; whether WebGL2 or WebGPU offers each is not checked here.
- Determinism: the walk is per frame on the client and reads mesh readiness that the server does not see. It must never decide a kill, a hit or a spawn (rulings: server-verified kills, one ledger).
- Not read: `createNewMeshes` and `freeOldMeshes` (which decide what is ready), the `Neighbor` helper bodies, and the `CircularBufferQueue` overflow rule.

Best transferable idea: draw each part of a zone at the coarsest level whose finer children are all ready and in view, and swap in the children only as a complete set, so a late tile never leaves a hole and far tiles cost nothing.
Decision (proposed): adapt — the ready-gated swap and the frustum prefilter fit a zone that streams tiles; the voxel meshing, GPU indirect path and occlusion passes do not fit the browser stack, so only the walk shape is kept; the wait gate that blanks the world is replaced by a cheap far layer.
Acceptance: in a zone test with the camera turned 180 degrees, the draw list contains no tile whose box is wholly behind the camera's four side planes (boxInFrustum false for each such tile); and with seven of eight finer tiles loaded, the coarse tile is still in the draw list (no hole frame).

Reuse tag: adapt-idea (GPL-3.0; clean-room, shape only)
Brief rule served: licence rule (GPL-3.0, clean-room); client-only draw selection, zones as data

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR.
- Undisclosed sketch deviation: donor child frustum test uses the parent's edge (mesh_storage.zig 611, 653, confirmed in donor); the sketch uses the child's own half edge. Now disclosed in the simplified paragraph with the one-argument change to match the donor. Sketch code left unchanged (its exact test is valid; acceptance test unchanged), so no typecheck needed.
- Missed: same point as a rule: size the child frustum test conservatively (parent edge) to avoid popping at the frustum edge.
- Everything else verified (walk 547-708, ChunkMeshNode, Frustum 862-894, renderer.zig lines, 12 ms budget, fps cap, settings, dither fade, GPL-3.0).

Fixed 2026-10-12: simplified paragraph now lists the child-size frustum deviation.
