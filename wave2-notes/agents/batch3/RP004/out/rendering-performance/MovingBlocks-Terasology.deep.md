# MovingBlocks-Terasology (rendering-performance, cell 1)

Donor: `/mnt/frankendom-donors/MovingBlocks-Terasology/engine/src/main/java/org/terasology/engine/rendering/world/RenderableWorldImpl.java` | Licence: Apache-2.0 (the donor root LICENSE file begins "Apache License"; source headers say SPDX-License-Identifier: Apache-2.0) | Java | symbol `queueVisibleChunks`

Checked: Read in full: RenderableWorldImpl.java (465 lines), ChunkMeshWorker.java (176), RenderQueuesHelper.java (39). Read in part: ChunkMeshImpl.java (1-200), ChunkMesh.java (enum only), Camera.java (68-100, 175-220), PerspectiveCamera.java (60-180), WorldRendererImpl.java (255-330 and the render call at 307-327), LodChunkProvider.java (60-139, 140-237, 252-316; not read: 238-251), ChunkImpl.java (233-237), ViewDistance.java (15-30). Grep only: ChunkMeshRenderer.java (no draw loop in it), Chunks.java (constants at 17-19 and 35). Not read: BlockRegion.expand (the region box semantics), Chunks.toChunkPos, the LOD `hiddenness` consumer, the chunk-load budget inside chunkProvider.update(), and the game loop that calls render(). Confidence: high on the queue build, the visibility test, the budgets and the build pipeline. Medium on the draw side: no code in this donor consumes the render queues (grep for RenderQueuesHelper, chunksOpaque and render(RenderPhase) finds only the files above), so the draw order and GL state are not verified. Depth: thin. Not a camera cell: camera_scope does not apply (the frustum comes from the player camera; camera control itself was not read).

## 1. Mechanism

- What it does: each render frame, decide which loaded chunks are on screen, sort them, sort the work, and queue them into per-pass buckets (opaque, shadow, cutout/billboard, water, reflection). Each chunk is one static mesh with up to four buffer slots, and each non-empty slot is one indexed draw, so one chunk costs at most four draws in a frame.
- Frame order (the loop that drives it): `render()` calls `preRenderUpdate` (WorldRendererImpl.java 309). Inside, `isFirstRenderingStageForCurrentFrame` is set at 255-259 and the block at 263-276 runs only on the first stage (mono or left eye); RenderableWorldImpl uses the same flag at 287 and 329-331. So: (a) `renderableWorld.update()` (269), which runs lighting propagation (177), chunk provider update (181), region update (185), and LOD update (190); (b) camera matrices and frustum refresh (PerspectiveCamera.update calls updateMatrices at line 69; updateFrustum is called at line 160; stereo eyes also call playerCamera.updateFrustum at WorldRendererImpl 278-280); (c) `queueVisibleChunks` (283). There is no fixed step and no accumulator in this path: one update and one queue per render frame.
- Interest region: a box of view-distance chunks centred on the camera's chunk. Half-size is the view size divided by two with integer division (RenderableWorldImpl 243-244, 245). When the box changes, chunks leaving it are removed from the proximity list and chunks entering it are added (201-223). Only chunks in this list are ever considered.
- Queue build, `queueVisibleChunks` (262-335). Input list: the proximity list (already sorted front-to-back by the previous frame's sort, see step 4), then entity-based chunks, then LOD chunks (276-279). For each entry in list order, with a counter `chunkCounter` that increments for every entry (326):
  1. Skip if not ready (283).
  2. Shadow queue: if dynamic shadows are on, first stage, opaque triangles exist, `chunkCounter < maxChunksForShadows`, and the chunk is inside the light camera's frustum (286-295). The shadow queue is NOT gated on the main camera's visibility.
  3. Main visibility: the chunk AABB is tested against the main camera frustum (297, 368-370). `hasInSight` subtracts the camera position from the box first (Camera.java 208-212), so the frustum can stay camera-relative.
  4. For visible chunks: `statVisibleChunks++` (317), then `setAnimated(statVisibleChunks < 64)` (319). Opaque bucket if opaque triangles > 0 (298-299). Water (REFRACTIVE) bucket if triangles > 0 (304-305). Cutout (ALPHA_REJECT) bucket if triangles > 0 and `billboardLimit == 0 || chunkCounter < billboardLimit` (310-312).
  5. Reflection bucket: a second frustum (reflected view) test on the raw chunk bounds (322-324; see defect D4).
- Buckets are priority queues. Opaque, shadow, reflection and cutout are ordered by squared distance to the camera, nearest first (93-97). The water bucket is ordered farthest first (98, the `backToFrontComparator`). The comparator is at 438-445.
- Build pass, `chunkWorker.update()` (330, ChunkMeshWorker.java 122-143): sort the whole proximity list front-to-back (124), then emit every ready, dirty chunk into a reactive pipeline (126-137). No count cap is applied in this function.
- Pipeline (ChunkMeshWorker.java 57-86): unbounded backpressure buffer (57); de-duplication by chunk position against a set of in-flight builds (67); tessellation on the parallel scheduler (86, generateMeshFunc 164-175); the build clears the dirty flag when it starts (166); GL upload is hopped to the game main thread (73) and runs `updateMesh`, `discardData`, `setMesh` (157-161, comment at 158); the position leaves the in-flight set after upload (75). Dirtied-in-flight chunks are picked up again on a later frame because the dirty flag is still set.
- Draw: `ChunkMeshImpl` holds four buffer slots (14-17). Each non-empty slot gets its own vertex buffer, index buffer and VAO (generateVBO, 68-103). `renderVbo` issues one `glDrawElements(GL_TRIANGLES)` per slot (114-122). The phase mapping in `render(RenderPhase)` (137-153): OPAQUE to slot 0, ALPHA_REJECT to slots 1 and 2, REFRACTIVE to slot 3. The caller of `render(RenderPhase)` is not in this checkout (not read).
- Startup pregeneration (`pregenerateChunks`, 137-171): loops the region, and when it finds a dirty chunk it builds that one mesh synchronously, then `break`s (164-167) and returns "not complete". So at most one mesh per call during startup.
- LOD (LodChunkProvider.java): four background threads (70-74) take the nearest needed chunk from a priority queue keyed on squared distance to the LOD centre (69, 82, 304-314). Each builds a coarse chunk at its scale (88-95) and puts it in a ready queue. The main thread drains the whole ready queue on every update (101-109, `while (!readyChunks.isEmpty())`). Scale level k covers 2^k chunks; region i is the scaled-down centre expanded by a half-size box (172). The LOD centre is moved by `delay()` (147, 294-302): it returns target minus one when approaching from below, target plus one when approaching from above, and target when equal. That is a one-unit offset on the side the centre came from, not a rate limit.
- Other numbers: the far plane is `max(chunksX * 32 * 2^lods, 600) * 2` (PerspectiveCamera.java 173). The view region for each setting is in ViewDistance.java.

## 2. Key functions

- `queueVisibleChunks`: `/mnt/frankendom-donors/MovingBlocks-Terasology/engine/src/main/java/org/terasology/engine/rendering/world/RenderableWorldImpl.java` 262-335. Builds all buckets and the animated flag; calls `chunkWorker.update()` last (330).
- `isChunkVisible` and `hasInSight`: RenderableWorldImpl.java 364-370; `/mnt/frankendom-donors/MovingBlocks-Terasology/engine/src/main/java/org/terasology/engine/rendering/cameras/Camera.java` 208-212. The main visibility test (camera-relative box against the view frustum).
- `calculateRenderableRegion` and `updateChunksInProximity`: RenderableWorldImpl.java 201-223 and 240-246. Interest box and add/remove on change.
- `ChunkMeshWorker.update`: `/mnt/frankendom-donors/MovingBlocks-Terasology/engine/src/main/java/org/terasology/engine/rendering/world/ChunkMeshWorker.java` 122-143; pipeline 57-86; build function 164-175.
- `LodChunkProvider.updateRenderableRegion` 145-236; `processReadyChunks` 101-138; `delay` 294-302. Donor: `/mnt/frankendom-donors/MovingBlocks-Terasology/engine/src/main/java/org/terasology/engine/world/chunks/LodChunkProvider.java`.
- `ChunkMeshImpl.render` and `renderVbo`: `/mnt/frankendom-donors/MovingBlocks-Terasology/engine/src/main/java/org/terasology/engine/rendering/primitives/ChunkMeshImpl.java` 114-153.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Interest box around the camera cell, half-size by integer division | View sizes in chunks: MODERATE 13 x 7 x 13 (ViewDistance.java 17), MEGA 33 x 7 x 33 (20), EXTREME 63 x 7 x 63 (21). Half-size for MEGA is 16, 3, 16 (integer division, RenderableWorldImpl 243-244). Box semantics of `BlockRegion.expand`: not read. |
| Cell size | 32 x 64 x 32 blocks per chunk (Chunks.java 17-18; SIZE_Z not receipted) |
| Cap on animated visible chunks | Constant 64 (RenderableWorldImpl 46). Effective count is 63, see D2. |
| Shadow caster cap | Config value clamped to 64..1024 (RenderableWorldImpl 90). Config default not located (not read). |
| Cutout (billboard) cap | Config float, 0 = unlimited (RenderableWorldImpl 274, 311). Default not located (not read). |
| Sort key | Squared distance from the camera to the chunk centre, centre offset is half the chunk size (RenderableWorldImpl 49, 413-422). Fresh vector per comparison (RenderableWorldImpl 416; Chunk.java 141). |
| Far plane | `max(chunksX * 32 * 2^lods, 600) * 2` (PerspectiveCamera.java 173) |
| LOD worker threads | 4 (LodChunkProvider 70) |
| LOD centre offset | One unit on the approach side (`delay`, 296, 300) |
| Startup mesh budget | 1 mesh per call (RenderableWorldImpl 164-167) |
| Per-frame build budget | None (ChunkMeshWorker 122-143) |
| Per-frame LOD upload budget | None (LodChunkProvider 102-109) |

The algorithm is donor-independent: an interest box, a camera-relative test, nearest-first buckets, a per-pass cap, an async build with in-flight de-duplication. The constants are quality settings and engine rules, not zone content.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: sort nearest first, then per chunk the shadow test (only for ready, opaque chunks), the camera-relative frustum test, the animated flag, then the opaque, cutout and water buckets (water reversed to farthest first). It fixes three donor defects: caps count accepted draws, not list slots (D1); the animated count is exact (D2); and uploads are capped per frame (D3). It omits: the reflection bucket and the reflected frustum (D4); the entity-based chunks and LOD chunks in the list; the interest box (BlockRegion.expand not read); the reactor pipeline (replaced by start and finish callbacks); the statistics counters; and the LOD centre rule, which is included only as `lodCentreStep`. The frustum is an input, not built here.

```ts
// Licence: Apache-2.0 (donor). Clean-room shape written from the described mechanism; not a line-by-line translation.
// clean-room
export interface Vec3 { x: number; y: number; z: number; }
export interface Box { minX: number; minY: number; minZ: number; maxX: number; maxY: number; maxZ: number; }
export interface Frustum { testBox(b: Box): boolean; }

export interface ChunkDraw {
  id: string;
  ready: boolean;
  dirty: boolean;
  centre: Vec3;
  bounds: Box;                                  // world-space bounds
  tris: { opaque: number; cutout: number; water: number };
  animated: boolean;
}

export interface Budgets {
  maxShadowCasters: number;   // counts accepted casters, not list slots
  maxCutout: number;          // 0 = unlimited; counts accepted cutout draws
  maxAnimated: number;        // the first N visible chunks get animated = true
}

export interface Queues {
  opaque: ChunkDraw[];        // nearest first
  cutout: ChunkDraw[];        // nearest first, capped
  water: ChunkDraw[];         // farthest first (blended)
  shadow: ChunkDraw[];        // nearest first, capped
}

function dist2(c: ChunkDraw, cam: Vec3): number {
  const dx = c.centre.x - cam.x;
  const dy = c.centre.y - cam.y;
  const dz = c.centre.z - cam.z;
  return dx * dx + dy * dy + dz * dz;
}

// The frustum is camera-relative, so the box is shifted by the camera position first.
function relativeBox(b: Box, cam: Vec3): Box {
  return {
    minX: b.minX - cam.x, minY: b.minY - cam.y, minZ: b.minZ - cam.z,
    maxX: b.maxX - cam.x, maxY: b.maxY - cam.y, maxZ: b.maxZ - cam.z,
  };
}

// One pass over the frame's list: sort nearest first, then accept. Caps count accepted draws, not list slots.
export function buildQueues(list: ChunkDraw[], cam: Vec3, view: Frustum,
                            inLightView: (c: ChunkDraw) => boolean, budgets: Budgets): Queues {
  const ordered = [...list].sort((p, q) => dist2(p, cam) - dist2(q, cam));
  const queues: Queues = { opaque: [], cutout: [], water: [], shadow: [] };
  let visible = 0;
  for (const c of ordered) {
    if (!c.ready) continue;
    if (c.tris.opaque > 0 && queues.shadow.length < budgets.maxShadowCasters && inLightView(c)) {
      queues.shadow.push(c);
    }
    if (!view.testBox(relativeBox(c.bounds, cam))) continue;
    visible += 1;
    c.animated = visible <= budgets.maxAnimated;
    if (c.tris.opaque > 0) queues.opaque.push(c);
    if (c.tris.cutout > 0 && (budgets.maxCutout === 0 || queues.cutout.length < budgets.maxCutout)) {
      queues.cutout.push(c);
    }
    if (c.tris.water > 0) queues.water.push(c);
  }
  queues.water.reverse();
  return queues;
}

export interface BuildState {
  inFlight: Set<string>;
  finished: { id: string; upload: () => void }[];   // filled when a background build completes
}

// Start a build for every dirty, ready chunk that is not already in flight, nearest first.
export function startBuilds(list: ChunkDraw[], cam: Vec3, state: BuildState, start: (c: ChunkDraw) => void): number {
  const dirty = list.filter((c) => c.ready && c.dirty).sort((p, q) => dist2(p, cam) - dist2(q, cam));
  let started = 0;
  for (const c of dirty) {
    if (state.inFlight.has(c.id)) continue;
    state.inFlight.add(c.id);
    c.dirty = false;
    start(c);
    started += 1;
  }
  return started;
}

// At most maxUploadsPerFrame GPU uploads per frame; the rest wait for the next frame.
export function drainUploads(state: BuildState, maxUploadsPerFrame: number): number {
  let n = 0;
  while (n < maxUploadsPerFrame && state.finished.length > 0) {
    const done = state.finished.shift();
    if (done === undefined) break;
    done.upload();
    state.inFlight.delete(done.id);
    n += 1;
  }
  return n;
}

// Donor delay(): the LOD centre stays one unit short of the target on the side it came from.
export function lodCentreStep(prev: number, target: number): number {
  if (prev < target) return target - 1;
  if (prev === target) return target;
  return target + 1;
}

export {};
```

Sketch check: typechecked on the VPS with `npx -p typescript tsc --noEmit --strict --target es2020` (exit 0).

## 5. Lands in

- TARGET `origins/client/render/visible-queue.ts` (proposed path; not checked against the Frankendom repo). Client-only: culling and draw budgets are rendering, and rendering is not in src/fight.
- Parity-checklist row: 16 (colour grade/quality), chosen as the closest row for quality and frame budget. The list hint said row 12, but row 12 is combat sound cues in the addendum, so the hint looks wrong. Flagged for Strategy.
- Reuse tag: rewrite-from-idea (Apache-2.0 permits adaptation with the notice kept; the sketch is clean-room anyway)
- Brief rule served: rules 7 and 9 (licence stated; donor is on the VPS only); rule 8 (target and row named)
Best transferable idea: cap per-frame work by counting accepted draws and uploads, not list positions, and sort nearest first so the cap drops the far work.
Decision (proposed): adapt — the idea (interest box, camera-relative culling, nearest-first buckets, async build with in-flight de-duplication, an upload budget) fits a phone build, but the donor's caps count list slots, the animated count is off by one and uploads are uncapped; the sketch fixes all three. Adopt the shape, not the donor's counts.
Acceptance: on a 375-wide phone walking into a dense zone, no frame does more than the zone-or-quality upload budget of GPU uploads, the nearest chunks finish first, and a unit test shows that the cutout and shadow caps count drawn items and that exactly `maxAnimated` visible chunks are animated.

## 6. Gaps and risks

- Rendering is client-only. None of this touches the server, so the server-verified kill rule and the one ledger are not involved. The Pit is a fixed arena under the brief, so chunk streaming and interest boxes apply to zones, not the Pit.
- Zones as data: the view region and the LOD count are quality settings in the donor, not zone data. The Frankendom version should keep the region size as a quality setting and let a zone override only a draw-distance hint, if at all.
- D1 (caps count list slots): RenderableWorldImpl 288, 311, 326. The shadow and cutout caps count every list entry including not-ready ones, so they depend on list order. Fix: count accepted draws (see `buildQueues`).
- D2 (animated count off by one): RenderableWorldImpl 317-319. The increment happens before the comparison, so 63 chunks are animated, not 64. Fix: compare before increment, or use `<=`.
- D3 (no upload budget): ChunkMeshWorker 122-143 and LodChunkProvider 102-109 are uncapped. A burst of dirty chunks can spend a whole frame on uploads. Fix: `drainUploads` with a per-frame count from quality data.
- D4 (reflection test may be in the wrong space; read, not run): RenderableWorldImpl 374 passes raw chunk bounds to the reflected frustum. The main path subtracts the camera position (Camera.java 210), and the view matrix has the eye at the origin (PerspectiveCamera.java 128), so the reflected frustum looks camera-relative. If that reading holds, reflection culling is wrong by the camera offset. Fix: subtract the camera position as the main path does, then test. Verify with a unit test before copying; this is a reading, not a run.
- D5 (stale animated flag): the flag is written only for visible chunks (RenderableWorldImpl 297-320), so a chunk that leaves view keeps its last value. The reader of the flag is not in this checkout (updateMaterial is not called here), so the effect is unknown. Fix: clear the flag when a chunk leaves the queue.
- Cost risk (not measured): the whole proximity list is sorted each frame (ChunkMeshWorker 124), and every comparison allocates two vectors (RenderableWorldImpl 416; Chunk.java 141). With the MEGA box that is 33 x 7 x 33 = 7623 chunks at most. Fix: cache squared distances once per frame and sort keys, not vectors.
- Gap: the draw side is missing from this checkout, so draw order, GL state changes and the shader animated uniform are not verified.
- The LOD hiddenness counter (LodChunkProvider 112-135) has no reader in this checkout (not read).
- The cutout (billboard) bucket and the shadow bucket have no counterpart checked against Frankendom (not checked). Adopt them only if the client has those passes.

Reuse tag: rewrite-from-idea (Apache-2.0; code may be adapted with the notice, the sketch is clean-room)
Brief rule served: rule 1 (real implementation found and read end to end on the queue path), rule 3 (confidence stated), rule 4 (best idea line), rule 8 (target and parity row named), rule 10 (receipts verified: 76 ok, 0 failed)
