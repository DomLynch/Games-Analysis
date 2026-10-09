# Warzone2100-warzone2100 (rendering-performance, cell 17)

Donor: /mnt/frankendom-donors/Warzone2100-warzone2100/lib/ivis_opengl/piedraw.cpp | Licence: GPL-2.0-or-later per piedraw.cpp header | C++ | symbol InstancedMeshRenderer::initialize

## 1. Mechanism

- Groups 3D shape draws into GPU instanced draws. Each call to `Draw3DShape` for one piece of a shape (one "pie") in one frame is not drawn at once. It is appended as one per-instance record (`GenerateInstanceData`, built at queue time: frame, colour, team colour, flags, model matrix, stretch; line 552) to a batch keyed by `templatedState` (shader component, lit or unlit and instanced or not; the shape; the pie flags; line 1296). Lit versus unlit is decided from the flags at lines 1269-1292.
- Four batch sets (members at lines 1105-1108): opaque (a hash map, so no defined order), translucent, translucent with no depth write, and additive (these three keep first-insertion order of the key, via `InsertionOrderMap`, line 970). Additive takes `pie_ADDITIVE` or `pie_PREMULTIPLIED`; translucent splits on `pie_NODEPTHWRITE` (lines 1329-1359). Each set holds one list per state key. Nothing here sorts translucent batches by depth. Opaque shapes flagged as shadow casters are also queued for the stencil-shadow fallback path (lines 1362-1387).
- `FinalizeInstances` runs once per frame after all shapes are submitted. It concatenates the batches into one instance array and records one draw call per batch: the state, the instance count and the start index in that array. Only the opaque set skips an empty batch (a batch kept from an earlier frame that nothing drew into this time); the translucent, no-depth-write and additive sets record every batch they hold, even with a zero count. It then advances to the next instance buffer (wrapping) and uploads the array (lines 1651-1657). Batch order is fixed: opaque, translucent, translucent no-depth-write, additive, with the start index of each group stored for the draw pass.
- Drawing: `Draw3DShapes_Instanced` (lines 1914-2011) walks the recorded calls group by group, selected by a `drawParts` mask (opaque/shadow-casting, old stencil shadows, translucent, additive). The shadow-map pass skips opaque calls whose flags lack the shadow bits (line 1930). Each call goes through `pie_Draw3DShape2_Instanced` (1858-1912), which picks the pipeline from the flags and the depth-pass mode and issues one instanced draw reading from the current instance buffer at the call's byte offset. The buffers are rotated over frames in flight (one more than the frames in flight).
- Fallback: `initialize` turns instancing off unless the device reports instanced support and has enough vertex attributes and 48 vertex output components (`canInstancedMeshRendererUseInstancedRendering`, lines 936-967). Shapes are then kept as `SHAPE` records and drawn one at a time by `Draw3DShapes_Old` (line 2013 onward); the opaque list is first sorted with `less_than_shape` to reduce state changes (line 2020). The rest of that function was not read.
- `clear` keeps the batch vectors and their capacity between frames. Every `batchCompactionIntervalFrames` (600 frames, line 1117) it erases opaque batches that were empty (not drawn into during the previous frame) and compacts the other three sets; otherwise it just empties the opaque vectors. It also resets the per-frame counters and shape lists (lines 1226-1235).
- Inputs: shapes, frame index, colours, flags, model matrices. Output: GPU draw calls only.

## 2. Key functions

- `InstancedMeshRenderer::initialize`, `/mnt/frankendom-donors/Warzone2100-warzone2100/lib/ivis_opengl/piedraw.cpp`, lines 1161-1178. Calls `reset`, checks device support, creates `maxFramesInFlight() + 1` stream-draw instance buffers.
- `InstancedMeshRenderer::Draw3DShape`, same file, lines 1267-1403 (batch push at 1329-1399). Chooses the state, builds per-instance data, appends to the batch for the opacity class (additive, translucent, translucent no-depth-write, or opaque).
- `InstancedMeshRenderer::clear`, same file, lines 1180-1236. Keeps capacity; every 600 frames drops unused opaque batches and compacts the ordered sets.
- `InstancedMeshRenderer::FinalizeInstances`, same file, lines 1590-1662. Concatenates batches into the instance array and records one draw call per batch.
- `Draw3DShapes_Instanced`, same file, lines 1914-2011, and `pie_Draw3DShape2_Instanced`, lines 1858-1912. One instanced draw per recorded call, with the buffer offset; group order opaque, translucent, translucent no-depth-write, additive.
- `GenerateInstanceData` (line 552), `InsertionOrderMap` (line 970) and the member declarations (1100-1147): read for the fields cited above; the bodies of `GenerateInstanceData` and the `InsertionOrderMap` internals were not read.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Batch per-instance records by state key, one draw per batch | State key from shader component, shape and pie flags (theirs; line 1296) |
| Concatenate batches into one array and record offset and count | Batch order: opaque, translucent, no-depth-write, additive (theirs; only opaque skips empties, lines 1608-1649) |
| Rotate instance buffers across frames in flight (count plus one) | Frames in flight from the GPU API (theirs) |
| Keep batch capacity; compact unused batches on a schedule | Compaction interval 600 frames (theirs; line 1117) |

## 4. TypeScript sketch

simplified: omits the lit/unlit and flag-based set choice (the caller picks `setIdx`), the shadow-caster side list, depth-pass modes and the `drawParts` mask, the buffer rotation and upload, the 600-frame compaction in `clear` (the sketch only empties lists), and the non-instanced sort. The sketch's opaque set is an insertion-ordered `Map`; the donor's opaque set is an unordered hash map.

```ts
// Licence: GPL-2 - clean-room sketch, no lines translated
// Clean-room: per-instance records batched by state key, concatenated once per frame, then one draw per batch.
type Inst = { frame: number; colour: number; transform: number[] };
type Batch = { key: string; instances: Inst[] };

// Four sets in draw order: opaque, translucent, translucent no-depth-write, additive. Each maps state key -> records.
const sets: Map<string, Inst[]>[] = [new Map(), new Map(), new Map(), new Map()];
let useInstancing = true;

// Submit one shape piece: record it under its state key, or keep it for the fallback.
function submit(setIdx: number, key: string, inst: Inst, fallback: Inst[]): void {
  if (!useInstancing) { fallback.push(inst); return; }
  const list = sets[setIdx].get(key) ?? [];
  list.push(inst);
  sets[setIdx].set(key, list);
}

// Once per frame: concatenate the batches and record one draw per batch. Only the opaque set (index 0) skips empty batches.
function finalize(): { data: Inst[]; calls: { key: string; count: number; start: number }[] } {
  const data: Inst[] = [];
  const calls: { key: string; count: number; start: number }[] = [];
  sets.forEach((set, setIdx) => {
    for (const [key, list] of set) {
      if (setIdx === 0 && list.length === 0) continue;
      calls.push({ key, count: list.length, start: data.length });
      data.push(...list);
    }
  });
  return { data, calls };
}

// Start of frame: empty each batch but keep its capacity, as the donor keeps vector capacity.
function clear(): void {
  for (const set of sets) for (const list of set.values()) list.length = 0;
}
```

## 5. Lands in

- Frankendom target: new `src/fight/creature-render.ts` (instanced draw batches for repeated creature actors and props). Parity row 7 (creature actor / clips; today the origins own copy, K3 moves it into `src/fight/`); row 6 for the hero actor (no instancing needed for one hero).
- Today: no Frankendom module yet (later phase); the Frankendom side was not searched in this pass.
- Feature-map section: rendering performance for crowds and repeated props.
- Reuse tag: rewrite-from-idea (GPL-2, clean-room sketch only).
- Brief rule served: (category default, not per-cell) 3 (warm up at zone entry); rules 7-9 n/a

## 6. Gaps and risks

- Instancing is a client render detail. It must not hold any fight state; the instance data comes from `src/fight` state read at draw time (one engine, zones as data: zone props arrive as catalogue rows).
- Fights hold MAX_ATTACKERS = 3, so instancing pays off for zone crowds and scenery, not for the duelling actors.
- The donor relies on a GPU instancing check at start-up. Frankendom needs a fallback path tested in the release rows, or it will be untested on weak devices.
- Batch order and the translucency split are donor rules tied to its shader; Frankendom must keep only the parts it needs.
- The compaction schedule (600 frames) is a donor tuning value; keep it as data if it is ever set per zone. Zone entry could simply clear everything (brief rule 3).
- Translucent batches are drawn in first-use order of the state key, not depth order; correct blending for overlapping translucent creatures would need extra work the donor does not do.
- Nothing here affects kill or hit authority.
