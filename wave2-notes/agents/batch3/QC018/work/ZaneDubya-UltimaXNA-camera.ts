// Licence: GPL-3.0-or-later (donor License.txt; some headers GPL-2.0-or-later). Clean-room sketch of the idea, not a translation.
export interface Spot { x: number; y: number; z: number; }

// A step between two grid cells. progress runs 0..1 over stepMs (donor: 400 ms walking on foot).
export interface Step { from: Spot; to: Spot; progress: number; }

// Advance by elapsed frame time, as the donor does: progress += frameMs / stepMs.
// On completion the step snaps to the goal and the leftover time is dropped (donor does the same).
export function tick(step: Step, frameMs: number, stepMs: number): Step {
  const progress = step.progress + frameMs / stepMs;
  if (progress < 1) return { ...step, progress };
  return { from: step.to, to: step.to, progress: 0 };
}

// Drawn position of the mover: the cell it is leaving plus the fraction of the step covered.
export function drawnPosition(step: Step): Spot {
  const p = Math.min(Math.max(step.progress, 0), 1);
  return {
    x: step.from.x + (step.to.x - step.from.x) * p,
    y: step.from.y + (step.to.y - step.from.y) * p,
    z: step.from.z + (step.to.z - step.from.z) * p,
  };
}

// Camera target: always the drawn position plus a fixed view offset, never the last whole cell.
export function cameraTarget(step: Step, viewOffset: Spot): Spot {
  const d = drawnPosition(step);
  return { x: d.x + viewOffset.x, y: d.y + viewOffset.y, z: d.z + viewOffset.z };
}
export {};
