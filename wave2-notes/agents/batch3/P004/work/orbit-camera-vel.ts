// Licence of donor: GPL-3.0. clean-room sketch written from the described mechanism, not a translation of the donor lines.
export {};

interface Vec3 { x: number; y: number; z: number; }
type Mode = "first" | "third";

// Ray into the voxel grid: distance along the ray to the first opaque voxel, or undefined for none.
interface Terrain { firstHit(from: Vec3, to: Vec3, maxSteps: number): number | undefined; }

const TAU = 2 * Math.PI;
const LERP_ORI_RATE = 15;   // orientation eases at this rate times dt (seconds)
const INTERP_TIME = 0.1;    // distance eases over this many seconds
const NEAR_LIMIT = 20;      // corner-fan (near) policy only below this target distance
const FAR_LIMIT = 2;        // a fan result closer than this switches to the far policy
const MIN_ZOOM = 0.1;
const MIN_THIRD = 2.35;     // third person starts at this distance times the player scale
const PITCH_LIMIT = Math.PI / 2 - 0.0001;
const MAX_STEPS = 500;

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const clamp01 = (t: number): number => Math.min(1, Math.max(0, t));
const wrap = (a: number): number => ((a % TAU) + TAU) % TAU;

// Shortest-arc easing of an angle: pick the 2*pi wrap of b that is closest to a, then lerp.
function lerpAngle(a: number, b: number, rate: number): number {
  let best = 0;
  for (const o of [-TAU, 0, TAU]) {
    if (Math.abs(a - (b + o)) < Math.abs(a - (b + best))) best = o;
  }
  return lerp(a, b + best, clamp01(rate));
}

export class OrbitCamera {
  dist = 10;
  tgtDist = 10;
  yaw = 0;
  pitch = 0;
  tgtYaw = 0;
  tgtPitch = 0;
  focus: Vec3 = { x: 0, y: 0, z: 10 };
  mode: Mode = "third";
  private lastTime: number | undefined;

  forward(): Vec3 {
    return {
      x: Math.sin(this.yaw) * Math.cos(this.pitch),
      y: Math.cos(this.yaw) * Math.cos(this.pitch),
      z: -Math.sin(this.pitch),
    };
  }

  // Input: rotation is scaled by fixate (aim zoom); yaw wraps, pitch stops short of straight up or down.
  rotateBy(dYaw: number, dPitch: number, fixate: number): void {
    this.tgtYaw = wrap(this.tgtYaw + dYaw * fixate);
    this.tgtPitch = Math.min(PITCH_LIMIT, Math.max(-PITCH_LIMIT, this.tgtPitch + dPitch * fixate));
  }

  setMode(m: Mode): void {
    if (m === this.mode) return;
    this.mode = m;
    this.tgtDist = m === "third" ? Math.max(2, this.tgtDist + 5) : MIN_ZOOM;
  }

  // Wheel zoom. Third person: the target distance moves by delta and drops to first person below
  // MIN_THIRD * scale. Zooming out of first person returns to third at MIN_THIRD * scale.
  zoom(delta: number, cap: number, scale: number): void {
    if (delta > 0 || this.mode !== "first") {
      const t = this.tgtDist + delta;
      if (this.mode === "third") {
        if (t < MIN_THIRD * scale) this.setMode("first");
        else this.tgtDist = t;
      } else {
        this.setMode("third");
        this.tgtDist = MIN_THIRD * scale;
      }
    }
    this.tgtDist = Math.min(this.tgtDist, cap);
  }

  // Per-frame easing. Distance eases over the change in game time; orientation eases over dt
  // when smoothing is on, and snaps otherwise.
  update(time: number, dt: number, smoothing: boolean): void {
    const delta = this.lastTime === undefined ? 0 : time - this.lastTime;
    this.lastTime = time;
    if (Math.abs(this.dist - this.tgtDist) > 0.01) {
      this.dist = lerp(this.dist, this.tgtDist, clamp01(0.65 * delta / INTERP_TIME));
    }
    if (smoothing) {
      this.yaw = wrap(lerpAngle(this.yaw, this.tgtYaw, LERP_ORI_RATE * dt));
      this.pitch = lerp(this.pitch, this.tgtPitch, clamp01(LERP_ORI_RATE * dt));
    } else {
      this.yaw = this.tgtYaw;
      this.pitch = this.tgtPitch;
    }
  }

  // Far policy: a single ray from the camera position back to the focus. Does not change this.dist.
  private farView(terrain: Terrain): number {
    const fwd = this.forward();
    const start = { x: this.focus.x - fwd.x * this.dist, y: this.focus.y - fwd.y * this.dist, z: this.focus.z - fwd.z * this.dist };
    const hit = terrain.firstHit(start, this.focus, MAX_STEPS);
    if (hit === undefined) return this.dist;
    return Math.max(0, Math.min(this.dist - hit - 0.03, this.dist));
  }

  // Returns the distance the view uses this frame. `corners` are the view-frustum corners, already
  // padded by the caller (the donor's padding formula is omitted here).
  computeView(terrain: Terrain, corners: Vec3[]): number {
    if (this.tgtDist >= NEAR_LIMIT) return this.farView(terrain);
    const fwd = this.forward();
    const behind: Vec3 = {
      x: this.focus.x - fwd.x * (this.dist + 0.5),
      y: this.focus.y - fwd.y * (this.dist + 0.5),
      z: this.focus.z - fwd.z * (this.dist + 0.5),
    };
    let best = Infinity;
    for (const p of [...corners, behind]) {
      const hit = terrain.firstHit(this.focus, p, MAX_STEPS);
      const d = hit === undefined ? this.dist : Math.min(hit, this.tgtDist);
      best = Math.min(best, Math.max(0, d));
    }
    if (best < FAR_LIMIT) return this.farView(terrain);
    // A collision pulls the current distance in at once; update() eases it back out.
    if (this.dist >= best) this.dist = best;
    return best;
  }
}
