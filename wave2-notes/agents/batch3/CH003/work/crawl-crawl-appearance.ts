// Licence: GPL-2.0 (donor, LICENSE "either version 2 of the License"). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
// simplified: the sketch keeps the donor's roll order (always-layers first, then the coin-flip layers, then the one-in-four beard) and its seeded fill for layers that the species or job did not set. It omits the species base tile, the equipment overrides, the tile atlas (tile ranges are an input here, not donor data), the ghost armour-class scaling and the doll file. It adds one fix the donor does not have: a layer with no range for a species is skipped.
// The ranges below are ILLUSTRATIVE INPUT ONLY, not donor data. The layer ids are this list's indices, not the donor's enum values (not read).

type Layer = "body" | "hand1" | "leg" | "boots" | "hair" | "cloak" | "arm" | "hand2" | "helm" | "beard";

// Roll order, as in the donor's create_random_doll. Index = layer id used by the seeded fill.
const LAYER_ORDER: Layer[] = ["body", "hand1", "leg", "boots", "hair", "cloak", "arm", "hand2", "helm", "beard"];

// Chance per layer: always (1), a coin flip (0.5), or one in four (0.25).
const CHANCE: Record<Layer, number> = {
  body: 1,
  hand1: 1,
  leg: 1,
  boots: 1,
  hair: 1,
  cloak: 0.5,
  arm: 0.5,
  hand2: 0.5,
  helm: 0.5,
  beard: 0.25,
};

interface PartRange {
  start: number;
  count: number;
}

// Per species (or per job) tile ranges for each layer. A missing layer means the species has no such layer.
type RangeTable = Partial<Record<Layer, PartRange>>;

type Doll = Partial<Record<Layer, number>>;

// Index in 0..count-1. Counts below two give 0 (the donor's hash helper does the same).
function pick(rng: () => number, count: number): number {
  return count < 2 ? 0 : Math.floor(rng() * count);
}

// Donor create_random_doll: each layer rolled in order, the species range decides which exist.
function randomDoll(ranges: RangeTable, rng: () => number): Doll {
  const doll: Doll = {};
  for (const layer of LAYER_ORDER) {
    const range = ranges[layer];
    if (range === undefined) continue; // fix: the donor has no species check
    if (rng() < CHANCE[layer]) {
      doll[layer] = range.start + pick(rng, range.count);
    }
  }
  return doll;
}

// Small seeded 32-bit mix of two words (clean-room, not the donor's MurmurHash).
function mix2(seed: number, id: number): number {
  let h = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(id + 0x7f4a7c15, 0xc2b2ae35);
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return h >>> 0;
}

// Donor hash_with_seed: hash modulo the count, 0 below two.
function seededIndex(seed: number, id: number, count: number): number {
  return count < 2 ? 0 : mix2(seed, id) % count;
}

// Donor ghost doll (tilemcache.cc 1546-1558): layers from cloak upward that the species or job
// did not set get a seeded pick, so the same name always gives the same look.
function seededDoll(setByDefaults: Doll, seed: number, ranges: RangeTable): Doll {
  const doll: Doll = { ...setByDefaults };
  LAYER_ORDER.forEach((layer, id) => {
    if (id < 5) return; // body..hair come from the species or job defaults
    if (doll[layer] !== undefined) return;
    const range = ranges[layer];
    if (range === undefined) return;
    doll[layer] = range.start + seededIndex(seed, id, range.count);
  });
  return doll;
}

// Illustrative use only.
const illustrativeRanges: RangeTable = {
  body: { start: 0, count: 3 },
  hand1: { start: 3, count: 2 },
  leg: { start: 5, count: 2 },
  boots: { start: 7, count: 2 },
  hair: { start: 9, count: 6 },
  cloak: { start: 15, count: 4 },
  arm: { start: 19, count: 2 },
  hand2: { start: 21, count: 2 },
  helm: { start: 23, count: 5 },
  beard: { start: 28, count: 3 },
};

const rolled = randomDoll(illustrativeRanges, () => 0.3);
const ghost = seededDoll({}, mix2(0x1234, 0x5678), illustrativeRanges);
void rolled;
void ghost;

export {};
