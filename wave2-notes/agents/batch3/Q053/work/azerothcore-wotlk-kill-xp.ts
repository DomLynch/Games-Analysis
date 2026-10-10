// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type Member = { id: string; level: number; alive: boolean; inReach: boolean };

export interface KillInput {
  killerId: string;
  inGroup: boolean;
  members: Member[];              // party members, the killer included
  victimLevel: number;
  victimElite: boolean;
  victimModExperience: number;    // creature template multiplier (data)
  victimModHealth: number;        // creature template health ratio; applied only when 0 <= x <= 0.75
  highestAttackerLevel: number;   // highest player level that damaged the victim (server-tracked)
  baseTier: number;               // content-tier base: 45, 235 or 580 (zone data)
  isRaid: boolean;
  killRate: number;               // world XP rate (engine constant)
  zeroDifference: (playerLevel: number) => number; // table lookup (engine constant)
}

export function grayLevel(pl: number): number {
  if (pl <= 5) return 0;
  if (pl <= 39) return pl - 5 - Math.floor(pl / 10);
  if (pl <= 59) return pl - 1 - Math.floor(pl / 5);
  return pl - 9;
}

export function groupRate(count: number, isRaid: boolean): number {
  if (isRaid) return 1.0;
  if (count <= 2) return 1.0;
  if (count === 3) return 1.166;
  if (count === 4) return 1.3;
  return 1.4;
}

// Base XP from the gap between player level and victim level.
export function baseGain(pl: number, mob: number, tier: number, zd: (pl: number) => number): number {
  if (mob >= pl) {
    const diff = Math.min(mob - pl, 4);
    return Math.floor((Math.floor((pl * 5 + tier) * (20 + diff) / 10) + 1) / 2);
  }
  if (mob > grayLevel(pl)) {
    const z = zd(pl);
    return Math.floor((pl * 5 + tier) * (z + mob - pl) / z);
  }
  return 0;
}

// Splits one kill's XP across the recipients. Returns recipient id -> XP (only non-zero entries).
export function shareKillXp(input: KillInput): Map<string, number> {
  const out = new Map<string, number>();
  const reach = input.inGroup
    ? input.members.filter(m => m.inReach || m.id === input.killerId)
    : input.members.filter(m => m.id === input.killerId);

  // Pass 1: group figures. Only living members count toward the rate and the basis level.
  let count = 0;
  let aliveSum = 0;
  let maxLevel = 0;
  let maxNotGray: Member | undefined;
  let maxNotGrayLevel = 0;
  if (input.inGroup) {
    for (const m of reach) {
      if (!m.alive) continue;
      count++;
      aliveSum += m.level;
      if (m.level > maxLevel) maxLevel = m.level;
      if (input.victimLevel > grayLevel(m.level) && (maxNotGray === undefined || m.level > maxNotGrayLevel)) {
        maxNotGray = m;
        maxNotGrayLevel = m.level;
      }
    }
  }
  const isFull = maxNotGray !== undefined && maxLevel === maxNotGrayLevel;

  // Pass 2: base XP. Group basis is the highest living member for whom the victim is not grey.
  let basisLevel: number;
  if (input.inGroup) {
    if (maxNotGray === undefined) return out; // nobody can take XP from a grey kill
    basisLevel = maxNotGrayLevel;
  } else {
    basisLevel = reach[0].level;
  }
  let base = baseGain(basisLevel, input.victimLevel, input.baseTier, input.zeroDifference);
  if (base > 0) {
    if (input.victimElite) base *= 2;
    base = Math.floor(base * input.victimModExperience * input.killRate);
    if (input.victimModHealth >= 0 && input.victimModHealth <= 0.75) base = Math.floor(base * input.victimModHealth);
  }
  if (base < 1) return out;

  // Pass 3: each recipient's share.
  const rate0 = input.inGroup ? groupRate(count, input.isRaid) : 1;
  for (const m of reach) {
    let xp = base;
    if (input.inGroup) {
      const eligible = m.alive && maxNotGray !== undefined && m.level <= maxNotGrayLevel;
      if (!eligible) continue;
      const rate = rate0 * m.level / aliveSum;
      xp = isFull ? Math.floor(base * rate) : Math.floor(base * rate / 2) + 1;
    }
    // Power-level guard: a kill that a higher-level attacker helped with is halved for the taggers.
    const referenceLevel = input.inGroup ? maxLevel : m.level;
    if (xp > 0 && input.highestAttackerLevel > referenceLevel && input.victimLevel <= grayLevel(input.highestAttackerLevel)) {
      xp = Math.floor(xp / 2) + 1;
    }
    if (xp > 0) out.set(m.id, xp);
  }
  return out;
}

// Adds XP with level-ups that carry the overflow; optional rested pool spent first.
export interface Progress { level: number; xp: number; restBonus: number; }

export function awardXp(
  p: Progress,
  gained: number,
  maxLevel: number,
  nextLevelXp: (level: number) => number,
  spendRest: boolean,
): Progress {
  if (gained < 1 || p.level >= maxLevel) return p;
  const spent = spendRest ? Math.min(Math.floor(p.restBonus), gained) : 0;
  let total = p.xp + gained + spent;
  let level = p.level;
  let next = nextLevelXp(level);
  while (total >= next && level < maxLevel) {
    total -= next;
    level += 1;
    next = nextLevelXp(level);
  }
  return { level, xp: total, restBonus: p.restBonus - spent };
}

export {};
