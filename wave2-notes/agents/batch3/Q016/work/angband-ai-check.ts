// Licence: GNU GPL v2 or the "Angband licence" (donor header, src/mon-move.c, dual licence). clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Cell = { x: number; y: number };
interface Race { hearing: number; smell: number; level: number; neverMove: boolean; neverBlow: boolean; frightened: boolean; passesWalls: boolean; }
interface Mon { grid: Cell; hp: number; maxhp: number; level: number; morale: number; race: Race; asleep: number; fear: number; aware: boolean; dist: number; minRange: number; }
interface Player { grid: Cell; lev: number; chp: number; mhp: number; stealth: number; taunted: boolean; }
interface Field { noise(c: Cell): number; scent(c: Cell): number; inView(c: Cell): boolean; }

const MAX_SIGHT = 20;              // data: player:max-sight (lib/gamedata/constants.txt)
const FLEE_RANGE = MAX_SIGHT + 5;  // data: max-sight + flee-range (mon-play:flee-range = 5)
const TURN_RANGE = 5;              // data: mon-play:turn-range

// Can the monster hear the player? Noise is a walk distance from the player (0 = none).
function canHear(m: Mon, p: Player, f: Field): boolean {
  const base = m.race.hearing - Math.trunc(p.stealth / 3);
  const n = f.noise(m.grid);
  return n !== 0 && base > n;
}

function canSmell(m: Mon, f: Field): boolean {
  const s = f.scent(m.grid);
  return s !== 0 && m.race.smell > s;
}

// Activity gate: a monster takes turns only when it can sense the player or is hurt.
function isActive(m: Mon, p: Player, f: Field, terrainHurts: boolean): boolean {
  if (m.dist <= m.race.hearing && m.race.passesWalls) return true;
  if (m.hp < m.maxhp) return true;
  if (f.inView(m.grid)) return true;
  if (canHear(m, p, f)) return true;
  if (canSmell(m, f)) return true;
  return terrainHurts;
}

// Sleep: a sleeping monster does not act. Each turn a stealth-based roll may drain sleep;
// the drain is 100 / noise when the monster is 1..49 walk-steps from the player, else 1.
function reduceSleep(m: Mon, p: Player, f: Field, rnd: () => number): void {
  const notice = Math.floor(rnd() * 1024);
  const playerNoise = Math.pow(2, 30 - p.stealth);
  if (notice * notice * notice > playerNoise) return;
  const n = f.noise(m.grid);
  let drain = 1;
  if (n > 0 && n < 50) drain = Math.trunc(100 / n);
  m.asleep = Math.max(0, m.asleep - drain); // donor clamp not read; the sketch clamps at zero
}

// Fight-or-flee: the monster's minimum range. FLEE_RANGE means it runs. Taunt returns early (donor).
function findMinRange(m: Mon, p: Player): number {
  if (m.fear > 0 || m.race.frightened) return FLEE_RANGE; // afraid: always runs
  if (p.taunted) return 1;                                // donor returns before best_range is set
  let r = 1;
  const mLev = m.race.level + m.morale + 25;
  if (mLev + 3 < p.lev) {
    r = FLEE_RANGE; // much weaker than the player
  } else if (mLev - 5 < p.lev) {
    // (player level + 4 x hp fraction) vs (monster level + 4 x hp fraction), cross-multiplied
    const pVal = p.lev * p.mhp + 4 * p.chp;
    const mVal = mLev * m.maxhp + 4 * m.hp;
    if (pVal * m.maxhp > mVal * p.mhp) r = FLEE_RANGE;
  }
  if (r < FLEE_RANGE) {
    if (m.race.neverMove) r += 3;
    if (m.race.neverBlow) r += 3;
    if (m.dist < TURN_RANGE) r = 1; // near, not fleeing: offsets dropped
  }
  return r;
}

// Chase: sight, then the quieter neighbour, then the strongest-scent neighbour, then a backup.
type Kind = 'see' | 'hear' | 'smell' | 'backup';
function advance(m: Mon, p: Player, f: Field, neigh: Cell[], okToStep: (c: Cell) => boolean): { to: Cell; kind: Kind } | undefined {
  if (f.inView(m.grid)) return { to: p.grid, kind: 'see' };
  let backup: Cell | undefined;
  if (canHear(m, p, f)) {
    const here = f.noise(m.grid);
    for (const g of neigh) {
      const n = f.noise(g);
      if (n === 0 || !okToStep(g)) continue;
      if (n < here) return { to: g, kind: 'hear' }; // lower noise = closer to the player
      if (n === here) backup = g;                    // donor keeps the last equal one
    }
  }
  if (canSmell(m, f)) { // reached only when no quieter neighbour was found (donor order)
    let bestVal = 0;
    let bestCell: Cell | undefined;
    for (const g of neigh) {
      const s = f.scent(g);
      const v = m.race.smell - s;
      if (v > bestVal && s !== 0) { bestVal = v; bestCell = g; } // no passability check here (donor)
    }
    if (bestCell) return { to: bestCell, kind: 'smell' };
  }
  return backup ? { to: backup, kind: 'backup' } : undefined;
}

// Flee step: score = 5000 / (dist to safe spot + 3) - 500 / (noise here + 1); best neighbour wins, ties to later.
function fleeStep(target: Cell, neigh: Cell[], f: Field, distance: (a: Cell, b: Cell) => number): Cell {
  let best = neigh[0];
  let bestScore = -1;
  for (const g of neigh) {
    const score = Math.max(0, Math.trunc(5000 / (distance(g, target) + 3)) - Math.trunc(500 / (f.noise(g) + 1)));
    if (score < bestScore) continue;
    bestScore = score;
    best = g;
  }
  return best;
}

// Hide (pack ambush): the nearest empty, unseen, reachable grid that is at least 3/4 of the current distance + 2 from the player.
function findHiding(m: Mon, p: Player, rings: Cell[][], isEmpty: (c: Cell) => boolean, reachable: (c: Cell) => boolean, f: Field, distance: (a: Cell, b: Cell) => number): Cell | undefined {
  const min = Math.floor(distance(p.grid, m.grid) * 3 / 4) + 2;
  for (let d = 1; d < 10; d++) {
    let best: Cell | undefined;
    let gdis = 999;
    for (const g of rings[d]) {
      if (!isEmpty(g) || f.inView(g) || !reachable(g)) continue;
      const dis = distance(g, p.grid);
      if (dis < gdis && dis >= min) { best = g; gdis = dis; }
    }
    if (gdis < 999) return best;
  }
  return undefined;
}

// Pack rouse: an aware monster wakes sleeping friends it can see, chance 1 in (distance x 20), then a 50% awareness roll.
function groupRouse(rouser: Mon, members: Mon[], canSee: (a: Cell, b: Cell) => boolean, distance: (a: Cell, b: Cell) => number, rnd: () => number): void {
  if (!rouser.aware) return;
  for (const f of members) {
    if (f.asleep <= 0 || !canSee(rouser.grid, f.grid)) continue;
    const d = distance(rouser.grid, f.grid);
    if (Math.floor(rnd() * d * 20) !== 0) continue;
    f.asleep = 0;
    if (rnd() * 100 < 50) f.aware = true;
  }
}

export {};
