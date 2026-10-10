// Licence: GPL-3.0 with additional terms (donor, micropolisJS). Clean-room: shape only, rewritten.

export interface ChaserData {
  engageDelayTicks: number;   // ticks before the chase starts (donor: count = 1500 animation frames)
  landRadius: number;         // units: distance to home that lands the chaser (donor: 30 px, Manhattan)
  speed: number;              // units per tick (donor: 3 or 5 px per frame, 8 fixed directions)
  maxTurnPerTick: number;     // radians per tick: the heading may change this much at most
}

export interface Vec { x: number; y: number; }

export interface Chaser {
  pos: Vec;
  home: Vec;
  delay: number;              // ticks left before engaging
  landed: boolean;
  heading: number;            // radians
}

// Manhattan distance, as the donor measures its arrival radius.
function manhattan(a: Vec, b: Vec): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

// Priority: first live primary, else first live secondary, else home.
export function pickDestination(primary: Vec | null, secondary: Vec | null, home: Vec): Vec {
  if (primary !== null) return primary;
  if (secondary !== null) return secondary;
  return home;
}

// Shortest signed angle from a to b, in (-pi, pi].
function angleDiff(a: number, b: number): number {
  let d = b - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d <= -Math.PI) d += 2 * Math.PI;
  return d;
}

// One server tick. wander is the spawn-time point used while the delay runs.
export function stepChaser(c: Chaser, d: ChaserData, wander: Vec, primary: Vec | null, secondary: Vec | null): void {
  if (c.landed) return;

  if (c.delay > 0) c.delay -= 1;             // donor: decrement, then test for zero
  let dest: Vec;
  if (c.delay > 0) {
    dest = wander;
  } else {
    if (manhattan(c.pos, c.home) < d.landRadius) { c.landed = true; return; }
    dest = pickDestination(primary, secondary, c.home);
  }

  const want = Math.atan2(dest.y - c.pos.y, dest.x - c.pos.x);
  const turn = Math.max(-d.maxTurnPerTick, Math.min(d.maxTurnPerTick, angleDiff(c.heading, want)));
  c.heading += turn;
  c.pos = { x: c.pos.x + d.speed * Math.cos(c.heading), y: c.pos.y + d.speed * Math.sin(c.heading) };
}

export {};
