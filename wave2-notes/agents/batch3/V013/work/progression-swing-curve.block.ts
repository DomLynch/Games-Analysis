// Clean-room sketch: a swing time that a skill-like speed mod shortens toward a floor.
// Only the idea is taken. Base and blend are illustrative values chosen here, not the donor's.

interface SwingCurve {
  base: number;   // in (0, 1): how strongly each unit of mod shortens the swing
  blend: number;  // > 0: sets the floor, which is blend / (blend + 1)
}

const MOD_MIN = -5;  // our clamp: the idea has no ceiling for negative mods, so bound both ends
const MOD_MAX = 20;

// Multiplier on the base swing time. A mod of 0 gives 1; a positive mod moves toward the floor.
function swingMultiplier(mod: number, curve: SwingCurve): number {
  const m = Math.min(MOD_MAX, Math.max(MOD_MIN, mod));
  const decay = Math.pow(curve.base, m);
  return (decay + curve.blend) / (curve.blend + 1);
}

// Swing time in milliseconds for one swing of the duel step.
function swingMs(baseSwingMs: number, mod: number, curve: SwingCurve): number {
  return baseSwingMs * swingMultiplier(mod, curve);
}

// Tuning sweep: one row per mod value from start to max in steps (tooling, not runtime).
function sweepSwing(
  baseSwingMs: number, start: number, step: number, max: number, curve: SwingCurve
): Array<{ mod: number; swingMs: number }> {
  const rows: Array<{ mod: number; swingMs: number }> = [];
  for (let mod = start; mod <= max + 1e-9; mod += step) {
    rows.push({ mod, swingMs: swingMs(baseSwingMs, mod, curve) });
  }
  return rows;
}

const example: SwingCurve = { base: 0.9, blend: 1 };
console.log(swingMs(1000, 0, example), sweepSwing(1000, 0, 5, 20, example).length);
