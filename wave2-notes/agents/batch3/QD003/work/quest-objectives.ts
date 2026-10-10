// Licence: GPL-3.0-or-later (donor, EQEmu). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type ObjState = "hidden" | "active" | "completed";

interface Objective {
  step: number;          // 0 on every objective = sequence mode (one at a time)
  optional: boolean;
  reqId: number | null;  // index of the objective that must be completed first
  goal: number;          // count needed to complete
}

interface Progress {
  state: ObjState;
  done: number;
}

interface TaskRun {
  objectives: Objective[];
  progress: Progress[];
  rewarded: boolean;
}

interface Open {
  taskComplete: boolean;
  active: number[];
}

// Which objectives are open now. Step scan first, then the open scan.
function openObjectives(objectives: Objective[], progress: Progress[]): Open {
  const n = objectives.length;
  const done = progress.map((p) => p.state === "completed");
  let sequence = true;
  let currentStep = Number.POSITIVE_INFINITY;
  let taskComplete = true;

  for (let i = 0; i < n; i++) {
    const o = objectives[i];
    if (!done[i] && !o.optional) {
      currentStep = Math.min(currentStep, o.step);
      taskComplete = false;
    }
    if (o.step !== 0) sequence = false;
  }

  const active: number[] = [];
  let addedSequence = false;
  for (let i = 0; i < n; i++) {
    if (done[i]) continue;
    const o = objectives[i];
    const hasReq = o.reqId !== null && o.reqId >= 0 && o.reqId < n;
    const reqDone = hasReq && done[o.reqId as number];
    const stepOpen = !hasReq && !sequence && o.step <= currentStep;
    const seqOpen = !hasReq && sequence && !addedSequence;
    if (reqDone || stepOpen || seqOpen) {
      active.push(i);
      if (seqOpen) addedSequence = !o.optional;
    }
  }
  return { taskComplete, active };
}

// Promote hidden objectives that the gate now opens; report whether the task is complete.
function refresh(run: TaskRun): boolean {
  const open = openObjectives(run.objectives, run.progress);
  for (const i of open.active) {
    if (run.progress[i].state === "hidden") run.progress[i].state = "active";
  }
  return open.taskComplete;
}

// Accepting a task: every objective starts hidden, then the gate opens the first ones.
function accept(objectives: Objective[]): TaskRun {
  const run: TaskRun = {
    objectives,
    progress: objectives.map((): Progress => ({ state: "hidden", done: 0 })),
    rewarded: false,
  };
  refresh(run);
  return run;
}

// One increment on one objective. Count is clamped to the remaining goal.
// Completion re-runs the gate; the reward is granted once per task instance.
function applyIncrement(run: TaskRun, idx: number, count: number, grant: () => void): number {
  const p = run.progress[idx];
  const goal = run.objectives[idx].goal;
  const applied = Math.min(count, goal - p.done);
  p.done += applied;
  if (p.done < goal) return applied;
  p.state = "completed";
  const taskComplete = refresh(run);
  if (taskComplete && !run.rewarded) {
    run.rewarded = true;
    grant();
  }
  return applied;
}

// A game event (kill, loot, talk, deliver...) credits only the first matching active objective.
function onEvent(run: TaskRun, matches: (o: Objective) => boolean, count: number, grant: () => void): number {
  for (let i = 0; i < run.objectives.length; i++) {
    if (run.progress[i].state !== "active") continue;
    if (!matches(run.objectives[i])) continue;
    return applyIncrement(run, i, count, grant);
  }
  return 0;
}
