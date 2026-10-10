// Licence of donor: Apache 2.0 for the source (LICENSE.md line 3). This sketch is written from the described mechanism, not a translation.
// Client view only: the displayed value and icon state are drawn, never written back to health.

type IconState = "idle" | "winning" | "losing";

interface HealthHudData {
  max: number;           // health maximum (donor: 2.0, data)
  loseAt: number;        // fraction of max below which the losing icon plays (donor: 0.2)
  winAt: number;         // fraction of max above which the winning icon plays (donor: 0.8)
  exitBand: number;      // fraction of max the exit threshold sits away from the entry threshold (proposed, not in donor)
  chaseSeconds: number;  // time for the displayed value to close to within `precision` of the real value
  precision: number;     // residual fraction at chaseSeconds (donor helper default: 0.01)
  snapEpsilon: number;   // absolute snap distance in health units (proposed fix)
}

interface HealthHudState {
  shown: number;         // the displayed (lagging) health
  icon: IconState;
}

// Frame-rate independent chase: the gap to the real value shrinks by precision^(dt / chaseSeconds).
function chaseShown(st: HealthHudState, real: number, dtSec: number, d: HealthHudData): void {
  if (st.shown === real) return;
  const keep = Math.pow(d.precision, dtSec / d.chaseSeconds);
  st.shown = real + (st.shown - real) * keep;
  if (Math.abs(st.shown - real) < d.snapEpsilon) st.shown = real;
}

// Icon state reads the real health, with an exit band so it does not flicker at a threshold.
function stepIcon(st: HealthHudState, real: number, d: HealthHudData): void {
  const lose = d.loseAt * d.max;
  const win = d.winAt * d.max;
  const band = d.exitBand * d.max;
  if (st.icon === "idle") {
    if (real < lose) st.icon = "losing";
    else if (real > win) st.icon = "winning";
  } else if (st.icon === "losing") {
    if (real > lose + band) st.icon = "idle";
  } else {
    if (real < win - band) st.icon = "idle";
  }
}

export {};
