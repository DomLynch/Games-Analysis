// Licence: MIT (donor, OpenTESArena LICENSE.txt). Clean-room sketch written from the described mechanism.
// clean-room
interface LevelCurve {
  initialCap: number;          // XP cap for leaving level 1 (donor: per-class exe table)
  lowBandMultiplier: number;   // donor: 30 / 16, applied for levels 2 to lowBandEnd
  highBandMultiplier: number;  // donor: 1.5, applied above lowBandEnd
  lowBandEnd: number;          // donor: 8
}

// Cumulative XP cap for leaving `level`. Level 0 has cap 0.
function xpCap(curve: LevelCurve, level: number): number {
  if (level <= 0) return 0;
  let cap = curve.initialCap;
  for (let l = 2; l <= level; l++) {
    const m = l <= curve.lowBandEnd ? curve.lowBandMultiplier : curve.highBandMultiplier;
    cap = Math.floor(cap * m);
  }
  return cap;
}

interface Hero { level: number; xp: number; }

interface LevelUpReward { levelsGained: number; bonusPoints: number; hpGain: number; }

// Runs once per update pass. Waits while any live enemy is near, then applies every level
// earned since the last pass, rolling points and HP once per level.
function tickLevel(
  hero: Hero,
  curve: LevelCurve,
  enemyNear: boolean,
  rng: (exclusiveMax: number) => number,   // returns 0 .. exclusiveMax - 1
  healthDie: number,
  enduranceHpBonus: number,
): LevelUpReward | null {
  if (enemyNear) return null;
  const before = hero.level;
  while (hero.xp >= xpCap(curve, hero.level)) hero.level++;
  const gained = hero.level - before;
  if (gained <= 0) return null;
  let bonusPoints = 0;
  let hpGain = 0;
  for (let i = 0; i < gained; i++) {
    bonusPoints += 4 + rng(3);                    // donor: BonusPointsRandomMin 4 .. Max 6
    hpGain += enduranceHpBonus + (1 + rng(healthDie));
  }
  return { levelsGained: gained, bonusPoints, hpGain };
}

// Kill XP, awarded once: the caller checks the target is not already dying.
function creatureXp(baseExp: number, maxHp: number, expMultiplier: number): number {
  return baseExp + maxHp * expMultiplier;
}
function humanXp(enemyLevel: number, categoryMultiplier: number): number {
  return enemyLevel * enemyLevel * categoryMultiplier;
}

export {};
