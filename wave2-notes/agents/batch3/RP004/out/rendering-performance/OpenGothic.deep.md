# OpenGothic (rendering-performance, cell 3)

Donor: `/mnt/frankendom-donors/OpenGothic/common/graphics/drawclusters.cpp` (with drawbuckets.cpp, bounds.cpp and drawcommands.cpp 146-254 and 434-481) | Licence: MIT (`LICENSE` line 1 "MIT License", line 3 "Copyright (c) 2019 Try"; code may be adapted with the notice kept) | C++ | symbol `DrawClusters::patchClusters`

Checked: The list hint (`common/graphics/renderer.cpp`) is the wrong file for the mechanism: it is the frame orchestration, and its culling passes are GPU dispatches (the global cull at 1339-1373 and the position and binning passes after it). The batching and upload mechanism is in drawclusters.cpp, drawbuckets.cpp and bounds.cpp. Read in full: drawclusters.cpp (191 lines), drawclusters.h (68), drawbuckets.cpp (159), bounds.cpp (92). Read in part: drawcommands.cpp 146-254 (command keys, payload layout, indirect records) and 434-481 (draw loop), renderer.cpp 1330-1420 (GPU cull chain, read only to place it). Not read: drawcommands.cpp 1-145 and 254-433 (visibility passes), drawbuckets.h, instancestorage.cpp (319 lines), the shaders behind the GPU culling and the cluster patch (`clusterPatch`, `rtsmCulling`, `rtsmMeshletCull`), and the packed-mesh producer of the meshlet clusters. The GPU culling side is therefore thin. Confidence: high on the CPU batching and dirty-slot upload. Medium on how the GPU consumes the radius (not read). Depth: thin. Not a camera cell (camera_scope does not apply).

## 1. Mechanism

- What it does: (a) groups drawable meshes into batches keyed by mesh and material (buckets), (b) gives every cluster (a meshlet group or a whole bucket) a bounding-sphere record in one shared GPU array, (c) uploads only the records that changed each frame, and (d) turns the batches into indirect draw records with a payload range per batch.
- Step 1, bucket keys (drawbuckets.cpp 40-54): `alloc(mat, staticMesh)` looks for an existing bucket with the same static mesh pointer and the same material (43), and returns its id; otherwise it appends a bucket and sets the bucket dirty flag (51-53). The animated variant (56-70) keys on the animated mesh instead.
- Step 2, bucket records (drawbuckets.cpp 119-159): when the dirty flag is set, the commit writes one GPU record per bucket: a per-material wave amplitude and alpha weight, the mesh radius, the bounding box corners, and flags (morph, skin, solid 146-147, water 148-149). It then rebuilds the whole bucket buffer (154-155) and refreshes the bindless descriptor arrays (157).
- Step 3, sphere radius (bounds.cpp 82-91): the conservative radius is the square root of the summed squares of the largest absolute x, y and z extents of the box (88-91). It is a sphere about the model origin, not the box centre. For a cluster built from a bucket, the radius adds the material's wave amplitude (drawclusters.cpp 45) so water and foliage that move stay inside it. Animated meshes take their radius without the wave term (46).
- Step 4, cluster records (drawclusters.cpp 17-56): `alloc` with a packed-mesh cluster array creates one record per meshlet group (23-33). `alloc` with a bucket creates one record covering the bucket's whole meshlet range (40-53). Both mark their slots dirty (36, 54).
- Step 5, dirty bits (drawclusters.cpp 183-191): each slot's bit is set with an atomic OR (187), in a word of 32 slots (35, 147), and the batch-level dirty flag is raised (190).
- Step 6, commit (83-103): if the dirty flag is not set, return (84-85). Otherwise clear the flag (86). If the GPU buffer size matches (rounded to 4 KB, 89-93), run the patch path (94). Otherwise recycle the buffer, allocate a new one, upload the whole array (98-100), clear all dirty words (101) and return true.
- Step 7, patch (131-181): for each dirty word, read it, clear it (141-142), and append each set slot's index and record (144-152). If nothing is dirty, return (155-156). Upload the indices and records into this frame's patch buffer (`patch[fId]`, 159; reused when they fit, 161-171; otherwise a new buffer is created). Bind the main array and the patch buffers and dispatch the cluster patch compute shader with the patch count (173-180).
- Step 8, free-list allocation (105-129, `implAlloc`): a slot range is taken from the free list. An exact fit is removed (110-113). Otherwise the best candidate is chosen (116-117, see D1), and the tail of that range is taken (122-123). If nothing fits, the array grows at the end (126-128).
- Step 9, free and merge (58-81): freed slots get default values with radius -1 and zero meshlets (60-62), are marked dirty (63), inserted into the sorted free list, and merged with touching neighbours on both sides (66-80).
- Step 10, command layer (drawcommands.cpp 146-254): a draw command is keyed by its pipelines and, for non-bindless draws, by bucket id (157-163). Each command reserves a payload range (`maxPayload`, grown by `addClusters`, 180-183). Commit sorts the commands by alpha function (201-206), assigns each a payload offset as a running total (208-214), and rounds the total to 256 (216). It rebuilds the indirect records only when the command count or the layout changed (219-221, then 223-251). Each indirect record has the packed mesh's maximum index count and its payload offset (227-230).
- Step 11, draw (434-481): `drawCommon` finds the range of commands for one alpha function with lower and upper bound on the sorted list (437-442) and draws each with an indirect draw at its record offset (479), or a mesh-shader dispatch when the command uses one (478).
- Frame pacing: patch uploads go to a buffer per frame in flight (drawclusters.h 67, drawclusters.cpp 159), so a patch never overwrites data the GPU may still read. Descriptor arrays are padded to a multiple of 1024 before they are rebuilt, with the donor comment "avoid shader linking stutter in vulkan" (drawbuckets.cpp 13, 98-103). Payload totals are padded to 256 (drawcommands.cpp 216).

## 2. Key functions

- `DrawClusters::patchClusters` (dirty words to a patch, per-frame upload, compute dispatch): `/mnt/frankendom-donors/OpenGothic/common/graphics/drawclusters.cpp` 131-181.
- `DrawClusters::markClusters` (atomic bit set): same file, 183-191.
- `DrawClusters::commit` (full re-upload or patch): same file, 83-103.
- `DrawClusters::implAlloc` and `free` (free list): same file, 105-129 and 58-81.
- `DrawBuckets::alloc` and `DrawBuckets::commit` (batch key and bucket records): `/mnt/frankendom-donors/OpenGothic/common/graphics/drawbuckets.cpp` 40-54 and 119-159.
- `Bounds::calcR` (conservative radius): `/mnt/frankendom-donors/OpenGothic/common/graphics/bounds.cpp` 82-91.
- `DrawCommands::commandId`, `commit`, `drawCommon`: `/mnt/frankendom-donors/OpenGothic/common/graphics/drawcommands.cpp` 146-183, 185-251, 434-481.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Batch key is mesh plus material | Key match on pointer and material (drawbuckets.cpp 43); linear scan, no map |
| Dirty flags in 32-slot words | 32 (drawclusters.cpp 35, 147) |
| Conservative radius about the origin | sqrt(x^2 + y^2 + z^2) with x, y, z the largest absolute extent per axis (bounds.cpp 88-91) |
| Water and foliage margin | Radius plus `waveMaxAmplitude` per material (drawclusters.cpp 45). Value per material: not read. |
| Padding for descriptor arrays | 1024 (drawbuckets.cpp 13) |
| Padding for the command payload | 256 (drawcommands.cpp 216) |
| Freed slot sentinel | Radius -1, zero meshlets (drawclusters.cpp 61-62) |
| Frames in flight | `Resources::MaxFramesInFlight` (drawclusters.h 67); value not read |
| Full re-upload trigger | Buffer size change after 4 KB rounding (drawclusters.cpp 89-93) |

The donor numbers are engine rules (word size, padding, radius formula). The wave amplitude is per material, so it belongs in zone or asset data.

## 4. TypeScript sketch

simplified: the sketch keeps the batch key (mesh plus material, looked up in a map instead of a linear scan), the conservative radius with the wave margin, the 32-slot dirty words cleared with an exchange so a mark during the take survives, the best-fit free list with coalescing on release, and the padding helper. It fixes the donor's best-fit defect (D1) and the lost-clear race (D2, shown with an atomic exchange). It omits: the GPU patch dispatch and the per-frame-in-flight staging buffers; the split between one record per meshlet group and one per bucket; the indirect draw records and the alpha ordering; the -1 sentinel on free (a comment only); and the bindless descriptor arrays. Atomics operate on ordinary typed arrays in one thread; across workers the array must be a SharedArrayBuffer view.

```ts
// Licence: MIT (donor, OpenGothic). Adapted shape; the donor defects (best fit, lost clear) are fixed here.
// adapt
export interface Range { begin: number; end: number; }   // [begin, end)

// Batch key = mesh + material. Lookup is a Map, not the donor's linear scan.
export class BucketTable<T> {
  private index = new Map<string, number>();
  readonly items: T[] = [];
  dirty = false;

  alloc(key: string, make: () => T): number {
    const hit = this.index.get(key);
    if (hit !== undefined) return hit;
    this.items.push(make());
    const id = this.items.length - 1;
    this.index.set(key, id);
    this.dirty = true;
    return id;
  }
}

// Conservative radius about the model origin (max absolute extent per axis), plus the wave amplitude
// so that waving water and foliage stay inside the sphere.
export function conservativeRadius(lo: [number, number, number], hi: [number, number, number], waveAmp: number): number {
  const x = Math.max(Math.abs(lo[0]), Math.abs(hi[0]));
  const y = Math.max(Math.abs(lo[1]), Math.abs(hi[1]));
  const z = Math.max(Math.abs(lo[2]), Math.abs(hi[2]));
  return Math.sqrt(x * x + y * y + z * z) + waveAmp;
}

// Dirty bits, 32 slots per word. Marking is atomic; taking the patch exchanges each word to zero,
// so a mark that lands during the take is kept for the next patch instead of being erased.
export class DirtySlots {
  private words: Uint32Array;

  constructor(capacity: number) {
    this.words = new Uint32Array(Math.ceil(capacity / 32));
  }

  mark(id: number): void {
    Atomics.or(this.words, id >>> 5, 1 << (id & 31));
  }

  takePatch(): number[] {
    const out: number[] = [];
    for (let w = 0; w < this.words.length; w++) {
      const mask = Atomics.exchange(this.words, w, 0);
      if (mask === 0) continue;
      for (let b = 0; b < 32; b++) {
        if ((mask & (1 << b)) !== 0) out.push(w * 32 + b);
      }
    }
    return out;
  }
}

// Best fit: the smallest free range that holds count. The donor never updates its best-diff value,
// so it keeps the last range that fits; this version compares the slack.
export function takeBestFit(free: Range[], count: number, grow: () => number): number {
  let best = -1;
  let bestSlack = Infinity;
  for (let i = 0; i < free.length; i++) {
    const size = free[i].end - free[i].begin;
    if (size < count) continue;
    if (size - count < bestSlack) {
      best = i;
      bestSlack = size - count;
    }
  }
  if (best < 0) return grow();
  const r = free[best];
  if (r.end - r.begin === count) {
    free.splice(best, 1);
    return r.begin;
  }
  r.end -= count;
  return r.end;    // takes the tail of the range, as the donor does
}

// Return a range and merge it with neighbours that touch it.
export function release(free: Range[], r: Range): void {
  free.push(r);
  free.sort((a, b) => a.begin - b.begin);
  for (let i = 0; i + 1 < free.length; ) {
    if (free[i].end === free[i + 1].begin) {
      free[i].end = free[i + 1].end;
      free.splice(i + 1, 1);
    } else {
      i += 1;
    }
  }
}

// Round a size up to a multiple (the donor uses 1024 for descriptor arrays and 256 for payload).
export function padTo(n: number, step: number): number {
  return Math.ceil(n / step) * step;
}

export {};
```

Sketch check: typechecked on the VPS with `npx -p typescript tsc --noEmit --strict --target es2020` (exit 0).

## 5. Lands in

- TARGET `origins/client/render/batch-buckets.ts` (proposed path; not checked against the Frankendom repo). Client-only: batching and uploads are rendering.
- Parity-checklist row: 7 (creature actor/clips). The batch key decides how creature meshes are submitted, and the dirty-slot patch is how their animated records reach the GPU. The list hint said row 12, which is combat sound cues in the addendum, so the hint looks wrong. Flagged for Strategy.
- Reuse tag: adapt-from-code (MIT: code may be adapted with the notice kept; the sketch is written from the mechanism and is not a copy)
- Brief rule served: rules 6 and 7 (licence stated; read end to end on the CPU side), rule 8 (target and row named), rule 10 (receipts verified: 178 ok, 0 failed)
Best transferable idea: batch by (mesh, material) and upload only the dirty slots each frame through a bit mask, clearing the mask atomically so a mark made during the upload is kept.
Decision (proposed): adapt — the batch key and the dirty-slot patch are what a browser build can use (partial buffer updates), with the wave margin in the radius; reject the mesh-shader and indirect GPU culling for the browser build, since it needs GPU features a browser build cannot assume.
Acceptance: in a zone with 200 creatures that share three meshes and two materials, the renderer issues at most six batch draws per frame; after one creature moves, the upload covers one slot; a test checks that a mark made during a patch is still present in the next patch.

## 6. Gaps and risks

- The GPU culling and the consumer of the sphere radius were not read (shaders not in this read). The radius is used by the donor's culling passes, but how those passes use it is unverified.
- D1 (defect, read, not run): `implAlloc` (drawclusters.cpp 106, 116-117) declares `bfDiff = size_t(-1)` and never updates it, so the test `sz-count < bfDiff` is always true and `bestFit` ends up as the last range that fits, not the smallest. Fix: set `bfDiff = sz - count` when a better candidate is recorded (the sketch's `takeBestFit`). Effect: fragmentation, not a crash.
- D2 (possible lost update, read, not run): `patchClusters` reads a dirty word (141) and then writes zero (142) without an atomic exchange. `markClusters` uses an atomic OR (187), which suggests marks can come from another thread. A mark that lands between the read and the write is erased and its record is not patched until the slot is marked again. Fix: take each word with an atomic exchange (the sketch's `takePatch`). Verify whether marks really come from another thread before changing the call sites.
- Bucket-level clusters do not set `pos` in `alloc(Bucket)` (drawclusters.cpp 40-56). Where the position comes from for those records is in the shaders (not read). Check before using the same shape.
- `free` sets radius -1 (61). The donor relies on the GPU side to skip such records; the Frankendom version should skip them on the CPU too.
- The bucket lookup is a linear scan (drawbuckets.cpp 40-45). It is fine at small counts; a zone with many distinct meshes needs the map in the sketch.
- Zones as data: the wave amplitude is a per-material value, so it is asset or zone data. Frankendom's fight arena (Pit) has few creatures, so most of the batching value is in zones.
- MAX_ATTACKERS = 3: batching helps crowds, not the three-attacker fight; do not add batch draws to the fight path for this reason alone.
- Not a camera cell. No camera claims are made here.

Reuse tag: adapt-from-code (MIT, notice kept; sketch written from the mechanism)
Brief rule served: rule 1 (real implementation found and read on the CPU side), rule 3 (confidence stated and GPU side flagged thin), rule 4 (best idea line), rule 6 (licence read), rule 8 (target and row named), rule 10 (receipts verified: 178 ok, 0 failed)
