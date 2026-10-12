// Licence of donor: MIT (LICENSE line 1 copyright 2015-2026 Endel Dreyer; MIT License text line 3). Clean-room sketch of the mechanism, not a translation.
// Frankendom target (proposed): src/fight/lagcomp.ts. Donor points fixed here: one window for the clamp and the ring; the clamp reports when it moved a stamp; no midpoint reconstruction when the stamp is missing (go live instead).

export interface Sample { t: number; x: number; y: number }

// Per-target ring of recorded snapshots (one ring per tracked target, shared by every shooter).
export class Ring {
  private buf: Sample[] = [];

  constructor(private readonly cap: number) {}

  push(s: Sample): void {
    if (this.buf.length >= this.cap) this.buf.shift();
    this.buf.push(s);
  }

  newest(): number | undefined {
    return this.buf.length > 0 ? this.buf[this.buf.length - 1].t : undefined;
  }

  // Linear interpolation at time t, held at the ends of the retained range.
  at(t: number): { x: number; y: number } | undefined {
    const b = this.buf;
    if (b.length === 0) return undefined;
    if (t <= b[0].t) return { x: b[0].x, y: b[0].y };
    const last = b[b.length - 1];
    if (t >= last.t) return { x: last.x, y: last.y };
    for (let i = 1; i < b.length; i++) {
      if (b[i].t >= t) {
        const p = b[i - 1];
        const n = b[i];
        const a = n.t > p.t ? (t - p.t) / (n.t - p.t) : 0;
        return { x: p.x + (n.x - p.x) * a, y: p.y + (n.y - p.y) * a };
      }
    }
    return { x: last.x, y: last.y };
  }
}

export interface Aim { atMs: number; clamped: boolean; live: boolean }

// Clamp a shooter's render stamp into [newest - windowMs, newest].
// stamp <= 0 means the shooter has not synced its clock: aim at the newest sample (live).
export function aimAt(stamp: number, newest: number, windowMs: number): Aim {
  if (stamp <= 0) return { atMs: newest, clamped: false, live: true };
  const oldest = newest - windowMs;
  if (stamp < oldest) return { atMs: oldest, clamped: true, live: false };
  if (stamp > newest) return { atMs: newest, clamped: true, live: false };
  return { atMs: stamp, clamped: false, live: false };
}

// Client side: the render stamp it sends = its server-time estimate minus (interp delay + half the smoothed RTT).
// Unsynced clock sends 0. The delay is capped to a uint16 on the wire.
export function renderStamp(synced: boolean, serverNowMs: number, interpDelayMs: number, smoothedRttMs: number): number {
  if (!synced) return 0;
  const now = Math.max(0, Math.round(serverNowMs));
  const delta = Math.min(0xffff, Math.max(0, Math.round(interpDelayMs + smoothedRttMs / 2)));
  return now > delta ? now - delta : 0;
}

export {};
