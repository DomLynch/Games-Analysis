# PixelGuys-Cubyz (city-map-design, cell 2)

Donor: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/server/terrain/simple_structures/SbbGen.zig` (placement), with `src/server/terrain/sbb.zig` (structure building blocks), `src/server/terrain/structuremapgen/SbbEnumerationGenerator.zig` (world enumeration and signs), `src/utils.zig` (AliasTable) and data `assets/cubyz/sbb/cactus/*.zig.zon` | Licence: GPL-3.0 text in `LICENSE` (GNU GPL v3, 29 June 2007); no "or any later version" wording and no per-file licence headers were found by grep, so read as GPL-3.0 | Zig (ZON data) | symbol `SbbGen.placeSbb`

Checked: Read in full: `SbbGen.zig` (all 97 lines), `SbbEnumerationGenerator.zig` (all 210 lines), `SimpleStructureGen.zig` and `StructureMap.zig` (for the placement context), `sbb.zig` 64-340 and 341-380 (blueprint entries, rotation, the structure type, child resolution), `utils.zig` AliasTable 99-200, and the cactus data files. Not read: `sbb.zig` 1-63 and 381-447 (globals, block registration, the blueprint loader at 392-427, which builds the four rotated variants), `chunkgen/StructureGenerator.zig` (the call site), the paste code in `main.blueprint`. The hint file `src/server/world.zig` has no structure, blueprint or SBB code (grep: none), so it is not the implementation. Word search for town, city, village, landmark and road in `src`, `assets` and `mods`: the only hit is `assets/cubyz/wordlist` (a word list, not read). Cubyz has no town or city generator as far as this search shows; the building grammar below is the nearest real mechanism. Confidence: high on order of operations and the defaults; medium on the alias-table construction (read, not re-derived). Camera scope: not applicable.

## 1. Mechanism

- A structure building block (SBB) is a data kit in ZON. It has `blueprints` (a list of alternatives, each an `id` of a voxel blueprint or `null`, each with a `chance`, default 1.0), `rotation` (`fixed`, `random` or `inherit`), and `children` (a map from a slot name to another SBB id). Example: `assets/cubyz/sbb/cactus/saguaro.zig.zon` (lines 2-15) lists eight base alternatives with two at chance 0.1, and three child slots: `lime` is the arms kit, `pink` the flower kit, `viridian` the upper kit.
- A blueprint marks its attachment points as child blocks (slots) and its anchor as an origin block. `BlueprintEntry.init` (sbb.zig 96-148) strips the origin and slot markers out of the pasted voxels and keeps their positions and faces. More than one origin is an error (sbb.zig 114).
- Placement (`SbbGen.placeSbb`, lines 59-77), in order:
  1. Pick one alternative with the seeded alias sampler (`getBlueprints`, sbb.zig 334). A `null` alternative returns at once (SbbGen 60).
  2. Align the blueprint's origin face to the face the parent exposes. `alignDirections` returns the number of quarter turns that do this (SbbGen 80-90). Then apply the rotation mode: a fixed mode adds its turns to the alignment; random or inherit use the alignment alone (sbb.zig 176-181).
  3. Paste position = attach point minus the rotated origin minus one step out along the attach face (SbbGen 69).
  4. Paste the blueprint with the structure's paste mode (SbbGen 71).
  5. For each slot in the rotated blueprint with a configured child, place the child at paste position plus the slot offset, facing the slot's face, with rotation fixed 0 for horizontal slots (SbbGen 73-76; sbb.zig 192-199).
  6. Recursion: step 5 calls `placeSbb` again for the child. No depth argument exists and no cap is applied in the function (read in full).
- A horizontal child's own `rotation` field is therefore never read: the donor reads it only for up and down slots, and the sketch leaves those out.
- World use (`SbbEnumerationGenerator`, disabled by default at line 30): the roots are the SBBs that no other SBB lists as a child (lines 65-69), sorted by id ignoring case (101), with any leftover recursive ones added after. Each 32-wide column index picks one root by `index mod number of roots` (145). Each root is pinned to zero turns with paste mode `all` (111-112). The 32-tile cell is stamped at heights 0 and 128 relative to the chunk (148). Every 1024th row (`wpy & 1023 == 0`, 152) gets a sign per cell whose text is the root's id (159, 198: voxel size 1 only). Other rows use the root with seed = world seed times the row coordinate only (174).
- Alias sampler (utils.zig 99-200): a uniform slot is drawn first, then kept or replaced by its alias by threshold (189-191). Weights need not sum to 1 (110 derives the target weight from the total).

## 2. Key functions

- `SbbGen.placeSbb`: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/server/terrain/simple_structures/SbbGen.zig` 59-77 (the recursion); `SbbGen.generate` 55-57 (root entry); `alignDirections` 80-92 (alignment table).
- `StructureBuildingBlock.initFromZon`: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/server/terrain/sbb.zig` 231-308 (blueprint list, chance default at 251, rotation, child slot keys at 294).
- `Rotation.apply` / `getInitialRotation` / `getChildRotation`: same file, 176-200.
- `StructureBuildingBlock.getBlueprints` and `getChildStructure`: same file, 333-338.
- `registerSBB` (child resolution by id): same file, 341-376.
- `SbbEnumerationGenerator.init` 35-133 (roots, sort, pins) and `generate` 135-210 (columns, levels, signs).
- `AliasTable.sample`: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/utils.zig` 188-194.
- Data: `/mnt/frankendom-donors/PixelGuys-Cubyz/assets/cubyz/sbb/cactus/` (saguaro, saguaro_upper, arms, flower).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Weighted alternative per kit, with a "nothing" entry | Default weight 1.0 (sbb.zig 251); `{id = null, chance = 0.5}` in flower (data line 4) |
| Named child slots, child kit chosen by slot name | Slot names are colour block names (`lime`, `pink`, `viridian`; saguaro.zig.zon 13-15) |
| Align origin face to the attach face (4 quarter turns) | Four horizontal faces modelled here; the donor also has up and down faces (sbb.zig 192-199), not modelled |
| Rotation of a child = its parent's turns plus alignment | Horizontal child slots fixed at 0 turns (sbb.zig 199) |
| Column stripes of roots | 32-tile column width (SbbEnumerationGenerator 145) |
| Two heights per column | Levels 0 and 128 (148) |
| Sign row every 1024 tiles | 1024 (152) |
| Seed per row | world seed times the row (174) |

## 4. TypeScript sketch

simplified: The sketch keeps the donor order: sample one alternative (null ends the branch), align the origin face, paste so the rotated origin sits one step behind the attach point, then recurse into each configured slot with rotation fixed 0 for horizontal slots. It changes two things on purpose: (1) recursion is capped at `MAX_DEPTH = 8` (fix; the donor has no cap, and a cycle in the children map with no null alternative would not terminate); (2) the alias table is replaced by a cumulative pick over the same weights (the same distribution, without the O(1) table). It omits: up and down slots and their rotation rules (the SBB's own `rotation` field is read only there), the voxel paste itself, the four pre-rotated blueprint variants (the sketch rotates positions directly; the origin and the slots use the same rotation, so the paste offset cancels), block registration, the signs and the column and row enumeration, and the paste mode.

```ts
// Licence: GPL-3.0 text only (donor LICENSE file; no per-file headers found). clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Turns = 0 | 1 | 2 | 3;                  // quarter turns about Z
type Mode = { kind: "fixed"; turns: Turns } | { kind: "random" } | { kind: "inherit" };
type Dir = 0 | 1 | 2 | 3;                    // horizontal ring: E, N, W, S (up and down slots not modelled)
type Vec = [number, number];

const DIR_VEC: Vec[] = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const MAX_DEPTH = 8; // fix: the donor's recursion has no depth limit; this cap is a choice, not a donor value

// Blueprint in its unrotated frame. A slot is a named marker in the blueprint (donor: child blocks).
interface Blueprint { id: string; origin: Vec; originDir: Dir; slots: { name: string; at: Vec; dir: Dir }[] }
interface Alt { blueprint: Blueprint | null; chance: number } // null = nothing placed here; chance defaults to 1
interface Sbb { id: string; alts: Alt[]; children: Map<string, Sbb> }
interface Placed { sbb: string; blueprint: string; at: Vec; turns: Turns }

function ringStep(d: Dir, turns: number): Dir {
  return ((d + turns) % 4) as Dir;
}

// Turns that take `from` to `to` on the ring (donor: alignment table built by repeated Z rotation).
function alignTurns(from: Dir, to: Dir): Turns {
  for (let k = 0; k < 4; k++) if (ringStep(from, k) === to) return k as Turns;
  throw new Error("unreachable on a four-direction ring");
}

function rotVec(v: Vec, turns: number): Vec {
  let [x, y] = v;
  for (let k = 0; k < turns; k++) [x, y] = [-y, x];
  return [x, y];
}

// Weighted pick. Weights are not normalised; a null alternative is a real choice of "nothing".
function sampleAlt(alts: Alt[], rand: () => number): Blueprint | null {
  const total = alts.reduce((s, a) => s + a.chance, 0);
  let pick = rand() * total;
  for (const a of alts) {
    if (pick < a.chance) return a.blueprint;
    pick -= a.chance;
  }
  return alts.length > 0 ? alts[alts.length - 1].blueprint : null; // floating-point guard
}

// `attach` is the face the parent exposes (null at a root). `mode` is the rotation handed down by the parent.
// Horizontal child slots always pass fixed 0; the child's own rotation field is not read for them (donor).
function placeSbb(sbb: Sbb, at: Vec, attach: Dir | null, mode: Mode, depth: number, rand: () => number, out: Placed[]): void {
  if (depth > MAX_DEPTH) return; // fix: bounded recursion
  const bp = sampleAlt(sbb.alts, rand);
  if (!bp) return;

  const alignK = alignTurns(bp.originDir, attach ?? bp.originDir);
  const turns = (mode.kind === "fixed" ? (mode.turns + alignK) % 4 : alignK) as Turns;
  out.push({ sbb: sbb.id, blueprint: bp.id, at, turns });

  // Paste so the rotated origin sits one step behind the attach point (donor: pastePosition).
  const origin = rotVec(bp.origin, turns);
  const step = DIR_VEC[attach ?? bp.originDir];
  const paste: Vec = [at[0] - origin[0] - step[0], at[1] - origin[1] - step[1]];

  for (const slot of bp.slots) {
    const child = sbb.children.get(slot.name);
    if (!child) continue; // a slot with no configured child is left empty
    const rel = rotVec(slot.at, turns);
    const slotAt: Vec = [paste[0] + rel[0], paste[1] + rel[1]];
    placeSbb(child, slotAt, ringStep(slot.dir, turns), { kind: "fixed", turns: 0 }, depth + 1, rand, out);
  }
}

// A world root is placed with zero turns (donor: the enumeration pins roots to fixed 0).
export function placeRoot(root: Sbb, at: Vec, rand: () => number): Placed[] {
  const out: Placed[] = [];
  placeSbb(root, at, null, { kind: "fixed", turns: 0 }, 0, rand, out);
  return out;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (copied to /tmp), exit 0.

## 5. Lands in

- TARGET `origins/zones/hub-kits.ts` (proposed new module; the Frankendom repo was not opened, so the path is a proposal). It is the zone-data kit for a hub: a base with named service slots (for example bench, stall, shrine), each slot filled by a child kit, placed one slot at a time.
- Parity row 23 (zone population). The kits decide what sits where in a zone; spawns and respawns stay with the row's engine logic in `origins/server/world-spawns.ts`.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: zones as data (kits and slots are data, no code per hub); one engine (the placement is one function, not a per-zone script).

Best transferable idea: a hub is a kit with named service slots and a weighted list of base layouts (including "nothing"), and each slot is filled by its own child kit, so a town block can be composed from data one slot at a time.

Decision (proposed): adapt - take the slot-and-child kit grammar and the weighted "nothing" alternative; add the depth cap that the donor lacks; reject the voxel paste, the column stripes of the world enumeration and the sign text, which do not fit Frankendom's zones.
Acceptance: a server test with a fixed seed builds a hub with three named service slots and asserts that each configured slot holds exactly one child kit or none (never two), that a kit with a 0.5 "nothing" alternative is empty about half the time over 1000 seeds, and that a cyclic kit reference stops at the depth cap without an error.

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism; no donor line is translated.
- Donor defect, recursion: no depth limit in the donor (`placeSbb`, SbbGen 59-77). A children cycle with no `null` alternative would not terminate. fix: depth cap (sketch `MAX_DEPTH`) and reject cycles when the kits load. The enumeration's own recursive case (SbbEnumerationGenerator 73-95) does allow cycles, so the risk is real, not theoretical. The sketch caps depth; Frankendom should also reject cycles at load.
- Donor defect, seed: the seed for these structures is `worldSeed*wpy` (174): a plain product, so a row's seed is shared by every cell in that row, and the product has as many trailing zero bits as the row coordinate has factors of two. Whether the RNG tolerates this was not read. fix: derive a per-cell seed by a hash of the zone seed and the cell (not in the sketch).
- Donor defect, dead field: roots take zero turns in the enumeration, so an SBB's own `rotation` field does nothing for roots and nothing for horizontal children (sbb.zig 199). fix: drop the field for kits that are not up or down slots, or make the loader honour it for roots (the sketch omits it).
- Signage here is a block entity whose text is the structure id (SbbEnumerationGenerator 159). That is a dev label, not a player-facing name; a shop or inn sign needs its own text data.
- The donor's blue-noise candidate placer (`SimpleStructureGen.zig`, `noise/BlueNoise.zig`) is a separate, real mechanism for spacing and LOD density (chance `1-(1-p/16)^(s*s)` for far samples). It was read and is not in this note; it is a candidate for row 23 spawn density in another cell.
- Frankendom ruling: one engine, server-verified state. The donor runs this placement in `src/server/terrain` (server code) from a seed per chunk, so the layout is a function of the seed and not a client choice. Frankendom should keep the same property: generate the zone layout on the server from a zone seed, or ship it as data, and have the client render what the server sent.
