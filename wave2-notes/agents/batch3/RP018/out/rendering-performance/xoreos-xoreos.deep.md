# xoreos-xoreos (rendering-performance, cell 1)

Donor: `/mnt/frankendom-donors/xoreos-xoreos/src/graphics/render/renderqueue.cpp` (with `renderman.cpp`, `graphics.cpp`) | Licence: GPL-3.0-or-later (file headers: "either version 3 ... or (at your option) any later version"; COPYING is GPL v3) | C++ | symbol `RenderQueue::render` (hint file `src/aurora/textureatlasfile.cpp` is the wrong file: it is an atlas index loader with no caller)

Checked: confidence high on queue order, sort keys and the render loop (read in full: renderqueue.cpp 1-206, renderqueue.h 1-85, renderman.cpp 1-112; graphics.cpp 974-999 and 1222-1250; modelnode.cpp 890-915; renderable.cpp 100-159; shadermaterial.cpp 262-290; textureatlasfile.cpp 1-113; model_witcher.cpp 336-346 and dragonage modelloader.cpp 40-50 as fold-ins; jade.cpp 210-220). Medium on the transparent-order defect: the depth-mask state of transparent materials was not fully read (a grep of `src/graphics` for `glDepthMask` found only the GUI paths and `restoreGLState`). Not read: `Mesh::render` and `renderBind`, the `ShaderSurface` and `ShaderMaterial` bind functions, `Queueable` operator< (the QueueMan comparator), and the legacy fixed-function pass in `graphics.cpp` near 1083-1106 (trigger not checked). Callers: `RenderMan.queueRenderable` is called from `modelnode.cpp` 906 and 911 and `model.cpp` 734 (grep); I read only the modelnode.cpp caller. Camera scope: not a camera cell.

Best transferable idea: queue each frame's draws, sort the opaque ones by state so the GPU changes program, material and mesh the fewest times, and draw transparent ones far to near.
Decision (proposed): adapt — the state-sort shape is worth keeping for zones with many props, but the donor's depth order for transparent items and its surface-blind sort are wrong for us, so the sketch fixes both; a duel has at most MAX_ATTACKERS = 3 attackers, so most of the gain is in zone views, not the fight.
Acceptance: a client unit test on the draw-queue module asserts that transparent items come out far to near and that opaque items sharing a mesh and material are contiguous; in a zone scene at 375 wide the frame log shows program switches and mesh binds below the unsorted count.

## 1. Mechanism

- Each frame, every visible renderable is queued (`RenderMan.queueRenderable`) into one of five queues. Routing (renderman.cpp 53-71): a decal-flag material goes to the decal queue; a transparent material goes to transparent primary or secondary (transparent-B flag). Otherwise an OPAQUE material goes to solid primary (64), and a non-opaque item goes to solid secondary when its vertex count is above 6 (66-67) or to the solid decal queue when it is 6 or fewer (68-69).
- Frame order (graphics.cpp 1227-1241): lock the visible world list (1227); `buildNewTextures` uploads queued shaders and textures (974-999); `RenderMan.clear`; queue every visible object in reverse list order via `queueRender`; `RenderMan.sort` (1240); `RenderMan.render` (1241).
- Sort (renderman.cpp 74-92). Normal hint: the three solid queues sort by shader (`sortShader`), the two transparent queues sort by depth (`sortDepth`). Hint ALLDEPTH (set by the Jade engine, jade.cpp 217): every queue sorts by depth.
- Shader key (renderqueue.cpp 38-51): program first, then material, then mesh pointer. Surface is not in the key (49-50, comment says so). Depth key (53-56): squared distance from the camera reference, computed at queue time (78-79). The mesh-overload adds the mesh centre (76); the renderable-overload does not (86-87).
- Render (renderqueue.cpp 104-190), queues drawn in the order primary, secondary, decal, transparent primary, transparent secondary (renderman.cpp 95-99). Walk the sorted list. On a program change: `glUseProgram` (120), then unbind the old surface and material. On a material change: unbind old, bind new. On a surface change: unbind old, bind new. Then `renderBind` once for the run (155). The first node is drawn (166). Each following node with the same mesh, material and surface (169-171) gets its object transform rebound (172), its bone uniforms and fade alpha, and is drawn again (175). `renderUnbind` ends the run (179).
- So the "batching" here is state grouping only. There is no instancing: one draw call per object. The sort saves program, material, surface and VAO changes, not draw calls.
- Culling: none on this path. "Visible" means membership in a visible queue toggled by `show()` and `hide()` (renderable.cpp 106-107, 114-121, 123-125). The donor's own note in `modelnode.cpp` 900 says a camera visibility check is wanted and is not there. A grep of `src/graphics` for frustum, cull and batch found only cull-face state (graphics.cpp 93-94, 443-480) and comments.
- Frame pacing: `buildNewTextures` rebuilds every queued shader and texture in one pass with no count cap (974-999; the texture loop is at 994-995). Opposite side of the same trade: `modelnode.cpp` 893-897 calls `buildMaterial()` even for a node that is not visible, with the comment "to prevent stutter when things are first brought into view" (the donor's own rationale, which I did not measure).
- Terrain, foliage, water and weather: a grep of `src/graphics` for foliage, grass, weather, rain and snow found no hits; the only hits are script-binding files in `src/engines/nwn` and `src/engines/witcher` (not read). So no implementation of those topics was found in this snapshot.
- LOD (fold-in, static, not distance based): `model_witcher.cpp` 343-345 renders a node only if its min LOD is 0 or it is not LODing. `dragonage/modelloader.cpp` 43-47 loads the `_0` (highest) model file if the base name is missing. A case-insensitive grep for LOD terms was capped at 20 lines, so I cannot say there is no distance LOD elsewhere; none appeared in the lines seen.
- Atlas (the hinted file): `textureatlasfile.cpp` parses an XML atlas (Dragon Age) and stores, per source texture name, the sheet file (`.dds` suffix removed), then x, y, w and h from a four-value `OffsetAndScale` attribute (96-108). `getAtlasTexture` throws if the name is missing (52-55). No caller of `getAtlasTexture` or `isAtlasTexture` exists in `src/` (grep), so this index is unused in this snapshot.

## 2. Key functions

- `RenderQueue::queueItem` (renderable overload): `renderqueue.cpp` 82-90.
- `compareShader`: `renderqueue.cpp` 38-51. `compareDepth`: 53-56.
- `RenderQueue::sortShader` 92-96; `RenderQueue::sortDepth` 98-102; `RenderQueue::render` 104-190.
- `RenderManager::queueRenderable` 53-72; `RenderManager::sort` 74-92; `RenderManager::render` 94-100 (`renderman.cpp`).
- Frame loop: `graphics.cpp` 1222-1241. Texture rebuild: `graphics.cpp` 974-999.
- Per-node queueing and the no-visibility-check @todo: `modelnode.cpp` 893-906.
- Visible membership: `renderable.cpp` 106-125.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Sort opaque draws by state (program, then material, then mesh), so equal state runs are contiguous | No numbers; the key order is the mechanism (renderqueue.cpp 40-49) |
| Split the opaque set into decal and secondary by vertex count | Threshold 6 vertices: decal when 6 or fewer (renderman.cpp 66-69) |
| Depth key = squared distance to the camera | No scale; key is the squared length (renderqueue.cpp 78-79) |
| Pre-allocate the queue | 1000 nodes default (renderqueue.h 58); the reserve call is commented out (renderqueue.cpp 59) |
| Per-frame upload budget | None in the donor: every queued texture is rebuilt in one frame (graphics.cpp 994-995) |
| Static LOD by file or node flag | Min LOD above 0 is hidden (model_witcher.cpp 344); `_0` file preferred (dragonage modelloader.cpp 47) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's state sort key order (program, material, mesh) and its one-draw-per-object shape, and counts the state changes a draw list would cause. It changes two things on purpose: the surface is part of the key (the donor leaves it out), and transparent items go far to near (the donor sorts them nearest first). It omits the five-queue routing (decal, secondary, OPAQUE flag), the mesh-centre offset on depth, the VAO bind and unbind, bone uniforms, fade alpha, the GL state bind and unbind, and the render loop itself. `takeUploads` is not donor code: it is the fix for the donor's unbounded texture rebuild.

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface Item {
  program: number;
  material: number;
  mesh: number;
  surface: number;
  transparent: boolean;
  distSq: number;     // squared distance from the camera, computed when queued
  alpha: number;
}

// Opaque order: fewest state changes first (program, then material, then mesh, then surface).
// Fix over the donor: surface is part of the key, and the comparator is a strict total order.
function stateCmp(a: Item, b: Item): number {
  if (a.program !== b.program) return a.program - b.program;
  if (a.material !== b.material) return a.material - b.material;
  if (a.mesh !== b.mesh) return a.mesh - b.mesh;
  return a.surface - b.surface;
}

// Opaque items in state order; transparent items far to near (fix: the donor sorts them nearest first).
export function orderQueue(items: Item[]): { opaque: Item[]; transparent: Item[] } {
  const opaque = items.filter((i) => !i.transparent).sort(stateCmp);
  const transparent = items.filter((i) => i.transparent).sort((a, b) => b.distSq - a.distSq);
  return { opaque, transparent };
}

// Counts the state changes a draw list would cause. The donor draws one call per item (no instancing).
export function countChanges(list: Item[]): { programSwitches: number; meshBinds: number; draws: number } {
  let programSwitches = 0;
  let meshBinds = 0;
  let prog = -1;
  let mesh = -1;
  let surf = -1;
  for (const it of list) {
    if (it.program !== prog) { prog = it.program; programSwitches++; }
    if (it.mesh !== mesh || it.surface !== surf) { mesh = it.mesh; surf = it.surface; meshBinds++; }
  }
  return { programSwitches, meshBinds, draws: list.length };
}

// Frame-pacing budget (fix: the donor uploads every queued texture in one frame, with no cap).
export function takeUploads<T>(pending: T[], perFrame: number): { now: T[]; later: T[] } {
  return { now: pending.slice(0, perFrame), later: pending.slice(perFrame) };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (run on the sketch file with `export {}`).

## 5. Lands in

- TARGET `origins/client/draw-queue.ts` (proposed path, not checked against the repo): a client-only draw queue for zone and Pit views. The engine does not read it.
- Parity-checklist row 16 (colour grade and quality). The hint said row 12, but row 12 is combat sound cues and no row in the addendum covers renderer cost; Lead to confirm the row.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: Frankendom one-engine rule (the queue is client render only and touches no engine state, so kills, ledger and server tick are unaffected); rule 2 (judge the idea, not the genre)

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism.
- Draw counts are small in a duel (MAX_ATTACKERS = 3), so the gain is mostly zone props and foliage. The donor has no timings, so the gain on a phone is not measured here.
- The donor's surface-blind sort can cause repeated `renderBind` and `renderUnbind` when one mesh has several surfaces (renderqueue.cpp 49-50, 155, 169, 179). Fix: put surface in the key.
- Transparent order is nearest first with depth writes on, as far as the code read shows (renderqueue.cpp 54, 80; shadermaterial.cpp 283). Far transparent surfaces behind near ones can fail the depth test. Fix: sort far to near or turn depth writes off for transparent items. Not checked: the transparent material's own state.
- `compareDepth` uses `<=`, which is not a strict weak ordering (renderqueue.cpp 54, used by std::sort at 100). Standard C++ requires strict weak ordering for std::sort; with equal keys the result is undefined, and in practice can read past the range. Fix: use `<`.
- The depth reference differs between the two `queueItem` overloads (renderqueue.cpp 76 vs 87). Fix: one reference rule.
- No culling before queueing (modelnode.cpp 900). Our zones need a camera-frustum or distance cull, with the cull distance as zone data.
- `buildNewTextures` has no per-frame cap (graphics.cpp 974-999). Fix: `takeUploads` with a per-device budget (engine constant per quality tier, proposed).
- Renderable::show re-sorts the whole visible list on every show (renderable.cpp 117-118). Fix: insert in order, or sort once per frame.
- Idea not in the donor: group the same mesh and material with different transforms into one instanced draw. That is what would cut draw calls, which this donor does not do.

Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
Brief rule served: Frankendom one-engine rule (client render only); rule 2 of the addendum (judge the idea)
