// Licence: MIT (donor, L2Dn Server Project). Clean-room sketch written from the described mechanism; no donor lines copied.
// clean-room
const TICKS_PER_SECOND = 10;

interface Mover {
  x: number;                       // accurate position, not rounded
  y: number;
  dest: { x: number; y: number };
  speed: number;                   // units per second
  collision: number;               // radius taken off the remaining distance
  lastTick: number;                // tick of the last step (set at move start)
  arrived: boolean;
}

// The tick is derived from the clock, never incremented: a late loop skips ticks instead of drifting.
function tickAt(nowMs: number, referenceMs: number, msPerTick: number): number {
  return Math.floor((nowMs - referenceMs) / msPerTick);
}

// Advance one mover to tick `now`. Calling it twice in the same tick does nothing.
// Returns true on the step where the mover is considered arrived.
function stepMover(m: Mover, now: number): boolean {
  if (m.arrived) return true;
  if (m.lastTick === now) return false;

  const dx = m.dest.x - m.x;
  const dy = m.dest.y - m.y;
  const remaining = Math.max(0.00001, Math.hypot(dx, dy) - m.collision);
  const passed = (m.speed * (now - m.lastTick)) / TICKS_PER_SECOND;
  const fraction = remaining > 1 ? passed / remaining : Infinity;

  m.lastTick = now;
  if (fraction > 1.79) {
    m.x = m.dest.x;
    m.y = m.dest.y;
    m.arrived = true;
    return true;
  }
  m.x += dx * fraction;            // not clamped at the destination for fractions 1..1.79, as written in the donor
  m.y += dy * fraction;
  return false;
}

// One pass over all movers at one tick. Returns the movers that arrived on this pass.
function tickMovers(movers: Mover[], now: number): Mover[] {
  const arrived: Mover[] = [];
  for (const m of movers) {
    if (stepMover(m, now)) arrived.push(m);
  }
  return arrived;
}

export {}
