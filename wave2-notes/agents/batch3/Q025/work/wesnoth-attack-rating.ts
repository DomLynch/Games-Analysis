// Licence of donor: GPL-2.0-or-later. Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface AttackOption {
  targetId: string;
  attackers: string[];          // ordered; attackers[0] moves and strikes first
  surrounded: boolean;          // the first attacker is boxed in
  targetValue: number;          // cost of the target, grown by its experience fraction
  chanceToKill: number;         // 0..1
  expectedLoss: number;         // sum of attacker cost x probability that attacker dies
  damageDealt: number;          // expected hp removed from the target
  damageTaken: number;          // expected hp our attackers lose
  targetStartingDamage: number; // hp the target already lacks
  resourcesUsed: number;        // sum of attacker costs
  exposure: number;             // precomputed terrain exposure (0 when not applicable)
  vulnerability: number;        // enemy power that can reach our tiles
  support: number;              // our power on those tiles
  terrainQuality: number;       // 0..1
  leaderThreat: boolean;        // target stands next to an enemy leader
  usesLeader: boolean;          // the attacking set includes our leader
}

const MAX_ATTACKERS = 3;        // Frankendom ruling (the donor enumerates up to 5)
const SIDE_AGGRESSION = 0.4;    // zone data default; donor default_config aggression
const LEADER_AGGRESSION = -4.0; // zone data default; donor default_config leader_aggression

function effectiveAggression(o: AttackOption, side: number, leader: number): number {
  let a = side;
  if (o.leaderThreat) a = 1.0;
  if (o.usesLeader) a = leader;
  return a;
}

// Returns a rating for one option. Negative means "veto" (the donor returns -1 for the sanity check).
function rate(o: AttackOption, aggression: number): number {
  const lossWeight = 1.0 - aggression;
  let value = o.chanceToKill * o.targetValue - o.expectedLoss * lossWeight;
  value -= o.exposure * lossWeight;
  value += ((o.targetStartingDamage / 3 + o.damageDealt) - lossWeight * o.damageTaken) / 10.0;

  if (!o.surrounded || (o.support !== 0 && o.damageTaken !== 0)) {
    if (o.vulnerability > 50.0 && o.vulnerability > o.support * 2.0 &&
        o.chanceToKill < 0.02 && aggression < 0.75) {
      return -1.0;
    }
  }
  if (!o.leaderThreat && o.vulnerability * o.terrainQuality > 0.0 && o.support !== 0) {
    value *= o.support / (o.vulnerability * o.terrainQuality);
  }
  value /= (o.resourcesUsed / 2) + (o.resourcesUsed / 2) * o.terrainQuality;
  if (o.leaderThreat) value *= 5.0;
  return value;
}

// Pick the best option over all candidates; commit only if its rating is above zero.
function choose(options: AttackOption[], side = SIDE_AGGRESSION, leader = LEADER_AGGRESSION):
    { mover: string; targetId: string; rating: number } | null {
  let best: AttackOption | null = null;
  let bestRating = -1000;
  for (const o of options) {
    if (o.attackers.length === 0 || o.attackers.length > MAX_ATTACKERS) continue;
    const r = rate(o, effectiveAggression(o, side, leader));
    if (r > bestRating) { best = o; bestRating = r; }
  }
  if (best === null || bestRating <= 0) return null;
  // Only the first attacker moves and strikes now; the rest is re-planned next pass.
  return { mover: best.attackers[0], targetId: best.targetId, rating: bestRating };
}
export {};
