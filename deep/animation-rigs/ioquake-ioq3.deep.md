# ioquake-ioq3 (animation-rigs, cell 3)

Donor: /mnt/frankendom-donors/ioquake-ioq3/code/renderergl1/tr_animation.c | Licence: GPL-2 | C | symbol R_MDRAddAnimSurfaces / RB_MDRSurfaceAnim

## 1. Mechanism
- Donor: ioquake3 renderer (renderergl1) for MDR skeletal models. Animation is done on the GPU-less CPU path: bones are blended on the CPU and vertices are skinned per draw.
- R_MDRAddAnimSurfaces (181-304) runs per entity each render: wraps both frame numbers by modulo only when the entity has the wrap-frames flag (197-201), then validates them: if either frame or old frame is out of range (negative or at or above the frame count), both are reset to 0 (not clamped or wrapped; 209-218). It then calls R_MDRCullModel (224) and returns on CULL_OUT. R_MDRCullModel (45-129) first tests a bounding sphere per frame (skipped for non-normalised axes, 57-108), then culls on the merged box of both frames (110-128). Next it calls R_ComputeLOD (230): with fewer than 2 LODs it uses 0; otherwise it projects the frame's bounding radius, scales by r_lodscale (capped at 20), multiplies by the LOD count, clamps and adds r_lodbias (tr_mesh.c 166-235). The model returns early if it has no LODs, and the LOD index is clamped (232-235). Lighting is set up unless it is a third-person personal model with shadows at 1 or less (244-247), then fog (250), then each surface gets a shader (custom shader; or a custom skin matched by surface name, else default; or the surface's own shader index; else default; 257-276), optional stencil or projection shadow surfaces (281-297), and the main draw surface only when it is not the personal model (299-300).
- RB_MDRSurfaceAnim (311-422) runs at draw time: if the entity's frame and old frame are equal, backlerp is forced to 0; otherwise it is the entity's backlerp and frontlerp is 1 minus it (329-338). It copies the triangle indexes (357-361). When backlerp is 0 the frame's bones are used as is (366-370); otherwise all numBones x 12 floats are blended as frontlerp x frame + backlerp x oldframe (375-378).
- Each vertex is the sum over its weights of weight x (bone matrix row dotted with the weight's offset, plus the matrix translation column), giving the position (398-400). The normal uses the same sum with the vertex normal and without the translation column (402-404). Texture coordinates are copied (415-416).
- Output: indexes, positions, normals and texture coordinates appended to the tess draw buffer (407-421). It reads the entity's frame fields and backlerp from backEnd.currentEntity; it writes no game state.

## 2. Key functions
- R_MDRAddAnimSurfaces | /mnt/frankendom-donors/ioquake-ioq3/code/renderergl1/tr_animation.c | 181-304 | per-entity submit: frame clamp, cull, level of detail, lighting, one draw surface per model surface.
- RB_MDRSurfaceAnim | /mnt/frankendom-donors/ioquake-ioq3/code/renderergl1/tr_animation.c | 311-422 | per-surface draw: blends bone matrices between two frames, then skins each vertex by its weights.
- R_MDRCullModel | /mnt/frankendom-donors/ioquake-ioq3/code/renderergl1/tr_animation.c | 45-129 | culls the model against the view by the merged box of both frames.
- R_ComputeLOD | /mnt/frankendom-donors/ioquake-ioq3/code/renderergl1/tr_mesh.c | 166-235 | picks the LOD index from the projected bounding radius, r_lodscale and r_lodbias.
- MC_UnCompress | /mnt/frankendom-donors/ioquake-ioq3/code/renderergl1/tr_animation.c | 468-521 | decodes a compressed 3 x 4 bone matrix from 12 unsigned 16-bit values (translation x, y, z then nine rotation values), each offset by half its range and scaled (468-521).

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Blend the pose between two keyframes by one factor, then skin | Interpolation factor backlerp from the entity (theirs, per entity) |
| Skin each vertex by weighted bone offsets | Maximum bones MDR_MAX_BONES = 128 (theirs; qcommon/qfiles.h 196, used at tr_animation.c 323) |
| Cull on the merged box of both keyframes (110-128) | Per-frame bounds stored in the model (theirs) |
| Level of detail from projected bounding radius, clamped to available levels | r_lodscale cap 20 and r_lodbias (theirs; tr_mesh.c 204-232) |
| Skip the blend when frames are equal or backlerp is 0 | Equal-frame test at 329 (generic) |

## 4. TypeScript sketch
simplified: positions only (donor also skins normals without translation and copies texture coordinates and indexes); culling, LOD, shader pick and shadows omitted; the caller must pass back = 0 when the two frames are equal (donor forces this itself, 329-333); bones are plain arrays, not the packed bone struct.

```ts
// Licence: GPL-2 | clean-room: written from the mechanism, no donor lines.
// Keyframe blend then skin. Each bone is a 3 x 4 matrix (12 numbers, row-major).
// The pose is the linear blend of two keyframes by one factor. Each vertex is the weighted sum
// of its bone-transformed offsets. With the same frame on both sides, no blend is needed.
type Mat34 = number[];
interface Weight { bone: number; w: number; off: [number, number, number]; }
interface Vertex { weights: Weight[]; }
type V3 = [number, number, number];

function blendBones(a: Mat34[], b: Mat34[], back: number): Mat34[] {
  if (back === 0) return a;                      // only the current frame
  return a.map((m, i) => m.map((v, k) => (1 - back) * v + back * b[i][k]));
}

function skinVertex(v: Vertex, bones: Mat34[]): V3 {
  const p: V3 = [0, 0, 0];
  for (const wt of v.weights) {
    const m = bones[wt.bone];
    for (let r = 0; r < 3; r++) {
      const t = m[r * 4] * wt.off[0] + m[r * 4 + 1] * wt.off[1] + m[r * 4 + 2] * wt.off[2] + m[r * 4 + 3];
      p[r] += wt.w * t;
    }
  }
  return p;
}

function skinSurface(verts: Vertex[], cur: Mat34[], old: Mat34[], back: number): V3[] {
  const bones = blendBones(cur, old, back);
  return verts.map(v => skinVertex(v, bones));
}
```

## 5. Lands in
- Frankendom file: TARGET src/fight/creature-pose.ts (proposed, pose blend for K3 creatures; today the creature clips are the origins own copy at origins/preview/mob-clips.ts, not under src/).
- Parity-checklist row: 7 (creature actor and clips, K3 creatures). The donor's draw path (cull, LOD, shadows) is a World concern, not a fight row.
- Reuse tag: rewrite-from-idea (GPL-2; mechanism only).
- Brief rule served: (category default, not per-cell) 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks
- Blending is linear on the 3 x 4 matrices, not on quaternions; it can shrink the limb in large rotations. Frankendom's pose format must be stated before this is reused.
- Skinning runs per draw on the CPU here. A Frankendom client must not do it per creature per frame in the Pit without a frame budget set by the client owners.
- The donor's culling and LOD are presentation. Frankendom's hit boxes and kill checks must come from the one engine and the server, never the skinned mesh (one engine; server-verified kills).
- Zones are data: a creature's pose format and clip list belong in the catalogue (row 20/21), not in per-zone skinning code.
- MC_UnCompress is a storage decode; Frankendom's clips need not use a compressed matrix format.
- GPL-2: mechanism only; no lines copied.
