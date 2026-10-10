// Licence: MIT (donor LICENSE, Daggerfall Workshop 2009-2023). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Vec3 { x: number; y: number; z: number; }

export interface CreatureVisual {
  bloodFrame: number; // per-creature data field; the donor's struct default is 0
}

export interface Splash {
  frame: number;
  position: Vec3;
  fps: number;
  oneShot: true;
}

export const SPLASH_FPS = 10;   // donor: c.FramesPerSecond = 10
export const FACE_NUDGE = 0.02; // donor: transform.forward * 0.02f, pulls the sprite off the body

function nudge(p: Vec3, forward: Vec3, d: number): Vec3 {
  return { x: p.x + forward.x * d, y: p.y + forward.y * d, z: p.z + forward.z * d };
}

// Called once per landed hit. Blood is shown only when the hit did damage (zero-damage hits show nothing).
export function onHit(
  damage: number,
  creature: CreatureVisual,
  hitPoint: Vec3,
  forward: Vec3,
  spawn: (s: Splash) => void,
): void {
  if (damage <= 0) return;
  spawn({
    frame: creature.bloodFrame,
    position: nudge(hitPoint, forward, FACE_NUDGE),
    fps: SPLASH_FPS,
    oneShot: true,
  });
}

// Frame to show at `elapsedS` seconds after spawn, or null once the sprite should be removed.
// Donor: frames play in order at FramesPerSecond; the object is destroyed after the last frame.
export function frameAt(elapsedS: number, fps: number, frameCount: number): number | null {
  const frame = Math.floor(elapsedS * fps);
  return frame >= frameCount ? null : frame;
}
export {};
