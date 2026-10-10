// Licence: MIT (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Third-person chase camera: eye sits on a sphere around a look-at point, heading = character yaw + free offset.
// World is y-up; the ground plane is x and z.

const TAU = Math.PI * 2;

export interface ChaseCamConfig {
  lookAtFraction: number;   // look-at height as a fraction of model height (0.62 in the donor)
  distMin: number;          // world units
  distMax: number;          // world units
  zoomIn: number;           // multiplicative per wheel step toward the character (0.89 in the donor)
  zoomOut: number;          // multiplicative per wheel step away (1.12 in the donor)
  pitchMin: number;         // radians
  pitchMax: number;         // radians
  floorClearance: number;   // world units the eye keeps above the ground under it
  returnRate: number;       // per second; the swung offset decays only while the character moves
  mouseYawSens: number;     // radians per pixel
  mouseTiltSens: number;    // radians per pixel
}

export interface ChaseCamState {
  off: number;              // offset from the character's yaw, wrapped to -pi..pi
  pitch: number;            // radians above horizontal
  dist: number;             // world units
}

export interface Pose {
  x: number;
  z: number;
  yaw: number;
  modelHeight: number;      // world units
  modelScale: number;
}

export function wrapPi(a: number): number {
  return ((a + Math.PI) % TAU + TAU) % TAU - Math.PI;
}

// Camera heading is the character's yaw plus the swung offset.
export function chaseYaw(pose: Pose, cam: ChaseCamState): number {
  return pose.yaw + cam.off;
}

// Eye on a sphere of radius dist around the look-at point, then lifted (only upward) to clear the ground under it.
export function chaseEye(
  pose: Pose,
  cam: ChaseCamState,
  cfg: ChaseCamConfig,
  groundAt: (x: number, z: number) => number,
): { eye: [number, number, number]; target: [number, number, number] } {
  const groundY = groundAt(pose.x, pose.z);
  const target: [number, number, number] = [pose.x, groundY + pose.modelHeight * pose.modelScale * cfg.lookAtFraction, pose.z];
  const yaw = chaseYaw(pose, cam);
  const op = Math.cos(cam.pitch);
  const os = Math.sin(cam.pitch);
  // Unit vector from the eye toward the target.
  const look: [number, number, number] = [Math.sin(yaw) * op, -os, -Math.cos(yaw) * op];
  const eye: [number, number, number] = [
    target[0] - look[0] * cam.dist,
    target[1] - look[1] * cam.dist,
    target[2] - look[2] * cam.dist,
  ];
  // Vertical lift only. It does not pull the eye toward the target, so the sphere distance is not kept when it fires.
  const floor = groundAt(eye[0], eye[2]) + cfg.floorClearance;
  if (eye[1] < floor) eye[1] = floor;
  return { eye, target };
}

// Right-drag swings the offset and tilts the pitch; both are clamped or wrapped.
export function dragCamera(cam: ChaseCamState, dx: number, dy: number, cfg: ChaseCamConfig): ChaseCamState {
  const pitch = Math.max(cfg.pitchMin, Math.min(cfg.pitchMax, cam.pitch + dy * cfg.mouseTiltSens));
  return { ...cam, off: wrapPi(cam.off - dx * cfg.mouseYawSens), pitch };
}

// Wheel: a step toward the character shrinks the distance, a step away grows it.
export function wheelZoom(cam: ChaseCamState, deltaY: number, cfg: ChaseCamConfig): ChaseCamState {
  const f = deltaY > 0 ? cfg.zoomOut : cfg.zoomIn;
  return { ...cam, dist: Math.max(cfg.distMin, Math.min(cfg.distMax, cam.dist * f)) };
}

// Swung offset eases back toward behind the character, only while the character moves.
export function recentre(cam: ChaseCamState, moving: boolean, dt: number, cfg: ChaseCamConfig): ChaseCamState {
  if (!moving) return { ...cam, off: wrapPi(cam.off) };
  return { ...cam, off: wrapPi(cam.off * Math.max(0, 1 - cfg.returnRate * dt)) };
}

export {};
