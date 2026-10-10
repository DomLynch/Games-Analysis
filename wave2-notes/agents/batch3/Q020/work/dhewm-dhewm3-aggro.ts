// Licence: GPL-3.0 with additional id Software terms (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

export interface V3 { x: number; y: number; z: number; }
export interface Mob { id: string; pos: V3; health: number; team: number; hidden: boolean; alive: boolean; }

const HEARING_RANGE = 2048; // engine constant (donor d3xp/ai/AI.h)

function sub(a: V3, b: V3): V3 { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
function dist2(a: V3, b: V3): number { const d = sub(a, b); return d.x * d.x + d.y * d.y + d.z * d.z; }

// Field of view: horizontal test only (z is up, vertical is ignored); fovCos = cos(fovDeg / 2).
export function inFov(eye: V3, forward: V3, target: V3, fovCos: number): boolean {
  if (fovCos >= 1) return true;
  const d = sub(target, eye);
  const len = Math.hypot(d.x, d.y);
  if (len === 0) return true;
  return (d.x * forward.x + d.y * forward.y) / len >= fovCos; // forward: unit, horizontal
}

// Nearest mob that is alive and not hidden. canSee runs only for a mob already closer than the best so far.
export function pickNearest(me: V3, mobs: Mob[], canSee: (m: Mob) => boolean): Mob | null {
  let best: Mob | null = null;
  let bestD = Infinity;
  for (const m of mobs) {
    if (!m.alive || m.hidden) continue;
    const d = dist2(me, m.pos);
    if (d < bestD && canSee(m)) { best = m; bestD = d; }
  }
  return best;
}

// Shot target: the enemy on the aim line if it is not on the shooter's team, else the healthiest hunter.
export function pickLockTarget(aimHit: Mob | null, shooterTeam: number, hunters: Mob[]): Mob | null {
  if (aimHit && aimHit.team !== shooterTeam) return aimHit;
  let best: Mob | null = null;
  for (const h of hunters) {
    if (h.hidden) continue;
    if (best === null || h.health > best.health) best = h;
  }
  return best;
}

export interface EnemyMemory { tracked: V3 | null; chase: V3 | null; }

// Every frame, while the enemy stands on a reachable point, the tracked point follows it, seen or not.
export function trackEachFrame(mem: EnemyMemory, enemy: Mob, reachable: (p: V3) => boolean): void {
  if (reachable(enemy.pos)) mem.tracked = enemy.pos;
}

// Seen, or heard within HEARING_RANGE, refreshes the chase point: the previous tracked point, then the enemy if reachable.
export function refreshChase(mem: EnemyMemory, enemy: Mob, visible: boolean, heard: boolean, me: V3, reachable: (p: V3) => boolean): void {
  if (!visible && !(heard && dist2(me, enemy.pos) < HEARING_RANGE * HEARING_RANGE)) return;
  mem.chase = mem.tracked;
  if (reachable(enemy.pos)) mem.chase = enemy.pos;
}

export {};
