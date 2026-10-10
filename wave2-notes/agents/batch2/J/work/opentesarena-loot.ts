// RNG is injected: next(max) returns an integer in [0, max)
interface Rng { next(exclusiveMax: number): number; }

// per-creature chances, each 0..100 (donor packs them as 4 bytes in one uint32)
interface CreatureLootChances { gold: number; magicItem: number; plainGear: number; magicGear: number; }

interface CreatureLoot { gold: number; magicItem: boolean; plainGear: boolean; magicGear: boolean; }

// donor quirk kept: a first roll for gold, then a second, reversed roll against the same chance
function creatureGold(level: number, chance: number, rng: Rng): number {
  const first = 1 + rng.next(100);
  if (first > chance) return 0;
  const second = rng.next(101);
  if (second < chance) return 0;
  return (1 + rng.next(10)) * (level + 1);
}

function rollCreatureLoot(level: number, c: CreatureLootChances, rng: Rng): CreatureLoot {
  const hit = (chance: number): boolean => 1 + rng.next(100) <= chance;
  return {
    gold: creatureGold(level, c.gold, rng),
    magicItem: level > 2 && hit(c.magicItem),
    plainGear: hit(c.plainGear),
    magicGear: level > 6 && hit(c.magicGear),
  };
}

// container loot: four independent slots (gold, magic item, plain gear, magic gear), each its own chance
type ContainerKind = 'house' | 'palace' | 'noble' | 'dungeon' | 'crypt';
interface ContainerData {
  slotChances: [number, number, number, number];
  goldRule: (level: number, rng: Rng) => number;
  qualityRule: (level: number, rng: Rng) => number;
}

interface ContainerLoot { gold: number; magicQuality: number | null; plainGear: boolean; magicGear: boolean; }

function rollContainer(d: ContainerData, level: number, rng: Rng): ContainerLoot {
  const slots = d.slotChances.map((ch) => rng.next(100) + 1 <= ch);
  return {
    gold: slots[0] ? d.goldRule(level, rng) : 0,
    magicQuality: slots[1] ? d.qualityRule(level, rng) : null,
    plainGear: slots[2],
    magicGear: slots[3],
  };
}

// data-only examples of the donor's formulas
const dungeonGold = (level: number, rng: Rng): number => level * level + (rng.next(100) + 1);
const dungeonQuality = (level: number): number => 5 * (level + 1);

export { rollCreatureLoot, rollContainer, dungeonGold, dungeonQuality, ContainerKind };
export {}
