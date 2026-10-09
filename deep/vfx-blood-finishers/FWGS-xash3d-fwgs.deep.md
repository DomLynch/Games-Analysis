# FWGS-xash3d-fwgs (vfx-blood-finishers, cell 13)

Donor: /mnt/frankendom-donors/FWGS-xash3d-fwgs/ref/gl/gl_decals.c | Licence: GPL-3.0-or-later (per the source file header; no separate licence file on disk) | C | symbol R_DecalShoot
Symbol check: R_DecalShoot (734), R_DecalNode (704), R_DecalNodeSurfaces (678), R_DecalSurface (610), R_DecalCreate (572), R_DecalIntersect (431) and R_DecalAlloc (99) confirmed on the VPS.

## 1. Mechanism
- R_DecalShoot(texture, hit entity, hit model, world position, flags, scale) places a decal (wound, scorch, splat) on the brush-model surfaces around the hit point. It validates the texture index and that the hit model is a brush model, converts the point into the hit entity's local space unless the local-space flag is already set (a matrix inverse when the entity has angles, otherwise a subtraction of its origin), sizes the decal from half the texture's larger dimension, and clamps the scale.
- Placement walks the model's BSP tree from hull 0 (R_DecalNode). At each split plane, if the decal centre is farther from the plane than the decal radius, only the near child is walked. If it is inside the radius, the node's surfaces are checked when the centre is within a thin band of the plane (DECAL_DISTANCE), and both children are walked.
- Each surface in a visited node is filtered (R_DecalNodeSurfaces): water (SURF_DRAWTURB), sky and conveyor surfaces are always skipped; transparent surfaces are skipped only when the stencil buffer is not enabled.
- On a surface (R_DecalSurface), in restore mode (connection state connected or validate) a decal already at the same position and texture is skipped first. Then the decal centre is projected into the texture space, the decal basis is built, the decal's width and height in the surface's texture space are computed, and the decal is dropped if that rectangle lies outside the surface extents. R_DecalCreate then counts existing non-permanent decals on the surface whose clip box the new decal covers by more than 0.6 (R_DecalIntersect); the one it remembers is the overlapping decal with the smallest covered area (ties go to the later one), not the smallest decal by size. Below MAX_OVERLAP_DECALS the remembered decal is discarded. R_DecalAlloc then either reuses that remembered decal (unlinking it from its surface) or takes the next slot of a global ring pool (`gDecalPool`, skipping permanent decals, wrapping at MAX_RENDER_DECALS or the r_decals cvar). The decal quad is clipped to the surface polygon (R_DecalVertsClip); if nothing is left, the decal is unlinked; otherwise it is appended to the surface's list.
- Runs once per shot, at event time, not per frame. Attaching a decal (R_AddDecalToSurface, line 544) builds its clipped mesh immediately via R_DecalCreatePoly and adds it to the VBO (R_AddDecalVBO, body not read); R_DecalSetupVerts later returns the cached mesh or re-clips when none exists. Drawing is a separate pass (DrawSurfaceDecals, line 885, body not read).
- Inputs: texture, hit entity and model, position, flags, scale. Output: decal records linked to surfaces, each with its clipped vertices already built.

## 2. Key functions
- R_DecalShoot (xash3d) | /mnt/frankendom-donors/FWGS-xash3d-fwgs/ref/gl/gl_decals.c | 734-820 | entry: validates the hit, converts to local space (skipped if the local-space flag is set), sizes and clamps the decal, starts the BSP walk.
- R_DecalNode (xash3d) | /mnt/frankendom-donors/FWGS-xash3d-fwgs/ref/gl/gl_decals.c | 704-731 | BSP walk culled by the decal radius; checks surfaces only inside the thin plane band.
- R_DecalNodeSurfaces (xash3d) | /mnt/frankendom-donors/FWGS-xash3d-fwgs/ref/gl/gl_decals.c | 678-697 | per-node surface filter (water, sky, conveyor always skipped; transparent skipped without stencil).
- R_DecalSurface (xash3d) | /mnt/frankendom-donors/FWGS-xash3d-fwgs/ref/gl/gl_decals.c | 610-673 | projects the centre into texture space, restore-mode dedupe, computes the basis, hands to create.
- R_DecalCreate (xash3d) | /mnt/frankendom-donors/FWGS-xash3d-fwgs/ref/gl/gl_decals.c | 572-608 | overlap check, allocate or reuse, clip, attach or drop.
- R_DecalIntersect (xash3d) | /mnt/frankendom-donors/FWGS-xash3d-fwgs/ref/gl/gl_decals.c | 431-505 | counts non-permanent overlapping decals (area above 0.6) and remembers the one with the smallest covered area.
- R_DecalAlloc (xash3d) | /mnt/frankendom-donors/FWGS-xash3d-fwgs/ref/gl/gl_decals.c | 99-128 | reuse the given decal or take the next ring-pool slot (skipping permanent); unlink it from any surface.
- R_AddDecalToSurface (xash3d) | /mnt/frankendom-donors/FWGS-xash3d-fwgs/ref/gl/gl_decals.c | 544-570 | append to the surface list, build the clipped mesh and VBO entry.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Walk the spatial structure, pruning subtrees farther than the decal radius | DECAL_DISTANCE 4 (theirs, line 19) |
| Cap decals per surface; replace the smallest overlapping one rather than stacking | MAX_OVERLAP_DECALS 6 (theirs, line 25) |
| Overlap test as a fraction of the existing decal's box | 0.6 area threshold (theirs, line 490) |
| Scale clamp on decal size | MIN_DECAL_SCALE 0.01 and MAX_DECAL_SCALE 16 (theirs, lines 27-28) |
| Decal size from half the texture's larger dimension | texture dimensions, half-size rule (theirs, lines 807-811) |
| Skip water, sky, conveyor and transparent surfaces | surface flag set (theirs, lines 689-693) |

## 4. TypeScript sketch
simplified: no BSP walk (the sketch tests every surface by rectangle overlap); no texture-space projection, basis or polygon clipping; the permanent-decal exemption and the global ring pool are omitted; the replacement candidate is the least-covered overlapping decal, as in the donor, with the donor's later-wins tie rule not reproduced.

```ts
// Licence: GPL-3.0-or-later (FWGS-xash3d-fwgs, per file header). CLEAN-ROOM: written from the mechanism, no donor lines.
type Decal = { cx: number; cy: number; r: number };   // centre and half-size in surface units
type Surface = { x0: number; y0: number; x1: number; y1: number; decals: Decal[] };
const MAX_OVERLAP = 4;     // overlapping decals tolerated before a replace (donor uses 6; placeholder here, not a tuned value)
const OVERLAP_MIN = 0.6;   // share of an existing decal's box the new one must cover to count

// Fraction of the existing decal's box that the new decal covers.
function coverage(newD: Decal, old: Decal): number {
  const x0 = Math.max(newD.cx - newD.r, old.cx - old.r), x1 = Math.min(newD.cx + newD.r, old.cx + old.r);
  const y0 = Math.max(newD.cy - newD.r, old.cy - old.r), y1 = Math.min(newD.cy + newD.r, old.cy + old.r);
  if (x1 <= x0 || y1 <= y0) return 0;
  return ((x1 - x0) * (y1 - y0)) / ((2 * old.r) * (2 * old.r));
}

function shoot(surfaces: Surface[], cx: number, cy: number, r: number): void {
  const d: Decal = { cx, cy, r };
  for (const s of surfaces) {
    const touches = cx + r > s.x0 && cx - r < s.x1 && cy + r > s.y0 && cy - r < s.y1;
    if (!touches) continue;                                   // outside this surface
    const over = s.decals.filter((o) => coverage(d, o) > OVERLAP_MIN);
    if (over.length >= MAX_OVERLAP) {
      const least = over.reduce((a, b) => (coverage(d, a) <= coverage(d, b) ? a : b));
      s.decals.splice(s.decals.indexOf(least), 1);             // replace the least-covered overlapper, do not stack
    }
    s.decals.push(d);                                          // clipping to the polygon is not modelled here
  }
}
```

## 5. Lands in
- Frankendom target: src/fight/wound-decals.ts (proposed new module; src/fight/ holds characters.ts and index.ts today). Client-side presentation fed by the engine's verified hit.
- today: src/gore.ts (moving)
- Parity-checklist row: 8 (blood, wounds, pools, decals, hero blood-edge; K5).
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; the sketch is clean-room and no lines are lifted)
- Brief rule served: (category default, not per-cell) 2 (engage is a state change); rules 7-9 n/a

## 6. Gaps and risks
- BSP-based: the walk relies on the engine's brush-model tree. Frankendom arenas need their own surface query, so the walk is replaced, not ported.
- Licence is GPL-3.0-or-later (copyleft). Do not lift lines. Sketch only.
- Decal placement uses the hit entity's transform. If Frankendom replays fights (record.ts and replay.ts exist), decal placement must be a pure function of the recorded hit, or replays will show different wounds.
- Not read: R_DecalComputeBasis, R_SetupDecalClip, R_DoDecalSHClip, R_DecalSetupVerts body past 860, DrawSurfaceDecals body, R_AddDecalVBO. Everything in sections 1 to 3 is from lines 1-860 as opened.
- Restore-mode dedupe belongs to a save/load path Frankendom does not have; leave it out.
- The donor does cap globally: a ring pool of MAX_RENDER_DECALS entries (`gDecalPool`, line 54) limited by the r_decals cvar, with one pool entry per surface a decal touches; its per-surface overlap rule is a separate, local cap. Frankendom needs both a total cap and a per-spot cap for phones. MAX_RENDER_DECALS's value was not read.
- Rulings check: no conflict with one engine, zones as data or one ledger, provided the decal is cosmetic and fires only after the server verifies the hit or kill. MAX_ATTACKERS = 3 bounds simultaneous wound sources, which helps the decal cap.
