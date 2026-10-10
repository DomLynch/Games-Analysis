// Licence of donor: GPL version 2 (copyleft). Clean-room: written from the described rule, not translated.
const UNIT = 1024;            // rate units per point of damage
const KILL_SCORE = 200;       // flat bonus per kill, in points
const BAD_TURN = -536870912;  // no-go value

interface Mark {
  side: "ally" | "enemy";
  hp: number;   // remaining health before this action
  dmg: number;  // damage this action would deal to it (0 if none)
}

// Weight of a hit on an ally, in percent. allies and enemies are living counts, excluding the actor.
function friendlyFactor(allies: number, enemies: number): number {
  if (enemies > allies) return 300 + (enemies - allies) * 30;
  return Math.max(30, 300 - Math.floor((allies * 80) / Math.max(1, enemies)));
}

// Rate one aim point: enemy hits add value, ally hits subtract value scaled by the factor.
function rateAim(marks: Mark[], allies: number, enemies: number): number {
  const ff = friendlyFactor(allies, enemies);
  let rate = 0;
  for (const m of marks) {
    if (m.dmg <= 0) continue;
    const killed = m.dmg >= m.hp;
    if (m.side === "enemy") {
      rate += killed ? KILL_SCORE * UNIT + m.dmg : m.dmg * UNIT;
    } else {
      rate -= killed
        ? Math.floor((KILL_SCORE * ff) / 100) * UNIT
        : Math.floor((m.dmg * ff) / 100) * UNIT;
    }
  }
  return rate;
}

// Keep the best candidate. Once the best is non-negative, a challenger must beat it by a margin set by bot level.
function pickBest<T extends { rate: number }>(cands: T[], botLevel: number): T | null {
  let best: T | null = null;
  for (const c of cands) {
    if (c.rate <= BAD_TURN) continue;
    if (best === null) { best = c; continue; }
    if (c.rate > best.rate && (best.rate < 0 || c.rate > best.rate + (botLevel - 1) * 2048)) best = c;
  }
  return best;
}

export {};
