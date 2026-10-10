// Licence: GPL-3.0 (donor LICENSE). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type RigState = "iso" | "third" | "first";

interface RigParams {
  pitchMin: number;      // degrees, floor for pitch goals in this state
  pitchMax: number;      // degrees, ceiling for pitch goals in this state
  fov: number;           // vertical field of view, degrees
  zoomStepMult: number;  // multiplier on wheel and ctrl-drag zoom steps
}

interface RigConfig {
  span: number;          // |altitude span| in units (65 once init has run)
  thirdEnabled: boolean; // player option
  firstEnabled: boolean; // player option
  maxZoomMult: number;   // outdoor zoom ceiling = span x maxZoomMult
  thirdThreshold: number; // third person below span x thresholdMult
}

const ZOOM_STEP = 15;
const FOCUS_LIFT_THIRD = 1.5; // units, applied only while close
const FOCUS_LIFT_FIRST = 2.0;

const RIG: Record<RigState, RigParams> = {
  iso:   { pitchMin: 190, pitchMax: 270, fov: 15, zoomStepMult: 1.0 },
  third: { pitchMin: 175, pitchMax: 270, fov: 30, zoomStepMult: 0.3 },
  first: { pitchMin: 90,  pitchMax: 270, fov: 50, zoomStepMult: 0.3 },
};

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

// Donor rule (updateState): first person only at zoom goal exactly 0 and when enabled;
// third person below span x threshold when enabled; otherwise iso. There is no hysteresis band.
function chooseState(zoomGoal: number, cfg: RigConfig): RigState {
  if (cfg.firstEnabled && zoomGoal === 0) return "first";
  if (cfg.thirdEnabled && zoomGoal < cfg.span * cfg.thirdThreshold) return "third";
  return "iso";
}

// Zoom floor depends on the player options (not on the current state): 0 with first person, 0.2 with third, else 1.
function zoomFloor(cfg: RigConfig): number {
  return cfg.span * (cfg.firstEnabled ? 0 : cfg.thirdEnabled ? 0.2 : 1);
}

// Wheel: goal moves by notches x 15 x the current state's multiplier, then clamps.
function wheelZoom(zoomGoal: number, notches: number, state: RigState, cfg: RigConfig): number {
  const stepped = zoomGoal + notches * ZOOM_STEP * RIG[state].zoomStepMult;
  return clamp(stepped, zoomFloor(cfg), cfg.span * cfg.maxZoomMult);
}

// Pitch goal is clamped to the current state's band when it is written.
function clampPitchGoal(pitchGoal: number, state: RigState): number {
  return clamp(pitchGoal, RIG[state].pitchMin, RIG[state].pitchMax);
}

// Focus height lift: applied while close (first person always; third person below the threshold).
function focusLift(state: RigState, zoomGoal: number, cfg: RigConfig): number {
  if (state === "first") return FOCUS_LIFT_FIRST;
  if (state === "third" && zoomGoal < cfg.span * cfg.thirdThreshold) return FOCUS_LIFT_THIRD;
  return 0;
}

export {};
