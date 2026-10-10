// Licence: GPL-2.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Dir = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7; // 0-3 straight, 4-7 diagonal (sketch convention)
const isDiagonal = (d: Dir): boolean => d >= 4;
const MIN_TICKS = 50; // ms, floor for any scheduled wait

// Base step time from speed (log curve), rounded up to 50 ms. Monster with a target nearby x2.
function baseStepMs(speed: number, groundMs: number, monsterNearby: boolean): number {
  const half = Math.trunc(speed / 2);
  const curve = speed > -261.29 ? Math.max(1, Math.floor(857.36 * Math.log(half + 261.29) - 4795.01 + 0.5)) : 1;
  const ground = groundMs === 0 ? 150 : groundMs;
  let ms = Math.ceil(Math.floor((1000 * ground) / curve) / 50) * 50;
  if (monsterNearby) ms *= 2;
  return ms;
}

// Step time for one direction: diagonal x3 on top of the base.
function stepMsFor(base: number, d: Dir): number {
  return isDiagonal(d) ? base * 3 : base;
}

interface Walker {
  queue: Dir[];        // directions still to take; the server pops them
  lastStep: number;    // ms, 0 = never stepped
  lastCost: number;    // 1 flat, 2 floor change, 3 diagonal
  baseMs: number;      // last base step time
  nextAction: number;  // shared action clock: walking and item use wait on it
  parked: (() => void) | null; // one slot for an early item action
}

// Delay before the next step is allowed (ms).
function walkDelay(w: Walker, now: number): number {
  if (w.lastStep === 0) return 0;
  return w.baseMs * w.lastCost - (now - w.lastStep);
}

// Client sends intent only (a direction or a list). The server owns when each step happens.
// Returns ms until the first step; 0 means run now.
function requestWalk(w: Walker, dirs: Dir[], now: number): number {
  w.queue = dirs.slice();
  const delay = walkDelay(w, now);
  return delay > 0 ? delay : 0;
}

// Server timer fires. Takes at most one step; a step that fires early does nothing and waits.
// tryMove is the server-side tile check at step time. Returns ms to the next timer, or null when done.
function onStepTimer(
  w: Walker, now: number,
  costOf: (d: Dir) => number,
  tryMove: (d: Dir) => boolean,
): number | null {
  const delay = walkDelay(w, now);
  if (delay > 0) return delay;
  const d = w.queue.shift();
  if (d === undefined) return null;
  if (!tryMove(d)) { w.queue = []; return null; } // refused at step time: cancel the walk
  w.lastStep = now;
  w.lastCost = costOf(d);
  w.nextAction = Math.max(w.nextAction, now + stepMsFor(w.baseMs, d)); // the action clock uses the direction time only
  return w.queue.length > 0 ? w.baseMs * w.lastCost : null;
}

// An item action waits for the shared clock. If early, it is parked; the newest request replaces the parked one.
function requestAction(w: Walker, now: number, run: () => void): number {
  if (w.nextAction <= now) { run(); return 0; }
  w.parked = run;
  return Math.max(MIN_TICKS, w.nextAction - now);
}

export {}
