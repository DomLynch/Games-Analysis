// Licence: MIT (donor, OpenTESArena LICENSE.txt). Clean-room sketch of the update order and the look rules; not a line-by-line copy.
// Client-only: nothing here touches the engine's health, hits or spawns.
type Vec3 = { x: number; y: number; z: number };

interface Settings {
  sensitivityH: number;   // options default 2.5, range 0.5..12
  sensitivityV: number;   // options default 2.5, range 0.5..12
  pitchLimitDeg: number;  // options default 90, range 0..90
  invertV: boolean;       // options default false
}

interface Rig {
  yawDeg: number;         // unclamped in degrees, wrapped to [0, 360)
  pitchDeg: number;       // clamped to +/- pitchLimitDeg
}

const DEG_PER_OPTION_UNIT = 100;                 // donor multiplies option values by 100
const EYE_OFFSET_UNITS = (60 - 61 * 0.5) / 128;  // eye = collider centre + (EyeHeight - TopOfHead/2) / ARENA_UNITS

// Per-frame turn from a mouse delta in pixels. Divided by the smaller screen side so look speed is the same at any aspect ratio.
function mouseLookDeltaDeg(dxPx: number, dyPx: number, screenW: number, screenH: number, s: Settings): { dYaw: number; dPitch: number } {
  const minSide = Math.min(screenW, screenH);
  const dxPercent = dxPx / minSide;
  const dyPercent = dyPx / minSide;
  const vSign = s.invertV ? -1 : 1;
  return {
    dYaw: -dxPercent * (DEG_PER_OPTION_UNIT * s.sensitivityH),
    dPitch: -dyPercent * (DEG_PER_OPTION_UNIT * s.sensitivityV) * vSign,
  };
}

// Keyboard turn (classic mode). turningScale is 1.0 on foot and 2/3 when swimming; dt is seconds.
function keyboardYawDeltaDeg(turnLeft: boolean, turnRight: boolean, swimming: boolean, dtSec: number, s: Settings): number {
  const turningScale = swimming ? 2 / 3 : 1.0;
  const sign = turnLeft ? 1 : turnRight ? -1 : 0;
  return sign * turningScale * dtSec * (DEG_PER_OPTION_UNIT * s.sensitivityH);
}

// Apply turn, clamped pitch and wrapped yaw to the rig. Called BEFORE the physics step.
function applyTurn(rig: Rig, dYaw: number, dPitch: number, s: Settings): void {
  const limit = Math.min(Math.max(s.pitchLimitDeg, 0), 90);
  rig.yawDeg = ((rig.yawDeg + dYaw) % 360 + 360) % 360;
  rig.pitchDeg = Math.min(Math.max(rig.pitchDeg + dPitch, -limit), limit);
}

// Camera eye, derived from the collider centre AFTER this tick's physics step (no smoothing, no lag).
function eyeFromCentre(centreAfterPhysics: Vec3): Vec3 {
  return { x: centreAfterPhysics.x, y: centreAfterPhysics.y + EYE_OFFSET_UNITS, z: centreAfterPhysics.z };
}

// One frame in donor order: turn, then physics, then camera eye.
function tickCameraFrame(
  rig: Rig,
  s: Settings,
  look: { dxPx: number; dyPx: number },
  keyboard: { left: boolean; right: boolean; swimming: boolean },
  dtSec: number,
  screenW: number,
  screenH: number,
  stepPhysics: () => Vec3,   // returns the collider centre after the physics step
): { eye: Vec3; yawDeg: number; pitchDeg: number } {
  const mouse = mouseLookDeltaDeg(look.dxPx, look.dyPx, screenW, screenH, s);
  const keyYaw = keyboardYawDeltaDeg(keyboard.left, keyboard.right, keyboard.swimming, dtSec, s);
  applyTurn(rig, mouse.dYaw + keyYaw, mouse.dPitch, s);
  const centre = stepPhysics();
  return { eye: eyeFromCentre(centre), yawDeg: rig.yawDeg, pitchDeg: rig.pitchDeg };
}

export {}
