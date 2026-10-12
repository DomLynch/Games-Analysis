// Licence: GNU AGPL v3 or later (donor). Clean-room: shape only, written fresh from the described mechanism, not a translation.
export const SMOOTH_FRAMES = 50;   // window length for the ratio smoother (shape of the donor's constant)
export const OVERSHOOT_CAP = 1.1;  // a smoothed budget may exceed the wanted count by at most 10%

export type BudgetMode = "off" | "on" | "clamp";

// One face budget per group (client config supplies `wanted`, e.g. skin, effects, selection reticle).
export class FaceBudget {
  private asked = 0;
  private ratio = 1;
  private readonly window: number[] = [];

  constructor(public wanted: number, public mode: BudgetMode = "clamp") {}

  beginFrame(): void {
    this.asked = 0;
  }

  // Pass 0: each model adds its distance-based triangle count.
  ask(triangles: number): void {
    this.asked += triangles;
  }

  // After all asks: derive this frame's ratio and smooth it.
  endFrame(): void {
    if (this.mode === "off") {
      this.ratio = 1;
      this.window.length = 0;
      return;
    }
    let r = this.asked > 0 ? this.wanted / this.asked : 1;
    if (this.mode === "clamp") r = Math.min(1, r);
    if (!Number.isFinite(r)) r = 1; // NaN / infinity guard

    this.window.push(r);
    if (this.window.length > SMOOTH_FRAMES) this.window.shift();
    // Mean recomputed from the window each frame: no running sum, so no float drift.
    let smooth = this.window.reduce((a, b) => a + b, 0) / this.window.length;

    // Guard: if smoothing lags a sudden crowd and the budget overshoots, restart the window
    // from the instantaneous ratio, still capped at OVERSHOOT_CAP.
    if (smooth * this.asked > this.wanted * OVERSHOOT_CAP) {
      smooth = r * OVERSHOOT_CAP;
      this.window.length = 0;
      this.window.push(smooth);
    }
    this.ratio = smooth;
  }

  // Pass 1: the model's budgeted triangle count. Does not change `triangles`.
  budgetFor(triangles: number): number {
    return triangles * this.ratio;
  }
}

// One LOD slot: a straight line of triangles over distance, plus its end count.
export interface LodSlot {
  slope: number;      // triangles per unit distance
  intercept: number;  // triangles at distance 0 of the line
  endCount: number;   // triangles at the slot's far end
}

// Slots run from most to least detail; endCount falls with distance.
// Pick the first slot whose far end still fits the budget; the last slot is the fallback.
export function pickSlot(slots: LodSlot[], budget: number): number {
  let i = 0;
  while (i < slots.length - 1 && budget < slots[i].endCount) i++;
  return i;
}

// Triangles of a slot at a distance (the line, not a table lookup).
export function trianglesAt(slot: LodSlot, distance: number): number {
  return slot.slope * distance + slot.intercept;
}

// Inverse: the distance at which the slot line gives the budget. Zero slope guarded (the donor does not).
export function distanceForBudget(slot: LodSlot, budget: number): number {
  return slot.slope !== 0 ? (budget - slot.intercept) / slot.slope : 0;
}

export {};
