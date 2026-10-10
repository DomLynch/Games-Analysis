// Licence: GPL-3.0 (donor). Clean-room sketch of the shape only (destination/current orbit with zone limits), written from the described mechanism.
type Vec3 = { x: number; y: number; z: number };

const DEG = Math.PI / 180;
const DRAG_LON_DEG_PER_PX = 0.4;   // donor kDragLongitudePerPixel
const DRAG_LAT_DEG_PER_PX = -0.3;  // donor kDragLatitudePerPixel
const WHEEL_DIST_PER_NOTCH = -60;  // donor kWheelDistancePerNotch
const CATCH_UP_PER_60HZ = 0.1;     // donor: 0.1 per call; here corrected to a 60 Hz rate

export interface ZoneLimits {
  minDistance: number;
  maxDistance: number;
  defaultDistance: number;
  minLat: number;   // degrees, negative looks down
  maxLat: number;
  defaultLat: number;
  defaultLon: number;
  lockLon: boolean; // indoor zones lock the yaw
}

interface Pose { lon: number; lat: number; dist: number; at: Vec3; }

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const wrap180 = (d: number): number => ((d + 540) % 360) - 180;
const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  z: a.z + (b.z - a.z) * t,
});

export class ZoneOrbitCamera {
  private dest: Pose;
  private cur: Pose;
  private primed = false;

  constructor(private readonly zone: ZoneLimits, private readonly groundAt: (x: number, z: number) => number) {
    const base: Pose = {
      lon: zone.defaultLon,
      lat: clamp(zone.defaultLat, zone.minLat, zone.maxLat),
      dist: clamp(zone.defaultDistance, zone.minDistance, zone.maxDistance),
      at: { x: 0, y: 0, z: 0 },
    };
    this.dest = { ...base, at: { ...base.at } };
    this.cur = { ...base, at: { ...base.at } };
  }

  // Mouse drag and wheel write only the destination; the view follows in update().
  drag(dxPx: number, dyPx: number): void {
    this.dest.lon = this.zone.lockLon ? this.zone.defaultLon : this.dest.lon + dxPx * DRAG_LON_DEG_PER_PX;
    this.dest.lat = clamp(this.dest.lat + dyPx * DRAG_LAT_DEG_PER_PX, this.zone.minLat, this.zone.maxLat);
  }

  wheel(notches: number): void {
    this.dest.dist = clamp(this.dest.dist + notches * WHEEL_DIST_PER_NOTCH, this.zone.minDistance, this.zone.maxDistance);
  }

  // dt in seconds. Returns the eye and look-at point for this frame.
  update(player: Vec3, dt: number): { eye: Vec3; lookAt: Vec3 } {
    this.dest.at = { ...player };
    if (!this.primed) {
      this.cur = { ...this.dest, at: { ...player } };
      this.primed = true;
    }
    const a = 1 - Math.pow(1 - CATCH_UP_PER_60HZ, Math.max(0, dt) * 60);

    // Longitude moves the short way round; a locked zone keeps its fixed yaw.
    this.cur.lon = this.zone.lockLon
      ? this.zone.defaultLon
      : this.cur.lon + wrap180(this.dest.lon - this.cur.lon) * a;
    this.cur.lat = clamp(this.cur.lat + (this.dest.lat - this.cur.lat) * a, this.zone.minLat, this.zone.maxLat);
    this.cur.dist = clamp(
      this.cur.dist + (this.dest.dist - this.cur.dist) * a,
      this.zone.minDistance,
      this.zone.maxDistance,
    );
    this.cur.at = lerp3(this.cur.at, this.dest.at, a);

    // Eye in a y-up frame: a negative latitude puts the eye above the look-at point.
    const lat = this.cur.lat * DEG;
    const lon = this.cur.lon * DEG;
    const d = this.cur.dist;
    const eye: Vec3 = {
      x: this.cur.at.x - Math.cos(lat) * Math.sin(lon) * d,
      y: this.cur.at.y - Math.sin(lat) * d,
      z: this.cur.at.z - Math.cos(lat) * Math.cos(lon) * d,
    };

    // Ground floor: lift the eye to the ground when the ground is above it (no margin, as in the donor).
    const ground = this.groundAt(eye.x, eye.z);
    if (ground > eye.y) eye.y = ground;

    return { eye, lookAt: this.cur.at };
  }
}

export {};
