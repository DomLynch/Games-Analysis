// Licence: GPL-3.0 (donor LICENSE.txt). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface HeroXp {
  level: number;
  xp: number;
  blessUntil: number;        // ms timestamp until which the cap buff runs
}

interface MobXp {
  xp: number;                // XP the mob is worth (donor: Mob.EXP)
  maxLevel: number;          // highest hero level that still earns this mob's XP (donor: Mob.maxLvl)
}

interface Meter {
  charge: number;
  softCap: number;           // charge above this slows XP-fed charge (donor: 5 + 2 x item level)
  partial: number;           // fractional charge not yet converted
}

const MAX_LEVEL = 30;        // donor: Hero.MAX_LEVEL

// XP needed to clear the current level (donor: maxExp(lvl) = 5 + 5 x lvl)
function xpToNext(level: number): number {
  return 5 + 5 * level;
}

// Kill XP: a hard cutoff. Above the mob's max level the kill gives nothing.
function killXp(hero: HeroXp, mob: MobXp): number {
  return hero.level <= mob.maxLevel ? mob.xp : 0;
}

// Gain XP: carry the excess through every level it clears; at the cap the excess is dropped and a buff is added.
// Returns the fraction of the current level bar this gain filled, for XP-fed meters.
function earnXp(hero: HeroXp, amount: number, now: number, blessMs: number): number {
  const fraction = amount / xpToNext(hero.level);
  hero.xp += amount;
  while (hero.xp >= xpToNext(hero.level)) {
    hero.xp -= xpToNext(hero.level);
    if (hero.level < MAX_LEVEL) {
      hero.level += 1;
    } else {
      hero.blessUntil = Math.max(hero.blessUntil, now) + blessMs; // simplified: extend from now or from current expiry
      hero.xp = 0;
    }
  }
  return fraction;
}

// Feed an XP fraction into a meter; above the soft cap the same fraction charges less.
function feedMeter(m: Meter, fraction: number): void {
  let f = fraction;
  if (m.charge > m.softCap) f *= m.softCap / m.charge;
  m.partial += f * 6;        // donor: partialCharge += levelPortion * 6
}

export {}
