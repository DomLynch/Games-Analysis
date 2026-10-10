// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Fighter {
  id: number;
  level: number;        // character level
  rank: number;         // realm level, 0..130 (donor RealmLevel)
  alive: boolean;
  distance: number;     // distance to the victim at the kill (donor IsWithinRadius, MAX_EXPFORKILL_DISTANCE)
  groupSize: number;    // size of the fighter's group (1 = solo)
  groupNear: number;    // group members within range of the victim (counted by the caller)
}

interface Victim extends Fighter {
  deathPlayedS: number; // play time at last death
  playedS: number;      // play time now
}

interface RpCfg {
  worthWindowS: number;   // 300 (donor RP_WORTH_SECONDS)
  maxRange: number;       // 16384 (donor MAX_EXPFORKILL_DISTANCE)
  deadShare: number;      // 0.25
  rankGapCoeff: number;   // 2 (donor 1 + 2 * gap / 900)
  rankGapScale: number;   // 900
  groupStep: number;      // 0.125 per group member near
  capMultiple: number;    // 2: award cannot exceed 2 x the fighter's own worth
  rankTable: number[];    // donor REALMPOINTS_FOR_LEVEL, passed in as data
}

// Worth of a player as a victim (donor GamePlayer.RealmPointsValue): level above 20 squared plus 5 per (rank + 10).
function worth(f: Fighter): number {
  const lv = Math.max(0, f.level - 20);
  return Math.max(1, lv * lv + (f.rank + 10) * 5);
}

// Awards by damage share. damage: attacker id -> damage dealt to the victim.
function rpAwards(v: Victim, damage: Map<number, number>, fighters: Map<number, Fighter>, cfg: RpCfg): Map<number, number> {
  const out = new Map<number, number>();
  // Victim died inside the worth window (play time): nobody is paid.
  if (v.deathPlayedS + cfg.worthWindowS > v.playedS) return out;

  let total = 0;
  for (const d of damage.values()) total += d;
  if (total <= 0) return out;   // the sketch guards this; the donor divides and does not check

  const value = worth(v);
  for (const [id, dealt] of damage) {
    const f = fighters.get(id);
    if (!f || f.distance > cfg.maxRange) continue;

    let share = dealt / total;
    if (!f.alive) share *= cfg.deadShare;

    const cap = worth(f) * cfg.capMultiple;
    let rp = Math.trunc(value * share);
    rp = Math.trunc(rp * (1 + cfg.rankGapCoeff * (v.rank - f.rank) / cfg.rankGapScale));
    if (f.groupSize > 1) rp = Math.trunc(rp * (1 + f.groupNear * cfg.groupStep));
    rp = Math.min(rp, cap);
    if (rp > 0) out.set(id, rp);
  }
  return out;
}

// Rank from total points: highest index whose threshold is <= points (donor CalculateRealmLevelFromRPs).
function rankFromPoints(points: number, table: number[]): number {
  if (points === 0) return 0;
  let i = table.length - 1;
  for (; i > 0; i--) if (table[i] <= points) break;
  return i;
}

// Gain: add points, then climb while the next threshold is met, capped at the last table index (donor GainRealmPoints loop).
function gainPoints(p: { points: number; rank: number }, amount: number, table: number[]): void {
  p.points += amount;
  while (p.rank < table.length - 1 && p.points >= table[p.rank + 1]) p.rank++;
}

// Specialty budget (donor RealmSpecialtyPoints): rank, floored at 1 from character level 20, minus spent points.
function specialtyBudget(f: Fighter, spentCost: number): number {
  const base = f.level > 19 ? Math.max(1, f.rank) : f.rank;
  return base - spentCost;
}
export {};
