# 0ad-0ad (rendering-performance, cell 17)

Donor: /mnt/frankendom-donors/0ad-0ad/source/renderer/InstancingModelRenderer.cpp | Licence: GPL-2 | C++ and JS | symbol InstancingModelRenderer.RenderModel

## 1. Mechanism

- Per-frame model draw. `ShaderModelRenderer::Render` (ModelRenderer.cpp 359-768) first groups models by material, looks up each material's shader technique, and sorts opaque models by model definition, then diffuse texture, then static uniforms (`SMRBatchModel`, lines 281-297, applied at line 517). Technique buckets are then sorted by technique (line 529). Techniques flagged sort-by-distance (alpha-blended) instead go to a back-to-front list (greater view-space Z first, lines 488-508, 541-543) with no regrouping, so their batching only survives where neighbours happen to share state. The draw loop (lines 582-766) walks the technique buckets, begins a pass per technique pass, and rebinds only on change: per-sampler textures (compared by pointer), the model definition (pointer compare, line 692), and the static uniforms (value compare, line 700). A per-model draw then follows.
- Inputs: the visible model list (each with its model definition, material, textures, and current bone matrices), the shader, and the device command context.
- `PrepareModelDef` runs when the model definition changes; it binds the shared vertex and index buffers for that definition. The vertex data is uploaded once when the definition is created and never updated per frame.
- `RenderModel` runs once per model. For GPU skinning it uploads the current bone matrices (the animated pose, plus the root bone), then issues one indexed draw covering all faces of that model's definition, and bumps the draw and triangle stats.
- Note the name: `InstancingModelRenderer` does not issue GPU instanced draws. Each model is its own draw call; the saving is shared buffers and fewer state changes.
- Output: draw calls only. No simulation state changes.

## 2. Key functions

- `InstancingModelRenderer::RenderModel`, `/mnt/frankendom-donors/0ad-0ad/source/renderer/InstancingModelRenderer.cpp`, lines 371-397. Bone upload for GPU skinning, one indexed draw, stats.
- `InstancingModelRenderer::PrepareModelDef`, same file, lines 351-367. Binds the layout, index buffer and vertex offset for a definition.
- `InstancingModelRenderer::UploadModelData`, same file, lines 343-348. Empty: data uploaded once at creation.
- `ShaderModelRenderer::Render` (caller), `/mnt/frankendom-donors/0ad-0ad/source/renderer/ModelRenderer.cpp`, lines 359-768: bucketing and sorting (380-580), then the draw loop (582-766). Per model: bind samplers when the texture pointer changes, `PrepareModelDef` when the definition changes (692-696), static uniforms when they change (700-704), per-material render queries (time, water texture, sky cube, bound once per pass), `modifier->PrepareModel` (755), then `RenderModel` (760).
- Sort comparator `SMRBatchModel`, same file, lines 281-297 (definition, then diffuse texture, then static uniforms). A source TODO (lines 513-516) says only the base texture is sorted, not all samplers.
- `InstancingModelRenderer::CreateModelData`, `/mnt/frankendom-donors/0ad-0ad/source/renderer/InstancingModelRenderer.cpp`, lines 318-337. Builds the per-definition `IModelDef` (constructor at line 60) once and caches it on the definition; there is no per-model data.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Sort draws so that state changes only when the key changes (definition, then diffuse texture, then static uniforms; ModelRenderer.cpp 281-297) | Sort keys are the engine's definition, texture and uniform objects, compared by pointer or value (theirs) |
| One shared vertex and index buffer per model definition, uploaded once | Per-definition buffer layout (theirs) |
| Bone matrices uploaded per model for GPU skinning | Bone count plus one root bone (theirs; `GetNumBones() + 1`, InstancingModelRenderer.cpp 379-385) |
| One indexed draw per model, with draw and triangle stats | Stat names `m_DrawCalls`, `m_ModelTris` (theirs; lines 395-396); the draw takes `faces * 3` indices |

## 4. TypeScript sketch

simplified: omits technique and pass grouping, the back-to-front list for alpha-blended models, per-sampler texture slots (one texture key here), per-material render queries, and the pointer-versus-value compares. Sort order follows the donor (definition, texture, uniforms); the bind order in the loop is texture, definition, uniforms, as in the donor.

```ts
// Licence: GPL-2 - clean-room sketch, no lines translated
// Clean-room: a sorted draw walk that binds state only on change, one indexed draw per model, and bone upload for skinning.
type Model = { defKey: string; texKey: string; uniformKey: string; faces: number; bones: Float32Array };
type Ctx = { bindDef(key: string): void; bindTex(key: string): void; bindUniforms(key: string): void;
             uploadBones(b: Float32Array): void; drawIndexed(faces: number): void };

// Sort by state keys so that binds happen only when a key changes.
function sortModels(models: Model[]): Model[] {
  return [...models].sort((a, b) =>
    a.defKey.localeCompare(b.defKey) || a.texKey.localeCompare(b.texKey) || a.uniformKey.localeCompare(b.uniformKey));
}

// Walk the sorted list; each model gets one indexed draw, with bones uploaded first.
function drawAll(models: Model[], ctx: Ctx): { draws: number; tris: number } {
  let curTex = '', curDef = '', curUni = '';
  let draws = 0, tris = 0;
  for (const m of sortModels(models)) {
    if (m.texKey !== curTex) { ctx.bindTex(m.texKey); curTex = m.texKey; }
    if (m.defKey !== curDef) { ctx.bindDef(m.defKey); curDef = m.defKey; }
    if (m.uniformKey !== curUni) { ctx.bindUniforms(m.uniformKey); curUni = m.uniformKey; }
    ctx.uploadBones(m.bones);
    ctx.drawIndexed(m.faces);
    draws++;
    tris += m.faces;
  }
  return { draws, tris };
}
```

## 5. Lands in

- Frankendom target: new `src/fight/creature-render.ts` (state-sorted draw walk for many creatures in one fight). Parity row 7 (creature actor / clips; today the origins own copy, K3 moves it into `src/fight/`); the hero draw is row 6. Feature-map section: rendering performance.
- Today: no Frankendom module yet (later phase).
- Reuse tag: rewrite-from-idea (GPL-2, clean-room sketch only). Note the sort-and-bind-on-change shape is generic; the donor's name is misleading.
- Brief rule served: (category default, not per-cell) 3 (warm up at zone entry); rules 7-9 n/a

## 6. Gaps and risks

- The donor does not merge models into one draw call: each model is one draw call (RenderModel, line 392). For Frankendom's fights (MAX_ATTACKERS = 3, so at most about four actors in a fight) draw count is small and sorting buys little; a true instanced path only matters for crowds in zone scenery.
- Bone upload is per model every frame. Animated crowds will be costly; the donor does not cache poses.
- The sketch sorts strings; the donor sorts by engine objects (pointers and a uniform struct compare). The keys must be stable across frames.
- No draw-distance or culling in the files read; `m->submissions[cullGroup]` (ModelRenderer.cpp 361) is filled by code not read.
- Nothing here touches fight state or kill authority. Under the one-engine ruling the renderer reads sim state and never writes it; zone content stays data (a draw list built from the zone catalogue).
