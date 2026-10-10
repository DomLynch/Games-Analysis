// Licence: MIT (vE5li-korangar, LICENSE.md). Clean-room sketch of the mechanism; not a line translation.
// camera_scope: world
type Vec3 = { x: number; y: number; z: number };

interface Smoothed { current: number; desired: number }

interface CameraTuning {
  elevationRad: number;      // fixed elevation above the focus (donor: pitch -55 deg)
  yawDefaultRad: number;     // donor: 180 deg
  distanceDefault: number;   // units
  distanceMin: number;       // units
  distanceMax: number;       // units
  yawPerPixelRad: number;    // donor: 0.005 per pixel of drag
  zoomPerWheelUnit: number;  // donor: 1.0 per wheel unit
  focusSpeed: number;        // per second
  yawSpeed: number;          // per second
  distanceSpeed: number;     // per second
  deadBand: number;          // donor: 0.01, the value stops inside the band and does not snap
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

// Donor rule (smoothed.rs update): step toward desired, stop inside the dead band, never overshoot.
// Sketch: exact per-second fraction 1 - exp(-speed * dt) instead of the donor's linear speed * dt.
function stepSmoothed(s: Smoothed, speed: number, deadBand: number, dt: number): void {
  const gap = s.desired - s.current;
  if (Math.abs(gap) < deadBand) return;
  s.current += gap * (1 - Math.exp(-speed * dt));
}

class ThirdPersonCamera {
  private readonly fx: Smoothed;
  private readonly fy: Smoothed;
  private readonly fz: Smoothed;
  private readonly yaw: Smoothed;
  private readonly distance: Smoothed;
  private pos: Vec3 = { x: 0, y: 0, z: 0 };
  private dir: Vec3 = { x: 0, y: 0, z: -1 };

  constructor(private readonly t: CameraTuning, focus: Vec3) {
    this.fx = { current: focus.x, desired: focus.x };
    this.fy = { current: focus.y, desired: focus.y };
    this.fz = { current: focus.z, desired: focus.z };
    this.yaw = { current: t.yawDefaultRad, desired: t.yawDefaultRad };
    this.distance = { current: t.distanceDefault, desired: t.distanceDefault };
  }

  // Donor: set_focus_point snaps (used on map change); set_smoothed_focus_point sets the target each frame.
  snapFocus(p: Vec3): void {
    this.fx.current = this.fx.desired = p.x;
    this.fy.current = this.fy.desired = p.y;
    this.fz.current = this.fz.desired = p.z;
  }

  follow(p: Vec3): void {
    this.fx.desired = p.x;
    this.fy.desired = p.y;
    this.fz.desired = p.z;
  }

  zoom(wheelUnits: number): void {
    this.distance.desired = clamp(this.distance.desired + wheelUnits * this.t.zoomPerWheelUnit, this.t.distanceMin, this.t.distanceMax);
  }

  rotate(pixels: number): void {
    this.yaw.desired += pixels * this.t.yawPerPixelRad;
  }

  resetYaw(): void {
    this.yaw.desired = this.t.yawDefaultRad;
  }

  // Donor order inside update(): smooth focus, then distance, then yaw; then place the camera.
  update(dt: number): void {
    stepSmoothed(this.fx, this.t.focusSpeed, this.t.deadBand, dt);
    stepSmoothed(this.fy, this.t.focusSpeed, this.t.deadBand, dt);
    stepSmoothed(this.fz, this.t.focusSpeed, this.t.deadBand, dt);
    stepSmoothed(this.distance, this.t.distanceSpeed, this.t.deadBand, dt);
    stepSmoothed(this.yaw, this.t.yawSpeed, this.t.deadBand, dt);

    const d = this.distance.current;
    const e = this.t.elevationRad;
    const a = this.yaw.current;
    // Closed form of the donor's pitch-then-yaw quaternion applied to (0, 0, d); axis convention is ours.
    const off: Vec3 = { x: d * Math.cos(e) * Math.sin(a), y: d * Math.sin(e), z: d * Math.cos(e) * Math.cos(a) };
    this.pos = { x: this.fx.current + off.x, y: this.fy.current + off.y, z: this.fz.current + off.z };
    const len = Math.hypot(off.x, off.y, off.z);
    this.dir = { x: -off.x / len, y: -off.y / len, z: -off.z / len };
  }

  position(): Vec3 {
    return this.pos;
  }

  viewDirection(): Vec3 {
    return this.dir;
  }
}
