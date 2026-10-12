// Parked quest steps: a gate is polled at a fixed game-time interval, then a pause, then the objective is marked done.
// Clean-room shape of Widelands mission_thread.lua, coroutine.lua and messages.lua set_objective_done, in Frankendom terms.
// simplified: Lua coroutines become an explicit step list driven by the server tick; the objective is listed as
// done when its gate passes (the donor lists it when the thread reaches the step, before the gate); message boxes,
// the water rise and the leftover-building watcher are omitted; the donor's per-gate intervals are passed in, not hard-coded.
export interface Gate {
  check(): boolean;
  pollMs: number; // poll interval in game time, like sleep(2500) inside a while loop
}

export interface Step {
  objective?: string;
  gate: Gate;
  donePauseMs: number; // like set_objective_done's sleep, default 3000 in the donor
}

export interface Parked {
  step: number;
  wakeAt: number; // absolute game time in ms, like coroutine.yield(wl.Game().time + time)
  pendingDone: boolean; // gate passed; the donor sleeps before objective.done = true
  done: string[];
}

// Advance one parked quest at game time `now` (ms). Deterministic: no frame counts.
export function tickQuest(q: Parked, steps: Step[], now: number): Parked {
  if (q.step >= steps.length || now < q.wakeAt) return q;
  const s = steps[q.step];
  if (q.pendingDone) {
    const done = s.objective ? [...q.done, s.objective] : q.done;
    return { step: q.step + 1, wakeAt: now, pendingDone: false, done };
  }
  if (!s.gate.check()) {
    return { ...q, wakeAt: now + s.gate.pollMs };
  }
  return { ...q, wakeAt: now + s.donePauseMs, pendingDone: true };
}

export {};
