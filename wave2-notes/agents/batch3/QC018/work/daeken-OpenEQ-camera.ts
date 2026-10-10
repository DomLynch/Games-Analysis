// Licence: MIT OR Apache-2.0 (donor, Cargo.toml line 14). Shape adapted; written fresh in TypeScript.
export interface Vec3 { x: number; y: number; z: number; }

export interface OrbitView {
  yaw: number;           // radians; 0 looks along +Y
  pitch: number;         // radians; positive looks up
}

export interface ViewTuning {
  distance: number;      // units behind the eye (donor constant: 18)
  clearance: number;     // units kept clear of the first hit (donor constant: 0.35)
}

// Returns the parameter t in 0..1 of the first solid hit on from->to, or null if the segment is clear.
export type FirstHit = (from: Vec3, to: Vec3) => number | null;

const PITCH_LIMIT = Math.PI / 2 - 0.01;

export function clampPitch(pitch: number): number {
  return Math.min(PITCH_LIMIT, Math.max(-PITCH_LIMIT, pitch));
}

// Third-person view: the eye minus the look direction, pulled in to the first hit on the way.
export function thirdPersonView(eye: Vec3, look: OrbitView, tune: ViewTuning, firstHit: FirstHit): Vec3 {
  const cp = Math.cos(look.pitch);
  const sp = Math.sin(look.pitch);
  const desired: Vec3 = {
    x: eye.x - Math.sin(look.yaw) * cp * tune.distance,
    y: eye.y - Math.cos(look.yaw) * cp * tune.distance,
    z: eye.z - sp * tune.distance,
  };
  const length = Math.hypot(desired.x - eye.x, desired.y - eye.y, desired.z - eye.z);
  if (length <= 1e-7) return eye;
  const t = firstHit(eye, desired);
  const fraction = t === null ? 1 : Math.max(0, t - tune.clearance / length);
  return {
    x: eye.x + (desired.x - eye.x) * fraction,
    y: eye.y + (desired.y - eye.y) * fraction,
    z: eye.z + (desired.z - eye.z) * fraction,
  };
}
export {};
