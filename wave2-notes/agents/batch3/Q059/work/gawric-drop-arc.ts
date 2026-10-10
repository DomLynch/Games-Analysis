// Licence: Apache-2.0 (donor). Clean-room sketch written from the mechanism; no donor lines copied.
type Vec3 = { x: number; y: number; z: number };

interface DropArc {
  from: Vec3;
  to: Vec3;        // landing point on the ground
  elapsed: number; // seconds since the throw began
  duration: number;
  arcHeight: number; // metres of lift at mid-flight
}

// Floor the duration so a very short throw still shows an arc.
function makeArc(from: Vec3, to: Vec3, duration: number, arcHeight: number): DropArc {
  return { from, to, elapsed: 0, duration: Math.max(0.05, duration), arcHeight };
}

// Advance the flight by one frame's time. Returns true when the item has landed.
function stepArc(a: DropArc, dt: number): boolean {
  a.elapsed += dt;
  return a.elapsed >= a.duration;
}

// Position on the arc: a linear ground path plus a sine lift that peaks at mid-flight.
function arcPosition(a: DropArc): Vec3 {
  const u = Math.min(1, Math.max(0, a.elapsed / a.duration));
  const lerp = (p: number, q: number) => p + (q - p) * u;
  return {
    x: lerp(a.from.x, a.to.x),
    y: lerp(a.from.y, a.to.y) + Math.sin(u * Math.PI) * a.arcHeight,
    z: lerp(a.from.z, a.to.z),
  };
}

interface LandedTimers {
  glowEndsAt: number;    // absolute seconds on the caller's clock
  coinRevealAt: number | null; // only for coin piles that start hidden
}

// Timers start at landing, not at the throw.
function landedTimers(landedAt: number, glowSeconds: number, coinRevealDelay: number | null): LandedTimers {
  return {
    glowEndsAt: landedAt + glowSeconds,
    coinRevealAt: coinRevealDelay === null ? null : landedAt + coinRevealDelay,
  };
}

export {};
