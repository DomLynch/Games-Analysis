// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Mind = "brainless" | "animal" | "human";
type Beh = "seek" | "wander" | "retreat";

interface Mob {
  id: number;
  x: number;
  y: number;
  mind: Mind;
  foe: number | null;                       // id of the current foe
  target: { x: number; y: number } | null;  // cell it walks to
  memory: number;                           // ticks left to chase a foe it cannot see
  feared: boolean;
  beh: Beh;
}

interface Unit { id: number; x: number; y: number; stealth: number; }

const MEMORY_RANGE: Record<Mind, [number, number]> = {
  human: [450, 1000],
  animal: [250, 550],
  brainless: [100, 300],
};
const SHAKE_OFF_CAP = 50;

const dist = (ax: number, ay: number, bx: number, by: number): number =>
  Math.max(Math.abs(ax - bx), Math.abs(ay - by));

// Nearest visible hostile. Ties go to the first in list order.
function pickFoe(m: Mob, hostiles: Unit[], visibleTo: (u: Unit) => boolean): number | null {
  let best: Unit | null = null;
  let bestD = Infinity;
  for (const u of hostiles) {
    if (!visibleTo(u)) continue;
    const d = dist(m.x, m.y, u.x, u.y);
    if (d < bestD) { best = u; bestD = d; }
  }
  return best ? best.id : null;
}

// Scan for a foe only when the player is in view, or on a 1-in-3 roll.
function needsScan(m: Mob, playerInView: boolean, rand01: () => number): boolean {
  return m.foe === null && (playerInView || rand01() < 1 / 3);
}

// A monster fighting another monster turns on the player 2 times in 3.
function maybeSwitchToPlayer(m: Mob, playerId: number, playerInView: boolean, rand01: () => number): void {
  if (playerInView && m.foe !== null && m.foe !== playerId && rand01() >= 1 / 3) m.foe = playerId;
}

// Being hit: the attacker becomes the foe. Unreachable means retreat; a feared monster breaks fear first.
function onHit(m: Mob, attackerId: number, reachable: boolean): void {
  m.foe = attackerId;
  if (!reachable) { m.beh = "retreat"; return; }
  if (m.feared) { m.feared = false; return; }
  m.beh = "seek";
}

// Seeing the foe refreshes the memory timer, by how smart the monster is.
function onSeeFoe(m: Mob, rand: (lo: number, hi: number) => number): void {
  const [lo, hi] = MEMORY_RANGE[m.mind];
  m.memory = rand(lo, hi);
}

// Memory counts down by the player's action time, once per monster move.
function decayMemory(m: Mob, actionTicks: number): void {
  if (m.memory > 0) m.memory -= actionTicks;
}

// On reaching the last seen cell, a player is re-found with chance 50 / stealth; otherwise memory is cleared.
function onArrive(m: Mob, player: Unit, rand01: () => number): void {
  if (m.memory <= 0) return;
  if (rand01() < Math.min(1, 50 / player.stealth)) m.target = { x: player.x, y: player.y };
  else m.memory = 0;
}

// Memory used up: give up the chase and wander.
function tickSeek(m: Mob): void {
  if (m.memory <= 0) { m.foe = null; m.beh = "wander"; }
}

// Foe lost on purpose (teleport, level change): remembered position is kept but the timer is capped.
function shakeOff(mobs: Mob[], lostFoeId: number): void {
  for (const m of mobs) {
    if (m.foe === lostFoeId && m.memory > 0) m.memory = Math.min(m.memory, SHAKE_OFF_CAP);
  }
}

export {};
