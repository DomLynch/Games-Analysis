# ValveSoftware-source-sdk-2013 (animation-rigs, cell 3)

Donor: /mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/game/client/c_baseanimating.cpp | Licence: Valve SDK licence (proprietary, read-only) | C++ | symbol C_BaseAnimating.GetBoneTransform / C_ClientRagdoll

## 1. Mechanism
- Donor: Source engine client-side skeletal animation. Each animating entity has a bone cache of world matrices; a bone lookup returns the cached matrix or falls back to the entity's own transform.
- BuildTransformations (1459-1607) is given the per-bone local pose (pos, quaternion), a camera transform, a bone mask and a computed-bone list. If the entity has a ragdoll, it first calls RagdollBone to write the ragdoll-driven bones and flag them simulated. For bone-merge entities it then copies matching bones from another model's cache. It then loops the bones in list order: a bone outside the mask, a merged bone, a simulated bone, or one CalcProceduralBone handled is skipped; a bone already marked by IK is kept; otherwise the local pose becomes a matrix and a jiggle bone gets a physics step (parent scale removed first), a root bone is concatenated with the camera transform, and any other bone is the parent's world matrix times its local pose. Every root bone then gets ApplyBoneMatrixTransform (render-fx effects). The loop relies on the list being parent-first (the code reads the parent's matrix with no ordering check).
- A bone already solved by IK (computed earlier in the same pass) is skipped and kept.
- A ragdoll (CRagdoll::RagdollBone, ragdoll.cpp 166) marks the bones it drives as simulated and writes their matrices from the physics objects, so the animated pass leaves them alone.
- C_ClientRagdoll::ClientThink (557-582) releases the entity if the release flag is set (FadeOut sets it when alpha reaches 0), optionally draws a debug box, then runs HandleAnimatedFriction and FadeOut each client frame. HandleAnimatedFriction (417-513) is a four-state timer (none, in, hold, out, then off) that ramps an angular-motor friction value between min and max on each ragdoll constraint, using the ragdoll data's in/hold/out times, and wakes the physics object.
- Inputs: the skeleton, the per-bone pose (position and quaternion), the bone mask, and the physics state of any ragdoll. Output: the bone cache used for drawing and hit boxes.

## 2. Key functions
- C_BaseAnimating::GetBoneTransform | /mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/game/client/c_baseanimating.cpp | 1213-1230 | returns a cached bone matrix, or the entity transform if the bone is not cached.
- C_BaseAnimating::BuildTransformations | /mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/game/client/c_baseanimating.cpp | 1459-1607 | fills the bone cache: ragdoll runs first, then masked bones are skipped if simulated, merged, procedural or IK-solved, others concatenated parent-to-child.
- CRagdoll::RagdollBone | /mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/game/client/ragdoll.cpp | 166-175 | for each ragdoll list entry, writes the bone matrix from the physics object and flags that bone simulated.
- C_ClientRagdoll::ClientThink | /mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/game/client/c_baseanimating.cpp | 557-582 | per-frame ragdoll upkeep: release check, debug box, friction, fade (FadeOut at 530-549 sets the release flag at zero alpha).
- C_ClientRagdoll::HandleAnimatedFriction | /mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/game/client/c_baseanimating.cpp | 417-513 | friction state machine (none, in, hold, out, off) that ramps constraint angular-motor friction between min and max from the ragdoll data's times.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Bone world matrix = parent world x local pose, parents first | Bone list order from the model file (theirs) |
| Skip bones already written by a simulation or an IK pass | Bone flags and bone mask (theirs, BuildTransformations 1459-1607) |
| Cache lookup with fallback to the entity transform | Fallback is the entity-to-world matrix (theirs, same idea everywhere) |
| Ragdoll drives a bone subset, animation fills the rest | Ragdoll bone list from the ragdoll script (theirs) |

## 4. TypeScript sketch
simplified: omits the bone mask, the ragdoll-first pass, bone-merge, procedural and jiggle bones, ApplyBoneMatrixTransform, and the donor's camera transform for root bones (the sketch uses entityToWorld as the root parent and as the cache fallback).

```ts
// Licence: Valve SDK licence (proprietary, read-only) | clean-room: written from the mechanism, no donor lines.
// Bone world transforms: a bone's world matrix is its parent's world matrix times its local pose, parents first.
// Bones already written this pass (simulation or IK) are skipped. A missing cache entry falls back to the entity transform.
type Mat34 = number[];                     // 3 rows x 4 columns, row-major, 12 numbers
interface Bone { parent: number; local: Mat34; overridden: boolean; }

function mul34(a: Mat34, b: Mat34): Mat34 {
  const out = new Array<number>(12).fill(0);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      let s = c === 3 ? a[r * 4 + 3] : 0;     // translation of the left matrix carries through
      for (let k = 0; k < 3; k++) s += a[r * 4 + k] * b[k * 4 + c];
      out[r * 4 + c] = s;
    }
  }
  return out;
}

function solveBones(bones: Bone[], entityToWorld: Mat34, out: (Mat34 | undefined)[]): void {
  for (let i = 0; i < bones.length; i++) {
    if (bones[i].overridden) continue;    // simulation or IK already wrote this bone
    const parentWorld = bones[i].parent < 0 ? entityToWorld : (out[bones[i].parent] ?? entityToWorld);
    out[i] = mul34(parentWorld, bones[i].local);
  }
}

function boneTransform(i: number, cache: (Mat34 | undefined)[], entityToWorld: Mat34): Mat34 {
  return cache[i] ?? entityToWorld;        // no cached bone: use the entity transform
}
```

## 5. Lands in
- Frankendom file: src/fight/bones.ts (proposed) for the bone cache and bone solve (hero actor, parity row 6); creatures reuse it under row 7 (src/fight, K3). Today the creature clips are the origins own copy at origins/preview/mob-clips.ts (not under src/).
- Parity-checklist row: 6 (hero actor and animations, src/fight, K3 live in J4a) and 7 (creature actor and clips, K3 creatures).
- Today on trunk 9f4937e38 (per the parity checklist, not re-checked here): src/fight holds characters.ts and index.ts only, and the checklist marks row 6 as K3, live in J4a.
- Reuse tag: rewrite-from-idea (proprietary; the idea is generic and is written clean-room).
- Brief rule served: (category default, not per-cell) 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks
- Ragdoll physics (the constraint solver, RagdollSolveSeparation and the ragdoll script) is outside this file; not read here. Frankendom has no ragdoll row, so a death pose needs its own decision.
- The bone cache is shared by drawing and hit boxes in Source. Frankendom's hit boxes belong to the engine (rule 1); the client cache must not become the hit source.
- The parent-first order is assumed from the bone list. A list that is not parent-first breaks the sketch; check the model format before reuse.
- Proprietary licence: read-only reference. The sketch is clean-room; no lines are copied.
- Symbol note: GetBoneTransform at 1213 is correct; C_ClientRagdoll is a class, and its logic is in ClientThink (557) and CRagdoll::RagdollBone (ragdoll.cpp 166).
