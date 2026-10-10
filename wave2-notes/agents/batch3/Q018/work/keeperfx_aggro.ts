// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const SLOTS = 4;            // donor COMBAT_*_OPPONENTS_LIMIT; Frankendom sets its own cap (MAX_ATTACKERS = 3)
const SLOT_POINTS = 258;    // one free slot outweighs the whole distance term (which is 0..256)
const CHAIN_POINTS = 128;   // flat bonus for a melee-type attack (donor default branch)
const DIST_CAP = 5376;      // distance at or beyond this scores zero distance points
const SWITCH_MARGIN = 258;  // switch target only when the best alternative beats the current one by more than this
const CHECK_EVERY = 8;      // turns between re-checks, staggered by fighter id
const ENEMY_REFRESH = 64;   // turns before the nearest-enemy cache is searched again
const FLEE_TURNS = 200;     // donor default rule GAMETURNSINFLEE

interface Foe { id: number; gen: number; attackers: number; distance: number; }

// Score of one candidate: free slots first, then distance. Mirrors the default melee branch, not every branch.
function score(foe: Foe): number {
  const free = Math.max(0, SLOTS - foe.attackers);
  const slotTerm = SLOT_POINTS * free + SLOT_POINTS + CHAIN_POINTS;
  const d = Math.min(foe.distance, DIST_CAP);
  return slotTerm + Math.floor(((DIST_CAP - d) * 256) / DIST_CAP);
}

// Keep the current target unless an alternative beats it by more than SWITCH_MARGIN.
function pickBetterTarget(current: Foe, attackingMe: Foe[]): Foe | null {
  const currentScore = score(current);
  let best: Foe | null = null;
  let bestScore = currentScore;
  for (const f of attackingMe) {
    if (f.id === current.id && f.gen === current.gen) continue;
    const s = score(f);
    if (s > bestScore) { bestScore = s; best = f; }
  }
  return best !== null && bestScore > currentScore + SWITCH_MARGIN ? best : null;
}

// Take a melee slot if the foe has one free; otherwise the fighter waits in the queue.
function assignSlot(foe: Foe): "melee" | "waiting" {
  if (foe.attackers < SLOTS) { foe.attackers += 1; return "melee"; }
  return "waiting";
}

// Cached nearest enemy: keep it while it is the same entity (generation check), search again every ENEMY_REFRESH turns.
interface EnemyCache { id: number; gen: number; lookedAt: number; }
function refreshEnemy(c: EnemyCache, now: number,
                      live: (id: number, gen: number) => boolean,
                      nearest: () => { id: number; gen: number } | null): { id: number; gen: number } | null {
  let found: { id: number; gen: number } | null =
    c.id !== 0 && live(c.id, c.gen) ? { id: c.id, gen: c.gen } : null;
  if (now - c.lookedAt > ENEMY_REFRESH) { c.lookedAt = now; found = nearest(); }
  c.id = found === null ? 0 : found.id;
  c.gen = found === null ? 0 : found.gen;
  return found;
}

// Re-check only on every CHECK_EVERY-th turn, offset by fighter id so the work is spread out.
function dueForCheck(now: number, fighterId: number): boolean {
  return (now + fighterId) % CHECK_EVERY === 0;
}

// Flee from attackers keeps the flee alive; otherwise flee for FLEE_TURNS, moving straight for the first quarter (at least 50 turns).
function fleeAction(turnsInFlee: number, attackers: number): "move-to-point" | "wander" | "end" {
  if (attackers > 0) return "move-to-point";
  const escape = Math.max(50, FLEE_TURNS >> 2);
  if (turnsInFlee <= FLEE_TURNS) return turnsInFlee <= escape ? "move-to-point" : "wander";
  return "end";
}

export {};
