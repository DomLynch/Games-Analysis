// Licence: copyleft (as read: SPDX-License-Identifier GPL-2.0-or-later in core/PathFinder.cpp line 3; repo COPYING is GPL v2). clean-room sketch written from the described mechanism, not a translation of the donor lines.
export interface Pt { x: number; y: number }   // navmap units (donor uses pixels)
export interface Rng { next(): number }        // [0,1), injected so a server can replay it

const STEP_PX = 2;        // donor STEP_RADIUS: navmap pixels per step
const TILE_W = 16;        // donor SEARCHMAP_TILE_WIDTH
const TILE_H = 12;        // donor SEARCHMAP_TILE_HEIGHT
const TILE_DIAG = 20;     // donor SEARCHMAP_TILE_DIAGONAL
const LOOKAHEAD = 3;      // donor tests p + 3 * step before moving
const MAX_REROLLS = 16;   // donor RAND_DEGREES_OF_FREEDOM

const dist2 = (a: Pt, b: Pt): number => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

// Per-step vector away from the threat: scaled to STEP_PX in tile space, times stepTime / speed,
// never longer than the raw vector, then each component rounded up in magnitude.
export function awayVector(src: Pt, threat: Pt, stepTime: number, speed: number): Pt | undefined {
  if (speed <= 0) return undefined;
  const rx = src.x - threat.x;
  const ry = src.y - threat.y;
  const lenTiles = Math.hypot(rx / TILE_W, ry / TILE_H);
  if (lenTiles === 0) return undefined;
  const scale = Math.min(((STEP_PX / TILE_W) / lenTiles) * (stepTime / speed), 1);
  const dx = Math.sign(rx) * Math.ceil(Math.abs(rx * scale));
  const dy = Math.sign(ry) * Math.ceil(Math.abs(ry * scale));
  if (Math.abs(dx) <= 0.333 && Math.abs(dy) <= 0.333) return undefined;
  return { x: dx, y: dy };
}

// Walk from src along the away vector until the path length limit (in tiles) is reached.
// A blocked look-ahead re-rolls the sign of each axis (donor RandomFlip) and keeps the current point.
// Returns the last reached point; equal to src when nothing was passable (the donor also returns true then).
export function runAwayPoint(
  src: Pt, threat: Pt, maxPathTiles: number, stepTime: number, speed: number,
  blocked: (p: Pt) => boolean, rng: Rng
): Pt | undefined {
  const v = awayVector(src, threat, stepTime, speed);
  if (!v) return undefined;
  const limit = maxPathTiles * TILE_DIAG;
  let sx = 1;
  let sy = 1;
  let p: Pt = { x: src.x, y: src.y };
  let rerolls = 0;
  while (dist2(p, src) < limit * limit) {
    const ahead: Pt = { x: Math.round(p.x + LOOKAHEAD * sx * v.x), y: Math.round(p.y + LOOKAHEAD * sy * v.y) };
    if (blocked(ahead)) {
      rerolls++;
      if (rerolls > MAX_REROLLS) break;
      sx = rng.next() < 0.5 ? -1 : 1;
      sy = rng.next() < 0.5 ? -1 : 1;
      continue;
    }
    p = ahead;
  }
  return p;
}

// Flee window: the flee is planned once, then the actor waits windowTicks evaluations before planning again.
export interface FleeWindow { windowTicks: number; remaining: number }
export function fleeTick(w: FleeWindow, plan: () => void): void {
  if (w.remaining > 0) { w.remaining--; return; }
  w.remaining = w.windowTicks;
  plan();
}

// Path length for a flee of n ticks at a given speed, as in the donor (int0 * stepTime / speed).
export function fleeDistanceTiles(ticks: number, stepTime: number, speed: number): number {
  return speed > 0 ? Math.trunc((ticks * stepTime) / speed) : ticks;
}

// Morale check on each change. Breakpoint 0 disables panic. Panic picks run, random walk or berserk
// with equal weight; only run and random walk set the panic flag (donor does not set it for berserk).
export interface Morale { value: number; breakAt: number; panicked: boolean }
export type MoraleEvent = 'panic-run' | 'panic-random-walk' | 'panic-berserk' | 'recover' | 'clamp-20' | 'none';

export function moraleEvent(m: Morale, oldValue: number, rng: Rng, overriding: boolean): MoraleEvent {
  const diff = m.value - oldValue;
  const lowMorale = m.value <= m.breakAt;
  if (!m.panicked && lowMorale && m.breakAt !== 0 && !overriding) {
    const roll = 1 + Math.floor(rng.next() * 3);
    if (roll === 1) { m.panicked = true; return 'panic-run'; }
    if (roll === 2) { m.panicked = true; return 'panic-random-walk'; }
    return 'panic-berserk';
  }
  if (m.panicked && diff > 0) {
    const recovered = m.value - diff <= m.breakAt && !lowMorale;
    if (recovered || m.breakAt === 0) { m.panicked = false; return 'recover'; }
    return 'none';
  }
  if (m.value > 20) { m.value = 20; return 'clamp-20'; }
  return 'none';
}

export {};
