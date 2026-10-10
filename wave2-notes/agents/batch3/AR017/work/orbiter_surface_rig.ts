// Licence: MIT (Vessel.cpp, ShuttlePB.cpp) and GPL-3.0 or LGPL-3.0 dual (VVessel.cpp, the visual evaluator) (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface ControlSurface {
  permanent: number;   // persistent target, -1..1
  transient: number;   // momentary target added on top, -1..1
  level: number;       // current level, -1..1
  delay: number;       // seconds to travel from neutral to full deployment; 0 = direct
}

interface WindowedPart {
  state0: number;      // this part reacts only while the rig state is inside [state0, state1]
  state1: number;
}

// Target level: both targets added, clamped to [-1, 1].
function targetLevel(cs: ControlSurface): number {
  return Math.max(-1, Math.min(1, cs.permanent + cs.transient));
}

// Slew toward the target. Per step the level moves at most dt / delay (level units, full span = 2).
// A neutral-to-full move is one unit, so it takes `delay` seconds.
function slew(cs: ControlSurface, dt: number, direct: boolean): number {
  const tgt = targetLevel(cs);
  if (direct || cs.delay === 0) {
    cs.level = tgt;
    return cs.level;
  }
  const dmax = dt / cs.delay;
  const d = tgt - cs.level;
  if (d > dmax) cs.level += dmax;
  else if (d < -dmax) cs.level -= dmax;
  else cs.level = tgt;
  return cs.level;
}

// The rig's single 0..1 state. Level -1 maps to state 0, level +1 maps to state 1.
const rigStateOf = (level: number): number => (level + 1) * 0.5;

// Fraction of one part's own travel to apply for a step of the rig state from `from` to `to`.
// The step is clamped into the part's window, so a part only moves while the rig is inside it.
function partFraction(part: WindowedPart, from: number, to: number): number {
  const a = Math.min(Math.max(from, part.state0), part.state1);
  const b = Math.min(Math.max(to, part.state0), part.state1);
  const ds = b - a;
  if (ds === 0) return 0;                  // also covers a zero-width window
  return ds / (part.state1 - part.state0);
}

// Opening (state rising) runs parts in list order; closing runs them in reverse.
function applyOrder(count: number, from: number, to: number): number[] {
  const rising = to > from;
  return Array.from({ length: count }, (_, i) => (rising ? i : count - 1 - i));
}

export {};
