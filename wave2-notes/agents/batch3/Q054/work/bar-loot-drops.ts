// Licence: GNU GPL v2 or later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type Tier = 1 | 2 | 3 | 4;

export interface DropPool {
  aliveByTier: Record<Tier, number>; // live drops per tier, counted from the server ledger
  teamsMinusOne: number;             // donor divides by (#teams - 1); we pass the player-side count
}

export interface DropRollData {
  promoteCap: number;                // donor 0.8
  promotePerLower: number;           // donor 0.4
  rand: () => number;                // injected so a test can seed it
}

// Donor order: test tier 4 first (chance from live tier-3 drops), then tier 3 (from tier-2), then tier 2 (from tier-1); else tier 1.
export function rollDropTier(pool: DropPool, d: DropRollData): Tier {
  const chance = (aliveBelow: number): number =>
    Math.min(d.promoteCap, (aliveBelow * d.promotePerLower) / pool.teamsMinusOne);
  if (d.rand() < chance(pool.aliveByTier[3])) return 4;
  if (d.rand() < chance(pool.aliveByTier[2])) return 3;
  if (d.rand() < chance(pool.aliveByTier[1])) return 2;
  return 1;
}

export type Relation = 'ally' | 'enemy' | 'gaia';
export interface Nearby { metalCost: number; relation: Relation; }
export interface Capture { progress: number; owner: string; }

// One capture step for one drop; the caller runs it once per 30 frames with the units inside the radius.
export function captureStep(
  c: Capture,
  nearby: Nearby[],
  difficulty: number,
  nearestEnemyTeam: string | null,
): Capture {
  let delta = 0;
  for (const n of nearby) {
    const power = ((n.metalCost / 1000) * 0.01) / difficulty;
    if (n.relation === 'ally') delta -= power;
    else if (n.relation === 'enemy') delta += power;
  }
  if (delta === 0) return c;
  const next = c.progress + delta;
  if (next < 0) return { progress: 0, owner: c.owner };
  if (next >= 1) {
    if (nearestEnemyTeam === null) return c; // donor: no enemy in range, the meter is left as it was
    return { progress: 0.75, owner: nearestEnemyTeam };
  }
  return { progress: next, owner: c.owner };
}
