// Licence: MIT (donor, OTClient). Clean-room sketch of the shape only: the camera target is the logical position, and the displayed focus lags it by the unfinished part of the step.
interface Vec2 { x: number; z: number; }

interface Step {
  from: Vec2;           // previous logical position (world units)
  to: Vec2;             // logical position, set when the step starts
  durationMs: number;   // full step duration
  startedAtMs: number;  // clock time when the step started
}

// Step duration as in the donor for the old speed law: 1000 * groundSpeed / speed, with 150 used when the tile has no ground speed.
// Donor guard: a speed below 1 gives 0. (With the new speed law the donor divides by a cached calculated speed instead; not modelled.)
function stepDurationMs(speed: number, groundSpeed: number): number {
  if (speed < 1) return 0;
  const g = groundSpeed === 0 ? 150 : groundSpeed;
  return (1000 * g) / speed;
}

// Focus used by the camera rig. At the start of a step it sits on the previous tile; it reaches the logical tile at the end.
function focusPosition(step: Step | null, logical: Vec2, nowMs: number): Vec2 {
  if (step === null) return logical;
  const raw = (nowMs - step.startedAtMs) / step.durationMs;
  const t = Math.min(1, Math.max(0, raw));  // frame-rate independent: uses clock time, not frames
  const behind = 1 - t;
  return {
    x: step.to.x + (step.from.x - step.to.x) * behind,
    z: step.to.z + (step.from.z - step.to.z) * behind,
  };
}

export {};
