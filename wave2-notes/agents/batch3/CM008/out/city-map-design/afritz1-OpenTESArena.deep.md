# afritz1-OpenTESArena (city-map-design, cell 3)

Donor: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/World/ArenaCityUtils.cpp` | Licence: MIT (`/mnt/frankendom-donors/afritz1-OpenTESArena/LICENSE.txt` line 1 "The MIT License (MIT)", copyright 2016-2026 The OpenTESArena Developers; code may be adapted) | C++ | symbol `ArenaCityUtils::generateCity`

Checked: Read in full: `ArenaCityUtils::generateCity` (World/ArenaCityUtils.cpp 99-210), `writeSkeleton` (77-97), the MIF block tables and `generateRandomBlockType` (Assets/MIFUtils.cpp 15-17, 73-111), `ArenaRandom::next` (Math/Random.cpp 66-70), the city call site (World/MapGeneration.cpp 2660-2668), and the city size switch and reserved-list lookup (WorldMap/LocationDefinition.cpp 159-188). Not read: `revisePalaceGraphics` (called at MapGeneration.cpp 2671), `generateArenaCityBuildingNames` (2690), the contents of the block .MIF files (the data folder is not in the box), the reserved-list and start-position tables (they come from the original executable's data, not in the box), and `ArenaLocationUtils::getLocalCityPoint`. The hint file, Interface/WorldMapUiState.cpp, is the world-map UI host (state, textures, buttons); only its constructor line was read. Confidence: high on plan order, weights, sizes and offsets; medium on the variation off-by-one, which depends on asset numbering not in the box. camera_scope: n/a.

Best transferable idea: Build a town as a seeded grid: reserve the fixed cells first, place each service into a random empty cell one at a time before any filler, then fill the rest from a weighted table, so every town gets its services and the same seed always gives the same town.
Decision (proposed): adapt - take the service-first placement and the seeded plan for towns in zone data; the Arena block files and the executable's reserved lists are not ours, and the town plan must be generated server-side from the zone seed so client and server agree.
Acceptance: A 5 x 5 town generated from one zone seed shows the same layout on server and client, always contains at least one each of equipment, temple, tavern and noble house and exactly one mages guild (not on the palace cell), and the filler cells follow the 45/20/15/10/10 weights over 10,000 test seeds (a server test asserts the counts).

## 1. Mechanism

- Inputs: a city seed, the number of blocks per side (`cityDim`), the plan width from the MIF, a list of reserved block indices, a start position, and a seeded RNG (`ArenaRandom random(citySeed)` at MapGeneration.cpp 2660). The plan is a `cityDim x cityDim` row-major grid of block types (`citySize = cityDim * cityDim`, 106).
- Step 1, reserved cells (122-131): each reserved index inside the plan is set to Reserved. These cells are never filled and never loaded from a block file.
- Step 2, services, one at a time (134-139): `placeBlock` picks a random cell, retrying until it is Empty (115-116), and writes the block type. The order is Equipment, MagesGuild, NobleHouse, Temple, Tavern, Spacer. Each service is therefore guaranteed at least once, before any filler can take its cell. Only MagesGuild and Spacer are unique: the filler (step 3) also produces Equipment, Tavern, Temple and NobleHouse, so a town normally has many of those.
- Step 3, filler (142-147): `emptyBlocksInPlan` is counted once, after the services. Then, for each remaining empty cell, `generateRandomBlockType` rolls one 16-bit value and `placeBlock` puts that block type into a random empty cell (145-146). The roll's thresholds (MIFUtils.cpp 90-110) give Houses 0 to 0x7333 (45 percent), Tavern to 0xA666 (20 percent), Equipment to 0xCCCC (15 percent), Temple to 0xE666 (10 percent), and NobleHouse above that (10 percent). This filler never yields MagesGuild or Spacer; those come only from step 2.
- Step 4, build (149-209): the plan is walked in row-major order, x fastest (202-208). Each non-reserved cell loads one block .MIF: its file name is code + "BD" + variation + rotation + ".MIF" (MIFUtils.cpp 73-86, rotation rolled first, then variation). Each block is copied into the voxel buffers at `startPosition + (column or row) * 20` (181-182), so each cell is a 20 by 20 voxel slot. The block's FLOR, MAP1 and MAP2 layers are copied.
- Size per town (LocationDefinition.cpp 175-188): city state 6 blocks per side (36 cells), town 5 (25 cells), village 4 (16 cells).
- Skeleton first: `writeSkeleton` copies the base level's ground and walls (77-97) before the blocks are written over it.
- Determinism: the RNG is a multiply-and-shift on 32 bits, returning 16 bits (Random.cpp 68-69). The same seed always yields the same plan.

## 2. Key functions

- `ArenaCityUtils::generateCity`: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/World/ArenaCityUtils.cpp` 99-210. Reserved cells, six services, weighted filler, row-major build.
- `placeBlock` (lambda inside `generateCity`): same file, 109-119. Rejection sampling into a random empty cell.
- `MIFUtils::generateRandomBlockType`: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Assets/MIFUtils.cpp` 88-111. The weighted filler.
- `MIFUtils::makeCityBlockMifName` (block-type overload): same file, 78-86. Rotation and variation picks.
- `MapGeneration::generateMifCity` (city call site): `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/World/MapGeneration.cpp` 2660-2668.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Fixed cells reserved before anything else | Reserved list per town template (from the executable's data; not in the box; LocationDefinition.cpp 160-165) |
| Services placed one at a time into random empty cells, in a fixed order | Six services in order Equipment, MagesGuild, NobleHouse, Temple, Tavern, Spacer (ArenaCityUtils.cpp 134-139) |
| Weighted filler: one 16-bit roll, thresholds in order | Houses up to 0x7333 (45%), Tavern up to 0xA666 (20%), Equipment up to 0xCCCC (15%), Temple up to 0xE666 (10%), NobleHouse is the else branch above 0xE666 (10%) (MIFUtils.cpp 91-103; the shares are the arithmetic of those thresholds over 65,536, not stated in the donor) |
| Grid of cells, each a fixed-size slot | 20 voxels per slot (ArenaCityUtils.cpp 181-182) |
| Size per settlement type | City state 6, town 5, village 4 blocks per side (LocationDefinition.cpp 179-184; the `return` lines are under 15 characters, so the receipts are their case lines) |
| Block code table and variation counts | EQ 13, MG 11, NB 10, TP 12, TV 15, TS 11, BS 20 variations; 4 rotations A to D (MIFUtils.cpp 15-17) |
| Seeded RNG, 16-bit output | Multiplier 7143469 (Random.cpp 68), output bits 16 to 31 (69) |

## 4. TypeScript sketch

simplified: the donor draws a random cell and retries while it is occupied; this sketch draws from the list of empty cells instead, so for a given seed the RNG sequence and the plan differ from the donor's. Reserved cells are marked first in both, as in the donor. The sketch leaves out the block copy (FLOR, MAP1, MAP2), the palace graphics pass, the building names, and the reserved-list and start-position tables. Two donor defects are fixed: the infinite retry loop when no empty cell is left (the sketch throws), and the variation off-by-one (`max(roll % n, 1)` makes variation 1 twice as likely and variation n unreachable; the sketch uses `1 + roll % n`, which assumes assets numbered 1 to n).

```ts
// Licence: MIT (donor, OpenTESArena). Code may be adapted; this sketch is written from the described mechanism and is not a line-by-line translation.
// clean-room
type Block = 'empty' | 'reserved' | 'equipment' | 'mages' | 'noble' | 'temple' | 'tavern' | 'spacer' | 'houses';

// Donor ArenaRandom::next(): a 16-bit value, 0..65535.
export interface Rng {
  next(): number;
}

// Donor MIFUtils.cpp generateRandomBlockType: fixed thresholds on the 16-bit roll.
// Shares: houses 45%, tavern 20%, equipment 15%, temple 10%, noble house 10%. Never mages or spacer.
const FILLER_THRESHOLDS: Array<[number, Block]> = [
  [0x7333, 'houses'],
  [0xA666, 'tavern'],
  [0xCCCC, 'equipment'],
  [0xE666, 'temple'],
  [0xFFFF, 'noble'],
];

export function fillerBlock(roll16: number): Block {
  for (const [maxRoll, block] of FILLER_THRESHOLDS) {
    if (roll16 <= maxRoll) return block;
  }
  return 'noble';
}

// Donor generateCity: the six service blocks are placed one at a time, each into a random empty cell.
const SERVICES: Block[] = ['equipment', 'mages', 'noble', 'temple', 'tavern', 'spacer'];

// Place one block in a random empty cell. Donor retries random cells until it finds an empty one
// (no exit if none is left); this version picks from the list of empty cells and fails loudly.
function placeOne(plan: Block[], kind: Block, rng: Rng): void {
  const empties: number[] = [];
  plan.forEach((b, i) => {
    if (b === 'empty') empties.push(i);
  });
  if (empties.length === 0) throw new Error(`no empty cell left for ${kind}`);
  plan[empties[rng.next() % empties.length]] = kind;
}

// Donor generateCity, plan stage only. Row-major plan, cityDim x cityDim.
// Order: reserved cells first, then the six services, then the rest by the weighted filler.
// simplified: the donor draws a random cell and retries while it is occupied; this sketch draws
// from the list of empty cells instead, so for a given seed the RNG sequence and the plan differ
// from the donor's. Reserved cells are marked first in both, as in the donor.
export function planCity(cityDim: number, reserved: number[], rng: Rng): Block[] {
  const size = cityDim * cityDim;
  const plan: Block[] = [];
  for (let i = 0; i < size; i++) plan.push('empty');

  for (const r of reserved) {
    if (r >= 0 && r < size) plan[r] = 'reserved';
  }

  for (const service of SERVICES) {
    placeOne(plan, service, rng);
  }

  const emptyCount = plan.filter((b) => b === 'empty').length;
  for (let k = 0; k < emptyCount; k++) {
    placeOne(plan, fillerBlock(rng.next()), rng);
  }
  return plan;
}

// Donor generateCity, build stage: cell index to a 20 x 20 voxel slot, row-major, x fastest.
export const CELL_VOXELS = 20;

export function cellOrigin(index: number, cityDim: number, startX: number, startZ: number): [number, number] {
  const x = index % cityDim;
  const z = Math.floor(index / cityDim);
  return [startX + x * CELL_VOXELS, startZ + z * CELL_VOXELS];
}

// Donor MIFUtils tables: code and variation count per block (order follows the donor enum).
export const BLOCK_CODES: Record<string, { code: string; variations: number }> = {
  equipment: { code: 'EQ', variations: 13 },
  mages: { code: 'MG', variations: 11 },
  noble: { code: 'NB', variations: 10 },
  temple: { code: 'TP', variations: 12 },
  tavern: { code: 'TV', variations: 15 },
  spacer: { code: 'TS', variations: 11 },
  houses: { code: 'BS', variations: 20 },
};

const ROTATIONS = ['A', 'B', 'C', 'D'];

// Donor makeCityBlockMifName: rotation is rolled first, then the variation.
// Fix: the donor's max(roll % n, 1) makes variation 1 twice as likely and variation n unreachable
// if assets are numbered 1..n (asset numbering is not in the box). This uses 1 + (roll % n).
export function blockFileName(kind: string, roll1: number, roll2: number): string {
  const entry = BLOCK_CODES[kind];
  if (entry === undefined) throw new Error(`unknown block ${kind}`);
  const rotation = ROTATIONS[roll1 % ROTATIONS.length];
  const variation = 1 + (roll2 % entry.variations);
  return `${entry.code}BD${variation}${rotation}.MIF`;
}

// Donor city sizes (from LocationDefinition.cpp): city state 6, town 5, village 4 blocks per side.
export const BLOCKS_PER_SIDE = { cityState: 6, town: 5, village: 4 } as const;
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 arena-city-plan.ts` on the VPS (/tmp/cm008/), exit 0.

## 5. Lands in

- TARGET `origins/world/town-plan.ts` (proposed path, new module; not checked against the Frankendom repo). It generates a town's cell plan from the zone seed on the server, so the client receives the plan rather than generating it.
- Parity row 23 (zone population). The batch hint named row 23. No checklist row covers town layout; row 23 is the nearest, because the service cells decide where service NPCs and their spawns go. Strategy may want a new row for town layout as zone data; that is a checklist gap, not a finding about this donor.
- Reuse tag: rewrite-from-idea (MIT; code may be adapted, the sketch is written from the mechanism)
- Brief rule served: zones as data (town size, service list and filler weights are zone data; the generator is one engine function); server-verified (the plan comes from the zone seed on the server); rules 7-9 n/a

## 6. Gaps and risks

- Infinite loop (defect, idea kept). The donor's `placeBlock` retries until it finds an empty cell (ArenaCityUtils.cpp 113-116) and has no exit when none is left. Six services plus the reserved cells must fit in the plan, and the reserved lists (from the executable, not in the box) are not checked here. A village has 16 cells. Fix: pick from the empty list and throw (sketch `placeOne`).
- Variation off-by-one (defect, idea kept). `max(random.next() % variationCount, 1)` (MIFUtils.cpp 84) makes variation 1 twice as likely as the others and never produces variation n, if the .MIF files are numbered 1 to n. The numbering is not in the box, so this is a probable defect, not a confirmed one. Fix: `1 + roll % n` (sketch `blockFileName`).
- Determinism across client and server. The RNG is a 32-bit multiply, which JavaScript does not do exactly with plain numbers; Frankendom must use an integer-exact generator (for example Math.imul) and a single generator version in the zone data, or the town will differ between server and client.
- Services first, filler after (transferable). Because services take their cells before filler, a town can never lose its services to random filler. That is the rule the zone data should keep; the sketch keeps it.
- Filler weights are a fixed table in code (MIFUtils.cpp). For Frankendom they should be zone data per town type, not a constant in the generator.
- Mages guild and spacer appear only as one forced service each. The Frankendom service list should be data, so a town can drop or add services without a code change.
- Not read (see Checked): the palace graphics pass, the building names, the block .MIF contents, the reserved-list and start-position data, and the local city point. Nothing in the note depends on them except the block contents, which the note does not describe.
- The donor is a single-player generator; it has no server, no zone snapshot and no fight rules, so only the layout idea transfers.


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: Mechanism step 2 says each service 'appears exactly once' and Acceptance says 'always contains one each'; real filler (MIFUtils.cpp 88-111, ArenaCityUtils.cpp 142-147) also yields Equipment/Tavern/Temple/NobleHouse, so a town has many of those; only MagesGuild and Spacer are unique. Minor: comment at ArenaCityUtils.cpp ~152 says 'right to left' but code is row-major x-fastest (note says row-major, matches code). All line cites, weights 0x7333/A666/CCCC/E666, sizes 6/5/4, 20-voxel offset 181-182, tables 15-17, RNG 7143469 (Random.cpp 68-69), max(roll%n,1) at MIFUtils 84, licence MIT verified.
Missed: none

Fixed 2026-10-12 (Sonnet fixer): 'appears exactly once' and 'one each' changed to at least one for equipment, tavern, temple and noble house, exactly one only for mages guild (and spacer); matches the filler table in step 3 and MIFUtils.cpp 88-111. Verified against the note's own filler thresholds and ArenaCityUtils.cpp 134-147. The 'right to left' comment mismatch is a donor comment, not a note error.
