// Licence: AGPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Piece {
  quality: number; // workmanship of the piece (1 to about 10 in the donor)
  value: number;   // item value in coins
  stack: number;   // stack size (1 for a single piece)
}

export interface Bag {
  material: string;
  structure: number;     // units stored
  maxStructure: number;  // capacity per bag
  workmanship: number;   // sum of quality of pieces that went in
  value: number;         // bag value in coins
}

export const VALUE_CAP = 75000;

// Units from one salvage action: 1 + floor(skill / 194 * quality * (1 + 0.25 * augs)), times stack.
export function salvageUnits(skill: number, quality: number, augs: number, stack: number): number {
  return (1 + Math.floor((skill / 194) * quality * (1 + 0.25 * augs))) * stack;
}

// Put units into bags of one material. A full bag is skipped and a new bag opens for the rest.
// Workmanship and value are shared out by the share of units each bag takes (the donor adds the
// full piece workmanship to every bag it touches; the sketch shares it out instead).
export function addUnits(
  bags: Bag[],
  material: string,
  units: number,
  piece: Piece,
  skill: number,
  maxCap = 100,
): number {
  let remaining = units;
  while (remaining > 0) {
    let bag = bags.find((b) => b.material === material && b.structure < b.maxStructure);
    if (bag === undefined) {
      bag = { material, structure: 0, maxStructure: maxCap, workmanship: 0, value: 0 };
      bags.push(bag);
    }
    const space = bag.maxStructure - bag.structure;
    const amount = Math.min(remaining, space);
    const share = amount / units;
    bag.structure += amount;
    bag.workmanship += piece.quality * piece.stack * share;
    bag.value = Math.min(bag.value + piece.value * share * (skill / 387), VALUE_CAP);
    remaining -= amount;
  }
  return units;
}

// Recipe success chance: logistic in (skill - difficulty), factor 0.03 by default.
export function recipeChance(skill: number, difficulty: number, factor = 0.03): number {
  const chance = 1 - 1 / (1 + Math.exp(factor * (skill - difficulty)));
  return Math.min(1, Math.max(0, chance));
}

// One craft roll against the chance.
export function rollRecipe(chance: number, rng: () => number): boolean {
  return rng() < chance;
}
