// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Row = { perKill: number; divisor: number };        // XP table row per level (values not read)
interface Member { id: string; level: number; alive: boolean; inReach: boolean; }
interface RestState { bonus: number; }                  // rested XP bank (points)

const RAID_GROUP_RATE = 0.99;

// Gray level: a mob at or below this level gives the player no XP.
function grayLevel(pl: number): number {
  if (pl < 7) return 0;
  if (pl < 35) {
    let count = 0;
    for (let i = 15; i <= pl; i++) if (i % 5 === 0) count++;
    return (pl - 7) - (count - 1);
  }
  return pl - 10;
}

// Base XP for one kill. A mob at or above the player's level gets +5% per level, capped at 4 levels.
// A lower mob scales down over the zero-difference span zd (table, passed in).
function baseGain(pl: number, mob: number, row: (lvl: number) => Row, zd: number): number {
  if (mob >= pl) {
    const diff = Math.min(mob - pl, 4);
    return Math.round(row(pl).perKill * (1 + 0.05 * diff));
  }
  if (mob <= grayLevel(pl)) return 0;
  const p = row(pl), m = row(mob);
  return Math.round(m.perKill * ((1 - (pl - mob) / zd) * (m.divisor / p.divisor)));
}

// Group multiplier on the one base XP, by alive members in reach. Raid uses a flat 0.99.
function groupRate(count: number, isRaid: boolean): number {
  if (isRaid) return RAID_GROUP_RATE;
  const table = [1.0, 1.0, 1.0, 1.166, 1.3, 1.4];   // index = min(count, 5)
  return table[Math.min(count, 5)];
}

// One kill split across a group. Base XP comes from the highest-level member the mob is not gray to.
// Each reachable member gets a share by level. Full XP only if that member is the group's top level;
// otherwise half. A member above the gray-cut level, or dead, gets 0.
function groupAwards(mob: number, members: Member[], row: (l: number) => Row, zd: number, isRaid: boolean): Map<string, number> {
  const share = members.filter(m => m.inReach && m.alive);
  const sumLevel = share.reduce((s, m) => s + m.level, 0);
  let maxLevel = 0;
  let maxNotGray: Member | null = null;
  for (const m of share) {
    maxLevel = Math.max(maxLevel, m.level);
    if (mob > grayLevel(m.level) && (maxNotGray === null || maxNotGray.level < m.level)) maxNotGray = m;
  }
  const out = new Map<string, number>();
  if (maxNotGray === null) return out;                  // every member is gray to the mob: no XP
  const base = baseGain(maxNotGray.level, mob, row, zd);
  const full = maxLevel === maxNotGray.level;
  const rate = groupRate(share.length, isRaid);
  for (const m of members) {
    if (!m.inReach) continue;
    let xp = 0;
    if (m.alive && maxNotGray.level >= m.level) {
      const s = rate * m.level / sumLevel;
      xp = full ? Math.floor(base * s) : Math.floor(base * s / 2) + 1;
    }
    out.set(m.id, xp);
  }
  return out;
}

// Rested XP is spent 1:1 on kill XP, up to the kill's own XP. The aura consumption modifier is not modelled.
function spendRested(xp: number, st: RestState): number {
  const bonus = Math.min(st.bonus, xp);
  st.bonus -= bonus;
  return Math.floor(bonus);
}

// Rest accrual: each update, a 3% roll gates the accrual. Elapsed time since the last accrual (at least 10 s)
// adds elapsed * nextLevelXp / 72000 * bubble. The bank is capped at 0.75 of nextLevelXp.
function restTick(st: RestState, nextLevelXp: number, elapsedS: number, bubble: number, gateRoll: boolean): void {
  if (!gateRoll || elapsedS < 10) return;
  const cap = nextLevelXp * 1.5 / 2;
  st.bonus = Math.min(cap, st.bonus + elapsedS * (nextLevelXp / 72000) * bubble);
}

// Level-up carry: XP above the threshold rolls into the next level. Nothing is kept at max level.
function giveXp(hero: { level: number; xp: number; maxLevel: number }, gain: number, rested: number, nextLevelXp: (lvl: number) => number): void {
  if (hero.level >= hero.maxLevel) return;
  let newXp = hero.xp + gain + rested;
  let next = nextLevelXp(hero.level);
  while (newXp >= next && hero.level < hero.maxLevel) {
    newXp -= next;
    hero.level += 1;
    next = nextLevelXp(hero.level);
  }
  hero.xp = newXp;
}

export {};
