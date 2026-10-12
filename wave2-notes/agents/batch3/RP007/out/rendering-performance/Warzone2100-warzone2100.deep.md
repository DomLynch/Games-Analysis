# Warzone2100-warzone2100 (rendering-performance, cell 3)

Donor: `/mnt/frankendom-donors/Warzone2100-warzone2100/lib/ivis_opengl/piedraw.cpp` | Licence: GPL version 2 or any later version (file header lines 8-9: "either version 2 of the License, or (at your option) any later version."; COPYING is the GPL v2 text) | copyleft, clean-room, shape only | C++ | symbols `InstancedMeshRenderer::Draw3DShape`, `InstancedMeshRenderer::FinalizeInstances`, `InstancedMeshRenderer::clear`, `InstancedMeshRenderer::Draw3DShapes_Instanced`

Checked: Read `piedraw.cpp` in the instanced renderer: the key and per-instance structs (251-275, 344-383), the routing in `Draw3DShape` (1267-1400, the key at 1296, the routes at 1347 and 1391, the shadow gate at 1374), the per-instance data `GenerateInstanceData` (552-580), the batch clear and compaction (1180-1266), `FinalizeInstances` (1590-1659), the pass loop in `Draw3DShapes_Instanced` (1914-2012), the frame entry points `pie_StartMeshes`, `pie_FinalizeMeshes` (1530-1542), the renderer's static instance (1405), and the caller line 1449. Candidates opened: `lib/ivis_opengl/piedef.h` (declaration, line 50), `src/effects.cpp` and `src/display3d.cpp` (callers, grep only). Not read: the `pie_Draw3DShape` wrapper in full (1400-1450), the `DrawAll` body (1664-1913, only its start and the call at 1587), `Draw3DShapes_Old` (2013 on), `pie_Draw3DShape2_Instanced` itself, the stencil shadow passes, and any frustum or distance cull outside the shadow gate (none found in this file by grep). The grep for `sort` found only shadow-edge sorts (875-881), so translucent batches are not depth-sorted here. camera_scope: n/a (rendering, not a camera topic). Confidence: high on the batch key, the per-instance data, the clear and compaction, the finalize step and the pass order (read end to end); medium on how the frame is driven (the wrappers around `DrawAll` were not read). Nothing was run.

Best transferable idea: Key the draw calls on mesh, shader and pass flags only; put each unit's matrix, colour, team colour, alpha and frame index in a per-instance buffer, and draw each key once per pass, in a fixed pass order (opaque, translucent, translucent without depth write, additive).
Decision (proposed): adapt. Keep the key-by-mesh-and-flags batching, the per-instance colour and team colour, and the fixed pass order. Do not port the translucent order (first-use, not depth) as it stands: sort translucent batches by distance in the engine, or limit translucency to effect meshes. The donor has no creature skeletal clips in this path, so creature clips do not transfer.
Acceptance: A dev counter shows that N units of one model with different team colours produce one instanced draw call per pass, that adding a unit of a second model adds exactly one call, and that translucent effect instances are drawn after all opaque instances in every frame.

## 1. Mechanism

- Frame start (`pie_StartMeshes`, 1530-1532). Calls `clear()` (1180-1210). `clear` counts frames. On every 600th frame (`batchCompactionIntervalFrames`, 1117; test at 1189), batches that were empty last frame are erased (1198) and the others are emptied, keeping their capacity. Every other frame all batches are emptied and their capacity kept (1182-1183 comment). Translucent and additive maps are emptied the same way, and the counters are reset.
- Per object (`pie_Draw3DShape` calls `Draw3DShape`, 1449). The shader is chosen from the light flag (lit or unlit), and the instanced or non-instanced variant from `useInstancedRendering` (1296). Shape transforms are applied: shield scale, height-scaled construct, raise or collapse. The key is `templatedState(shader, shape, pieFlag)` (1296). The route depends on the flags: additive (test at 1329, push at 1333), translucent (test at 1341; no depth write pushes at 1347, depth write at 1351), or opaque (1391 `try_emplace` into `instanceMeshes`). For opaque stencil shadows (flag pie_SHADOW or pie_STATIC_SHADOW, fallback mode only), the squared distance from the camera is compared to `SHADOW_END_DISTANCE` (1374). Each route appends one `GenerateInstanceData` record.
- Instance record (`GenerateInstanceData`, 552-580). Holds the 4x4 matrix, a packed vector of stretch, ECM state, a not-premultiplied flag and the frame index (574), and the colour and team colour. For additive and translucent instances the colour's alpha is replaced by `pieFlagData` (559, 563): the alpha is per instance, not part of the key. Premultiplied flags convert the colours (not read in detail).
- Finalize (`FinalizeInstances`, 1590-1659, called from `pie_FinalizeMeshes`, 1540-1542). Builds one draw call per non-empty batch, in pass order: opaque (1618), translucent (1628), translucent without depth write (1638), additive (1648). Each call records its first instance and its count. All instance data is concatenated into one array and uploaded to the current slot of a ring of `maxFramesInFlight() + 1` buffers (1171, 1657).
- Draw (`Draw3DShapes_Instanced`, 1914-2012, from `DrawAll` at 1587). Opaque calls first (1923-1935), then the old-shadow pass, then translucent calls (1956-1963), then the no-depth-write translucent calls, then additive calls last (1989-1996). Each call is one `pie_Draw3DShape2_Instanced` with the instance buffer offset and count (1935).
- Order of operations in one frame: start (clear, maybe compact), route each object into a key batch, finalize into one call per batch with one upload, draw by pass.

## 2. Key functions

- `InstancedMeshRenderer::Draw3DShape`: `/mnt/frankendom-donors/Warzone2100-warzone2100/lib/ivis_opengl/piedraw.cpp` 1267-1400 (key 1296, routes 1347 and 1391, shadow gate 1374).
- `GenerateInstanceData`: same file, 552-580.
- `InstancedMeshRenderer::clear`: same file, 1180-1210 (compaction 1189-1198).
- `InstancedMeshRenderer::FinalizeInstances`: same file, 1590-1659.
- `InstancedMeshRenderer::Draw3DShapes_Instanced`: same file, 1914-2012.
- Frame entry points: `pie_StartMeshes` 1530, `pie_FinalizeMeshes` 1540 (same file).
- Batch key: `struct templatedState` 344-383 (shader, shape, flags; hash at 376).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One draw call per (shader, mesh, pass-flags) key per pass; per-unit data in an instance buffer | Key fields: shader, shape pointer, pie flags (theirs: 344-383) |
| Per-unit colour, team colour, alpha, matrix and frame in the instance record | Alpha from `pieFlagData` (theirs: 563); packed stretch, ECM, premultiply, frame (theirs: 574) |
| Batch storage kept between frames, emptied not freed, with a periodic sweep of unused batches | Sweep every 600 frames (theirs: 1117) |
| Stencil shadow caster gate by squared distance | `SHADOW_END_DISTANCE` = 8000 x 8000, "keep in sync with lighting.c:FOG_END" (theirs: 65) |
| Instance buffer ring | `maxFramesInFlight() + 1` slots (theirs: 1171) |
| Fixed pass order | Opaque, translucent, translucent without depth write, additive (theirs: 1923, 1956, 1989) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: clear with a periodic sweep (empty batches erased, others emptied with capacity kept), route each unit into a batch keyed by (shader, mesh, flags) per pass, finalize into one call per batch in pass order with one concatenated instance array, and the shadow distance gate as a helper. It simplifies four things: the donor keeps opaque batches in a hash map (order not defined), the sketch uses insertion order for every pass; the donor's rotating GPU buffer and the upload are omitted (the sketch returns the array); the donor's lighting, premultiply conversion and the non-instanced fallback are omitted, so `colour` is taken as already final; and the stretch and ECM fields are kept as plain numbers. Typechecked on the VPS with `tsc --strict --target es2020`, exit 0.

```ts
// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Instanced unit batcher: one draw per (shader, mesh, flags) key per pass; colour, team colour, alpha and matrix per instance.

export type Pass = 'opaque' | 'translucent' | 'translucentNoDepthWrite' | 'additive';
const PASS_ORDER: Pass[] = ['opaque', 'translucent', 'translucentNoDepthWrite', 'additive'];

export interface MeshKey { shader: number; mesh: number; flags: number; }

export interface InstanceRecord {
  matrix: number[];      // 16 floats, column-major
  colour: number;        // packed RGBA; alpha already set by the caller for translucent passes
  teamColour: number;    // packed RGBA
  stretch: number;
  frame: number;         // frame index for multi-frame meshes
}

export interface DrawCall { key: MeshKey; pass: Pass; first: number; count: number; }

const keyString = (k: MeshKey): string => `${k.shader}|${k.mesh}|${k.flags}`;

// Shadow casters are added only when squared distance to the camera is under the cap.
export const SHADOW_END_DIST_SQ = 8000 * 8000;
export function shadowEligible(distSq: number): boolean {
  return distSq < SHADOW_END_DIST_SQ;
}

interface Batch { key: MeshKey; items: InstanceRecord[]; }

export class InstanceBatcher {
  private maps: Map<Pass, Map<string, Batch>> = new Map(PASS_ORDER.map((p) => [p, new Map()] as [Pass, Map<string, Batch>]));
  private frames = 0;
  constructor(private compactEvery: number) {}

  // Start of frame: keep batches (and their arrays) for next frame. Every compactEvery frames,
  // drop batches that were empty during the previous frame.
  begin(): void {
    this.frames++;
    const sweep = this.frames >= this.compactEvery;
    if (sweep) this.frames = 0;
    for (const map of this.maps.values()) {
      for (const [k, b] of map) {
        if (sweep && b.items.length === 0) map.delete(k);
        else b.items.length = 0;
      }
    }
  }

  add(pass: Pass, key: MeshKey, rec: InstanceRecord): void {
    const map = this.maps.get(pass)!;
    const k = keyString(key);
    let b = map.get(k);
    if (!b) {
      b = { key, items: [] };
      map.set(k, b);   // Map keeps insertion order, so each pass draws in first-use order
    }
    b.items.push(rec);
  }

  // Concatenate each non-empty batch into one instance array, one draw call per batch.
  finalize(): { instances: InstanceRecord[]; calls: DrawCall[] } {
    const instances: InstanceRecord[] = [];
    const calls: DrawCall[] = [];
    for (const pass of PASS_ORDER) {
      for (const b of this.maps.get(pass)!.values()) {
        if (b.items.length === 0) continue;
        calls.push({ key: b.key, pass, first: instances.length, count: b.items.length });
        for (const r of b.items) instances.push(r);
      }
    }
    return { instances, calls };
  }
}

export {};
```

## 5. Lands in

- TARGET (proposed, client only): `src/render/instanced-units.ts`. The brief allows only `src/fight/<module>.ts` or `origins/<path>`, and no such module fits rendering, so Strategy needs to rule on the path. The renderer is client-only; the server never reads it.
- Parity row: 16 (colour grade and quality), the nearest row. Per-unit team colour is colour work and the batch is a quality and budget concern. No row covers draw batching; creature clips (row 7) do not come from this path.
- today: none in Frankendom (not read; not found in this pass).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: readability at 375 wide (team colour reads at a glance, max units per frame stays inside a draw budget); the addendum's per-frame budget; client-only, no server rule applies.

## 6. Gaps and risks

- Licence: GPL-2.0-or-later, copyleft. Clean-room only; the sketch was written from the mechanism.
- Translucent order is not depth-sorted in this file (the only `sort` calls are shadow-edge sorts, 875-881). A translucent batch is drawn in first-use order, and instances within a batch in insertion order. Overlapping effects can pop when the camera moves. Fix: sort translucent batches by distance in the engine (one sort per frame over batches, or per instance for a few effect meshes), and keep the translucent set small.
- Opaque batches are in an unordered map (hash order), not first-use order. The sketch uses first-use order for every pass. No visible effect is expected for opaque meshes, but this was not tested.
- No frustum or distance cull for units in this file. Objects are submitted by the caller, and the only distance gate is the stencil shadow caster (1374). The culling is elsewhere (not read). Frankendom needs a cull before the instance pass for zones with many units.
- The frame index per instance is for multi-frame IMD meshes (effects and animated textures). Skeletal animation is not in this path (not read). Creature clips would need their own path, so this gives no help with row 7.
- Every frame uploads all instance data into one ring slot (1657). Cheap at the scales read here; not measured on a phone.
- The sweep every 600 frames (1117) is a memory detail: batches that were not drawn are dropped, and batches that were used keep their capacity. The keep-capacity part is worth adopting; the sweep interval is a number to tune per device, not a donor fact to copy.
- No defect found in the parts read. The open questions are the ones above, plus the wrappers around `DrawAll` (not read), which decide how often the passes run per frame.
- Frankendom rulings: client-only; kill, ledger and server tick are unaffected. MAX_ATTACKERS = 3 means a Pit fight has few units to batch; the gain is in zones and crowds.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: readability at 375 wide (team colour and unit count per frame inside a draw budget); client-only, no server rule applies.
