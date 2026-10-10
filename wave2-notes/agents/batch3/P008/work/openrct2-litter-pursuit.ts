// Licence: GPL-3.0 (donor; Staff.cpp header "licensed under the GNU General Public License version 3"; licence.txt is GPLv3). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Vec3 { x: number; y: number; z: number; }
interface Litter { at: Vec3; }
interface Worker { pos: Vec3; sweeping: boolean; }

const STEP = 32;                 // map step between tile positions
const CUT_OFF = 3 * STEP;        // 96 units: the nearest target must be within this weighted distance

// Nearest litter by Manhattan distance with a 4x height term. Returns null if none is within CUT_OFF
// or if the nearest one is outside the patrol area. There is no fallback to the next-nearest litter.
function nearestLitter(w: Worker, litter: Litter[], inPatrol: (p: Vec3) => boolean): Litter | null {
  let best: Litter | null = null;
  let bestD = Infinity;
  for (const l of litter) {
    const d = Math.abs(l.at.x - w.pos.x) + Math.abs(l.at.y - w.pos.y) + 4 * Math.abs(l.at.z - w.pos.z);
    if (d < bestD) { bestD = d; best = l; }
  }
  if (best === null || bestD > CUT_OFF) return null;
  return inPatrol(best.at) ? best : null;
}

// A litter spot is skipped when another worker is already sweeping on that same spot (occupancy only).
function isClaimed(l: Litter, workers: Worker[]): boolean {
  return workers.some(w => w.sweeping && w.pos.x === l.at.x && w.pos.y === l.at.y);
}

// The lookup runs only on most ticks: skipped when (tick + workerId) & 0xFFF is 0..110.
function lookupAllowed(tick: number, workerId: number): boolean {
  return ((tick + workerId) & 0xFFF) > 110;
}

// One junction decision. openEdges are direction indices 0..3 that are open path edges; reverse is the way back.
// Surface: the litter direction is ignored. Path: follow the litter edge with probability followP,
// otherwise a random open edge (the reverse is excluded only on the branch with no litter edge).
function pathStep(onSurface: boolean, openEdges: number[], litterDir: number | null, followP: number, reverse: number, rng: () => number): number | null {
  if (openEdges.length === 0) return null;
  if (onSurface) return null;     // donor uses a surface helper here (not read); caller handles it
  if (litterDir !== null && openEdges.indexOf(litterDir) >= 0) {
    if (rng() < followP) return litterDir;
    return openEdges[Math.floor(rng() * openEdges.length)];
  }
  const forward = openEdges.filter(d => d !== reverse);
  const pool = forward.length > 0 ? forward : openEdges;
  return pool[Math.floor(rng() * pool.length)];
}

export {};
