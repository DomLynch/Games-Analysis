// Licence: MIT OR Apache-2.0 (benilla Cargo.toml "license"; LICENSE-MIT and LICENSE-APACHE present). Adapted from the mechanism and written fresh in TypeScript; not a line-by-line translation.
export {};

type Vec3 = { x: number; y: number; z: number }; // y is up, as in the donor

const CHANNEL_EPS = 0.001;                 // rad or units: closer than this counts as equal
const PITCH_LIMIT = (89 * Math.PI) / 180;  // camera pitch clamp
const RETURN_RATE = 6.0;                   // 1/s: collision distance eases out; pull-in is instant
const HOME_SPEED = (90 * Math.PI) / 180;   // rad/s: the look bias returns to level at this speed
const DX_MAX = 0.05;                       // a drag with less yaw per event than this may pivot
const DY_MIN = 0.0;                        // ...and more pitch per event than this

// A duration-based cosine tween. Duration = gap / rate; ease = (1 - cos(pi s)) / 2.
export class Channel {
  live = 0;
  private from = 0;
  private to = 0;
  private elapsed = 0;
  private duration = 0;
  private moving = false;

  get inFlight(): boolean { return this.moving; }

  snap(v: number): void {
    this.live = v; this.from = v; this.to = v; this.moving = false;
  }

  arm(target: number, rate: number): void {
    if (this.moving && Math.abs(this.to - target) < CHANNEL_EPS) return; // already arming this
    const gap = Math.abs(target - this.live);
    if (gap < CHANNEL_EPS) { this.to = target; this.moving = false; return; }
    this.from = this.live;
    this.to = target;
    this.elapsed = 0;
    this.duration = gap / Math.max(rate, Number.EPSILON);
    this.moving = true;
  }

  advance(dt: number): number {
    if (!this.moving) return this.live;
    this.elapsed += dt;
    const s = this.elapsed / Math.max(this.duration, Number.EPSILON);
    if (s >= 1) {
      this.live = this.to;
      this.moving = false;
    } else {
      const e = (1 - Math.cos(Math.PI * s)) / 2;
      this.live = this.from + (this.to - this.from) * e;
    }
    return this.live;
  }
}

// Smart pivot: a camera pinned by geometry tilts its view through a bias instead of pulling in further.
export class SmartPivot {
  readonly bias = new Channel();

  private release(): void { this.bias.arm(0, HOME_SPEED); }

  // Drag routing. Returns the pitch delta the integrator should apply, or null on a pure-pivot frame.
  route(dPitch: number, dYaw: number, pitch: number, translating: boolean, clipped: boolean): number | null {
    const verdict = !translating && pitch >= 0 && clipped;
    const displaced = !this.bias.inFlight && Math.abs(this.bias.live) >= CHANNEL_EPS;
    const verticalDrag = verdict && Math.abs(dPitch) > DY_MIN && Math.abs(dYaw) < DX_MAX;
    if (displaced || verticalDrag) {
      let b = this.bias.live + dPitch;
      if (pitch > 0) b = Math.min(b, PITCH_LIMIT - pitch); // one-sided: only up, only to the limit
      this.bias.snap(b);
      if (b >= 0 && pitch > 0) return null;                // the bias took the whole drag
    }
    this.release();
    return dPitch;
  }

  // Per frame, after the sweep: eases the bias home once the clip is gone.
  advance(pitch: number, translating: boolean, clipped: boolean, dt: number): void {
    const verdict = !translating && pitch >= 0 && clipped;
    if (verdict) this.bias.snap(this.bias.live);
    else if (Math.abs(this.bias.live) >= CHANNEL_EPS) this.release();
    this.bias.advance(dt);
  }
}

export interface Rig {
  yaw: number;           // radians, about Y
  pitch: number;         // radians, unbiased, positive up
  distance: number;      // orbit distance, from zoom
  collisionDist: number; // eased boom length the sweep allows
  clipped: boolean;      // last sweep hit
  smart: SmartPivot;
}

// Forward of Ry(yaw) * Rx(pitch) applied to -Z.
export function forward(yaw: number, pitch: number): Vec3 {
  return { x: -Math.cos(pitch) * Math.sin(yaw), y: Math.sin(pitch), z: -Math.cos(pitch) * Math.cos(yaw) };
}

// The sweep is a caller callback: returns the distance along boom to the first hit, or null.
export function seat(
  rig: Rig,
  dt: number,
  feet: Vec3,
  head: Vec3,
  pivotHeight: number,
  translating: boolean,
  sweep: (from: Vec3, boom: Vec3) => number | null,
): { eye: Vec3; viewPitch: number } {
  const bias = rig.smart.bias.live;                        // read before this frame's advance
  const pivot = { x: feet.x, y: feet.y + pivotHeight, z: feet.z };
  const fwd = forward(rig.yaw, rig.pitch);                 // the arm uses the unbiased pitch
  const seatPos = { x: pivot.x - fwd.x * rig.distance, y: pivot.y - fwd.y * rig.distance, z: pivot.z - fwd.z * rig.distance };
  const boom = { x: seatPos.x - head.x, y: seatPos.y - head.y, z: seatPos.z - head.z };
  const boomLen = Math.max(Math.hypot(boom.x, boom.y, boom.z), 1e-3);

  const hit = sweep(head, boom);
  rig.clipped = hit !== null;
  const open = hit ?? boomLen;
  if (open < rig.collisionDist) rig.collisionDist = open;                              // snap in
  else rig.collisionDist += (open - rig.collisionDist) * (1 - Math.exp(-RETURN_RATE * dt)); // ease out

  const frac = Math.min(Math.max(rig.collisionDist / boomLen, 0), 1);
  const eye = { x: head.x + boom.x * frac, y: head.y + boom.y * frac, z: head.z + boom.z * frac };

  rig.smart.advance(rig.pitch, translating, rig.clipped, dt);
  const armPitch = Math.min(Math.max(rig.pitch, -PITCH_LIMIT), PITCH_LIMIT);
  return { eye, viewPitch: armPitch + bias };              // the view takes the bias; the eye does not
}
