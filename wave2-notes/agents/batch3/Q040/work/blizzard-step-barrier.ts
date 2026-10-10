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

export {}
