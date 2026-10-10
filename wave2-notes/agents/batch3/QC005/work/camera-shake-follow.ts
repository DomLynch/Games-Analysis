// Licence: GPL-3.0 (donor). Clean-room sketch of the shape only: a follow rig with frame-rate-aware smoothing, a shake state that decays linearly, a distance falloff for impacts, and a render-only offset that never changes the rig.
interface Vec2 { x: number; y: number; }

// Follow with smoothing per 60 Hz frame (the donor uses lerpDelta 0.08 when smooth camera is on, snap when off).
// Frame-rate independent: the per-frame factor is applied once per 60 Hz frame elapsed.
function followStep(rig: Vec2, target: Vec2, dtMs: number, smooth: boolean): void {
  if (!smooth) { rig.x = target.x; rig.y = target.y; return; }
  const frames = (dtMs * 60) / 1000;
  const a = 1 - Math.pow(1 - 0.08, frames);
  rig.x += (target.x - rig.x) * a;
  rig.y += (target.y - rig.y) * a;
}

interface Shake { intensity: number; time: number; reduction: number; }

// As in the donor: keep the strongest intensity and the longest duration; decay linearly to zero over the duration.
function shake(s: Shake, intensity: number, duration: number): void {
  s.intensity = Math.max(s.intensity, Math.min(Math.max(intensity, 0), 100));
  s.time = Math.max(s.time, duration);
  s.reduction = s.intensity / s.time;
}

// Impacts fall off with the square of distance from the camera: full strength within about 100 donor units (donor constant 10000; donor distances are world pixels, so rescale if our units differ).
function impactIntensity(intensity: number, distance: number): number {
  const d = Math.max(distance, 1);
  return Math.min(1, 10000 / (d * d)) * intensity;
}

// Render-only offset for one frame. The caller adds it to a copy of the rig position for drawing and never writes it back.
function frameShakeOffset(s: Shake, dtMs: number, screenShake: number, rand: () => number): Vec2 {
  if (s.time <= 0) { s.intensity = 0; return { x: 0, y: 0 }; }
  const frames = (dtMs * 60) / 1000;
  const magnitude = s.intensity * (screenShake / 4) * 0.75 * rand();
  const angle = rand() * Math.PI * 2;
  s.intensity = Math.min(100, Math.max(0, s.intensity - s.reduction * frames));
  s.time -= frames;
  return { x: Math.cos(angle) * magnitude, y: Math.sin(angle) * magnitude };
}

export {};
