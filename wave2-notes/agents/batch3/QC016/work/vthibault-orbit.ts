// Licence: GPL-3.0 (donor LICENSE). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface OrbitTuning {
  yawMin: number;      // degrees, lower yaw bound
  yawMax: number;      // degrees, upper yaw bound
  pitchMin: number;    // degrees, lower pitch bound
  pitchMax: number;    // degrees, upper pitch bound
  zoomMin: number;     // distance floor
  zoomMax: number;     // distance ceiling
  wheelStep: number;   // zoom change per wheel notch
  lerpPerMs: number;   // smoothing rate per millisecond
}

interface Orbit {
  yaw: number; pitch: number; zoom: number;             // values used to draw the view
  yawGoal: number; pitchGoal: number; zoomGoal: number; // values the input asks for
  focusX: number; focusY: number; focusZ: number;       // smoothed follow point
}

type DragMode = "yaw" | "pitch" | "zoom";

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

// Input step: dx and dy are pixel deltas since the last drag event.
function dragOrbit(o: Orbit, t: OrbitTuning, dx: number, dy: number, screenW: number, screenH: number, mode: DragMode): void {
  if (mode === "pitch") {
    o.pitchGoal = clamp(o.pitchGoal + (dy / screenH) * 300, t.pitchMin, t.pitchMax);
  } else if (mode === "zoom") {
    o.zoomGoal = clamp(o.zoomGoal - (dy / screenH) * 150, t.zoomMin, t.zoomMax);
  } else {
    o.yawGoal = clamp(o.yawGoal - (dx / screenW) * 720, t.yawMin, t.yawMax);
  }
}

// Wheel step: notches is signed (positive = zoom in).
function wheelZoom(o: Orbit, t: OrbitTuning, notches: number): void {
  o.zoomGoal = clamp(o.zoomGoal + notches * t.wheelStep, t.zoomMin, t.zoomMax);
}

// Per-frame step, run after the input step. The step is linear in dtMs and capped at 1.
function stepOrbit(o: Orbit, t: OrbitTuning, dtMs: number, smooth: boolean, targetX: number, targetY: number, targetZ: number): void {
  const lerp = Math.min(dtMs * t.lerpPerMs, 1.0);
  if (smooth) {
    o.focusX += (targetX - o.focusX) * lerp;
    o.focusY += (targetY - o.focusY) * lerp;
    o.focusZ += (targetZ - o.focusZ) * lerp;
  } else {
    o.focusX = targetX; o.focusY = targetY; o.focusZ = targetZ;
  }
  o.zoom  += (o.zoomGoal  - o.zoom)  * lerp * 2.0;
  o.yaw   += (o.yawGoal   - o.yaw)   * lerp * 2.0;
  o.pitch += (o.pitchGoal - o.pitch) * lerp * 2.0;
}

export {};
