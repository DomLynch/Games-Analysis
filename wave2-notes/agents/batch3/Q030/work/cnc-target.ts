// Licence: GPL-3.0-or-later with EA section 7 additional terms (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Candidate {
  id: number;
  active: boolean;       // donor: Target_Legal -> IsActive
  worth: number;         // donor: TechnoClass::Value (risk + reward + attached contents)
  kills: number;         // donor: CrewClass Kills added to the score
  ownerIsEnemy: boolean; // donor: House->Enemy == object's house (RA AI block)
  distCells: number;     // whole cells from the attacker (donor divides by 256 leptons)
}

export interface AiConfig {
  scale: number;          // 32000 in donor (falloff numerator)
  enemyBonus: number;     // 500 in donor
  enemyMul: number;       // 3 in donor
  worthFloor: number;     // 2 in donor (minimum for objects with worth)
  maxTies: number;        // 128 in donor
  retargetTicks: number;  // TICKS_PER_SECOND + 5 = 20 in donor (15 ticks per second)
}

export const DONOR_AI: AiConfig = {
  scale: 32000, enemyBonus: 500, enemyMul: 3, worthFloor: 2, maxTies: 128, retargetTicks: 20,
};

// Score one candidate the way the full-map scan does: worth plus kills, enemy bonus, then distance falloff.
export function scoreCandidate(c: Candidate, cfg: AiConfig): number {
  let v = c.worth + c.kills;
  if (c.ownerIsEnemy) v = (v + cfg.enemyBonus) * cfg.enemyMul;
  if (v !== 0) v = Math.trunc((v * cfg.scale) / (c.distCells + 1));
  if (c.worth > 0) v = Math.max(v, cfg.worthFloor);
  return v;
}

// Full-map pick: highest score wins; equal best scores are kept (capped) and one is chosen at random.
export function pickTarget(cands: Candidate[], cfg: AiConfig, rnd: () => number): number | null {
  let best = -1;
  let ties: Candidate[] = [];
  for (const c of cands) {
    if (!c.active) continue;
    const v = scoreCandidate(c, cfg);
    if (v > best) {
      best = v;
      ties = [c];
    } else if (v === best && ties.length < cfg.maxTies) {
      ties.push(c);
    }
  }
  if (ties.length === 0) return null;
  const chosen = ties.length === 1 ? ties[0] : ties[Math.floor(rnd() * ties.length)];
  return chosen.id;
}

// Hysteresis: keep the current target while it is still active; re-pick only when it is not.
export function keepOrRetarget(current: number | null, cands: Candidate[], cfg: AiConfig, rnd: () => number): number | null {
  if (current !== null) {
    const kept = cands.find((c) => c.id === current);
    if (kept && kept.active) return current;
  }
  return pickTarget(cands, cfg, rnd);
}

export {};
