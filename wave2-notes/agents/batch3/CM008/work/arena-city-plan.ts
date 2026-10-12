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
export {};
