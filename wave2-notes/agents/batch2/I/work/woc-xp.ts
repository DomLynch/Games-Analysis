// Licence: MIT (donor). adapted shape; written fresh, formulas follow the donor.
interface Progress { level: number; xp: number; lifetimeXp: number; restedXp: number; prestige: number }

const XP_TABLE = [400, 900, 1400, 2100, 2800, 3600, 4500, 5400, 6500, 7600, 8800, 10100, 11400, 12900, 14400, 16000, 17700, 19400, 21300, 23200];
const MAX_LEVEL = 20;
const GROUP_XP_BONUS = [1, 1, 1.166, 1.3, 1.43];
const PRESTIGE_XP_PER_RANK = XP_TABLE[MAX_LEVEL - 1];
const xpForLevel = (level: number): number => XP_TABLE[Math.min(level - 1, XP_TABLE.length - 1)];

// cumulative lifetime XP needed to reach `level` (1..MAX_LEVEL)
function xpToReach(level: number): number {
  let t = 0;
  for (let l = 1; l < level; l++) t += XP_TABLE[l - 1];
  return t;
}

function zeroDiff(pl: number): number { return pl <= 7 ? 5 : pl <= 9 ? 6 : pl <= 15 ? 7 : 8; }

// Kill XP by level difference: bonus up to +20% for higher mobs, linear fade to 0 below the grey band.
function mobXp(mobLevel: number, playerLevel: number): number {
  const base = 45 + 5 * mobLevel;
  const diff = mobLevel - playerLevel;
  if (diff >= 0) return Math.round(base * (1 + 0.05 * Math.min(diff, 4)));
  const zd = zeroDiff(playerLevel);
  if (-diff >= zd) return 0;
  return Math.round(base * (1 - -diff / zd));
}

// Per-member kill award: shared among eligible members, group bonus by headcount, elite multiplier.
function killShare(mobLevel: number, memberLevel: number, eliteMult: number, eligible: number): number {
  const bonus = GROUP_XP_BONUS[Math.min(eligible, GROUP_XP_BONUS.length) - 1];
  return Math.round((mobXp(mobLevel, memberLevel) * eliteMult * bonus) / eligible);
}

// One award. Order: rested doubling (kills only, under cap) -> lifetime counter -> bar -> level-up loop.
function grantXp(p: Progress, amount: number, fromKill: boolean): number {
  if (amount <= 0) return 0;
  if (fromKill && p.level < MAX_LEVEL && p.restedXp > 0) {
    const bonus = Math.min(Math.floor(p.restedXp), amount);
    p.restedXp -= bonus;
    amount += bonus;
  }
  p.lifetimeXp += amount;               // always, even at the cap
  if (p.level >= MAX_LEVEL) return amount;
  p.xp += amount;
  while (p.level < MAX_LEVEL && p.xp >= xpForLevel(p.level)) {
    p.xp -= xpForLevel(p.level);
    p.level++;                           // caller: recompute stats, refill hp here
  }
  if (p.level >= MAX_LEVEL) p.xp = 0;   // leftover lives on in lifetimeXp
  return amount;
}

// Prestige is a pure function of XP earned past the cap, so a spammed command cannot inflate it.
const maxPrestige = (lifetime: number): number => {
  const earned = lifetime - xpToReach(MAX_LEVEL);
  return earned <= 0 ? 0 : Math.floor(earned / PRESTIGE_XP_PER_RANK);
};
const canPrestige = (p: Progress): boolean => p.level >= MAX_LEVEL && p.prestige < maxPrestige(p.lifetimeXp);

// Rested pool accrues per tick while idle in a safe place: 5% of a level per 8 game-hours, cap 1.5 levels.
function tickRested(p: Progress, resting: boolean, dt: number): void {
  if (p.level >= MAX_LEVEL) return;
  const cap = 1.5 * xpForLevel(p.level);
  if (p.restedXp >= cap) { p.restedXp = cap; return; }
  if (!resting) return;
  p.restedXp = Math.min(cap, p.restedXp + (0.05 * xpForLevel(p.level)) / (8 * 60) * dt);
}
export { killShare, grantXp, canPrestige, tickRested };
