// Quest step journal with gap (skip) and rollback rules, modelled on L2Dn QuestState.setCond.
export const MAX_TRACKED_STEP = 31; // donor: steps above 31 are not supported

export interface StepJournal {
  step: number;     // current step; 0 = not started
  done: boolean[];  // done[k - 1] === true when step k has been reached and not rolled back
}

export function emptyJournal(): StepJournal {
  return { step: 0, done: [] };
}

// Steps 1 and 2 are never gaps (donor: the first step is never skipped; cond 2 is "safe").
// A gap is a step k with 3 <= k < current step that is not done.
export function gaps(j: StepJournal): number[] {
  const out: number[] = [];
  for (let k = 3; k < j.step; k++) {
    if (!j.done[k - 1]) out.push(k);
  }
  return out;
}

export function advanceStep(j: StepJournal, next: number): StepJournal {
  if (next === j.step) return j;

  // Untracked range: no journal is kept for steps below 3 or above 31.
  // simplified: donor can write a skip word for next > 31 (shift wraps); here nothing is stored.
  if (next < 3 || next > MAX_TRACKED_STEP) {
    return { step: next, done: [] };
  }

  // Rollback: keep steps 1..next-1 only; the step rolled back to is no longer done.
  if (next < j.step) {
    return { step: next, done: j.done.slice(0, next - 1) };
  }

  // Forward move. If no gaps exist yet, every step reached so far counts as done;
  // a jump over steps then leaves those steps open. With gaps already present,
  // only the arrival step is marked.
  const done = j.done.slice();
  if (gaps(j).length === 0) {
    // step 1 is always marked (donor sets bit 0 whenever a skip is recorded)
    for (let k = 1; k <= Math.max(j.step, 1); k++) done[k - 1] = true;
  }
  done[next - 1] = true;
  return { step: next, done };
}

export {};
