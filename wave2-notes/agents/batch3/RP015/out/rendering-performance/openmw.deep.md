# openmw (rendering-performance, cell 1)

Donor: `/mnt/frankendom-donors/openmw/apps/openmw/mwrender/groundcover.cpp` (with `groundcover.hpp`, `components/terrain/quadtreeworld.cpp`, `components/terrain/quadtreenode.cpp`, `apps/openmw/mwrender/renderingmanager.cpp`) | Licence: GPL-3.0 (`/mnt/frankendom-donors/openmw/LICENSE`, "Version 3, 29 June 2007"; `groundcover.cpp` has no licence header of its own) | C++ (OpenSceneGraph) | symbol `Groundcover::getChunk`

Checked: camera_scope n/a (foliage rendering, not a camera). Read in full: `groundcover.cpp` 1-476 and `groundcover.hpp`. Also read: `quadtreeworld.cpp` 380-420 and 594-610, `quadtreeworld.hpp` 66-80, `quadtreenode.cpp` 13-30, `renderingmanager.cpp` 1300-1322, `components/settings/categories/groundcover.hpp` line 22, `LICENSE` lines 1-3. Confidence high on the chunk build and the cull path in `groundcover.cpp`; medium on the quadtree side, which I read only at the call and the max-LOD setter. Not read: the bodies of `computeNearestPointInFrustum` and `computeFurthestPointInFrustum`; the rest of `distance()` after line 30 (the return line); the default of `mRenderingDistance`; the cache-expiry handling in the resource manager; the groundcover shader (so any per-instance fade in the shader is unknown).

## 1. Mechanism

- Foliage (groundcover: grass and small plants placed in land cells) is never drawn one plant per draw call. The terrain quadtree asks for one node per chunk (`quadtreeworld.cpp` 397-402 calls `getChunk` for each chunk manager). `Groundcover::getChunk` (328) returns a cached node keyed by chunk centre and size (333); a miss builds it with `collectInstances` then `createChunk`.
- Order of steps when a chunk is built:
  (a) Density gate: if density is 0 or less, nothing is collected (376).
  (b) For each land cell under the chunk (loop 390-), read every reference in the cell's contexts. A reference already seen under the same RefNum is not counted again (405).
  (c) Density thinning, per reference: density 1 or more keeps everything (273). Otherwise the accumulator adds density (276), a reference is kept only when the accumulator reaches 1 (277), and the accumulator drops by 1 when one is kept (280). The accumulator is reset to 0 at the start of each cell (394, reset at 284). This is deterministic, not random.
  (d) Chunk border test (407): applies only when the chunk is smaller than one cell in x or y (313). In a full-size chunk every reference passes.
  (e) Survivors are grouped by model.
- `createChunk` (433) builds one group per chunk. For each model it clones the model template (440) and makes the clone instanced: instance count is set on each primitive set (221); each instance gets a vec4 of position relative to the chunk origin plus scale (231), bound as vertex attribute 6 with divisor 1 (252, 362); per-instance rotation goes in attribute 7. Each instance gets a bounding sphere of radius `model radius x scale x 1.1` (235), where the 1.1 is an extra margin for the groundcover sway animation (234). These spheres are expanded into one chunk box that becomes the drawable's bound (240).
- Chunk origin is the chunk world centre (436). Every instance position is stored relative to it (231).
- Culling. The group gets a view-distance callback (455). It traverses the chunk only when `distance(box, eye) <= viewDistance` (301). The chunk is either drawn with all of its instances or not at all; there is no per-instance cull.
- LOD cut-off. `getChunk` returns nothing when the chunk's LOD is above the chunk manager's max LOD (331). The max LOD is set when the manager is added to the quadtree, from groundcover view distance plus reuse distance (quadtreeworld.cpp 602-604).
- Per-frame extra: each instanced drawable has a cull callback (`InstancedComputeNearFarCullCallback`, 62). It culls the chunk if it is outside the frustum (73) or fully behind the eye (86); otherwise it only tightens the near and far planes. When tightening is needed it loops over every instance matrix (107, 147), so the per-frame cost grows with the instance count of that chunk.
- Render state: alpha test GEQUAL at 128/255 (358) instead of blending, blending off (360), one shared state set for all groundcover chunks.
- Tick: none. This is render-time work. Chunks are built on demand and cached; no fixed step or accumulator over time is involved. The only accumulator is the density thinning in (c), which runs over references, not time.

## 2. Key functions

- `Groundcover::getChunk`: `/mnt/frankendom-donors/openmw/apps/openmw/mwrender/groundcover.cpp` starts at 328. Entry point per quadtree chunk; LOD cut-off (331), cache by centre and size (333), build on miss.
- `Groundcover::collectInstances`: same file, starts at 374. Density gate (376), per-cell reset (394), per-reference density and border tests (405-407), grouping by model.
- `DensityCalculator`: same file, class starts at 263. The accumulator: `isInstanceEnabled` (273-282), `reset` (284).
- `Groundcover::createChunk`: same file, starts at 433. One clone per model (437-440), `InstancingVisitor` per clone (447), view-distance callback (455), state set and divisor (458, 362).
- `InstancingVisitor::apply(osg::Geometry&)`: same file, starts at 217. Instance count (221), relative positions and per-instance bounds (231-235), attribute binding (252).
- `ViewDistanceCallback`: same file, class at 291, `operator()` at 299. Traverses only if the eye is within view distance of the chunk box (301). Uses `Terrain::distance` from `quadtreenode.cpp` 13.
- `InstancedComputeNearFarCullCallback::cull`: same file, starts at 62. Frustum and behind-eye culls (73, 86), then near/far tightening loops (107, 147).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant |
|---|---|
| Density thinning by accumulator: keep one plant each time the accumulator reaches 1, so the kept fraction tracks density | Density is a settings value clamped to 0..1 (`components/settings/categories/groundcover.hpp` 22, `makeClampSanitizerFloat(0, 1)`); 1 or more keeps all (273); 0 or less stops (376) |
| Per-instance bound margin for sway animation | 1.1 (235) |
| Alpha-test cut-out instead of blending (no sorting needed) | Threshold 128/255 (358); blend off (360) |
| Instance divisor for hardware instancing | Divisor 1 on attribute 6 (362) |
| Chunk-level distance cut | Eye to chunk box distance <= view distance (301); view distance from `Settings::groundcover().mRenderingDistance` (`renderingmanager.cpp` 1310; default not read) |
| LOD cut for groundcover | Max LOD set from view distance plus reuse distance (`quadtreeworld.cpp` 603); the cut is at 331 |
| Per-chunk instance cap | None. `collectInstances` has no count limit. Density is the only budget control. |
| Per-frame draw count | One instanced draw per model per chunk (437-440) |

## 4. TypeScript sketch

simplified: thinning, batching by model, chunk-local positions with per-instance bounds, and the chunk distance test only. The caller is assumed to pass plants already read from the cells and already filtered to the chunk border (the donor does this in `collectInstances`, 390-407). Omitted: the cell and multi-context reader, the near/far tightening callback, the alpha test and shader setup, point lighting, and cache handling. Reordered and changed on purpose: the donor resets its accumulator per cell (394), so the first plant of every cell is dropped when density is below 1 (defect, see section 6). The sketch uses one accumulator for the whole chunk, over a stable sort by id, and the border filter has to run before thinning (the donor runs it after, 405-407). Per-model radii are passed in as data; the donor takes the model's bounding radius from the cloned geometry's box (not receipted, the line was not checked). The chunk test uses the usual point-to-box gap; the donor's helper body after line 30 was not read.

```ts
// Licence: GPL-3.0 (donor LICENSE file). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Plant { id: number; x: number; y: number; z: number; scale: number; yaw: number; model: string; }
export interface Box { min: [number, number, number]; max: [number, number, number]; }
export interface ChunkBatch { model: string; count: number; offsets: Float32Array; yaws: Float32Array; box: Box; }

// Deterministic thinning: keeps about `density` of the plants, evenly spread, no random numbers.
// One accumulator for the whole chunk (the donor resets it per cell).
export function thinChunk(plants: Plant[], density: number): Plant[] {
  if (density >= 1) return plants;
  if (density <= 0) return [];
  const sorted = [...plants].sort((a, b) => a.id - b.id); // stable order: the kept set must not depend on load order
  const kept: Plant[] = [];
  let acc = 0;
  for (const p of sorted) {
    acc += density;
    if (acc >= 1) { acc -= 1; kept.push(p); }
  }
  return kept;
}

// One chunk: thin, group by model (one draw per model), chunk-local positions, per-instance bounds with a sway margin.
export function buildChunk(
  plants: Plant[],
  origin: [number, number, number],
  density: number,
  modelRadius: Record<string, number>,
): ChunkBatch[] {
  const thinned = thinChunk(plants, density);
  const byModel = new Map<string, Plant[]>();
  for (const p of thinned) {
    const list = byModel.get(p.model);
    if (list) list.push(p); else byModel.set(p.model, [p]);
  }
  const batches: ChunkBatch[] = [];
  for (const [model, list] of byModel) {
    const offsets = new Float32Array(list.length * 4);
    const yaws = new Float32Array(list.length);
    const r0 = modelRadius[model] ?? 0;
    const box: Box = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
    list.forEach((p, i) => {
      // Chunk-local positions keep float32 precision far from the world origin.
      const local: [number, number, number] = [p.x - origin[0], p.y - origin[1], p.z - origin[2]];
      offsets[i * 4] = local[0];
      offsets[i * 4 + 1] = local[1];
      offsets[i * 4 + 2] = local[2];
      offsets[i * 4 + 3] = p.scale;
      yaws[i] = p.yaw;
      const r = r0 * p.scale * 1.1; // 10% margin for sway animation
      for (let a = 0; a < 3; a++) {
        box.min[a] = Math.min(box.min[a], local[a] - r);
        box.max[a] = Math.max(box.max[a], local[a] + r);
      }
    });
    batches.push({ model, count: list.length, offsets, yaws, box });
  }
  return batches;
}

// Chunk-level distance cull: draw the chunk only if the eye is within viewDistance of its box.
export function chunkInRange(box: Box, eye: [number, number, number], viewDistance: number): boolean {
  let d2 = 0;
  for (let a = 0; a < 3; a++) {
    const v = eye[a];
    const gap = v < box.min[a] ? box.min[a] - v : v > box.max[a] ? v - box.max[a] : 0;
    d2 += gap * gap;
  }
  return d2 <= viewDistance * viewDistance;
}

export {};
```

## 5. Lands in

- TARGET `origins/client/render/foliage-chunks.ts` (proposed path, not checked against the Frankendom repo). Client-only render module for zone foliage, next to the world camera. It does not touch `src/fight`.
- Parity-checklist row 16 (colour grade / quality). The lane hint said row 12, but in the addendum list row 12 is combat sound cues, so I used row 16 for the frame-budget and quality tier. Lead should confirm the row.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: zones as data (density and view distance per zone, section 6); client-only rendering (the engine never reads foliage).

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch comes from the described mechanism, not from the donor lines.
- Client only. Chunk builds, density and draws must never reach the engine: no foliage collision in `src/fight`, and kills, hits and spawns must not read foliage. Frankendom's server-verified kills are unaffected only if this rule holds.
- Defect 1, first plant of each cell dropped when density is below 1. The accumulator starts at 0 (284), and it is reset per cell (394), so the first reference in each cell fails the test at 277 whenever density is below 1. Fix: one accumulator per chunk, as in `thinChunk`.
- Defect 2, density is counted before the chunk-border test (405 then 407). References outside a sub-cell chunk use up accumulator steps, so the kept fraction inside the chunk is not exactly density. Fix: run the border filter first, as the sketch assumes.
- Defect 3, order dependence. The kept set depends on the order references are read from the cell files, so the same zone can show different grass after a reload or a reordered file. Fix: sort by a stable id before thinning (the sketch does this).
- Frame pacing risk. The near/far callback loops over every instance matrix for a chunk in view when the planes must be tightened (107, 147). On a phone this is per-frame CPU work that grows with instance count. Fix: do not port this callback. Compute the chunk box once at build time (the sketch does this) and let the renderer use the chunk box.
- No instance cap. Nothing limits instances per chunk (`collectInstances` has no count check). Frankendom needs a per-zone cap as zone data, set per quality tier, because density alone does not bound the draw cost on a phone.
- Draw calls scale with model count per chunk: one draw per model (437-440). A zone with many grass models costs many draws per chunk. Frankendom should cap models per zone chunk.
- Pop-in at the distance edge. The cull is per chunk (301), and `groundcover.cpp` has no per-instance distance fade (the shader was not read). Expect a visible edge unless the shader fades it.
- Camera dependency. The cull uses the render camera's eye point (301). Pulling back an over-the-shoulder world camera widens the set of chunks built and drawn, so the camera's distance and the foliage distance are one budget. Camera is client-only, so this is a render-cost trade, not a rule conflict.
- The donor is OSG-specific (osg::DrawableCullCallback, VertexAttribDivisor, AlphaFunc). A browser build would use an instanced mesh per model per chunk (for example Three.js InstancedMesh) with the same batching; the transferable part is the chunk, the thinning and the distance cut, not the OSG callback.

Best transferable idea: One instanced draw per model per chunk, with chunk-local transforms, a chunk-level distance cull and a deterministic density thinning, keeps foliage inside a phone frame budget.

Decision (proposed): adapt - take the chunk batching, chunk-local positions and the chunk distance cull; fix the density accumulator (one per chunk, border filter first, stable order) and drop the per-frame near/far callback. Why: foliage is client-only and the chunk shape fits zones-as-data and phone frame pacing; the defects are fixable and the idea does not conflict with the rulings.

Acceptance: On a phone-width world zone (375 wide), foliage shows out to the foliage distance setting with no pop-in in front of the player, and a dev overlay reports foliage draw calls at or below one per model per visible chunk. A unit test asserts `chunkInRange` is false for a chunk beyond view distance and that `thinChunk` returns the same kept ids for the same plants in a different input order.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: zones as data (per-zone density and view distance); client-only rendering; defect rule (keep the idea, fix the defect)

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
- Verdict: CLEAN. No errors found; defects 1-3 confirmed real.
- Missed (minor): the per-frame cull callback only runs its instance loops when compute-near-far mode is active, the frustum result mask is non-zero and dNear/dFar fall outside the computed planes (lines 69-71, 92-97); the note's 'per-frame cost grows with instance count' is true but conditional. A stomp-mode setting (settings groundcover.hpp:24) exists outside the file read.
