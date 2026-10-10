// Licence: AGPL-3.0 (guilhermelhr-unityro). Clean-room sketch of the shape only; not a line translation.
// camera_scope: world
type Vec3 = { x: number; y: number; z: number };

interface Inertia { velocity: number; ratio: number; clock: number; changed: boolean }
interface InertiaTuning { lerpTime: number; threshold: number }
interface OrbitTuning { minPitchRad: number; maxPitchRad: number; minDistance: number; maxDistance: number }

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function setInertia(c: Inertia, velocity: number): void {
  c.velocity = velocity;
  c.ratio = 1;
  c.changed = true;
}

// Donor (CameraControlProfile.Release): a coast starts only when the last velocity reaches the threshold in either direction.
function releaseInertia(c: Inertia, t: InertiaTuning): void {
  if (Math.abs(c.velocity) >= t.threshold) {
    c.clock = t.lerpTime;
    c.ratio = 1;
  }
}

// Donor (CameraControlProfile.Update): while the clock runs, the ratio falls linearly from 1 to 0 over lerpTime.
// Returns true when the value should be applied this tick.
function tickInertia(c: Inertia, t: InertiaTuning, dt: number): boolean {
  if (c.clock > 0) {
    c.clock -= dt;
    c.ratio = clamp(c.clock / t.lerpTime, 0, 1);
    return true;
  }
  if (c.changed) {
    c.changed = false;
    return true;
  }
  return false;
}

function effectiveVelocity(c: Inertia): number {
  return c.velocity * c.ratio;
}

class OrbitCamera {
  yaw: number;
  pitch: number;
  distance: number;
  private readonly yawIn: Inertia = { velocity: 0, ratio: 1, clock: 0, changed: false };
  private readonly zoomIn: Inertia = { velocity: 0, ratio: 1, clock: 0, changed: false };

  constructor(
    private readonly t: OrbitTuning,
    private readonly yawT: InertiaTuning,
    private readonly zoomT: InertiaTuning,
    private readonly zoomPerUnit: number,
    initial: { yaw: number; pitch: number; distance: number },
  ) {
    this.yaw = initial.yaw;
    this.pitch = clamp(initial.pitch, t.minPitchRad, t.maxPitchRad);
    this.distance = initial.distance;
  }

  // Sketch: velocity in radians per second. The donor multiplies a per-frame axis value by dt; that is not copied.
  dragYaw(radPerSecond: number): void {
    setInertia(this.yawIn, radPerSecond);
  }

  releaseYaw(): void {
    releaseInertia(this.yawIn, this.yawT);
  }

  // Donor: a wheel tick without shift sets zoom inertia and releases it at once.
  wheel(units: number): void {
    setInertia(this.zoomIn, units * this.zoomPerUnit);
    releaseInertia(this.zoomIn, this.zoomT);
  }

  // Donor: shift + drag or shift + wheel changes pitch; the result is clamped to the pitch constraint.
  nudgePitch(radDelta: number): void {
    this.pitch = clamp(this.pitch + radDelta, this.t.minPitchRad, this.t.maxPitchRad);
  }

  // Donor Update(): apply yaw and zoom inertia.
  update(dt: number): void {
    if (tickInertia(this.yawIn, this.yawT, dt)) {
      this.yaw -= effectiveVelocity(this.yawIn) * dt;
      if (this.yaw < 0) this.yaw += 2 * Math.PI;
    }
    if (tickInertia(this.zoomIn, this.zoomT, dt)) {
      this.distance = clamp(this.distance + effectiveVelocity(this.zoomIn) * dt, this.t.minDistance, this.t.maxDistance);
    }
  }

  // Donor LateUpdate(): place the camera on a sphere of radius distance around the target, then look at it.
  place(target: Vec3): Vec3 {
    const r = Math.cos(this.pitch);
    const hx = Math.cos(this.yaw) * r;
    const hy = -Math.sin(this.pitch);
    const hz = Math.sin(this.yaw) * r;
    return {
      x: target.x - hx * this.distance,
      y: target.y - hy * this.distance,
      z: target.z - hz * this.distance,
    };
  }
}

export {};
