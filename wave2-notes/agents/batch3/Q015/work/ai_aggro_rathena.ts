// Licence: GPL-3.0 (rAthena LICENSE, read: GNU GENERAL PUBLIC LICENSE, Version 3). Clean-room shape only, written from the mechanism; no donor lines are translated.
// Times in ms, cells in map cells. Values are the donor defaults named in the note.
const HARD_THINK_MS = 100;        // MIN_MOBTHINKTIME
const LAZY_THINK_MS = 1000;       // MIN_MOBTHINKTIME * 10
const SKILL_INTERVAL_MS = 1000;   // MOB_SKILL_INTERVAL
const AREA_SIZE = 14;             // area_size (conf/battle/client.conf:39)
const ACTIVE_AI_RANGE = 4;        // added to AREA_SIZE for the hard AI
const RUDE_ATTACKED_COUNT = 1;    // rude attacks before the rude-attacked skill hook
const ACTIVE_GRACE_MS = 5000;     // mob_active_time (code default battle.cpp:8622; shipped conf sets 0)
const UNLOCK_MS = 2000;           // mob_unlock_time (conf/battle/monster.conf:338)
const CHASE_REFRESH_CELLS = 32;   // monster_chase_refresh (default in battle.cpp)

interface Point { x: number; y: number; }
interface Player extends Point { id: number; level: number; invisible: boolean; }
interface Mob extends Point {
  id: number;
  level: number;
  viewRange: number;        // range2
  walkViewRange: number;    // range3, used while walking
  weaponRange: number;
  weakTarget: boolean;      // only picks players below its level
  aggressive: boolean;
  target: Player | null;
  attackedBy: Player | null;
  rudeCount: number;
  cellsWalked: number;      // cells walked on the current path
  walking: boolean;
  lastMoveMs: number;
  spotted: Set<number>;     // players that have seen this mob
  lastPlayerNearMs: number; // donor last_pcneartime; 0 = none
  pathLen: (to: Player) => number;   // path length in cells
}

function cellDist(a: Point, b: Point): number {       // metric not read in the donor (distance_bl)
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

// Aggressive search: nearest eligible player inside view range, path length gated.
function pickNearest(m: Mob, players: Player[]): Player | null {
  let best: Player | null = null;
  let bestD = Infinity;
  for (const p of players) {
    if (p.invisible) continue;
    if (m.weakTarget && p.level >= m.level - 5) continue;
    const d = cellDist(m, p);
    if (d > m.viewRange) continue;
    if (best !== null && d >= bestD) continue;      // replace only when strictly nearer
    const limit = m.walking ? m.walkViewRange : m.viewRange;
    if (m.pathLen(p) > limit) continue;
    best = p;
    bestD = d;
  }
  return best;
}

// Rude-attacked skill hook (donor: a skill use; not modelled here).
function rudeAttackedHook(_m: Mob): void {
  return;
}

// Retarget on being hit: switch only when the attacker is near and reachable; otherwise count a rude attack.
function onAttacked(m: Mob, attacker: Player, changeAllowed: boolean, canReach: boolean): void {
  m.aggressive = false;                               // donor mob_set_attacked_id: always leaves aggressive mode
  if (!changeAllowed) return;
  if (cellDist(m, attacker) > AREA_SIZE) return;     // outside the visual area
  const inMelee = cellDist(m, attacker) <= m.weaponRange;
  if (!inMelee && !canReach) {
    m.rudeCount++;                                    // donor: ++attacked_count
    if (m.rudeCount > RUDE_ATTACKED_COUNT) rudeAttackedHook(m);   // donor: mobskill_use(MSC_RUDEATTACKED)
    return;
  }
  m.target = attacker;
  if (m.rudeCount > 0) m.rudeCount--;
}

// Chase refresh: a walking mob re-plans only after it has walked CHASE_REFRESH_CELLS cells.
function mayReplanChase(m: Mob): boolean {
  return !m.walking || m.cellsWalked > CHASE_REFRESH_CELLS;
}

// Lost mobility: keep the target for UNLOCK_MS after the last move, then drop it and go idle.
function unlockIfStuck(m: Mob, nowMs: number, canMove: boolean): void {
  if (canMove) return;
  if (nowMs - m.lastMoveMs > UNLOCK_MS) m.target = null;
}

// Driver routing: a mob with a player inside AREA_SIZE + ACTIVE_AI_RANGE gets the hard AI; others get the lazy pass,
// which keeps the hard AI for ACTIVE_GRACE_MS after the last player left.
function driverRoute(m: Mob, players: Player[], nowMs: number): "hard" | "lazy" {
  for (const p of players) {
    if (cellDist(m, p) <= AREA_SIZE + ACTIVE_AI_RANGE) {
      m.spotted.add(p.id);
      m.lastPlayerNearMs = nowMs;
      return "hard";
    }
  }
  // Lazy pass still runs the hard AI inside the grace window after the last player left.
  if (m.lastPlayerNearMs > 0 && nowMs - m.lastPlayerNearMs < ACTIVE_GRACE_MS) return "hard";
  m.lastPlayerNearMs = 0;
  return "lazy";
}
