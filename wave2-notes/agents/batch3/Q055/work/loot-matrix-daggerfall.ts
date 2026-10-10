// Licence: MIT (donor, Daggerfall Workshop). Shape adapted; written fresh, not a line-by-line port.
interface LootMatrix {
  minGold: number;                 // inclusive gold range, scaled by PC level
  maxGold: number;
  chance: Record<string, number>;  // percent (0-100) per category key
  levelScaled: Set<string>;        // categories whose chance is multiplied by PC level
}

interface LootRoll {
  category: string;
  count: number;
}

// rng() returns a float in [0, 1). successRoll is "uniform integer in [0, 99] < chance".
function successRoll(chance: number, rng: () => number): boolean {
  return Math.floor(rng() * 100) < chance; // chance 0 can never succeed
}

// Repeated roll: each success adds one item and halves the chance. The chance is truncated
// to an integer before each roll, as the donor casts (int) before its roll.
function repeatCount(baseChance: number, rng: () => number): number {
  let count = 0;
  let chance = baseChance;
  while (successRoll(Math.trunc(chance), rng)) {
    count++;
    chance *= 0.5;
  }
  return count;
}

function generateLoot(m: LootMatrix, pcLevel: number, rng: () => number): { gold: number; rolls: LootRoll[] } {
  const span = m.maxGold - m.minGold + 1;
  const gold = (m.minGold + Math.floor(rng() * span)) * pcLevel;

  const rolls: LootRoll[] = [];
  for (const [category, base] of Object.entries(m.chance)) {
    const chance = m.levelScaled.has(category) ? base * pcLevel : base;
    const count = repeatCount(chance, rng);
    if (count > 0) rolls.push({ category, count });
  }
  return { gold, rolls };
}

export {};
