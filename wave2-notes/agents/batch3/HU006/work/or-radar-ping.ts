// Radar attention ping: a 3-point ring that shrinks and rotates, lives for a fixed number of logic ticks,
// and is rate-limited per unit by real time. Client HUD only (the server sends the event, never the ring).

export interface Vec2 { x: number; y: number; }

export interface PingRules {
  fromRadius: number;     // px, starting radius (donor FromRadius = 200)
  toRadius: number;       // px, floor the ring stops at (donor ToRadius = 15)
  shrinkPerTick: number;  // px per logic tick (donor ShrinkSpeed = 4)
  rotationPerTick: number; // radians per logic tick (donor RotationSpeed = 0.12)
}

export interface Ping {
  x: number;              // centre, already mapped to minimap px by the caller
  y: number;
  tick: number;
  duration: number;       // logic ticks; donor default 250
  radius: number;
  angle: number;
  visibleAtCreate: boolean;
}

export function newPing(x: number, y: number, duration: number, rules: PingRules, visibleAtCreate: boolean): Ping {
  return { x, y, tick: 0, duration, radius: rules.fromRadius, angle: 0, visibleAtCreate };
}

// One logic tick. Returns false when the ping has expired.
// Fix vs donor: the donor tests `++tick == duration`, so a duration of 0 or less never expires.
// Here `>=` expires it on its first tick instead.
export function tickPing(p: Ping, rules: PingRules): boolean {
  p.tick += 1;
  if (p.tick >= p.duration) return false;
  p.radius = Math.max(p.radius - rules.shrinkPerTick, rules.toRadius);
  p.angle -= rules.rotationPerTick;
  return true;
}

// Three vertices 120 degrees apart on the ring.
export function trianglePoints(p: Ping): [Vec2, Vec2, Vec2] {
  const at = (a: number): Vec2 => ({ x: p.x + p.radius * Math.cos(a), y: p.y + p.radius * Math.sin(a) });
  return [at(p.angle), at(p.angle + (2 * Math.PI) / 3), at(p.angle + (4 * Math.PI) / 3)];
}

// Per-unit notify gate, in real milliseconds (not ticks). Donor: interval < 0 means notify once.
export function notifyGate(nowMs: number, nextAllowedMs: number, intervalMs: number): { allowed: boolean; next: number } {
  if (nowMs < nextAllowedMs) return { allowed: false, next: nextAllowedMs };
  if (intervalMs < 0) return { allowed: true, next: Number.POSITIVE_INFINITY };
  return { allowed: true, next: nowMs + intervalMs };
}

export {};
