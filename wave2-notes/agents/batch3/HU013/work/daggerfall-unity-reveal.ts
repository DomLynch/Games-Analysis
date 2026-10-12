// Licence: MIT (donor). Sketch written from the described mechanism, not a translation of the donor lines.
export {};

interface Vec { x: number; y: number; z: number }
interface Hit { id: string; dist: number }
type Cast = (origin: Vec, dir: Vec, maxDist: number) => Hit | null;

const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const scale = (a: Vec, k: number): Vec => ({ x: a.x * k, y: a.y * k, z: a.z * k });
const len = (a: Vec): number => Math.hypot(a.x, a.y, a.z);
const norm = (a: Vec): Vec => scale(a, 1 / (len(a) || 1));
const cross = (a: Vec, b: Vec): Vec => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });

export const REVEAL_DOWN = 3.0;      // units: floor reveal depth under the head and under each sweep point
export const REVEAL_VIEW = 30.0;     // units: view ray length
export const PROTECT_OFFSET = 0.1;   // units: side offset of the protection rays
export const AGREE_TOL = 0.01;       // units: allowed gap between automap and true distances
export const SWEEP_STEP = 1.0;       // units: spacing of floor sweep points along the view ray
export const SCAN_HZ = 5;            // scans per second

export interface Zone {
  autoCast: Cast;   // nearest hit on the reveal layer (the cell geometry)
  truthCast: Cast;  // nearest hit on true level geometry, player excluded
}

const DOWN: Vec = { x: 0, y: -1, z: 0 };
const FLOOR_SIDE: Vec = { x: -PROTECT_OFFSET, y: 0, z: 0 };

// Centre ray plus two protection rays; the third is at a right angle to the first two.
// Reveal only if the three automap hits name the same cell and each distance matches the true
// distance within tolerance, so a gap, a door or a pillar blocks the reveal.
export function scanRay(zone: Zone, origin: Vec, dir: Vec, maxDist: number, side: Vec, reveal: (id: string) => void): Hit | null {
  const d = norm(dir);
  const side3 = scale(norm(cross(d, norm(side))), len(side));
  const offsets: Vec[] = [{ x: 0, y: 0, z: 0 }, side, side3];
  const auto = offsets.map(o => zone.autoCast(add(origin, o), d, maxDist));
  const truth = offsets.map(o => zone.truthCast(add(origin, o), d, maxDist));
  const [a1, a2, a3] = auto;
  const [t1, t2, t3] = truth;
  // fix (donor defect): the donor treated a missing true hit as distance 0; a missing hit now refuses the reveal.
  if (!a1 || !a2 || !a3 || !t1 || !t2 || !t3) return null;
  if (a1.id !== a2.id || a1.id !== a3.id) return null;
  if (Math.abs(t1.dist - a1.dist) >= AGREE_TOL) return null;
  if (Math.abs(t2.dist - a2.dist) >= AGREE_TOL) return null;
  if (Math.abs(t3.dist - a3.dist) >= AGREE_TOL) return null;
  reveal(a1.id);
  return t1;
}

// One scan: floor under the head, then the view ray, then floor under points stepped along the view ray up to the wall.
export function scanCycle(zone: Zone, head: Vec, forward: Vec, reveal: (id: string) => void): void {
  const f = norm(forward);
  scanRay(zone, head, DOWN, REVEAL_DOWN, FLOOR_SIDE, reveal);
  const view = scanRay(zone, head, f, REVEAL_VIEW, scale(norm(cross(DOWN, f)), PROTECT_OFFSET), reveal);
  if (!view) return;
  // fix (donor gap): the donor starts the sweep at one step, so a wall nearer than one step gets no floor sweep.
  let s = Math.min(SWEEP_STEP, view.dist / 2);
  while (s < view.dist) {
    scanRay(zone, add(head, scale(f, s)), DOWN, REVEAL_DOWN, FLOOR_SIDE, reveal);
    s += SWEEP_STEP;
  }
}

// Scan gate: 5 Hz, skipped while the map is open.
export class RevealClock {
  private last = -Infinity;
  tick(nowS: number, mapOpen: boolean, zone: Zone, head: Vec, forward: Vec, reveal: (id: string) => void): boolean {
    if (mapOpen) return false;
    if (nowS - this.last < 1 / SCAN_HZ) return false;
    this.last = nowS;
    scanCycle(zone, head, forward, reveal);
    return true;
  }
}

// Explored-zone memory: keep the N most recently visited zones. Ties are broken by id so exactly N are kept.
export interface Visit { zoneId: string; lastVisitedS: number; explored: Set<string> }

export function remember(visits: Map<string, Visit>, v: Visit, keep: number): void {
  visits.set(v.zoneId, v);
  const sorted = [...visits.values()].sort((a, b) => (b.lastVisitedS - a.lastVisitedS) || (a.zoneId < b.zoneId ? -1 : a.zoneId > b.zoneId ? 1 : 0));
  for (const old of sorted.slice(Math.max(keep, 1))) visits.delete(old.zoneId);
}
