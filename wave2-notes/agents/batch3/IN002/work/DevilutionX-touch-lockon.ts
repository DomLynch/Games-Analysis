// Licence: Sustainable Use License 1.0 (donor, restricted). Clean-room sketch of the mechanism, not a translation.
export interface Vec { x: number; y: number }
export interface Flags { up: boolean; down: boolean; left: boolean; right: boolean }
export interface Hostile { id: number; tile: Vec; canTalk: boolean }

const NO_FLAGS: Flags = { up: false, down: false, left: false, right: false };
const SECTOR_HALF = (3 * Math.PI) / 8; // each direction owns a 135-degree sector, so sectors overlap

// Virtual stick: anchor is fixed, the knob clamps to the pad radius, each direction is a sector.
// A diagonal sets two flags. deadZone is OUR addition (the donor path has none; default 0 = donor).
export function stickFlags(anchor: Vec, finger: Vec, radius: number, deadZone = 0): { flags: Flags; knob: Vec } {
  const dx = finger.x - anchor.x;
  const dy = finger.y - anchor.y;
  const dist = Math.hypot(dx, dy);
  if (dist === 0 || dist < deadZone) return { flags: NO_FLAGS, knob: anchor };
  const k = dist > radius ? radius / dist : 1;
  const knob = { x: anchor.x + dx * k, y: anchor.y + dy * k };
  const a = Math.atan2(-dy, dx); // screen y grows downwards, so negate
  const within = (centre: number): boolean => {
    let d = Math.abs(a - centre);
    if (d > Math.PI) d = 2 * Math.PI - d;
    return d <= SECTOR_HALF;
  };
  return {
    flags: { up: within(Math.PI / 2), down: within(-Math.PI / 2), left: within(Math.PI), right: within(0) },
    knob,
  };
}

// Turns between two of 8 facing steps: min(d, 8 - d). Assumes the 8 direction values are in circular order.
export function turnsTo(facing: number, dir: number): number {
  const d = Math.abs(facing - dir);
  return Math.min(d, 8 - d);
}

// Lock-on: ring-by-ring walk from the player over walkable tiles. The first ring that holds a hostile
// ends the search (unless the hostile can talk). Inside that ring the smallest facing turn wins.
// As written in the donor, a non-talk target is kept over a talk-able one.
// simplified: finishes the whole ring instead of cutting the queue mid-ring; the donor's tie order may differ.
export function lockOn(
  start: Vec,
  facing: number,
  maxSteps: number,
  neighbours: (t: Vec) => Vec[],
  walkable: (t: Vec) => boolean,
  hostileAt: (t: Vec) => Hostile | undefined,
  dirTo: (from: Vec, to: Vec) => number,
): Hostile | undefined {
  const seen = new Set<string>([`${start.x},${start.y}`]);
  let ring: Vec[] = [start];
  let best: Hostile | undefined;
  let bestTurn = Infinity;
  for (let steps = 0; steps <= maxSteps && ring.length > 0; steps++) {
    const next: Vec[] = [];
    for (const t of ring) {
      for (const n of neighbours(t)) {
        const key = `${n.x},${n.y}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const h = hostileAt(n);
        if (h !== undefined) {
          const turn = turnsTo(facing, dirTo(start, h.tile));
          if (best !== undefined) {
            if (!best.canTalk && h.canTalk) continue;
            if (best.canTalk === h.canTalk && bestTurn < turn) continue;
          }
          best = h;
          bestTurn = turn;
          continue; // a hostile tile is not expanded
        }
        if (walkable(n)) next.push(n);
      }
    }
    if (best !== undefined && !best.canTalk) break;
    ring = next;
  }
  return best;
}

// Direction repeat: a direction fires at most once per interval. Pressing one axis clears the opposite
// timestamp, and releasing clears both. Donor default interval is 200 ms; donor starts timestamps at 0,
// we start at -Infinity so the first press after boot is never suppressed.
type Key = "left" | "right" | "up" | "down";
const OPPOSITE: Record<Key, Key> = { left: "right", right: "left", up: "down", down: "up" };

export class DirRepeat {
  private last: Record<Key, number> = { left: -Infinity, right: -Infinity, up: -Infinity, down: -Infinity };
  constructor(private minIntervalMs = 200) {}

  take(now: number, key: Key): boolean {
    this.last[OPPOSITE[key]] = -Infinity;
    if (now - this.last[key] < this.minIntervalMs) return false;
    this.last[key] = now;
    return true;
  }

  release(): void {
    this.last = { left: -Infinity, right: -Infinity, up: -Infinity, down: -Infinity };
  }
}

export {};
