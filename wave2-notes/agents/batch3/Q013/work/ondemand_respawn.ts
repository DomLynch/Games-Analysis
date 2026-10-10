// Lazy respawn timer for one spawn point or zone group. There is no ticker: the state is
// worked out only when someone observes it (a player enters, or the zone is queried).
export interface SpawnStage {
  atS: number;   // seconds into the current cycle where this stage starts; first stage must be 0
  name: string;
}

export interface LazyTimer {
  startedAt: number;     // server-clock seconds when the current cycle started
  stages: SpawnStage[];  // sorted ascending by atS
  cycleS: number | null; // cycle length in seconds; null means the timer does not loop
  cycles: number;        // completed cycles, counted when observed
}

export interface Observed {
  stage: string;
  newCycles: number;     // cycles that wrapped since the last observation (can be > 1)
}

export function observe(t: LazyTimer, now: number): Observed {
  let elapsed = now - t.startedAt;
  let newCycles = 0;
  if (t.cycleS !== null && elapsed >= t.cycleS) {
    newCycles = Math.floor(elapsed / t.cycleS);
    t.cycles += newCycles;
    elapsed = elapsed % t.cycleS;
    t.startedAt = now - elapsed;
  }
  let stage = t.stages[0].name;
  for (const s of t.stages) {
    if (elapsed >= s.atS) stage = s.name;
  }
  return { stage, newCycles };
}

export {};
