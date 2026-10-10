// Licence: GPL-2.0 (version 2 only; p_enemy.c line 8). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Player {
  inGame: boolean;
  spectator: boolean;
  invisible: boolean;
  alive: boolean;
  x: number;
  y: number;
  z: number;
}

interface Watcher {
  x: number;
  y: number;
  z: number;
  scale: number;
  cursor: number; // persisted between calls
  target: Player | null;
}

interface Sight {
  angleToDeg(w: Watcher, p: Player): number; // signed, -180..180
  hasSight(w: Watcher, p: Player): boolean;  // line of sight (donor: P_CheckSight, not read)
}

const SCAN_BUDGET = 2; // in-game player slots examined per call
const MELEE_REACH = 64; // world units before scale (donor MELEERANGE)

function lookForPlayers(w: Watcher, players: Player[], sight: Sight, allAround: boolean, maxDist: number): boolean {
  const n = players.length;
  const stop = (w.cursor + n - 1) % n; // one full cycle
  let examined = 0;
  for (; ; w.cursor = (w.cursor + 1) % n) {
    if (w.cursor === stop) return false;
    const p = players[w.cursor];
    if (!p.inGame) continue;
    if (examined++ === SCAN_BUDGET) return false; // cursor stays on this slot for the next call
    if (p.spectator || p.invisible || !p.alive) continue;

    const dx = p.x - w.x;
    const dy = p.y - w.y;
    const dz = p.z - w.z;
    if (maxDist > 0 && Math.sqrt(dx * dx + dy * dy + dz * dz) > maxDist) continue;

    if (!allAround && Math.abs(sight.angleToDeg(w, p)) > 90) {
      // behind the watcher: only close range counts
      if (Math.sqrt(dx * dx + dy * dy) > MELEE_REACH * w.scale) continue;
    }
    if (!sight.hasSight(w, p)) continue;

    w.target = p;
    return true;
  }
}

export {};
