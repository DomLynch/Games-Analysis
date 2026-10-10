# 0ad-0ad (rendering-performance, cell 17)

Donor: `/mnt/frankendom-donors/0ad-0ad/source/renderer/InstancingModelRenderer.cpp` (with `renderer/ModelRenderer.cpp`, `maths/Frustum.cpp`, `graphics/GameView.cpp`, `simulation2/components/CCmpUnitRenderer.cpp`) | Licence: GPL-2.0-or-later (InstancingModelRenderer.cpp header: "either version 2 of the License, or (at your option) any later version"; the donor root has license_gpl-2.0.txt) | C++ | symbol `InstancingModelRenderer` / `ShaderModelRenderer::Render` / `CCmpUnitRenderer::RenderSubmit`

Checked: `InstancingModelRenderer.cpp` (1-397) read in full. `ShaderModelRenderer::Render` (ModelRenderer.cpp 281-297 comparator, 359-420 comment and setup, 517-529 sorts, 575-760 render loop) read. `Frustum.cpp` 105-156 read. `CGameView::EnumerateObjects` (GameView.cpp 257-285) read. `CCmpUnitRenderer::RenderSubmit` (CCmpUnitRenderer.cpp 384-443) read. `CSceneRenderer::PrepareScene` submit (SceneRenderer.cpp 1064-1099) read. Callers: grep over the whole donor finds only ModelRenderer.cpp 695 and 760 calling `PrepareModelDef` and `RenderModel`. The unit submit (`RenderSubmit`) is called from the scene enumeration; I read the scene side at 1073 and did not trace every caller of `CSimulation2::RenderSubmit`. Not read: `ModelRenderer::GenTangents` and `BuildIndices` bodies, `WeldMesh` (third_party), `UpdateVisibility` body (CCmpUnitRenderer.cpp 445+), shader/modifier code, `RenderingOptions.cpp` (only the header top was read). Confidence high on the batching and culling order; medium on the LOS visibility path (not read). Searched donor for per-model LOD (no hit in renderer or graphics) and found one LOD comment (PatchRData.h).

## 1. Mechanism

- Two different things share the name "instancing" in this donor. The class `InstancingModelRenderer` does not use GPU instancing: each model is one indexed draw (RenderModel, InstancingModelRenderer.cpp 388-395). What it shares is the mesh: one `IModelDef` per model definition and per renderer, holding the vertex and index buffers (cache lookup 318-332; `new IModelDef` at 330 and `SetRenderData` at 331). Per-model render data is just a key (334). Vertex and index data are uploaded in the constructor (`m_Array.Upload()` at 178 and 232; comment at 347 "Data uploaded once during creation as we don't update it dynamically.").
- The batching is in `ShaderModelRenderer::Render`. Models are bucketed by material (effect plus defines). Each bucket is sorted by a three-part key: CModelDef, then diffuse texture, then static uniforms (SMRBatchModel, 281-297, applied at 517). Buckets are then sorted by technique (528-529), so models that share a technique render together.
- Alpha-blended models are the exception. They are sorted back-to-front by distance (303-304) and only batched while that order is kept (389-391). Non-alpha models may be reordered to batch (391).
- Order of steps in the loop (575-760): for each technique run, for each pass, for each model: (a) bind a sampler only if its texture differs from the last one bound for that slot (680-687); (b) call `PrepareModelDef` only when the model definition differs from the last one (691-696); (c) bind static uniforms only when they differ (699-704); (d) call `RenderModel` (760), which issues one `DrawIndexedInRange` (InstancingModelRenderer.cpp 391-392) and increments the draw-call counter (395). The "last" values are kept across definition switches, so a uniform set that repeats is not rebound.
- Culling is per unit and in two stages. In `CCmpUnitRenderer::RenderSubmit` (384-439): a unit whose visibility is marked dirty has it recomputed (403-404), then LOS-hidden units are skipped (406); stage 1 is a sphere test on the swept bounds (415), which runs before any transform; the unit's transform is computed once per frame using a frame counter cache (422-433); stage 2 is an exact box test on the world bounds (435); only units that pass both are submitted (438).
- Frustum test: sphere (`IsSphereVisible`, Frustum.cpp 105-116) is a per-plane test for "fully behind"; box (`IsBoxVisible(bounds)`, 140-156) tests only the far corner along each plane normal (147-151). Terrain patches use the box test once per patch (GameView.cpp 267-281, flag `m->Culling` at 278).
- Scene enumeration passes the view frustum (SceneRenderer.cpp 1069-1073) and a separate frustum per shadow cascade (1093-1098).
- Model skinning: a definition may have at most 64 bones including the root (IModelDef, InstancingModelRenderer.cpp 84-86), with a comment that 32 is recommended because bones "cost uniform memory" (81-82). Skin weights are stored as bytes scaled by 255 (227). Indices are u16 (184).
- No per-model LOD is found. The one LOD note is a comment in PatchRData.h (199-203): the water cell size is a compiled constant of 1 "until/if dynamic water LOD is offered".

## 2. Key functions

- `ShaderModelRenderer::Render`: `/mnt/frankendom-donors/0ad-0ad/source/renderer/ModelRenderer.cpp` 359-760 (bucket, sort, bind-on-change loop).
- `SMRBatchModel::operator()`: same file, 281-297 (the sort key order).
- `IModelDef::IModelDef` and `InstancingModelRenderer::CreateModelData`: `/mnt/frankendom-donors/0ad-0ad/source/renderer/InstancingModelRenderer.cpp` 60-286 and 318-335.
- `InstancingModelRenderer::PrepareModelDef` and `RenderModel`: same file, 351-367 and 371-397.
- `CCmpUnitRenderer::RenderSubmit`: `/mnt/frankendom-donors/0ad-0ad/source/simulation2/components/CCmpUnitRenderer.cpp` 384-443 (two-stage cull per unit).
- `CFrustum::IsSphereVisible` and `CFrustum::IsBoxVisible(bounds)`: `/mnt/frankendom-donors/0ad-0ad/source/maths/Frustum.cpp` 105-116 and 140-156.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Share one GPU mesh per definition; per-instance object holds no buffers | None (cache keyed by definition and renderer; InstancingModelRenderer.cpp 321-331) |
| Sort by definition, then texture, then uniforms; bind only on change | Key order fixed by SMRBatchModel (281-297); no numbers |
| Re-bind a definition only when it switches | None (ModelRenderer.cpp 692-695) |
| Sphere test before box test, transform only after the sphere passes | None (CCmpUnitRenderer.cpp 415 then 422 then 435) |
| Far-corner box test | None (Frustum.cpp 147-151) |
| Bone budget | At most 64 bones including root (84-86); 32 recommended (82) |
| Skin weight precision | 255 steps, stored as bytes (227) |
| Index width | u16 (184). Derived, not run: one definition can address at most 65,536 vertices with u16 indices |
| Water patch cell size | 1 (PatchRData.h 203), compiled constant |

The donor has no draw-call budget, no frame budget, and no per-zone quality numbers in the files read.

Sketch test (run on the VPS): six models over two definitions, two textures and two uniform keys, one hidden model and one model outside the frustum. Output: `def1 tex5 unia draw2 draw6 def2 tex7 draw1 unib draw3` and `{"draws":4,"defBinds":2,"texBinds":2,"uniBinds":2,"culledStage1":1,"culledStage2":0}`. The uniform key `a` is not rebound when the definition switches, which matches the donor's cache across definition switches (ModelRenderer.cpp 639-640 and 699-703).

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (sphere cull, then box cull, then sort by definition, texture and uniforms, then bind only on change and draw). It replaces pointer-order sorting with integer ids, uses a closure for the lazy world box instead of the frame-counter transform cache, and drops the material and effect buckets, technique sort, alpha-blend distance ordering, sampler and render-query bindings, skinning uniforms, the LOS visibility dirty flag, and the per-model modifier. The sink stands in for the GL device context. The clean-room note: GPL-2.0-or-later donor; this is written from the described mechanism, not a translation.

```ts
// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Vec3 = { x: number; y: number; z: number };
type Sphere = { c: Vec3; r: number };
type Box = { min: Vec3; max: Vec3 };
type Plane = { n: Vec3; d: number }; // inside when n.p + d >= 0
type Frustum = { planes: Plane[] };

interface Model {
  id: number;
  defId: number;       // one shared mesh per model definition
  texId: number;       // diffuse texture
  uniformKey: string;  // static uniforms, as a comparable key
  visible: boolean;    // gameplay visibility (line of sight), client-side
  sphere: Sphere;      // stage 1 bound (swept bounds in the donor)
  worldBox: () => Box; // stage 2 bound, computed lazily after stage 1 passes
}

function sphereVisible(f: Frustum, s: Sphere): boolean {
  for (const p of f.planes) {
    const dist = p.n.x * s.c.x + p.n.y * s.c.y + p.n.z * s.c.z + p.d;
    if (dist < -s.r) return false; // whole sphere is behind this plane
  }
  return true;
}

function boxVisible(f: Frustum, b: Box): boolean {
  for (const p of f.planes) {
    // farthest corner along the plane normal
    const x = p.n.x > 0 ? b.max.x : b.min.x;
    const y = p.n.y > 0 ? b.max.y : b.min.y;
    const z = p.n.z > 0 ? b.max.z : b.min.z;
    if (p.n.x * x + p.n.y * y + p.n.z * z + p.d < 0) return false;
  }
  return true;
}

interface Sink {
  setDef(defId: number): void;
  setTexture(texId: number): void;
  setUniforms(key: string): void;
  drawModel(m: Model): void;
}

interface SubmitStats { draws: number; defBinds: number; texBinds: number; uniBinds: number; culledStage1: number; culledStage2: number }

function submit(models: Model[], f: Frustum, sink: Sink): SubmitStats {
  const stats: SubmitStats = { draws: 0, defBinds: 0, texBinds: 0, uniBinds: 0, culledStage1: 0, culledStage2: 0 };
  const survivors: Model[] = [];
  for (const m of models) {
    if (!m.visible) continue;
    if (!sphereVisible(f, m.sphere)) { stats.culledStage1++; continue; }
    if (!boxVisible(f, m.worldBox())) { stats.culledStage2++; continue; }
    survivors.push(m);
  }
  survivors.sort((a, b) =>
    a.defId - b.defId ||
    a.texId - b.texId ||
    (a.uniformKey < b.uniformKey ? -1 : a.uniformKey > b.uniformKey ? 1 : 0));

  let curDef = -1, curTex = -1, curUni = "";
  for (const m of survivors) {
    if (m.defId !== curDef) { curDef = m.defId; sink.setDef(curDef); stats.defBinds++; }
    if (m.texId !== curTex) { curTex = m.texId; sink.setTexture(curTex); stats.texBinds++; }
    if (m.uniformKey !== curUni) { curUni = m.uniformKey; sink.setUniforms(curUni); stats.uniBinds++; }
    sink.drawModel(m);
    stats.draws++;
  }
  return stats;
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS with `export {}` at the top: exit 0. The test harness (appended on the VPS, not in the work folder) produced the output in section 3.

## 5. Lands in

- TARGET `src/client/render/unit-batch.ts` (new, client-only). The unit culling and submission belong to the client; the engine state is not touched. No `src/fight` module owns rendering, so this is a named exception to the brief's path rule.
- Parity row 16 (colour grade/quality). Plainly: no row 1-23 is a render-cost row. Row 16 is the closest because it is the quality row, and this mechanism is a performance fit, not a colour fit.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (client-only rendering; the engine decides who is in the fight, the client only draws them); rules 7-9 n/a

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism; do not copy the C++.
- The donor's class name says "instancing" but it issues one draw per model. Do not cite this file for GPU instancing. If Frankendom later needs many identical units in one draw, that is a separate design (Three.js `InstancedMesh` from general knowledge, not checked against the pinned Three.js version in this pass).
- Frankendom is Three.js. Its scene graph and material system already group by material; the parts worth taking are the cull order (sphere, then box, transform only after the sphere passes) and the rule that a definition is bound only when it changes. Sort-by-pointer in the donor is not a design to copy.
- Visibility: the donor hides units by line-of-sight state on the client. Frankendom's rulings say the client draws and never decides state, so visibility must come from server-applied state, not a client guess. The donor is not a model for that.
- Crowds: Frankendom's fight is capped at MAX_ATTACKERS = 3, so a crowd is a zone-level concern (zones are data), not a duel one. The sketch's gain only matters when many units are on screen; measure before adopting.
- Bone budget: the donor caps a model at 64 bones and recommends 32 because of uniform memory. Any Frankendom character rig should be checked against a phone's uniform limit (not measured here).
- No device measurement was made; no frame timings were taken.

Best transferable idea: cull each unit with a cheap bounding sphere before any transform or exact box test, then sort the survivors by definition, texture and uniforms and rebind state only when it changes.
Decision (proposed): adapt - take the two-stage cull and the bind-on-change order for the zone unit renderer; do not port the per-definition cache as "instancing", since the donor does not instance; keep visibility as server-applied state, not the donor's client LOS flag.
Acceptance: in a zone with 60 or more units in view on a phone, a client test asserts that six models over two definitions bind each definition once (the sketch test gives defBinds 2), and that a unit whose sphere is off screen never reaches the exact box test; players see steady frame time in crowds.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: 1 (client-only rendering; the engine decides who is in the fight, the client only draws them); rules 7-9 n/a
