// Licence: Sustainable Use License 1.0 (donor; restricted, non-commercial). Clean-room sketch written from the described mechanism, not a translation of the donor lines.

const LEVEL_CAP = 99;
const XP_STEP = 1000;

// Total XP at which a hero reaches `level`: level 2 needs 1000, level 3 needs 3000, level 4 needs 6000.
// Returns -1 at the cap, meaning no further level.
function xpForLevel(level: number): number {
  if (level >= LEVEL_CAP) return -1;
  const half = Math.floor(level / 2);
  return level % 2 === 1 ? XP_STEP * half * level : XP_STEP * half * (level - 1);
}

interface Hero {
  level: number;
  xp: number;
  maxHp: number;
  hp: number;
  endurance: number;
  lifegiverRank: number;
  swiftLearnerRank: number;
}

// Kill XP for one attack: foes this attack killed that were alive before it.
interface FoeKill {
  valueXp: number;        // per-foe data value
  wasDeadBefore: boolean;
}

function xpFromAttack(kills: FoeKill[]): number {
  let xp = 0;
  for (const k of kills) {
    if (!k.wasDeadBefore) xp += k.valueXp;
  }
  return xp;
}

// Add XP (Swift Learner adds 5 percent of the award per rank, integer division), then level up while the total covers the next threshold.
// Returns the XP actually gained, including the bonus.
function awardXp(h: Hero, award: number): number {
  const before = h.xp;
  h.xp = before + award + Math.floor((h.swiftLearnerRank * 5 * award) / 100);
  while (h.level < LEVEL_CAP && h.xp >= xpForLevel(h.level + 1)) {
    h.level += 1;
    const hpPerLevel = Math.floor(h.endurance / 2) + 2 + 4 * h.lifegiverRank;
    h.maxHp += hpPerLevel;
    h.hp += hpPerLevel;
  }
  return h.xp - before;
}

// Example: one foe worth 60 XP killed this attack; a second foe was already dead.
const hero: Hero = { level: 1, xp: 0, maxHp: 30, hp: 30, endurance: 5, lifegiverRank: 0, swiftLearnerRank: 1 };
const gained = awardXp(hero, xpFromAttack([
  { valueXp: 60, wasDeadBefore: false },
  { valueXp: 60, wasDeadBefore: true },
])); // 60 + 3 bonus = 63, level 1
awardXp(hero, 1000); // +1050 with bonus: xp 1113, level 2
