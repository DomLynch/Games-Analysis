// Licence: GPL-3.0 (donor, COPYING). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Rng = (n: number) => number; // integer in [0, n)

interface Pos { x: number; y: number; }

interface Mob extends Pos {
  id: string;
  hp: number;
  asleep: boolean;
  canTeleport: boolean;
  canRanged: boolean;
  canSleep: boolean;
}

type Action = "teleport" | "ranged" | "castSleep" | "flee" | "attack" | "advance";

interface Plan { action: Action; target: Mob; d: number; }

const FLEE_FLOOR_HP = 24; // absolute floor, not a fraction of the creature's maximum

// Manhattan distance: one unit per axis step, so a diagonal neighbour is 2.
function manhattan(a: Pos, b: Pos): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

// Action roll, in the donor's order. Returns null when a sleeping creature stays asleep this round.
function chooseAction(m: Mob, rng: Rng): Action | null {
  if (m.asleep) {
    if (rng(8) !== 0) return null; // 7 in 8: still asleep, no action
    m.asleep = false;               // wakes, then acts this round
  }
  if (m.canTeleport && rng(8) === 0) return "teleport";
  if (m.canRanged && rng(4) === 0) return "ranged";
  if (m.canSleep && rng(4) === 0) return "castSleep";
  if (m.hp < FLEE_FLOOR_HP) return "flee";
  return "attack";
}

// Nearest foe. Each later tie replaces the current pick with probability 1/2, so ties are not uniform.
function nearestFoe(foes: Mob[], dist: (a: Pos, b: Pos) => number, from: Pos, rng: Rng): { foe: Mob; d: number } | null {
  let best: Mob | null = null;
  let bestD = 0xffff;
  for (const f of foes) {
    const d = dist(from, f);
    if (d < bestD || (d === bestD && rng(2) === 0)) { best = f; bestD = d; }
  }
  return best === null ? null : { foe: best, d: bestD };
}

// One creature's decision for the round. Melee that is more than one step away becomes an advance.
function plan(m: Mob, foes: Mob[], rng: Rng, dist: (a: Pos, b: Pos) => number, rangedDist: (a: Pos, b: Pos) => number): Plan | null {
  const action = chooseAction(m, rng);
  if (action === null) return null;
  const pick = nearestFoe(foes, action === "ranged" ? rangedDist : dist, m, rng);
  if (pick === null) return null;
  if (action === "attack" && pick.d > 1) return { action: "advance", target: pick.foe, d: pick.d };
  return { action, target: pick.foe, d: pick.d };
}

// Round: every creature acts once, in list order. A creature removed earlier in the round is skipped.
function creatureRound(
  mobs: Mob[],
  foes: Mob[],
  rng: Rng,
  dist: (a: Pos, b: Pos) => number,
  rangedDist: (a: Pos, b: Pos) => number,
  execute: (m: Mob, p: Plan) => void
): void {
  for (const m of [...mobs]) {
    if (!mobs.includes(m)) continue;
    const p = plan(m, foes, rng, dist, rangedDist);
    if (p !== null) execute(m, p);
  }
}
