// Licence: Sustainable Use License 1.0 (donor LICENSE.md): restricted. CLEAN-ROOM: written from the mechanism, not a translation.
// HP readout: the number rolls one step at a time from the old value to the new one, and its colour
// changes at the step where the value crosses 25% and 50% of max. The roll is timed from the frame loop;
// nothing blocks.

export type Band = "red" | "yellow" | "white";

// Thresholds are truncated integers, as in the donor: red below 25% of max, yellow below 50%, else white.
export function bandFor(hp: number, maxHp: number): Band {
  const red = Math.trunc(maxHp * 0.25);
  const yellow = Math.trunc(maxHp * 0.5);
  if (hp < red) {
    return "red";
  }
  if (hp < yellow) {
    return "yellow";
  }
  return "white";
}

export interface RollFrame {
  value: number;
  band: Band;
}

// One integer per step from `from` (exclusive) to `to` (inclusive), each with the band of that value.
export function rollPath(from: number, to: number, maxHp: number): RollFrame[] {
  const dir = to >= from ? 1 : -1;
  const frames: RollFrame[] = [];
  for (let v = from + dir; dir > 0 ? v <= to : v >= to; v += dir) {
    frames.push({ value: v, band: bandFor(v, maxHp) });
  }
  return frames;
}

// A fixed budget per change, split across the steps. The donor uses 250 / (|delta| + 1) ms per step,
// but holds three waits per step, so its real total is larger (see the note).
export function msPerStep(steps: number, budgetMs: number): number {
  return steps <= 0 ? 0 : budgetMs / (steps + 1);
}

export interface Roller {
  frames: RollFrame[];
  index: number;   // number of frames already shown
  msPerStep: number;
  acc: number;     // ms carried into the next step
}

export function startRoll(from: number, to: number, maxHp: number, budgetMs: number): Roller {
  const frames = rollPath(from, to, maxHp);
  return { frames, index: 0, msPerStep: msPerStep(frames.length, budgetMs), acc: 0 };
}

// Advance by dtMs from the frame loop. Returns the frame to show, or null once the roll is finished.
export function advanceRoll(roller: Roller, dtMs: number): RollFrame | null {
  if (roller.index >= roller.frames.length) {
    return null;
  }
  roller.acc += dtMs;
  while (roller.acc >= roller.msPerStep && roller.index < roller.frames.length) {
    roller.acc -= roller.msPerStep;
    roller.index += 1;
  }
  return roller.index < roller.frames.length ? roller.frames[roller.index] : null;
}

export {};
