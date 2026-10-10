# Blizzard-s2client-api (server-tick-netcode, cell 5)

Donor: `/mnt/frankendom-donors/Blizzard-s2client-api/src/sc2api/sc2_coordinator.cc` (with sc2_client.cc, sc2_proto_interface.cc, sc2_connection.cc) | Licence: MIT (LICENSE: "Copyright (c) 2017 Blizzard Entertainment", standard MIT permission text; code may be adapted) | C++ | symbol `CoordinatorImp::StepAgents`

Checked: `CoordinatorImp::StepAgents` is at sc2_coordinator.cc 285-330 (read in full); `Coordinator::Update` at 766-773 (read); `StepAgentsRealtime` at 332-376 (read in full); `CallOnStep` at 120-138 (read in full); `RunParallel` at 21-32 (read in full); `ControlImp::Step`/`WaitStep` at sc2_client.cc 1745-1766 (read); `ControlImp::IssueEvents` at sc2_client.cc 2142-2163 (read, but the diff bodies at 2147-2157 were read only as call names); `Connection::Receive` at sc2_connection.cc 161-190 (read in full); `ProtoInterface::WaitForResponseInternal` at sc2_proto_interface.cc 123-129 (read). Confidence: high for the client-side loop. The StarCraft II engine that actually advances the game is not in the donor (binary, not read), so nothing here describes the engine's internal tick. Not a camera cell.

## 1. Mechanism

- The donor is a client library that drives a running StarCraft II engine over a websocket. In step mode the engine advances only when the library asks for N game loops. So the loop is a lockstep barrier once per `Coordinator::Update()`.
- Order of one Update in step mode (`Coordinator::Update` 766-773 chooses this path when realtime is false):
  (a) `StepAgents` (285): each agent's lambda returns early if its app state is not normal, if a leave-game is pending, or if the game is finished (289-299). Otherwise it sends `Step(step_size)` (301) and blocks on `WaitStep()` (302).
  (b) Agents are stepped in parallel. With one agent the lambda runs inline (308-310). With more than one, `RunParallel` starts one thread per agent and joins them all (312; 21-32). So every agent has reached its new loop before the next stage.
  (c) If `multi_threaded` is true, `CallOnStep` runs inside each agent's thread right after its wait (303-305). If it is false, all agents are stepped first, then `CallOnStep` runs serially for each agent that is still in normal state and has no pending leave (315-328).
  (d) `CallOnStep` (120-138): if the agent is no longer in game it calls `OnGameEnd` and requests leave (122-126). Otherwise it calls `IssueEvents(action->Commands())` (129), then sends actions and feature-layer actions (130-137).
  (e) `ControlImp::IssueEvents` (sc2_client.cc 2142): returns false with no events if the game loop number did not change (2143-2145). Otherwise it emits unit-destroyed, unit-added, idle, building-completed, upgrade and alert events (2147-2157), and only then calls the user's `OnStep` (2160).
- Wait and timeout: `WaitStep` (sc2_client.cc 1759-1766) calls `WaitForResponse` (1760), which calls `ProtoInterface::WaitForResponseInternal` (sc2_proto_interface.cc 126), which calls `Connection::Receive` with `default_timeout_ms_`. `Receive` waits on a condition variable until a response is queued or the timeout expires (sc2_connection.cc 170-173). On expiry it sets the response to null, disconnects, clears the queue and calls the timeout callback (179-186), then returns false. `WaitStep` returns false when the response is null (1761-1762).
- The donor does not check the return value of `WaitStep()` in `StepAgents` (302). Whether `CallOnStep` still runs after a failed wait depends on `GetAppState()` after a disconnect, which was not read.
- Real-time mode (`StepAgentsRealtime`, 332-376) has no Step request and no barrier. Each Update calls `GetObservation`, `IssueEvents`, `SendActions` for each agent (357-359), in parallel only when multi_threaded (368-375). The engine's own clock runs and the library polls.
- Caller: the examples drive the loop with `while (coordinator.Update() && !do_break)` (examples/bot_mp.cc 53). I read this one caller only.
- Tick type: the step is a count of game loops requested by the client, not a wall-clock fixed step. The library never runs its own timer.

## 2. Key functions

- `CoordinatorImp::StepAgents`: `/mnt/frankendom-donors/Blizzard-s2client-api/src/sc2api/sc2_coordinator.cc` 285-330. The step barrier: parallel step, wait, then serial `OnStep` in single-thread mode.
- `Coordinator::Update`: `/mnt/frankendom-donors/Blizzard-s2client-api/src/sc2api/sc2_coordinator.cc` 766-773. Chooses step or realtime.
- `RunParallel`: `/mnt/frankendom-donors/Blizzard-s2client-api/src/sc2api/sc2_coordinator.cc` 21-32. One thread per agent, then join all.
- `CallOnStep`: `/mnt/frankendom-donors/Blizzard-s2client-api/src/sc2api/sc2_coordinator.cc` 120-138. Game-over check, events, then sends actions.
- `StepAgentsRealtime`: `/mnt/frankendom-donors/Blizzard-s2client-api/src/sc2api/sc2_coordinator.cc` 332-376. Polling path, no barrier.
- `ControlImp::Step` and `ControlImp::WaitStep`: `/mnt/frankendom-donors/Blizzard-s2client-api/src/sc2api/sc2_client.cc` 1745-1766. Sends `RequestStep` with a count, then waits.
- `ControlImp::IssueEvents`: `/mnt/frankendom-donors/Blizzard-s2client-api/src/sc2api/sc2_client.cc` 2142-2163. Gated on a changed game loop; events from the observation diff; then the user `OnStep`.
- `Connection::Receive`: `/mnt/frankendom-donors/Blizzard-s2client-api/src/sc2api/sc2_connection.cc` 161-190. Timed wait; disconnect and clear on timeout.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Lockstep barrier: every live agent advances by the same count, all are waited on, then they act | `step_size` default 1 game loop (sc2_coordinator.cc 195: `process_settings_(false, 1,` sets realtime false and step 1) |
| One timeout per response; expiry disconnects that connection | 120000 ms (`kDefaultProtoInterfaceTimeout`, include/sc2api/sc2_proto_interface.h 13). `SetTimeoutMS` writes it (sc2_coordinator.cc 886) |
| Events come from a diff, and only when the loop counter moved | Gate is `current_game_loop_ == previous_game_loop` (sc2_client.cc 2143). No numeric constant |
| Civetweb server options (request 5000 ms, websocket 1200000 ms, 4 threads) | sc2_connection.cc 19-22. These configure the civetweb context in `StartCivetweb` (17-45). I did not check whether they affect the client websocket path, so they are not used in the sketch |

## 4. TypeScript sketch

simplified: the sketch keeps the barrier (every live fight steps, then all act), one timeout per step, and events as a diff of consecutive snapshots that is skipped when the counter did not move. It uses Promise.all instead of threads. It aborts a fight whose step timed out, where the donor ignores the failed wait result. It omits the leave-game request, the feature-layer send, the idle, upgrade and alert event kinds, the realtime path, the multi-thread versus serial choice (all `onStep` calls run after the barrier here), and the connection disconnect on timeout (`Engine.step` is assumed to resolve null by itself). `onEnd` runs on every update in which the agent is out of fight; the donor reaches its `OnGameEnd` call only for agents it did not skip (sc2_coordinator.cc 297-299).

```ts
// Licence: MIT (donor, Copyright (c) 2017 Blizzard Entertainment). Clean-room shape: step all agents, wait per agent with a timeout, then act on the new snapshot.
type UnitId = number;
interface Snapshot { loop: number; units: Map<UnitId, string>; }
type FightEvent = { kind: "added" | "destroyed" | "changed"; unit: UnitId; loop: number };

interface Engine {
  step(count: number): Promise<Snapshot | null>; // null = error or timeout
  inFight(): boolean;
}

interface Agent {
  engine: Engine;
  last: Snapshot | null;
  onStep(events: FightEvent[]): void; // the caller's decision code, runs after every agent has stepped
  onEnd(): void;
}

const STEP_TIMEOUT_MS = 120000; // donor default proto timeout (120 s)

function withTimeout<T>(p: Promise<T | null>, ms: number): Promise<T | null> {
  return new Promise<T | null>((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    p.then(
      (v) => { clearTimeout(timer); resolve(v); },
      () => { clearTimeout(timer); resolve(null); },
    );
  });
}

// Events are the diff of two consecutive snapshots, and only when the loop counter moved.
function diffSnapshots(prev: Snapshot | null, next: Snapshot): FightEvent[] {
  const out: FightEvent[] = [];
  if (prev === null || next.loop === prev.loop) return out;
  for (const [id, state] of next.units) {
    const before = prev.units.get(id);
    if (before === undefined) out.push({ kind: "added", unit: id, loop: next.loop });
    else if (before !== state) out.push({ kind: "changed", unit: id, loop: next.loop });
  }
  for (const id of prev.units.keys()) {
    if (!next.units.has(id)) out.push({ kind: "destroyed", unit: id, loop: next.loop });
  }
  return out;
}

// One update: step every live agent in parallel, wait for all, then act.
export async function update(agents: Agent[], stepSize = 1): Promise<Agent[]> {
  const live = agents.filter((a) => a.engine.inFight());
  const results = await Promise.all(
    live.map((a) => withTimeout(a.engine.step(stepSize), STEP_TIMEOUT_MS)),
  );
  const aborted: Agent[] = [];
  live.forEach((a, i) => {
    const snap = results[i];
    if (snap === null) { aborted.push(a); return; } // simplified: donor ignores a failed wait; here the agent is aborted
    const events = diffSnapshots(a.last, snap);
    a.last = snap;
    a.onStep(events);
  });
  for (const a of agents) if (!a.engine.inFight()) a.onEnd();
  return aborted;
}
```

## 5. Lands in

- TARGET `src/fight/tick.ts` (headless fight stepper for tests and replay; never the live authority). One barrier advances every live fight by the same tick count, waits on each with a timeout that aborts only that fight, then derives events by diffing consecutive snapshots. Parity row 18, sub-line "server tick: fixed step".
- today: (Frankendom repo not read in this pass).
- Reuse tag: rewrite-from-idea (MIT; code may be adapted, but the sketch is written from the shape)
- Brief rule served: 1 (the server owns the clock; the client-driven step is used only in tests and replay); rule 6 (tick topic: driving loop described above)
- Best transferable idea: run every live fight to the same tick in one barrier, time out each fight on its own, and derive the fight event feed by diffing snapshots that are gated on the tick counter having moved.
- Decision (proposed): adapt. Take the barrier, the per-fight timeout and the diff-gated events for a headless duel runner and for fight replay. Reject the idea of a client driving the live server clock: our server owns the step, and the donor's model is the opposite of that ruling.
- Acceptance: a server test steps a seeded duel 600 ticks through the barrier; each step raises the tick count by exactly 1; the emitted event list equals the diff of consecutive snapshots; a fight whose step does not answer within the timeout is marked aborted while the other fights continue.

## 6. Gaps and risks

- MIT: code may be adapted. The sketch is written from the described shape, not translated.
- The engine that ticks is not in the donor. Nothing here shows the engine's tick rate, its update order, or its determinism. Do not claim lockstep determinism for our engine from this donor.
- The barrier is a client-driven step. Our rulings say the server owns the tick and kills are server-verified; a live fight must never wait on a client's step request. Only tests and replay can use this.
- Timeout behaviour is harsh: `Receive` disconnects the whole connection on one late response (sc2_connection.cc 179-181). One slow fight must not drop the connection for others. The sketch aborts only the one fight.
- `WaitStep`'s result is ignored at sc2_coordinator.cc 302. Frankendom must check the result of every step and decide explicitly what a missed step means.
- Event derivation keyed on unit identity can miss a unit that dies and reappears under the same id between two snapshots. The donor's diff internals were not read in detail (sc2_client.cc 2147-2157 read only as call names), so I cannot say how the donor handles id reuse.
- Realtime mode has no barrier at all. A fight must not use that path.
