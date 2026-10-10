// Licence: AGPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Mode = "even" | "proportional" | "none";

interface Attacker {
  id: string;
  credit: number; // absolute damage credit
}

interface Fellow {
  id: string;
  level: number;
  xpToNext: number;            // XP from this level to the next (the donor reads this from the client XP table)
  dist: number;                // distance to the earner, game units
  sameIndoorState: boolean;    // both indoors or both outdoors
  indoorLandblockOk: boolean;  // false when both are indoors in different landblocks
}

// Kill XP: the kill's XP times each attacker's share of total credit. Shares are ratios, so a uniform scale leaves them unchanged.
function killXpShares(xpOverride: number, attackers: Attacker[]): Map<string, number> {
  const out = new Map<string, number>();
  const total = attackers.reduce((sum, a) => sum + a.credit, 0);
  if (total === 0) return out; // donor: no kill XP when total credit is zero
  for (const a of attackers) out.set(a.id, Math.round(xpOverride * (a.credit / total)));
  return out;
}

// Heal: every attacker's credit is scaled by the same factor, 1 - heal / missing-before-heal.
function healCredits(attackers: Attacker[], heal: number, currentAfterHeal: number, max: number): void {
  const missingBefore = max - (currentAfterHeal - heal);
  if (heal === 0 || missingBefore === 0) return;
  const scalar = 1 - heal / missingBefore;
  for (const a of attackers) a.credit *= scalar;
}

// Share mode from the level band. Even share if every fellow is at or above evenShareLevel; otherwise the band is measured from the leader.
function shareMode(levels: number[], leaderLevel: number | undefined, previous: Mode, evenShareLevel = 50): Mode {
  if (levels.every((l) => l >= evenShareLevel)) return "even";
  if (leaderLevel === undefined) return previous; // donor: no online leader, keep the old flags
  const maxDiff = Math.max(...levels.map((l) => Math.abs(leaderLevel - l)));
  if (maxDiff <= 5) return "even";
  if (maxDiff <= 10) return "proportional";
  return "none";
}

// Share percent by fellowship size (donor table for 1..9; 1.0 above 9).
function memberSharePercent(count: number): number {
  const table: Record<number, number> = { 1: 1.0, 2: 0.75, 3: 0.6, 4: 0.55, 5: 0.5, 6: 0.45, 7: 0.4, 8: 0.35, 9: 0.3 };
  return table[count] ?? 1.0;
}

// Distance scalar: 1 inside maxD, linear fall to 0 at 2 x maxD, 0 across indoor/outdoor or blocked landblocks.
function distanceScalar(f: Fellow, maxD = 600): number {
  if (!f.sameIndoorState || !f.indoorLandblockOk) return 0;
  if (f.dist >= maxD * 2) return 0;
  if (f.dist <= maxD) return 1;
  return Math.max(0, 1 - (f.dist - maxD) / maxD);
}

// Split one earned amount across the fellowship. The count for the share percent includes every fellow, in range or not.
function splitXp(amount: number, mode: Mode, fellows: Fellow[]): Map<string, number> {
  const out = new Map<string, number>();
  if (mode === "none") return out; // donor: GrantXP does not call the split when sharing is off
  if (mode === "even") {
    const total = Math.round(amount * memberSharePercent(fellows.length)); // donor rounds the total before the per-member scalar
    for (const f of fellows) out.set(f.id, Math.round(total * distanceScalar(f)));
    return out;
  }
  const sum = fellows.reduce((s, f) => s + f.xpToNext, 0);
  for (const f of fellows) out.set(f.id, Math.round(amount * (f.xpToNext / sum) * distanceScalar(f)));
  return out;
}

export {};
