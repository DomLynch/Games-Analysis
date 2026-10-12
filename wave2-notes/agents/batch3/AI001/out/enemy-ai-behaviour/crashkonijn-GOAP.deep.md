# crashkonijn-GOAP (enemy-ai-behaviour, cell 2)

Donor: `/mnt/frankendom-donors/crashkonijn-GOAP/Package/Runtime/CrashKonijn.Goap.Resolver/GraphResolverJob.cs` (plus `GraphResolver.cs`, `ResolveHandle.cs`, `Runtime/CrashKonijn.Goap.Runtime/Classes/Runners/AgentTypeJobRunner.cs`, `Classes/Controllers/ProactiveController.cs`, `Runtime/CrashKonijn.Agent.Runtime/Timer.cs`, `ActionRunner.cs`, `Classes/RunStates/*`) | Licence: Apache License 2.0 (`LICENSE` line 2: "Version 2.0, January 2004"; package.json version 3.1.2) | C# (Unity, Burst job) | symbol `GraphResolverJob.Execute`

Checked: Read in full: `GraphResolverJob.cs` (1-302), `ResolveHandle.cs` (1-95), `GraphResolver.cs` (1-146), `AgentTypeJobRunner.cs` (1-287), `ProactiveController.cs` (1-94), `Timer.cs`, `SensorTimer.cs`, `ActionRunner.cs` (1-160), the eight `RunStates/*` files (method bodies), `GoalBase.cs`, `GoapActionBase.cs` (20-110, partly). Grepped only: `NativeHeap.cs` (header and use), the upgrade guides (`core-concepts.md`), the whole Package for TODO/FIXME/timeout/stuck words. Candidate files opened: 12. Not read: `GraphBuilder.cs`, the bodies of `CostBuilder`, `ConditionBuilder`, `ExecutableBuilder`, `SensorRunner.cs`, `GoapActionProvider.cs` outside 300-366, the `Demo/` folder and the tests. Confidence: high on the search order, the job flow and the run-state policy (read end to end). High on the defects listed in section 6 (read from code, not run: no benchmark, no leak test). Medium on the per-agent cost reading (from code, not measured). camera_scope: not applicable.

Best transferable idea: pick the next ability by a backward cost search from the goal's unmet conditions to the cheapest action that can run now, re-plan on a timer, and let each action's run state say whether a re-plan may interrupt it.
Decision (proposed): adapt - take the backward search and the commitment policy (run states); drop the per-agent full rebuild, the wall-clock timers and the unbounded search, and add a per-tick expansion budget.
Acceptance: a creature with goal "stop threat" (its cost rises as its hp falls) and actions "attack" (in range) and "dash to cover" switches from attack to dash on the server tick its hp falls below the threshold; a server test asserts that an unsolvable goal returns "no plan" within the expansion cap (capped = true) and that all AI timers count server ticks, not wall-clock seconds.

## 1. Mechanism

- Driver. `ProactiveController.OnUpdate` (ProactiveController.cs 30-51): for each agent not paused (37-38), if its resolve timer has run for `ResolveTime` (default 1 s, line 9; line 40), it calls `ResolveAction`, which enqueues the agent (GoapActionProvider.cs 340-346). Then for each agent type it calls `runner.Run(queue)` (50). `OnLateUpdate` calls `runner.Complete()` (75). So planning is one job per queued agent per resolve, started in Update and read back in LateUpdate.
- Per agent, `AgentTypeJobRunner.Run(agent)` (108-161): skip if the goal is completed (116-121); skip if `MayResolve` is false (123; `MayResolve` returns false while paused, 241-242, and otherwise asks the current run state, 244-250); sense the local goal (131); `FillBuilders` (133, 163-210) walks every goal of the agent type (173-181) and every action (183-209), sets goal costs (175), sets each action's executable flag, enabled flag (202-205), cost (203; a disabled action gets cost 0), and target position (208); then the job starts with six TempJob arrays built from those builders (149-159): start indexes, agent position, enabled, executable, positions, costs, conditions met, and the distance multiplier (158).
- The search, `GraphResolverJob.Execute` (89-145). Backward A*. Start nodes are the requested goals (not already met); they are closed with `G = P = Costs[goal]` (98-114). Expanding a node (`AddConnections`, 147-208): for each condition of the node that is not met (152-157), every enabled, not-closed producer of that condition (159-169) becomes a neighbour. Neighbour cost: `P = parent.P + Costs[neighbour] + distance(parent.position, neighbour.position) * multiplier` (174, 210-214); `G = P + distance(agent, neighbour) * multiplier` (176); `H = sum over unmet conditions of the cheapest producer cost` (216-218, 276-288, 290-300). Open list: pop the lowest F = G + H (119-121). If the popped node is executable (123) the path is retraced back to the goal (125, 246-256) and the search stops. Otherwise it is closed (129-130); a node with an unmet condition that has no producer at all is dropped (133-136); else it is expanded (138).
- Which goal wins: all requested goals are seeded at once, so the first executable node popped is the cheapest total path over all goals. Goal priority is therefore goal cost (GoalBase.cs 23-26), not a rank.
- Commitment. The action runner (`ActionRunner.Run`, ActionRunner.cs 19-33) first moves or performs depending on the action's move mode (24-32). While performing, it calls the run state's `Update` with frame delta time (127), checks `IsCompleted` and `ShouldStop` (129-139), and performs only if `ShouldPerform` is true (141). Before either, every `Run` calls `RunIsValid` (ActionRunner.cs 35-53): it re-checks `action.IsValid(agent, data)` each tick and, when false, logs a warning and calls `agent.StopAction()`. This is the donor's per-tick abort rule (the action decides it is no longer valid, for example its target died), independent of the planner. The run state's `MayResolve` (RunStates) is the only thing that lets the planner re-plan an in-progress action. `ContinueOrResolve` allows it (ContinueOrResolveActionRunState.cs 24-26). `Continue` forbids it (ContinueActionRunState.cs 26-28). `Wait(time, mayResolve)` counts down by frame delta time (WaitActionRunState.cs 18), performs when time is up (28), and allows re-plan only if its flag is set (38). `WaitThenStop` and `WaitThenComplete` do the same for stop and complete (WaitThenStopActionRunState.cs 23; WaitThenCompleteActionRunState.cs 33).
- Complete (AgentTypeJobRunner.cs 54-91): each handle is completed first (58) so its buffers are freed, then the result is dropped if the agent's goal request changed while the job ran (60-61). A goal with no action fires `NoActionFound` (66-71). A new first action replaces the current one (81-87); the same action is left running.
- Timers. The resolve timer and the sensor interval timers read `Time.realtimeSinceStartup` (Timer.cs 12, 17, 22; SensorTimer.cs 46), not the simulation tick.

## 2. Key functions

- `GraphResolverJob.Execute` (search): `/mnt/frankendom-donors/crashkonijn-GOAP/Package/Runtime/CrashKonijn.Goap.Resolver/GraphResolverJob.cs` 89-145.
- `GraphResolverJob.AddConnections` (expand and relax): same file, 147-208.
- `GraphResolverJob.HasUnresolvableCondition`, `UnmetConditionCost`, `GetCheapestCostForCondition` (heuristic): same file, 258-300.
- `RetracePath` (plan extraction): same file, 246-256.
- `ResolveHandle.Start` / `Complete` (job lifetime): `/mnt/frankendom-donors/crashkonijn-GOAP/Package/Runtime/CrashKonijn.Goap.Resolver/ResolveHandle.cs` 20-87.
- `AgentTypeJobRunner.Run(agent)`, `FillBuilders`, `Complete`, `MayResolve`: `/mnt/frankendom-donors/crashkonijn-GOAP/Package/Runtime/CrashKonijn.Goap.Runtime/Classes/Runners/AgentTypeJobRunner.cs` 41-161, 163-210, 54-91, 239-251.
- `ProactiveController.OnUpdate`: `/mnt/frankendom-donors/crashkonijn-GOAP/Package/Runtime/CrashKonijn.Goap.Runtime/Classes/Controllers/ProactiveController.cs` 30-77.
- `ActionRunner.Run`, `PerformAction`, `ShouldContinue`: `/mnt/frankendom-donors/crashkonijn-GOAP/Package/Runtime/CrashKonijn.Agent.Runtime/ActionRunner.cs` 19-142.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants and rules |
|---|---|
| Backward A* over conditions: F = G + H, first executable node wins | No constant. The search runs until it finds an executable node or the open list is empty (116). No expansion cap. |
| Heuristic = sum of cheapest producer per unmet condition | Sum (283); a condition with no producer costs float.MaxValue (292). |
| Start node H | int.MaxValue (105): unused for ordering because start nodes are closed. |
| Distance term | Metric distance times a per-agent multiplier (233); multiplier default 1 (GoapActionProvider.cs 19). |
| Re-plan interval | 1 s default for each agent (ProactiveController.cs 9, 40). Wall-clock (Timer.cs 17). |
| Commitment | Run-state flags only: Continue false (26), ContinueOrResolve true (24-26), Wait true or false by constructor (38). |
| Action and goal costs | Config values (`BaseCost`) per asset (GoalBase.cs 25; GoapActionBase.cs 49). Values not read. |
| Sensor interval | Caller-supplied seconds (SensorTimer.cs 10, 46). |

## 4. TypeScript sketch

simplified: The sketch runs the donor's search synchronously: no Burst job, no native containers, no Dispose paths, no sensor layer or condition observers, no run states, no stale-result guard in Complete, no realtime timer, no move modes. Costs and the goal list come in as plain numbers. It reorders two things on purpose: it uses a binary heap with lazy deletion where the donor sorts the whole open list on every pop (line 119), and it adds the expansion budget that the donor lacks (line 116). Its heuristic is the donor's sum (line 283), which is not admissible when one producer serves two unmet conditions (section 6, defect 4); a comment marks where to change it. The example is checked on the VPS: it returns goal 1 with actions [3, 2] after one expansion.

```ts
// Licence: Apache-2.0 (donor crashkonijn-GOAP). Clean-room sketch from the described mechanism, not a translation of the C# job.
export type Vec3 = { x: number; y: number; z: number };

export interface PlanNode {
  id: number;
  requires: number[]; // condition ids that must hold (action preconditions, or goal conditions)
  provides: number[]; // condition ids this action makes true (empty for goals)
  cost: number; // base cost (action BaseCost, or goal cost)
  enabled: boolean;
  executable: boolean; // action may run right now (all preconditions met and the action agrees)
  pos?: Vec3; // target position; undefined means "same as the node we came from"
}

export interface PlanInput {
  nodes: PlanNode[];
  goalIds: number[];
  met: ReadonlySet<number>; // condition ids that are true right now
  agentPos: Vec3;
  distanceMultiplier: number;
  maxExpansions: number; // FIX: the donor has no expansion cap
}

export interface PlanOut {
  goalId: number | null;
  actionIds: number[]; // first element is the action to run now
  expansions: number;
  capped: boolean;
}

function distance(a: Vec3 | undefined, b: Vec3 | undefined): number {
  if (a === undefined || b === undefined) return 0; // donor: an invalid position costs no distance
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

// Binary min-heap with lazy deletion. FIX: the donor sorts the whole open list on every pop; its own NativeHeap.cs (not used by the planner) is the same idea.
class MinHeap {
  private a: { key: number; v: number }[] = [];
  get size(): number {
    return this.a.length;
  }
  push(key: number, v: number): void {
    this.a.push({ key, v });
    let i = this.a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.a[p].key <= this.a[i].key) break;
      [this.a[p], this.a[i]] = [this.a[i], this.a[p]];
      i = p;
    }
  }
  pop(): { key: number; v: number } | undefined {
    if (this.a.length === 0) return undefined;
    const top = this.a[0];
    const last = this.a.pop();
    if (last !== undefined && this.a.length > 0) {
      this.a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < this.a.length && this.a[l].key < this.a[m].key) m = l;
        if (r < this.a.length && this.a[r].key < this.a[m].key) m = r;
        if (m === i) break;
        [this.a[m], this.a[i]] = [this.a[i], this.a[m]];
        i = m;
      }
    }
    return top;
  }
}

interface Entry {
  id: number;
  P: number; // cost up to and including this node, as a parent
  G: number; // P plus the distance from the agent
  H: number; // sum of the cheapest producer cost for each unmet condition
  parent: number; // -1 for a goal
  pos: Vec3 | undefined;
}

// Backward A*: start at the goals, walk to producers of unmet conditions, stop at the first executable node.
export function plan(input: PlanInput): PlanOut {
  const byId = new Map<number, PlanNode>();
  for (const n of input.nodes) byId.set(n.id, n);

  const producers = new Map<number, number[]>();
  for (const n of input.nodes) {
    for (const c of n.provides) {
      const list = producers.get(c) ?? [];
      list.push(n.id);
      producers.set(c, list);
    }
  }

  const unmet = (n: PlanNode): number[] => n.requires.filter((c) => !input.met.has(c));
  const cheapest = (c: number): number =>
    Math.min(...(producers.get(c) ?? []).map((id) => byId.get(id)?.cost ?? Infinity));
  const heuristic = (n: PlanNode): number => unmet(n).reduce((sum, c) => sum + cheapest(c), 0);

  const closed = new Map<number, Entry>();
  const open = new Map<number, Entry>();
  const heap = new MinHeap();
  const m = input.distanceMultiplier;

  const expand = (cur: Entry, node: PlanNode): void => {
    for (const c of unmet(node)) {
      for (const pid of producers.get(c) ?? []) {
        if (closed.has(pid)) continue;
        const p = byId.get(pid);
        if (p === undefined || !p.enabled) continue;
        const pos = p.pos ?? cur.pos;
        const newP = cur.P + p.cost + distance(cur.pos, pos) * m;
        const newG = newP + distance(input.agentPos, pos) * m;
        const existing = open.get(pid);
        if (existing === undefined) {
          const e: Entry = { id: pid, P: newP, G: newG, H: heuristic(p), parent: cur.id, pos };
          open.set(pid, e);
          heap.push(e.G + e.H, pid);
        } else if (newG < existing.G) {
          existing.G = newG;
          existing.P = newP;
          existing.parent = cur.id;
          existing.pos = pos;
          heap.push(existing.G + existing.H, pid); // the older heap entry is now stale
        }
      }
    }
  };

  for (const gid of input.goalIds) {
    const g = byId.get(gid);
    if (g === undefined) continue;
    closed.set(gid, { id: gid, P: g.cost, G: g.cost, H: 0, parent: -1, pos: undefined });
  }
  for (const gid of input.goalIds) {
    const e = closed.get(gid);
    const g = byId.get(gid);
    if (e !== undefined && g !== undefined) expand(e, g);
  }

  let expansions = 0;
  while (heap.size > 0) {
    const top = heap.pop();
    if (top === undefined) break;
    const e = open.get(top.v);
    if (e === undefined || e.G + e.H !== top.key) continue; // stale entry
    open.delete(top.v);
    const node = byId.get(top.v);
    if (node === undefined) continue;

    if (node.executable) {
      const actions: number[] = [];
      let cur = e;
      while (cur.parent !== -1) {
        actions.push(cur.id);
        const next = closed.get(cur.parent);
        if (next === undefined) break;
        cur = next;
      }
      return { goalId: cur.id, actionIds: actions, expansions, capped: false };
    }

    if (expansions >= input.maxExpansions) {
      return { goalId: null, actionIds: [], expansions, capped: true };
    }
    expansions += 1;
    closed.set(e.id, e);

    // a condition nobody can produce makes this branch unresolvable (donor: no connections at all)
    if (unmet(node).some((c) => (producers.get(c) ?? []).length === 0)) continue;
    expand(e, node);
  }

  return { goalId: null, actionIds: [], expansions, capped: false };
}

// Example: goal needs condition 10; node 2 makes 10 true and needs 11; node 3 makes 11 true and can run now.
export function example(): PlanOut {
  const nodes: PlanNode[] = [
    { id: 1, requires: [10], provides: [], cost: 1, enabled: true, executable: false }, // the goal
    { id: 2, requires: [11], provides: [10], cost: 2, enabled: true, executable: false, pos: { x: 5, y: 0, z: 0 } },
    { id: 3, requires: [], provides: [11], cost: 3, enabled: true, executable: true },
  ];
  return plan({
    nodes,
    goalIds: [1],
    met: new Set<number>(),
    agentPos: { x: 0, y: 0, z: 0 },
    distanceMultiplier: 0.1,
    maxExpansions: 200,
  });
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (TypeScript 7.0.2): exit 0. Run: the example, compiled to CommonJS and run with node on the VPS, prints `{"goalId":1,"actionIds":[3,2],"expansions":1,"capped":false}`. The local quality hook could not check it on the Mac (no tsc there).

## 5. Lands in

- TARGET `src/fight/planner.ts` (new module: the ability-choice search for one NPC; it returns an intent, the engine decides the hit and the kill).
- Parity-checklist row 2 (AI brain). The commitment policy (run states) also feeds row 4 (fight loop: chase and leash), but the mechanism is row 2.
- Reuse tag: adapt-permitted (Apache 2.0: code may be adapted with the licence notice kept); the sketch above is clean-room.
- Brief rule served: 2 (AI brain: one planner per NPC per server tick, expansion budget, server tick timers); the server tick sub-line "server tick: fixed step, input intake, per-tick NPC budget" applies to the caller.

## 6. Gaps and risks

- Defect 1, no expansion cap (GraphResolverJob.cs 116-141). The loop runs until an executable node is found or the open set is empty. A goal with no reachable executable path expands the whole reachable graph on every resolve. Fix: cap expansions per run and per server tick; on the cap return "no plan this tick" (the sketch returns `capped: true`) and retry on the next tick.
- Defect 2, Temp list not disposed on early exits (GraphResolverJob.cs 118, 125-127, 133-135, 140). `openList` is allocated with `Allocator.Temp` each pop. The `break` at 126 and the `continue` at 135 skip `openList.Dispose()` at 140. Effect: a native allocation per early exit, freed only by Unity at the end of the frame (not run; Unity's warning behaviour not checked). Fix: dispose before each exit, or hold one list and clear it.
- Defect 3, full sort per pop (GraphResolverJob.cs 119). Cost per expansion is O(k log k) for an open set of size k, plus a copy of the open set (118). The package already contains a min-heap (NativeHeap.cs 23-24) that the planner does not use. Fix: use the heap (the sketch does, with lazy deletion).
- Defect 4, heuristic not admissible (GraphResolverJob.cs 283). H sums the cheapest producer for each unmet condition, so one producer that makes two unmet conditions is counted twice. A* can then return a plan that is not the cheapest. Fix: use the maximum over unmet conditions (admissible, weaker), or keep the sum and state that plans are good, not optimal. Our recommendation: maximum, because a creature that picks a wrong cheapest plan looks like a bug to players.
- Defect 5, wall-clock timers (Timer.cs 12, 17; SensorTimer.cs 46; ProactiveController.cs 40). Resolve and sensor timers count real seconds, while the action run states count frame delta time (WaitActionRunState.cs 18). Pause is not in the timer: paused agents are skipped (ProactiveController.cs 37-38; AgentTypeJobRunner.cs 241-242), but their elapsed time keeps growing, so the first frame after a resume resolves at once. Fix: count server ticks everywhere; a pause stops the counter.
- Defect 6, full rebuild per agent per resolve (AgentTypeJobRunner.cs 149-159, 163-210). Six TempJob arrays the size of the whole agent-type graph are built for every queued agent on every resolve, after walking every goal and action. Cost grows with agents times (goals plus actions plus conditions) every resolve interval. Fix: build the graph once per agent type; per resolve update only the entries that changed (dirty flags from the sensors); cap the number of resolves per server tick.
- Per-tick abort exists: `ActionRunner.RunIsValid` (ActionRunner.cs 35-53) stops any action whose `IsValid` turns false (section 1, Commitment). Our rows should carry an `valid-while` condition checked every tick so a lost target aborts the swing the same tick. The gap below is only the missing time limit.
- Absence, stuck handling (timeouts only). In the donor, `MoveBeforePerforming` keeps raising `Events.Move` until in range (ActionRunner.cs 81-83), and no code sets a timeout for it. A grep of Package/Runtime for Timeout, Stuck, Abort, Interrupt and Cancel found only one interface file (IMonoBehaviour.cs, not read). Fix (ours): a movement action gets a WaitThenStop run state with a time limit as its default, so a stuck mover ends and the planner re-plans.
- Defect 7, null-order in Complete: `AgentTypeJobRunner.Complete` reads `resolveHandle.ActionProvider.GoalRequest` at line 60 before the `ActionProvider.IsNull()` check at 63, so a destroyed provider is dereferenced first. Fix: check null first (the idea, dropping stale results, stays).
- Absence, leash, aggro, threat tables, group tactics, morale. The donor has none of these. Targets come from user sensors. Flee is expressible as a goal whose cost falls as hp falls (`GoalBase.GetCost`, GoalBase.cs 23-26): a morale rule without a separate state. Creature-flee already ships as a row flag in Frankendom; this planner would be an alternative, not a second flee system.
- MAX_ATTACKERS = 3: the planner has no slot concept. An attack action must carry a precondition condition "attack slot free", granted by the engine, or the planner will pick attacks the engine then refuses.
- One ledger and server-verified kills: conditions are a per-agent set of booleans (ConditionsMet) and must not become a second world state. Effects only change planning state; hp and kills stay in the engine's single damage step (row 1).
- Zones as data: the donor's actions and goals are Unity assets with BaseCost and conditions (config classes). In Frankendom an action is one row: requires (condition ids), provides (condition ids), cost, enabled flag, move mode, stopping distance, commitment (run-state kind). Costs and commitment are the designer's numbers per creature type. Whether a row is zone data or engine constant: the costs are per creature type (zone data); the search itself is an engine constant.
- Pit as client: the planner is engine code and runs for the Pit too; the Pit only shows the chosen action.

## 7. As-data shape (PASS2 item 1)

- Donor data: Unity config assets (Scriptable configs; `Package/Runtime/CrashKonijn.Goap.Runtime/Scriptables/`, not read in full) and code configs (`Configs/ActionConfig.cs`, `Configs/GoalConfig.cs`, read by name only). The planner input is a table of nodes: row = node (action or goal) with fields: id (int), conditions (int[], unmet test), effects (int[], provides), base cost (float), enabled (bool), executable (bool, from the action's own IsExecutable), target position (vector, optional), and per-agent: distance multiplier (float, default 1) and the condition set (bool per condition).
- A new creature brain is one row set: yes, if its conditions already exist (why: the search does not need new code for new rows; conditions are ids). A new action type with custom IsExecutable or a new run state is code, not a row (no).

## 8. Provenance and history (PASS2 items 2 and 3)

- Provenance per claim: repo crashkonijn/GOAP (package version 3.1.2, `Package/package.json` line 3), Apache 2.0 (LICENSE line 2), files and lines as in the receipts. No `.git` in the box: no commit history.
- Patch history from the donor's own upgrade guide, `Package/Documentation/upgrade/core-concepts.md`: lines 13-17 list the v3 resolver changes: "The resolver has improved heuristics, making it easier to find the best action to perform." (13) and "The resolver now better calculates the distance cost between actions!" (17). Both are the planner's heuristic and distance terms, which are the parts flagged in defects 3 and 4. The same guide has a "Sensor Timer" section (core-concepts.md line 275, not read) and its timer examples (lines 180-214) use Wait run states. A grep of the three upgrade guides for "realtime" found nothing; no note says the timers are wall-clock. The package has no changelog file and no bug-fix history in the box.

## 9. Rulings for Dom (PASS2 item 4)

1. Should an NPC re-plan only on events (goal change, action finished, a sensed change) with a slow fallback re-plan (for example every 2-5 s), or every 1 s as the donor does? Recommendation: events plus a slow fallback, and at most N plans per server tick across all NPCs.
2. May a re-plan interrupt a wind-up or a committed swing? Recommendation: no for wind-ups (the run state is Continue), yes for idle and repositioning (ContinueOrResolve); the designer sets it per ability row.
3. Do all AI timers count server ticks, not wall-clock seconds? Recommendation: yes, always; the donor's realtime clock would break replays and the pause rule.

## Reuse tag

adapt-permitted (Apache 2.0). Clean-room sketch written from the mechanism; no lines copied.

## Brief rule served

2 (AI brain: one planner per NPC per server tick with an expansion budget; costs and commitment are row data; the engine owns the choice and the damage).

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
- Verdict: MINOR.
- Search, run-state, runner and license claims verified; only small cite errors, none needing change.
- Missed: ActionRunner.RunIsValid (ActionRunner.cs 35-53) re-checks action.IsValid every Run and calls StopAction when false: the donor's per-tick abort rule, which the "Absence, stuck handling" section implied did not exist.
- Missed: AgentTypeJobRunner.Complete 60 reads ActionProvider.GoalRequest before the IsNull check at 63.

Fixed 2026-10-12: Commitment bullet and gaps now name RunIsValid as the per-tick abort (stuck handling narrowed to missing timeouts); added defect 7 (null-order in Complete).
