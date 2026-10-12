// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export const WEAR_MAX = 12;        // deaths-while-equipped cap
const WEAR_THRESHOLD = 9;          // no stat loss up to this many
const WEAR_FLOOR = 0.25;           // stat multiplier at WEAR_MAX

// Stat multiplier for one piece after `lost` deaths while equipped.
export function wearMultiplier(lost: number): number {
  const l = Math.min(Math.max(lost, 0), WEAR_MAX);
  const over = Math.max(0, l - WEAR_THRESHOLD);
  return (1 - over / (WEAR_MAX - WEAR_THRESHOLD)) * (1 - WEAR_FLOOR) + WEAR_FLOOR;
}

// Share of a set's stats that one piece carries, from per-slot weights.
export function pieceShare(weights: Record<string, number>, slot: string): number {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  return sum === 0 ? 0 : (weights[slot] ?? 0) / sum;
}

export interface Node {
  hardness: number | null;   // hits to break; null = broken on the first valid hit
  dropInterval: number;      // partial drop every N hits
  damage: number;            // hits taken so far (kept on the zone row)
}

export interface Drop { itemId: string; }

// One valid tool hit on a node. Full break pays every drop; a partial stage
// keeps each drop with a chance (ore/gem get a skill bonus).
export function harvestHit(
  node: Node,
  isOre: (id: string) => boolean,
  oreSkillLevel: number,
  drops: Drop[],
  rng: () => number,
): { broken: boolean; kept: Drop[] } {
  node.damage += 1;
  const broken = node.hardness === null || node.damage >= node.hardness;
  const stage = node.damage % node.dropInterval === 0;
  if (broken) return { broken: true, kept: drops };
  if (!stage) return { broken: false, kept: [] };
  const oreChance = Math.min(1, 0.5 + 0.1 * oreSkillLevel);
  const kept = drops.filter(d => rng() < (isOre(d.itemId) ? oreChance : 0.5));
  return { broken: false, kept };
}

export {};
