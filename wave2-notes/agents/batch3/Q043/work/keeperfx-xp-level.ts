// Licence: GPL-2.0-or-later (donor source headers). clean-room: shape only, written from the described rules, not a translation.
const MAX_LEVEL = 10;             // levels 0..9; the top index is 9
const GAIN_PER_LEVEL_PCT = 35;    // percent of base per level (donor default; a per-model config value in the donor)

interface Creature {
  level: number;                  // 0-based
  points: number;                 // experience points, not scaled
  levelUpPending: boolean;
  baseHealth: number;             // unscaled base of the model
  maxHealth: number;
  health: number;
  canGrowUp: boolean;
  ownerMaxLevel: number;          // per-owner cap on this model
}

// Stat at a level: base + gain% x base x level / 100, level clamped to the top index. Integer math.
function statAtLevel(base: number, level: number): number {
  const lv = Math.min(level, MAX_LEVEL - 1);
  return base + Math.floor((GAIN_PER_LEVEL_PCT * base * lv) / 100);
}

// Gate: no experience at the owner's cap, or at the top level unless the creature can grow up.
function canGainXp(c: Creature): boolean {
  if (c.level >= c.ownerMaxLevel) return false;
  if (c.level >= MAX_LEVEL - 1 && !c.canGrowUp) return false;
  return true;
}

// Level cost: the table value for the current level, times 256 points.
function levelCost(table: number[], level: number): number {
  return table[level] * 256;
}

// Spend-to-level: if the points cover the cost, the cost is taken and a level-up is queued (below the caps).
function checkLevelUp(c: Creature, table: number[]): boolean {
  const cost = levelCost(table, c.level);
  if (c.points < cost) return false;
  c.points -= cost;
  if (c.level < c.ownerMaxLevel && (c.level < MAX_LEVEL - 1 || c.canGrowUp)) {
    c.levelUpPending = true;
  }
  return true;
}

// A hit: the shooter gains mag x (target factor + gain% x factor x target level / 100), then the upgrade check runs.
function hitXp(shooter: Creature, table: number[], mag: number, targetFactor: number, targetLevel: number): boolean {
  if (!canGainXp(shooter)) return false;
  const gained = mag * (targetFactor + Math.floor((GAIN_PER_LEVEL_PCT * targetFactor * targetLevel) / 100));
  shooter.points += gained;
  checkLevelUp(shooter, table);
  return true;
}

// Once per creature update: at most one level step; the next step is checked again on a later update.
function applyPendingLevel(c: Creature, table: number[]): void {
  if (!c.levelUpPending) return;
  c.levelUpPending = false;
  if (c.level + 1 >= MAX_LEVEL) return;          // grow-up branch not modelled
  const oldMax = c.maxHealth;
  c.level += 1;
  c.maxHealth = statAtLevel(c.baseHealth, c.level);
  c.health = oldMax > 0 ? Math.floor((c.maxHealth * c.health) / oldMax) : c.maxHealth;
  checkLevelUp(c, table);
}
