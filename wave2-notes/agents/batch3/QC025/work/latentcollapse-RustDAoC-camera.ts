// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Third-person orbit camera: eye = focus + spherical offset; yaw = facing + free orbit; wheel sets distance.

const TAU = Math.PI * 2;
const FULL_TURN = 4096; // heading units per full turn (DAoC turn units)

export interface OrbitCamConfig {
  focusHeight: number;      // units above the player's feet (look-at point)
  distanceMin: number;      // units
  distanceMax: number;      // units
  zoomPerNotch: number;     // multiplicative step per wheel notch
  pitchMin: number;         // radians, floor
  pitchMax: number;         // radians, ceiling
  pitchStart: number;       // radians
  lookPitchRate: number;    // radians per second while a look key is held
  turnRate: number;         // heading units per second (keyboard turn)
  mouseSens: number;        // radians per pixel
  maxFrameDt: number;       // seconds; caps dt after a stall
}

export interface OrbitCamState {
  distance: number;         // units, starts at the client default
  orbit: number;            // radians added to facing (left-drag / reset)
  pitch: number;            // radians above horizontal
}

export interface PlayerPose {
  x: number;
  y: number;
  z: number;                // feet, already seated on the ground
  heading: number;          // 0..FULL_TURN
}

// Yaw in the world XY plane. orbit = 0 puts the camera directly behind the facing.
export function cameraYaw(heading: number, orbit: number): number {
  return Math.PI / 2 - (heading / FULL_TURN) * TAU + orbit;
}

// Eye and look-at point for one frame. Rebuilt from the current pose; there is no smoothing state.
export function orbitEye(
  p: PlayerPose,
  cam: OrbitCamState,
  cfg: OrbitCamConfig,
): { eye: [number, number, number]; focus: [number, number, number] } {
  const focus: [number, number, number] = [p.x, p.y, p.z + cfg.focusHeight];
  const yaw = cameraYaw(p.heading, cam.orbit);
  const horiz = cam.distance * Math.cos(cam.pitch);
  const eye: [number, number, number] = [
    focus[0] - horiz * Math.cos(yaw),
    focus[1] - horiz * Math.sin(yaw),
    focus[2] + cam.distance * Math.sin(cam.pitch),
  ];
  return { eye, focus };
}

// Lowest pitch that keeps the eye at or above the feet on flat ground (eye z above feet = focusHeight + d*sin(p)).
export function flatGroundPitchFloor(focusHeight: number, distance: number): number {
  return Math.asin(Math.max(-1, Math.min(1, -focusHeight / distance)));
}

export function clampPitch(pitch: number, cfg: OrbitCamConfig): number {
  return Math.min(cfg.pitchMax, Math.max(cfg.pitchMin, pitch));
}

export function zoom(cam: OrbitCamState, notches: number, cfg: OrbitCamConfig): OrbitCamState {
  const d = cam.distance * Math.pow(cfg.zoomPerNotch, -notches);
  return { ...cam, distance: Math.min(cfg.distanceMax, Math.max(cfg.distanceMin, d)) };
}

// Keyboard turn for one frame. While `pinned` (right button held) the camera stays fixed in world space:
// the orbit absorbs the heading change. Otherwise `snapBehind` returns the camera behind the character.
export function turnStep(
  heading: number,
  orbit: number,
  dir: 1 | -1,
  dt: number,
  cfg: OrbitCamConfig,
  pinned: boolean,
  snapBehind: boolean,
): { heading: number; orbit: number } {
  // Heading is stored as an integer, so quantise the step the way the stored value will be.
  const next = Math.floor((((heading + dir * cfg.turnRate * dt) % FULL_TURN) + FULL_TURN) % FULL_TURN);
  if (pinned) {
    let raw = next - heading;
    if (raw > FULL_TURN / 2) raw -= FULL_TURN;
    else if (raw < -FULL_TURN / 2) raw += FULL_TURN;
    return { heading: next, orbit: wrapTau(orbit + raw * (TAU / FULL_TURN)) };
  }
  return { heading: next, orbit: snapBehind ? 0 : orbit };
}

// Mouse drag. Left drag swings the camera; right drag turns the character and resets the swing.
// Both drags tilt the camera, clamped.
export function dragStep(
  state: { heading: number; orbit: number; pitch: number },
  dx: number,
  dy: number,
  rightButton: boolean,
  cfg: OrbitCamConfig,
): { heading: number; orbit: number; pitch: number } {
  let { heading, orbit } = state;
  if (rightButton) {
    orbit = 0;
    heading = (((heading - dx * cfg.mouseSens / TAU * FULL_TURN) % FULL_TURN) + FULL_TURN) % FULL_TURN;
  } else {
    orbit = wrapTau(orbit + dx * cfg.mouseSens);
  }
  const pitch = clampPitch(state.pitch + dy * cfg.mouseSens, cfg);
  return { heading, orbit, pitch };
}

export function wrapTau(a: number): number {
  return ((a % TAU) + TAU) % TAU;
}

export function frameDt(nowMs: number, lastMs: number, cfg: OrbitCamConfig): number {
  return Math.min(cfg.maxFrameDt, Math.max(0, (nowMs - lastMs) / 1000));
}

export {};
