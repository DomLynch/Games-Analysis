// Licence: GPL-2.0 (donor option a; the donor is also offered under the Angband licence). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Rng = () => number; // uniform in [0, 1)
const randint1 = (n: number, rng: Rng): number => 1 + Math.floor(rng() * n); // 1..n
const randint0 = (n: number, rng: Rng): number => Math.floor(rng() * n);     // 0..n-1

interface Race { level: number; hearing: number; smell: number; } // per-race row fields
interface Mon {
  race: Race;
  hp: number;
  maxHp: number;
  morale: number; // 0 or 8 in the donor (from the index bit); the fix seeds it per creature
  fear: number;   // turns of fear left
  canBeScared: boolean; // donor monster_can_be_scared gates the new-fear branch
  hold: number;   // turns held still
}
interface Player { level: number; hp: number; maxHp: number; stealth: number; }

const FLEE_RANGE = 25; // max sight 20 + flee-range 5 (constants.txt)
const TURN_RANGE = 5;  // a monster that is NOT running and is closer than this stays at min range 1 (constants.txt)

// Run decision: an afraid monster runs at any distance; otherwise the monster runs when the player is
// clearly stronger (level, then level and health cross-multiplied). Distance does NOT exempt a monster
// that fails the power check (the donor sets min_range = flee_range before the turn-range test).
function runsFromPlayer(m: Mon, p: Player): boolean {
  if (m.fear > 0) return true;
  const mLev = m.race.level + m.morale + 25;
  if (mLev + 3 < p.level) return true;
  if (mLev - 5 < p.level) {
    const pVal = p.level * p.maxHp + 4 * p.hp;
    const mVal = mLev * m.maxHp + 4 * m.hp;
    return pVal * m.maxHp > mVal * p.maxHp;
  }
  return false;
}

// Damage can cut existing fear, or cause fear. HP is already reduced when this runs (donor order).
function onDamage(m: Mon, dam: number, rng: Rng): void {
  if (dam <= 0 || m.hp <= 0) return;
  if (m.fear > 0) {
    const tmp = randint1(dam, rng);
    if (tmp < m.fear) m.fear -= tmp; else m.fear = 0;
    return;
  }
  if (!m.canBeScared) return;
  const pct = Math.floor((100 * m.hp) / m.maxHp);
  const lowHp = randint1(10, rng) >= pct;            // runs sometimes at 10% or less
  const bigHit = dam >= m.hp && randint0(100, rng) < 80; // usually when the hit takes half of what was left
  if (lowHp || bigHit) {
    let time = randint1(10, rng);
    time += dam >= m.hp && pct > 7 ? 20 : (11 - pct) * 5;
    m.fear = time;
  }
}

// For a monster that is not running: close monsters drop min range to 1 (undoing the +3 range bumps).
function minRangeWhenNotRunning(dist: number, bumpedMinRange: number): number {
  return dist < TURN_RANGE ? 1 : bumpedMinRange;
}

// Afraid and no move possible this turn: the fear turns into a hold of the same length.
function onNoMove(m: Mon): void {
  if (m.fear > 0) { m.hold += m.fear; m.fear = 0; }
}

// Tracking: sight first, then the quieter-to-louder noise field, then the scent.
// Returns -1 to go straight at the player, an index into nbrs, or null (no track).
interface Field { noise: (cell: number) => number; scent: (cell: number) => number; }
function trackStep(m: Mon, p: Player, inView: boolean, cell: number, nbrs: number[], f: Field): number | null {
  if (inView) return -1;
  const base = m.race.hearing - Math.floor(p.stealth / 3);
  const here = f.noise(cell);
  if (here !== 0 && base > here) {
    const cur = base - here;
    for (let i = 0; i < nbrs.length; i++) {
      const n = nbrs[i];
      if (f.noise(n) === 0) continue;
      if (base - f.noise(n) > cur) return i; // first better neighbour, as in the donor
    }
  }
  if (f.scent(cell) !== 0 && m.race.smell > f.scent(cell)) {
    let best = -1, bestS = 0;
    for (let i = 0; i < nbrs.length; i++) {
      const sc = f.scent(nbrs[i]);
      const s = m.race.smell - sc;
      if (sc !== 0 && s > bestS) { bestS = s; best = i; }
    }
    if (best >= 0) return best;
  }
  return null;
}

// Pack rule: with fewer than 5 open neighbours around the player and the player above half HP,
// a pack member takes an ambush spot out of sight instead of charging.
function packAmbush(openNeighbours: number, pHp: number, pMaxHp: number): boolean {
  return openNeighbours < 5 && pHp > Math.floor(pMaxHp / 2);
}
function ambushMinDistance(distToPlayer: number): number {
  return Math.floor(distToPlayer * 3 / 4) + 2;
}

// Flee destination score: far from the flee target, and not next to the player (swerve).
function fleeScore(distToTarget: number, noiseAtCell: number): number {
  const s = Math.floor(5000 / (distToTarget + 3)) - Math.floor(500 / (noiseAtCell + 1));
  return s < 0 ? 0 : s;
}

export {};
