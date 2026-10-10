# crashkonijn-GOAP (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/crashkonijn-GOAP/Package/Runtime/CrashKonijn.Goap.Resolver/GraphResolverJob.cs` | Licence: Apache-2.0 (LICENSE, "Apache License Version 2.0, January 2004"; permissive, code may be adapted with attribution) | C# (Unity, Burst job) | symbol `GraphResolverJob.Execute`

Checked: Read in full the search (`GraphResolverJob.cs`, lines 1-302: `Execute` 88-145, `AddConnections` 147-208, cost and heuristic 210-233 and 276-297, `RetracePath` 246-256) and the sensor timer and base classes (`SensorTimer.cs` 1-52, `LocalTargetSensorBase.cs` 1-55). Read the demo target sensors and claim logic (`Complex/Sensors/Target/ClosestObjectSensor.cs`, `Complex/Behaviours/ItemBase.cs`, `Complex/Behaviours/ItemCollection.cs`, `Complex/Actions/PickupItemAction.cs` 25-60, `Complex/Actions/HaulItemAction.cs` 20-60). NOT read: how `ConditionConnections` and `NodeConditions` are built (`GraphBuilder`), where the per-goal and per-action `Costs` come from (`AgentTypeJobRunner`), the goal-request path past `SensorRunner.cs` 140, `ITimer` (so the unit of the sensor interval is unknown), the generic `T[]` `Closest` extension used by `ClosestObjectSensor`, and the action `Perform` bodies. Confidence: high on the search order and the cost formulas (read end to end); medium on how the goal costs are fed in. No aggro table, threat value or flee exists in this donor (grep -rniE for aggro|threat|hate|flee|chase over all .cs files: 0 matches). Not a camera cell.

## 1. Mechanism

- This is a backward best-first search over a graph of actions and goals (a GOAP planner). The inputs are per-agent run data: the start indices (the goals), `IsEnabled`, `IsExecutable` (an action the agent can run now), `ConditionsMet`, `Positions`, `Costs`, the agent position and `DistanceMultiplier` (`RunData` struct at `GraphResolverJob.cs` 29-45; the job struct and its fields at 57-84).
- Order of steps in `Execute`: (a) every start node (goal) is put in the closed set with `G = P = Costs[i]` (98-105) and its neighbours are expanded (113). (b) Loop while the open set is not empty (116): sort the open set by `F = G + H` (119, 52, 25) and take index 0 (121). (c) If that node is executable, retrace its parent chain to the goal and stop (123-127, 255). (d) Otherwise close it (129-130). If one of its unmet conditions has no producer, skip it (133-136). Otherwise expand it (138).
- Expansion (`AddConnections`, 147-208): for each condition of the node that is not yet met (152-157), for each neighbour listed under that condition (159), skip it if closed or disabled (161-169). Its path cost is `P = parent.P + neighbour.Costs + distance(parent position, neighbour position) * DistanceMultiplier` (174, 212-214, 233). Its total is `G = P + distance(agent, neighbour) * DistanceMultiplier` (176). A node not yet open gets `H` (187) and is added (182-191). An open node is updated only when the new `G` is lower (196-204).
- `H` (216-218) is the sum, over the node's unmet conditions, of the cheapest producer cost for each condition (276-288, 290-297). The position rule: a node with no position of its own inherits its parent's (236-244); a missing position adds zero distance (226-231).
- Goals compete inside one open set: all start nodes are closed and expanded before the loop (98-114), so the first executable node popped by lowest `F` across all goals wins. A goal's own cost is its starting `G`, so a costlier goal needs a cheaper plan to win.
- Sensing side: a local target sensor is gated by its timer (`LocalTargetSensorBase.cs` 28), then its subclass `Sense` is called with the existing target (31). The demo nearest-object sensor re-uses the target object when it exists (`ClosestObjectSensor.cs` 29-32). `SensorTimer` offers `Always`, `Once` (senses only when there is no state yet, `SensorTimer.cs` 25-28) and `Interval(float)` (re-sense when elapsed >= interval, 46).
- Claims (demo, not the planner): an item has one owner field, `IsClaimedBy` (`ItemBase.cs` 19). `Claim` sets it (38-41). `Pickup` sets it (47). `Drop` clears it (58-62). The filter keeps an item when it is unclaimed or claimed by the asking agent (`ItemCollection.cs` 43-44). A pickup that finds its target claimed by another agent picks the nearest free one (`PickupItemAction.cs` 37-43).
- Tick: the search is one Burst `IJob` over one `RunData` (57-84). How often it is scheduled is not read (`AgentTypeJobRunner`, not read). The donor has no fixed step for it.

## 2. Key functions

- `GraphResolverJob.Execute`: `/mnt/frankendom-donors/crashkonijn-GOAP/Package/Runtime/CrashKonijn.Goap.Resolver/GraphResolverJob.cs` 88-145. The search: start from goals, pop lowest F, stop at the first executable node.
- `GraphResolverJob.AddConnections`: same file, 147-208. Unmet conditions, neighbour filter, cost P and G, update only when cheaper.
- `GraphResolverJob.GetNewCost` and `GetDistanceCost`: same file, 210-214 and 221-234. Action cost plus distance, scaled by the multiplier.
- `GraphResolverJob.UnmetConditionCost`: same file, 276-288. Heuristic H.
- `SensorTimer`: `/mnt/frankendom-donors/crashkonijn-GOAP/Package/Runtime/CrashKonijn.Goap.Runtime/SensorTimer.cs` 6-51. Always, Once, Interval.
- `LocalTargetSensorBase.Sense`: `/mnt/frankendom-donors/crashkonijn-GOAP/Package/Runtime/CrashKonijn.Goap.Runtime/Sensors/LocalTargetSensorBase.cs` 24-32. Timer gate, then the subclass Sense with the existing target.
- `ClosestObjectSensor.Sense`: `/mnt/frankendom-donors/crashkonijn-GOAP/Demo/Assets/CrashKonijn/GOAP/Demos/Complex/Sensors/Target/ClosestObjectSensor.cs` 21-33. Nearest object, re-use of the target object.
- `ItemBase.Claim` and `Drop`: `/mnt/frankendom-donors/crashkonijn-GOAP/Demo/Assets/CrashKonijn/GOAP/Demos/Complex/Behaviours/ItemBase.cs` 38-41 and 58-62.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant |
|---|---|
| Plan cost = action cost + travel between nodes, scaled to time | Distance multiplier `1f / speed` (`GoapActionProvider.cs` 380); default `1f` (line 19). With no speed set, distance costs its raw length. |
| Goal priority = its starting cost in the search | Per-goal `Costs[i]` (`GraphResolverJob.cs` 103). Values not read. |
| Heuristic = sum of the cheapest producer per unmet condition | No constant (`GraphResolverJob.cs` 283, 295). Note: it sums per condition, so one action that satisfies two conditions is counted twice. |
| First executable popped wins | No threshold (`GraphResolverJob.cs` 123). |
| Sensor re-check interval | Caller-supplied float, no default in the donor (`SensorTimer.cs` 10, 46). Unit not read. |
| Single owner per item | Owner count 1 (`ItemBase.cs` 40). |
| Nearest target, ties keep the first | Strict less-than (`ItemCollection.cs` 82). |

## 4. TypeScript sketch

simplified: keeps the donor order (goals start with their cost, neighbours priced as action cost + travel, open set sorted by F = G + H, first executable popped wins, path retraced). It omits the Burst job, the NativeHeap storage, the `EnabledBuilder`/`ExecutableBuilder` inputs (taken here as the `executable` flag), the `closedSet` exactly as the donor (it is a Map here), the ConditionConnections map (built from `eff` here) and the sensors. The claim helper is a demo pattern (single owner), not a planner step. The sketch is typechecked (`strict`, `es2020`), not run.

```ts
// Licence: Apache-2.0 (donor, LICENSE). Clean-room sketch of the described search, not a translation of the donor.
export type Cond = string;
export interface Vec2 { x: number; y: number }

export interface Node {
  id: string;
  cost: number;           // action cost, or the priority cost of a goal start
  pre: Cond[];            // conditions that must hold before this node
  eff: Cond[];            // conditions this node makes true
  pos?: Vec2;             // where the node happens, if it has a position
  executable?: boolean;   // true when the agent can run this action now
}

interface Entry { id: string; P: number; G: number; H: number; parent: string | null; pos: Vec2 | undefined }

const dist = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);

// Backward search from the goals. A goal starts with G = its own cost.
// Each step: P = parent P + action cost + distance(parent, node) * distMul; G = P + distance(agent, node) * distMul.
// H = sum of the cheapest producer cost of each unmet condition. The first executable node popped by F = G + H wins.
export function planCheapest(
  goals: Node[],
  actions: Node[],
  met: ReadonlySet<Cond>,
  agent: Vec2,
  distMul: number,
): { goal: string; steps: string[] } | null {
  const byId = new Map<string, Node>();
  for (const n of [...goals, ...actions]) byId.set(n.id, n);

  const producers = new Map<Cond, Node[]>();
  for (const a of actions) {
    for (const c of a.eff) {
      const list = producers.get(c);
      if (list) list.push(a);
      else producers.set(c, [a]);
    }
  }

  const unmet = (n: Node): Cond[] => n.pre.filter((c) => !met.has(c));
  const cheapest = (c: Cond): number => Math.min(...(producers.get(c) ?? []).map((p) => p.cost));
  const unmetCost = (n: Node): number => unmet(n).reduce((s, c) => s + cheapest(c), 0);
  const unresolvable = (n: Node): boolean => unmet(n).some((c) => (producers.get(c) ?? []).length === 0);

  const open = new Map<string, Entry>();
  const closed = new Map<string, Entry>();

  const expand = (cur: Entry): void => {
    const node = byId.get(cur.id);
    if (!node) return;
    for (const c of unmet(node)) {
      for (const nb of producers.get(c) ?? []) {
        if (closed.has(nb.id)) continue;
        const pos = nb.pos ?? cur.pos;                       // no own position: inherit the parent's
        const P = cur.P + nb.cost + (cur.pos && pos ? dist(cur.pos, pos) * distMul : 0);
        const G = P + (pos ? dist(agent, pos) * distMul : 0);
        const seen = open.get(nb.id);
        if (!seen) {
          open.set(nb.id, { id: nb.id, P, G, H: unmetCost(nb), parent: cur.id, pos });
        } else if (G < seen.G) {
          seen.P = P; seen.G = G; seen.parent = cur.id; seen.pos = pos;
        }
      }
    }
  };

  for (const g of goals) {
    const start: Entry = { id: g.id, P: g.cost, G: g.cost, H: 0, parent: null, pos: undefined };
    closed.set(g.id, start);
    expand(start);
  }

  while (open.size > 0) {
    let best: Entry | undefined;
    for (const e of open.values()) {
      if (best === undefined || e.G + e.H < best.G + best.H) best = e;
    }
    if (best === undefined) break;
    const node = byId.get(best.id);
    if (!node) break;
    if (node.executable) {
      const back: string[] = [];
      let cur: Entry = best;
      while (cur.parent !== null) {
        back.push(cur.id);
        const next = closed.get(cur.parent);
        if (!next) return null;
        cur = next;
      }
      return { goal: cur.id, steps: back.reverse() };
    }
    open.delete(best.id);
    closed.set(best.id, best);
    if (unresolvable(node)) continue;
    expand(best);
  }
  return null;
}

// Exclusive claim of a target: skip items claimed by another agent, take the nearest free one.
export interface Claimable { id: string; claimedBy: string | null; pos: Vec2 }

export function claimNearest(items: Claimable[], agentId: string, agent: Vec2): Claimable | null {
  let best: Claimable | null = null;
  let bestD = Number.MAX_VALUE;
  for (const it of items) {
    if (it.claimedBy !== null && it.claimedBy !== agentId) continue;
    const d = dist(agent, it.pos);
    if (d < bestD) { best = it; bestD = d; }
  }
  if (best !== null) best.claimedBy = agentId;
  return best;
}
```

## 5. Lands in

- TARGET `src/fight/ai.ts` (new enemy brain, engine side): pick attack, approach or hold by the cheapest executable plan, and take a free attack slot before attacking. Parity-checklist row 2 (AI brain).
- Repo state of `src/fight/` not read; this is the planned home.

## 6. Gaps and risks

- One engine: the search and the claims must run inside `src/fight`. The Unity Burst job and the ScriptableObject config do not move. The sketch is a plain function over plain data.
- Zones as data: the per-action costs, per-goal costs and sensor intervals are donor config values from Unity assets. In Frankendom they become creature or zone data fields (see the JSON `data_fields`). The donor does not say which of them differ per zone.
- Server-verified kills: the planner only chooses an action. The donor's action `Perform` bodies (not read) do the effects. Frankendom's server must still verify every hit. Nothing in the files read is server-side.
- One ledger and MAX_ATTACKERS = 3: the donor claim is one owner field per item (`ItemBase.cs` 40). Frankendom needs a counted claim of up to 3 holders, not an owner. Also, by grep the only place the claim is cleared is `Drop` (`ItemBase.cs` 62). A plan abandoned before pickup keeps its claim in the donor (I did not read the cancel path). Frankendom must release a slot on every cancel, or the slot leaks.
- The heuristic is not admissible: `H` sums the cheapest producer per unmet condition (`GraphResolverJob.cs` 283), so one action that satisfies two conditions is counted twice. The first executable node popped is therefore not guaranteed to be the cheapest plan. The sketch keeps the donor's behaviour and says so.
- Ties: the sort compares `F` only (`GraphResolverJob.cs` 52). Tie order is whatever the sort returns. For replay (checklist row 19) Frankendom must break ties by a stable key such as the enemy id.
- Compute: one search per agent per decision. The server tick needs the per-tick NPC budget (post-K item 3 sub-line "server tick: fixed step, input intake, per-tick NPC budget"). The donor has no budget (not read).
- Camera: not a camera cell; no camera values.

Best transferable idea: Choose an enemy action as a cost race (action cost plus travel time to the target, with the goal's priority as the starting cost), and take the first executable plan popped, instead of a fixed if-chain.

Decision (proposed): adapt — Frankendom's AI brain (row 2) needs a cost-ranked choice between attack, approach and hold, plus a slot claim, but a general graph planner per enemy per tick is too heavy for MAX_ATTACKERS = 3. Keep the cost race and the travel-time distance term; drop the Burst graph, the open action set and the non-admissible sum.
Acceptance: In a 1-vs-3 fight the three attackers each hold a distinct attack slot (a server test asserts no slot is held twice and a slot is released on cancel); a fourth enemy in the zone chooses hold until a slot frees, and the player sees three attackers engage while the rest circle at range.

Reuse tag: adapt-allowed (Apache-2.0: code may be adapted with attribution; this sketch is written from the mechanism, not translated)
Brief rule served: 1 (one engine: enemy choice lives in src/fight, not in a client); MAX_ATTACKERS = 3 via the slot claim; rules 7-9 n/a
