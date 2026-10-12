# ryzom-ryzomcore (rendering-performance, cell 2)

Donor: `/mnt/frankendom-donors/ryzom-ryzomcore/nel/src/3d/load_balancing_trav.cpp` (with `nel/src/3d/transform_shape.cpp`, `nel/src/3d/mesh_multi_lod_instance.cpp`, `nel/src/3d/mesh_multi_lod.cpp`, `nel/include/nel/misc/value_smoother.h`, client wiring in `ryzom/client/src/init_main_loop.cpp`) | Licence: GNU Affero GPL v3 (root LICENSE, "GNU AFFERO GENERAL PUBLIC LICENSE, Version 3"; NeL file headers "version 3 ... or any later version") | C++ | symbol `CLoadBalancingTrav::traverse`

Checked: Read in full: `load_balancing_trav.cpp` (290 lines) and `load_balancing_trav.h` (209); `transform_shape.cpp` 250-325 (pass 0 and pass 1); `value_smoother.h` (template, float alias at 210); `mesh_multi_lod_instance.cpp` 78-130; `mesh_multi_lod.cpp` 150-175 and 321-366; `init_main_loop.cpp` 643-650; `client_cfg.cpp` 379-380; `scene.cpp` 620-660 (call order); `main_loop.cpp` 526-557. Hint file `bloom_effect.h`: only its licence header was read (bloom is a post-process pass, not this budget mechanism). Not read: `CMeshMRMGeom` / `_LevelDetail.getNumTriangles` (the MRM distance-to-count function, so MRM counts are "(not read)"); the water reflection manager; every other caller of `CScene::render`, so the "second traverse in one frame" path is inferred from `scene.cpp` 654 and `load_balancing_trav.cpp` 174-178, not observed. Fold-in candidates not read in this pass: `landscape_vegetable_block.cpp` (foliage), `cloud_scape.cpp` (weather), `landscape.cpp` (terrain), `clip_trav.cpp` (culling). Confidence: high on the budget ratio, smoother, overshoot guard and LOD slot pick (read end to end). Medium on defect 1 in section 3 (by reading the code paths; not reproduced). camera_scope: n/a.

Best transferable idea: Give each render group a face budget that is shared across the visible models each frame, smooth its ratio over 50 frames with a 10% overshoot guard, and pick LOD slots from a fitted line so a crowd degrades gracefully instead of stalling.
Decision (proposed): adapt - take the per-group budget, the smoother with its overshoot guard, and the slot pick with a floor; change the unit to measured frame time for phones, make the per-model budget a pure function (fix defect 1), and give the target ring its own group; reject any line-by-line port (AGPL, clean-room only).
Acceptance: In a crowd scene with the 3 attackers and a target ring, the triangle total stays within 110% of the wanted count across a 2 s camera sweep at phone width, and the target ring keeps its finest slot on every frame.

## 1. Mechanism

- Where it runs. `CScene::render` calls `LoadBalancingTrav.traverse()` once per call (scene.cpp 654), after the clip (648) and anim-detail (651) traversals and before the light traversal (664).
- Groups and wanted counts. Each group has a wanted triangle count and a balancing mode. A group created without a setting wants 20000 (load_balancing_trav.cpp 53). The client sets the mode to clamp (init_main_loop.cpp 644) and gives the "Skin" group 40000 (645; client_cfg.cpp 379), "Fx" 10000 (646; client_cfg.cpp 380), and "SelectionFx" 10000 (650). The Default group is always off (computeRatioAndSmooth, first lines).
- Once per real frame (load_balancing_trav.cpp 174-178). The adapt step runs only when the scene frame id has changed and the call is not a water-reflection render. The frame id latch (178) stops a second traverse in the same frame from adapting again.
- Order of steps in a frame:
  1. Reset each group's pass-0 total (`_NbFacePass0`, the "asked" count; 186).
  2. Pass 0: each model's distance is `(euclidean + plane) * 0.5` (transform_shape.cpp 289-297), where the plane distance is floored at 0.01 (296). The model's triangle count at that distance (`getNumTriangles`, 301) is added to its group's total (302).
  3. Ratio per group (computeRatioAndSmooth): `wanted / asked` (load_balancing_trav.cpp 77), clamped to at most 1 in clamp mode (86); a NaN or infinity ratio is not added (the FIX comment in computeRatioAndSmooth).
  4. Smoothing: a 50-value window (`NL3D_DEFAULT_LOADBALANCING_VALUE_SMOOTHER`, 33), averaged.
  5. Overshoot guard (107-113): if the smoothed ratio times the asked total is above 1.1 times the wanted count (34), reset the window and set the ratio to the instantaneous ratio times 1.1.
  6. Pass 1 (load_balancing_trav.cpp 213; transform_shape.cpp 321): each model's budget is its triangle count times its group ratio (header line 74). Upscaled models with a Euler or quaternion transform get a larger count first (transform_shape.cpp 311-316).
  7. Each multi-LOD instance then picks a slot (mesh_multi_lod_instance.cpp 109-111) and converts its budget back into a distance (121).
- LOD slots are straight lines fitted at build time. For each slot, slope `A = (endCount - startCount) / (endDist - startDist)` and intercept `B = endCount - A * endDist` (mesh_multi_lod.cpp 169, 172). A slot's triangle count at distance d is `A * d + B` (356).
- Units are triangles (faces), not milliseconds. The donor measures no frame time.

## 2. Key functions

- `CLoadBalancingTrav::traverse`: `/mnt/frankendom-donors/ryzom-ryzomcore/nel/src/3d/load_balancing_trav.cpp` from 159 to its closing brace. Adapt latch (174-178), group reset and pass 0 (186-194), ratio and smoothing per group (204-206), pass 1 (213-214).
- `CLoadBalancingGroup::computeRatioAndSmooth`: same file, from 63. Mode switch (70-89), smoothing and overshoot guard (91-117).
- `CTransformShape::traverseLoadBalancingPass0`: `/mnt/frankendom-donors/ryzom-ryzomcore/nel/src/3d/transform_shape.cpp` 266-302. Distance blend and face count.
- `CTransformShape::traverseLoadBalancingPass1`: same file, 307-321. Upscale factor (311-316) and budget (321).
- `CMeshMultiLodInstance::traverseLoadBalancing`: `/mnt/frankendom-donors/ryzom-ryzomcore/nel/src/3d/mesh_multi_lod_instance.cpp` 81-130. Slot pick and inverse distance.
- `CValueSmootherTemplate<float>`: `/mnt/frankendom-donors/ryzom-ryzomcore/nel/include/nel/misc/value_smoother.h` (ring buffer with running sum, 73-101).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Per-group budget: ratio = wanted / asked, applied to every model in the group | Wanted counts: default 20000 (theirs, load_balancing_trav.cpp 53); Skin 40000 (theirs, client_cfg.cpp 379); Fx 10000 (theirs, client_cfg.cpp 380); SelectionFx 10000 (theirs, init_main_loop.cpp 650) |
| Clamp mode: never draw more than the authored count | `clamp(_FaceRatio, 0, 1)` (theirs, load_balancing_trav.cpp 86) |
| Smoothed ratio over a window | 50 frames (theirs, load_balancing_trav.cpp 33) |
| Overshoot guard: snap to instantaneous times a cap | Cap 1.1 (theirs, load_balancing_trav.cpp 34; test at 107, snap at 112) |
| Distance blend of two metrics (Euclidean and camera-plane) | 50/50 (theirs, transform_shape.cpp 297); plane floor 0.01 (theirs, 296) |
| LOD slot from a fitted line; pick first slot whose far end fits | Slot line A and B fitted at build (theirs, mesh_multi_lod.cpp 169, 172); scan at mesh_multi_lod_instance.cpp 109-111 |

Defects found by reading (keep the idea, fix the defect):

1. Pass 1 writes into its input. transform_shape.cpp 316 sets `_FaceCount` to the scaled value. Only pass 0 resets `_FaceCount` (301), and pass 0 runs only on an adapt frame (transform_shape.cpp 257; load_balancing_trav.cpp 174-178). A second traverse in the same frame, or a reflection render, runs pass 1 on a count that was already scaled, so an upscaled model's budget grows by its factor each time. Not reproduced. Fix: keep `_FaceCount` as the pass-0 count and return the scaled value from a pure `budgetFor` (the sketch does this).
2. Float drift in the smoother. value_smoother.h 79-80 keep a running sum with add and subtract, and 101 divides it. Over a long session the sum can drift from the true window mean. Estimated small; not measured. Fix: recompute the mean over the window each frame (the sketch does this).
3. Zero slope. mesh_multi_lod.cpp 167 sets the slope to 0 when a slot's start and end distances are equal, and mesh_multi_lod_instance.cpp 121 divides by that slope with no check. Fix: guard the inverse (the sketch returns 0 for a zero slope). Rare in practice; by reading only.

Not defects, but design choices to keep knowingly: the 1.1 overshoot allowance, the 50-frame window, and the Default group never balancing.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order (ask per model in pass 0, then ratio, clamp, NaN guard, 50-frame smoothing, 1.1 overshoot guard, then budget per model and slot pick) but fixes the three defects: the mean is recomputed from the window (defect 2), `budgetFor` never writes into its input (defect 1), and `distanceForBudget` guards a zero slope (defect 3). It omits the upscale factor, the Default group, the reflection-pass skip (the caller drives begin and end of frame), the instance wiring, and the MRM path (not read). It is written fresh from the described mechanism (AGPL, clean-room); it is not a translation. Typechecked on the VPS (`tsc --noEmit --strict --target es2020`, exit 0).

```ts
// Licence: GNU AGPL v3 or later (donor). Clean-room: shape only, written fresh from the described mechanism, not a translation.
export const SMOOTH_FRAMES = 50;   // window length for the ratio smoother (shape of the donor's constant)
export const OVERSHOOT_CAP = 1.1;  // a smoothed budget may exceed the wanted count by at most 10%

export type BudgetMode = "off" | "on" | "clamp";

// One face budget per group (client config supplies `wanted`, e.g. skin, effects, selection reticle).
export class FaceBudget {
  private asked = 0;
  private ratio = 1;
  private readonly window: number[] = [];

  constructor(public wanted: number, public mode: BudgetMode = "clamp") {}

  beginFrame(): void {
    this.asked = 0;
  }

  // Pass 0: each model adds its distance-based triangle count.
  ask(triangles: number): void {
    this.asked += triangles;
  }

  // After all asks: derive this frame's ratio and smooth it.
  endFrame(): void {
    if (this.mode === "off") {
      this.ratio = 1;
      this.window.length = 0;
      return;
    }
    let r = this.asked > 0 ? this.wanted / this.asked : 1;
    if (this.mode === "clamp") r = Math.min(1, r);
    if (!Number.isFinite(r)) r = 1; // NaN / infinity guard

    this.window.push(r);
    if (this.window.length > SMOOTH_FRAMES) this.window.shift();
    // Mean recomputed from the window each frame: no running sum, so no float drift.
    let smooth = this.window.reduce((a, b) => a + b, 0) / this.window.length;

    // Guard: if smoothing lags a sudden crowd and the budget overshoots, restart the window
    // from the instantaneous ratio, still capped at OVERSHOOT_CAP.
    if (smooth * this.asked > this.wanted * OVERSHOOT_CAP) {
      smooth = r * OVERSHOOT_CAP;
      this.window.length = 0;
      this.window.push(smooth);
    }
    this.ratio = smooth;
  }

  // Pass 1: the model's budgeted triangle count. Does not change `triangles`.
  budgetFor(triangles: number): number {
    return triangles * this.ratio;
  }
}

// One LOD slot: a straight line of triangles over distance, plus its end count.
export interface LodSlot {
  slope: number;      // triangles per unit distance
  intercept: number;  // triangles at distance 0 of the line
  endCount: number;   // triangles at the slot's far end
}

// Slots run from most to least detail; endCount falls with distance.
// Pick the first slot whose far end still fits the budget; the last slot is the fallback.
export function pickSlot(slots: LodSlot[], budget: number): number {
  let i = 0;
  while (i < slots.length - 1 && budget < slots[i].endCount) i++;
  return i;
}

// Triangles of a slot at a distance (the line, not a table lookup).
export function trianglesAt(slot: LodSlot, distance: number): number {
  return slot.slope * distance + slot.intercept;
}

// Inverse: the distance at which the slot line gives the budget. Zero slope guarded (the donor does not).
export function distanceForBudget(slot: LodSlot, budget: number): number {
  return slot.slope !== 0 ? (budget - slot.intercept) / slot.slope : 0;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/lod-budget.ts` (new pure helper: `FaceBudget`, `pickSlot`, `distanceForBudget`; no Three.js, no fight rules). The creature actor applies it to its own draw list; the fight engine never reads it. Parity-checklist row 7 (creature actor/clips).
- today: not read (the Frankendom repo was not opened in this pass).
- Reuse tag: reuse-as-shape (GNU AGPL v3: clean-room; no code adapted)
- Brief rule served: 1 (one engine: the helper is pure and shared, and only changes which triangles are drawn, never a fight outcome); the camera/HUD/sound client-only ruling.

## 6. Gaps and risks

- AGPL v3: clean-room only. The sketch uses its own names and structure; nothing is copied line by line.
- The budget counts triangles, not time. Triangles are a proxy for GPU cost. A phone needs a measured frame-time term, so Frankendom should feed the wanted count from a client-side frame-time error, with the fixed number as the default. The donor has no such term.
- Client only. The budget changes what is drawn, so it must never change a fight result, a hit, or a server tick. The server never sees triangle counts.
- Reticle group. The donor gives the selection reticle its own group (SelectionFx 10000, init_main_loop.cpp 650) so a crowd cannot starve it. The transfer is to give the target ring and the 3 attackers (MAX_ATTACKERS = 3) their own group, so a creature crowd never drops the target ring; this also helps lock-on framing.
- Floor. When the budget runs out the donor gives coarser slots, and the last slot is the floor (`pickSlot`). Frankendom must keep a floor so a target never disappears at a distance.
- Build step. Slot lines are fitted when the mesh is built (mesh_multi_lod.cpp 150-172). Frankendom's creature assets would need the same build-time fit; this is not a runtime cost.
- Defects 1-3 above. Defect 1 is the one that matters: a second traverse in a frame would inflate upscaled models. It is inferred from the code paths, not reproduced.
- MRM path not read (mesh_mrm.cpp 2269-2272 delegates to a level-detail table that was not read), so MRM triangle counts are "(not read)".
- Fold-ins not covered by this note: foliage (`landscape_vegetable_block.cpp`), weather (`cloud_scape.cpp`), terrain (`landscape.cpp`), culling (`clip_trav.cpp`). Not read in this pass; they are candidates for a follow-up cell.
- Hint file `bloom_effect.h` is a post-process bloom pass; not part of this mechanism.
