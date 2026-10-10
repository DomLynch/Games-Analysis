# EQEmu (quests-dialogue, cell 1)

Donor: `/mnt/frankendom-donors/EQEmu/common/tasks.h` (gate function, 368-432) with `/mnt/frankendom-donors/EQEmu/zone/task_client_state.cpp` (progress, reward) | Licence: GPL-3.0 (LICENSE.md is GNU GPL v3; source headers read as "version 3 of the License, or (at your option) any later version") | C++ | symbol `GetActiveElements`

Checked: Read in full: `GetActiveElements` (common/tasks.h 368-432), `UnlockActivities` (task_client_state.cpp 371-425), `CanUpdate` (476-537), `UpdateTasks` (539-604), `IncrementDoneCount` (797-989), `DispatchEventTaskComplete` (991-1005), `RewardTask` (1007-1114), `UpdateTaskActivity` (1241-1315). Callers checked: `UnlockActivities` has five callers (task_client_state.cpp 902 and 2176 read; task_manager.cpp 1584, 1621, 1627 not read). `UpdateTasks` is reached from the six trigger functions (speak-with via `UpdateTasksByNPC` 653, loot 706-715, explore 718-727, deliver 743 and 763, touch 774-782, kill 785-794), all read. The explicit path `UpdateTaskActivity` is reached from `questmgr.cpp` 2920 (read); the `worldserver.cpp` calls and `gm_commands/task.cpp` 371 are not read. Confidence: high on the gate function and the reward-once guard; medium on the explicit-path re-completion point. All read, none run. Not read: `task_manager.cpp` caller bodies, the `world/` shared-task server, DB save and load, the Perl and Lua wrappers beyond the call sites. Quest scripts are Perl/Lua and were not studied beyond the dispatch order. Camera: not a camera cell. camera_scope: n/a.

## 1. Mechanism

- Each objective (activity) of a task holds a state: Hidden (0), Active (1) or Completed (2) (common/tasks.h 270-272). A task holds up to 20 activities (tasks.h 31).
- Accept: `AcceptNewTask` sets every activity to Hidden and then calls `UnlockActivities` (task_client_state.cpp 2170-2176).
- `UnlockActivities` calls `Tasks::GetActiveElements` (403). Every Hidden activity in the returned active list is promoted to Active (408-411). It returns `is_task_complete` and records the completed task if the rule is on (418).
- `GetActiveElements` works in two passes over the activity list (common/tasks.h 378-431):
  - Pass 1: for each activity that is not Completed, a required (non-optional) one sets `current_step` to the lowest step seen (393) and clears `is_task_complete` (394). Any activity with a non-zero step clears `sequence_mode` (401). Pass 1 does not look at `req_activity_id`.
  - Pass 2: an incomplete activity is open if (a) its valid `req_activity_id` is Completed (418), or (b) it has no valid req, sequence mode is off and `step <= current_step` (419), or (c) it has no valid req, sequence mode is on and no earlier activity has been opened in this pass. In case (c), opening a required activity stops further openings, and optionals before it stay open (425).
- Progress: `UpdateTasks` (539) walks each active task. For each activity it calls `CanUpdate` (476-537): the activity must be Active (485), the type must match, the DZ switch, zone, area (508 position check), item and NPC match lists must pass. Then the script hook `EVENT_TASK_BEFORE_UPDATE` can veto that activity (572, skipped with `continue`). Then `IncrementDoneCount` (592). With the rule `UpdateOneElementPerTask` on, the loop breaks after the first updated activity in that task (595-597).
- `IncrementDoneCount` (797): the count is clamped to `goal_count - done_count` (819-820). `done_count` is raised (861). A chat line is sent per increment, capped by `MaxUpdateMessages` (876-885). When `done_count >= goal_count` (892): the activity becomes Completed (900) and `UnlockActivities` runs again (902), which opens the next steps. If the task is now complete: a replay timer is added for non-shared tasks (930-931), `EVENT_TASK_COMPLETE` runs (934), and only if it returned 0 is `RewardTask` called (950-952). Non-shared tasks are then cancelled from the client slot (957-960). Shared tasks are not cancelled, and the code says so (956).
- `RewardTask` (1007): returns at once if there is no info or `was_rewarded` is already set (1009). It sets `was_rewarded` (1013). Item rewards run only when `reward_method` is not Quest (1022). Then faction, cash (CashReward, 1081), experience (`AddEXP(ExpSource::Task, ...)` at 1086, a positive value is flat XP; a negative value encodes a level-based percent), and alternate currencies.
- Triggers that call `UpdateTasks`: speak-with, loot, explore, deliver (coin and items, 743 and 763), touch, kill (794). Each builds a `TaskUpdateFilter` and calls `UpdateTasks` once.

## 2. Key functions

- `GetActiveElements`: `/mnt/frankendom-donors/EQEmu/common/tasks.h` 368-432. Pure function over the activity catalogue and the activity states. The core of this note.
- `UnlockActivities`: `/mnt/frankendom-donors/EQEmu/zone/task_client_state.cpp` 371-425. Calls the gate and promotes Hidden to Active (403-411).
- `UpdateTasks` and `CanUpdate`: `/mnt/frankendom-donors/EQEmu/zone/task_client_state.cpp` 476-604. Filter, veto, increment, one-element rule.
- `IncrementDoneCount`: `/mnt/frankendom-donors/EQEmu/zone/task_client_state.cpp` 797-989. Clamp, count, complete, unlock, complete event, reward.
- `RewardTask`: `/mnt/frankendom-donors/EQEmu/zone/task_client_state.cpp` 1007-1114. Once-only guard (1009, 1013); item, cash, XP and currency branches.
- `UpdateTaskActivity` (explicit path, used by scripts, GM and world): `/mnt/frankendom-donors/EQEmu/zone/task_client_state.cpp` 1241-1315. Refuses only Hidden (1303), then calls `IncrementDoneCount` (1314). It does not call `CanUpdate` and does not run the `EVENT_TASK_BEFORE_UPDATE` veto.
- Script hook order (related, read in part): `EventNPC` in `/mnt/frankendom-donors/EQEmu/zone/quest_parser_collection.cpp` 487-496 runs the local (per-NPC) script, the global script and the default dispatch, and returns the first non-zero result in that order. `DispatchEventNPC` itself was not read.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Step gate: required incomplete objectives set the lowest open step; optionals at or below it open too | none (the rule); `step` per objective is zone data (common/tasks.h 73) |
| Prerequisite override: a valid `req_activity_id` opens the objective when the prerequisite is Completed, whatever the step | none (the rule); the index is zone data (tasks.h 72) |
| Sequence mode: every step 0 means one objective at a time; optionals before a required one open with it | none (the rule) |
| Hidden to Active promotion on accept and on every completion | state values 0, 1, 2 (tasks.h 270-272) |
| Increment clamped to remaining goal, complete at goal | `goal_count` per objective, zone data (tasks.h 83) |
| One matching objective per event (live-like) | `UpdateOneElementPerTask` = true (common/ruletypes.h 749) |
| Reward paid once per task instance | `was_rewarded` flag (task_client_state.cpp 1013); no constant |
| Completion script can veto the reward | `EVENT_TASK_COMPLETE` return value non-zero (950) |
| Objectives per task | `MAXACTIVITIESPERTASK` = 20 (tasks.h 31); the comment ties it to a client limit |
| Chat lines per increment | `MaxUpdateMessages` = 50 (common/ruletypes.h 750) |
| Flat task XP | `experience_reward`, zone data (task_client_state.cpp 1086) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's gate order (step scan, then open scan with the sequence and prerequisite rules), the clamp to the remaining goal, the complete-then-re-gate-then-reward order and the once-only flag. It omits the 20-activity cap, the shared-task server round trip, the `EVENT_TASK_BEFORE_UPDATE` and `EVENT_TASK_COMPLETE` script vetoes (so the sketch has no way to block a reward), the zone, area, item, NPC and DZ-switch filters (`matches` stands in for them), the chat lines, replay timers, cancellation, and the reward branches (`grant` stands in for items, cash, XP and currency). The accept-time `UnlockActivities` call is folded into `accept`. Order is the donor's: the reward is granted after the gate re-runs, as in `IncrementDoneCount` (950-952).

```ts
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
```

Typecheck: `/private/tmp/p2/wave2-haiku/batch3/QD003/work/quest-objectives.ts` (block plus `export {};`) run on the VPS with `npx -p typescript tsc --noEmit --strict --target es2020` at /tmp/qd003-quest-objectives.ts: exit 0.

## 5. Lands in

- TARGET `origins/quests/objectives.ts` (new; proposed name, the Frankendom repo layout was not read in this pass). The gate is engine logic, so it belongs in the engine, with the catalogue as zone data.
- Parity-checklist row: 21 (catalogue fields). Row 21 is the closest fit: `step`, `optional`, the prerequisite index and `goal` are the catalogue fields. No row covers the objective gate itself, so none fits exactly; say so in review.
- The reward step (once per task, XP, currency) lands on row 18 (loot roll and XP award), sub-line: reward runs once, after the completion event.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 1 (one engine, zones supply data); rules 7-9 n/a

Best transferable idea: Gate each objective with a step number, an optional flag and an optional prerequisite index; recompute the open set on every completion, and pay the task reward exactly once per task instance.
Decision (proposed): adapt - take the gate function and the once-only reward flag as engine logic on server-side objectives; reject the 20-activity client cap and the per-increment chat lines, which are client-protocol details, and reject the donor's script-veto hooks as the first cut, because objectives live in the engine, not in quest scripts.
Acceptance: Server test on a 3-objective task (kill x3 at step 1 required; talk to Ann at step 1 optional; return to Ann at step 2 required): accept opens kill and talk only; the third kill opens return and leaves talk open; a fourth kill matches nothing; the reward is granted once even if the completion path runs twice.

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism; no donor lines are copied.
- Rewards are not one ledger in the donor. Each reward type is a direct call (`AddEXP`, `CashReward`, `SummonItem`, faction and currency calls, 1022-1114). The only once-guard is the `was_rewarded` flag on the task instance (1009, 1013). Frankendom must write reward entries to the one ledger keyed by character, task and instance, and make the once-guard the ledger key, not a flag.
- Server verification: the area and position filter reads `client->GetPosition()` (508). This note does not show whether the donor validates that position anywhere else (not read). Frankendom's server must check kill and position itself.
- Explicit path (read, not run): `UpdateTaskActivity` (1241-1315) skips `CanUpdate` and the BEFORE veto, and refuses only Hidden (1303). `IncrementDoneCount` has no check that the activity is still open, and its completion block (892-900) has no "already completed" check. Two things limit the risk as read: for a non-shared task the slot is cancelled at completion (957-960), so a repeat call finds no task; for a shared task the increment is sent to the world first and returns (the shim, before 861), so the repeat outcome depends on the world echo, which was not read. The reward is guarded in any case (1009). Frankendom should route every progress change through one function that checks the state first, and test the repeat.
- Step pinning (read, not run): pass 1 (386-395) counts every incomplete required objective toward the lowest step, including one whose prerequisite is not yet met. So a waiting prerequisite-gated objective can hold later steps closed. Frankendom must decide whether a prerequisite-gated objective may hold the step gate, and test the answer.
- The negative `experience_reward` encoding (a level-based percent in the same integer) is a packing trick; Frankendom should use explicit fields.
- The 20-activity cap (tasks.h 31) and the per-increment chat lines (MaxUpdateMessages, ruletypes.h 750) are client-protocol details. Do not port them.
- Not read: `task_manager.cpp` caller bodies (1584, 1621, 1627), the `world/` shared-task server, DB persistence, Perl and Lua wrappers beyond the call sites.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: 1 (one engine, zones supply data); rules 7-9 n/a
