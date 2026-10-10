// Licence: GPL-3.0 (donor, OpenDAoC LICENSE). Clean-room sketch of the mechanism, not a translation of the donor.
interface Entity {          // a player, or a group, that gained credit for the kill
  count: number;            // members in range (zero-damage members included)
  damage: number;           // damage dealt by this entity
}

interface Victim {
  level: number;
  realmLevel: number;
  playedSinceLastDeath: number;   // seconds, measured before the death stamp is set
  totalDamageTaken: number;       // all attackers, including those out of range
}

interface Awardee {
  level: number;
  realmLevel: number;
  battlegroundCapRealmLevel: number | null;  // null outside a battleground
}

interface RpRules {         // engine constants and zone data; donor values in comments
  worthSeconds: number;     // RP_WORTH_SECONDS, 300
  levelGapDivisor: number;  // 900 (donor literal)
  groupStep: number;        // 0.125 (donor literal)
  rateModifier: number;     // RP_RATE, 1.0
  capFactor: number;        // 2 (donor literal)
  rankTable: number[];      // cumulative RP per realm level; donor table has 131 entries
}

// Realm-point value of a victim (donor RealmPointsValue).
function victimValue(v: Victim): number {
  const modified = v.level - 20;
  return Math.max(1, modified * modified) + v.realmLevel;
}

// Awardee's own value, used for the cap (donor CalculateRpCap: RealmPointsValue * 2).
function awardeeValue(a: Awardee): number {
  const modified = a.level - 20;
  return Math.max(1, modified * modified) + a.realmLevel;
}

// Realm points for one awardee, from the kill's entity stats. Integer steps are truncated as in the donor.
function rpForAwardee(a: Awardee, v: Victim, e: Entity, rules: RpRules): number {
  if (v.playedSinceLastDeath < rules.worthSeconds) return 0;

  const share = Math.min(1, e.damage / v.totalDamageTaken);
  let base = Math.floor(victimValue(v) / e.count);
  base = Math.min(base, awardeeValue(a) * rules.capFactor);

  let rp = Math.floor(base * share);
  if (a.battlegroundCapRealmLevel === null || a.realmLevel < a.battlegroundCapRealmLevel) {
    rp = Math.floor(rp * (1 + (2 * (v.realmLevel - a.realmLevel)) / rules.levelGapDivisor));
  }
  rp += Math.floor(rp * (e.count - 1) * rules.groupStep);
  return Math.floor(rp * rules.rateModifier);
}

// Cumulative table walk, one rank step at a time (donor GainRealmPoints loop).
function realmLevelFor(total: number, rules: RpRules, current: number): number {
  let level = current;
  while (level < rules.rankTable.length - 1 && total >= rules.rankTable[level + 1]) level += 1;
  return level;
}

// Rank number as the donor shows it: level 0-9 is rank 1, and so on.
function rankOf(realmLevel: number): number {
  return Math.floor(realmLevel / 10) + 1;
}

export {}
