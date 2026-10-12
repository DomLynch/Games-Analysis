# luanti-org-luanti (city-map-design, cell 20)

Donor: `/mnt/frankendom-donors/luanti-org-luanti/src/mapgen/mg_schematic.cpp` (`Schematic::blitToVManip` 112-191, `Schematic::placeOnVManip` 195-220) | Licence: LGPL-2.1-or-later (mg_schematic.cpp line 2 "// SPDX-License-Identifier: LGPL-2.1-or-later"; COPYING.LESSER "Version 2.1, February 1999"; treated as clean-room, shape only) | C++ | symbol `Schematic::blitToVManip`

Checked: Read `blitToVManip` (112-191) and `placeOnVManip` (195-220) in full; `applyProbabilities` (568-586); the probability constants (`mg_schematic.h` 52-63); the PRNG range (`noise.cpp` 120-128) and `myrand_range` (`util/numeric.cpp` 38-41). Callers, all three read: `mg_decoration.cpp` `DecoSchematic::generate` (401-451, read in full) and the decoration neighbour test (`canPlaceDecoration`, 68-121, read in part); `l_mapgen.cpp` `create_schematic` (1672-1722, read in part) and `place_schematic` (1750-1830, read in part). Unit tests: `src/unittest/test_schematic.cpp` grep only; it tests serialisation round-trips and has no test that calls `blitToVManip` or `placeOnVManip`. Not read: `placeOnMap` body (mg_schematic.cpp 222-268), `MapNode::rotateAlongYAxis` (mapnode.cpp), the version branches of `deserializeFromMts` (grep only). The list's hint file `src/servermap.h` is map storage, not the mechanism. Confidence high on the blit order and on both defects (they follow from the lines read); the probability values in section 3 are worked by hand from the code and the PRNG range, not run. Not a camera cell.

Best transferable idea: Place a building as one stored template, node by node, with a chance per layer, a chance per node, a force-overwrite bit and a quarter-turn, so ruins and variants come from data instead of separate models.

Decision (proposed): adapt — one template with per-layer and per-node chance gives ruins and variants for zone landmarks from one asset; the one-byte chance-plus-force encoding is worth keeping only if Frankendom's data is compact; the layer-counter defect and the off-by-one chance are fixed in the sketch; the raw-byte Lua path is rejected as written (values above 127 set the force bit).

Acceptance: A zone's ruined chapel is one template where a layer with chance 64 appears in about half of the placements and every node with chance 127 always appears; a zone test places the template with a fixed seed 200 times and asserts that every placed layer lands at origin.y + its layer index (no shifting), and that a node with chance 1 never appears.

## 1. Mechanism

- Input: a template (size sx, sy, sz; per node: content, a chance 0..127, a force bit, a facing; per y layer: a chance) and an anchor point. Output: nodes written into the voxel area, and a boolean that says whether the whole template box fits inside it.
- `placeOnVManip` (195-220) first picks a rotation if asked (`ROTATE_RAND`), then shifts the anchor for the centre flags (the anchor is moved by `(size - 1) / 2` on each centred axis, with X and Z swapped on quarter turns), calls `blitToVManip`, and returns whether the box `p .. p + s - 1` is inside the voxel area.
- `blitToVManip` order of operations (112-191):
  1. Pick the index start and strides for the chosen quarter turn (115-135), swapping the size on 90 and 270.
  2. For each y layer (`y` from 0 to sy-1), with world height `y_map` starting at the anchor (150): skip the layer if its chance fails, using `slice_probs[y] <= myrand_range(1, 127)` (152-154).
  3. For each z and x in that layer: compute the world position from `y_map` (159); skip if outside the voxel area (160-161); skip CONTENT_IGNORE template nodes (163-164) (the template's way of saying "keep what is there"); read the node's chance and force bit from one byte (`param1 & 0x7F` and `param1 & 0x80`, 166-167).
  4. Skip never-cells (chance 0, 169-170). Unless the call or the node forces, skip any target that is not air or ignore (173-176): the template does not overwrite existing blocks by default.
  5. Roll the node's chance: skip if `placement_prob <= myrand_range(1, 127)` (179-181). A chance of 127 is always placed.
  6. Write the template node, clear its chance byte (183-184), and turn its facing by the rotation (186-187).
  7. After the whole layer, `y_map++` (190).
- Order between layers and nodes: the layer roll is made once per layer before its nodes; each node rolls on its own. All chance rolls use `myrand_range`, which is the global PCG (`util/numeric.cpp` 40), not a PRNG the caller passes in. Only the decoration's rotation uses the caller's per-block PRNG (431).
- Callers (all callers checked): the decoration path (`DecoSchematic::generate`, `mg_decoration.cpp` 401-451) runs the place-on test (408), the vertical offset (411-421), the top-in-volume check (424), draws a rotation from the decoration PRNG (430-431; the PRNG is seeded per block, 131), and blits (448). The Lua `place_schematic` path calls `placeOnMap` (1769) or `placeOnVManip` (1821). The Lua `create_schematic` path stores the per-node and per-layer chances from a table (1688-1711, 1719).
- Decoration neighbour test (`canPlaceDecoration`, 68-122): the node below must be in the place-on list (75); with a spawn-by count, the 8 offsets one above count the spawn-by nodes, and a second set of 8 offsets at `check_offset` is added when that is non-zero; the test passes when the count is at least `nspawnby` (118).

## 2. Key functions

- `Schematic::blitToVManip`: `/mnt/frankendom-donors/luanti-org-luanti/src/mapgen/mg_schematic.cpp` 112-191. The whole placer: layer chance, node filters, overwrite rule, node chance, write, turn.
- `Schematic::placeOnVManip`: same file, 195-220. Rotation draw, centre flags, blit, fit test.
- `Schematic::applyProbabilities`: same file, 568-586. Copies the Lua per-node chances into `param1` and the per-layer chances into `slice_probs`.
- `DecoSchematic::generate`: `/mnt/frankendom-donors/luanti-org-luanti/src/mapgen/mg_decoration.cpp` 401-451. The decoration caller.
- `Decoration::canPlaceDecoration`: same file, 68-122. The place-on and spawn-by test.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| One byte per node: 7-bit chance and a force bit | Mask 0x7F (mg_schematic.h 57); force 0x80 (63) |
| Chance scale: 127 means always, 0 means never | Always 127 (60), never 0 (59); the 0xFF "old always" value (61) has the mask give chance 127 but ALSO carries the 0x80 force bit, so nodes loaded from an old-format (version < 2) schematic are force-placed over non-air (loader 336) |
| Node roll | Skip when `chance <= roll` (180), roll uniform on 1..127: a stored chance c places with (c-1)/127 (worked by hand: c = 1 never places; c = 64 places 63/127 of the time) |
| Layer roll | Same rule on the layer chance (153) |
| Rotation | Four quarter turns, drawn uniformly from 0..3 (decoration path 431) |
| Anchor centring | `(size - 1) / 2` on each centred axis (placeOnVManip, read) |
| Spawn-by count | 8 offsets one above, plus 8 at `check_offset` (118 tests the count against `nspawnby`) |
| PRNG range | Inclusive: bound = max - min + 1 (noise.cpp 127), so `myrand_range(1, 127)` is uniform on 1..127 |

## 4. TypeScript sketch

simplified: keeps the donor order (layer roll, then each node: never, leave-as-is, occupied, node roll, write, turn its facing). Two fixes: (1) the world y advances on every layer, placed or skipped. The donor's skipped layer does not advance `y_map` (the `continue` at 154 jumps past `y_map++` at 190), so every layer above a skipped one lands one level low and the top layers are never written. (2) A chance c places with c/127, not (c-1)/127: the test passes when the roll is at most c. Omitted: the index-stride arithmetic (replaced by `turned()`), the CONTENT_IGNORE byte (replaced by `LEAVE`), the centre flags, the Lua and serialised forms, the `placeOnMap` path, and the decoration place-on and spawn-by tests. Clean-room: written from the described mechanism, names and structure are new.

```ts
// Licence: clean-room. Written from the described mechanism of an LGPL-2.1-or-later donor (node-by-node template
// placement with a per-node chance, a per-layer chance, a force bit and quarter-turn rotation), not a translation.
export const ALWAYS = 127;   // full chance; 0 = never
export const AIR = 0;
export const LEAVE = -1;     // template cell that means "keep what is there"
export type Roll = (lo: number, hi: number) => number;   // inclusive on both ends

export interface Cell { kind: number; chance: number; force: boolean; facing: number; }
export interface Template {
  sx: number; sy: number; sz: number;   // size in cells
  cells: Cell[];                        // index = (y * sz + z) * sx + x
  layerChance: number[];                // one chance per y layer
}
export interface Voxels {
  minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number;
  get(x: number, y: number, z: number): number;
  set(x: number, y: number, z: number, kind: number, facing: number): void;
}

// chance c passes with probability c / ALWAYS (a roll of 1..ALWAYS must be <= c)
function passes(chance: number, roll: Roll): boolean {
  if (chance >= ALWAYS) return true;
  if (chance <= 0) return false;
  return roll(1, ALWAYS) <= chance;
}

// quarter turn about +Y: returns the turned template coordinates of cell (x, z)
function turned(x: number, z: number, sx: number, sz: number, rot: number): { x: number; z: number } {
  switch (rot & 3) {
    case 1: return { x: z, z: sx - 1 - x };
    case 2: return { x: sx - 1 - x, z: sz - 1 - z };
    case 3: return { x: sz - 1 - z, z: x };
    default: return { x, z };
  }
}

// simplified: keeps the donor order (layer roll, then each node: never, leave-as-is, occupied, node roll, write, turn
// its facing). Two fixes: (1) the world y advances on EVERY layer, placed or skipped; the donor's skipped layer does
// not advance its world-y counter, so higher layers land one level low and the top layers are lost. (2) passes()
// places with chance/127; the donor's `<=` test places with (chance-1)/127, so chance 1 never places. Omitted: the
// index-stride maths (replaced by turned()), the CONTENT_IGNORE check (LEAVE is used instead), the centre flags,
// the Lua and serialised forms, and the decoration spawn-by and place-on tests.
export function placeTemplate(
  vox: Voxels,
  origin: { x: number; y: number; z: number },
  t: Template,
  rot: number,
  force: boolean,
  roll: Roll,
): boolean {
  const w = (rot & 1) === 1 ? t.sz : t.sx;
  const d = (rot & 1) === 1 ? t.sx : t.sz;
  const fits =
    origin.x >= vox.minX && origin.x + w - 1 <= vox.maxX &&
    origin.y >= vox.minY && origin.y + t.sy - 1 <= vox.maxY &&
    origin.z >= vox.minZ && origin.z + d - 1 <= vox.maxZ;

  for (let y = 0; y < t.sy; y++) {
    const worldY = origin.y + y;                       // FIX: advanced for every layer
    if (!passes(t.layerChance[y], roll)) continue;
    for (let z = 0; z < t.sz; z++) {
      for (let x = 0; x < t.sx; x++) {
        const cell = t.cells[(y * t.sz + z) * t.sx + x];
        if (cell.kind === LEAVE || cell.chance <= 0) continue;
        const p = turned(x, z, t.sx, t.sz, rot);
        const wx = origin.x + p.x;
        const wz = origin.z + p.z;
        if (wx < vox.minX || wx > vox.maxX || wz < vox.minZ || wz > vox.maxZ) continue;
        if (worldY < vox.minY || worldY > vox.maxY) continue;
        if (!force && !cell.force && vox.get(wx, worldY, wz) !== AIR) continue;
        if (!passes(cell.chance, roll)) continue;
        vox.set(wx, worldY, wz, cell.kind, (cell.facing + rot) & 3);
      }
    }
  }
  return fits;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (`/tmp/cm017-luanti-template-place.ts`), exit 0.

## 5. Lands in

- TARGET `origins/world/landmark-templates.ts` (proposed path; not checked against the Frankendom tree): a pure, seeded placer for zone landmarks (ruins, shrines, gate houses) from one template each, run at zone load on the server and read by the client. Parity-checklist row 23 (zone population and placement as zone data; the nearest row, since no row covers landmarks).
- today: no Frankendom landmark template has been read; this note assumes none exists.
- Reuse tag: clean-room-shape (LGPL-2.1-or-later; shape only, no line-by-line translation)
- Brief rule served: zones as data (templates and chances are zone content, not engine code); server-verified placement (the same seed gives the same ruin on server and client); one placer for every landmark (no per-landmark code path).

## 6. Gaps and risks

- Defect 1, fixed in the sketch: the layer counter is not advanced on a skipped layer (mg_schematic.cpp 152-154 skip with `continue`; the world y is `y_map` at 159; `y_map++` only at 190). A skipped layer makes every layer above it land one level lower, and the top layers are never written. No test in the donor covers the blit (src/unittest/test_schematic.cpp has no blit test), so this went unnoticed. Fix: advance the world y on every layer.
- Defect 2, fixed in the sketch: the chance test is off by one step (152-153 and 179-181 use `<=` against a roll on 1..127). A stored chance c places with (c-1)/127; chance 1 never places. Fix: pass when the roll is at most c.
- Defect 3, reported, not in the sketch: `applyProbabilities` writes the Lua chance byte straight into `param1` (mg_schematic.cpp 577), and `create_schematic` reads it as an unsigned byte with no clamp (l_mapgen.cpp 1696). A value above 127 sets the force bit (0x80) and leaves chance value minus 128: 200 becomes force plus chance 72. Whether the Lua docs forbid this was not read. Fix: clamp the chance to 0..127 when reading the table. The sketch takes a chance already in 0..127 and is not affected.
- Force bit: a force flag on a node overwrites existing blocks, so a landmark with forced nodes can cut into a road or a building. Frankendom should keep force for landmark cores only.
- Overwrite rule: the donor only writes into air or ignore by default. Frankendom needs an equivalent "empty" test that is aware of props, colliders and roads, or the placer will overlap them; the sketch's `vox.get` is a stand-in.
- Rotation: the donor turns the node's facing with the rotation (186-187). The sketch does the same with `(facing + rot) & 3`. How the donor turns a node's facing (`rotateAlongYAxis`, mapnode.cpp) was not read; the facing mapping is assumed to be a quarter turn.
- Determinism, a gap in the donor: the chance rolls use the global PCG (`myrand_range`, numeric.cpp 40), not the per-block PRNG. Only the decoration's rotation uses the per-block PRNG (mg_decoration.cpp 131, 431). So a donor ruin is not reproducible from its block seed. Frankendom must pass its own seeded roll (the sketch's `roll` parameter does this), or server and client will see different ruins; the server should store the placed result if the ruin matters for gameplay.
- Cost: one pass over the whole template per placement (sx x sy x sz nodes). Fine at zone load; not for per-frame work.
- Not a fight mechanism: no hate, no targeting, no effect on MAX_ATTACKERS = 3. It places scenery and collision-free set dressing; anything with a collider must be checked against the collider grid.
- The minimap (`src/client/minimap.cpp`, 763 lines, read by grep only), signage and road grammars are not covered by this note.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
MINOR. Defects 1 and 2 both verified real; masks, applyProbabilities 577, l_mapgen 1696, canPlaceDecoration 68-122, DecoSchematic::generate 401-451, SPDX header all match.
- Note said legacy 0xFF is 'read as 127 by the mask'; 0xFF also has the force bit 0x80, so old-format (version < 2) nodes are force-placed.
- Missed: deserialize sets slice_probs to 0xFF for version < 3 (line 298) and param1 0xFF for version < 2 (336); a 0xFF slice prob is never skipped (`<= roll` never true) and 0xFF node prob carries force-place. In generate(), centre flags for X/Z swap axes by rotation (433-444) rather than using the rotated size as placeOnVManip does.

Fixed 2026-10-12: table row on 0xFF corrected (force bit); added the legacy-format and rotation-centre lines above. Sketch unchanged (no typecheck needed).
