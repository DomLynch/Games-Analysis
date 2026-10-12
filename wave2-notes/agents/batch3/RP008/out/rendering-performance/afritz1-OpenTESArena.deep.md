# afritz1-OpenTESArena (rendering-performance, cell 17)

Donor: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Entities/EntityVisibilityChunk.cpp` | Licence: MIT (repo LICENSE.txt line 1 "The MIT License (MIT)", Copyright (c) 2016-2026 The OpenTESArena Developers; code may be adapted, keep the notice if lines are copied) | C++ | symbol `EntityVisibilityChunk::update`

Checked: Read in full: `EntityVisibilityChunk.cpp` 1-144 (update 25-136), `EntityVisibilityChunkManager.cpp` 1-32, `RendererUtils.cpp` 166-233 (box against frustum), `RenderCamera.cpp` 40-66 (frustum normals), `RenderLightManager.cpp` 66-190 (entity and player lights), `RenderDrawCommand.cpp` 1-37 and `RenderDrawCommand.h` 9, `ChunkManager.cpp` 45-125 (active chunk order), `EntityChunkManager.cpp` 1743-1800 (view-angle keyframe pick), `RenderEntityManager.cpp` 462-530 (draw-call generation). Grep only: `VulkanRenderBackend.cpp` (line 2302 light cap; its light binning was not read), `Game/Game.cpp` 74-135 read in full for the frame limiter, which is the second mechanism. Not read: `BoundingBox3D::init` (so the light box centring is not confirmed), the chunk size constant, `Physics::DeltaTime`, `Options::MIN_FPS`, the rest of `getEntityObservedResult` after line 1800, the voxel chunk visibility in `RenderVoxelChunkManager`. Confidence: high on the chunk and frustum path (every branch read); medium on the light box centring. The cell hint named `VulkanRenderBackend.cpp`; that file holds only the 256 light cap and device selection here, so the note uses the entity chunk path. Parity hint was row 12; row 12 in the addendum is combat sound cues, so this note uses row 16 (quality). Flagged for Strategy. camera_scope: not a camera cell.

Best transferable idea: Cull whole groups of entities with one box test per chunk (hidden: skip all; fully visible: skip per-entity tests; partial: test each entity), then sort the survivors far to near.
Decision (proposed): adapt - the three-way chunk test is a cheap win for prop and NPC crowds on phones; Frankendom must add a draw-distance cap (the donor has none), sort once across all chunks (the donor sorts only inside a chunk), and replace the linear lookups per entity.
Acceptance: In a zone with 300 entities over 9 chunks, a 375 px frame draws zero entities from a chunk behind the camera (asserted by the draw-list count), and billboards in the draw list are in far-to-near order across chunk borders.

## 1. Mechanism

- Per frame, `EntityVisibilityChunkManager::update` (26-31) runs the chunk update for every active chunk position. Freed and new chunks are recycled first (9-22).
- `EntityVisibilityChunk::update` (25-136), in order: (a) clear the box, the box cache and the entry list (28-30). (b) For each entity in the chunk, build its world box from its model-space box and position (40-56), and grow the chunk box to include it (58-66). If the chunk has no entities, return (71-75). (c) Test the chunk box against the camera frustum (78). If it is hidden, return with no entries (80-84). If it is fully visible, keep every entity with no per-entity test (86-100). Otherwise test each entity's box and keep the ones that are not hidden (102-119). (d) Sort the kept entries far to near by squared XZ distance to the camera (122-135).
- The box test, `RendererUtils::getBBoxVisibilityInFrustum` (166-226): five planes are used, the forward plane and four side planes (171-178), all through the camera point; the side normals come from `RenderCamera.cpp` 86-89. For each plane, the eight box corners are counted on the inside (dist >= 0, line 202). The box is hidden if all eight corners are outside one plane (217-221, then break). It is fully visible only if all eight corners are inside every plane (212-215). Otherwise it is partial. There is no far plane.
- Draw generation, `RenderEntityManager.cpp` 462-530: the loop walks `activeChunkPositions` in order (475), then each visible entry (481). Per entry: an animation lookup by linear search (489-493), a palette lookup by linear search (509-516) or a material lookup by linear search (522-529), then one draw call appended to `drawCallsCache` (577). The cache goes into the command list as one span (397). `RenderDrawCommandList::addDrawCalls` (`RenderDrawCommand.cpp` 22-37) stores spans without sorting or merging, up to 16 spans per frame (`RenderDrawCommand.h` 9). On overflow it logs an error and drops that whole span (29-32).
- Active chunk order: `ChunkManager::update` fills `activeChunkPositions` row by row, y outer and x inner (107-119). So chunks are drawn in grid order, and the far-to-near sort in step (d) only holds inside one chunk.
- Second mechanism in this donor, lights (`RenderLightManager::update`, 72-189). The player light is added first with no test (127, 140). Each entity light gets a box of side 2 x end radius (161), tested with the same box test (168); hidden lights are dropped (169). Enabled entity lights are sorted nearest first by squared distance to the camera point (177-183). The list is capped at 256 (185; `RenderLightManager.h` 40). Streetlights are enabled only at night (155). Start radius is 0.5 x end radius (113). The player light sits at the camera point (127), so it is nearest and survives the cap, apart from ties at distance zero.
- Third mechanism, the billboard angle pick (`EntityChunkManager.cpp` 1743-1800): the relative angle between the entity's facing and the eye direction in XZ (1764-1768), plus half a sector as bias (1771), gives an index into the entity's keyframe lists (1779-1781). The frame comes from the progress percent (1790-1797). This is view-angle selection, not distance LOD.

## 2. Key functions

- `EntityVisibilityChunk::update`: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Entities/EntityVisibilityChunk.cpp` 25-136. The chunk test, the whole-chunk shortcut, the per-entity test, the sort.
- `RendererUtils::getBBoxVisibilityInFrustum`: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Rendering/RendererUtils.cpp` 166-226. The corner-count box classifier.
- `RenderEntityManager` draw generation: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Rendering/RenderEntityManager.cpp` 462-530.
- `RenderLightManager::update`: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Rendering/RenderLightManager.cpp` 72-189.
- `RenderDrawCommandList::addDrawCalls`: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Rendering/RenderDrawCommand.cpp` 22-37.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Hidden, visible or partial from eight corners per plane | Visible = all corners inside every plane; hidden = all corners outside one plane (theirs, RendererUtils.cpp 212-219) |
| Whole-group shortcut at the chunk level | None (structure only, EntityVisibilityChunk.cpp 80-100) |
| Nearest-first cap on lights | 256 lights (theirs, RenderLightManager.h 40; the Vulkan path also keeps 256, theirs, VulkanRenderBackend.cpp 2302) |
| Light box side | 2 x end radius (theirs, RenderLightManager.cpp 161) |
| Light start radius | 0.5 x end radius (theirs, RenderLightManager.cpp 113) |
| Draw-span list | 16 spans per frame (theirs, RenderDrawCommand.h 9) |
| Billboard frame pick | Angle count from the state's keyframe lists (read at runtime, EntityChunkManager.cpp 1758; the count itself is data) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: chunk box, hidden/visible/partial, a per-entity test only for partial chunks, then the light test and cap. It adds two things the donor lacks: a distance cap (`maxDist`) before the box test, and one far-to-near sort across all chunks (`drawOrder`), where the donor sorts inside each chunk only. It omits the animation and palette lookups, the draw-call cache and span list with its overflow, the streetlight and night rule, the start-radius rule, the frame-angle pick, and the Vulkan path. It centres the light box, because the donor's `BoundingBox3D::init` was not read. Ties at distance zero are not ordered by the donor's `std::sort`; the sketch places the player light first.

```ts
// clean-room sketch: box-vs-frustum classification, chunk-level entity culling, and a nearest-first light cap.
// Written from the mechanism in afritz1/OpenTESArena (MIT). Not a translation of the donor.
type Vec3 = [number, number, number];
interface Box { min: Vec3; max: Vec3 }
interface Plane { n: Vec3; d: number } // inside when dot(n, p) + d >= 0
interface Camera { eye: Vec3; planes: Plane[] } // forward plus four side planes, all through the eye
type Vis = "visible" | "partial" | "hidden";
interface Entity { id: number; pos: Vec3; box: Box }
interface Entry { id: number; pos: Vec3 }
interface Light { id: number; pos: Vec3; radius: number }

const MAX_LIGHTS = 256; // donor RenderLightManager.h 40

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function dist2(a: Vec3, b: Vec3): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return dx * dx + dy * dy + dz * dz;
}

function dist2XZ(a: Vec3, b: Vec3): number {
  const dx = a[0] - b[0];
  const dz = a[2] - b[2];
  return dx * dx + dz * dz;
}

function corners(b: Box): Vec3[] {
  const [x0, y0, z0] = b.min;
  const [x1, y1, z1] = b.max;
  return [
    [x0, y0, z0], [x1, y0, z0], [x0, y1, z0], [x1, y1, z0],
    [x0, y0, z1], [x1, y0, z1], [x0, y1, z1], [x1, y1, z1],
  ];
}

function unionBox(boxes: Box[]): Box {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const b of boxes) {
    for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i], b.min[i]);
      max[i] = Math.max(max[i], b.max[i]);
    }
  }
  return { min, max };
}

// Donor RendererUtils.cpp 166-226: a box is hidden if all 8 corners are outside one plane,
// visible if all 8 are inside every plane, otherwise partial.
function classify(b: Box, cam: Camera): Vis {
  const cs = corners(b);
  let allInside = true;
  for (const p of cam.planes) {
    let inside = 0;
    for (const c of cs) {
      if (dot(p.n, c) + p.d >= 0) inside++;
    }
    if (inside === 0) return "hidden";
    if (inside < cs.length) allInside = false;
  }
  return allInside ? "visible" : "partial";
}

// Chunk-level test first (donor EntityVisibilityChunk.cpp 25-100). A hidden chunk returns nothing,
// a visible chunk returns every entity with no per-entity test, a partial chunk tests each entity.
// simplified: the donor sorts inside each chunk here; drawOrder below sorts across chunks once.
// simplified: maxDist is an addition. The donor has no distance cap (its planes are sides and a forward plane only).
function chunkEntries(entities: Entity[], cam: Camera, maxDist: number): Entry[] {
  if (entities.length === 0) return [];
  const chunkBox = unionBox(entities.map((e) => e.box));
  const cv = classify(chunkBox, cam);
  if (cv === "hidden") return [];

  const kept = cv === "visible" ? entities : entities.filter((e) => classify(e.box, cam) !== "hidden");
  const limit = maxDist * maxDist;
  return kept
    .filter((e) => dist2XZ(e.pos, cam.eye) <= limit)
    .map((e) => ({ id: e.id, pos: e.pos }));
}

// fix: one far-to-near sort over every chunk's entries. The donor draws chunks in grid order
// (ChunkManager.cpp 106-119) and does not re-sort the draw calls (RenderDrawCommand.cpp 22-37).
function drawOrder(chunks: Entity[][], cam: Camera, maxDist: number): Entry[] {
  const all: Entry[] = [];
  for (const chunk of chunks) {
    for (const e of chunkEntries(chunk, cam, maxDist)) all.push(e);
  }
  return all.sort((a, b) => dist2XZ(b.pos, cam.eye) - dist2XZ(a.pos, cam.eye));
}

// Donor RenderLightManager.cpp 122-188: the player light first (no test), each entity light
// whose box is not hidden, then nearest first, then the cap.
// simplified: the donor builds its light box with BoundingBox3D::init (centring not read); this sketch centres a cube of side 2 x radius on the light.
// simplified: ties at distance 0 are not ordered by std::sort in the donor; the player light is placed first here.
function selectLights(player: Light | null, entityLights: Light[], cam: Camera): Light[] {
  const out: Light[] = [];
  if (player) out.push(player);

  for (const l of entityLights) {
    const r = l.radius;
    const box: Box = {
      min: [l.pos[0] - r, l.pos[1] - r, l.pos[2] - r],
      max: [l.pos[0] + r, l.pos[1] + r, l.pos[2] + r],
    };
    if (classify(box, cam) !== "hidden") out.push(l);
  }

  out.sort((a, b) => dist2(a.pos, cam.eye) - dist2(b.pos, cam.eye));
  return out.slice(0, MAX_LIGHTS);
}
```

## 5. Lands in

- TARGET `origins/client/render/entity-cull.ts` (proposed path, not checked against the Frankendom tree): a client-only culling module for zone props and NPC crowds. The engine never reads it; hits, aggro and kills do not depend on it.
- Parity-checklist row 16 (colour grade / quality: draw budget and frame pacing are quality controls on a phone).
- Reuse tag: adapt-idea (MIT; code may be adapted with the notice kept; this sketch is clean-room).
- Brief rule served: "keep the idea, fix the defect" (the missing distance cap, per-chunk sort, linear lookups and light scan are fixed in the sketch or listed below); rule 8 (target and row named).

## 6. Gaps and risks

- Visibility decides what is drawn, never who is hit. A culled entity still exists on the server and in the hate list; MAX_ATTACKERS = 3 many-on-one logic stays in the engine.
- Donor defects, each with the fix:
  1. No distance cap. The box test uses only the forward and four side planes (RendererUtils.cpp 171-178), so far entities are drawn until the screen rules them out. Fix: a per-zone `maxDist` applied before the box test (sketch, chunkEntries).
  2. Sort inside each chunk only (EntityVisibilityChunk.cpp 122-135). Chunks are visited row by row (ChunkManager.cpp 107-119) and the draw spans are not re-sorted (RenderDrawCommand.cpp 22-37). Billboards on chunk borders can draw out of far-to-near order. Inferred from the code path, not run. Fix: one global sort (sketch, drawOrder).
  3. Linear lookups per visible entity: animation (RenderEntityManager.cpp 489-493), palette (509-516) and material (522-529). Fix: index by definition ID and material key when the zone loads.
  4. The light scan visits every entity chunk every frame (RenderLightManager.cpp 84-87; the donor's own @todo at line 84 says it should not). Fix: keep a light set updated on spawn and destroy events.
  5. The span list drops a whole producer group on overflow, with a log line only (RenderDrawCommand.cpp 29-32). Fix: count the drop in a test, and fall back to merging the newest group into the previous span instead of dropping it.
  6. The light path computes a partial flag and never uses it (RenderLightManager.cpp 167-168). Minor.
- Phone at 375 px: the donor has no distance LOD. Billboards change frame only by view angle (1764-1781). A phone build should lower the light cap as an engine constant; the 256 figure is the donor's desktop number and was not measured on a phone.
- Second mechanism, frame pacing (same donor, read in full, not written up as its own note because one note per cell): `Game/Game.cpp` 100-134. Minimum frame = 1e9 / target FPS (103). If the last frame was shorter, sleep for half the remaining time minus a 1/1000 bias (110-113), then yield-spin until the target (115-126). The delta is clamped to a maximum frame length derived from MIN_FPS (96, 132), and the physics steps are ceil(clamped delta / Physics::DeltaTime) (133). Gap for a browser: a web build cannot sleep or spin the same way; the equivalent (requestAnimationFrame plus a fixed-step accumulator) was not verified here.
- Not read: the rest of `getEntityObservedResult` (1800 onward), the voxel chunk visibility in `RenderVoxelChunkManager`, and the sprite batching inside `RenderEntityManager` beyond line 530.
