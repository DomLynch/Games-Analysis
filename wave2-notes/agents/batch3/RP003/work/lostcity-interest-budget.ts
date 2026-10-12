// Licence: MIT (donor LICENSE). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export const PREFERRED_VIEW = 15;   // tiles; the view is a square (Chebyshev) radius
export const PREFERRED_CAP = 250;   // max entities in one observer's set
export const RESIZE_INTERVAL = 10;  // ticks between view-distance grow steps
export const BYTE_BUDGET = 4997;    // per-tick info packet budget (donor)
export const MOVE_BYTES = 2;        // illustrative cost of a movement entry
export const HIT_BYTES = 4;         // illustrative cost of one hit block

export interface Ent {
  id: number; x: number; z: number; level: number; active: boolean;
  pendingHits: number[];            // hit ids not yet sent to this observer
}

export interface Observer {
  x: number; z: number; level: number;
  view: number;                     // current view radius, tiles
  lastResize: number;               // ticks since the last grow step
}

export function resizeView(o: Observer, knownCount: number): void {
  if (knownCount >= PREFERRED_CAP) {
    if (o.view > 1) o.view--;       // shrink fast while over the cap
    o.lastResize = 0;
    return;
  }
  o.lastResize++;
  if (o.lastResize >= RESIZE_INTERVAL) {
    if (o.view < PREFERRED_VIEW) o.view++;   // fix: donor keeps lastResize >= interval after a grow, so it grows every tick
    o.lastResize = 0;
  }
}

function dist(o: Observer, e: Ent): number {
  return Math.max(Math.abs(e.x - o.x), Math.abs(e.z - o.z));
}

// Nearest first, within the current radius, capped. Sorting is a simplification of the donor's spiral search.
export function pickSet(o: Observer, world: readonly Ent[], cap: number): Ent[] {
  const inRange = world.filter(e => e.active && e.level === o.level && dist(o, e) <= o.view);
  inRange.sort((a, b) => dist(o, a) - dist(o, b) || a.id - b.id);
  return inRange.slice(0, cap);
}

// Movement for every entity in the set is always counted; hit blocks fill what is left.
// Hits that do not fit stay in pendingHits for the next tick (the donor drops them at tick end).
export function sendTick(set: Ent[], budget: number = BYTE_BUDGET): { sentHits: number; carriedHits: number; bytes: number } {
  let used = set.length * MOVE_BYTES;
  let sentHits = 0;
  let carriedHits = 0;
  for (const e of set) {
    const keep: number[] = [];
    for (const hit of e.pendingHits) {
      if (used + HIT_BYTES <= budget) { used += HIT_BYTES; sentHits++; }
      else { keep.push(hit); carriedHits++; }
    }
    e.pendingHits = keep;
  }
  return { sentHits, carriedHits, bytes: used };
}

export {};
