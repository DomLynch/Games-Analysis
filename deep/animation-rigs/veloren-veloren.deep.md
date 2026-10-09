# veloren-veloren (animation-rigs, cell 3)

Donor: /mnt/frankendom-donors/veloren-veloren/voxygen/anim/src/biped_large/mod.rs | Licence: GPL-3 | Rust | symbol BipedLargeSkeleton.compute_matrices_inner

Symbol check: compute_matrices_inner starts at 87 and ends at 140 (opened in full). The skeleton_impls! macro (45-72) lists the bones but its expansion was not read.

## 1. Mechanism
- A large biped creature skeleton is a tree of bones. Each bone has a local transform from its parent; the animation state sets the local transforms.
- compute_matrices_inner(base, buf, body) (87-140) builds each bone's world matrix. The base matrix is multiplied by a uniform scale of the body's scaler divided by 8 (93; the body-to-scaler mapping, SkeletonAttr::from, was not read). The chain then runs torso (95), upper torso (96), and lower torso, which is a child of upper torso (102).
- The chains are fixed in code (113-135): head hangs from upper torso and jaw from head; tail from lower torso; leg and foot from lower torso through leg control nodes; shoulders from upper torso through arm control nodes. Hands and weapons are not a plain parent chain: main is upper torso x (control x weapon_l) x main (100, 124), hand_l is arm_control_l x (control x weapon_l) x control_l x hand_l (128), and the right side mirrors it with weapon_r and control_r (101, 125, 129). The hold bone is upper torso x control x the local hand_l x hold (114, 135); the local hand_l is used without arm control, and the donor's FIXME at 134 asks whether control_l should be used there.
- Output: the computed skeleton struct of world matrices (118-136), and set_figure_bone_data(buf) writes them into the bone buffer (138); the computed skeleton is returned (139).
- Inputs: local transforms, base matrix, body attributes. Outputs: per-bone world matrices. Client render-side, once per creature per frame.

## 2. Key functions
- BipedLargeSkeleton compute_matrices_inner | /mnt/frankendom-donors/veloren-veloren/voxygen/anim/src/biped_large/mod.rs | 87-140 | composes bone transforms down the parent chain and returns the computed skeleton.
- Body scale step | /mnt/frankendom-donors/veloren-veloren/voxygen/anim/src/biped_large/mod.rs | 93-93 | root matrix scaled by the body scaler divided by 8.0.
- Computed skeleton build | /mnt/frankendom-donors/veloren-veloren/voxygen/anim/src/biped_large/mod.rs | 118-136 | builds the world matrix of every output bone, including the hold bone.
- Hold bone FIXME | /mnt/frankendom-donors/veloren-veloren/voxygen/anim/src/biped_large/mod.rs | 134-135 | the donor comment questions whether the hold bone should use the left control matrix.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Parent-chain composition of local transforms into world transforms | Bone list and names (theirs) |
| Root scale from a body attribute | Scaler divided by 8.0 (theirs; line 93) |
| Weapon and hand chains through control nodes (non-parent matrix products, 100-101, 124-135) | Control node names (theirs) |

## 4. TypeScript sketch
simplified: translation only, no rotation; a single-parent tree (donor hands, weapons and hold multiply several non-parent matrices: control, weapon, control_l or control_r, arm_control; 124-135); the donor applies the scale once as a matrix on the base, here the sum of scaled local offsets, which is equal only for pure translations; no output buffer packing.

```ts
// Licence: GPL-3 (veloren-veloren) | clean-room: written from the mechanism, no donor lines.
// Translation-only simplification: the donor composes full 4x4 matrices.
interface Local { tx: number; ty: number; tz: number; }
interface Bone { name: string; parent: string | null; local: Local; }
interface Point { x: number; y: number; z: number; }

// Compose world positions by walking the parent chain. Parents must appear before children.
function solve(bones: Bone[], root: Point, bodyScale: number): Map<string, Point> {
  const out = new Map<string, Point>();
  const scale = bodyScale / 8; // theirs: scaler divided by 8.0
  for (const b of bones) {
    const base = b.parent === null ? root : out.get(b.parent)!;
    out.set(b.name, {
      x: base.x + b.local.tx * scale,
      y: base.y + b.local.ty * scale,
      z: base.z + b.local.tz * scale,
    });
  }
  return out;
}
```

## 5. Lands in
- Frankendom file(s): TARGET src/fight/creature-rig.ts (proposed, K3 creatures; today the creature actor and clips are the origins own copy at origins/preview/mob-clips.ts, not under src/).
- Parity-checklist row: 7 creature actor/clips (K3 creatures).
- Reuse tag: rewrite-from-idea (GPL-3; mechanism only).
- Brief rule served: (category default, not per-cell) 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks
- The sketch drops rotation. The donor's matrices carry rotation, so the real port is a 4x4 composition.
- The donor marks a FIXME at the hold bone: it uses the control matrix where the left control might be expected. Any port must copy the donor's behaviour knowingly or fix it.
- Client render-side only. No server role; nothing here is authority. Hit boxes, damage and kills stay in the one engine and are server-verified, never read from bone matrices.
- Zones are data: a creature's bone list, scaler and control nodes belong in the catalogue (rows 20 and 21), not hard-coded per zone as the donor's macro list is (45-72).
- Body scaler and bone names are theirs; Frankendom's creature set is not defined here.
