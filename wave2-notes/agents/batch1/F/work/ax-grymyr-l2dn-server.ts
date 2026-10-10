// Licence: MIT (donor, L2Dn/LICENSE.txt). Clean sketch written from the mechanism, not a translation of the donor lines.
export interface Attacker {
  id: string;
  level: number;
  damage: number;          // damage this attacker dealt to the monster
  inRange: boolean;        // inside the party range at the kill
  overhit: boolean;        // this attacker landed the over-hit strike
  servitorPenalty: number; // >= 1; reduces the owner's share when a servitor is out
}

export interface Monster { level: number; xpReward: number; maxHp: number; overhitDamage: number; }

const LEVEL_GAP_CUTOFF = 14;     // a monster more than 14 levels below the attacker gives nothing
const OVERHIT_CAP_PERCENT = 25;  // over-hit bonus is capped at 25% of the XP
const PARTY_CUTOFF_LEVEL = 20;   // party members more than 20 levels below the top level get no share

// Solo: damage share of the reward, zero beyond the level gap, then servitor penalty, then over-hit bonus.
export function soloXp(m: Monster, a: Attacker, totalDamage: number): number {
  if (a.damage <= 1 || !a.inRange) return 0;
  if (a.level - m.level > LEVEL_GAP_CUTOFF) return 0;
  let xp = Math.max(0, (m.xpReward * a.damage) / totalDamage);
  xp *= a.servitorPenalty;
  if (a.overhit) {
    const pct = Math.min(OVERHIT_CAP_PERCENT, (m.overhitDamage * 100) / m.maxHp);
    xp += (pct / 100) * xp;
  }
  return xp;
}

// Party: the party's damage share of the reward is the pool; the top member level sets the gap check.
export function partyPool(m: Monster, members: Attacker[], totalDamage: number): { pool: number; topLevel: number } {
  const counted = members.filter((x) => x.inRange && x.damage > 1);
  const partyDmg = counted.reduce((s, x) => s + x.damage, 0);
  const topLevel = counted.reduce((t, x) => Math.max(t, x.level), 0);
  if (partyDmg <= 0 || topLevel - m.level > LEVEL_GAP_CUTOFF) return { pool: 0, topLevel };
  return { pool: Math.max(0, (m.xpReward * partyDmg) / totalDamage), topLevel };
}

// Split the pool by level squared among members inside the cutoff (weights sum over those members only).
export function splitPool(pool: number, members: Attacker[], topLevel: number): Map<string, number> {
  const valid = members.filter((x) => topLevel - x.level <= PARTY_CUTOFF_LEVEL);
  const sqSum = valid.reduce((s, x) => s + x.level * x.level, 0);
  const out = new Map<string, number>();
  if (sqSum <= 0) return out;
  for (const x of valid) {
    out.set(x.id, pool * ((x.level * x.level) / sqSum) * x.servitorPenalty);
  }
  return out;
}

// Level from total XP. Exp is capped one below the max-level threshold, as the donor does.
export function levelFor(exp: number, expForLevel: (lvl: number) => number, maxLevel: number, minLevel = 1): number {
  const capped = Math.min(exp, expForLevel(maxLevel) - 1);
  let level = minLevel;
  for (let tmp = minLevel; tmp <= maxLevel; tmp++) {
    if (capped >= expForLevel(tmp)) continue;
    level = tmp - 1;
    break;
  }
  return level;
}
