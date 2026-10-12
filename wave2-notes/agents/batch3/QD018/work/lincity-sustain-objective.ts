// Sustain objective: a quest step that completes once every criterion has
// held for its target number of periods in a row. A period is one game-year.
// A violation resets only that criterion's streak. Completion latches once.
export {};

export interface Criterion {
  readonly name: string;
  readonly targetPeriods: number; // data: periods of streak needed
  streak: number;
  dirty: boolean; // set by a system during the period; forces a reset at the next test
}

export interface Band {
  value: number; // anchor value the band is measured from
}

export interface Objective {
  readonly criteria: Criterion[];
  done: boolean;
}

export function newObjective(
  criteria: Array<{ name: string; targetPeriods: number }>,
): Objective {
  return {
    criteria: criteria.map((c) => ({ ...c, streak: 0, dirty: false })),
    done: false,
  };
}

// A producer marks a criterion dirty between periodic tests.
export function markDirty(obj: Objective, name: string): void {
  const c = obj.criteria.find((x) => x.name === name);
  if (c) c.dirty = true;
}

// Population-style band: holds while |now - anchor| * den <= anchor * num and
// now >= floor. On violation the anchor moves to now.
export function bandHolds(
  now: number,
  band: Band,
  num: number,
  den: number,
  floor: number,
): boolean {
  const ok = Math.abs(now - band.value) * den <= band.value * num && now >= floor;
  if (!ok) band.value = now;
  return ok;
}

// Called once per period. holds[name] is this period's result for each criterion.
// Returns true only on the call where the objective completes (latch).
export function periodTest(
  obj: Objective,
  holds: Record<string, boolean>,
  onComplete: () => void,
): boolean {
  if (obj.done) return false;
  for (const c of obj.criteria) {
    const ok = !c.dirty && (holds[c.name] ?? false);
    c.streak = ok ? c.streak + 1 : 0;
    c.dirty = false;
  }
  if (obj.criteria.every((c) => c.streak >= c.targetPeriods)) {
    obj.done = true;
    onComplete();
    return true;
  }
  return false;
}

// Example use: one objective, three criteria, one 1/40 population band.
const band = { value: 5000 };
const obj = newObjective([
  { name: "pop", targetPeriods: 60 },
  { name: "tech", targetPeriods: 120 },
  { name: "coal", targetPeriods: 180 },
]);
markDirty(obj, "coal");
const holdsPop = bandHolds(5100, band, 1, 40, 5000);
periodTest(obj, { pop: holdsPop, tech: true, coal: true }, () => {});
